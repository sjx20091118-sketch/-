/**
 * 通用媒体（图片与视频）处理工具库
 * 提供视频智能避黑采鲜分帧（自动跳过片头黑屏取鲜活画面）、轻量级存储优化及格式判断
 */

export interface ProcessedMedia {
  url: string;            // base64 数据或媒体地址
  mediaType: 'image' | 'video';
  poster?: string;        // 针对视频提取的高清智能封面（base64）
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
  if (url.startsWith('data:image/')) return false;
  if (url.startsWith('idb://video_') || url.startsWith('idb://video')) return true;
  if (url.startsWith('idb://img_') || url.startsWith('idb://image_') || url.startsWith('idb://media_')) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') || clean.endsWith('.m4v');
}

/**
 * 评估 Canvas 图像像素的画质得分（亮度 + 色彩丰富度与局部对比度，自动排除纯黑/纯白/黑过渡帧）
 */
function evaluateFrameQuality(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  try {
    const sampleW = Math.min(width, 120);
    const sampleH = Math.min(height, 80);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;
    const totalPixels = sampleW * sampleH;
    if (totalPixels <= 0) return 0;

    let totalLuma = 0;
    let rSum = 0, gSum = 0, bSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuma += luma;
      rSum += r;
      gSum += g;
      bSum += b;
    }

    const avgLuma = totalLuma / totalPixels;
    const avgR = rSum / totalPixels;
    const avgG = gSum / totalPixels;
    const avgB = bSum / totalPixels;

    // 如果平均亮度过暗 (< 25，黑屏/过渡) 或过亮 (> 235，白屏爆光)，严重惩罚
    if (avgLuma < 25 || avgLuma > 235) {
      return 1;
    }

    // 计算局部对比度与色彩饱和丰富度
    let varianceSum = 0;
    let colorDiversity = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      varianceSum += Math.abs(luma - avgLuma);
      colorDiversity += Math.abs(r - avgR) + Math.abs(g - avgG) + Math.abs(b - avgB);
    }

    const contrastScore = varianceSum / totalPixels;
    const colorScore = colorDiversity / (totalPixels * 3);

    // 适中亮度 + 高对比度 + 高色彩丰富度
    const lumaPenalty = Math.abs(avgLuma - 110) * 0.1;
    const score = contrastScore * 2.0 + colorScore * 2.5 - lumaPenalty;
    return Math.max(5, score);
  } catch {
    return 10;
  }
}

/**
 * 辅助函数：从当前已解码的 video 标签中抓取高保真画面
 */
function captureFrameFromVideo(video: HTMLVideoElement): { poster: string; score: number } | null {
  try {
    let w = video.videoWidth || 640;
    let h = video.videoHeight || 360;
    if (w <= 0 || h <= 0) return null;

    const maxDim = 840;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, w, h);
    const score = evaluateFrameQuality(ctx, w, h);
    const poster = canvas.toDataURL('image/jpeg', 0.86);
    return { poster, score };
  } catch (err) {
    console.warn('捕获视频帧异常', err);
    return null;
  }
}

/**
 * 从上传的视频文件进行多点智能寻优抽帧，自动跳过开头黑屏截取最鲜活清晰的高清封面
 * 采用双保险机制：首帧保底 + 黄金点色彩评分寻优
 */
