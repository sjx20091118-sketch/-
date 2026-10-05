import React, { useRef, useState, useEffect } from 'react';
import { ImagePlus, Trash2, RotateCw, Loader2, Play, Pause, Plus, Video, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { compressImageFile } from './LocalImageUploader';
import { extractVideoPoster, formatVideoDuration } from '../utils/mediaStorage';
import { saveMediaBlob, resolveMediaUrl, isIndexedDbMedia } from '../services/indexedDbMedia';
import { ArtifactVideoItem } from '../types';
import { WaterInkVideoScrubber } from './WaterInkVideoScrubber';
import { MediaImage } from './MediaImage';

interface ArtifactMediaUploaderProps {
  image: string;
  images?: string[];
  video?: string;
  videoPoster?: string;
  videos?: ArtifactVideoItem[];
  mediaType?: 'image' | 'video';
  onChange: (media: {
    image: string;
    images: string[];
    video?: string;
    videoPoster?: string;
    videos: ArtifactVideoItem[];
    mediaType: 'image' | 'video';
  }) => void;
}

export const ArtifactMediaUploader: React.FC<ArtifactMediaUploaderProps> = ({
  image,
  images = [],
  video,
  videoPoster,
  videos = [],
  mediaType = 'image',
  onChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [resolvedPlaybackUrl, setResolvedPlaybackUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Consolidate videos strictly (deduplicated by url)
  const consolidatedVideos: ArtifactVideoItem[] = React.useMemo(() => {
    const rawList = (videos && videos.length > 0)
      ? videos
      : (video ? [{ id: 'vid-legacy', url: video, poster: videoPoster }] : []);

    const uniqueVideos: ArtifactVideoItem[] = [];
    const seenUrls = new Set<string>();

    for (const v of rawList) {
      if (!v || !v.url || typeof v.url !== 'string') continue;
      if (seenUrls.has(v.url)) continue;
      seenUrls.add(v.url);
      uniqueVideos.push({
        id: v.id || `vid-${uniqueVideos.length}`,
        url: v.url,
        poster: v.poster || videoPoster
      });
    }
    return uniqueVideos;
  }, [videos, video, videoPoster]);

  // Consolidate images strictly (source of truth: images, never double-push image, deduplicated by Set)
  const consolidatedImages: string[] = React.useMemo(() => {
    const rawList = (images && images.length > 0)
      ? images
      : (image && mediaType === 'image' ? [image] : []);

    const uniqueList: string[] = [];
    const seen = new Set<string>();

    for (const img of rawList) {
      if (!img || typeof img !== 'string') continue;
      if (seen.has(img)) continue;
      seen.add(img);
      uniqueList.push(img);
    }
    return uniqueList;
  }, [images, image, mediaType]);

  const [selectedIndex, setSelectedIndex] = useState<{ type: 'image' | 'video'; index: number }>(() => {
    if (consolidatedVideos.length > 0 && (mediaType === 'video' || consolidatedImages.length === 0)) {
      return { type: 'video', index: 0 };
    }
    return { type: 'image', index: 0 };
  });

  // Keep selected index in sync when media changes
  useEffect(() => {
    if (selectedIndex.type === 'image') {
      if (consolidatedImages.length === 0 && consolidatedVideos.length > 0) {
        setSelectedIndex({ type: 'video', index: 0 });
      } else if (selectedIndex.index >= consolidatedImages.length && consolidatedImages.length > 0) {
        setSelectedIndex({ type: 'image', index: consolidatedImages.length - 1 });
      }
    } else {
      if (consolidatedVideos.length === 0 && consolidatedImages.length > 0) {
        setSelectedIndex({ type: 'image', index: 0 });
      } else if (selectedIndex.index >= consolidatedVideos.length && consolidatedVideos.length > 0) {
        setSelectedIndex({ type: 'video', index: consolidatedVideos.length - 1 });
      }
    }
  }, [consolidatedImages.length, consolidatedVideos.length, selectedIndex]);

  // Resolve video stream URL for playback
  useEffect(() => {
    let isCancelled = false;
    if (selectedIndex.type === 'video' && consolidatedVideos[selectedIndex.index]) {
      const vidObj = consolidatedVideos[selectedIndex.index];
      if (isIndexedDbMedia(vidObj.url)) {
        resolveMediaUrl(vidObj.url).then((url) => {
          if (!isCancelled) setResolvedPlaybackUrl(url);
        });
      } else {
        setResolvedPlaybackUrl(vidObj.url);
      }
    } else {
      setResolvedPlaybackUrl('');
    }
    return () => {
      isCancelled = true;
    };
  }, [selectedIndex, consolidatedVideos]);

  const handleTogglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (targetTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const next = !isMuted;
      videoRef.current.muted = next;
      setIsMuted(next);
    }
  };

  const handleFiles = async (files: FileList | null, isAppend = false) => {
    if (!files || files.length === 0) return;

    sound.playPaperRustle();
    setIsProcessing(true);

    try {
      const newImages: string[] = [];
      const newVideos: ArtifactVideoItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v)$/i);

        if (isVid) {
          const [idbUri, posterInfo] = await Promise.all([
            saveMediaBlob(file),
            extractVideoPoster(file)
          ]);
          newVideos.push({
            id: 'vid-' + Date.now() + '-' + i,
            url: idbUri,
            poster: posterInfo.poster
          });
        } else {
          const compressed = await compressImageFile(file, 1600, 1600, 0.88);
          newImages.push(compressed);
        }
      }

      const updatedImages = isAppend ? [...consolidatedImages, ...newImages] : newImages;
      const updatedVideos = isAppend ? [...consolidatedVideos, ...newVideos] : newVideos;

      const finalMediaType: 'image' | 'video' = updatedImages.length > 0 ? 'image' : 'video';
      const primaryCover = updatedImages[0] || updatedVideos[0]?.poster || '';

      onChange({
        image: primaryCover,
        images: updatedImages,
        videos: updatedVideos,
        video: updatedVideos[0]?.url,
        videoPoster: updatedVideos[0]?.poster,
        mediaType: finalMediaType
      });

      if (updatedImages.length > 0 && newImages.length > 0) {
        setSelectedIndex({ type: 'image', index: isAppend ? consolidatedImages.length : 0 });
      } else if (updatedVideos.length > 0) {
        setSelectedIndex({ type: 'video', index: isAppend ? consolidatedVideos.length : 0 });
      }
    } catch (err) {
      console.error('旧物影像处理失败:', err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (appendFileInputRef.current) appendFileInputRef.current.value = '';
    }
  };

  const handleRemoveItem = (type: 'image' | 'video', idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playPaperRustle();

    if (type === 'image') {
      const nextImages = consolidatedImages.filter((_, i) => i !== idx);
      const nextPrimary = nextImages[0] || '';
      const nextMediaType: 'image' | 'video' = nextImages.length > 0 ? 'image' : (consolidatedVideos.length > 0 ? 'video' : 'image');
      onChange({
        image: nextPrimary,
        images: nextImages,
        videos: consolidatedVideos,
        video: consolidatedVideos[0]?.url,
        videoPoster: consolidatedVideos[0]?.poster,
        mediaType: nextMediaType
      });
      if (selectedIndex.type === 'image' && selectedIndex.index === idx) {
        setSelectedIndex({
          type: nextImages.length > 0 ? 'image' : 'video',
          index: Math.max(0, idx - 1)
        });
      }
    } else {
      const nextVideos = consolidatedVideos.filter((_, i) => i !== idx);
      const nextMediaType: 'image' | 'video' = consolidatedImages.length > 0 ? 'image' : (nextVideos.length > 0 ? 'video' : 'image');
      onChange({
        image: consolidatedImages[0] || '',
        images: consolidatedImages,
        videos: nextVideos,
        video: nextVideos[0]?.url,
        videoPoster: nextVideos[0]?.poster,
        mediaType: nextMediaType
      });
      if (selectedIndex.type === 'video' && selectedIndex.index === idx) {
        setSelectedIndex({
          type: nextVideos.length > 0 ? 'video' : 'image',
          index: Math.max(0, idx - 1)
        });
      }
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playPaperRustle();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onChange({
      image: '',
      images: [],
      videos: [],
      video: undefined,
      videoPoster: undefined,
      mediaType: 'image'
    });
    setSelectedIndex({ type: 'image', index: 0 });
  };

  const hasMedia = consolidatedImages.length > 0 || consolidatedVideos.length > 0;
  const totalCount = consolidatedImages.length + consolidatedVideos.length;

  return (
    <div className="space-y-2.5 font-sans select-none">
      {/* File input for initial upload / replace */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, false)}
      />

      {/* File input for appending more media */}
      <input
        ref={appendFileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, true)}
      />

      {hasMedia ? (
        <div className="space-y-2">
          {/* Main Preview Frame */}
          <div className="relative group w-full h-52 sm:h-60 rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/95 shadow-md flex items-center justify-center">
            {selectedIndex.type === 'video' && consolidatedVideos[selectedIndex.index] ? (
              <div
                onClick={() => handleTogglePlay()}
                className="relative w-full h-full flex items-center justify-center cursor-pointer bg-black/95"
              >
                {resolvedPlaybackUrl ? (
                  <video
                    ref={videoRef}
                    src={resolvedPlaybackUrl}
                    poster={consolidatedVideos[selectedIndex.index]?.poster}
                    playsInline
                    loop
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    className="w-full h-full object-contain max-h-[360px]"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-white/70 text-xs font-serif">
                    <Loader2 className="w-4 h-4 animate-spin text-[#5B7B6D]" />
                    <span>正在载入影像...</span>
                  </div>
                )}

                {/* 智能抽帧封面图层（未放映时展示鲜活定格，杜绝黑屏） */}
                {!isPlaying && consolidatedVideos[selectedIndex.index]?.poster && (
                  <img
                    src={consolidatedVideos[selectedIndex.index]?.poster}
                    alt="poster"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                )}

                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-black/30" />

                {/* Status indicator */}
                <div className="absolute top-2.5 left-2.5 pointer-events-none z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white/90 text-[10px] font-mono shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>{isPlaying ? '放映中' : '岁月短片'}</span>
                  {duration > 0 && <span className="opacity-70 font-mono">· {formatVideoDuration(duration)}</span>}
                </div>

                {/* Center Play Button */}
                {!isPlaying && resolvedPlaybackUrl && (
                  <div className="absolute z-10 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110 active:scale-95 pointer-events-none">
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  </div>
                )}

                {/* Bottom Seeker & Audio Bar */}
                <div
                  className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePlay()}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <WaterInkVideoScrubber
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={handleSeek}
                        themeColor="#FFFFFF"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0"
                      title={isMuted ? '开启声音' : '静音'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-[#FAF8F5] dark:bg-black/40">
                <MediaImage
                  src={consolidatedImages[selectedIndex.index] || image}
                  alt="预览"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Top Right Quick Controls */}
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isProcessing) fileInputRef.current?.click();
                }}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md text-[10px] font-serif flex items-center gap-1 transition-all active:scale-90 border border-white/15 cursor-pointer shadow-xs disabled:opacity-50"
                title="重新选择全部"
              >
                <RotateCw className="w-3 h-3" />
                <span>更换</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleRemoveItem(selectedIndex.type, selectedIndex.index, e)}
                disabled={isProcessing}
                className="p-1.5 rounded-full bg-black/40 hover:bg-red-500/80 text-white backdrop-blur-md transition-all active:scale-90 border border-white/15 cursor-pointer shadow-xs disabled:opacity-50"
                title="删除当前单项"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Media thumbnail shelf: Always show when there is at least 1 media item, so user can always append via [+]! */}
          {totalCount >= 1 && (
            <div className="p-2 rounded-2xl bg-[#FAF8F5] dark:bg-white/[0.04] border border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2 overflow-x-auto py-0.5 custom-scrollbar">
                {consolidatedImages.map((img, idx) => (
                  <div
                    key={`shelf-img-${idx}`}
                    onClick={() => setSelectedIndex({ type: 'image', index: idx })}
                    className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-black/5 ${
                      selectedIndex.type === 'image' && selectedIndex.index === idx
                        ? 'border-[#5B7B6D] dark:border-white scale-105 shadow-xs ring-2 ring-[#5B7B6D]/20'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <MediaImage src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}

                {consolidatedVideos.map((vid, idx) => (
                  <div
                    key={`shelf-vid-${idx}`}
                    onClick={() => setSelectedIndex({ type: 'video', index: idx })}
                    className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 bg-black transition-all cursor-pointer ${
                      selectedIndex.type === 'video' && selectedIndex.index === idx
                        ? 'border-[#5B7B6D] dark:border-white scale-105 shadow-xs ring-2 ring-[#5B7B6D]/20'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {vid.poster ? (
                      <MediaImage src={vid.poster} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/70">
                        <Video className="w-4 h-4" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                      <Play className="w-3 h-3 fill-white text-white" />
                    </div>
                  </div>
                ))}

                {/* [+] Continuous append button */}
                <button
                  type="button"
                  onClick={() => appendFileInputRef.current?.click()}
                  className="shrink-0 w-14 h-14 rounded-xl border-2 border-dashed border-[#5B7B6D]/30 hover:border-[#5B7B6D] bg-white dark:bg-white/5 hover:bg-[#5B7B6D]/5 flex flex-col items-center justify-center gap-0.5 text-[#5B7B6D] transition-all cursor-pointer active:scale-95"
                  title="继续添加相片或短片"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[9px] font-serif font-medium leading-none">添加</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty Upload Box */
        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#5B7B6D]/20 dark:border-white/15 hover:border-[#5B7B6D]/50 dark:hover:border-white/30 rounded-2xl p-4 bg-[#FAF8F5]/60 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.07] transition-all cursor-pointer text-center group active:scale-[0.99] shadow-2xs"
        >
          <div className="flex flex-col items-center justify-center gap-1.5 py-1">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-white/10 border border-[#5B7B6D]/15 dark:border-white/15 flex items-center justify-center text-[#5B7B6D] dark:text-[#E88765] group-hover:scale-105 group-hover:border-[#5B7B6D]/40 dark:group-hover:border-white/30 transition-all shadow-2xs">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 text-[#5B7B6D] dark:text-[#E88765] animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5 text-[#5B7B6D] dark:text-[#E88765]" />
              )}
            </div>
            <div className="text-xs font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5]">
              {isProcessing ? '正在处理影像附件...' : '点击上传相片或视频'}
            </div>
            <p className="text-[10px] text-[#6E7C75] dark:text-[#A7B4AD] font-serif">
              支持相片、实况照片或本地短视频 · 单机离线留存
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
