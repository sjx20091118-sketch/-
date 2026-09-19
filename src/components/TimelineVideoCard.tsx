import React, { useRef, useState, useEffect } from 'react';
import { VintageVideoPlayer } from './VintageVideoPlayer';

interface TimelineVideoCardProps {
  videoUrl: string;
  poster?: string;
  title: string;
  date: string;
  className?: string;
}

export const TimelineVideoCard: React.FC<TimelineVideoCardProps> = ({
  videoUrl,
  poster,
  title,
  date,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            // 滑到该拾光节点，并且停留 1.2 秒以上自动静音播放
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
              setShouldAutoPlay(true);
            }, 1200);
          } else {
            // 滑出视口，立即暂停
            if (timerRef.current) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
            }
            setShouldAutoPlay(false);
          }
        });
      },
      {
        threshold: [0, 0.55, 0.8, 1.0],
        rootMargin: '0px 0px -10% 0px' // 确保在手机屏幕中间偏上更舒适的视口范围
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden rounded-2xl ${className}`}>
      <VintageVideoPlayer
        src={videoUrl}
        poster={poster}
        autoPlayMuted={shouldAutoPlay}
        title={title}
        date={date}
        className="w-full aspect-video min-h-[190px] max-h-[300px]"
      />
    </div>
  );
};
