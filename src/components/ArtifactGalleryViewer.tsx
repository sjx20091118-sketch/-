import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Film, Image as ImageIcon, Volume2 } from 'lucide-react';
import { sound } from '../utils/soundEngine';

interface ArtifactGalleryViewerProps {
  image: string;
  images?: string[];
  video?: string;
  videoPoster?: string;
  name: string;
}

export const ArtifactGalleryViewer: React.FC<ArtifactGalleryViewerProps> = ({
  image,
  images = [],
  video,
  videoPoster,
  name
}) => {
  // Consolidate images
  const allImages = images && images.length > 0 ? images : image ? [image] : [];
  const hasMultipleImages = allImages.length > 1;
  const hasVideo = Boolean(video);

  const [activeMediaTab, setActiveMediaTab] = useState<'image' | 'video'>(
    hasVideo && allImages.length === 0 ? 'video' : 'image'
  );
  const [currentImgIndex, setCurrentImgIndex] = useState<number>(0);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playPaperRustle();
    setCurrentImgIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playPaperRustle();
    setCurrentImgIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-2 select-none">
      {/* Media Type Switcher (if both images and video exist) */}
      {hasVideo && allImages.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 pb-1">
          <button
            type="button"
            onClick={() => {
              sound.playHapticClick(1000);
              setActiveMediaTab('image');
            }}
            className={`px-3 py-1 rounded-full text-xs font-serif flex items-center gap-1 transition-all cursor-pointer ${
              activeMediaTab === 'image'
                ? 'bg-[#2B332E] text-white dark:bg-white dark:text-[#2B332E] font-bold shadow-xs'
                : 'bg-black/5 dark:bg-white/10 text-[#6E7C75] dark:text-[#A7B4AD]'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>照片册 ({allImages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playHapticClick(1000);
              setActiveMediaTab('video');
            }}
            className={`px-3 py-1 rounded-full text-xs font-serif flex items-center gap-1 transition-all cursor-pointer ${
              activeMediaTab === 'video'
                ? 'bg-[#2B332E] text-white dark:bg-white dark:text-[#2B332E] font-bold shadow-xs'
                : 'bg-black/5 dark:bg-white/10 text-[#6E7C75] dark:text-[#A7B4AD]'
            }`}
          >
            <Film className="w-3 h-3 text-amber-400" />
            <span>记忆短片</span>
          </button>
        </div>
      )}

      {/* Main Display Window */}
      {activeMediaTab === 'video' && hasVideo ? (
        <div className="relative w-full rounded-2xl overflow-hidden bg-black/95 aspect-video flex items-center justify-center shadow-inner border border-black/10 dark:border-white/15">
          <video
            src={video}
            poster={videoPoster || image}
            controls
            playsInline
            className="w-full h-full object-contain max-h-[360px]"
          />
        </div>
      ) : (
        <div className="relative w-full rounded-2xl overflow-hidden bg-[#F2EFE9] dark:bg-black/40 border border-[#5B7B6D]/15 dark:border-white/15 shadow-sm group">
          {/* Main Photo Frame */}
          <div className="w-full h-64 sm:h-72 overflow-hidden flex items-center justify-center">
            {allImages.length > 0 ? (
              <img
                src={allImages[currentImgIndex]}
                alt={`${name} - 第 ${currentImgIndex + 1} 张`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="text-center p-6 text-[#6E7C75] font-serif text-xs">
                暂无相片
              </div>
            )}
          </div>

          {/* Navigation Arrows for multi-images */}
          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 cursor-pointer shadow-md"
                title="上一张"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 cursor-pointer shadow-md"
                title="下一张"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Bottom Pagination Badge */}
              <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono shadow-xs">
                {currentImgIndex + 1} / {allImages.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Thumbnail Strip (if > 1 image) */}
      {activeMediaTab === 'image' && hasMultipleImages && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
          {allImages.map((thumb, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                sound.playPaperRustle();
                setCurrentImgIndex(idx);
              }}
              className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                currentImgIndex === idx
                  ? 'border-[#2B332E] dark:border-white scale-105 shadow-xs'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={thumb} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
