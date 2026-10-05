import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Image as ImageIcon, Check, CheckSquare, Film, Video, Camera } from 'lucide-react';
import { compressImageFile } from './LocalImageUploader';
import { isVideoMedia, extractVideoPoster, extractVideoPosterFromUrl } from '../utils/mediaStorage';
import { VintageVideoPlayer } from './VintageVideoPlayer';
import { saveMediaBlob, resolveMediaUrl, isIndexedDbMedia, saveVideoPosterCache, getVideoPosterCache } from '../services/indexedDbMedia';
import { useBackHandler } from '../hooks/useAndroidBackHandler';
import { HealingTheme } from '../types';

// 媒体缩略展示组件：接入内置智能避黑采鲜抽帧引擎，实现海报秒开保真，彻底告别安卓黑圈与破损图
export const AlbumThumbnailMedia: React.FC<{
  src: string;
  isVid: boolean;
  className?: string;
  alt?: string;
}> = ({ src, isVid, className = '', alt = '留影' }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => (isIndexedDbMedia(src) ? '' : src));
  const [videoPoster, setVideoPoster] = useState<string>('');
  const [isExtractingPoster, setIsExtractingPoster] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (!src) {
      setResolvedUrl('');
      return;
    }
    if (isIndexedDbMedia(src)) {
      resolveMediaUrl(src).then(u => {
        if (isMounted) setResolvedUrl(u || '');
      }).catch(() => {
        if (isMounted) setResolvedUrl('');
      });
    } else {
      setResolvedUrl(src);
    }
    return () => {
      isMounted = false;
    };
  }, [src]);

  // 针对视频项：优先检索双级海报缓存；若未命中或海报失效则后台静默调用智能抽帧系统并回填
  useEffect(() => {
    if (!isVid || !src) return;

    let isMounted = true;

    // 1. 快速查询海报缓存并确保解析真实展示 URL (blob: 或 data:)
    getVideoPosterCache(src).then(async (cached) => {
      if (!isMounted) return;
      if (cached) {
        let finalPoster = cached;
        if (isIndexedDbMedia(cached)) {
          finalPoster = await resolveMediaUrl(cached);
        }
        if (isMounted && finalPoster) {
          setVideoPoster(finalPoster);
          return;
        }
      }

      // 2. 缓存未命中时（针对老旧无封面历史视频或异常项）：获取真实的视频 Blob URL 并后台静默抽帧
      try {
        const realVidUrl = isIndexedDbMedia(src) ? await resolveMediaUrl(src) : src;
        if (!isMounted || !realVidUrl || isIndexedDbMedia(realVidUrl)) return;

        setIsExtractingPoster(true);
        const extracted = await extractVideoPosterFromUrl(realVidUrl);
        if (!isMounted) return;
        setIsExtractingPoster(false);

        if (extracted) {
          setVideoPoster(extracted);
          await saveVideoPosterCache(src, extracted);
        }
      } catch {
        if (isMounted) setIsExtractingPoster(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isVid, src]);

  if (isVid) {
    if (videoPoster) {
      return (
        <img
          src={videoPoster}
          alt={alt}
          loading="lazy"
          onError={async () => {
            // 自动重试自愈：若当前海报解析异常，实时调用抽取并持久化更新
            try {
              const realVidUrl = isIndexedDbMedia(src) ? await resolveMediaUrl(src) : src;
              if (realVidUrl && !isIndexedDbMedia(realVidUrl)) {
                const newPoster = await extractVideoPosterFromUrl(realVidUrl);
                if (newPoster) {
                  setVideoPoster(newPoster);
                  await saveVideoPosterCache(src, newPoster);
                }
              }
            } catch (err) {
              console.warn('视频海报自愈抽帧异常', err);
            }
          }}
          className={`w-full h-full object-cover transition-transform duration-300 ${className}`}
        />
      );
    }

    // 抽帧中或无海报时的优雅温润骨架微光与胶片图标，严格杜绝裸渲染 <video> 导致的安卓原生黑圈占位符！
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white/50 ${className}`}>
        <Film className={`w-6 h-6 stroke-[1.5] ${isExtractingPoster ? 'animate-pulse text-amber-400/90' : 'text-white/40'}`} />
        <span className="text-[9px] font-mono tracking-wider opacity-60 mt-1">
          {isExtractingPoster ? '智能抽帧中' : '影像视频'}
        </span>
      </div>
    );
  }

  // 图片展示：如果尚未完成 IndexedDB 异步流化解析，渲染优雅占位骨架，严格防止 <img src="idb://..."> 导致浏览器抛出破损图！
  if (!resolvedUrl) {
    return (
      <div className={`w-full h-full bg-[#FAF8F5] dark:bg-[#18231D] animate-pulse flex items-center justify-center ${className}`}>
        <ImageIcon className="w-5 h-5 text-stone-300 dark:text-stone-700" />
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      loading="lazy"
      onError={async () => {
        if (isIndexedDbMedia(src)) {
          const retry = await resolveMediaUrl(src);
          if (retry && retry !== resolvedUrl) {
            setResolvedUrl(retry);
          }
        }
      }}
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
  theme?: HealingTheme;
  isDarkMode?: boolean;
}

export const PersonAlbum: React.FC<PersonAlbumProps> = ({
  photos = [],
  personName,
  onUpdatePhotos,
  showToast,
  theme,
  isDarkMode = false
}) => {
  const primaryColor = theme?.primary || '#5B7B6D';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isAllModalOpen, setIsAllModalOpen] = useState<boolean>(false);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  // 多选批量删除状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState<boolean>(false);

  const [previewPoster, setPreviewPoster] = useState<string>('');

  useEffect(() => {
    if (previewIndex !== null && photos[previewIndex] && isVideoMedia(photos[previewIndex])) {
      getVideoPosterCache(photos[previewIndex]).then(async (p) => {
        if (p) {
          const resolved = isIndexedDbMedia(p) ? await resolveMediaUrl(p) : p;
          setPreviewPoster(resolved || '');
        }
      });
    } else {
      setPreviewPoster('');
    }
  }, [previewIndex, photos]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v)$/i);

      let mediaData = '';
      if (isVid) {
        // 1. 软件内置智能避黑采鲜抽帧系统：提取高清视频首帧海报
        const posterPromise = extractVideoPoster(file);
        // 2. 原生二进制写入 IndexedDB 安全持久化存储
        const blobPromise = saveMediaBlob(file);

        const [posterRes, savedMediaUri] = await Promise.all([posterPromise, blobPromise]);
        mediaData = savedMediaUri;

        if (posterRes.poster) {
          // 持久化关联存储海报封面
          await saveVideoPosterCache(mediaData, posterRes.poster);
        }
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
    <div
      className="bg-white dark:bg-[#16211B] p-4 sm:p-5 rounded-3xl border shadow-2xs space-y-3 font-sans transition-all"
      style={{
        borderColor: isDarkMode ? `${primaryColor}45` : `${primaryColor}30`,
        boxShadow: `0 2px 12px ${primaryColor}0d`
      }}
    >
      {/* 头部标题区：图标与专属相册 */}
      <div className="flex justify-between items-center pb-2 border-b border-[#5B7B6D]/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl border flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isDarkMode ? `${primaryColor}25` : `${primaryColor}15`,
              borderColor: `${primaryColor}35`,
              color: isDarkMode ? (theme?.dark?.primary || primaryColor) : primaryColor
            }}
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-[#2B332E] dark:text-[#FAF8F5] text-xs sm:text-sm font-serif flex items-center gap-1.5">
              <span>专属相册</span>
              {count > 0 && (
                <span className="text-[11px] font-sans font-normal text-[#6E7C75] dark:text-[#8E9F97]">
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-serif font-medium shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
          style={{
            backgroundColor: isDarkMode ? `${primaryColor}20` : `${primaryColor}10`,
            borderColor: `${primaryColor}35`,
            color: isDarkMode ? (theme?.dark?.primary || primaryColor) : primaryColor
          }}
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
      {/* 情况 1: 0 张照片/视频 - 统一优雅留白风格 */}
      {count === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed bg-[#FAF8F5] dark:bg-[#141C18] rounded-2xl p-6 text-center transition-all group"
          style={{
            borderColor: isDarkMode ? `${primaryColor}35` : `${primaryColor}25`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = primaryColor;
            e.currentTarget.style.backgroundColor = isDarkMode ? `${primaryColor}15` : `${primaryColor}08`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = isDarkMode ? `${primaryColor}35` : `${primaryColor}25`;
            e.currentTarget.style.backgroundColor = '';
          }}
        >
          <Camera
            className="w-8 h-8 mx-auto mb-2 transition-colors"
            style={{ color: `${primaryColor}90` }}
          />
          <p className="text-xs text-[#6E7C75] dark:text-[#A7B4AD] font-serif">
            {isUploading ? '正在载入处理中...' : '暂无专属留影，轻触即可添加相片或短视频'}
          </p>
        </div>
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
                className="relative aspect-square rounded-2xl overflow-hidden bg-black/90 border group cursor-pointer shadow-2xs hover:shadow-md transition-all active:scale-[0.98]"
                style={{
                  borderColor: isDarkMode ? `${primaryColor}35` : `${primaryColor}25`
                }}
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
            className="aspect-square rounded-2xl border-2 border-dashed bg-[#FAF8F5] dark:bg-[#141C18] transition-all flex flex-col items-center justify-center gap-1 group active:scale-95 cursor-pointer"
            style={{
              borderColor: isDarkMode ? `${primaryColor}35` : `${primaryColor}25`,
              color: isDarkMode ? (theme?.dark?.primary || primaryColor) : primaryColor
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = primaryColor;
              e.currentTarget.style.backgroundColor = isDarkMode ? `${primaryColor}15` : `${primaryColor}08`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = isDarkMode ? `${primaryColor}35` : `${primaryColor}25`;
              e.currentTarget.style.backgroundColor = '';
            }}
            title="添加照片或视频"
          >
            <Plus className="w-5 h-5 stroke-[2] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-[#6E7C75] dark:text-[#A7B4AD]">
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
            className="relative aspect-square rounded-2xl overflow-hidden bg-black/90 border group cursor-pointer shadow-2xs hover:shadow-md transition-all active:scale-[0.98]"
            style={{
              borderColor: isDarkMode ? `${primaryColor}35` : `${primaryColor}25`
            }}
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
            className="relative aspect-square rounded-2xl overflow-hidden bg-black/90 border group cursor-pointer shadow-2xs hover:shadow-md transition-all active:scale-[0.98]"
            style={{
              borderColor: isDarkMode ? `${primaryColor}35` : `${primaryColor}25`
            }}
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
            className="relative aspect-square rounded-2xl overflow-hidden border group cursor-pointer shadow-2xs flex flex-col justify-end p-2.5 active:scale-95 transition-all hover:shadow-md select-none"
            style={{
              borderColor: isDarkMode ? `${primaryColor}45` : `${primaryColor}30`
            }}
            title="展开全量相册"
          >
            {photos[2] && (
              <AlbumThumbnailMedia
                src={photos[2]}
                isVid={isVideoMedia(photos[2])}
                alt="更多影像"
                className="absolute inset-0 w-full h-full object-cover blur-[2.5px] brightness-[0.82] scale-105 group-hover:scale-110 transition-transform duration-700"
              />
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
            <motion.div
              key="person-album-all-modal-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed inset-0 w-full h-full z-[9999] flex items-center justify-center p-3 sm:p-6 select-none"
              style={{ transform: 'translateZ(0)' }}
            >
              <div
                onClick={() => {
                  setIsAllModalOpen(false);
                  setIsMultiSelectMode(false);
                  setSelectedIndices(new Set());
                }}
                className="absolute inset-0 bg-[#2B332E]/80 dark:bg-black/85 backdrop-blur-xs"
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="relative w-full max-w-xl bg-[#FAF8F5] dark:bg-[#141E18] rounded-3xl border shadow-2xl overflow-hidden flex flex-col font-sans z-10 paper-texture max-h-[88dvh]"
                style={{
                  borderColor: isDarkMode ? `${primaryColor}45` : `${primaryColor}30`,
                }}
              >
                {/* 弹窗头部：专属相册 + 多选状态 */}
                <div className="p-4 bg-white/95 dark:bg-[#18251E] border-b border-[#5B7B6D]/15 dark:border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-xl border flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: isDarkMode ? `${primaryColor}25` : `${primaryColor}15`,
                        borderColor: `${primaryColor}35`,
                        color: isDarkMode ? (theme?.dark?.primary || primaryColor) : primaryColor
                      }}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2B332E] dark:text-[#FAF8F5] text-sm font-serif flex items-center gap-1.5">
                        <span>专属相册</span>
                        <span className="text-[11px] font-sans font-normal text-[#6E7C75] dark:text-[#8E9F97]">
                          ({photos.length})
                        </span>
                      </h3>
                    </div>
                  </div>

                  {/* 右侧：多选删除触发 / 多选计数标签 + 关闭 */}
                  <div className="flex items-center gap-2">
                    {!isMultiSelectMode ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMultiSelectMode(true);
                          setSelectedIndices(new Set());
                        }}
                        disabled={photos.length === 0}
                        className="px-2.5 py-1 text-xs font-serif border rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-2xs"
                        style={{
                          backgroundColor: isDarkMode ? `${primaryColor}15` : `${primaryColor}08`,
                          borderColor: `${primaryColor}35`,
                          color: isDarkMode ? (theme?.dark?.primary || primaryColor) : primaryColor
                        }}
                        title="开启多选批量删除"
                      >
                        <CheckSquare className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                        <span>多选删除</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-serif px-2.5 py-1 rounded-xl border"
                          style={{
                            backgroundColor: isDarkMode ? `${primaryColor}25` : `${primaryColor}15`,
                            borderColor: `${primaryColor}40`,
                            color: isDarkMode ? (theme?.dark?.primary || primaryColor) : primaryColor
                          }}
                        >
                          已选择 {selectedIndices.size} 项
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsAllModalOpen(false);
                        setIsMultiSelectMode(false);
                        setSelectedIndices(new Set());
                      }}
                      className="p-1.5 text-[#6E7C75] dark:text-[#A7B4AD] hover:text-[#2B332E] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer"
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
                                : 'border hover:border-stone-400'
                              : 'border hover:shadow-md'
                          }`}
                          style={!isSelected ? {
                            borderColor: isDarkMode ? `${primaryColor}35` : `${primaryColor}25`
                          } : undefined}
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
                        className="aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1.5 group active:scale-95 cursor-pointer shadow-2xs"
                        style={{
                          borderColor: isDarkMode ? `${primaryColor}35` : `${primaryColor}25`,
                          backgroundColor: isDarkMode ? '#18231E80' : '#ffffff99'
                        }}
                        title="添加照片或视频"
                      >
                        <div
                          className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-2xs group-hover:scale-105 transition-all"
                          style={{
                            backgroundColor: isDarkMode ? `${primaryColor}25` : `${primaryColor}15`,
                            borderColor: `${primaryColor}35`,
                            color: isDarkMode ? (theme?.dark?.primary || primaryColor) : primaryColor
                          }}
                        >
                          <Plus className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <span className="text-[11px] font-serif text-[#2B332E] dark:text-[#FAF8F5] font-medium">
                          {isUploading ? '处理中...' : '添加影像'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 多选模式下：卡片下方弹出独立的三个操作按钮条 */}
                <AnimatePresence>
                  {isMultiSelectMode && (
                    <motion.div
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 24, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="p-3.5 sm:p-4 bg-white/95 dark:bg-[#18251E] border-t border-[#5B7B6D]/15 dark:border-white/10 flex items-center justify-between gap-2.5 shrink-0 shadow-sm"
                    >
                      {/* 按钮 1: 全选 / 取消全选 */}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedIndices.size === photos.length) {
                            setSelectedIndices(new Set());
                          } else {
                            setSelectedIndices(new Set(photos.map((_, i) => i)));
                          }
                        }}
                        className="flex-1 py-2.5 px-2.5 sm:px-3 rounded-2xl border border-[#5B7B6D]/20 dark:border-white/15 bg-[#FAF8F5] dark:bg-[#141C18] hover:bg-stone-100 dark:hover:bg-[#1E2922] text-[#526058] dark:text-[#C2CDC7] hover:text-[#2B332E] dark:hover:text-white font-medium text-xs font-serif flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                        <span>{selectedIndices.size === photos.length ? '取消全选' : '全选照片'}</span>
                      </button>

                      {/* 按钮 2: 批量删除 */}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedIndices.size > 0) {
                            setIsBatchConfirmOpen(true);
                          }
                        }}
                        disabled={selectedIndices.size === 0}
                        className="flex-1 py-2.5 px-2.5 sm:px-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs font-serif flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>删除 ({selectedIndices.size})</span>
                      </button>

                      {/* 按钮 3: 完成退出 */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMultiSelectMode(false);
                          setSelectedIndices(new Set());
                        }}
                        className="flex-1 py-2.5 px-2.5 sm:px-3 rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#141C18] hover:bg-stone-50 dark:hover:bg-[#1E2922] text-[#2B332E] dark:text-[#FAF8F5] font-medium text-xs font-serif flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                      >
                        <span>完成</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 弹窗 2: 单击唤起的【沉浸留影/视频放映】灯箱 (Portal 挂载至 document.body) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {previewIndex !== null && photos[previewIndex] && (
            <motion.div
              key="person-album-preview-modal-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed inset-0 w-full h-full z-[10000] flex items-center justify-center p-3 sm:p-6 select-none"
              style={{ transform: 'translateZ(0)' }}
            >
              <div
                onClick={() => setPreviewIndex(null)}
                className="absolute inset-0 bg-[#2B332E]/90 dark:bg-black/90 backdrop-blur-xs"
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="relative w-full max-w-xl bg-[#FAF8F5] dark:bg-[#141E18] rounded-3xl border shadow-2xl overflow-hidden flex flex-col font-sans z-10 paper-texture max-h-[92dvh]"
                style={{
                  borderColor: isDarkMode ? `${primaryColor}45` : `${primaryColor}30`,
                }}
              >
                {/* 卡片顶端操作条 */}
                <div className="p-3 sm:px-4 sm:py-3 bg-white/95 dark:bg-[#18251E] border-b border-[#5B7B6D]/15 dark:border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono font-bold border px-2.5 py-1 rounded-xl"
                      style={{
                        backgroundColor: isDarkMode ? `${primaryColor}25` : `${primaryColor}15`,
                        borderColor: `${primaryColor}35`,
                        color: isDarkMode ? (theme?.dark?.primary || primaryColor) : primaryColor
                      }}
                    >
                      {previewIndex + 1} / {photos.length}
                    </span>
                    <span className="text-xs text-[#2B332E] dark:text-[#FAF8F5] font-serif font-bold truncate max-w-[180px] flex items-center gap-1.5">
                      {isVideoMedia(photos[previewIndex]) ? (
                        <>
                          <Film className="w-3.5 h-3.5" style={{ color: primaryColor }} />
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
                      className="p-1.5 text-[#6E7C75] dark:text-[#A7B4AD] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all cursor-pointer"
                      title="删除此项"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(null)}
                      className="p-1.5 text-[#6E7C75] dark:text-[#A7B4AD] hover:text-[#2B332E] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer"
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
                      poster={previewPoster}
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 单项删除确认对话框 (Portal 挂载至 document.body) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {deleteConfirmIndex !== null && (
            <motion.div
              key="person-album-del-modal-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed inset-0 w-full h-full z-[10010] flex items-center justify-center p-4 bg-[#2B332E]/60 dark:bg-black/80 backdrop-blur-xs select-none"
              style={{ transform: 'translateZ(0)' }}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="bg-[#FAF8F5] dark:bg-[#16211B] w-full max-w-xs p-5 rounded-3xl border shadow-2xl text-center space-y-4 paper-texture"
                style={{
                  borderColor: isDarkMode ? `${primaryColor}40` : `${primaryColor}25`
                }}
              >
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-2xs">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[#2B332E] dark:text-[#FAF8F5] text-sm font-serif">
                    确认抹去此记录吗？
                  </h3>
                  <p className="text-[11px] text-[#6E7C75] dark:text-[#8E9F97] leading-relaxed">
                    抹去后该照片/视频将从专属相册中移除
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmIndex(null)}
                    className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/25 dark:border-white/15 bg-white dark:bg-[#1A2620] text-[#6E7C75] dark:text-[#A7B4AD] text-xs font-semibold hover:bg-stone-50 dark:hover:bg-[#23332B] transition-all active:scale-95 cursor-pointer"
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 多选批量删除确认对话框 (Portal 挂载至 document.body) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isBatchConfirmOpen && (
            <motion.div
              key="person-album-batch-modal-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed inset-0 w-full h-full z-[10020] flex items-center justify-center p-4 bg-[#2B332E]/60 dark:bg-black/80 backdrop-blur-xs select-none"
              style={{ transform: 'translateZ(0)' }}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="bg-[#FAF8F5] dark:bg-[#16211B] w-full max-w-xs p-5 rounded-3xl border shadow-2xl text-center space-y-4 paper-texture"
                style={{
                  borderColor: isDarkMode ? `${primaryColor}40` : `${primaryColor}25`
                }}
              >
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-2xs">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[#2B332E] dark:text-[#FAF8F5] text-sm font-serif">
                    确认批量抹去这 {selectedIndices.size} 项记录吗？
                  </h3>
                  <p className="text-[11px] text-[#6E7C75] dark:text-[#8E9F97] leading-relaxed">
                    抹去后所选照片/视频将从专属相册中彻底清除
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsBatchConfirmOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/25 dark:border-white/15 bg-white dark:bg-[#1A2620] text-[#6E7C75] dark:text-[#A7B4AD] text-xs font-semibold hover:bg-stone-50 dark:hover:bg-[#23332B] transition-all active:scale-95 cursor-pointer"
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
