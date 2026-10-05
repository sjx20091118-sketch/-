export interface SongItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration?: number;
  durationFormatted?: string;
  cover?: string;
  url?: string;
  category?: 'eastern' | 'healing' | 'nature' | 'custom' | 'local';
  isLocal?: boolean;
  engine?: 'cloud' | 'network' | 'dual' | 'local' | 'synthesizer';
  noiseType?: 'rain' | 'breeze' | 'stream' | 'fireplace' | 'bowl';
}

const RECENT_KEY = 'shinian_recent_playlist_v7';
const FAVORITES_KEY = 'shinian_music_favorites_v4';
const HISTORY_KEY = 'shinian_music_history_v4';
export const DEFAULT_FALLBACK_COVER = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80';

export const MUSIC_CATEGORIES = [
  { id: 'all', label: '全部治愈曲目' },
  { id: 'healing', label: '现代治愈慢调' },
  { id: 'custom', label: '自定与导入' }
] as const;

// 现代治愈钢琴与纯音免版权典藏时光曲目 (CC0 / Public Domain / 稳定永不失效)
export const CURATED_TIME_SONGS: SongItem[] = [
  {
    id: 'healing_clair',
    title: '月光 (Clair de Lune)',
    artist: '德彪西 (Claude Debussy)',
    album: '静夜微光 · 治愈钢琴',
    category: 'healing',
    duration: 305,
    durationFormatted: '05:05',
    url: '/audio/healing_clair.mp3',
    cover: 'https://images.unsplash.com/photo-1520523839898-507121774bfa?w=500&auto=format&fit=crop&q=80',
    engine: 'network'
  },
  {
    id: 'healing_nocturne',
    title: '降E大调夜曲 (Nocturne Op.9 No.2)',
    artist: '肖邦 (Frédéric Chopin)',
    album: '浪漫夜色 · 晚安诗章',
    category: 'healing',
    duration: 270,
    durationFormatted: '04:30',
    url: '/audio/healing_nocturne.mp3',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
    engine: 'network'
  },
  {
    id: 'healing_moonlight',
    title: '月光奏鸣曲第一乐章 (Moonlight Sonata)',
    artist: '贝多芬 (Ludwig van Beethoven)',
    album: '微芒如水 · 经典沉思',
    category: 'healing',
    duration: 360,
    durationFormatted: '06:00',
    url: '/audio/healing_moonlight.mp3',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    engine: 'network'
  },
  {
    id: 'healing_gymnopedie',
    title: '裸体歌舞 (Gymnopédie No. 1)',
    artist: '埃里克·萨蒂 (Erik Satie)',
    album: '极简慢调 · 光阴慢走',
    category: 'healing',
    duration: 210,
    durationFormatted: '03:30',
    url: '/audio/healing_gymnopedie.mp3',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    engine: 'network'
  },
  {
    id: 'healing_liebestraum',
    title: '爱之梦第三首 (Liebestraum No.3)',
    artist: '李斯特 (Franz Liszt)',
    album: '深情夜咏 · 岁月温存',
    category: 'healing',
    duration: 290,
    durationFormatted: '04:50',
    url: '/audio/healing_liebestraum.mp3',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    engine: 'network'
  },
  {
    id: 'healing_traumerei',
    title: '梦幻曲 (Träumerei Op.15 No.7)',
    artist: '罗伯特·舒曼 (Robert Schumann)',
    album: '童年情景 · 岁月如歌',
    category: 'healing',
    duration: 195,
    durationFormatted: '03:15',
    url: '/audio/healing_traumerei.mp3',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    engine: 'network'
  },
  {
    id: 'healing_nocturne_csharp',
    title: '升C小调夜曲 (Nocturne in C-sharp Minor)',
    artist: '肖邦 (Frédéric Chopin)',
    album: '夜色深处 · 柔情低语',
    category: 'healing',
    duration: 260,
    durationFormatted: '04:20',
    url: '/audio/healing_nocturne_csharp.mp3',
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
    engine: 'network'
  },
  {
    id: 'healing_air_on_g',
    title: 'G弦上的咏叹调 (Air on the G String)',
    artist: '巴赫 (J.S. Bach)',
    album: '安宁弦乐 · 纯净心境',
    category: 'healing',
    duration: 325,
    durationFormatted: '05:25',
    url: '/audio/healing_air_on_g.mp3',
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
    engine: 'network'
  },
  {
    id: 'healing_gnossienne',
    title: '玄秘曲第一号 (Gnossienne No. 1)',
    artist: '埃里克·萨蒂 (Erik Satie)',
    album: '沉静光阴 · 冥想漫步',
    category: 'healing',
    duration: 228,
    durationFormatted: '03:48',
    url: '/audio/healing_gnossienne.mp3',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    engine: 'network'
  },
  {
    id: 'healing_fur_elise',
    title: '致爱丽丝 (Für Elise)',
    artist: '贝多芬 (Ludwig van Beethoven)',
    album: '温柔回响 · 初心旧忆',
    category: 'healing',
    duration: 215,
    durationFormatted: '03:35',
    url: '/audio/healing_fur_elise.mp3',
    cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=80',
    engine: 'network'
  }
];

