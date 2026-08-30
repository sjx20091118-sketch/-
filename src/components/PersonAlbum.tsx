import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { compressImageFile } from './LocalImageUploader';

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const compressedBase64 = await compressImageFile(file, 1200, 1200, 0.82);
      const updated = [...photos, compressedBase64];
      onUpdatePhotos(updated);
      showToast(`已向专属相册添加 1 张照片`);
    } catch (err) {
      console.error(err);
      showToast('照片处理失败，请重试');
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
    showToast('已从专属相册中抹去该张照片');
  };

  const count = photos.length;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#D9CFC1] shadow-2xs space-y-3 font-sans transition-all">
      {/* 头部标题区：仅保留图标与专属相册 */}
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
      </div>

      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 3 槽位动态展示区 */}
      {/* 情况 1: 0 张照片 - 居中展示大号「+ 点击上传」入口 */}
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
            {isUploading ? '照片上传压缩中...' : '点击上传第一张相册照片'}
          </span>
        </button>
      )}

      {/* 情况 2: 1~2 张照片 - 展示已有缩略图，并在最后一个槽位保留 1 个「+ 上传照片」槽位 */}
      {count > 0 && count < 3 && (
        <div className="grid grid-cols-3 gap-2.5">
          {photos.map((url, idx) => (
            <div
              key={idx}
              onClick={() => setPreviewIndex(idx)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-[#FAF8F5] border border-[#5B7B6D]/15 group cursor-pointer shadow-2xs hover:shadow-md transition-all"
            >
              <img
                src={url}
                alt={`留影 ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* 对称美观的双操作按钮 */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2.5 p-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewIndex(idx);
                  }}
                  className="w-8 h-8 rounded-full bg-white/35 hover:bg-white/60 text-white backdrop-blur-md border border-white/50 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                  title="放大查看"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmIndex(idx);
                  }}
                  className="w-8 h-8 rounded-full bg-red-500/85 hover:bg-red-600 text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                  title="删除照片"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* 固定保留 1 个「+ 上传照片」槽位 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-square rounded-2xl border-2 border-dashed border-[#5B7B6D]/30 bg-[#FAF8F5] hover:bg-[#F2EFE9] transition-all flex flex-col items-center justify-center gap-1 text-[#5B7B6D] group active:scale-95 cursor-pointer"
            title="上传照片"
          >
            <Plus className="w-5 h-5 stroke-[2] group-hover:scale-110 text-[#5B7B6D] transition-transform" />
            <span className="text-[10px] text-[#6E7C75]">
              {isUploading ? '处理中' : '上传照片'}
            </span>
          </button>
        </div>
      )}

      {/* 情况 3: ≥3 张照片 - 展示前 2 张缩略图，第 3 格固定展示艺术朦胧感的「展示更多」 */}
      {count >= 3 && (
        <div className="grid grid-cols-3 gap-2.5">
          {/* 第 1 张 */}
          <div
            onClick={() => setPreviewIndex(0)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-[#FAF8F5] border border-[#5B7B6D]/15 group cursor-pointer shadow-2xs hover:shadow-md transition-all"
          >
            <img
              src={photos[0]}
              alt="留影 1"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* 对称美观的双操作按钮 */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2.5 p-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(0);
                }}
                className="w-8 h-8 rounded-full bg-white/35 hover:bg-white/60 text-white backdrop-blur-md border border-white/50 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                title="放大查看"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmIndex(0);
                }}
                className="w-8 h-8 rounded-full bg-red-500/85 hover:bg-red-600 text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                title="删除照片"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 第 2 张 */}
          <div
            onClick={() => setPreviewIndex(1)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-[#FAF8F5] border border-[#5B7B6D]/15 group cursor-pointer shadow-2xs hover:shadow-md transition-all"
          >
            <img
              src={photos[1]}
              alt="留影 2"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* 对称美观的双操作按钮 */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2.5 p-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(1);
                }}
                className="w-8 h-8 rounded-full bg-white/35 hover:bg-white/60 text-white backdrop-blur-md border border-white/50 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                title="放大查看"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmIndex(1);
                }}
                className="w-8 h-8 rounded-full bg-red-500/85 hover:bg-red-600 text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                title="删除照片"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 第 3 格固定展示艺术感与朦胧质感的「展示更多」 */}
          <div
            onClick={() => setIsAllModalOpen(true)}
            className="relative aspect-square rounded-2xl overflow-hidden border border-[#5B7B6D]/25 group cursor-pointer shadow-2xs flex flex-col justify-end p-2.5 active:scale-95 transition-all hover:shadow-md select-none"
          >
            {photos[2] && (
              <img
                src={photos[2]}
                alt="更多相片"
                className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-[0.88] scale-105 group-hover:scale-110 transition-transform duration-700"
              />
            )}
            {/* 艺术感磨砂渐变暗调浮层 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25 backdrop-blur-[2px] transition-all group-hover:backdrop-blur-[1px]" />
            
            {/* 艺术排版展示更多 */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center text-center pb-1 gap-0.5">
              <span className="text-[12px] sm:text-[13px] font-serif font-medium text-white/95 tracking-[0.22em] drop-shadow-md">
                展示更多
              </span>
              <span className="text-[9px] font-serif text-[#D9CFC1]/80 tracking-widest scale-90">
                · 拾光留影 ·
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 1: 点击「展示更多」唤起的【专属相册】全网格弹窗 */}
      <AnimatePresence>
        {isAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAllModalOpen(false)}
              className="absolute inset-0 bg-[#2B332E]/75 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-xl bg-[#FAF8F5] rounded-3xl border border-[#5B7B6D]/30 shadow-2xl overflow-hidden flex flex-col font-sans z-10 paper-texture max-h-[85vh]"
            >
              {/* 弹窗头部：简洁缩减为「专属相册」 */}
              <div className="p-4 bg-white/95 border-b border-[#5B7B6D]/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#5B7B6D]/20 flex items-center justify-center text-[#5B7B6D]">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2B332E] text-sm font-serif">
                      专属相册
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAllModalOpen(false)}
                    className="p-1.5 text-[#6E7C75] hover:text-[#2B332E] hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 弹窗照片网格区：现有照片之后紧接上传照片槽位 */}
              <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {photos.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewIndex(idx)}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-[#5B7B6D]/20 group cursor-pointer shadow-2xs hover:shadow-md transition-all"
                    >
                      <img
                        src={url}
                        alt={`留影 ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* 对称美观的双操作按钮 */}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 p-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewIndex(idx);
                          }}
                          className="w-7.5 h-7.5 rounded-full bg-white/35 hover:bg-white/60 text-white backdrop-blur-md border border-white/50 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                          title="放大查看"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmIndex(idx);
                          }}
                          className="w-7.5 h-7.5 rounded-full bg-red-500/85 hover:bg-red-600 text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                          title="删除照片"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* 现有上传照片往后一格：专属上传照片槽位 */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-square rounded-2xl border-2 border-dashed border-[#5B7B6D]/30 hover:border-[#5B7B6D] bg-white/60 hover:bg-white transition-all flex flex-col items-center justify-center gap-1.5 text-[#5B7B6D] group active:scale-95 cursor-pointer shadow-2xs"
                    title="上传照片"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#5B7B6D]/20 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:border-[#5B7B6D] transition-all">
                      <Plus className="w-4 h-4 stroke-[2.2] text-[#5B7B6D]" />
                    </div>
                    <span className="text-[11px] font-serif text-[#2B332E] font-medium">
                      {isUploading ? '处理中...' : '上传照片'}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 弹窗 2: 点击单张唤起的【昔日留影】大图沉浸预览灯箱 */}
      <AnimatePresence>
        {previewIndex !== null && photos[previewIndex] && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewIndex(null)}
              className="absolute inset-0 bg-[#2B332E]/85 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl border border-[#5B7B6D]/30 shadow-2xl overflow-hidden flex flex-col font-sans z-10 paper-texture max-h-[90vh]"
            >
              {/* 卡片顶端操作条：保持「昔日留影」 */}
              <div className="p-3 sm:px-4 sm:py-3 bg-white/95 border-b border-[#5B7B6D]/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-[#FAF8F5] border border-[#5B7B6D]/20 text-[#5B7B6D] px-2.5 py-1 rounded-xl">
                    {previewIndex + 1} / {photos.length}
                  </span>
                  <span className="text-xs text-[#2B332E] font-serif font-bold truncate max-w-[180px]">
                    昔日留影
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmIndex(previewIndex)}
                    className="p-1.5 text-[#6E7C75] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    title="删除此照片"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(null)}
                    className="p-1.5 text-[#6E7C75] hover:text-[#2B332E] hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                    title="关闭大图预览"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 沉浸大图展示与浮动切换箭头 */}
              <div className="relative flex-1 bg-stone-950 flex items-center justify-center overflow-hidden p-2 min-h-[260px] max-h-[65vh]">
                <img
                  src={photos[previewIndex]}
                  alt="昔日留影"
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md"
                />

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => (prev! > 0 ? prev! - 1 : photos.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-all active:scale-95 shadow-md cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-all active:scale-95 shadow-md cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 确认删除对话框 */}
      <AnimatePresence>
        {deleteConfirmIndex !== null && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-[#2B332E]/40 backdrop-blur-xs select-none">
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
                  确认抹去这张相片吗？
                </h3>
                <p className="text-[11px] text-[#6E7C75] leading-relaxed">
                  抹去后该照片将从相册中移除
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
      </AnimatePresence>
    </div>
  );
};
