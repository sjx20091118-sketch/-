import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Search,
  Plus,
  Music,
  ListMusic,
  Disc3,
  ChevronDown,
  ChevronLeft,
  Upload,
  Link,
  Heart,
  History,
  Trash2,
  ListOrdered
} from 'lucide-react';
import {
  SongItem,
  CURATED_DUAL_ENGINE_SONGS,
  searchSongs,
  fetchSongPlayUrl,
  createLocalSongItem,
  createCustomUrlSongItem,
  loadSavedPlaylist,
  savePlaylist,
  loadFavorites,
  saveFavorites,
  loadHistory,
  saveHistory
} from '../services/musicService';
import { buildApiUrl } from '../services/apiConfig';
import { useBackHandler } from '../hooks/useAndroidBackHandler';

import { HealingTheme } from '../types';

const DEFAULT_FALLBACK_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

export const CURATED_TIME_SONGS: SongItem[] = CURATED_DUAL_ENGINE_SONGS;

interface VinylMusicPlayerProps {
  onShowToast?: (msg: string) => void;
  theme?: HealingTheme;
  isDarkMode?: boolean;
}

type PlaylistSubTab = 'queue' | 'favorites' | 'history';

export const VinylMusicPlayer: React.FC<VinylMusicPlayerProps> = ({ onShowToast, theme, isDarkMode = false }) => {
  // 深度提取当前主题与明暗模式调色板，杜绝生硬米色或死板白底
  const activePrimary = isDarkMode ? (theme?.dark?.primary || theme?.primary || '#4EBA86') : (theme?.primary || '#5B7B6D');
  const activePrimaryDark = isDarkMode ? (theme?.dark?.primaryDark || theme?.primaryDark || '#2D7250') : (theme?.primaryDark || '#3E564B');
  const activeAccent = isDarkMode ? (theme?.dark?.accent || theme?.accent || '#6EE7B7') : (theme?.accent || '#E88765');
  const activePrimaryRgb = isDarkMode ? (theme?.dark?.primaryRgb || theme?.primaryRgb || '78, 186, 134') : (theme?.primaryRgb || '91, 123, 109');
  const activeCanvas = isDarkMode ? (theme?.dark?.canvas || '#0D1411') : (theme?.canvas || '#F4F8F6');
  const activePaper = isDarkMode ? (theme?.dark?.paper || '#14201B') : (theme?.paper || '#EBF2EE');

  // 快捷兼容别名
  const primaryColor = activePrimary;
  const primaryDark = activePrimaryDark;
  const accentColor = activeAccent;
  const primaryRgb = activePrimaryRgb;

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'player' | 'search' | 'playlist'>('player');
  const [playlistSubTab, setPlaylistSubTab] = useState<PlaylistSubTab | null>(null);

  // Playlist & track state
  const [playlist, setPlaylist] = useState<SongItem[]>(() => loadSavedPlaylist());
  const [favorites, setFavorites] = useState<SongItem[]>(() => loadFavorites());
  const [history, setHistory] = useState<SongItem[]>(() => loadHistory());

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Audio metrics
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMode, setLoopMode] = useState<'all' | 'one' | 'shuffle'>('all');

  // Smooth Scrubber Drag State
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const isSeekingRef = useRef(false);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);

  // 物理返回键拦截：优先逐层退出自定义歌曲浮层与黑胶唱片大舱
  useBackHandler('vinyl-music-custom-modal', 88, showCustomModal, () => setShowCustomModal(false));
  useBackHandler('vinyl-music-player-modal', 82, isOpen, () => setIsOpen(false));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentTrack: SongItem | undefined = playlist[currentIndex] || playlist[0];

  // Helper to check if current track is favorited
  const isCurrentFavorited = currentTrack ? favorites.some((f) => f.id === currentTrack.id) : false;

  // Toggle favorite for current or specific song
  const toggleFavorite = (song?: SongItem) => {
    const target = song || currentTrack;
    if (!target) return;

    const exists = favorites.some((f) => f.id === target.id);
    let updated: SongItem[];
    if (exists) {
      updated = favorites.filter((f) => f.id !== target.id);
      onShowToast?.(`已取消收藏《${target.title}》`);
    } else {
      updated = [target, ...favorites];
      onShowToast?.(`已添加《${target.title}》至我的喜欢 ❤️`);
    }
    setFavorites(updated);
    saveFavorites(updated);
  };

  // Add to history records
  const recordHistory = useCallback((song: SongItem) => {
    if (!song) return;
    setHistory((prev) => {
      const filtered = prev.filter((s) => s.id !== song.id);
      const updated = [song, ...filtered].slice(0, 50);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const wasPlayingBeforeVideoRef = useRef(false);

  // 全局音视频互斥协调：主界面视频播放时，自动暂停背景音乐并释放后台音频解码硬件占用
  useEffect(() => {
    const handleMediaPauseMusic = () => {
      if (audioRef.current && !audioRef.current.paused) {
        wasPlayingBeforeVideoRef.current = true;
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleMediaResumeMusic = () => {
      if (wasPlayingBeforeVideoRef.current && audioRef.current && audioRef.current.src) {
        wasPlayingBeforeVideoRef.current = false;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // 移动端视口手势限制
        });
      }
    };

    window.addEventListener('time-gallery:media-pause-music', handleMediaPauseMusic);
    window.addEventListener('time-gallery:media-resume-music', handleMediaResumeMusic);

    return () => {
      window.removeEventListener('time-gallery:media-pause-music', handleMediaPauseMusic);
      window.removeEventListener('time-gallery:media-resume-music', handleMediaResumeMusic);
    };
  }, []);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!isSeekingRef.current && audio) {
        setCurrentTime(audio.currentTime);
      }
    };
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleNext();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.warn('Audio playback error', e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.src = '';
    };
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Load and play track with AI Dual-Engine Auto-Failover
  const playTrack = useCallback(async (track: SongItem, autoPlay = true, isRetry = false) => {
    if (!audioRef.current) return;

    recordHistory(track);

    let targetUrl = track.url;
    if (!targetUrl || isRetry) {
      setIsLoadingUrl(true);
      try {
        const resolvedUrl = await fetchSongPlayUrl(track.id, track.title, track.artist, (enriched) => {
          if (enriched.cover && (!track.cover || track.cover === DEFAULT_FALLBACK_COVER)) {
            track.cover = enriched.cover;
          }
        });
        if (resolvedUrl) {
          targetUrl = resolvedUrl;
          track.url = resolvedUrl;
          setPlaylist((prev) => {
            const updated = prev.map((s) => (s.id === track.id ? { ...s, url: resolvedUrl, cover: track.cover || s.cover } : s));
            savePlaylist(updated);
            return updated;
          });
        } else {
          onShowToast?.(`暂未获取到《${track.title}》的可用音频`);
          setIsLoadingUrl(false);
          return;
        }
      } catch {
        onShowToast?.(`获取《${track.title}》音源超时，请稍后重试`);
        setIsLoadingUrl(false);
        return;
      } finally {
        setIsLoadingUrl(false);
      }
    }

    if (targetUrl) {
      audioRef.current.src = targetUrl;
      audioRef.current.currentTime = 0;
      if (autoPlay) {
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Playback autoplay hindered', err);
            setIsPlaying(false);
          });
      }
    }
  }, [onShowToast, recordHistory]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (!audioRef.current.src && currentTrack) {
        playTrack(currentTrack, true);
      } else {
        audioRef.current.play().catch(console.warn);
      }
    }
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    let nextIndex = 0;
    if (loopMode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else if (loopMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    setCurrentIndex(nextIndex);
    playTrack(playlist[nextIndex], true);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIndex);
    playTrack(playlist[prevIndex], true);
  };

  const handleSeekStart = (val?: number) => {
    isSeekingRef.current = true;
    setIsSeeking(true);
    if (typeof val === 'number') {
      setSeekTime(val);
    } else {
      setSeekTime(currentTime);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSeekTime(val);
  };

  const handleSeekCommit = (targetVal?: number) => {
    const finalVal = typeof targetVal === 'number' ? targetVal : seekTime;
    if (audioRef.current && Number.isFinite(finalVal)) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration || 0, finalVal));
    }
    setCurrentTime(finalVal);
    isSeekingRef.current = false;
    setIsSeeking(false);
  };

  const handleProgressPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetVal = ratio * duration;
    
    isSeekingRef.current = true;
    setIsSeeking(true);
    setSeekTime(targetVal);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }
  };

  const handleProgressPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current || !progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetVal = ratio * duration;
    setSeekTime(targetVal);
  };

  const handleProgressPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;
    if (progressBarRef.current && duration > 0) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetVal = ratio * duration;
      handleSeekCommit(targetVal);
    } else {
      handleSeekCommit();
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Search logic
  const handleSearch = async (kw?: string) => {
    const query = (kw ?? searchQuery).trim();
    if (!query) return;
    setIsSearching(true);
    try {
      const results = await searchSongs(query);
      setSearchResults(results);
      if (results.length === 0) {
        onShowToast?.(`未找到与“${query}”相关的曲目`);
      }
    } catch {
      onShowToast?.('全网搜索超时，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = async (song: SongItem) => {
    const existingIndex = playlist.findIndex((s) => s.id === song.id);
    if (existingIndex >= 0) {
      setCurrentIndex(existingIndex);
      playTrack(playlist[existingIndex], true);
    } else {
      const updated = [song, ...playlist];
      setPlaylist(updated);
      savePlaylist(updated);
      setCurrentIndex(0);
      playTrack(song, true);
    }
    setViewMode('player');
    onShowToast?.(`已载入《${song.title}》`);
  };

  const handleAddToQueue = (song: SongItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const existingIndex = playlist.findIndex((s) => s.id === song.id);
    if (existingIndex >= 0) {
      onShowToast?.(`《${song.title}》已在当前播放列表中`);
    } else {
      const updated = [...playlist, song];
      setPlaylist(updated);
      savePlaylist(updated);
      onShowToast?.(`已将《${song.title}》加入播放列表`);
    }
  };

  const handlePlayFromCollection = (song: SongItem) => {
    const existingIndex = playlist.findIndex((s) => s.id === song.id);
    if (existingIndex >= 0) {
      setCurrentIndex(existingIndex);
      playTrack(playlist[existingIndex], true);
    } else {
      const updated = [song, ...playlist];
      setPlaylist(updated);
      savePlaylist(updated);
      setCurrentIndex(0);
      playTrack(song, true);
    }
    setViewMode('player');
    onShowToast?.(`开始播放《${song.title}》`);
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const newSong = createLocalSongItem(file);
    const updated = [newSong, ...playlist];
    setPlaylist(updated);
    setCurrentIndex(0);
    playTrack(newSong, true);
    setViewMode('player');
    onShowToast?.(`已载入本地音频《${newSong.title}》`);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add custom URL
  const handleAddCustomUrl = () => {
    if (!customUrl.trim().startsWith('http')) {
      onShowToast?.('请输入以 http/https 开头的有效音频地址');
      return;
    }
    const newSong = createCustomUrlSongItem(customUrl, customTitle);
    const updated = [newSong, ...playlist];
    setPlaylist(updated);
    setCurrentIndex(0);
    playTrack(newSong, true);
    setShowCustomModal(false);
    setCustomUrl('');
    setCustomTitle('');
    setViewMode('player');
    onShowToast?.(`已载入自定义网络音频流`);
  };

  const removePlaylistItem = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    const updated = playlist.filter((_, idx) => idx !== indexToRemove);
    setPlaylist(updated);
    savePlaylist(updated);
    if (indexToRemove === currentIndex) {
      if (updated.length > 0) {
        const nextIndex = indexToRemove % updated.length;
        setCurrentIndex(nextIndex);
        playTrack(updated[nextIndex], isPlaying);
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        setIsPlaying(false);
      }
    } else if (indexToRemove < currentIndex) {
      setCurrentIndex((prev) => prev - 1);
    }
    onShowToast?.('已从当前歌单移除');
  };

  const clearPlaylist = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlaylist([]);
    savePlaylist([]);
    setIsPlaying(false);
    onShowToast?.('已清空当前播放列表');
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    onShowToast?.('已清空历史播放足迹');
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="audio/*"
        className="hidden"
      />

      {/* ================= 页面右下角优雅悬浮黑胶胶囊 (The Ambient Vinyl Capsule) ================= */}
      <div className="fixed bottom-[calc(4.5rem+max(var(--safe-area-bottom,0px),env(safe-area-inset-bottom,0px)))] right-3.5 sm:bottom-5 sm:right-5 z-40 flex items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative flex items-center"
        >
          {/* 拟物黑胶唱盘主体 */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            title={currentTrack ? `正在播放：${currentTrack.title} - ${currentTrack.artist}` : '拾年音乐馆'}
            style={{
              borderColor: isDarkMode ? `${activePrimary}80` : '#FFFFFF',
              boxShadow: isDarkMode ? `0 4px 18px rgba(0,0,0,0.5), 0 0 14px ${activePrimary}40` : `0 4px 18px rgba(0,0,0,0.12), 0 0 14px ${activePrimary}25`
            }}
            className={`relative w-12 h-12 rounded-full border-2 p-0.5 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 bg-[#17201B] cursor-pointer ${
              isPlaying ? 'ring-2 ring-offset-2' : ''
            }`}
          >
            {/* 旋转的唱片光盘 */}
            <div
              className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${
                isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
              }`}
            >
              {currentTrack?.cover ? (
                <img
                  src={currentTrack.cover}
                  alt={currentTrack.title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_COVER;
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white" style={{ backgroundColor: activePrimary }}>
                  <Disc3 className="w-4 h-4" />
                </div>
              )}
              {/* 中心孔轴 */}
              <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
            </div>

            {/* 呼吸声波指示环 */}
            {isPlaying && (
              <span
                className="absolute inset-0 rounded-full border animate-ping pointer-events-none opacity-50"
                style={{ borderColor: activeAccent }}
              />
            )}
          </button>

          {/* 快捷悬浮胶囊：曲目简报与暂停 (GPU加速与深度主题适配) */}
          <div
            onClick={() => setIsOpen(true)}
            style={{
              willChange: 'transform, opacity',
              transform: 'translateZ(0)',
              backgroundColor: isDarkMode ? `${activePaper}F4` : `${activePaper}F6`,
              borderColor: isDarkMode ? `rgba(${activePrimaryRgb}, 0.35)` : `rgba(${activePrimaryRgb}, 0.25)`,
              boxShadow: isDarkMode ? `0 4px 20px rgba(0,0,0,0.4), 0 0 15px rgba(${activePrimaryRgb}, 0.15)` : `0 4px 20px rgba(0,0,0,0.08), 0 0 15px rgba(${activePrimaryRgb}, 0.12)`
            }}
            className="hidden sm:flex items-center gap-2.5 ml-2.5 px-3.5 py-1.5 rounded-full backdrop-blur-md border shadow-md cursor-pointer transition-all max-w-[210px] transform-gpu hover:scale-[1.02]"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] truncate drop-shadow-2xs">
                {currentTrack?.title || '拾年留声机'}
              </span>
              <span className="text-[9px] font-serif text-[#4D5E55] dark:text-[#B2C2BA] truncate font-medium">
                {isPlaying ? currentTrack?.artist || '流光漫溢' : '轻触展开唱机'}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              style={{
                backgroundColor: activePrimary,
                boxShadow: `0 2px 8px rgba(${activePrimaryRgb}, 0.4)`
              }}
              className="w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs hover:brightness-110 active:scale-95"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
            </button>
          </div>
        </motion.div>
      </div>

      {/* ================= 半屏拟物黑胶唱片大舱 (The Vintage Turntable Deck) ================= */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* 背景暗化遮罩（硬件加速平滑淡入 + 柔和毛玻璃） */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
              className="absolute inset-0 bg-black/60 sm:bg-black/50 backdrop-blur-sm transform-gpu"
            />

            {/* 唱机主机甲板 (The Turntable Body) - 深度联动当前主题配色，告别米色，GPU硬件加速抗撕裂 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                willChange: 'transform, opacity',
                transform: 'translateZ(0)',
                background: isDarkMode
                  ? `linear-gradient(180deg, ${activePaper}F8 0%, ${activeCanvas}FC 100%), radial-gradient(ellipse at 50% 12%, rgba(${activePrimaryRgb}, 0.26) 0%, transparent 68%)`
                  : `linear-gradient(180deg, ${activePaper}F4 0%, ${activeCanvas}FA 100%), radial-gradient(ellipse at 50% 10%, rgba(${activePrimaryRgb}, 0.18) 0%, transparent 62%)`,
                borderColor: isDarkMode ? `rgba(${activePrimaryRgb}, 0.42)` : `rgba(${activePrimaryRgb}, 0.28)`,
                boxShadow: isDarkMode
                  ? `0 24px 60px rgba(0,0,0,0.85), 0 0 50px rgba(${activePrimaryRgb}, 0.22)`
                  : `0 24px 60px rgba(0,0,0,0.16), 0 0 40px rgba(${activePrimaryRgb}, 0.16)`
              }}
              className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col h-[580px] max-h-[88dvh] z-10 pb-3 sm:pb-4 backdrop-blur-md transform-gpu"
            >
              {/* 顶部控制栏与视图切换 (深度联动当前治愈主题调色板，高清晰度半透明磨砂) */}
              <div
                style={{
                  background: isDarkMode
                    ? `linear-gradient(to bottom, ${activePaper}FD, ${activeCanvas}F6)`
                    : `linear-gradient(to bottom, ${activePaper}FA, ${activeCanvas}EC)`,
                  borderBottomColor: isDarkMode
                    ? `rgba(${activePrimaryRgb}, 0.28)`
                    : `rgba(${activePrimaryRgb}, 0.20)`
                }}
                className="flex items-center justify-between px-5 py-3 border-b backdrop-blur-md shrink-0 transition-colors transform-gpu"
              >
                <div
                  style={{
                    backgroundColor: isDarkMode ? `rgba(${activePrimaryRgb}, 0.18)` : `rgba(${activePrimaryRgb}, 0.12)`,
                    borderColor: isDarkMode ? `rgba(${activePrimaryRgb}, 0.32)` : `rgba(${activePrimaryRgb}, 0.22)`
                  }}
                  className="flex items-center gap-1.5 p-1 rounded-full text-xs font-serif border shadow-2xs backdrop-blur-xs"
                >
                  <button
                    onClick={() => setViewMode('player')}
                    style={viewMode === 'player' ? {
                      backgroundColor: activePrimary,
                      color: '#FFFFFF',
                      boxShadow: `0 2px 10px rgba(${activePrimaryRgb}, 0.35)`
                    } : {}}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      viewMode === 'player'
                        ? 'font-bold'
                        : 'text-[#6E7C75] dark:text-[#D1DCD6] hover:text-[#17201B] dark:hover:text-white'
                    }`}
                  >
                    黑胶唱机
                  </button>
                  <button
                    onClick={() => setViewMode('search')}
                    style={viewMode === 'search' ? {
                      backgroundColor: activePrimary,
                      color: '#FFFFFF',
                      boxShadow: `0 2px 10px rgba(${activePrimaryRgb}, 0.35)`
                    } : {}}
                    className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'search'
                        ? 'font-bold'
                        : 'text-[#6E7C75] dark:text-[#D1DCD6] hover:text-[#17201B] dark:hover:text-white'
                    }`}
                  >
                    <Search className="w-3 h-3" /> 免版曲库
                  </button>
                  <button
                    onClick={() => setViewMode('playlist')}
                    style={viewMode === 'playlist' ? {
                      backgroundColor: activePrimary,
                      color: '#FFFFFF',
                      boxShadow: `0 2px 10px rgba(${activePrimaryRgb}, 0.35)`
                    } : {}}
                    className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'playlist'
                        ? 'font-bold'
                        : 'text-[#6E7C75] dark:text-[#D1DCD6] hover:text-[#17201B] dark:hover:text-white'
                    }`}
                  >
                    <ListMusic className="w-3 h-3" /> 歌单库 ({playlist.length})
                  </button>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : `${activePrimary}10`,
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `rgba(${activePrimaryRgb}, 0.18)`
                  }}
                  className="p-1.5 rounded-full border text-[#6E7C75] dark:text-[#A7B4AD] hover:text-[#17201B] dark:hover:text-white transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              {/* 唱机内容区 */}
              <div className={`flex-1 ${viewMode === 'player' ? 'p-3 sm:p-5 flex flex-col justify-between overflow-hidden' : 'overflow-y-auto p-4 sm:p-5'}`}>
                {viewMode === 'player' && (
                  <div className="h-full flex flex-col justify-between items-center select-none py-1 sm:py-2">
                    {/* 拟物黑胶唱片台架构 - 扩大比例居中饱满，消解大片留白 */}
                    <div className="relative w-62 h-62 sm:w-70 sm:h-70 rounded-3xl bg-gradient-to-br from-[#1E2621] to-[#121614] border-4 border-[#3D4741] p-3 shadow-[inset_0_4px_18px_rgba(0,0,0,0.65),0_14px_34px_rgba(0,0,0,0.22)] flex items-center justify-center overflow-hidden shrink-0">
                      {/* 唱片机金属拉丝铭牌印记 */}
                      <div className="absolute left-3 bottom-2 text-[8px] font-mono tracking-wider text-white/30 select-none">
                        SHINIAN · HIFI TURNTABLE
                      </div>

                      {/* 黑胶大唱盘 (Spinning Vinyl Disc) - 仅在打开并处于唱机页时才执行 CSS 旋转计算，避免后台持续占用 GPU */}
                      <div
                        className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-[#0D100F] shadow-[0_0_22px_rgba(0,0,0,0.85)] flex items-center justify-center transition-transform ${
                          isPlaying && isOpen && viewMode === 'player' ? 'animate-[spin_18s_linear_infinite]' : ''
                        }`}
                        style={{
                          willChange: (isPlaying && isOpen && viewMode === 'player') ? 'transform' : 'auto',
                          background:
                            'radial-gradient(circle, #222B26 0%, #111613 40%, #080B09 70%, #000000 100%)',
                        }}
                      >
                        {/* 同心纹理 */}
                        <div
                          className="absolute inset-0 rounded-full opacity-35"
                          style={{
                            background:
                              'repeating-radial-gradient(circle at 50% 50%, transparent 0px, transparent 1.5px, rgba(255,255,255,0.06) 2px, transparent 3px)',
                          }}
                        />

                        {/* 唱片反光镜面 */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

                        {/* 唱片中心封面 (Album Artwork Center) */}
                        <div
                          style={{ backgroundColor: activePrimary }}
                          className="w-19 h-19 sm:w-22 sm:h-22 rounded-full overflow-hidden border-2 border-white/70 shadow-lg relative z-10"
                        >
                          {currentTrack?.cover ? (
                            <img
                              src={currentTrack.cover}
                              alt={currentTrack.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_COVER;
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/90">
                              <Music className="w-6 h-6" />
                            </div>
                          )}
                          {/* 中心主轴孔 */}
                          <div
                            style={{ backgroundColor: isDarkMode ? '#1E2822' : '#FFFFFF' }}
                            className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full border border-black/30 shadow-inner"
                          />
                        </div>
                      </div>

                      {/* 机械拟物唱针 (Mechanical Tonearm with Physics Swing) */}
                      <div
                        className="absolute right-3.5 top-2 w-18 h-32 origin-[75%_12%] transition-transform duration-700 ease-out pointer-events-none z-20"
                        style={{
                          transform: isPlaying ? 'rotate(22deg)' : 'rotate(0deg)',
                        }}
                      >
                        {/* 唱针转轴底座 */}
                        <div className="absolute right-2.5 top-1.5 w-6 h-6 rounded-full bg-gradient-to-b from-[#A0A9A3] to-[#4F5953] border border-white/40 shadow-md" />
                        {/* 唱针金属杆 */}
                        <div className="absolute right-5 top-5 w-1 h-21 bg-gradient-to-b from-[#C4CAC6] via-[#7B8680] to-[#505954] shadow-xs" />
                        {/* 唱针磁头 */}
                        <div
                          style={{ backgroundColor: activeAccent }}
                          className="absolute right-3.5 top-25 w-3.5 h-5 rounded-xs border border-white/50 shadow-md transform rotate-12"
                        />
                      </div>
                    </div>

                    {/* 歌曲信息与时光标签 (高清对比度字幕与优雅微晶胶囊) */}
                    <div className="text-center space-y-1 w-full max-w-xs px-2 relative my-1">
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="text-base sm:text-lg font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] truncate tracking-tight drop-shadow-sm">
                          {currentTrack?.title || '拾年留声机'}
                        </h3>
                        {currentTrack && (
                          <button
                            onClick={() => toggleFavorite()}
                            title={isCurrentFavorited ? '取消喜欢' : '添加至我的喜欢'}
                            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-transform active:scale-125 cursor-pointer"
                          >
                            <Heart
                              className={`w-4 h-4 transition-colors ${
                                isCurrentFavorited
                                  ? 'fill-rose-500 text-rose-500'
                                  : 'text-[#6E7C75] dark:text-[#A7B4AD] hover:text-rose-500'
                              }`}
                            />
                          </button>
                        )}
                      </div>
                      <div
                        style={{
                          backgroundColor: isDarkMode ? `${activePrimary}22` : `${activePrimary}12`,
                          borderColor: isDarkMode ? `${activePrimary}40` : `${activePrimary}24`
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border backdrop-blur-xs max-w-full"
                      >
                        <p className="text-[11px] sm:text-xs text-[#2B3831] dark:text-[#E2ECE7] font-serif font-semibold truncate drop-shadow-2xs">
                          {currentTrack?.artist || '暂未选定曲目'} {currentTrack?.album ? ` · ${currentTrack.album}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* 深度适配主题调色板的水墨朱砂双层微光滑块 */}
                    {(() => {
                      const displayTime = isSeeking ? seekTime : currentTime;
                      const progressRatio = duration > 0 ? Math.max(0, Math.min(100, (displayTime / duration) * 100)) : 0;
                      return (
                        <div className="w-full max-w-sm space-y-1 px-2 my-1 select-none">
                          <div
                            ref={progressBarRef}
                            onPointerDown={handleProgressPointerDown}
                            onPointerMove={handleProgressPointerMove}
                            onPointerUp={handleProgressPointerUp}
                            onPointerCancel={handleProgressPointerUp}
                            className="relative w-full flex items-center group py-2 cursor-pointer touch-none"
                          >
                            {/* 底层进度条背景轨道 */}
                            <div
                              className="w-full h-1.5 rounded-full overflow-hidden transition-colors relative"
                              style={{
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : `${activePrimary}24`
                              }}
                            >
                              {/* 渐变已播放高亮条 */}
                              <div
                                className={`h-full rounded-full ${isSeeking ? '' : 'transition-[width] duration-75'}`}
                                style={{
                                  width: `${progressRatio}%`,
                                  background: `linear-gradient(to right, ${activePrimary}, ${activeAccent})`
                                }}
                              />
                            </div>

                            {/* 真实原生滑块（双重兼容保证） */}
                            <input
                              type="range"
                              min={0}
                              max={duration || 100}
                              step={0.1}
                              value={displayTime}
                              onMouseDown={() => handleSeekStart(displayTime)}
                              onTouchStart={() => handleSeekStart(displayTime)}
                              onChange={handleSeekChange}
                              onMouseUp={(e) => handleSeekCommit(parseFloat((e.target as HTMLInputElement).value))}
                              onTouchEnd={(e) => handleSeekCommit(parseFloat((e.target as HTMLInputElement).value))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 pointer-events-none"
                              style={{ touchAction: 'none' }}
                            />

                            {/* 东方水墨朱砂双层微光小圆标 (Slider Thumb Knob) */}
                            <div
                              className={`absolute pointer-events-none transition-transform duration-75 ease-out ${
                                isSeeking ? 'scale-135' : 'group-hover:scale-125 group-active:scale-135'
                              }`}
                              style={{
                                left: `calc(${progressRatio}% - 7px)`,
                                top: '50%',
                                transform: 'translateY(-50%)'
                              }}
                            >
                              {/* 外层主题微光光晕 */}
                              <div
                                className="w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/90 dark:border-white/70"
                                style={{
                                  backgroundColor: activePrimary,
                                  boxShadow: `0 0 10px ${activeAccent}88, 0 2px 6px rgba(0,0,0,0.25)`
                                }}
                              >
                                {/* 内层朱砂/暖色微光核心 */}
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: isDarkMode ? '#FAF8F5' : '#FFFFFF' }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between text-[10px] sm:text-[11px] font-mono tabular-nums opacity-85">
                            <span style={{ color: isDarkMode ? '#D6E2DC' : '#526058' }}>{formatTime(displayTime)}</span>
                            <span style={{ color: isDarkMode ? '#D6E2DC' : '#526058' }}>{formatTime(duration)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 播放控制按钮群 (垂直居中舒展，向上提拉保持安全留白，消除空出一大片) */}
                    <div className="flex items-center justify-center gap-5 sm:gap-7 pb-2 sm:pb-3">
                      {/* 循环模式 */}
                      <button
                        onClick={() => {
                          const modes: ('all' | 'one' | 'shuffle')[] = ['all', 'one', 'shuffle'];
                          const nextMode = modes[(modes.indexOf(loopMode) + 1) % modes.length];
                          setLoopMode(nextMode);
                          onShowToast?.(
                            nextMode === 'all'
                              ? '列表循环'
                              : nextMode === 'one'
                              ? '单曲循环'
                              : '随机播放'
                          );
                        }}
                        className="p-2 rounded-full text-[#6E7C75] dark:text-[#A7B4AD] hover:text-[#17201B] dark:hover:text-[#FAF8F5] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title={
                          loopMode === 'all'
                            ? '当前：列表循环（轻触切换单曲循环）'
                            : loopMode === 'one'
                            ? '当前：单曲循环（轻触切换随机播放）'
                            : '当前：随机播放（轻触切换列表循环）'
                        }
                      >
                        {loopMode === 'shuffle' ? (
                          <Shuffle className="w-4 h-4" style={{ color: activeAccent }} />
                        ) : loopMode === 'one' ? (
                          <Repeat1 className="w-4 h-4" style={{ color: activeAccent }} />
                        ) : (
                          <Repeat className="w-4 h-4" />
                        )}
                      </button>

                      {/* 上一曲 */}
                      <button
                        onClick={handlePrev}
                        className="p-2.5 rounded-full text-[#17201B] dark:text-[#FAF8F5] hover:bg-black/5 dark:hover:bg-white/10 transition-transform active:scale-90 cursor-pointer"
                      >
                        <SkipBack className="w-5 h-5 fill-current" />
                      </button>

                      {/* 主播放/暂停 (深度联动主题主色的玉石质感大按钮) */}
                      <button
                        onClick={togglePlay}
                        disabled={isLoadingUrl || playlist.length === 0}
                        style={{
                          backgroundColor: activePrimary,
                          boxShadow: `0 6px 22px rgba(${activePrimaryRgb}, 0.45)`
                        }}
                        className="w-14 h-14 sm:w-15 sm:h-15 rounded-full text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 cursor-pointer hover:brightness-110"
                      >
                        {isLoadingUrl ? (
                          <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : isPlaying ? (
                          <Pause className="w-6 h-6 fill-current" />
                        ) : (
                          <Play className="w-6 h-6 ml-0.5 fill-current" />
                        )}
                      </button>

                      {/* 下一曲 */}
                      <button
                        onClick={handleNext}
                        className="p-2.5 rounded-full text-[#17201B] dark:text-[#FAF8F5] hover:bg-black/5 dark:hover:bg-white/10 transition-transform active:scale-90"
                      >
                        <SkipForward className="w-5 h-5 fill-current" />
                      </button>

                      {/* 音量开闭 */}
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 rounded-full text-[#6E7C75] dark:text-[#A7B4AD] hover:text-[#17201B] dark:hover:text-[#FAF8F5] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {viewMode === 'search' && (
                  <div className="space-y-4">
                    {/* Apple Music 风格极简悬浮搜索栏 */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSearch();
                      }}
                      className="relative flex items-center group"
                    >
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E7C75] pointer-events-none">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索现代治愈慢调、古典名作（如：月光、降E大调夜曲、Gymnopédie、爱之梦）"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : `${activePaper}`,
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : `${activePrimary}30`,
                          color: isDarkMode ? '#FAF8F5' : '#17201B'
                        }}
                        className="w-full pl-10 pr-24 py-2.5 rounded-2xl border text-xs font-serif placeholder:text-[#6E7C75]/60 outline-none transition-all shadow-inner"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="absolute right-16 top-1/2 -translate-y-1/2 p-1 text-[#6E7C75] hover:text-[#17201B] dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="text-xs bg-black/10 dark:bg-white/10 w-4 h-4 rounded-full flex items-center justify-center font-bold">×</span>
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSearching}
                        style={{
                          backgroundColor: activePrimary,
                          boxShadow: `0 2px 8px rgba(${activePrimaryRgb}, 0.35)`
                        }}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 text-white text-xs font-serif font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center hover:brightness-110"
                      >
                        {isSearching ? '检索中' : '搜索'}
                      </button>
                    </form>

                    {/* 现代治愈慢调意境推荐胶囊流 */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-serif font-bold text-[#6E7C75] dark:text-[#A7B4AD] tracking-wider">
                        典藏名作推荐
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">
                        {['月光', '夜曲', 'Gymnopédie', '月光奏鸣曲', '爱之梦', '梦幻曲', '致爱丽丝', 'G弦上的咏叹调', 'Gnossienne'].map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => {
                              setSearchQuery(kw);
                              handleSearch(kw);
                            }}
                            style={{
                              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${activePrimary}10`,
                              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${activePrimary}22`,
                              color: isDarkMode ? '#FAF8F5' : activePrimaryDark
                            }}
                            className="text-[11px] font-serif px-3 py-1 rounded-xl border transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0 hover:scale-105"
                          >
                            {kw}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 扩展功能区：本地导入与音频直链（双列栅格自适应排版，深度适配主色调） */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : `${activePaper}`,
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : `${activePrimary}20`
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-2xl border text-[#3D4C44] dark:text-[#D6E0DA] font-serif text-xs font-medium transition-all shadow-2xs cursor-pointer hover:scale-[1.01]"
                      >
                        <Upload className="w-3.5 h-3.5" style={{ color: activePrimary }} />
                        <span>导入本地音轨 (MP3/FLAC)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomModal(true)}
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : `${activePaper}`,
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : `${activePrimary}20`
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-2xl border text-[#3D4C44] dark:text-[#D6E0DA] font-serif text-xs font-medium transition-all shadow-2xs cursor-pointer hover:scale-[1.01]"
                      >
                        <Link className="w-3.5 h-3.5" style={{ color: activePrimary }} />
                        <span>粘贴音频直链</span>
                      </button>
                    </div>

                    {/* 搜索结果或极简精选卡片流 */}
                    <div className="space-y-3 mt-2">
                      {searchResults.length > 0 ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] flex items-center gap-1.5">
                              <Music className="w-3.5 h-3.5" style={{ color: activePrimary }} />
                              <span>全网检索结果 ({searchResults.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchResults([]);
                                setSearchQuery('');
                              }}
                              style={{ color: activePrimary }}
                              className="text-[11px] hover:underline font-serif cursor-pointer"
                            >
                              返回精选推荐
                            </button>
                          </div>

                          <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                            {searchResults.map((song) => {
                              const isCurrent = currentTrack?.id === song.id;
                              const isFav = favorites.some((f) => f.id === song.id);
                              return (
                                <div
                                  key={song.id}
                                  onClick={() => selectSearchResult(song)}
                                  style={{
                                    backgroundColor: isCurrent
                                      ? (isDarkMode ? `${activePrimary}25` : `${activePrimary}14`)
                                      : (isDarkMode ? 'rgba(255,255,255,0.04)' : `${activePaper}A0`),
                                    borderColor: isCurrent
                                      ? activePrimary
                                      : (isDarkMode ? 'rgba(255,255,255,0.08)' : `${activePrimary}18`)
                                  }}
                                  className="group relative flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer shadow-2xs"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {/* 圆角高清封面 + 动态播放指示器 */}
                                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black/5 dark:bg-white/10 shrink-0 shadow-sm">
                                      <img
                                        src={song.cover || DEFAULT_FALLBACK_COVER}
                                        alt={song.title}
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_COVER;
                                        }}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                      {isCurrent && isPlaying && (
                                        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center gap-0.5">
                                          <span className="w-0.5 h-3 bg-white rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                                          <span className="w-0.5 h-4 bg-white rounded-full animate-[pulse_0.4s_ease-in-out_infinite]" />
                                          <span className="w-0.5 h-2.5 bg-white rounded-full animate-[pulse_0.7s_ease-in-out_infinite]" />
                                        </div>
                                      )}
                                    </div>

                                    {/* 歌曲标题与歌手元数据 */}
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-xs font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] truncate transition-colors">
                                        {song.title}
                                      </h4>
                                      <p className="text-[11px] text-[#6E7C75] dark:text-[#A7B4AD] font-serif truncate mt-0.5">
                                        <span>{song.artist}</span>
                                        {song.album && <span className="opacity-70"> · {song.album}</span>}
                                      </p>
                                    </div>
                                  </div>

                                  {/* 快捷操作栏 */}
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(song);
                                      }}
                                      title={isFav ? '已收藏' : '收藏'}
                                      className={`p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                                        isFav ? 'text-rose-500' : 'text-[#6E7C75] hover:text-rose-500'
                                      }`}
                                    >
                                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleAddToQueue(song, e)}
                                      title="加入播放队列"
                                      className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#6E7C75] hover:text-[#17201B] dark:hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => selectSearchResult(song)}
                                      style={{ backgroundColor: activePrimary }}
                                      className="p-2 rounded-xl text-white transition-all shadow-xs cursor-pointer active:scale-95 ml-0.5 hover:brightness-110"
                                    >
                                      {isCurrent && isPlaying ? (
                                        <Pause className="w-3.5 h-3.5 fill-current" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* 极简精选时光推荐流 */
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] flex items-center gap-1.5">
                              <Music className="w-3.5 h-3.5" style={{ color: activePrimary }} />
                              <span>编辑精选 · 典藏时光曲目</span>
                            </span>
                            <span className="text-[10px] text-[#6E7C75] dark:text-[#A7B4AD] font-serif">即点即播</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                            {CURATED_TIME_SONGS.map((song) => {
                              const isCurrent = currentTrack?.id === song.id;
                              const isFav = favorites.some((f) => f.id === song.id);
                              return (
                                <div
                                  key={song.id}
                                  onClick={() => selectSearchResult(song)}
                                  style={{
                                    backgroundColor: isCurrent
                                      ? (isDarkMode ? `${activePrimary}25` : `${activePrimary}14`)
                                      : (isDarkMode ? 'rgba(255,255,255,0.04)' : `${activePaper}A0`),
                                    borderColor: isCurrent
                                      ? activePrimary
                                      : (isDarkMode ? 'rgba(255,255,255,0.08)' : `${activePrimary}18`)
                                  }}
                                  className="group relative flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer shadow-2xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black/5 dark:bg-white/10 shrink-0 shadow-2xs">
                                      <img
                                        src={song.cover}
                                        alt={song.title}
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_COVER;
                                        }}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                      {isCurrent && isPlaying && (
                                        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center gap-0.5">
                                          <span className="w-0.5 h-2.5 bg-white rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                                          <span className="w-0.5 h-3.5 bg-white rounded-full animate-[pulse_0.4s_ease-in-out_infinite]" />
                                          <span className="w-0.5 h-2 bg-white rounded-full animate-[pulse_0.7s_ease-in-out_infinite]" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-xs font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] truncate transition-colors">
                                        {song.title}
                                      </h4>
                                      <p className="text-[10px] text-[#6E7C75] dark:text-[#A7B4AD] truncate font-serif mt-0.5">
                                        {song.artist}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 ml-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(song);
                                      }}
                                      className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                                        isFav ? 'text-rose-500' : 'text-[#6E7C75]/60 hover:text-rose-500'
                                      }`}
                                    >
                                      <Heart className={`w-3 h-3 ${isFav ? 'fill-rose-500' : ''}`} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => selectSearchResult(song)}
                                      style={{ backgroundColor: activePrimary }}
                                      className="p-1.5 rounded-xl text-white transition-colors shrink-0 shadow-2xs hover:brightness-110"
                                    >
                                      {isCurrent && isPlaying ? (
                                        <Pause className="w-3 h-3 fill-current" />
                                      ) : (
                                        <Play className="w-3 h-3 fill-current ml-0.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 歌单库面板：卡片化导航与下级二级界面 */}
                {viewMode === 'playlist' && (
                  <div className="space-y-4">
                    {/* 一级界面：三个高美感卡片（播放队列、我的喜欢、历史足迹） */}
                    {playlistSubTab === null ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* 播放队列卡片 */}
                          <div
                            onClick={() => setPlaylistSubTab('queue')}
                            style={{
                              backgroundColor: isDarkMode ? `${activePaper}B0` : `${activePaper}E6`,
                              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${activePrimary}25`
                            }}
                            className="p-4 rounded-2xl border hover:scale-[1.01] shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
                          >
                            <div className="flex items-center justify-between">
                              <div
                                style={{ backgroundColor: `${activePrimary}18`, color: activePrimary }}
                                className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                              >
                                <ListOrdered className="w-5 h-5" />
                              </div>
                              <span
                                style={{ backgroundColor: `${activePrimary}18`, color: activePrimary }}
                                className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                              >
                                {playlist.length} 首
                              </span>
                            </div>
                            <div className="mt-3">
                              <h4 className="font-serif font-bold text-sm text-[#17201B] dark:text-[#FAF8F5] transition-colors">
                                播放队列
                              </h4>
                              <p className="text-[11px] text-[#6E7C75] dark:text-[#A7B4AD] mt-0.5">
                                当前待奏与即席曲目
                              </p>
                            </div>
                          </div>

                          {/* 我的喜欢卡片 */}
                          <div
                            onClick={() => setPlaylistSubTab('favorites')}
                            style={{
                              backgroundColor: isDarkMode ? `${activePaper}B0` : `${activePaper}E6`,
                              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(244,63,94,0.25)'
                            }}
                            className="p-4 rounded-2xl border hover:border-rose-400 hover:scale-[1.01] shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Heart className="w-5 h-5 fill-rose-500 dark:fill-rose-400" />
                              </div>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400">
                                {favorites.length} 首
                              </span>
                            </div>
                            <div className="mt-3">
                              <h4 className="font-serif font-bold text-sm text-[#17201B] dark:text-[#FAF8F5] group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                我的喜欢
                              </h4>
                              <p className="text-[11px] text-[#6E7C75] dark:text-[#A7B4AD] mt-0.5">
                                永恒心动与挚爱珍藏
                              </p>
                            </div>
                          </div>

                          {/* 历史足迹卡片 */}
                          <div
                            onClick={() => setPlaylistSubTab('history')}
                            style={{
                              backgroundColor: isDarkMode ? `${activePaper}B0` : `${activePaper}E6`,
                              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${activePrimary}25`
                            }}
                            className="p-4 rounded-2xl border hover:scale-[1.01] shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
                          >
                            <div className="flex items-center justify-between">
                              <div
                                style={{ backgroundColor: `${activePrimary}18`, color: activePrimary }}
                                className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                              >
                                <History className="w-5 h-5" />
                              </div>
                              <span
                                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                                className="text-xs font-mono font-bold px-2 py-0.5 rounded-full text-[#6E7C75] dark:text-[#A7B4AD]"
                              >
                                {history.length} 首
                              </span>
                            </div>
                            <div className="mt-3">
                              <h4 className="font-serif font-bold text-sm text-[#17201B] dark:text-[#FAF8F5] transition-colors">
                                历史足迹
                              </h4>
                              <p className="text-[11px] text-[#6E7C75] dark:text-[#A7B4AD] mt-0.5">
                                曾伴耳畔的岁序回响
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* 二级界面：选定卡片进入后的详细列表与返回导航 */
                      <div className="space-y-3.5">
                        {/* 二级返回顶栏 */}
                        <div
                          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${activePrimary}20` }}
                          className="flex items-center justify-between border-b pb-2.5"
                        >
                          <button
                            onClick={() => setPlaylistSubTab(null)}
                            style={{ color: activePrimary }}
                            className="flex items-center gap-1.5 text-xs font-serif font-bold transition-colors cursor-pointer hover:opacity-80"
                          >
                            <ChevronLeft className="w-4 h-4" /> 返回歌单库
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-serif font-bold text-[#17201B] dark:text-[#FAF8F5]">
                              {playlistSubTab === 'queue' && `播放队列 (${playlist.length})`}
                              {playlistSubTab === 'favorites' && `我的喜欢 (${favorites.length})`}
                              {playlistSubTab === 'history' && `历史足迹 (${history.length})`}
                            </span>

                            {playlistSubTab === 'queue' && playlist.length > 0 && (
                              <button
                                onClick={clearPlaylist}
                                title="清空当前队列"
                                className="text-[11px] text-rose-500/80 hover:text-rose-600 flex items-center gap-0.5 cursor-pointer ml-2"
                              >
                                <Trash2 className="w-3 h-3" /> 清空
                              </button>
                            )}
                            {playlistSubTab === 'history' && history.length > 0 && (
                              <button
                                onClick={clearHistory}
                                title="清空历史播放"
                                className="text-[11px] text-rose-500/80 hover:text-rose-600 flex items-center gap-0.5 cursor-pointer ml-2"
                              >
                                <Trash2 className="w-3 h-3" /> 清空
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 1. 当前播放队列列表 */}
                        {playlistSubTab === 'queue' && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#6E7C75] dark:text-[#A7B4AD] text-[11px]">
                                点击曲目即刻切换起奏
                              </span>
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{ color: activePrimary }}
                                className="hover:underline flex items-center gap-1 font-serif text-[11px] cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> 导入本地歌曲
                              </button>
                            </div>

                            {playlist.length === 0 ? (
                              <div
                                style={{
                                  backgroundColor: isDarkMode ? `${activePaper}60` : `${activePaper}80`,
                                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${activePrimary}25`
                                }}
                                className="p-8 text-center rounded-2xl border border-dashed space-y-2"
                              >
                                <Disc3 className="w-8 h-8 mx-auto animate-pulse" style={{ color: activePrimary }} />
                                <p className="text-xs text-[#6E7C75] dark:text-[#A7B4AD] font-serif">当前播放列表暂无歌曲</p>
                                <button
                                  onClick={() => setViewMode('search')}
                                  style={{ backgroundColor: activePrimary }}
                                  className="text-xs px-3.5 py-1 text-white rounded-xl font-sans cursor-pointer shadow-xs"
                                >
                                  前往全网搜歌
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                                {playlist.map((song, idx) => {
                                  const isCurrent = idx === currentIndex;
                                  return (
                                    <div
                                      key={song.id + idx}
                                      onClick={() => {
                                        setCurrentIndex(idx);
                                        playTrack(song, true);
                                        setViewMode('player');
                                      }}
                                      style={{
                                        backgroundColor: isCurrent
                                          ? (isDarkMode ? `${activePrimary}25` : `${activePrimary}14`)
                                          : (isDarkMode ? 'rgba(255,255,255,0.04)' : `${activePaper}95`),
                                        borderColor: isCurrent
                                          ? activePrimary
                                          : (isDarkMode ? 'rgba(255,255,255,0.08)' : `${activePrimary}18`)
                                      }}
                                      className="flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer group shadow-2xs"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-4 text-center text-xs font-mono">
                                          {isCurrent && isPlaying ? (
                                            <span className="w-2 h-2 rounded-full inline-block animate-ping" style={{ backgroundColor: activeAccent }} />
                                          ) : (
                                            idx + 1
                                          )}
                                        </span>
                                        <div className="min-w-0">
                                          <h4 className={`text-xs font-serif truncate ${isCurrent ? 'font-bold text-[#17201B] dark:text-[#FAF8F5]' : 'text-[#2B332E] dark:text-[#FAF8F5]'}`}>
                                            {song.title}
                                          </h4>
                                          <span className="text-[10px] opacity-75 truncate text-[#6E7C75] dark:text-[#A7B4AD]">{song.artist}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {song.isLocal && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-sans">
                                            本地
                                          </span>
                                        )}
                                        <span className="text-[10px] font-mono text-[#6E7C75] dark:text-[#A7B4AD]">{song.durationFormatted || ''}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(song);
                                          }}
                                          className="p-1 text-gray-400 hover:text-rose-500 cursor-pointer"
                                          title="喜欢"
                                        >
                                          <Heart
                                            className={`w-3.5 h-3.5 ${
                                              favorites.some((f) => f.id === song.id)
                                                ? 'fill-rose-500 text-rose-500'
                                                : ''
                                            }`}
                                          />
                                        </button>
                                        <button
                                          onClick={(e) => removePlaylistItem(e, idx)}
                                          className="p-1.5 text-rose-500/70 hover:text-red-600 sm:text-gray-400 sm:hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer rounded-lg hover:bg-rose-50/50 dark:hover:bg-rose-950/40"
                                          title="从队列移除"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. 我的喜欢列表 */}
                        {playlistSubTab === 'favorites' && (
                          <div className="space-y-2">
                            {favorites.length === 0 ? (
                              <div
                                style={{
                                  backgroundColor: isDarkMode ? `${activePaper}60` : `${activePaper}80`
                                }}
                                className="p-8 text-center rounded-2xl border border-dashed border-rose-300/40 dark:border-rose-500/30 space-y-2"
                              >
                                <Heart className="w-8 h-8 text-rose-300 dark:text-rose-400 mx-auto" />
                                <p className="text-xs text-[#6E7C75] dark:text-[#A7B4AD] font-serif">暂无喜欢的曲目</p>
                                <p className="text-[11px] text-[#6E7C75]/70 dark:text-[#A7B4AD]/70">在播放或搜索时轻触红心即可永久珍藏</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                                {favorites.map((song) => (
                                  <div
                                    key={song.id}
                                    onClick={() => handlePlayFromCollection(song)}
                                    style={{
                                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : `${activePaper}95`,
                                      borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : `${activePrimary}18`
                                    }}
                                    className="flex items-center justify-between p-2.5 rounded-2xl border cursor-pointer group transition-all shadow-2xs"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-rose-50 dark:bg-rose-950/40 shrink-0">
                                        {song.cover ? (
                                          <img
                                            src={song.cover}
                                            alt={song.title}
                                            onError={(e) => {
                                              (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_COVER;
                                            }}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-rose-400">
                                            <Music className="w-4 h-4" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                          {song.title}
                                        </h4>
                                        <span className="text-[10px] text-[#6E7C75] dark:text-[#A7B4AD] truncate">{song.artist}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleFavorite(song);
                                        }}
                                        className="p-1.5 text-rose-500 hover:scale-110 transition-transform cursor-pointer"
                                        title="取消喜欢"
                                      >
                                        <Heart className="w-4 h-4 fill-rose-500" />
                                      </button>
                                      <button
                                        className="p-1.5 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors cursor-pointer"
                                        title="播放"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. 历史足迹列表 */}
                        {playlistSubTab === 'history' && (
                          <div className="space-y-2">
                            {history.length === 0 ? (
                              <div
                                style={{
                                  backgroundColor: isDarkMode ? `${activePaper}60` : `${activePaper}80`,
                                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${activePrimary}25`
                                }}
                                className="p-8 text-center rounded-2xl border border-dashed space-y-2"
                              >
                                <History className="w-8 h-8 mx-auto" style={{ color: activePrimary }} />
                                <p className="text-xs text-[#6E7C75] dark:text-[#A7B4AD] font-serif">暂无历史播放记录</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                                {history.map((song) => (
                                  <div
                                    key={song.id}
                                    onClick={() => handlePlayFromCollection(song)}
                                    style={{
                                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : `${activePaper}95`,
                                      borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : `${activePrimary}18`
                                    }}
                                    className="flex items-center justify-between p-2.5 rounded-2xl border cursor-pointer group transition-all shadow-2xs"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        style={{ backgroundColor: `${activePrimary}18` }}
                                        className="w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                                      >
                                        {song.cover ? (
                                          <img
                                            src={song.cover}
                                            alt={song.title}
                                            onError={(e) => {
                                              (e.currentTarget as HTMLImageElement).src = DEFAULT_FALLBACK_COVER;
                                            }}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center" style={{ color: activePrimary }}>
                                            <Music className="w-4 h-4" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] truncate transition-colors">
                                          {song.title}
                                        </h4>
                                        <span className="text-[10px] text-[#6E7C75] dark:text-[#A7B4AD] truncate">{song.artist}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleFavorite(song);
                                        }}
                                        className="p-1 text-gray-400 hover:text-rose-500 cursor-pointer"
                                        title="喜欢"
                                      >
                                        <Heart
                                          className={`w-3.5 h-3.5 ${
                                            favorites.some((f) => f.id === song.id)
                                              ? 'fill-rose-500 text-rose-500'
                                              : ''
                                          }`}
                                        />
                                      </button>
                                      <button
                                        style={{ backgroundColor: `${activePrimary}18`, color: activePrimary }}
                                        className="p-1.5 rounded-full hover:brightness-110 transition-colors cursor-pointer"
                                        title="播放"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 自定义网络直链弹窗 */}
      <AnimatePresence>
        {showCustomModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div
              style={{
                backgroundColor: isDarkMode ? `${activePaper}` : `${activePaper}`,
                borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : `${activePrimary}35`
              }}
              className="p-5 rounded-3xl border shadow-2xl w-full max-w-sm space-y-4"
            >
              <h3 className="text-sm font-serif font-bold text-[#17201B] dark:text-[#FAF8F5]">添加网络音频直链</h3>
              <div className="space-y-2 text-xs">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="曲目标题（例如：专属回忆伴奏）"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : '#FFFFFF',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : `${activePrimary}25`
                  }}
                  className="w-full p-2.5 rounded-xl border text-[#17201B] dark:text-[#FAF8F5] focus:outline-none"
                />
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="音频直链（以 http/https 开头，支持 MP3/M4A）"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : '#FFFFFF',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : `${activePrimary}25`
                  }}
                  className="w-full p-2.5 rounded-xl border text-[#17201B] dark:text-[#FAF8F5] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 text-[#2B332E] dark:text-[#FAF8F5] font-medium transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleAddCustomUrl}
                  style={{ backgroundColor: activePrimary }}
                  className="px-4 py-1.5 rounded-xl text-white font-serif font-bold shadow-xs active:scale-95 transition-transform cursor-pointer hover:brightness-110"
                >
                  添加并播放
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
