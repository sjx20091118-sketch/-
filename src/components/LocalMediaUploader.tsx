import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, Film, Loader2 } from 'lucide-react';
import { compressImageFile } from './LocalImageUploader';
import { extractVideoPoster, readFileAsBase64, isVideoMedia } from '../utils/mediaStorage';

interface LocalMediaUploaderProps {
  value?: string;                    // 当前媒体地址（base64 或 url）
  poster?: string;                   // 视频首帧封面
  mediaType?: 'image' | 'video';     // 类型
  onChange: (mediaUrl: string, mediaType: 'image' | 'video', poster?: string) => void;
  onClear: () => void;
  label?: string;
  allowVideo?: boolean;
}

export const LocalMediaUploader: React.FC<LocalMediaUploaderProps> = ({
  value,
  poster,
  mediaType = 'image',
  onChange,
  onClear,
  label = '相片与时光影像',
  allowVideo = true
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v)$/i);
    setIsProcessing(true);

    try {
      if (isVid && allowVideo) {
        // 视频处理并自动提取首帧海报
        const [base64, posterInfo] = await Promise.all([
          readFileAsBase64(file),
          extractVideoPoster(file)
        ]);
        onChange(base64, 'video', posterInfo.poster);
      } else {
        // 照片自动无损压缩优化
        const compressed = await compressImageFile(file, 1200, 1200, 0.85);
        onChange(compressed, 'image');
      }
    } catch (err) {
      console.error('媒体处理失败:', err);
      alert('文件读取处理失败，建议选取常规规格的照片或 30MB 内的短视频');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const detectedIsVideo = mediaType === 'video' || isVideoMedia(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#2B332E] font-serif flex items-center gap-1.5">
          <ImagePlus className="w-3.5 h-3.5 text-[#5B7B6D]" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] text-[#6E7C75] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#5B7B6D]/15 font-sans">
          支持照片 / 视频
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={allowVideo ? "image/*,video/*" : "image/*"}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-[#5B7B6D]/20 bg-black/5 p-1 group">
          {detectedIsVideo ? (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black/90 flex items-center justify-center">
              <video
                src={value}
                poster={poster}
                controls
                playsInline
                className="w-full h-full object-contain max-h-[200px]"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-mono flex items-center gap-1 pointer-events-none">
                <Film className="w-2.5 h-2.5 text-[#E88765]" />
                <span>实录时光短视频</span>
              </div>
            </div>
          ) : (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-white">
              <img
                src={value}
                alt="预览"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-xl bg-white/90 hover:bg-white text-[#2B332E] text-[11px] font-medium shadow-md backdrop-blur-xs transition-all cursor-pointer active:scale-95"
            >
              更换
            </button>
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-xl bg-red-600/90 hover:bg-red-600 text-white shadow-md backdrop-blur-xs transition-all cursor-pointer active:scale-95"
              title="清除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#5B7B6D]/20 hover:border-[#5B7B6D]/50 rounded-2xl p-4 bg-[#FAF8F5]/60 hover:bg-white transition-all cursor-pointer text-center group active:scale-[0.99] shadow-2xs"
        >
          <div className="flex flex-col items-center justify-center gap-1.5 py-1">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#5B7B6D]/15 flex items-center justify-center text-[#5B7B6D] group-hover:scale-105 group-hover:border-[#5B7B6D]/40 transition-all shadow-2xs">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 text-[#E88765] animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5 text-[#5B7B6D]" />
              )}
            </div>
            <div className="text-xs font-serif font-bold text-[#2B332E]">
              {isProcessing ? '正在处理时光影像...' : '点击上传相片或短视频'}
            </div>
            <div className="text-[10px] text-[#6E7C75]">
              自动识别静态胶片或动态视频，本地安全加密存储
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
