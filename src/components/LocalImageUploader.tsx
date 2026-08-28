import React, { useState, useRef } from 'react';
import { Upload, Camera, X, Image as ImageIcon, Sparkles, Check, RefreshCw, Plus } from 'lucide-react';

export interface LocalImageUploaderProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  subLabel?: string;
  mode?: 'avatar' | 'banner' | 'card';
  presetAvatars?: string[];
  required?: boolean;
  className?: string;
  aiGenerateButton?: {
    onGenerate: () => void;
    isLoading: boolean;
    text?: string;
  };
}

// Client-side HTML5 Canvas based image compressor to ensure fast offline storage within localStorage quotas
export function compressImageFile(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.82
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

export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80'
];

export const LocalImageUploader: React.FC<LocalImageUploaderProps> = ({
  value,
  onChange,
  label = '本地图片上传',
  subLabel,
  mode = 'card',
  presetAvatars = PRESET_AVATARS,
  required = false,
  className = '',
  aiGenerateButton
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsProcessing(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      onChange(compressedDataUrl);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  if (mode === 'avatar') {
    return (
      <div className={`space-y-2.5 font-sans ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#2B332E] text-xs font-serif">{label}</span>
            {required ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FDF0EB] text-[#E88765] border border-[#E88765]/30 font-semibold font-sans">
                * 必填
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-sans">
                选填
              </span>
            )}
          </div>
          {subLabel && <span className="text-[10px] text-[#6E7C75]">{subLabel}</span>}
        </div>

        <div className="flex items-center gap-3.5 bg-white p-3 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs">
          {/* Avatar Preview / Blank Plus Placeholder */}
          <div className="relative group shrink-0">
            {value ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#E88765]/50 shadow-sm bg-[#FAF8F5]">
                <img src={value} alt="Avatar Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="点击更换本地相片"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full border-2 border-dashed border-[#5B7B6D]/35 bg-[#FAF8F5] flex flex-col items-center justify-center text-[#5B7B6D] hover:border-[#E88765] hover:text-[#E88765] hover:bg-[#FDF0EB]/60 transition-all cursor-pointer shadow-2xs active:scale-95 group"
                title="点击上传本地相片"
              >
                <Plus className="w-6 h-6 stroke-[2.2] group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="min-h-[44px] px-4 py-2 bg-[#5B7B6D] hover:bg-[#3E564B] active:bg-[#3E564B] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 shrink-0 select-none touch-manipulation"
              >
                <Upload className="w-4 h-4" />
                <span>{isProcessing ? '优化中...' : (value ? '更换本地相片' : '上传本地相片')}</span>
              </button>

              {value && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="min-h-[44px] min-w-[44px] px-3 py-2 text-[#6E7C75] hover:text-red-500 active:text-red-600 rounded-xl hover:bg-red-50 active:bg-red-100 text-xs transition-colors border border-dashed border-[#5B7B6D]/20 active:scale-95 flex items-center justify-center select-none touch-manipulation"
                  title="清除头像"
                >
                  清除
                </button>
              )}
            </div>
            <p className="text-[10px] text-[#6E7C75] leading-relaxed">
              支持手机相册选取、即时拍照 · 本地压缩离线保存在设备中
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />
      </div>
    );
  }

  // Card / Banner mode for Timeline, Artifacts, Stories
  return (
    <div className={`space-y-2 font-sans ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#2B332E] text-xs font-serif">{label}</span>
          {required ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FDF0EB] text-[#E88765] border border-[#E88765]/30 font-semibold font-sans">
              * 必传
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-sans">
              选填
            </span>
          )}
        </div>
        {subLabel && <span className="text-[10px] text-[#6E7C75]">{subLabel}</span>}
      </div>

      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-[#5B7B6D]/20 bg-[#FAF8F5] group shadow-2xs">
          <div className={`${mode === 'banner' ? 'h-36' : 'h-44'} w-full relative`}>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
              <span className="text-[11px] text-white/90 font-medium">已载入本地相片</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[38px] px-3.5 py-1.5 bg-white/95 hover:bg-white active:bg-[#F2EFE9] text-[#2B332E] text-xs rounded-xl font-medium shadow-sm transition-all active:scale-95 touch-manipulation"
                >
                  更换照片
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="min-h-[38px] min-w-[38px] p-2 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center touch-manipulation"
                  title="移除照片"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-2.5 bg-white/90 border-t border-[#5B7B6D]/10 flex items-center justify-between text-[11px] text-[#6E7C75]">
            <span className="flex items-center gap-1 text-[#5B7B6D] font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> 本地离线存储已就绪
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#5B7B6D] hover:underline font-semibold active:opacity-75 touch-manipulation p-1"
            >
              重新上传
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center space-y-2.5 touch-manipulation select-none active:scale-[0.99] ${
            isDragging
              ? 'border-[#E88765] bg-[#FDF0EB]/60'
              : 'border-[#5B7B6D]/25 bg-[#FAF8F5]/80 hover:bg-white active:bg-[#F2EFE9] hover:border-[#5B7B6D]/50'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-white shadow-2xs border border-[#5B7B6D]/15 flex items-center justify-center text-[#5B7B6D] mx-auto">
            {isProcessing ? (
              <RefreshCw className="w-5 h-5 animate-spin text-[#E88765]" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-[#2B332E]">
              {isProcessing ? '正在优化图片并载入本地...' : '点击选择手机本地照片 / 拍照'}
            </p>
            <p className="text-[10px] text-[#6E7C75] mt-0.5">
              支持 JPG、PNG、WEBP · 纯单机本地存储，离线可查
            </p>
          </div>

          {aiGenerateButton && (
            <div className="pt-1 flex justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={aiGenerateButton.onGenerate}
                disabled={aiGenerateButton.isLoading}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white border border-[#5B7B6D]/20 hover:border-[#E88765] active:bg-[#FDF0EB] text-[#5B7B6D] active:text-[#E88765] text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5 active:scale-95 touch-manipulation"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E88765]" />
                <span>{aiGenerateButton.isLoading ? '绘图中...' : (aiGenerateButton.text || 'AI 绘制画面')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />
    </div>
  );
};
