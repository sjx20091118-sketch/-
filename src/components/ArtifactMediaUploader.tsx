import React, { useRef, useState, useEffect } from 'react';
import { ImagePlus, Trash2, RotateCw, Loader2, Play } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { compressImageFile } from './LocalImageUploader';
import { extractVideoPoster, isVideoMedia, formatVideoDuration } from '../utils/mediaStorage';
import { saveMediaBlob, resolveMediaUrl, isIndexedDbMedia } from '../services/indexedDbMedia';

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

export const ArtifactMediaUploader: React.FC<ArtifactMediaUploaderProps> = ({
  image,
  images = [],
  video,
  videoPoster,
  mediaType = 'image',
  onChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resolvedPlaybackUrl, setResolvedPlaybackUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentCover = image || (images.length > 0 ? images[0] : '');
  const isVideo = mediaType === 'video' || Boolean(video) || isVideoMedia(video || currentCover) || isIndexedDbMedia(video || '');

  // 异步解析 IndexedDB 虚拟 URI 为流式播放地址
  useEffect(() => {
    let isCancelled = false;
    const mediaToResolve = video || (isVideo ? currentCover : '');

    if (mediaToResolve) {
      if (isIndexedDbMedia(mediaToResolve)) {
        resolveMediaUrl(mediaToResolve).then((url) => {
          if (!isCancelled) setResolvedPlaybackUrl(url);
        });
      } else {
        setResolvedPlaybackUrl(mediaToResolve);
      }
    } else {
      setResolvedPlaybackUrl('');
    }

    return () => {
      isCancelled = true;
    };
  }, [video, currentCover, isVideo]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sound.playPaperRustle();
    setIsProcessing(true);

    try {
      const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v)$/i);

      if (isVid) {
        // 1. 采用 IndexedDB 原生二进制流存储（避免超大视频导致内存崩溃）
        const [idbUri, posterInfo] = await Promise.all([
          saveMediaBlob(file),
          extractVideoPoster(file)
        ]);

        onChange({
          image: posterInfo.poster || '',
          images: posterInfo.poster ? [posterInfo.poster] : [],
          video: idbUri,
          videoPoster: posterInfo.poster,
          mediaType: 'video'
        });
      } else {
        // 2. 照片自动高清保真压缩
        const compressedDataUrl = await compressImageFile(file, 1400, 1400, 0.86);
        onChange({
          image: compressedDataUrl,
          images: [compressedDataUrl],
          video: undefined,
          videoPoster: undefined,
          mediaType: 'image'
        });
      }
    } catch (err) {
      console.error('旧物影像处理失败:', err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playPaperRustle();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onChange({
      image: '',
      images: [],
      video: undefined,
      videoPoster: undefined,
      mediaType: 'image'
    });
  };

  const hasMedia = isVideo ? Boolean(video || currentCover) : Boolean(currentCover);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-2 font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 已上传预览卡片 */}
      {hasMedia ? (
        <div className="relative group w-full h-48 sm:h-56 rounded-3xl overflow-hidden border border-white/10 bg-black/90 shadow-md select-none">
          {isVideo ? (
            /* 100% 对齐时光轴/拾物阁复古放映器：左上角放映状态/时长，居中毛玻璃播放键，底部进度条，右上角更换与清除 */
            <div
              onClick={handleTogglePlay}
              className="relative w-full h-full flex items-center justify-center cursor-pointer bg-black/95"
            >
              {resolvedPlaybackUrl ? (
                <video
                  ref={videoRef}
                  src={resolvedPlaybackUrl}
                  poster={videoPoster || currentCover}
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
                  <span>正在载入影像...</span>
                </div>
              )}

              {/* 胶片颗粒纹理与四周暗角微晕 */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30" />

              {/* 左上角放映状态胶囊（苹果液态玻璃风格，与拾物阁完全一致） */}
              <div className="absolute top-2.5 left-2.5 pointer-events-none z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white/90 text-[10px] font-mono shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{isPlaying ? '放映中' : '岁月影像'}</span>
                {duration > 0 && <span className="opacity-70 font-mono">· {formatVideoDuration(duration)}</span>}
              </div>

              {/* 右上角快捷控制区：专属更换与清除按键（苹果液态玻璃风格） */}
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
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-red-500/80 text-white backdrop-blur-md transition-all active:scale-90 border border-white/15 cursor-pointer shadow-xs disabled:opacity-50"
                  title="清除影像"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* 居中毛玻璃液态微光播放键（暂停时浮现，拾物阁同款设计） */}
              {!isPlaying && resolvedPlaybackUrl && (
                <div className="absolute z-10 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110 active:scale-95 pointer-events-none">
                  <Play className="w-5 h-5 fill-white translate-x-0.5" />
                </div>
              )}

              {/* 底部时光细刻度与进度条（与 VintageVideoPlayer 完全一致） */}
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
            <div className="relative w-full h-full">
              <img
                src={currentCover}
                alt="旧物相片"
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              />

              {/* 右上角相片专属操作按键 */}
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
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-red-500/80 backdrop-blur-md text-white transition-all cursor-pointer shadow-xs active:scale-90 disabled:opacity-50 border border-white/15"
                  title="清除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 未上传引导框（极简雅致，无冗余文字） */
        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className="w-full h-40 sm:h-48 rounded-2xl border-2 border-dashed border-[#5B7B6D]/30 hover:border-[#5B7B6D] dark:border-white/20 dark:hover:border-white/40 bg-white/80 dark:bg-white/[0.03] hover:bg-[#FDF0EB]/30 transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center group active:scale-[0.99] shadow-2xs"
        >
          <div className="w-11 h-11 rounded-2xl bg-[#5B7B6D]/10 text-[#5B7B6D] dark:bg-white/10 dark:text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 text-[#5B7B6D] animate-spin" />
            ) : (
              <ImagePlus className="w-5 h-5 stroke-[1.8]" />
            )}
          </div>
          <p className="text-xs font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5]">
            {isProcessing ? '正在处理影像附件...' : '点击上传相片或录长视频'}
          </p>
        </div>
      )}
    </div>
  );
};
