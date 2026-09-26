import React, { useRef, useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X, RotateCcw, Film } from 'lucide-react';
import { formatVideoDuration } from '../utils/mediaStorage';
import { resolveMediaUrl, isIndexedDbMedia } from '../services/indexedDbMedia';

interface VintageVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlayMuted?: boolean;       // 是否在视口停留时自动静音起播
  title?: string;                // 视频标题/留影标签
  date?: string;                 // 视频记录时间
  className?: string;
  showFullscreenButton?: boolean;
  onOpenFullscreen?: () => void;
}

export const VintageVideoPlayer: React.FC<VintageVideoPlayerProps> = ({
  src,
  poster,
  autoPlayMuted = false,
  title = '旧日影像',
  date,
  className = '',
  showFullscreenButton = true,
  onOpenFullscreen
}) => {
  const instanceId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    let isMounted = true;
    if (isIndexedDbMedia(src)) {
      resolveMediaUrl(src).then((url) => {
        if (isMounted) setResolvedSrc(url);
      });
    } else {
      setResolvedSrc(src);
    }
    return () => {
      isMounted = false;
    };
  }, [src]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  // 全局排他播放协调：确保同一时间全站仅有一个视频发出声音或播放，杜绝多视频重叠音频
  useEffect(() => {
    const handleGlobalVideoPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id !== instanceId) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        setIsPlaying(false);
      }
    };

    window.addEventListener('time-gallery:video-play', handleGlobalVideoPlay);
    return () => {
      window.removeEventListener('time-gallery:video-play', handleGlobalVideoPlay);
    };
  }, [instanceId]);

  const notifyVideoPlaying = () => {
    window.dispatchEvent(
      new CustomEvent('time-gallery:video-play', {
        detail: { id: instanceId }
      })
    );
  };

  // 处理视口停留自动播放
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isFullscreenModalOpen) return;

    if (autoPlayMuted) {
      video.muted = true;
      setIsMuted(true);
      video.play().then(() => {
        setIsPlaying(true);
        notifyVideoPlaying();
      }).catch(() => {
        // 浏览器受策略限制暂缓起播
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [autoPlayMuted, isFullscreenModalOpen]);

  // 控制播放 / 暂停
  const handleTogglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const activeVideo = isFullscreenModalOpen ? modalVideoRef.current : videoRef.current;
    if (!activeVideo) return;

    if (activeVideo.paused) {
      notifyVideoPlaying();
      activeVideo.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    } else {
      activeVideo.pause();
      setIsPlaying(false);
    }
  };

  // 控制静音 / 声音
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    if (modalVideoRef.current) {
      modalVideoRef.current.muted = nextMuted;
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
    if (modalVideoRef.current) modalVideoRef.current.currentTime = time;
  };

  const openFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onOpenFullscreen) {
      onOpenFullscreen();
      return;
    }

    // 打开全屏时：必须立即暂停底层的内嵌视频，防止出现双重音频叠加！
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsFullscreenModalOpen(true);
  };

  const closeFullscreen = () => {
    // 关闭全屏时：暂停模态窗视频，同步播放进度
    if (modalVideoRef.current) {
      modalVideoRef.current.pause();
      if (videoRef.current) {
        videoRef.current.currentTime = modalVideoRef.current.currentTime;
      }
    }
    setIsPlaying(false);
    setIsFullscreenModalOpen(false);
  };

  // 全屏锁定背景滚动
  useEffect(() => {
    if (isFullscreenModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isFullscreenModalOpen]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`relative group rounded-3xl overflow-hidden bg-black/90 border border-white/10 shadow-md select-none ${className}`}
    >
      {/* 内嵌卡片视频容器 */}
      <div className="relative w-full h-full flex items-center justify-center cursor-pointer" onClick={handleTogglePlay}>
        <video
          ref={videoRef}
          src={resolvedSrc}
          poster={poster}
          playsInline
          loop
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full h-full object-cover max-h-[360px]"
        />

        {/* 胶片颗粒纹理与四周暗角微晕 */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        {/* 胶片放映标识（左上角微型标 - 苹果液态玻璃风格） */}
        <div className="absolute top-2.5 left-2.5 pointer-events-none z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white/90 text-[10px] font-mono shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>{isPlaying && !isFullscreenModalOpen ? '放映中' : '岁月影像'}</span>
          {duration > 0 && <span className="opacity-70 font-mono">· {formatVideoDuration(duration)}</span>}
        </div>

        {/* 右上角快捷控制区：轻触静音/发声 + 放大放映（全白色液态玻璃图标，彻底告别刺眼杂色） */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-90 border border-white/15 cursor-pointer shadow-xs"
            title={isMuted ? '轻触开启声音' : '静音'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white/80" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
          </button>

          {showFullscreenButton && (
            <button
              type="button"
              onClick={openFullscreen}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-90 border border-white/15 cursor-pointer shadow-xs"
              title="沉浸放大放映"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 暂停时居中的温雅微光播放按键（苹果极简磨砂液态玻璃） */}
        {!isPlaying && !isFullscreenModalOpen && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="absolute z-10 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110 active:scale-95"
          >
            <Play className="w-5 h-5 fill-white translate-x-0.5" />
          </motion.div>
        )}

        {/* 底部时光极细刻度与进度条 */}
        <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-4 transition-opacity">
          <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mb-1.5 relative">
            <div
              className="h-full bg-white rounded-full transition-all duration-100 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-white/85 font-mono px-0.5">
            <span>{formatVideoDuration(currentTime)}</span>
            <span>{formatVideoDuration(duration)}</span>
          </div>
        </div>
      </div>

      {/* 全屏沉浸式胶片放映室 (Portal 挂载至 document.body，严格杜绝多端音频并发) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isFullscreenModalOpen && (
            <div className="fixed inset-0 w-screen h-[100dvh] z-[10050] flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-xl select-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-3xl max-h-[94dvh] bg-[#121614] rounded-3xl border border-white/15 shadow-2xl flex flex-col overflow-hidden font-sans"
              >
                {/* 顶栏控制（苹果极简磨砂液态玻璃） */}
                <div className="p-3 sm:px-5 sm:py-3.5 bg-black/50 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Film className="w-4 h-4 text-white/80 shrink-0" />
                    <span className="text-xs sm:text-sm font-serif font-bold text-white tracking-wide truncate">
                      {title}
                    </span>
                    {date && <span className="text-[11px] text-white/60 font-mono shrink-0">· {date}</span>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* 倍速调节 */}
                    <button
                      type="button"
                      onClick={() => {
                        const rates = [0.75, 1, 1.25, 1.5];
                        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
                        const nextRate = rates[nextIdx];
                        setPlaybackRate(nextRate);
                        if (modalVideoRef.current) modalVideoRef.current.playbackRate = nextRate;
                      }}
                      className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-all border border-white/10 cursor-pointer active:scale-95"
                    >
                      {playbackRate === 0.75 ? '0.75x 慢放' : `${playbackRate}x`}
                    </button>

                    <button
                      type="button"
                      onClick={closeFullscreen}
                      className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 视频主画幅 */}
                <div
                  className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[280px] cursor-pointer"
                  onClick={handleTogglePlay}
                >
                  <video
                    ref={modalVideoRef}
                    src={resolvedSrc}
                    poster={poster}
                    playsInline
                    autoPlay
                    loop
                    muted={isMuted}
                    onPlay={() => {
                      setIsPlaying(true);
                      notifyVideoPlaying();
                    }}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="max-h-[70dvh] max-w-full object-contain"
                  />
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-2xl">
                        <Play className="w-7 h-7 fill-white translate-x-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* 底栏全功能手账控制条（苹果极简磨砂液态玻璃胶囊） */}
                <div className="p-3 sm:px-5 sm:py-4 bg-black/70 backdrop-blur-md border-t border-white/10 flex flex-col gap-2.5 shrink-0">
                  {/* 可拖动时光刻度滑轨 */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                  />

                  <div className="flex items-center justify-between text-xs text-white/85 font-mono">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTogglePlay}
                        className="p-1.5 text-white hover:text-white/80 transition-all rounded-lg hover:bg-white/10 cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className="p-1.5 text-white hover:text-white/80 transition-all rounded-lg hover:bg-white/10 cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-white/70" /> : <Volume2 className="w-4 h-4 text-white" />}
                      </button>

                      <span>{formatVideoDuration(currentTime)} / {formatVideoDuration(duration)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (modalVideoRef.current) {
                            modalVideoRef.current.currentTime = 0;
                            setCurrentTime(0);
                          }
                        }}
                        className="p-1.5 text-white/80 hover:text-white transition-all rounded-lg hover:bg-white/10 cursor-pointer"
                        title="从头放映"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
