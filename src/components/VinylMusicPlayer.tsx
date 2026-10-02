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

const DEFAULT_FALLBACK_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

export const CURATED_TIME_SONGS: SongItem[] = CURATED_DUAL_ENGINE_SONGS;

interface VinylMusicPlayerProps {
  onShowToast?: (msg: string) => void;
}

type PlaylistSubTab = 'queue' | 'favorites' | 'history';

export const VinylMusicPlayer: React.FC<VinylMusicPlayerProps> = ({ onShowToast }) => {
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);

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

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
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
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-3.5 sm:bottom-5 sm:right-5 z-40 flex items-center">
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
            className={`relative w-12 h-12 rounded-full shadow-lg border-2 border-[#FAF8F5] p-0.5 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 bg-[#17201B] cursor-pointer ${
              isPlaying ? 'ring-2 ring-[#5B7B6D] ring-offset-2 ring-offset-[#FAF8F5]' : ''
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
                <div className="w-full h-full bg-[#5B7B6D] flex items-center justify-center text-white">
                  <Disc3 className="w-4 h-4" />
                </div>
              )}
              {/* 中心孔轴 */}
              <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
            </div>

            {/* 呼吸声波指示环 */}
            {isPlaying && (
              <span className="absolute inset-0 rounded-full border border-[#E88765]/60 animate-ping pointer-events-none opacity-40" />
            )}
          </button>

          {/* 快捷悬浮胶囊：曲目简报与暂停 */}
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2.5 ml-2.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#5B7B6D]/20 shadow-md cursor-pointer hover:bg-white transition-all max-w-[200px]"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-serif font-bold text-[#17201B] truncate">
                {currentTrack?.title || '拾年留声机'}
              </span>
              <span className="text-[9px] text-[#6E7C75] truncate">
                {isPlaying ? currentTrack?.artist || '流光漫溢' : '轻触展开唱机'}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-6 h-6 rounded-full bg-[#5B7B6D] hover:bg-[#3E564B] text-white flex items-center justify-center shrink-0 transition-colors"
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
            {/* 背景虚化幕布 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />

            {/* 唱机主机甲板 (The Turntable Body) - 锁定 580px 统一黄金比例高度，三标签切换杜绝跳动 */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative w-full max-w-lg bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl border border-[#2B332E]/15 shadow-2xl overflow-hidden flex flex-col h-[580px] max-h-[88dvh] z-10 pb-3 sm:pb-4"
            >
              {/* 顶部控制栏与视图切换 */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#2B332E]/10 bg-white/70 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-1.5 bg-[#2B332E]/5 p-1 rounded-full text-xs font-serif">
                  <button
                    onClick={() => setViewMode('player')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      viewMode === 'player'
                        ? 'bg-white text-[#17201B] font-bold shadow-2xs'
                        : 'text-[#6E7C75] hover:text-[#17201B]'
                    }`}
                  >
                    黑胶唱机
                  </button>
                  <button
                    onClick={() => setViewMode('search')}
                    className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'search'
                        ? 'bg-white text-[#17201B] font-bold shadow-2xs'
                        : 'text-[#6E7C75] hover:text-[#17201B]'
                    }`}
                  >
                    <Search className="w-3 h-3" /> 全网搜歌
                  </button>
                  <button
                    onClick={() => setViewMode('playlist')}
                    className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'playlist'
                        ? 'bg-white text-[#17201B] font-bold shadow-2xs'
                        : 'text-[#6E7C75] hover:text-[#17201B]'
                    }`}
                  >
                    <ListMusic className="w-3 h-3" /> 歌单库 ({playlist.length})
                  </button>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-[#6E7C75] transition-colors cursor-pointer"
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

                      {/* 黑胶大唱盘 (Spinning Vinyl Disc) */}
                      <div
                        className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-[#0D100F] shadow-[0_0_22px_rgba(0,0,0,0.85)] flex items-center justify-center transition-transform ${
                          isPlaying ? 'animate-[spin_18s_linear_infinite]' : ''
                        }`}
                        style={{
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
                        <div className="w-19 h-19 sm:w-22 sm:h-22 rounded-full overflow-hidden border-2 border-white/60 shadow-lg relative z-10 bg-[#5B7B6D]">
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
                            <div className="w-full h-full flex items-center justify-center text-white/80">
                              <Music className="w-6 h-6" />
                            </div>
                          )}
                          {/* 中心主轴孔 */}
                          <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-[#FAF8F5] border border-black/30 shadow-inner" />
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
                        <div className="absolute right-3.5 top-25 w-3.5 h-5 rounded-xs bg-[#E88765] border border-white/50 shadow-md transform rotate-12" />
                      </div>
                    </div>

                    {/* 歌曲信息与时光标签 */}
                    <div className="text-center space-y-0.5 w-full max-w-xs px-2 relative my-1">
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="text-base sm:text-lg font-serif font-bold text-[#17201B] truncate tracking-tight">
                          {currentTrack?.title || '拾年留声机'}
                        </h3>
                        {currentTrack && (
                          <button
                            onClick={() => toggleFavorite()}
                            title={isCurrentFavorited ? '取消喜欢' : '添加至我的喜欢'}
                            className="p-1 rounded-full hover:bg-black/5 transition-transform active:scale-125 cursor-pointer"
                          >
                            <Heart
                              className={`w-4 h-4 transition-colors ${
                                isCurrentFavorited
                                  ? 'fill-rose-500 text-rose-500'
                                  : 'text-[#6E7C75] hover:text-rose-500'
                              }`}
                            />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#6E7C75] font-serif truncate">
                        {currentTrack?.artist || '暂未选定曲目'} {currentTrack?.album ? `· ${currentTrack.album}` : ''}
                      </p>
                    </div>

                    {/* 进度控制滑块 */}
                    <div className="w-full max-w-sm space-y-1 px-2 my-1">
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-[#5B7B6D]/20 rounded-lg appearance-none cursor-pointer accent-[#5B7B6D]"
                      />
                      <div className="flex justify-between text-[10px] sm:text-[11px] text-[#6E7C75] font-mono tabular-nums">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

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
                        className="p-2 rounded-full text-[#6E7C75] hover:text-[#17201B] hover:bg-black/5 transition-colors"
                        title={
                          loopMode === 'all'
                            ? '当前：列表循环（轻触切换单曲循环）'
                            : loopMode === 'one'
                            ? '当前：单曲循环（轻触切换随机播放）'
                            : '当前：随机播放（轻触切换列表循环）'
                        }
                      >
                        {loopMode === 'shuffle' ? (
                          <Shuffle className="w-4 h-4 text-[#E88765]" />
                        ) : loopMode === 'one' ? (
                          <Repeat1 className="w-4 h-4 text-[#E88765]" />
                        ) : (
                          <Repeat className="w-4 h-4" />
                        )}
                      </button>

                      {/* 上一曲 */}
                      <button
                        onClick={handlePrev}
                        className="p-2.5 rounded-full text-[#17201B] hover:bg-black/5 transition-transform active:scale-90"
                      >
                        <SkipBack className="w-5 h-5 fill-current" />
                      </button>

                      {/* 主播放/暂停 (大号拟物玉石质感按钮) */}
                      <button
                        onClick={togglePlay}
                        disabled={isLoadingUrl || playlist.length === 0}
                        className="w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-[#5B7B6D] hover:bg-[#3E564B] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
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
                        className="p-2.5 rounded-full text-[#17201B] hover:bg-black/5 transition-transform active:scale-90"
                      >
                        <SkipForward className="w-5 h-5 fill-current" />
                      </button>

                      {/* 音量开闭 */}
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 rounded-full text-[#6E7C75] hover:text-[#17201B] hover:bg-black/5 transition-colors"
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
                        placeholder="搜索歌曲、艺术家、专辑（如：周杰伦、晴天、起风了）"
                        className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 focus:border-[#5B7B6D] focus:bg-white dark:focus:bg-[#1A2420] text-xs font-serif text-[#17201B] dark:text-[#FAF8F5] placeholder:text-[#6E7C75]/60 outline-none transition-all shadow-inner"
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
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 bg-[#5B7B6D] hover:bg-[#4A675A] text-white text-xs font-serif font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center"
                      >
                        {isSearching ? '检索中' : '搜索'}
                      </button>
                    </form>

                    {/* 热门搜索分类胶囊流 */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-serif font-bold text-[#6E7C75] dark:text-[#A7B4AD] tracking-wider">
                        热门推荐
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">
                        {['三叶的主题曲', 'Sparkle', '晴天', '起风了', '七里香', '蒲公英的约定', '夏天的风', 'Lemon', 'Summer'].map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => {
                              setSearchQuery(kw);
                              handleSearch(kw);
                            }}
                            className="text-[11px] font-serif px-3 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-white dark:hover:bg-white/15 text-[#2B332E] dark:text-[#E2EAE5] border border-black/5 dark:border-white/10 hover:border-[#5B7B6D]/40 transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0"
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
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-black/[0.025] dark:bg-white/[0.04] border border-black/5 dark:border-white/8 hover:border-[#5B7B6D]/35 hover:bg-white dark:hover:bg-white/10 text-[#3D4C44] dark:text-[#D6E0DA] font-serif text-xs font-medium transition-all shadow-2xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#5B7B6D] dark:text-[#A7D1BF]" />
                        <span>导入本地音轨 (MP3/FLAC)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomModal(true)}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-black/[0.025] dark:bg-white/[0.04] border border-black/5 dark:border-white/8 hover:border-[#5B7B6D]/35 hover:bg-white dark:hover:bg-white/10 text-[#3D4C44] dark:text-[#D6E0DA] font-serif text-xs font-medium transition-all shadow-2xs cursor-pointer"
                      >
                        <Link className="w-3.5 h-3.5 text-[#5B7B6D] dark:text-[#A7D1BF]" />
                        <span>粘贴音频直链</span>
                      </button>
                    </div>

                    {/* 搜索结果或极简精选卡片流 */}
                    <div className="space-y-3 mt-2">
                      {searchResults.length > 0 ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] flex items-center gap-1.5">
                              <Music className="w-3.5 h-3.5 text-[#5B7B6D]" />
                              <span>全网检索结果 ({searchResults.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchResults([]);
                                setSearchQuery('');
                              }}
                              className="text-[11px] text-[#5B7B6D] dark:text-[#A7D1BF] hover:underline font-serif cursor-pointer"
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
                                  className={`group relative flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                                    isCurrent
                                      ? 'bg-white/95 dark:bg-[#1C2722] border-[#5B7B6D] shadow-md'
                                      : 'bg-white/70 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] border-black/5 dark:border-white/8 hover:border-[#5B7B6D]/30'
                                  }`}
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
                                      <h4 className="text-xs font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] truncate group-hover:text-[#5B7B6D] dark:group-hover:text-[#A7D1BF] transition-colors">
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
                                      className="p-2 rounded-xl bg-[#5B7B6D] text-white hover:bg-[#4A675A] transition-all shadow-xs cursor-pointer active:scale-95 ml-0.5"
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
                              <Music className="w-3.5 h-3.5 text-[#5B7B6D]" />
                              <span>编辑精选 · 典藏时光曲目</span>
                            </span>
                            <span className="text-[10px] text-[#6E7C75] font-serif">即点即播</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                            {CURATED_TIME_SONGS.map((song) => {
                              const isCurrent = currentTrack?.id === song.id;
                              const isFav = favorites.some((f) => f.id === song.id);
                              return (
                                <div
                                  key={song.id}
                                  onClick={() => selectSearchResult(song)}
                                  className={`group relative flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                                    isCurrent
                                      ? 'bg-white/95 dark:bg-[#1C2722] border-[#5B7B6D] shadow-sm'
                                      : 'bg-white/70 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] border-black/5 dark:border-white/8 hover:border-[#5B7B6D]/30'
                                  }`}
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
                                      <h4 className="text-xs font-serif font-bold text-[#17201B] dark:text-[#FAF8F5] truncate group-hover:text-[#5B7B6D] dark:group-hover:text-[#A7D1BF] transition-colors">
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
                                      className="p-1.5 rounded-xl bg-[#5B7B6D] text-white hover:bg-[#4A675A] transition-colors shrink-0 shadow-2xs"
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
                            className="p-4 rounded-2xl bg-white/90 hover:bg-white border border-[#2B332E]/10 hover:border-[#5B7B6D]/40 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-[#5B7B6D]/10 text-[#5B7B6D] flex items-center justify-center group-hover:scale-105 transition-transform">
                                <ListOrdered className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D]">
                                {playlist.length} 首
                              </span>
                            </div>
                            <div className="mt-3">
                              <h4 className="font-serif font-bold text-sm text-[#17201B] group-hover:text-[#5B7B6D] transition-colors">
                                播放队列
                              </h4>
                              <p className="text-[11px] text-[#6E7C75] mt-0.5">
                                当前待奏与即席曲目
                              </p>
                            </div>
                          </div>

                          {/* 我的喜欢卡片 */}
                          <div
                            onClick={() => setPlaylistSubTab('favorites')}
                            className="p-4 rounded-2xl bg-white/90 hover:bg-white border border-[#2B332E]/10 hover:border-rose-300 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Heart className="w-5 h-5 fill-rose-500" />
                              </div>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-500">
                                {favorites.length} 首
                              </span>
                            </div>
                            <div className="mt-3">
                              <h4 className="font-serif font-bold text-sm text-[#17201B] group-hover:text-rose-600 transition-colors">
                                我的喜欢
                              </h4>
                              <p className="text-[11px] text-[#6E7C75] mt-0.5">
                                永恒心动与挚爱珍藏
                              </p>
                            </div>
                          </div>

                          {/* 历史足迹卡片 */}
                          <div
                            onClick={() => setPlaylistSubTab('history')}
                            className="p-4 rounded-2xl bg-white/90 hover:bg-white border border-[#2B332E]/10 hover:border-[#5B7B6D]/40 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-[#2B332E]/5 text-[#5B7B6D] flex items-center justify-center group-hover:scale-105 transition-transform">
                                <History className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#2B332E]/5 text-[#6E7C75]">
                                {history.length} 首
                              </span>
                            </div>
                            <div className="mt-3">
                              <h4 className="font-serif font-bold text-sm text-[#17201B] group-hover:text-[#5B7B6D] transition-colors">
                                历史足迹
                              </h4>
                              <p className="text-[11px] text-[#6E7C75] mt-0.5">
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
                        <div className="flex items-center justify-between border-b border-[#2B332E]/10 pb-2.5">
                          <button
                            onClick={() => setPlaylistSubTab(null)}
                            className="flex items-center gap-1.5 text-xs text-[#5B7B6D] hover:text-[#3E564B] font-serif font-bold transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" /> 返回歌单库
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-serif font-bold text-[#17201B]">
                              {playlistSubTab === 'queue' && `播放队列 (${playlist.length})`}
                              {playlistSubTab === 'favorites' && `我的喜欢 (${favorites.length})`}
                              {playlistSubTab === 'history' && `历史足迹 (${history.length})`}
                            </span>

                            {playlistSubTab === 'queue' && playlist.length > 0 && (
                              <button
                                onClick={clearPlaylist}
                                title="清空当前队列"
                                className="text-[11px] text-red-500/80 hover:text-red-600 flex items-center gap-0.5 cursor-pointer ml-2"
                              >
                                <Trash2 className="w-3 h-3" /> 清空
                              </button>
                            )}
                            {playlistSubTab === 'history' && history.length > 0 && (
                              <button
                                onClick={clearHistory}
                                title="清空历史播放"
                                className="text-[11px] text-red-500/80 hover:text-red-600 flex items-center gap-0.5 cursor-pointer ml-2"
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
                              <span className="text-[#6E7C75] text-[11px]">
                                点击曲目即刻切换起奏
                              </span>
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-[#5B7B6D] hover:underline flex items-center gap-1 font-serif text-[11px] cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> 导入本地歌曲
                              </button>
                            </div>

                            {playlist.length === 0 ? (
                              <div className="p-8 text-center bg-white/60 rounded-2xl border border-dashed border-[#5B7B6D]/20 space-y-2">
                                <Disc3 className="w-8 h-8 text-[#5B7B6D]/40 mx-auto animate-pulse" />
                                <p className="text-xs text-[#6E7C75] font-serif">当前播放列表暂无歌曲</p>
                                <button
                                  onClick={() => setViewMode('search')}
                                  className="text-xs px-3 py-1 bg-[#5B7B6D] text-white rounded-xl font-sans cursor-pointer"
                                >
                                  前往全网搜歌
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
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
                                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer group ${
                                        isCurrent
                                          ? 'bg-[#5B7B6D]/15 border-[#5B7B6D]/30 text-[#17201B]'
                                          : 'bg-white/80 hover:bg-white border-[#2B332E]/[0.06] text-[#6E7C75]'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-4 text-center text-xs font-mono">
                                          {isCurrent && isPlaying ? (
                                            <span className="w-2 h-2 rounded-full bg-[#E88765] inline-block animate-ping" />
                                          ) : (
                                            idx + 1
                                          )}
                                        </span>
                                        <div className="min-w-0">
                                          <h4 className={`text-xs font-serif truncate ${isCurrent ? 'font-bold text-[#17201B]' : ''}`}>
                                            {song.title}
                                          </h4>
                                          <span className="text-[10px] opacity-75 truncate">{song.artist}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {song.isLocal && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-sans">
                                            本地
                                          </span>
                                        )}
                                        <span className="text-[10px] font-mono">{song.durationFormatted || ''}</span>
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
                                          className="p-1.5 text-rose-500/70 hover:text-red-600 sm:text-gray-400 sm:hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer rounded-lg hover:bg-rose-50/50"
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
                              <div className="p-8 text-center bg-white/60 rounded-2xl border border-dashed border-rose-300/40 space-y-2">
                                <Heart className="w-8 h-8 text-rose-300 mx-auto" />
                                <p className="text-xs text-[#6E7C75] font-serif">暂无喜欢的曲目</p>
                                <p className="text-[11px] text-[#6E7C75]/70">在播放或搜索时轻触红心即可永久珍藏</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                                {favorites.map((song) => (
                                  <div
                                    key={song.id}
                                    onClick={() => handlePlayFromCollection(song)}
                                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/80 hover:bg-white border border-[#2B332E]/[0.06] cursor-pointer group transition-all"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-rose-50 shrink-0">
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
                                        <h4 className="text-xs font-serif font-bold text-[#17201B] truncate group-hover:text-rose-600 transition-colors">
                                          {song.title}
                                        </h4>
                                        <span className="text-[10px] text-[#6E7C75] truncate">{song.artist}</span>
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
                                        className="p-1.5 rounded-full bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors cursor-pointer"
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
                              <div className="p-8 text-center bg-white/60 rounded-2xl border border-dashed border-[#5B7B6D]/20 space-y-2">
                                <History className="w-8 h-8 text-[#5B7B6D]/40 mx-auto" />
                                <p className="text-xs text-[#6E7C75] font-serif">暂无历史播放记录</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                                {history.map((song) => (
                                  <div
                                    key={song.id}
                                    onClick={() => handlePlayFromCollection(song)}
                                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/80 hover:bg-white border border-[#2B332E]/[0.06] cursor-pointer group transition-all"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#5B7B6D]/15 shrink-0">
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
                                          <div className="w-full h-full flex items-center justify-center text-[#5B7B6D]">
                                            <Music className="w-4 h-4" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-serif font-bold text-[#17201B] truncate group-hover:text-[#5B7B6D] transition-colors">
                                          {song.title}
                                        </h4>
                                        <span className="text-[10px] text-[#6E7C75] truncate">{song.artist}</span>
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
                                        className="p-1.5 rounded-full bg-[#FAF8F5] text-[#5B7B6D] group-hover:bg-[#5B7B6D] group-hover:text-white transition-colors cursor-pointer"
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
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#2B332E]/15 shadow-xl w-full max-w-sm space-y-4">
              <h3 className="text-sm font-serif font-bold text-[#17201B]">添加网络音频直链</h3>
              <div className="space-y-2 text-xs">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="曲目标题（例如：专属回忆伴奏）"
                  className="w-full p-2.5 rounded-xl bg-white border border-[#2B332E]/15 focus:outline-none focus:border-[#5B7B6D]"
                />
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="音频直链（以 http/https 开头，支持 MP3/M4A）"
                  className="w-full p-2.5 rounded-xl bg-white border border-[#2B332E]/15 focus:outline-none focus:border-[#5B7B6D]"
                />
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-gray-200 text-gray-700 font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleAddCustomUrl}
                  className="px-4 py-1.5 rounded-xl bg-[#5B7B6D] text-white font-serif font-bold"
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
