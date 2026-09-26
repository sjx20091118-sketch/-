import React, { useRef, useState, useEffect } from 'react';
import { ImagePlus, Trash2, Loader2, Play, RotateCw } from 'lucide-react';
import { compressImageFile } from './LocalImageUploader';
import { extractVideoPoster, isVideoMedia, formatVideoDuration } from '../utils/mediaStorage';
import { saveMediaBlob, resolveMediaUrl, isIndexedDbMedia } from '../services/indexedDbMedia';

interface LocalMediaUploaderProps {
  value?: string;                    // 当前媒体地址（idb://..., base64 或 url）
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resolvedPlaybackUrl, setResolvedPlaybackUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 异步解析 IndexedDB 虚拟 URI 为流式播放地址
  useEffect(() => {
    let isCancelled = false;
    if (value) {
      if (isIndexedDbMedia(value)) {
        resolveMediaUrl(value).then((url) => {
          if (!isCancelled) setResolvedPlaybackUrl(url);
        });
      } else {
        setResolvedPlaybackUrl(value);
      }
    } else {
      setResolvedPlaybackUrl('');
    }
    return () => {
      isCancelled = true;
    };
  }, [value]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.currentTarget;
    setCurrentTime(target.currentTime);
    if (!duration && target.duration) {
      setDuration(target.duration);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.currentTarget;
    if (target.duration) {
      setDuration(target.duration);
    }
  };

  const handleFile = async (file: File) => {
    const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v)$/i);
    setIsProcessing(true);

    try {
      if (isVid && allowVideo) {
        // 1. 采用 IndexedDB 原生二进制流存储（避免百兆长视频 Base64 暴涨导致内存崩溃）
        const [idbUri, posterInfo] = await Promise.all([
          saveMediaBlob(file),
          extractVideoPoster(file)
        ]);
        onChange(idbUri, 'video', posterInfo.poster);
      } else {
        // 2. 照片自动高清保真压缩
        const compressed = await compressImageFile(file, 1400, 1400, 0.86);
        onChange(compressed, 'image');
      }
    } catch (err) {
      console.error('媒体处理失败:', err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const detectedIsVideo = mediaType === 'video' || isVideoMedia(value) || isIndexedDbMedia(value);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-2 font-sans">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#2B332E] dark:text-[#FAF8F5] font-serif flex items-center gap-1.5">
          <ImagePlus className="w-3.5 h-3.5 text-[#5B7B6D]" />
          <span>{label}</span>
        </label>
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
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/90 p-0 group select-none shadow-md">
          {detectedIsVideo ? (
            /* 100% 对齐 VintageVideoPlayer：左上角放映状态/时长、居中微光播放键、底部实时刻度进度条、右上角更换与清除 */
            <div
              onClick={handleTogglePlay}
              className="relative aspect-video rounded-3xl overflow-hidden bg-black/95 flex items-center justify-center cursor-pointer"
            >
              {resolvedPlaybackUrl ? (
                <video
                  ref={videoRef}
                  src={resolvedPlaybackUrl}
                  poster={poster}
                  playsInline
                  loop
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  className="w-full h-full object-cover max-h-[360px]"
                />
              ) : (
                <div className="flex items-center gap-2 text-white/70 text-xs font-serif">
                  <Loader2 className="w-4 h-4 animate-spin text-[#5B7B6D]" />
                  <span>正在准备高清流式通道...</span>
                </div>
              )}

              {/* 胶片颗粒纹理与四周暗角微晕 */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30" />

              {/* 左上角放映状态胶囊（苹果液态玻璃风格） */}
              <div className="absolute top-2.5 left-2.5 pointer-events-none z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white/90 text-[10px] font-mono shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{isPlaying ? '放映中' : '岁月影像'}</span>
                {duration > 0 && <span className="opacity-70 font-mono">· {formatVideoDuration(duration)}</span>}
              </div>

              {/* 右上角快捷控制区：专属更换与清除按键 */}
              <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isProcessing) fileInputRef.current?.click();
                  }}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-90 border border-white/15 cursor-pointer shadow-xs text-[10px] font-serif flex items-center gap-1 disabled:opacity-50"
                  title="更换影像"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>更换</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlaying(false);
                    setCurrentTime(0);
                    setDuration(0);
                    onClear();
                  }}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-red-500/80 text-white backdrop-blur-md transition-all active:scale-90 border border-white/15 cursor-pointer shadow-xs"
                  title="清除影像"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* 居中毛玻璃液态微光播放键 (暂停时浮现) */}
              {!isPlaying && resolvedPlaybackUrl && (
                <div className="absolute z-10 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110 active:scale-95 pointer-events-none">
                  <Play className="w-5 h-5 fill-white translate-x-0.5" />
                </div>
              )}

              {/* 底部时光刻度与细致进度条 */}
              <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-4 transition-opacity">
                <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mb-1.5 relative">
                  <div
                    className="h-full bg-white transition-all duration-100 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-white/80 px-0.5">
                  <span>{formatVideoDuration(currentTime)}</span>
                  <span>{formatVideoDuration(duration)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-white">
              <img
                src={resolvedPlaybackUrl || value}
                alt="预览"
                className="w-full h-full object-cover"
              />
              {/* 图片右上角快捷操作 */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isProcessing) fileInputRef.current?.click();
                  }}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md text-[10px] font-serif flex items-center gap-1 transition-all active:scale-90 border border-white/15 cursor-pointer shadow-xs disabled:opacity-50"
                  title="更换相片"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>更换</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-red-500/80 text-white backdrop-blur-md transition-all active:scale-90 border border-white/15 cursor-pointer shadow-xs"
                  title="清除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#5B7B6D]/20 hover:border-[#5B7B6D]/50 rounded-2xl p-4 bg-[#FAF8F5]/60 hover:bg-white transition-all cursor-pointer text-center group active:scale-[0.99] shadow-2xs"
        >
          <div className="flex flex-col items-center justify-center gap-1.5 py-1">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#5B7B6D]/15 flex items-center justify-center text-[#5B7B6D] group-hover:scale-105 group-hover:border-[#5B7B6D]/40 transition-all shadow-2xs">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 text-[#5B7B6D] animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5 text-[#5B7B6D]" />
              )}
            </div>
            <div className="text-xs font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5]">
              {isProcessing ? '正在处理影像附件...' : '点击上传相片或录长视频'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
