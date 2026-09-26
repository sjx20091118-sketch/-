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

const RECENT_KEY = 'shinian_recent_playlist_v6';
const FAVORITES_KEY = 'shinian_music_favorites_v3';
const HISTORY_KEY = 'shinian_music_history_v3';
export const DEFAULT_FALLBACK_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

// 推荐精选时光曲库 (Verified HiFi Tracks - 内置全网直通免鉴权超清真彩音源)
export const CURATED_TIME_SONGS: SongItem[] = [
  {
    id: 'ne_413296884',
    title: '三叶的主题曲 (Theme of Mitsuha)',
    artist: 'RADWIMPS',
    album: '《你的名字。》电影原声带',
    duration: 155,
    durationFormatted: '02:35',
    url: 'https://music.163.com/song/media/outer/url?id=413296884.mp3',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    engine: 'network',
  },
  {
    id: 'ne_439915614',
    title: 'Sparkle (火花 · 你的名字)',
    artist: 'RADWIMPS',
    album: '《你的名字。》插曲',
    duration: 320,
    durationFormatted: '05:20',
    url: 'https://music.163.com/song/media/outer/url?id=439915614.mp3',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
    engine: 'network',
  },
  {
    id: 'ne_186016',
    title: '晴天',
    artist: '周杰伦',
    album: '叶惠美 · 青春漫步',
    duration: 269,
    durationFormatted: '04:29',
    url: 'https://music.163.com/song/media/outer/url?id=186016.mp3',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    engine: 'network',
  },
  {
    id: 'ne_1330348068',
    title: '起风了 (原版)',
    artist: '买辣椒也用券',
    album: '起风了 · 怀念如风',
    duration: 313,
    durationFormatted: '05:13',
    url: 'https://music.163.com/song/media/outer/url?id=1330348068.mp3',
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
    engine: 'network',
  },
  {
    id: 'ne_186001',
    title: '七里香',
    artist: '周杰伦',
    album: '七里香 · 盛夏诗篇',
    duration: 299,
    durationFormatted: '04:59',
    url: 'https://music.163.com/song/media/outer/url?id=186001.mp3',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    engine: 'network',
  },
  {
    id: 'ne_185997',
    title: '蒲公英的约定',
    artist: '周杰伦',
    album: '我很忙 · 岁月长白',
    duration: 247,
    durationFormatted: '04:07',
    url: 'https://music.163.com/song/media/outer/url?id=185997.mp3',
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
    engine: 'network',
  },
  {
    id: 'ne_254574',
    title: '夏天的风',
    artist: '温岚',
    album: '温式效应 · 记忆微风',
    duration: 222,
    durationFormatted: '03:42',
    url: 'https://music.163.com/song/media/outer/url?id=254574.mp3',
    cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=80',
    engine: 'network',
  },
  {
    id: 'ne_541687281',
    title: 'Lemon',
    artist: '米津玄師 (Kenshi Yonezu)',
    album: '《Unnatural》主题曲',
    duration: 255,
    durationFormatted: '04:15',
    url: 'https://music.163.com/song/media/outer/url?id=541687281.mp3',
    cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
    engine: 'network',
  },
  {
    id: 'ne_26092788',
    title: '幻昼 (Illusionary Daytime)',
    artist: 'Shirfine',
    album: 'Illusionary Daytime · 空间流转',
    duration: 252,
    durationFormatted: '04:12',
    url: 'https://music.163.com/song/media/outer/url?id=26092788.mp3',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    engine: 'network',
  },
  {
    id: 'ne_443242',
    title: 'Summer (菊次郎的夏天)',
    artist: '久石让 (Joe Hisaishi)',
    album: '菊次郎的夏天 电影原声',
    duration: 224,
    durationFormatted: '03:44',
    url: 'https://music.163.com/song/media/outer/url?id=443242.mp3',
    cover: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&auto=format&fit=crop&q=80',
    engine: 'network',
  },
];

