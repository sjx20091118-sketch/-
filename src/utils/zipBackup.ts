import JSZip from 'jszip';
import { AppData } from '../types';
import { getMediaBlob, isIndexedDbMedia } from '../services/indexedDbMedia';

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
 * Full ZIP Archive Exporter (Memory Safe & Fast STORE Mode)
 * Bundles all JSON text data + all uploaded images and videos into a .zip file without crashing memory
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

  // Timeline Media (Data URLs & IndexedDB binary blobs)
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
        imageFolder.file(`avatar_${person.name || person.id || idx}.${parsed.ext}`, parsed.data);
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

  // Artifacts Media (Support multi-images and multi-videos)
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
            console.warn('Failed to bundle artifact video item:', vidItem.url, e);
          }
        }
      }
    }
  }

  onProgress?.(75, '正在打包时光信笺音画附件...');

  // Letters Media
  if (data.letters) {
    for (let idx = 0; idx < data.letters.length; idx++) {
      const letter = data.letters[idx];
      if (letter.mediaUrl && isIndexedDbMedia(letter.mediaUrl) && videoFolder) {
        try {
          const blob = await getMediaBlob(letter.mediaUrl);
          if (blob) {
            const ext = blob.type.includes('webm') ? 'webm' : (blob.type.includes('mov') ? 'mov' : 'mp4');
            videoFolder.file(`idb_${letter.mediaUrl.replace('idb://', '')}.${ext}`, blob);
          }
        } catch (e) {
          console.warn('Failed to bundle letter media:', letter.mediaUrl, e);
        }
      }
    }
  }

  onProgress?.(85, '正在极速生成无损归档文件...');

  // Generate ZIP Blob using STORE (zero-compression, super fast, prevents out of memory)
  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'STORE'
    },
    (metadata) => {
      onProgress?.(85 + Math.floor(metadata.percent * 0.14), `打包进度 ${Math.floor(metadata.percent)}%...`);
    }
  );

  onProgress?.(100, '打包完成，准备下载...');

  const filename = `拾年_全量记忆档案备份_${new Date().toISOString().slice(0, 10)}.zip`;

  // 1. 安卓原生 APK 桥接优先通道：直接通过 MediaStore.Downloads 写入手机公共下载目录与压缩包分类
  const win = typeof window !== 'undefined' ? (window as any) : {};
  const nativeBridge = win.AndroidBridge || win.Android || win.JSBridge;

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

  // 2. Web 浏览器标准下载通道
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
 * Universal Archive Parser
 * Supports both .zip and .json backup files
 */
export async function parseBackupArchive(file: File): Promise<{
  data: AppData;
  customGroups?: string[];
  filename: string;
}> {
  const isZip = file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip') || file.type.includes('compressed');

  if (isZip) {
    const zip = await JSZip.loadAsync(file);

    // Try finding data.json
    let jsonFile = zip.file('data.json');
    if (!jsonFile) {
      // Find any .json in the root of zip
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

    return validateAndNormalizeData(parsed, file.name);
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