export async function extractVideoPoster(file: File | Blob): Promise<{ poster: string; duration: number }> {
  return new Promise((resolve) => {
    let isSettled = false;
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    // 注意：严禁在本地 Blob URL 上加 crossOrigin = 'anonymous'，否则会导致浏览器 Canvas 判定为 Tainted 并拦截 toDataURL！
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

    let bestScore = -1;
    let bestPoster = '';
    let candidateTimes: number[] = [];
    let currentCandidateIndex = 0;

    // 2.8秒超时保护（即使异常也返回目前抓取到的最佳帧）
    const safetyTimer = setTimeout(() => {
      if (isSettled) return;
      cleanup();
      resolve({
        poster: bestPoster,
        duration: isFinite(video.duration) && video.duration > 0 ? video.duration : 0
      });
    }, 2800);

    const finishWithBest = () => {
      clearTimeout(safetyTimer);
      cleanup();
      resolve({
        poster: bestPoster,
        duration: isFinite(video.duration) && video.duration > 0 ? video.duration : 0
      });
    };

    const tryNextCandidate = () => {
      if (isSettled) return;
      if (currentCandidateIndex >= candidateTimes.length) {
        finishWithBest();
        return;
      }

      const targetTime = candidateTimes[currentCandidateIndex];
      currentCandidateIndex++;

      try {
        if (isFinite(targetTime) && targetTime >= 0) {
          video.currentTime = targetTime;
        } else {
          tryNextCandidate();
        }
      } catch {
        tryNextCandidate();
      }
    };

    // 第一重保障：当视频首个解码帧就绪时，立即抓取一张可用底图保底
    video.onloadeddata = () => {
      if (isSettled) return;
      const initialFrame = captureFrameFromVideo(video);
      if (initialFrame && initialFrame.poster) {
        bestPoster = initialFrame.poster;
        bestScore = initialFrame.score;
      }
    };

    video.onloadedmetadata = () => {
      if (isSettled) return;
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 3;

      // 生成避黑采样时间点（跳过 0s 的黑屏，优选 0.8s, 1.5s, 25% 黄金节点）
      if (dur > 6) {
        candidateTimes = [0.8, 1.8, dur * 0.25, dur * 0.45];
      } else if (dur > 2) {
        candidateTimes = [0.6, dur * 0.35, dur * 0.65];
      } else {
        candidateTimes = [Math.max(0.1, dur * 0.3)];
      }

      tryNextCandidate();
    };

    video.onseeked = () => {
      if (isSettled) return;
      const frame = captureFrameFromVideo(video);
      if (frame && frame.poster) {
        if (frame.score > bestScore || !bestPoster) {
          bestScore = frame.score;
          bestPoster = frame.poster;
        }

        // 若当前候选帧质量达到优秀阈值（非黑屏、高反差与色彩），直接锁定返回
        if (frame.score >= 38) {
          finishWithBest();
          return;
        }
      }

      tryNextCandidate();
    };

    video.onerror = () => {
      finishWithBest();
    };

    // 触发视频加载流程
    try {
      video.load();
    } catch (e) {
      console.warn('video.load error', e);
    }
  });
}

/**
 * 从已解析的视频 URL (无论是 Blob URL 还是直链) 智能抽取高清避黑视频封面
 */
export async function extractVideoPosterFromUrl(videoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    let isSettled = false;
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    const cleanup = () => {
      if (!isSettled) {
        isSettled = true;
        try {
          video.pause();
          video.src = '';
          video.load();
        } catch (e) {}
      }
    };

    let bestScore = -1;
    let bestPoster = '';
    let candidateTimes: number[] = [];
    let currentCandidateIndex = 0;

    const safetyTimer = setTimeout(() => {
      if (isSettled) return;
      cleanup();
      resolve(bestPoster);
    }, 2800);

    const finishWithBest = () => {
      clearTimeout(safetyTimer);
      cleanup();
      resolve(bestPoster);
    };

    const tryNextCandidate = () => {
      if (isSettled) return;
      if (currentCandidateIndex >= candidateTimes.length) {
        finishWithBest();
        return;
      }

      const targetTime = candidateTimes[currentCandidateIndex];
      currentCandidateIndex++;

      try {
        if (isFinite(targetTime) && targetTime >= 0) {
          video.currentTime = targetTime;
        } else {
          tryNextCandidate();
        }
      } catch {
        tryNextCandidate();
      }
    };

    video.onloadeddata = () => {
      if (isSettled) return;
      const initialFrame = captureFrameFromVideo(video);
      if (initialFrame && initialFrame.poster) {
        bestPoster = initialFrame.poster;
        bestScore = initialFrame.score;
      }
    };

    video.onloadedmetadata = () => {
      if (isSettled) return;
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 3;

      if (dur > 6) {
        candidateTimes = [0.8, 1.8, dur * 0.25, dur * 0.45];
      } else if (dur > 2) {
        candidateTimes = [0.6, dur * 0.35, dur * 0.65];
      } else {
        candidateTimes = [Math.max(0.1, dur * 0.3)];
      }

      tryNextCandidate();
    };

    video.onseeked = () => {
      if (isSettled) return;
      const frame = captureFrameFromVideo(video);
      if (frame && frame.poster) {
        if (frame.score > bestScore || !bestPoster) {
          bestScore = frame.score;
          bestPoster = frame.poster;
        }

        if (frame.score >= 38) {
          finishWithBest();
          return;
        }
      }

      tryNextCandidate();
    };

    video.onerror = () => {
      finishWithBest();
    };

    try {
      video.load();
    } catch {
      finishWithBest();
    }
  });
}

/**
 * 格式化秒数为 MM:SS 视频时长
 */
export function formatVideoDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