export const CURATED_DUAL_ENGINE_SONGS = CURATED_TIME_SONGS;
export const DEFAULT_TRACK: SongItem = CURATED_TIME_SONGS[0];
export const DEFAULT_INSPIRATION_SONGS: SongItem[] = CURATED_TIME_SONGS;

import { buildApiUrl } from './apiConfig';

/**
 * 纯前端通用 JSONP 请求封装器 (免 CORS 跨域限制，100% 适配安卓原生与浏览器)
 */
function jsonpRequest<T>(url: string, paramCallback = 'callback', timeoutMs = 4500): Promise<T | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const callbackName = `shinian_jsonp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const script = document.createElement('script');
    script.type = 'text/javascript';

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      try {
        // @ts-ignore
        delete window[callbackName];
      } catch {}
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    // @ts-ignore
    window[callbackName] = (data: T) => {
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}${paramCallback}=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(null);
    };

    document.head.appendChild(script);
  });
}

/**
 * 纯前端酷我免后台 JSONP 引擎 (提取超清专辑封面与直接可播 RID)
 */
async function searchKuwoJsonp(query: string): Promise<SongItem[]> {
  try {
    const url = `https://search.kuwo.cn/r.s?client=kt&all=${encodeURIComponent(query)}&pn=0&rn=20&vipver=1&ft=music&encoding=utf8&rformat=json&mobi=1`;
    const data = await jsonpRequest<any>(url, 'callback', 4000);
    if (data && data.abslist && Array.isArray(data.abslist)) {
      return data.abslist.map((item: any) => {
        const id = item.DC_TARGETID || (item.MUSICRID ? String(item.MUSICRID).replace(/^MUSIC_/, '') : '');
        const durationSec = parseInt(item.DURATION || '0', 10);
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;
        const durationFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        // 提取真彩专辑封面与歌手肖像
        let directCover = '';
        if (item.web_albumpic_short) {
          directCover = `https://img4.kuwo.cn/star/albumcover/${item.web_albumpic_short.replace(/^\d+\//, '400/')}`;
        } else if (item.web_artistpic_short) {
          directCover = `https://img4.kuwo.cn/star/starheads/${item.web_artistpic_short.replace(/^\d+\//, '400/')}`;
        } else if (item.MVPIC) {
          directCover = item.MVPIC.replace(/^http:/, 'https:');
        }

        return {
          id: id || `kw_${Date.now()}_${Math.random()}`,
          title: (item.SONGNAME || '未知曲目').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'),
          artist: (item.ARTIST || '未知歌手').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'),
          album: (item.ALBUM || '时光单曲').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'),
          duration: durationSec,
          durationFormatted,
          cover: directCover || '',
          url: id ? `https://antiserver.kuwo.cn/anti.s?type=convert_url&rid=${id}&format=mp3&response=url` : undefined,
          engine: 'network' as const
        };
      }).filter((s: SongItem) => Boolean(s.id));
    }
  } catch (err) {
    console.warn('Kuwo jsonp search error:', err);
  }
  return [];
}

/**
 * 纯前端酷狗音乐开放检索通道 (提取高清真彩封面)
 */
