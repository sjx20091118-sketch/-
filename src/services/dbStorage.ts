/**
 * IndexedDB Native Storage Engine for 《拾年》
 * 彻底突破 LocalStorage 5MB 限制，提供 1GB+ 本地海量媒体与档案持久化能力，杜绝重启丢图
 */

const DB_NAME = 'ShinianAppDataDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const KEY_MAIN_DATA = 'main_app_data';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * 将完整的《拾年》数据（含全量高清原图与视频）安全保存至 IndexedDB
 */
export async function saveAppDataToIndexedDB(data: any): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(data, KEY_MAIN_DATA);

      putRequest.onsuccess = () => {
        resolve(true);
      };

      putRequest.onerror = () => {
        console.error('Error saving to IndexedDB:', putRequest.error);
        reject(putRequest.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (err) {
    console.warn('saveAppDataToIndexedDB failed, fallback to localStorage only:', err);
    return false;
  }
}

/**
 * 从 IndexedDB 中读取并恢复完整的《拾年》高清数据
 */
export async function loadAppDataFromIndexedDB(): Promise<any | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(KEY_MAIN_DATA);

      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };

      getRequest.onerror = () => {
        console.error('Error loading from IndexedDB:', getRequest.error);
        reject(getRequest.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (err) {
    console.warn('loadAppDataFromIndexedDB failed:', err);
    return null;
  }
}
