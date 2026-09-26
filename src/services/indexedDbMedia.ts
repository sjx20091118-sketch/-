/**
 * IndexedDB 原生二进制大媒体存储引擎 (ShinianMediaVault)
 * 解决移动端及桌面端百兆长视频（几百MB）Base64 膨胀导致 RAM 爆仓、白屏与闪退的问题。
 * 直接将原生 File / Blob 写入本地磁盘数据库，读取时使用轻量虚拟对象指针 (blob: URL)。
 */

const DB_NAME = 'ShinianMediaVault';
const DB_VERSION = 1;
const STORE_NAME = 'mediaBlobs';

interface MediaRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  updatedAt: number;
}

// 内存中的活跃 Object URL 映射表，避免频繁重复创建
const activeBlobUrls = new Map<string, string>();

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in current environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * 校验是否为本引擎托管的 IndexedDB 键
 */
export function isIndexedDbMedia(url?: string): boolean {
  return typeof url === 'string' && url.startsWith('idb://');
}

/**
 * 将原生 File 或 Blob 零拷贝存入 IndexedDB
 * @param key 标识键（如 video_t-102），若未提供则自动生成
 * @returns 虚拟存储 URI，形如 "idb://video_1680000000"
 */
export async function saveMediaBlob(blob: Blob | File, customKey?: string): Promise<string> {
  const id = customKey || `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const db = await getDb();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: MediaRecord = {
        id,
        blob,
        mimeType: blob.type || 'video/mp4',
        size: blob.size,
        updatedAt: Date.now()
      };

      const putReq = store.put(record);

      putReq.onsuccess = () => {
        // 预生成一个活跃 Object URL
        const prevUrl = activeBlobUrls.get(id);
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        const newUrl = URL.createObjectURL(blob);
        activeBlobUrls.set(id, newUrl);

        resolve(`idb://${id}`);
      };

      putReq.onerror = () => reject(putReq.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 获取原始 Blob 对象
 */
export async function getMediaBlob(mediaUri: string): Promise<Blob | null> {
  if (!isIndexedDbMedia(mediaUri)) return null;
  const id = mediaUri.replace('idb://', '');
  const db = await getDb();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result as MediaRecord | undefined;
        resolve(record ? record.blob : null);
      };

      getReq.onerror = () => reject(getReq.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 将 "idb://..." 键异步解析为可在 <video> 或 <img> 中流畅播放的 URL
 * 命中缓存则 0ms 瞬间返回
 */
export async function resolveMediaUrl(uri?: string): Promise<string> {
  if (!uri) return '';
  if (!isIndexedDbMedia(uri)) return uri; // 普通 HTTP/HTTPS 或 Base64 直通

  const id = uri.replace('idb://', '');

  // 1. 优先命中内存缓存
  if (activeBlobUrls.has(id)) {
    return activeBlobUrls.get(id)!;
  }

  // 2. 从 IndexedDB 二进制流化加载
  const blob = await getMediaBlob(uri);
  if (!blob) return '';

  const objUrl = URL.createObjectURL(blob);
  activeBlobUrls.set(id, objUrl);
  return objUrl;
}

/**
 * 删除指定的二进制媒体，释放存储
 */
export async function deleteMediaBlob(mediaUri: string): Promise<void> {
  if (!isIndexedDbMedia(mediaUri)) return;
  const id = mediaUri.replace('idb://', '');

  const prevUrl = activeBlobUrls.get(id);
  if (prevUrl) {
    URL.revokeObjectURL(prevUrl);
    activeBlobUrls.delete(id);
  }

  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
  } catch (e) {
    console.warn('Failed to delete media blob', e);
  }
}

/**
 * 清除所有内存 Object URL 引用（避免内存泄漏）
 */
export function cleanupActiveBlobUrls(): void {
  activeBlobUrls.forEach((url) => URL.revokeObjectURL(url));
  activeBlobUrls.clear();
}
