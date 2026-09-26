import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, Plus, Trash2, RotateCw } from 'lucide-react';
import { sound } from '../utils/soundEngine';

interface ArtifactMediaUploaderProps {
  image: string;
  images?: string[];
  video?: string;
  videoPoster?: string;
  mediaType?: 'image' | 'video';
  onChange: (media: {
    image: string;
    images: string[];
    video?: string;
    videoPoster?: string;
    mediaType: 'image' | 'video';
  }) => void;
  onGenerateAiImage?: (callback: (url: string) => void) => void;
  isAiGenLoading?: boolean;
}

// Client-side HTML5 Canvas based image compressor to ensure fast offline storage
function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(readerEvent.target?.result as string);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ArtifactMediaUploader: React.FC<ArtifactMediaUploaderProps> = ({
  image,
  images = [],
  video,
  videoPoster,
  mediaType = 'image',
  onChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentCover = image || (images.length > 0 ? images[0] : '');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sound.playPaperRustle();
    try {
      const compressedDataUrl = await compressImageFile(file);
      onChange({
        image: compressedDataUrl,
        images: [compressedDataUrl],
        video,
        videoPoster,
        mediaType: 'image'
      });
    } catch (err) {
      console.error('Image upload failed', err);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playPaperRustle();
    onChange({
      image: '',
      images: [],
      video: undefined,
      videoPoster: undefined,
      mediaType: 'image'
    });
  };

  return (
    <div className="space-y-2 font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Pure, Single Clean Framed Box */}
      {currentCover ? (
        <div className="relative group w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-black/10 dark:border-white/15 bg-[#FAF8F5] dark:bg-black/30 shadow-xs">
          <img
            src={currentCover}
            alt="旧物相片"
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
          />

          {/* Clean Floating Quick Action Buttons */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-serif flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
              title="更换相片"
            >
              <RotateCw className="w-3 h-3" />
              <span>更换相片</span>
            </button>
            <button
              type="button"
              onClick={handleClearImage}
              className="p-1.5 rounded-xl bg-black/60 hover:bg-red-500/90 backdrop-blur-md text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="删除相片"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-40 sm:h-48 rounded-2xl border-2 border-dashed border-[#5B7B6D]/30 hover:border-[#5B7B6D] dark:border-white/20 dark:hover:border-white/40 bg-white/80 dark:bg-white/[0.03] hover:bg-[#FDF0EB]/30 transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center group active:scale-[0.99] shadow-2xs"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#5B7B6D]/10 text-[#5B7B6D] dark:bg-white/10 dark:text-white flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6 stroke-[1.8]" />
          </div>
          <p className="text-xs font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5]">
            点击上传旧物相片
          </p>
          <p className="text-[11px] text-[#6E7C75] dark:text-[#A7B4AD] mt-1 font-serif">
            支持 JPG、PNG 格式 · 本地离线永久珍藏
          </p>
        </div>
      )}
    </div>
  );
};