async function searchKugouPublic(query: string): Promise<SongItem[]> {
  try {
    const url = `https://songsearch.kugou.com/song_search_v2?keyword=${encodeURIComponent(query)}&page=1&pagesize=20&userid=-1&clientver=&platform=WebFilter&tag=em&filter=2&iscorrection=1`;
    const data = await jsonpRequest<any>(url, 'callback', 4000);
    if (data && data.data && Array.isArray(data.data.lists)) {
      return data.data.lists.map((item: any) => {
        const title = (item.SongName || '未知曲目').replace(/<\/?em>/g, '').replace(/&amp;/g, '&');
        const artist = (item.SingerName || '未知歌手').replace(/<\/?em>/g, '').replace(/&amp;/g, '&');
        const album = (item.AlbumName || '时光单曲').replace(/<\/?em>/g, '').replace(/&amp;/g, '&');
        const durationSec = parseInt(item.Duration || '0', 10);
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;
        const durationFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        const hash = item.FileHash || item.HQFileHash || item.SQFileHash || '';

        // 提取超清真彩专辑/歌手封面
        let directCover = '';
        if (item.Image && typeof item.Image === 'string') {
          directCover = item.Image.replace('{size}', '400').replace(/^http:/, 'https:');
        } else if (item.AlbumPrivilege?.album_img) {
          directCover = item.AlbumPrivilege.album_img.replace('{size}', '400').replace(/^http:/, 'https:');
        }

        return {
          id: `kg_${hash}`,
          title,
          artist,
          album,
          duration: durationSec,
          durationFormatted,
          cover: directCover || '',
          engine: 'network' as const,
        };
      }).filter((s: SongItem) => s.id !== 'kg_');
    }
  } catch (err) {
    console.warn('KuGou public search fallback:', err);
  }
  return [];
}

/**
 * 纯前端 QQ 音乐开放 JSONP 检索 (提取真彩专辑封面)
 */
async function searchQQMusicJsonp(query: string): Promise<SongItem[]> {
  try {
    const url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?ct=24&qqmusic_ver=1298&new_json=1&remoteplace=txt.yqq.song&searchid=1&t=0&aggr=1&cr=1&catZhida=0&lossless=0&flag_qc=0&p=1&n=20&w=${encodeURIComponent(query)}&g_tk=5381&loginUin=0&hostUin=0&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0`;
    const data = await jsonpRequest<any>(url, 'jsonpCallback', 4000);
    if (data && data.data && data.data.song && Array.isArray(data.data.song.list)) {
      return data.data.song.list.map((item: any) => {
        const songMid = item.mid || item.songmid || '';
        const title = item.title || item.name || '未知曲目';
        const artist = item.singer && Array.isArray(item.singer) ? item.singer.map((s: any) => s.name).join(' / ') : '未知歌手';
        const album = item.album ? item.album.name : '时光单曲';
        const durationSec = item.interval || 0;
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;
        const durationFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        const albumMid = item.album ? item.album.mid : '';
        const singerMid = item.singer?.[0]?.mid || '';
        
        let cover = '';
        if (albumMid) {
          cover = `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg`;
        } else if (singerMid) {
          cover = `https://y.gtimg.cn/music/photo_new/T001R300x300M000${singerMid}.jpg`;
        }

        return {
          id: `qq_${songMid}`,
          title,
          artist,
          album,
          duration: durationSec,
          durationFormatted,
          cover,
          engine: 'network' as const,
        };
      }).filter((s: SongItem) => s.id !== 'qq_');
    }
  } catch (err) {
    console.warn('QQ music search error:', err);
  }
  return [];
}

/**
 * 全网多通道高可用免后台音乐检索 (多源引擎自适应并发，确保真彩封面提取)
 */
