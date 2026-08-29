import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Plus, Trash2, Maximize2, X, ChevronLeft, ChevronRight, Image as ImageIcon, Grid } from 'lucide-react';
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
  const [isGridModalOpen, setIsGridModalOpen] = useState<boolean>(false);
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
      showToast(`已向【${personName}】相册添加 1 张照片`);
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
    showToast('已从相册中抹去该张照片');
  };

  const count = photos.length;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#D9CFC1] shadow-2xs space-y-3 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-[#5B7B6D]/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#FAF8F5] border border-[#5B7B6D]/20 flex items-center justify-center text-[#5B7B6D]">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-[#2B332E] text-xs sm:text-sm font-serif flex items-center gap-1.5">
              <span>专属相册</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 3-Slot Dynamic Layout Rule */}
      {/* 0 Photos: Large centered add hero card */}
      {count === 0 && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-32 rounded-2xl border-2 border-dashed border-[#5B7B6D]/30 bg-[#FAF8F5] hover:bg-[#F2EFE9] transition-all flex flex-col items-center justify-center gap-2 text-[#5B7B6D] group active:scale-[0.99] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-white border border-[#5B7B6D]/20 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:border-[#E88765] group-hover:text-[#E88765] transition-all">
            <Plus className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="text-center">
            <span className="text-xs font-bold text-[#2B332E] block">
              {isUploading ? '照片上传压缩中...' : '点击上传第一张相册照片'}
            </span>
            <span className="text-[10.5px] text-[#6E7C75] mt-0.5 block">
              支持本地即时存储 · 点滴定格相伴岁月
            </span>
          </div>
        </button>
      )}

      {/* 1~2 Photos: Show 1~2 photo thumbnails + 1 add button to fill 3 slots */}
      {count > 0 && count < 3 && (
        <div className="grid grid-cols-3 gap-2.5">
          {photos.map((url, idx) => (
            <div
              key={idx}
              onClick={() => setPreviewIndex(idx)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-[#FAF8F5] border border-[#5B7B6D]/15 group cursor-pointer shadow-2xs"
            >
              <img
                src={url}
                alt={`${personName} 相片 ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="p-1.5 bg-white/90 backdrop-blur-xs rounded-xl text-[#2B332E] hover:bg-white transition-all shadow-xs">
                  <Maximize2 className="w-3.5 h-3.5" />
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmIndex(idx);
                  }}
                  className="p-1.5 bg-red-500/90 backdrop-blur-xs rounded-xl text-white hover:bg-red-600 transition-all shadow-xs"
                  title="删除照片"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Plus button to fill */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-square rounded-2xl border-2 border-dashed border-[#5B7B6D]/30 bg-[#FAF8F5] hover:bg-[#F2EFE9] transition-all flex flex-col items-center justify-center gap-1 text-[#5B7B6D] group active:scale-95 cursor-pointer"
            title="上传更多相片"
          >
            <Plus className="w-5 h-5 stroke-[2] group-hover:scale-110 text-[#5B7B6D] transition-transform" />
            <span className="text-[10px] text-[#6E7C75]">
              {isUploading ? '处理中' : '上传相片'}
            </span>
          </button>
        </div>
      )}

      {/* >=3 Photos: STRICT 3-Slot rule: First 2 slots are thumbnail 1 & 2; 3rd slot is fixed "View More" button */}
      {count >= 3 && (
        <div className="grid grid-cols-3 gap-2.5">
          {/* Slot 1 */}
          <div
            onClick={() => setPreviewIndex(0)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-[#FAF8F5] border border-[#5B7B6D]/15 group cursor-pointer shadow-2xs"
          >
            <img
              src={photos[0]}
              alt={`${personName} 相片 1`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="p-1.5 bg-white/90 backdrop-blur-xs rounded-xl text-[#2B332E] shadow-xs">
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Slot 2 */}
          <div
            onClick={() => setPreviewIndex(1)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-[#FAF8F5] border border-[#5B7B6D]/15 group cursor-pointer shadow-2xs"
          >
            <img
              src={photos[1]}
              alt={`${personName} 相片 2`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="p-1.5 bg-white/90 backdrop-blur-xs rounded-xl text-[#2B332E] shadow-xs">
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Slot 3: Fixed "展示更多 / 全量管理" Button */}
          <div
            onClick={() => setIsGridModalOpen(true)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-[#2B332E] border border-[#5B7B6D]/30 group cursor-pointer shadow-2xs flex flex-col items-center justify-center text-white active:scale-95 transition-all hover:brightness-110 select-none"
          >
            {photos[2] && (
              <img
                src={photos[2]}
                alt="More Photos Background"
                className="absolute inset-0 w-full h-full object-cover opacity-35 filter blur-[1px] group-hover:scale-110 transition-transform duration-300"
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center gap-1">
              <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-xs">
                <Grid className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold tracking-wide font-serif">
                更多 ({count})
              </span>
              <span className="text-[9px] text-white/70 font-sans">
                点击展开管理
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grid Management Modal */}
      <AnimatePresence>
        {isGridModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGridModalOpen(false)}
              className="absolute inset-0 bg-[#2B332E]/45 backdrop-blur-xs"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl border border-[#5B7B6D]/20 shadow-2xl overflow-hidden flex flex-col font-sans z-10 paper-texture max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="px-5 py-3.5 bg-white/90 border-b border-[#5B7B6D]/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FDF0EB] text-[#E88765] border border-[#E88765]/20 flex items-center justify-center shadow-2xs">
                    <Grid className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#2B332E] font-serif">
                      【{personName}】的时光相册管理
                    </h3>
                    <p className="text-[10px] text-[#6E7C75]">
                      共 {count} 张相片 · 点击相片大图查看，支持单张移除或继续添加
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGridModalOpen(false)}
                  className="p-1.5 text-[#6E7C75] hover:text-[#2B332E] hover:bg-stone-100 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid Scroll Content */}
              <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {photos.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewIndex(idx)}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-[#5B7B6D]/15 group cursor-pointer shadow-2xs hover:shadow-md transition-all"
                    >
                      <img
                        src={url}
                        alt={`${personName} 相片 ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <span className="p-1.5 bg-white/90 backdrop-blur-xs rounded-xl text-[#2B332E] shadow-xs">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmIndex(idx);
                          }}
                          className="p-1.5 bg-red-500/90 backdrop-blur-xs rounded-xl text-white hover:bg-red-600 transition-all shadow-xs"
                          title="抹去此相片"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}

                  {/* Add Button Inside Grid */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-square rounded-2xl border-2 border-dashed border-[#5B7B6D]/30 bg-[#FAF8F5] hover:bg-[#F2EFE9] transition-all flex flex-col items-center justify-center gap-1 text-[#5B7B6D] group active:scale-95 cursor-pointer shadow-2xs"
                    title="添加相片"
                  >
                    <Plus className="w-5 h-5 stroke-[2] group-hover:scale-110 text-[#5B7B6D] transition-transform" />
                    <span className="text-[10px] text-[#6E7C75]">
                      {isUploading ? '处理中' : '添加相片'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-white/90 border-t border-[#5B7B6D]/15 flex items-center justify-between">
                <span className="text-xs text-[#6E7C75] font-serif pl-2">
                  本地离线存储，数据永不丢失
                </span>
                <button
                  type="button"
                  onClick={() => setIsGridModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-[#5B7B6D] text-white text-xs font-bold hover:bg-[#3E564B] shadow-2xs transition-all active:scale-95"
                >
                  完成浏览
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enhanced Immersive Card Modal for Single Photo Preview */}
      <AnimatePresence>
        {previewIndex !== null && photos[previewIndex] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
            {/* Dark Frosted Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewIndex(null)}
              className="absolute inset-0 bg-[#2B332E]/75 backdrop-blur-md"
            />

            {/* Immersive Photo Card */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
              className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl border border-[#5B7B6D]/30 shadow-2xl overflow-hidden flex flex-col font-sans z-10 paper-texture max-h-[90vh]"
            >
              {/* Card Top Action Bar */}
              <div className="p-3 sm:px-4 sm:py-3 bg-white/90 border-b border-[#5B7B6D]/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-[#FAF8F5] border border-[#5B7B6D]/20 text-[#5B7B6D] px-2.5 py-1 rounded-xl shadow-2xs">
                    {previewIndex + 1} / {photos.length}
                  </span>
                  <span className="text-xs text-[#2B332E] font-serif font-bold truncate max-w-[150px] sm:max-w-[220px]">
                    【{personName}】昔日留影
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmIndex(previewIndex)}
                    className="p-1.5 text-[#6E7C75] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="删除此照片"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(null)}
                    className="p-1.5 text-[#6E7C75] hover:text-[#2B332E] hover:bg-stone-100 rounded-xl transition-all"
                    title="关闭大图预览"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Photo Display Stage with Floating Prev/Next Controls */}
              <div className="relative flex-1 bg-stone-900/90 flex items-center justify-center overflow-hidden p-2 min-h-[260px] max-h-[62vh]">
                <img
                  src={photos[previewIndex]}
                  alt={`${personName} 留影`}
                  className="max-h-[58vh] max-w-full object-contain rounded-xl shadow-lg"
                />

                {/* Left/Right Navigation */}
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => (prev! > 0 ? prev! - 1 : photos.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-all active:scale-95 shadow-md"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-all active:scale-95 shadow-md"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="px-4 py-2.5 bg-white/90 border-t border-[#5B7B6D]/15 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#6E7C75] font-serif">
                  拾年记忆 · 岁月相册
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsGridModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-[#5B7B6D] hover:text-[#E88765] flex items-center gap-1 transition-colors"
                >
                  <Grid className="w-3 h-3" />
                  <span>管理全部相片</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Standalone Delete Confirm Dialog */}
      <AnimatePresence>
        {deleteConfirmIndex !== null && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-[#2B332E]/40 backdrop-blur-xs select-none">
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
                <h3 className="font-bold text-[#2B332E] text-sm sm:text-base font-serif">
                  确认抹去这张相片吗？
                </h3>
                <p className="text-[11px] text-[#6E7C75] leading-relaxed">
                  抹去后该照片将从【{personName}】的相册中永久移除
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmIndex(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/25 bg-white text-[#6E7C75] text-xs font-semibold hover:bg-stone-50 transition-all active:scale-95"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => executeDeletePhoto(deleteConfirmIndex)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-md transition-all active:scale-95"
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
