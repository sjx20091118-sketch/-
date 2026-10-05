import JSZip from 'jszip';
import { AppData } from '../types';
import { getMediaBlob, isIndexedDbMedia, saveMediaBlob } from '../services/indexedDbMedia';

/**
 * Helper to extract binary payload from Base64 Data URL
 */
function dataUrlToBinary(dataUrl: string): { mime: string; ext: string; data: Uint8Array } | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    const mime = match[1];
    const base64 = match[2];
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    let ext = 'bin';
    if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';
    else if (mime.includes('mp4')) ext = 'mp4';
    else if (mime.includes('webm')) ext = 'webm';
    else if (mime.includes('mov')) ext = 'mov';
    else if (mime.includes('ogg')) ext = 'ogg';

    return { mime, ext, data: bytes };
  } catch (e) {
    console.warn('Failed to parse data URL to binary:', e);
    return null;
  }
}

/**
 * Trigger file download via Web Browser or Native Android Bridge
 */
function triggerFileDownload(blob: Blob, filename: string): void {
  const nativeBridge = (window as any).AndroidAppBridge || (window as any).ShinianNativeBridge;

  if (nativeBridge && (typeof nativeBridge.saveZipToDownloads === 'function' || typeof nativeBridge.saveFileToDownloads === 'function' || typeof nativeBridge.saveZip === 'function')) {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (typeof nativeBridge.saveZipToDownloads === 'function') {
          nativeBridge.saveZipToDownloads(base64, filename);
        } else if (typeof nativeBridge.saveFileToDownloads === 'function') {
          nativeBridge.saveFileToDownloads(base64, filename, 'application/zip');
        } else if (typeof nativeBridge.saveZip === 'function') {
          nativeBridge.saveZip(base64, filename);
        }
      };
      reader.readAsDataURL(blob);
      return;
    } catch (bridgeErr) {
      console.warn('原生 ZIP 下载桥接异常，切换至 Web 下载通道', bridgeErr);
    }
  }

  // Web 浏览器标准下载通道
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Full ZIP Archive Exporter (Memory Safe & Fast STORE Mode)
 * Bundles all JSON text data + all uploaded images and videos into a .zip file
 */
