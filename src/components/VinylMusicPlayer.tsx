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
  Shuffle,
  Search,
  Plus,
  Music,
  ListMusic,
  Disc3,
  X,
  ChevronDown,
  Upload,
  Link,
  Sparkles,
  Check
} from 'lucide-react';
import {
  SongItem,
  searchSongs,
  fetchSongPlayUrl,
  createLocalSongItem,
  createCustomUrlSongItem,
  loadSavedPlaylist,
  savePlaylist,
  DEFAULT_INSPIRATION_SONGS
} from '../services/musicService';

interface VinylMusicPlayerProps {
  onShowToast?: (msg: string) => void;
}

export const VinylMusicPlayer: React.FC<VinylMusicPlayerProps> = ({ onShowToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'player' | 'search' | 'playlist'>('player');
  
  // Playlist & track state
  const [playlist, setPlaylist] = useState<SongItem[]>(() => loadSavedPlaylist());
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

  // Load and play track
  const playTrack = useCallback(async (track: SongItem, autoPlay = true) => {
    if (!audioRef.current) return;

    let targetUrl = track.url;
    if (!targetUrl) {
      setIsLoadingUrl(true);
      try {
        targetUrl = await fetchSongPlayUrl(track.id);
        if (targetUrl) {
          track.url = targetUrl;
          setPlaylist((prev) => {
            const updated = prev.map((s) => (s.id === track.id ? { ...s, url: targetUrl } : s));
            savePlaylist(updated);
            return updated;
          });
        } else {
          onShowToast?.(`暂未获取到《${track.title}》播放源`);
          setIsLoadingUrl(false);
          return;
        }
      } catch {
        onShowToast?.(`获取《${track.title}》音源失败`);
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
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Playback autoplay hindered', err);
            setIsPlaying(false);
          });
      }
    }
  }, [onShowToast]);

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
    // Check if song is already in playlist
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

  // Handle custom URL
  const handleAddCustomUrl = () => {
    if (!customUrl.trim()) return;
    const newSong = createCustomUrlSongItem(customUrl, customTitle);
    const updated = [newSong, ...playlist];
    setPlaylist(updated);
    savePlaylist(updated);
    setCurrentIndex(0);
    playTrack(newSong, true);
    setShowCustomModal(false);
    setCustomUrl('');
    setCustomTitle('');
    setViewMode('player');
    onShowToast?.(`已添加网络流《${newSong.title}》`);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const HOT_TAGS = ['晴天', '起风了', '安静', '稻香', '富士山下', '如愿', '岁月神偷', '慢热'];

  return (
    <>
      {/* 隐藏的本地音频文件选择器 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="audio/mp3,audio/mpeg,audio/wav,audio/aac,audio/flac,audio/ogg"
        className="hidden"
      />

      {/* ================= 常驻灵动黑胶微坞 (Floating Vinyl Pill) ================= */}
      <div className="fixed bottom-20 right-4 sm:bottom-7 sm:right-7 z-40">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative group flex items-center"
        >
          {/* 拟物黑胶唱盘主按钮 */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            title={currentTrack ? `正在播放: ${currentTrack.title}` : '回忆留声机'}
            className="relative w-13 h-13 rounded-full bg-[#17201B] border-2 border-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.22)] flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          >
            {/* 黑胶细密同心圆刻纹 */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                background:
                  'repeating-radial-gradient(circle at 50% 50%, #000 0px, #000 1px, #2A332E 2px, #000 3px)',
              }}
            />

            {/* 旋转封面标签 (Spinning Center Label) */}
            <div
              className={`w-7 h-7 rounded-full overflow-hidden border border-white/60 shadow-inner relative z-10 transition-transform ${
                isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''
              }`}
            >
              {currentTrack?.cover ? (
                <img
                  src={currentTrack.cover}
                  alt={currentTrack.title}
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

            {/* 唱机面板本体 */}
            <motion.div
              initial={{ y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="relative w-full sm:max-w-lg bg-[#FAF8F5]/96 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-[#2B332E]/10 shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden max-h-[92vh] flex flex-col z-10"
            >
              {/* 顶部标题与视图模式切换条 */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-[#2B332E]/[0.06]">
                <div className="flex items-center gap-1 bg-[#2B332E]/[0.05] p-1 rounded-full text-xs font-serif">
                  <button
                    onClick={() => setViewMode('player')}
                    className={`px-3 py-1 rounded-full transition-all ${
                      viewMode === 'player'
                        ? 'bg-white text-[#17201B] font-bold shadow-2xs'
                        : 'text-[#6E7C75] hover:text-[#17201B]'
                    }`}
                  >
                    黑胶唱机
                  </button>
                  <button
                    onClick={() => setViewMode('search')}
                    className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                      viewMode === 'search'
                        ? 'bg-white text-[#17201B] font-bold shadow-2xs'
                        : 'text-[#6E7C75] hover:text-[#17201B]'
                    }`}
                  >
                    <Search className="w-3 h-3" /> 全网搜歌
                  </button>
                  <button
                    onClick={() => setViewMode('playlist')}
                    className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                      viewMode === 'playlist'
                        ? 'bg-white text-[#17201B] font-bold shadow-2xs'
                        : 'text-[#6E7C75] hover:text-[#17201B]'
                    }`}
                  >
                    <ListMusic className="w-3 h-3" /> 歌单 ({playlist.length})
                  </button>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-[#6E7C75] transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              {/* 唱机内容区 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {viewMode === 'player' && (
                  <div className="flex flex-col items-center">
                    {/* 拟物黑胶唱片台架构 */}
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-gradient-to-br from-[#1E2621] to-[#121614] border-4 border-[#3D4741] p-4 shadow-[inset_0_4px_16px_rgba(0,0,0,0.6),0_12px_32px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden">
                      {/* 唱片机金属拉丝铭牌印记 */}
                      <div className="absolute left-3.5 bottom-3 text-[9px] font-mono tracking-wider text-white/30 select-none">
                        SHINIAN · HIFI TURNTABLE
                      </div>

                      {/* 黑胶大唱盘 (Spinning Vinyl Disc) */}
                      <div
                        className={`relative w-52 h-52 sm:w-56 sm:h-56 rounded-full bg-[#0D100F] shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center transition-transform ${
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
                        <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/60 shadow-lg relative z-10 bg-[#5B7B6D]">
                          {currentTrack?.cover ? (
                            <img
                              src={currentTrack.cover}
                              alt={currentTrack.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/80">
                              <Music className="w-8 h-8" />
                            </div>
                          )}
                          {/* 中心主轴孔 */}
                          <div className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-[#FAF8F5] border border-black/30 shadow-inner" />
                        </div>
                      </div>

                      {/* 机械拟物唱针 (Mechanical Tonearm with Physics Swing) */}
                      <div
                        className="absolute right-3 top-2 w-20 h-36 origin-[75%_12%] transition-transform duration-700 ease-out pointer-events-none z-20"
                        style={{
                          transform: isPlaying ? 'rotate(24deg)' : 'rotate(0deg)',
                        }}
                      >
                        {/* 唱针转轴底座 */}
                        <div className="absolute right-3 top-2 w-7 h-7 rounded-full bg-gradient-to-b from-[#A0A9A3] to-[#4F5953] border border-white/40 shadow-md" />
                        {/* 唱针金属杆 */}
                        <div className="absolute right-6 top-6 w-1 h-26 bg-gradient-to-b from-[#C4CAC6] via-[#7B8680] to-[#505954] shadow-xs" />
                        {/* 唱针磁头 */}
                        <div className="absolute right-4.5 top-31 w-4 h-6 rounded-xs bg-[#E88765] border border-white/50 shadow-md transform rotate-12" />
                      </div>
                    </div>

                    {/* 歌曲信息与时光标签 */}
                    <div className="text-center mt-5 space-y-1 w-full max-w-xs px-2">
                      <h3 className="text-lg sm:text-xl font-serif font-bold text-[#17201B] truncate">
                        {currentTrack?.title || '时光留声机'}
                      </h3>
                      <p className="text-xs text-[#6E7C75] font-serif truncate">
                        {currentTrack?.artist || '未选定曲目'} {currentTrack?.album ? `· ${currentTrack.album}` : ''}
                      </p>
                    </div>

                    {/* 进度控制滑块 */}
                    <div className="w-full max-w-sm mt-5 space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-[#5B7B6D]/20 rounded-lg appearance-none cursor-pointer accent-[#5B7B6D]"
                      />
                      <div className="flex justify-between text-[10px] text-[#6E7C75] font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* 播放控制按钮群 */}
                    <div className="flex items-center justify-center gap-6 mt-4">
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
                            ? '列表循环'
                            : loopMode === 'one'
                            ? '单曲循环'
                            : '随机播放'
                        }
                      >
                        {loopMode === 'shuffle' ? (
                          <Shuffle className="w-4 h-4 text-[#E88765]" />
                        ) : loopMode === 'one' ? (
                          <Repeat className="w-4 h-4 text-[#E88765]" />
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

                      {/* 主播放/暂停 (大号质感按钮) */}
                      <button
                        onClick={togglePlay}
                        disabled={isLoadingUrl}
                        className="w-14 h-14 rounded-full bg-[#5B7B6D] hover:bg-[#3E564B] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
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
                    {/* 搜索框 */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          placeholder="输入歌名、歌手（如：周杰伦 晴天、起风了...）"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#2B332E]/15 focus:outline-none focus:border-[#5B7B6D] font-sans"
                        />
                        <Search className="w-4 h-4 text-[#6E7C75] absolute left-3 top-2.5" />
                      </div>
                      <button
                        onClick={() => handleSearch()}
                        disabled={isSearching}
                        className="px-4 py-2 bg-[#5B7B6D] text-white text-xs font-serif rounded-xl hover:bg-[#3E564B] transition-colors disabled:opacity-50"
                      >
                        {isSearching ? '检索中...' : '搜索'}
                      </button>
                    </div>

                    {/* 灵感标签推荐 */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-[#6E7C75] font-serif">热门点播灵感：</span>
                      <div className="flex flex-wrap gap-1.5">
                        {HOT_TAGS.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => {
                              setSearchQuery(tag);
                              handleSearch(tag);
                            }}
                            className="px-2.5 py-1 rounded-full bg-white border border-[#5B7B6D]/15 text-[11px] text-[#5B7B6D] hover:bg-[#5B7B6D]/10 transition-colors font-serif"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 扩展功能区：本地导入与直链 */}
                    <div className="pt-2 border-t border-[#2B332E]/[0.06] flex items-center justify-between text-xs">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-[#5B7B6D] hover:underline font-serif"
                      >
                        <Upload className="w-3.5 h-3.5" /> 导入设备本地 MP3
                      </button>
                      <button
                        onClick={() => setShowCustomModal(true)}
                        className="flex items-center gap-1.5 text-[#E88765] hover:underline font-serif"
                      >
                        <Link className="w-3.5 h-3.5" /> 粘贴网络音频直链
                      </button>
                    </div>

                    {/* 搜索结果列表 */}
                    <div className="space-y-2 mt-3">
                      <span className="text-xs font-serif font-bold text-[#17201B]">
                        {searchResults.length > 0 ? `搜索结果 (${searchResults.length})` : '推荐氛围原声'}
                      </span>
                      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                        {(searchResults.length > 0 ? searchResults : DEFAULT_INSPIRATION_SONGS).map((song) => (
                          <div
                            key={song.id}
                            onClick={() => selectSearchResult(song)}
                            className="flex items-center justify-between p-2.5 rounded-2xl bg-white/80 hover:bg-white border border-[#2B332E]/[0.06] shadow-2xs hover:shadow-xs cursor-pointer group transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#5B7B6D]/20 shrink-0">
                                {song.cover ? (
                                  <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#5B7B6D]">
                                    <Disc3 className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-serif font-bold text-[#17201B] truncate group-hover:text-[#5B7B6D] transition-colors">
                                  {song.title}
                                </h4>
                                <p className="text-[10px] text-[#6E7C75] truncate">
                                  {song.artist} · {song.album}
                                </p>
                              </div>
                            </div>

                            <button className="p-1.5 rounded-full bg-[#FAF8F5] text-[#5B7B6D] group-hover:bg-[#5B7B6D] group-hover:text-white transition-colors shrink-0">
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {viewMode === 'playlist' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-serif font-bold text-[#17201B]">
                        当前播放列表（共 {playlist.length} 首）
                      </span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#5B7B6D] hover:underline flex items-center gap-1 font-serif text-[11px]"
                      >
                        <Plus className="w-3 h-3" /> 添加本地歌曲
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
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
                            className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
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

                            <div className="flex items-center gap-2">
                              {song.isLocal && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-sans">
                                  本地
                                </span>
                              )}
                              <span className="text-[10px] font-mono">{song.durationFormatted || ''}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
