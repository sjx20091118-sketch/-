export interface SongItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration?: number;
  durationFormatted?: string;
  cover?: string;
  url?: string;
  isLocal?: boolean;
  engine?: 'cloud' | 'network' | 'dual' | 'local';
}

const RECENT_KEY = 'shinian_recent_playlist_v5';
const FAVORITES_KEY = 'shinian_music_favorites_v3';
const HISTORY_KEY = 'shinian_music_history_v3';

// 推荐精选时光曲库 (Verified HiFi Tracks)
export const CURATED_TIME_SONGS: SongItem[] = [
  {
    id: '413296884',
    title: '三叶的主题曲 (Theme of Mitsuha)',
    artist: 'RADWIMPS',
    album: '《你的名字。》电影原声带',
    duration: 155,
    durationFormatted: '02:35',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '14815413',
    title: 'Sparkle (火花 · 你的名字)',
    artist: 'RADWIMPS',
    album: '《你的名字。》插曲',
    duration: 320,
    durationFormatted: '05:20',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '51685512',
    title: '晴天',
    artist: '周杰伦',
    album: '叶惠美 · 青春漫步',
    duration: 269,
    durationFormatted: '04:29',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '26445261',
    title: '起风了 (原版)',
    artist: '买辣椒也用券',
    album: '起风了 · 怀念如风',
    duration: 313,
    durationFormatted: '05:13',
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '493628806',
    title: '七里香',
    artist: '周杰伦',
    album: '七里香 · 盛夏诗篇',
    duration: 299,
    durationFormatted: '04:59',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '544168841',
    title: '蒲公英的约定',
    artist: '周杰伦',
    album: '我很忙 · 岁月长白',
    duration: 247,
    durationFormatted: '04:07',
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '198345447',
    title: '夏天的风',
    artist: '温岚 / Uu',
    album: '温式效应 · 记忆微风',
    duration: 222,
    durationFormatted: '03:42',
    cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '180732768',
    title: 'Lemon',
    artist: '米津玄師 (Kenshi Yonezu)',
    album: '《Unnatural》主题曲',
    duration: 255,
    durationFormatted: '04:15',
    cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '90557740',
    title: '幻昼 (Illusionary Daytime)',
    artist: 'Shirfine',
    album: 'Illusionary Daytime · 空间流转',
    duration: 252,
    durationFormatted: '04:12',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '3282245',
    title: 'Always With Me (永远同在 · 千与千寻)',
    artist: '木村弓 / 宫崎骏',
    album: '千与千寻 原声插曲',
    duration: 216,
    durationFormatted: '03:36',
    cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '642055',
    title: 'River Flows In You',
    artist: 'Yiruma (李闰珉)',
    album: 'First Love · 经典纯音',
    duration: 188,
    durationFormatted: '03:08',
    cover: 'https://images.unsplash.com/photo-1520523839898-507127053c37?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '714777',
    title: 'Summer (菊次郎的夏天)',
    artist: '久石让 (Joe Hisaishi)',
    album: '菊次郎的夏天 电影原声',
    duration: 224,
    durationFormatted: '03:44',
    cover: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&auto=format&fit=crop&q=80',
  },
];

export const CURATED_DUAL_ENGINE_SONGS = CURATED_TIME_SONGS;
export const DEFAULT_TRACK: SongItem = CURATED_TIME_SONGS[0];
export const DEFAULT_INSPIRATION_SONGS: SongItem[] = CURATED_TIME_SONGS;

export async function searchSongs(query: string): Promise<SongItem[]> {
  const q = (query || '').trim();
  if (!q) return [];

  try {
    const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) {
      throw new Error(`Search failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.songs || [];
  } catch (err) {
    console.error('Music search error:', err);
    return [];
  }
}

export async function fetchSongPlayUrl(id: string, title?: string, artist?: string): Promise<string> {
  if (!id && !title) return '';
  try {
    let url = `/api/music/play-url?id=${encodeURIComponent(id)}`;
    if (title) url += `&title=${encodeURIComponent(title)}`;
    if (artist) url += `&artist=${encodeURIComponent(artist)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Play URL fetch failed`);
    }
    const data = await res.json();
    return data.url || '';
  } catch (err) {
    console.error('Error fetching play url for', id, err);
    return '';
  }
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
    engine: 'local',
    cover: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=500&auto=format&fit=crop&q=80',
    durationFormatted: '本地音频',
  };
}

export function createCustomUrlSongItem(url: string, title?: string): SongItem {
  const cleanUrl = url.trim();
  return {
    id: `custom_${Date.now()}`,
    title: title?.trim() || '网络音乐流',
    artist: '外部流媒体',
    album: '自定义音源',
    url: cleanUrl,
    engine: 'network',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    durationFormatted: '网络流',
  };
}

export function loadSavedPlaylist(): SongItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return CURATED_DUAL_ENGINE_SONGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const valid = parsed.filter(item => !item.isLocal || (item.url && item.url.startsWith('blob:')));
      return valid.length > 0 ? valid : CURATED_DUAL_ENGINE_SONGS;
    }
    return CURATED_DUAL_ENGINE_SONGS;
  } catch {
    return CURATED_DUAL_ENGINE_SONGS;
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
    return Array.isArray(parsed) ? parsed : [];
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
    return Array.isArray(parsed) ? parsed : [];
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