export async function exportZipArchive(
  data: AppData,
  customGroups?: string[],
  onProgress?: (percent: number, stepText: string) => void
): Promise<void> {
  const zip = new JSZip();

  onProgress?.(5, '正在整理档案数据索引...');

  // 1. Data JSON
  const backupPayload = {
    version: '6.0',
    exportTime: new Date().toISOString(),
    appName: '拾年 (Shinian Memoir)',
    customGroups: customGroups || [],
    timeline: data.timeline || [],
    people: data.people || [],
    stories: data.stories || [],
    artifacts: data.artifacts || [],
    letters: data.letters || []
  };

  zip.file('data.json', JSON.stringify(backupPayload, null, 2));

  // 2. Readme
  const readmeText = `# 《拾年》全量记忆档案备份包
导出时间: ${new Date().toLocaleString()}
记录统计:
- 拾光节点: ${data.timeline.length} 项
- 拾人知交: ${data.people.length} 位
- 拾忆篇章: ${data.stories.length} 篇
- 拾物旧藏: ${data.artifacts.length} 件
- 寄年信笺: ${data.letters?.length || 0} 封

本压缩包内含完整的文字记录 (data.json) 与全部上传的本地多媒体文件。
可在《拾年》任意客户端「离线档案备份」中直接选取此 .zip 文件一键还原！`;

  zip.file('README.txt', readmeText);

  // 3. Extract Media to media/ folder in zip
  const mediaFolder = zip.folder('media');
  const imageFolder = mediaFolder?.folder('images');
  const videoFolder = mediaFolder?.folder('videos');

  onProgress?.(15, '正在打包时光轴影像...');

  // Timeline Media
  for (let idx = 0; idx < data.timeline.length; idx++) {
    const item = data.timeline[idx];
    if (item.image && item.image.startsWith('data:')) {
      const parsed = dataUrlToBinary(item.image);
      if (parsed && imageFolder) {
        imageFolder.file(`timeline_${item.id || idx}.${parsed.ext}`, parsed.data);
      }
    }
    if (item.video) {
      if (item.video.startsWith('data:')) {
        const parsed = dataUrlToBinary(item.video);
        if (parsed && videoFolder) {
          videoFolder.file(`timeline_video_${item.id || idx}.${parsed.ext}`, parsed.data);
        }
      } else if (isIndexedDbMedia(item.video) && videoFolder) {
        try {
          const blob = await getMediaBlob(item.video);
          if (blob) {
            const ext = blob.type.includes('webm') ? 'webm' : (blob.type.includes('mov') ? 'mov' : 'mp4');
            videoFolder.file(`idb_${item.video.replace('idb://', '')}.${ext}`, blob);
          }
        } catch (e) {
          console.warn('Failed to bundle timeline video:', item.video, e);
        }
      }
    }
  }

  onProgress?.(35, '正在打包人物画卷与相册...');

  // People Avatars & Photos
  for (let idx = 0; idx < data.people.length; idx++) {
    const person = data.people[idx];
    if (person.avatar && person.avatar.startsWith('data:')) {
      const parsed = dataUrlToBinary(person.avatar);
      if (parsed && imageFolder) {
        imageFolder.file(`avatar_${person.id || person.name || idx}.${parsed.ext}`, parsed.data);
      }
    }
    if (person.photos && Array.isArray(person.photos)) {
      for (let pIdx = 0; pIdx < person.photos.length; pIdx++) {
        const p = person.photos[pIdx];
        if (typeof p === 'string') {
          if (p.startsWith('data:')) {
            const parsed = dataUrlToBinary(p);
            if (parsed && imageFolder) {
              imageFolder.file(`person_${person.id || idx}_photo_${pIdx}.${parsed.ext}`, parsed.data);
            }
          } else if (isIndexedDbMedia(p) && videoFolder) {
            try {
              const blob = await getMediaBlob(p);
              if (blob) {
                const ext = blob.type.includes('webm') ? 'webm' : (blob.type.includes('mov') ? 'mov' : 'mp4');
                videoFolder.file(`idb_${p.replace('idb://', '')}.${ext}`, blob);
              }
            } catch (e) {
              console.warn('Failed to bundle person media:', p, e);
            }
          }
        }
      }
    }
  }

  onProgress?.(55, '正在打包拾物阁旧藏画卷与高清短片...');

  // Artifacts Media
  for (let idx = 0; idx < data.artifacts.length; idx++) {
    const art = data.artifacts[idx];
    
    // Main image
    if (art.image && art.image.startsWith('data:')) {
      const parsed = dataUrlToBinary(art.image);
      if (parsed && imageFolder) {
        imageFolder.file(`artifact_${art.id || idx}.${parsed.ext}`, parsed.data);
      }
    }

    // Multiple Images
    if (art.images && Array.isArray(art.images)) {
      art.images.forEach((img, imgIdx) => {
        if (img && img.startsWith('data:')) {
          const parsed = dataUrlToBinary(img);
          if (parsed && imageFolder) {
            imageFolder.file(`artifact_${art.id || idx}_img_${imgIdx}.${parsed.ext}`, parsed.data);
          }
        }
      });
    }

    // Main Video
    if (art.video && isIndexedDbMedia(art.video) && videoFolder) {
      try {
        const blob = await getMediaBlob(art.video);
        if (blob) {
          const ext = blob.type.includes('webm') ? 'webm' : (blob.type.includes('mov') ? 'mov' : 'mp4');
          videoFolder.file(`idb_${art.video.replace('idb://', '')}.${ext}`, blob);
        }
      } catch (e) {
        console.warn('Failed to bundle artifact video:', art.video, e);
      }
    }

    // Multiple Videos
    if (art.videos && Array.isArray(art.videos)) {
      for (let vIdx = 0; vIdx < art.videos.length; vIdx++) {
        const vidItem = art.videos[vIdx];
        if (vidItem.url && isIndexedDbMedia(vidItem.url) && videoFolder) {
          try {
            const blob = await getMediaBlob(vidItem.url);
            if (blob) {
              const ext = blob.type.includes('webm') ? 'webm' : (blob.type.includes('mov') ? 'mov' : 'mp4');
              videoFolder.file(`idb_${vidItem.url.replace('idb://', '')}.${ext}`, blob);
            }
          } catch (e) {
            console.warn('Failed to bundle artifact sub-video:', vidItem.url, e);
          }
        }
      }
    }
  }

  onProgress?.(75, '正在压缩生成离线档案 ZIP 包...');

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      onProgress?.(75 + Math.round(metadata.percent * 0.2), `正在压缩档案 [${Math.round(metadata.percent)}%]...`);
    }
  );

  onProgress?.(98, '正在保存至本地文件系统...');

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `拾年档案备份_${dateStr}.zip`;
  triggerFileDownload(blob, filename);

  onProgress?.(100, '离线档案 ZIP 包导出完成');
}

