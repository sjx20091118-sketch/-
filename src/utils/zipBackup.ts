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
    else if (mime.includes('ogg')) ext = 'ogg';

    return { mime, ext, data: bytes };
  } catch (e) {
    console.warn('Failed to parse data URL to binary:', e);
    return null;
  }
}

/**
 * Full ZIP Archive Exporter
 * Bundles all JSON text data + all uploaded images and videos into a .zip file
 */
export async function exportZipArchive(data: AppData, customGroups?: string[]): Promise<void> {
  const zip = new JSZip();

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
- 寄年信笺: ${data.letters.length} 封

本压缩包内含完整的文字记录 (data.json) 与全部上传的本地多媒体文件。
可在《拾年》任意客户端「离线档案备份」中直接选取此 .zip 文件一键还原！`;

  zip.file('README.txt', readmeText);

  // 3. Extract Media to media/ folder in zip
  const mediaFolder = zip.folder('media');
  const imageFolder = mediaFolder?.folder('images');
  const videoFolder = mediaFolder?.folder('videos');

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
        const blob = await getMediaBlob(item.video);
        if (blob) {
          const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
          videoFolder.file(`idb_${item.video.replace('idb://', '')}.${ext}`, await blob.arrayBuffer());
        }
      }
    }
  }

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
        if (isIndexedDbMedia(p) && videoFolder) {
          const blob = await getMediaBlob(p);
          if (blob) {
            const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
            videoFolder.file(`idb_${p.replace('idb://', '')}.${ext}`, await blob.arrayBuffer());
          }
        }
      }
    }
  }

  // Artifacts Media
  data.artifacts.forEach((art, idx) => {
    if (art.image && art.image.startsWith('data:')) {
      const parsed = dataUrlToBinary(art.image);
      if (parsed && imageFolder) {
        imageFolder.file(`artifact_${art.id || idx}.${parsed.ext}`, parsed.data);
      }
    }
  });

  // Letters Media (支持私信信笺音画附件)
  if (data.letters) {
    for (let idx = 0; idx < data.letters.length; idx++) {
      const letter = data.letters[idx];
      if (letter.mediaUrl && isIndexedDbMedia(letter.mediaUrl) && videoFolder) {
        const blob = await getMediaBlob(letter.mediaUrl);
        if (blob) {
          const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
          videoFolder.file(`idb_${letter.mediaUrl.replace('idb://', '')}.${ext}`, await blob.arrayBuffer());
        }
      }
    }
  }

  // Generate ZIP Blob
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // Download Trigger
  const filename = `拾年_全量记忆档案备份_${new Date().toISOString().slice(0, 10)}.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
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
        } catch (err) {
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