export async function searchSongs(query: string): Promise<SongItem[]> {
  const q = (query || '').trim();
  if (!q) return [];

  // 1. 优先调用后端安全中继接口 (毫秒级并发，提取真彩封面与官方直链，彻底杜绝前端注入 script 引发的 Script error)
  try {
    const apiUrl = buildApiUrl(`/api/music/search?q=${encodeURIComponent(q)}`);
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.songs && Array.isArray(data.songs) && data.songs.length > 0) {
        return data.songs;
      }
    }
  } catch (err) {
    console.warn('Backend music search proxy warning:', err);
  }

  // 2. 备选：纯前端免后台免 CORS 的多通道开放检索 (仅在脱机或独立 APP 离线时激活)
  try {
    const kwPromise = searchKuwoJsonp(q);
    const kgPromise = searchKugouPublic(q);
    const qqPromise = searchQQMusicJsonp(q);

    const [kwResults, kgResults, qqResults] = await Promise.all([
      kwPromise.catch(() => []),
      kgPromise.catch(() => []),
      qqPromise.catch(() => []),
    ]);

    const combined: SongItem[] = [];
    const seen = new Set<string>();

    const appendList = (list: SongItem[]) => {
      for (const song of list) {
        const key = `${song.title.toLowerCase()}_${song.artist.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(song);
        }
      }
    };

    appendList(kwResults);
    appendList(kgResults);
    appendList(qqResults);

    if (combined.length > 0) {
      return combined.slice(0, 30);
    }
  } catch (err) {
    console.warn('Multi-channel frontend search fallback:', err);
  }

  // 3. 兜底：本地及缓存曲库关键词智能模糊匹配
  const lowerQ = q.toLowerCase();
  const allCurated = [...CURATED_TIME_SONGS, ...loadSavedPlaylist(), ...loadFavorites()];
  const uniqueMap = new Map<string, SongItem>();
  
  for (const song of allCurated) {
    if (!song || !song.id) continue;
    if (
      song.title.toLowerCase().includes(lowerQ) ||
      song.artist.toLowerCase().includes(lowerQ) ||
      song.album.toLowerCase().includes(lowerQ)
    ) {
      uniqueMap.set(song.id, song);
    }
  }

  const matches = Array.from(uniqueMap.values());
  if (matches.length > 0) {
    return matches;
  }

  // 4. 返回精选时光推荐
  return CURATED_TIME_SONGS.slice(0, 8);
}

/**
 * 全网免鉴权音频流地址与真彩封面极速解析 (智能免鉴权直链+双引擎秒级容灾，直接给 <audio> 注入真实可播 MP3 流)
 */
export async function fetchSongPlayUrl(
  id: string,
  title?: string,
  artist?: string,
  onEnrichSong?: (enriched: { url: string; cover?: string }) => void
): Promise<string> {
  if (!id && !title) return '';

  // 1. 若已经是直链或 Blob，直接返回
  if (id.startsWith('http://') || id.startsWith('https://') || id.startsWith('blob:')) {
    return id;
  }

  const cleanId = id.replace(/^(MUSIC_|curated_|ne_|netease_|kw_)/, '');

  // 2. 检查是否在精选曲库中有预置验证超清直链
  const foundCurated = CURATED_TIME_SONGS.find(s => s.id === cleanId || s.id === id || s.id === `ne_${cleanId}`);
  if (foundCurated && foundCurated.url) {
    return foundCurated.url;
  }

  // 3. 优先通过加速解析接口提取极速 CDN 真实 MP3 直链 (毫秒级返回真彩音频流)
  try {
    let endpoint = `/api/music/play-url?id=${encodeURIComponent(id)}`;
    if (title) endpoint += `&title=${encodeURIComponent(title)}`;
    if (artist) endpoint += `&artist=${encodeURIComponent(artist)}`;

    const fullUrl = buildApiUrl(endpoint);
    const res = await fetch(fullUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
        onEnrichSong?.({ url: data.url, cover: data.cover });
        return data.url;
      }
    }
  } catch (err) {
    console.warn('API music play-url failed, falling back to direct CDN:', err);
  }

  // 4. 网易云直接高保真直链 (千万级曲库直通，无 CORS 限制，原生支持 HTML5 Audio 播放)
  if (id.startsWith('ne_') || id.startsWith('netease_') || /^\d+$/.test(cleanId)) {
    return `https://music.163.com/song/media/outer/url?id=${cleanId}.mp3`;
  }

  // 5. 兜底精选回退
  const matchedCurated = CURATED_TIME_SONGS.find(s => 
    (title && s.title.includes(title)) || (artist && s.artist.includes(artist))
  );
  if (matchedCurated && matchedCurated.url) {
    return matchedCurated.url;
  }

  return '';
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
    cover: DEFAULT_FALLBACK_COVER,
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
