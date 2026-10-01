import React, { useRef, useState, useCallback } from 'react';
import { formatVideoDuration } from '../utils/mediaStorage';
import { sound } from '../utils/soundEngine';

interface WaterInkVideoScrubberProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
  themeColor?: string;
}

export const WaterInkVideoScrubber: React.FC<WaterInkVideoScrubberProps> = ({
  currentTime,
  duration,
  onSeek,
  className = '',
  themeColor = '#FFFFFF'
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const calculateTimeFromX = useCallback((clientX: number): number => {
    if (!barRef.current || duration <= 0) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pos * duration;
  }, [duration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    barRef.current?.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const time = calculateTimeFromX(e.clientX);
    setDragTime(time);
    onSeek(time);
    sound.playWaterDrop(780);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barRef.current || duration <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const time = calculateTimeFromX(e.clientX);
    const relativeX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setHoverTime(time);
    setHoverX(relativeX);

    if (isDragging) {
      e.stopPropagation();
      setDragTime(time);
      onSeek(time);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.stopPropagation();
      barRef.current?.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      sound.playWaterDrop(960);
    }
  };

  const displayTime = isDragging ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <div
      className={`relative select-none ${className}`}
      onPointerLeave={() => {
        if (!isDragging) setHoverTime(null);
      }}
    >
      {/* Draggable scrub track area */}
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-6 flex items-center cursor-pointer group py-1.5 touch-none"
      >
        {/* Ambient background track */}
        <div className="w-full h-1.5 group-hover:h-2 rounded-full bg-white/20 dark:bg-white/15 backdrop-blur-xs transition-all overflow-hidden relative">
          {/* Active progress with white water-ink glow */}
          <div
            className="h-full rounded-full transition-all duration-75 relative"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.7)'
            }}
          />
        </div>

        {/* Hover / Dragging Thumb (Pristine White) */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 shadow-lg transition-transform ${
            isDragging ? 'scale-125 ring-2 ring-white/50' : 'group-hover:scale-110'
          }`}
          style={{
            left: `${progressPercent}%`,
            borderColor: '#FFFFFF'
          }}
        >
          {/* Pulsing water drop aura when dragging */}
          {isDragging && (
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-75"
              style={{ backgroundColor: '#FFFFFF' }}
            />
          )}
        </div>

        {/* Hover / Dragging Time Tooltip Bubble */}
        {(isDragging || hoverTime !== null) && duration > 0 && (
          <div
            className="absolute bottom-6 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[10px] font-mono shadow-xl border border-white/15 pointer-events-none z-30"
            style={{ left: isDragging ? `${progressPercent}%` : `${hoverX}px` }}
          >
            <span>{formatVideoDuration(isDragging ? dragTime : (hoverTime || 0))}</span>
          </div>
        )}
      </div>

      {/* Timestamp labels */}
      <div className="flex items-center justify-between text-[10px] text-white/90 font-mono px-0.5 -mt-0.5">
        <span>{formatVideoDuration(displayTime)}</span>
        <span>{formatVideoDuration(duration)}</span>
      </div>
    </div>
  );
};
