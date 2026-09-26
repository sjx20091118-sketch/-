import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Image as ImageIcon, Check, CheckSquare, Film, Video } from 'lucide-react';
import { compressImageFile } from './LocalImageUploader';
import { isVideoMedia } from '../utils/mediaStorage';
import { VintageVideoPlayer } from './VintageVideoPlayer';
import { saveMediaBlob, resolveMediaUrl, isIndexedDbMedia } from '../services/indexedDbMedia';
import { useBackHandler } from '../hooks/useAndroidBackHandler';

// 媒体缩略展示组件：支持快速异步解析 IndexedDB 二进制流地址，秒开保真
export const AlbumThumbnailMedia: React.FC<{
  src: string;
  isVid: boolean;
  className?: string;
  alt?: string;
}> = ({ src, isVid, className = '', alt = '留影' }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(src);

  useEffect(() => {
    let isMounted = true;
    if (isIndexedDbMedia(src)) {
      resolveMediaUrl(src).then(u => {
        if (isMounted) setResolvedUrl(u);
      });
    } else {
      setResolvedUrl(src);
    }
    return () => {
      isMounted = false;
    };
  }, [src]);

  if (isVid) {
    return (
      <video
        src={resolvedUrl}
        playsInline
        muted
        className={`w-full h-full object-cover transition-transform duration-300 ${className}`}
      />
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      loading="lazy"
      className={`w-full h-full object-cover transition-transform duration-300 ${className}`}
    />
  );
};

interface PersonAlbumProps {
  photos?: string[];
  personName: string;
  onUpdatePhotos: (photos: string[]) => void;
  showToast: (msg: string) => void;
  onRequestDelete?: (photoIndex: number) => void;
}

export const PersonAlbum: React.FC<PersonAlbumProps> = ({
  photos = [],
  personName,
  onUpdatePhotos,
  showToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isAllModalOpen, setIsAllModalOpen] = useState<boolean>(false);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  // 多选批量删除状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState<boolean>(false);

  // Level 4: 物理返回拦截：大图放映、单图删除与批量删除确认 (Priority 100)
  useBackHandler('person-album-preview', 100, previewIndex !== null, () => {
    setPreviewIndex(null);
  });
  useBackHandler('person-album-del-confirm', 100, deleteConfirmIndex !== null, () => {
    setDeleteConfirmIndex(null);
  });
  useBackHandler('person-album-batch-confirm', 100, isBatchConfirmOpen, () => {
    setIsBatchConfirmOpen(false);
  });

  // Level 3: 物理返回拦截：多选批量管理模式 (Priority 85)
  useBackHandler('person-album-multi-select', 85, isMultiSelectMode, () => {
    setIsMultiSelectMode(false);
    setSelectedIndices(new Set());
  });

  // Level 3: 物理返回拦截：全部相册列表大卡片 (Priority 80)
  useBackHandler('person-album-all-modal', 80, isAllModalOpen, () => {
    setIsAllModalOpen(false);
  });

  // 当弹窗打开时，锁定 body 滚动，防止移动端滚动穿透或错位
  const isAnyModalActive = isAllModalOpen || previewIndex !== null || deleteConfirmIndex !== null || isBatchConfirmOpen;
  useEffect(() => {
    if (isAnyModalActive) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isAnyModalActive]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v)$/i);

      let mediaData = '';
      if (isVid) {
        // 百兆长视频直接写入 IndexedDB 原生二进制安全存储，绝无 Base64 内存暴涨与白屏闪退
        mediaData = await saveMediaBlob(file);
        showToast(`已向专属相册添加 1 段影像视频`);
      } else {
        mediaData = await compressImageFile(file, 1200, 1200, 0.82);
        showToast(`已向专属相册添加 1 张相片`);
      }

      const updated = [...photos, mediaData];
      onUpdatePhotos(updated);
    } catch (err) {
      console.error(err);
      showToast('媒体读取处理失败，请重试');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeDeletePhoto = (indexToDelete: number) => {
    const updated = photos.filter((_, idx) => idx !== indexToDelete);
    onUpdatePhotos(updated);
    setDeleteConfirmIndex(null);

    if (previewIndex !== null) {
      if (updated.length === 0) {
        setPreviewIndex(null);
      } else if (previewIndex >= updated.length) {
        setPreviewIndex(updated.length - 1);
      }
    }
    showToast('已从专属相册中抹去该记录');
  };

  const toggleSelectPhoto = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const executeBatchDelete = () => {
    if (selectedIndices.size === 0) return;
    const countToDelete = selectedIndices.size;
    const updated = photos.filter((_, idx) => !selectedIndices.has(idx));
    onUpdatePhotos(updated);
    setSelectedIndices(new Set());
    setIsMultiSelectMode(false);
    setIsBatchConfirmOpen(false);

    if (previewIndex !== null) {
      setPreviewIndex(null);
    }
    showToast(`已成功抹去 ${countToDelete} 项相册记录`);
  };

  const count = photos.length;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#D9CFC1] shadow-2xs space-y-3 font-sans transition-all">
      {/* 头部标题区：图标与专属相册 */}
      <div className="flex justify-between items-center pb-2 border-b border-[#5B7B6D]/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#FAF8F5] border border-[#5B7B6D]/20 flex items-center justify-center text-[#5B7B6D]">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-[#2B332E] text-xs sm:text-sm font-serif flex items-center gap-1.5">
              <span>专属相册</span>
              {count > 0 && (
                <span className="text-[11px] font-sans font-normal text-[#6E7C75]">
                  ({count})
                </span>
              )}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#5B7B6D]/30 hover:border-[#5B7B6D] hover:bg-[#5B7B6D]/10 text-[#5B7B6D] transition-all text-xs font-serif font-medium shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加相片</span>
        </button>
      </div>

      {/* 隐藏的文件输入框：同时支持各种图片与常见短视频 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 3 槽位动态展示区 */}
      {/* 情况 1: 0 张照片/视频 - 居中展示「+ 点击上传」入口 */}
      {count === 0 && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-28 rounded-2xl border-2 border-dashed border-[#5B7B6D]/30 bg-[#FAF8F5] hover:bg-[#F2EFE9] transition-all flex flex-col items-center justify-center gap-2 text-[#5B7B6D] group active:scale-[0.99] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-2xl bg-white border border-[#5B7B6D]/20 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:border-[#5B7B6D] transition-all">
            <Plus className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-[#2B332E]">
            {isUploading ? '正在载入处理中...' : '点击添加第一张相片或旧日短视频'}
          </span>
        </button>
      )}

      {/* 情况 2: 1~2 张 - 展示已有缩略图，单击直接放大；最后一个槽位保留「+ 上传」 */}
      {count > 0 && count < 3 && (
        <div className="grid grid-cols-3 gap-2.5">
          {photos.map((itemUrl, idx) => {
            const isVid = isVideoMedia(itemUrl);
            return (
              <div
                key={idx}
                onClick={() => setPreviewIndex(idx)}
                className="relative aspect-square rounded-2xl overflow-hidden bg-black/90 border border-[#5B7B6D]/15 group cursor-pointer shadow-2xs hover:shadow-md transition-all active:scale-[0.98]"
                title={isVid ? '点击放映视频' : '点击放大查看'}
              >
                <AlbumThumbnailMedia src={itemUrl} isVid={isVid} alt={`留影 ${idx + 1}`} />
                {isVid && (
                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono border border-white/20 pointer-events-none">
                    <Film className="w-2.5 h-2.5 text-white/90" />
                    <span>视频</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* 固定保留 1 个「+ 上传」槽位 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-square rounded-2xl border-2 border-dashed border-[#5B7B6D]/30 bg-[#FAF8F5] hover:bg-[#F2EFE9] transition-all flex flex-col items-center justify-center gap-1 text-[#5B7B6D] group active:scale-95 cursor-pointer"
            title="添加照片或视频"
          >
            <Plus className="w-5 h-5 stroke-[2] group-hover:scale-110 text-[#5B7B6D] transition-transform" />
            <span className="text-[10px] text-[#6E7C75]">
              {isUploading ? '处理中' : '添加影像'}
            </span>
          </button>
        </div>
      )}

      {/* 情况 3: ≥3 项 - 展示前 2 项缩略图，第 3 格固定展示「展示更多 · 拾年」 */}
      {count >= 3 && (
        <div className="grid grid-cols-3 gap-2.5">
          {/* 第 1 项 */}
          <div
            onClick={() => setPreviewIndex(0)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-black/90 border border-[#5B7B6D]/15 group cursor-pointer shadow-2xs hover:shadow-md transition-all active:scale-[0.98]"
            title="点击查看"
          >
            <AlbumThumbnailMedia src={photos[0]} isVid={isVideoMedia(photos[0])} alt="留影 1" />
            {isVideoMedia(photos[0]) && (
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-mono border border-white/20 pointer-events-none">
                <Film className="w-2.5 h-2.5 text-white/90" />
                <span>视频</span>
              </div>
            )}
          </div>

          {/* 第 2 项 */}
          <div
            onClick={() => setPreviewIndex(1)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-black/90 border border-[#5B7B6D]/15 group cursor-pointer shadow-2xs hover:shadow-md transition-all active:scale-[0.98]"
            title="点击查看"
          >
            <AlbumThumbnailMedia src={photos[1]} isVid={isVideoMedia(photos[1])} alt="留影 2" />
            {isVideoMedia(photos[1]) && (
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-mono border border-white/20 pointer-events-none">
                <Film className="w-2.5 h-2.5 text-white/90" />
                <span>视频</span>
              </div>
            )}
          </div>

          {/* 第 3 格固定展示「展示更多 · 拾年」 */}
          <div
            onClick={() => {
              setIsMultiSelectMode(false);
              setSelectedIndices(new Set());
              setIsAllModalOpen(true);
            }}
            className="relative aspect-square rounded-2xl overflow-hidden border border-[#5B7B6D]/25 group cursor-pointer shadow-2xs flex flex-col justify-end p-2.5 active:scale-95 transition-all hover:shadow-md select-none"
            title="展开全量相册"
          >
            {photos[2] && (
              isVideoMedia(photos[2]) ? (
                <video src={photos[2]} playsInline muted className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-[0.7]" />
              ) : (
                <img
                  src={photos[2]}
                  alt="更多影像"
                  className="absolute inset-0 w-full h-full object-cover blur-[2.5px] brightness-[0.82] scale-105 group-hover:scale-110 transition-transform duration-700"
                />
              )
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/25 backdrop-blur-[2px] transition-all group-hover:backdrop-blur-[1px]" />
            
            {/* 艺术排版展示更多：改为「拾年」 */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center text-center pb-1 gap-1">
              <span className="text-[12px] sm:text-[13px] font-serif font-semibold text-[#FAF8F5] tracking-[0.28em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                展示更多
              </span>
              <div className="flex items-center gap-1.5 opacity-90">
                <span className="w-2.5 h-[0.5px] bg-[#D9CFC1]/60" />
                <span className="text-[9px] font-serif text-[#E8DFC8] tracking-[0.2em]">
                  拾年
                </span>
                <span className="w-2.5 h-[0.5px] bg-[#D9CFC1]/60" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 1: 点击「展示更多」唤起的【专属相册】全网格弹窗 (Portal 挂载至 document.body) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isAllModalOpen && (
            <div className="fixed inset-0 w-screen h-[100dvh] z-[9999] flex items-center justify-center p-3 sm:p-6 select-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setIsAllModalOpen(false);
                  setIsMultiSelectMode(false);
                  setSelectedIndices(new Set());
                }}
                className="fixed inset-0 bg-[#2B332E]/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-xl bg-[#FAF8F5] rounded-3xl border border-[#5B7B6D]/30 shadow-2xl overflow-hidden flex flex-col font-sans z-10 paper-texture max-h-[88dvh]"
              >
                {/* 弹窗头部：专属相册 + 在关闭小叉号左边增设「多选删除」 */}
                <div className="p-4 bg-white/95 border-b border-[#5B7B6D]/15 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#5B7B6D]/20 flex items-center justify-center text-[#5B7B6D]">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2B332E] text-sm font-serif flex items-center gap-1.5">
                        <span>专属相册</span>
                        <span className="text-[11px] font-sans font-normal text-[#6E7C75]">
                          ({photos.length})
                        </span>
                      </h3>
                    </div>
                  </div>

                  {/* 右侧：多选删除 + 关闭按钮 */}
                  <div className="flex items-center gap-2">
                    {!isMultiSelectMode ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMultiSelectMode(true);
                          setSelectedIndices(new Set());
                        }}
                        disabled={photos.length === 0}
                        className="px-2.5 py-1 text-xs font-serif text-[#6E7C75] hover:text-red-700 hover:bg-red-50/80 border border-[#5B7B6D]/20 hover:border-red-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-2xs"
                        title="开启多选批量删除"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-[#5B7B6D]" />
                        <span>多选删除</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedIndices.size === photos.length) {
                              setSelectedIndices(new Set());
                            } else {
                              setSelectedIndices(new Set(photos.map((_, i) => i)));
                            }
                          }}
                          className="text-[11px] font-serif px-2 py-1 rounded-lg text-[#6E7C75] hover:text-[#2B332E] hover:bg-[#FAF8F5] transition-all cursor-pointer"
                        >
                          {selectedIndices.size === photos.length ? '取消全选' : '全选'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (selectedIndices.size > 0) {
                              setIsBatchConfirmOpen(true);
                            }
                          }}
                          disabled={selectedIndices.size === 0}
                          className="px-2.5 py-1 text-xs font-serif bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>删除 ({selectedIndices.size})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsMultiSelectMode(false);
                            setSelectedIndices(new Set());
                          }}
                          className="text-xs font-serif text-[#6E7C75] hover:text-[#2B332E] px-2 py-1 rounded-lg hover:bg-stone-100 transition-all cursor-pointer"
                        >
                          完成
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsAllModalOpen(false);
                        setIsMultiSelectMode(false);
                        setSelectedIndices(new Set());
                      }}
                      className="p-1.5 text-[#6E7C75] hover:text-[#2B332E] hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                      title="关闭弹窗"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 弹窗照片/视频网格区 */}
                <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {photos.map((itemUrl, idx) => {
                      const isSelected = selectedIndices.has(idx);
                      const isVid = isVideoMedia(itemUrl);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isMultiSelectMode) {
                              toggleSelectPhoto(idx);
                            } else {
                              setPreviewIndex(idx);
                            }
                          }}
                          className={`relative aspect-square rounded-2xl overflow-hidden bg-black/90 cursor-pointer shadow-2xs transition-all ${
                            isMultiSelectMode
                              ? isSelected
                                ? 'border-2 border-red-500 ring-2 ring-red-400/30 scale-[0.97]'
                                : 'border border-[#5B7B6D]/20 hover:border-[#5B7B6D]/50'
                              : 'border border-[#5B7B6D]/20 hover:border-[#5B7B6D]/50 hover:shadow-md'
                          }`}
                          title={isMultiSelectMode ? '点击勾选/取消勾选' : isVid ? '点击放映视频' : '点击放大查看'}
                        >
                          <AlbumThumbnailMedia
                            src={itemUrl}
                            isVid={isVid}
                            alt={`留影 ${idx + 1}`}
                            className={isMultiSelectMode && isSelected ? 'brightness-90' : 'hover:scale-105'}
                          />
                          {isVid && (
                            <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[8px] font-mono border border-white/20 pointer-events-none">
                              <Film className="w-2.5 h-2.5 text-white/90" />
                              <span>视频</span>
                            </div>
                          )}

                          {/* 多选模式下的打钩选择圆环 */}
                          {isMultiSelectMode && (
                            <div className="absolute top-2 right-2 z-20 pointer-events-none">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-red-600 text-white shadow-sm ring-1 ring-white'
                                  : 'bg-black/45 backdrop-blur-xs border border-white/80 text-transparent'
                              }`}>
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* 非多选模式下：现有记录之后紧接上传槽位 */}
                    {!isMultiSelectMode && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="aspect-square rounded-2xl border-2 border-dashed border-[#5B7B6D]/30 hover:border-[#5B7B6D] bg-white/60 hover:bg-white transition-all flex flex-col items-center justify-center gap-1.5 text-[#5B7B6D] group active:scale-95 cursor-pointer shadow-2xs"
                        title="添加照片或视频"
                      >
                        <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#5B7B6D]/20 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:border-[#5B7B6D] transition-all">
                          <Plus className="w-4 h-4 stroke-[2.2] text-[#5B7B6D]" />
                        </div>
                        <span className="text-[11px] font-serif text-[#2B332E] font-medium">
                          {isUploading ? '处理中...' : '添加影像'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 弹窗 2: 单击唤起的【沉浸留影/视频放映】灯箱 (Portal 挂载至 document.body) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {previewIndex !== null && photos[previewIndex] && (
            <div className="fixed inset-0 w-screen h-[100dvh] z-[10000] flex items-center justify-center p-3 sm:p-6 select-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPreviewIndex(null)}
                className="fixed inset-0 bg-[#2B332E]/90 backdrop-blur-md"
              />

              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-xl bg-[#FAF8F5] rounded-3xl border border-[#5B7B6D]/30 shadow-2xl overflow-hidden flex flex-col font-sans z-10 paper-texture max-h-[92dvh]"
              >
                {/* 卡片顶端操作条 */}
                <div className="p-3 sm:px-4 sm:py-3 bg-white/95 border-b border-[#5B7B6D]/15 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-[#FAF8F5] border border-[#5B7B6D]/20 text-[#5B7B6D] px-2.5 py-1 rounded-xl">
                      {previewIndex + 1} / {photos.length}
                    </span>
                    <span className="text-xs text-[#2B332E] font-serif font-bold truncate max-w-[180px] flex items-center gap-1.5">
                      {isVideoMedia(photos[previewIndex]) ? (
                        <>
                          <Film className="w-3.5 h-3.5 text-[#5B7B6D]" />
                          <span>珍藏影像放映</span>
                        </>
                      ) : (
                        <span>昔日留影</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmIndex(previewIndex)}
                      className="p-1.5 text-[#6E7C75] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      title="删除此项"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(null)}
                      className="p-1.5 text-[#6E7C75] hover:text-[#2B332E] hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                      title="关闭预览"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 沉浸大图或视频播放展示与浮动切换箭头 */}
                <div className="relative flex-1 bg-stone-950 flex items-center justify-center overflow-hidden p-2 min-h-[280px] max-h-[72dvh]">
                  {isVideoMedia(photos[previewIndex]) ? (
                    <VintageVideoPlayer
                      src={photos[previewIndex]}
                      autoPlayMuted={false}
                      title={`【${personName}】专属影像`}
                      showFullscreenButton={false}
                      className="w-full max-h-[68dvh]"
                    />
                  ) : (
                    <AlbumThumbnailMedia
                      src={photos[previewIndex]}
                      isVid={false}
                      alt="昔日留影"
                      className="max-h-[66dvh] max-w-full object-contain rounded-lg shadow-md"
                    />
                  )}

                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((prev) => (prev! > 0 ? prev! - 1 : photos.length - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-all active:scale-95 shadow-md cursor-pointer z-30"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-all active:scale-95 shadow-md cursor-pointer z-30"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 单项删除确认对话框 (Portal 挂载至 document.body) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {deleteConfirmIndex !== null && (
            <div className="fixed inset-0 w-screen h-[100dvh] z-[10010] flex items-center justify-center p-4 bg-[#2B332E]/60 backdrop-blur-xs select-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#FAF8F5] w-full max-w-xs p-5 rounded-3xl border border-[#5B7B6D]/20 shadow-2xl text-center space-y-4 paper-texture"
              >
                <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[#2B332E] text-sm font-serif">
                    确认抹去此记录吗？
                  </h3>
                  <p className="text-[11px] text-[#6E7C75] leading-relaxed">
                    抹去后该照片/视频将从专属相册中移除
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmIndex(null)}
                    className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/25 bg-white text-[#6E7C75] text-xs font-semibold hover:bg-stone-50 transition-all active:scale-95 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => executeDeletePhoto(deleteConfirmIndex)}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    确认抹去
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 多选批量删除确认对话框 (Portal 挂载至 document.body) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isBatchConfirmOpen && (
            <div className="fixed inset-0 w-screen h-[100dvh] z-[10020] flex items-center justify-center p-4 bg-[#2B332E]/60 backdrop-blur-xs select-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#FAF8F5] w-full max-w-xs p-5 rounded-3xl border border-[#5B7B6D]/20 shadow-2xl text-center space-y-4 paper-texture"
              >
                <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[#2B332E] text-sm font-serif">
                    确认批量抹去这 {selectedIndices.size} 项记录吗？
                  </h3>
                  <p className="text-[11px] text-[#6E7C75] leading-relaxed">
                    抹去后所选照片/视频将从专属相册中彻底清除
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsBatchConfirmOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/25 bg-white text-[#6E7C75] text-xs font-semibold hover:bg-stone-50 transition-all active:scale-95 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={executeBatchDelete}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    确认抹去
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
