import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { ArtifactVideoItem, HealingTheme } from '../types';
import { VintageVideoPlayer } from './VintageVideoPlayer';
import { MediaImage } from './MediaImage';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  poster?: string;
}

interface ArtifactGalleryViewerProps {
  image: string;
  images?: string[];
  video?: string;
  videoPoster?: string;
  videos?: ArtifactVideoItem[];
  name: string;
  theme?: HealingTheme;
}

export const ArtifactGalleryViewer: React.FC<ArtifactGalleryViewerProps> = ({
  image,
  images = [],
  video,
  videoPoster,
  videos = [],
  name,
  theme
}) => {
  // 1. 规范化视频列表（基于 URL 去重）
  const cleanVideos: ArtifactVideoItem[] = React.useMemo(() => {
    const rawList = (videos && videos.length > 0)
      ? videos
      : (video ? [{ id: 'vid-legacy', url: video, poster: videoPoster }] : []);

    const uniqueVideos: ArtifactVideoItem[] = [];
    const seenUrls = new Set<string>();

    for (const v of rawList) {
      if (!v || !v.url || typeof v.url !== 'string') continue;
      if (seenUrls.has(v.url)) continue;
      seenUrls.add(v.url);
      uniqueVideos.push({
        id: v.id || `vid-${uniqueVideos.length}`,
        url: v.url,
        poster: v.poster || videoPoster
      });
    }
    return uniqueVideos;
  }, [videos, video, videoPoster]);

  // 2. 规范化照片列表（核心修复：以 images 为绝对真理源，绝不把 item.image 重复推入已有 images 列表中！并使用 Set 深度去重）
  const cleanImages: string[] = React.useMemo(() => {
    const rawList = (images && images.length > 0)
      ? images
      : (image ? [image] : []);

    const videoPostersAndUrls = new Set<string>();
    if (videoPoster) videoPostersAndUrls.add(videoPoster);
    if (video) videoPostersAndUrls.add(video);
    cleanVideos.forEach(v => {
      if (v.poster) videoPostersAndUrls.add(v.poster);
      if (v.url) videoPostersAndUrls.add(v.url);
    });

    const uniqueImages: string[] = [];
    const seen = new Set<string>();

    for (const img of rawList) {
      if (!img || typeof img !== 'string') continue;
      // 排除视频的抽帧封面，杜绝把视频封面当成多余照片
      if (videoPostersAndUrls.has(img)) continue;
      // 强力去重，彻底根除一张照片变成两张相同照片
      if (seen.has(img)) continue;
      seen.add(img);
      uniqueImages.push(img);
    }
    return uniqueImages;
  }, [images, image, cleanVideos, video, videoPoster]);

  // 3. 构建统一媒体流
  const mediaList: MediaItem[] = React.useMemo(() => {
    const result: MediaItem[] = [];

    // 添加真实照片
    cleanImages.forEach((imgUrl, i) => {
      result.push({
        id: `img-${i}-${imgUrl.slice(-10)}`,
        type: 'image',
        url: imgUrl
      });
    });

    // 添加视频（携带智能抽帧封面）
    cleanVideos.forEach((vid, i) => {
      result.push({
        id: vid.id || `vid-${i}`,
        type: 'video',
        url: vid.url,
        poster: vid.poster || videoPoster
      });
    });

    return result;
  }, [cleanImages, cleanVideos, videoPoster]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const primaryColor = theme?.primary || 'var(--theme-primary, #5B7B6D)';

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (mediaList.length <= 1) return;
    sound.playPaperRustle();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (mediaList.length <= 1) return;
    sound.playPaperRustle();
    setCurrentIndex(prev => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

  if (mediaList.length === 0) {
    return (
      <div className="w-full h-52 rounded-3xl bg-[#FAF8F5] dark:bg-black/30 flex items-center justify-center text-xs text-[#6E7C75] dark:text-[#A7B4AD] font-serif border border-[#5B7B6D]/15">
        暂无纪念影像
      </div>
    );
  }

  // --- 场景 A: 单媒体物件（仅1张照片或1个视频） ---
  // 呈现 100% 原比例纯粹沉浸大展台：彻底消除黑色多余边框与黑条，全画幅自然贴合
  if (mediaList.length === 1) {
    const single = mediaList[0];

    return (
      <div className="w-full flex flex-col items-center justify-center select-none font-sans py-0.5">
        {single.type === 'video' ? (
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-sm">
            <VintageVideoPlayer
              src={single.url}
              poster={single.poster}
              title={name}
              className="w-full aspect-video min-h-[220px] max-h-[68vh]"
            />
          </div>
        ) : (
          <div className="w-full max-w-2xl flex items-center justify-center rounded-2xl overflow-hidden">
            <MediaImage
              src={single.url}
              alt=""
              className="max-w-full h-auto max-h-[68vh] object-contain rounded-2xl block shadow-xs"
            />
          </div>
        )}
      </div>
    );
  }

  // --- 场景 B: 多媒体物件（东方画卷平滑展台 + 微缩长卷画格索引） ---
  const currentMedia = mediaList[currentIndex] || mediaList[0];

  return (
    <div className="space-y-2.5 select-none font-sans">
      {/* 主视画幅展台区（居中大画幅原比例展画，温润底衬，杜绝突兀黑框） */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-xs bg-[#FAF8F5]/90 dark:bg-black/20 border border-[#5B7B6D]/15 dark:border-white/10 flex items-center justify-center">
        <div className="w-full aspect-video sm:aspect-16/10 min-h-[240px] max-h-[60vh] flex items-center justify-center relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMedia.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-full h-full flex items-center justify-center"
            >
              {currentMedia.type === 'video' ? (
                <div className="w-full h-full">
                  <VintageVideoPlayer
                    src={currentMedia.url}
                    poster={currentMedia.poster}
                    title={`${name} (${currentIndex + 1}/${mediaList.length})`}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                  <MediaImage
                    src={currentMedia.url}
                    alt=""
                    className="max-w-full max-h-[60vh] object-contain select-none rounded-xl"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* 左右液态玻璃翻页按键 */}
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 hover:bg-black/75 text-white/90 hover:text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
            title="上一张"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/40 hover:bg-black/75 text-white/90 hover:text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
            title="下一张"
          >
            <ChevronRight className="w-4.5 h-4.5" />
          </button>

          {/* 右下角东方长卷序位标牌 */}
          <div className="absolute bottom-2.5 right-3 z-20 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-[10px] font-mono tracking-wider border border-white/15 shadow-sm pointer-events-none">
            {currentIndex + 1} / {mediaList.length}
          </div>
        </div>
      </div>

      {/* 微缩长卷画格索引条（东方长卷式画格序列，轻触直达） */}
      <div className="p-1.5 rounded-2xl bg-[#FAF8F5] dark:bg-white/[0.04] border border-[#5B7B6D]/15 dark:border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 custom-scrollbar px-1">
          {mediaList.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (currentIndex !== idx) {
                  sound.playPaperRustle();
                  setCurrentIndex(idx);
                }
              }}
              className={`relative shrink-0 w-13 h-13 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-[#FAF8F5] dark:bg-white/5 ${
                currentIndex === idx
                  ? 'border-[#5B7B6D] dark:border-white scale-105 shadow-md ring-2 ring-[#5B7B6D]/25'
                  : 'border-transparent opacity-65 hover:opacity-100 hover:scale-102'
              }`}
            >
              <MediaImage
                src={item.type === 'video' ? (item.poster || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80') : item.url}
                alt=""
                className="w-full h-full object-cover"
              />
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 pointer-events-none">
                  <Play className="w-3.5 h-3.5 fill-white text-white drop-shadow-sm" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
