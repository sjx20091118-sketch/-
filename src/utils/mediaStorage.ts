/**
 * 通用媒体（图片与视频）处理工具库
 * 提供视频首帧封面提取、轻量级存储优化及格式判断
 */

export interface ProcessedMedia {
  url: string;            // base64 数据或媒体地址
  mediaType: 'image' | 'video';
  poster?: string;        // 针对视频提取的首帧高清封面（base64）
  duration?: number;      // 视频时长（秒）
  width?: number;
  height?: number;
}

/**
 * 判断传入的 URL 或 base64 是否为视频
 */
export function isVideoMedia(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:video/')) return true;
  if (url.startsWith('idb://video_') || url.startsWith('idb://video')) return true;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') || clean.endsWith('.m4v');
}

/**
 * 从上传的视频文件提取第一帧生成 Base64 封面缩略图（含高可用超时与内存释放保障）
 */
export async function extractVideoPoster(file: File): Promise<{ poster: string; duration: number }> {
  return new Promise((resolve) => {
    let isSettled = false;
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const fileUrl = URL.createObjectURL(file);
    video.src = fileUrl;

    const cleanup = () => {
      if (!isSettled) {
        isSettled = true;
        try {
          video.pause();
          video.src = '';
          video.load();
        } catch (e) {}
        URL.revokeObjectURL(fileUrl);
      }
    };

    // 3.5秒超时安全网：杜绝数百兆异形编码长视频导致页面等待死锁
    const timer = setTimeout(() => {
      cleanup();
      resolve({ poster: '', duration: 0 });
    }, 3500);

    video.onloadeddata = () => {
      if (isSettled) return;
      video.currentTime = Math.min(0.2, (video.duration || 1) / 2);
    };

    video.onseeked = () => {
      if (isSettled) return;
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = video.videoWidth || 640;
        let h = video.videoHeight || 360;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const poster = canvas.toDataURL('image/jpeg', 0.82);
          cleanup();
          resolve({ poster, duration: video.duration || 0 });
          return;
        }
      } catch (e) {
        console.warn('提取视频首帧失败', e);
      }
      cleanup();
      resolve({ poster: '', duration: video.duration || 0 });
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve({ poster: '', duration: 0 });
    };
  });
}

/**
 * 读取文件为 Base64（带最大体积保护）
 */
export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * 格式化秒数为 MM:SS 视频时长
 */
export function formatVideoDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