/**
 * Universal Archive Parser
 * Supports both .zip and .json backup files and fully rehydrates media/ images and videos
 */
export async function parseBackupArchive(file: File): Promise<{
  data: AppData;
  customGroups?: string[];
  filename: string;
}> {
  const isZip = file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip') || file.type.includes('compressed');

  if (isZip) {
    const zip = await JSZip.loadAsync(file);

    // 1. Try finding data.json
    let jsonFile = zip.file('data.json');
    if (!jsonFile) {
      const jsonFiles = zip.file(/\.json$/i);
      if (jsonFiles.length > 0) {
        jsonFile = jsonFiles[0];
      }
    }

    if (!jsonFile) {
      throw new Error('未在 ZIP 压缩包中找到合法的 data.json 档案数据文件');
    }

    const jsonText = await jsonFile.async('text');
    const parsed = JSON.parse(jsonText);
    const result = validateAndNormalizeData(parsed, file.name);

    // 2. Rehydrate media images & videos from media/ folder
    const mediaMap = new Map<string, string>();

    const imageFiles = zip.file(/media\/images\/.+/i);
    for (const imgFile of imageFiles) {
      try {
        const base64 = await imgFile.async('base64');
        const filename = imgFile.name.split('/').pop() || '';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');
        const dataUrl = `data:${mime};base64,${base64}`;
        mediaMap.set(filename, dataUrl);
        // Also map base key without extension
        const baseKey = filename.replace(/\.[^.]+$/, '');
        mediaMap.set(baseKey, dataUrl);
      } catch (e) {
        console.warn('Failed to unpack image from zip:', imgFile.name, e);
      }
    }

    // Process videos and restore to IndexedDB
    const videoFiles = zip.file(/media\/videos\/.+/i);
    for (const vidFile of videoFiles) {
      try {
        const blob = await vidFile.async('blob');
        const filename = vidFile.name.split('/').pop() || '';
        if (filename.startsWith('idb_')) {
          const rawId = filename.replace(/^idb_/, '').replace(/\.[^.]+$/, '');
          const idbUri = await saveMediaBlob(blob, rawId);
          mediaMap.set(filename, idbUri);
          mediaMap.set(rawId, idbUri);
        }
      } catch (e) {
        console.warn('Failed to restore video from zip to indexedDB:', vidFile.name, e);
      }
    }

    // 3. Re-inject media into timeline
    result.data.timeline.forEach((t, idx) => {
      const key = `timeline_${t.id || idx}`;
      if (mediaMap.has(key)) {
        t.image = mediaMap.get(key)!;
      }
      const vidKey = `timeline_video_${t.id || idx}`;
      if (mediaMap.has(vidKey)) {
        t.video = mediaMap.get(vidKey)!;
      }
    });

    // 4. Re-inject media into people
    result.data.people.forEach((p, idx) => {
      const keyId = `avatar_${p.id || idx}`;
      const keyName = `avatar_${p.name || idx}`;
      if (mediaMap.has(keyId)) {
        p.avatar = mediaMap.get(keyId)!;
      } else if (mediaMap.has(keyName)) {
        p.avatar = mediaMap.get(keyName)!;
      }

      if (Array.isArray(p.photos)) {
        p.photos = p.photos.map((photo, pIdx) => {
          const photoKey = `person_${p.id || idx}_photo_${pIdx}`;
          if (mediaMap.has(photoKey)) {
            return mediaMap.get(photoKey)!;
          }
          return photo;
        });
      }
    });

    // 5. Re-inject media into artifacts
    result.data.artifacts.forEach((a, idx) => {
      const key = `artifact_${a.id || idx}`;
      if (mediaMap.has(key)) {
        a.image = mediaMap.get(key)!;
      }
      if (Array.isArray(a.images)) {
        a.images = a.images.map((img, imgIdx) => {
          const imgKey = `artifact_${a.id || idx}_img_${imgIdx}`;
          if (mediaMap.has(imgKey)) {
            return mediaMap.get(imgKey)!;
          }
          return img;
        });
      }
    });

    return result;
  } else {
    // Standard JSON text file
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          resolve(validateAndNormalizeData(parsed, file.name));
        } catch {
          reject(new Error('JSON 格式解析错误，请确认文件完整'));
        }
      };
      reader.onerror = () => reject(new Error('读取档案文件失败'));
      reader.readAsText(file);
    });
  }
}