export const CURATED_DUAL_ENGINE_SONGS = CURATED_TIME_SONGS;
export const DEFAULT_TRACK: SongItem = CURATED_TIME_SONGS[0];
export const DEFAULT_INSPIRATION_SONGS: SongItem[] = CURATED_TIME_SONGS;

/**
 * 纯净免版权曲库模糊检索
 */
export async function searchSongs(query: string): Promise<SongItem[]> {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    return CURATED_TIME_SONGS;
  }

  const allSongs = [...CURATED_TIME_SONGS, ...loadSavedPlaylist(), ...loadFavorites()];
  const uniqueMap = new Map<string, SongItem>();

  for (const song of allSongs) {
    if (!song || !song.id) continue;
    if (
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      song.album.toLowerCase().includes(q)
    ) {
      uniqueMap.set(song.id, song);
    }
  }

  const matches = Array.from(uniqueMap.values());
  if (matches.length > 0) {
    return matches;
  }

  return CURATED_TIME_SONGS.slice(0, 8);
}

/**
 * 获取可播放音频地址
 */
export async function fetchSongPlayUrl(
  id: string,
  title?: string,
  artist?: string,
  onEnrichSong?: (enriched: { url: string; cover?: string }) => void
): Promise<string> {
  if (!id && !title) return '';

  if (id.startsWith('http://') || id.startsWith('https://') || id.startsWith('blob:')) {
    return id;
  }

  // 1. 精选免版权曲库中检索匹配
  const found = CURATED_TIME_SONGS.find(s => s.id === id);
  if (found && found.url) {
    onEnrichSong?.({ url: found.url, cover: found.cover });
    return found.url;
  }

  // 2. 按歌名模糊回退
  if (title) {
    const matched = CURATED_TIME_SONGS.find(s => 
      s.title.includes(title) || title.includes(s.title)
    );
    if (matched && matched.url) {
      onEnrichSong?.({ url: matched.url, cover: matched.cover });
      return matched.url;
    }
  }

  return CURATED_TIME_SONGS[0].url || '';
}

export function createLocalSongItem(file: File): SongItem {
  const objectUrl = URL.createObjectURL(file);
  const cleanName = file.name.replace(/\.[^/.]+$/, '');
  return {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: cleanName,
    artist: '本地回忆音轨',
    album: '设备专属导入',
    url: objectUrl,
    isLocal: true,
    category: 'local',
    engine: 'local',
    cover: DEFAULT_FALLBACK_COVER,
    durationFormatted: '本地音频',
  };
}

export function createCustomUrlSongItem(url: string, title?: string): SongItem {
  const cleanUrl = url.trim();
  return {
    id: `custom_${Date.now()}`,
    title: title?.trim() || '网络音乐流',
    artist: '开放流媒体',
    album: '自定义音源',
    url: cleanUrl,
    category: 'custom',
    engine: 'network',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    durationFormatted: '网络流',
  };
}

export function loadSavedPlaylist(): SongItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return CURATED_TIME_SONGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // 过滤旧版侵权、失效防盗链或已移除的东方/自然/雨滴曲目，自动同步最新现代治愈典藏曲库
      const isOutdated = parsed.some(
        (item) => item.id?.startsWith('ne_') || 
                  item.id?.startsWith('oriental_') || 
                  item.id?.startsWith('nature_') || 
                  item.id === 'healing_raindrop' ||
                  item.url?.includes('music.163.com') || 
                  item.url?.includes('pixabay.com')
      );
      if (isOutdated) {
        savePlaylist(CURATED_TIME_SONGS);
        return CURATED_TIME_SONGS;
      }
      const valid = parsed.filter(item => !item.isLocal || (item.url && item.url.startsWith('blob:')));
      return valid.length > 0 ? valid : CURATED_TIME_SONGS;
    }
    return CURATED_TIME_SONGS;
  } catch {
    return CURATED_TIME_SONGS;
  }
}

export function savePlaylist(list: SongItem[]) {
  try {
    const storable = list.filter(item => !item.isLocal);
    localStorage.setItem(RECENT_KEY, JSON.stringify(storable.slice(0, 50)));
  } catch (e) {
    console.warn('Failed to save playlist to localStorage', e);
  }
}

export function loadFavorites(): SongItem[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // 过滤旧版侵权或失效链接，并同步更新新地址
      return parsed
        .filter(item => !item.id?.startsWith('ne_') && !item.url?.includes('music.163.com'))
        .map(item => {
          if (item.url?.includes('pixabay.com')) {
            const fresh = CURATED_TIME_SONGS.find(c => c.id === item.id);
            if (fresh) return { ...item, url: fresh.url };
          }
          return item;
        });
    }
    return [];
  } catch {
    return [];
  }
}

export function saveFavorites(list: SongItem[]) {
  try {
    const storable = list.filter(item => !item.isLocal);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(storable.slice(0, 100)));
  } catch (e) {
    console.warn('Failed to save favorites to localStorage', e);
  }
}

export function loadHistory(): SongItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => !item.id?.startsWith('ne_') && !item.url?.includes('music.163.com'));
    }
    return [];
  } catch {
    return [];
  }
}

export function saveHistory(list: SongItem[]) {
  try {
    const storable = list.filter(item => !item.isLocal);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(storable.slice(0, 60)));
  } catch (e) {
    console.warn('Failed to save history to localStorage', e);
  }
}
