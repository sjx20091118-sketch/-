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
}

const RECENT_KEY = 'shinian_recent_playlist_v1';

export const DEFAULT_INSPIRATION_SONGS: SongItem[] = [
  {
    id: 'insp_1',
    title: '旧街夏雨与微风',
    artist: '白噪音氛围',
    album: '时光原声',
    durationFormatted: '03:45',
    cover: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=500&auto=format&fit=crop&q=80',
    url: 'https://cdn.freesound.org/previews/512/512134_7037-lq.mp3',
  },
  {
    id: 'insp_2',
    title: '胶片放映机与暗房',
    artist: '时光音效',
    album: '记忆放映室',
    durationFormatted: '02:30',
    cover: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80',
    url: 'https://cdn.freesound.org/previews/415/415209_5121236-lq.mp3',
  },
  {
    id: 'insp_3',
    title: '深秋壁炉与柴火温存',
    artist: '治愈底噪',
    album: '冬日围炉',
    durationFormatted: '04:12',
    cover: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
    url: 'https://cdn.freesound.org/previews/316/316922_4921277-lq.mp3',
  },
];

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

export async function fetchSongPlayUrl(id: string): Promise<string> {
  if (!id) return '';
  try {
    const res = await fetch(`/api/music/play-url?id=${encodeURIComponent(id)}`);
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
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    durationFormatted: '网络流',
  };
}

export function loadSavedPlaylist(): SongItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return DEFAULT_INSPIRATION_SONGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Local blob URLs cannot be preserved across browser restarts, replace with placeholder or filter
      return parsed.filter(item => !item.isLocal || (item.url && item.url.startsWith('blob:')));
    }
    return DEFAULT_INSPIRATION_SONGS;
  } catch {
    return DEFAULT_INSPIRATION_SONGS;
  }
}

export function savePlaylist(list: SongItem[]) {
  try {
    // Only save non-local songs to localStorage
    const storable = list.filter(item => !item.isLocal);
    localStorage.setItem(RECENT_KEY, JSON.stringify(storable.slice(0, 30)));
  } catch (e) {
    console.warn('Failed to save playlist to localStorage', e);
  }
}