function validateAndNormalizeData(parsed: any, filename: string): {
  data: AppData;
  customGroups?: string[];
  filename: string;
} {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('档案数据格式无效');
  }

  const normalized: AppData = {
    timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
    people: Array.isArray(parsed.people) ? parsed.people : [],
    stories: Array.isArray(parsed.stories) ? parsed.stories : [],
    artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
    letters: Array.isArray(parsed.letters) ? parsed.letters : []
  };

  const customGroups = Array.isArray(parsed.customGroups) ? parsed.customGroups : undefined;

  return {
    data: normalized,
    customGroups,
    filename
  };
}

/**
 * Full Master Data Backup ZIP Exporter (Includes all user anime avatars, activation codes, settings, smtp, notices, versions)
 */
export async function exportMasterBackupZip(masterData: any): Promise<void> {
  const zip = new JSZip();

  // 1. database.json
  zip.file('database.json', JSON.stringify(masterData, null, 2));

  // 2. Readme
  const readme = `# 《拾年》全站云端主库全量灾备包
导出时间: ${new Date().toLocaleString()}
应用版本: 1.2.6

本压缩包内含完整系统数据库 (database.json) 与全部注册用户的高清动漫头像 (avatars/)。
在《拾年》管理后台中直接选取此 .zip 文件即可一键秒级恢复全站数据与用户！`;
  zip.file('README.txt', readme);

  // 3. Avatars folder
  const avatarsFolder = zip.folder('avatars');
  const users = masterData?.data?.users || [];
  for (const user of users) {
    if (user.photoURL && user.photoURL.startsWith('data:')) {
      const parsed = dataUrlToBinary(user.photoURL);
      if (parsed && avatarsFolder) {
        const name = (user.account || user.uid).replace(/[^a-zA-Z0-9_-]/g, '_');
        avatarsFolder.file(`${name}.${parsed.ext}`, parsed.data);
      }
    }
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const filename = `shinian_master_backup_${new Date().toISOString().slice(0, 10)}.zip`;
  triggerFileDownload(blob, filename);
}

/**
 * Master Data Backup ZIP / JSON Parser
 */
export async function parseMasterBackupFile(file: File): Promise<any> {
  const isZip = file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip') || file.type.includes('compressed');

  if (isZip) {
    const zip = await JSZip.loadAsync(file);
    let jsonFile = zip.file('database.json') || zip.file('data.json');
    if (!jsonFile) {
      const jsonFiles = zip.file(/\.json$/i);
      if (jsonFiles.length > 0) jsonFile = jsonFiles[0];
    }

    if (!jsonFile) {
      throw new Error('未在 ZIP 压缩包中找到合法的 database.json 数据文件');
    }

    const jsonText = await jsonFile.async('text');
    const masterData = JSON.parse(jsonText);

    // Rehydrate avatars from avatars/ folder if present
    const avatarsFolder = zip.folder('avatars');
    if (avatarsFolder && masterData?.data?.users) {
      for (const user of masterData.data.users) {
        if (!user.photoURL) {
          const name = (user.account || user.uid).replace(/[^a-zA-Z0-9_-]/g, '_');
          const avatarFile = avatarsFolder.file(new RegExp(`^${name}\\.(png|jpg|jpeg|webp)$`, 'i'))[0];
          if (avatarFile) {
            const base64 = await avatarFile.async('base64');
            const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'png';
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : (ext === 'webp' ? 'image/webp' : 'image/png');
            user.photoURL = `data:${mime};base64,${base64}`;
          }
        }
      }
    }

    return masterData;
  } else {
    const text = await file.text();
    return JSON.parse(text);
  }
}
