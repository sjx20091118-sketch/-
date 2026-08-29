import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Flame, Lock, Sparkle, MailOpen, ArrowRight, Check } from 'lucide-react';
import { HealingTheme } from '../types';

interface SlideToUnlockProps {
  onUnlock: () => void;
  isUnlocking: boolean;
  theme: HealingTheme;
  unlockDate?: string;
  disabled?: boolean;
}

export const SlideToUnlock: React.FC<SlideToUnlockProps> = ({
  onUnlock,
  isUnlocking,
  theme,
  unlockDate,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const x = useMotionValue(0);

  // Measure container width dynamically
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleSize = 48; // Size of the wax seal thumb
  const maxDrag = Math.max(0, containerWidth - handleSize - 8);

  // Transforms for dynamic track glow & opacity
  const progress = useTransform(x, [0, maxDrag || 1], [0, 1]);
  const textOpacity = useTransform(x, [0, (maxDrag || 1) * 0.6], [1, 0]);
  const backgroundFillWidth = useTransform(x, (val) => `${val + handleSize / 2}px`);

  const handleDragEnd = () => {
    if (disabled || isUnlocking || isCompleted) return;
    const currentX = x.get();
    // If dragged past 75% of max distance, complete the unlock
    if (currentX >= maxDrag * 0.75) {
      x.set(maxDrag);
      setIsCompleted(true);
      if (navigator.vibrate) {
        try {
          navigator.vibrate([20, 30, 40]);
        } catch {
          // Ignore
        }
      }
      onUnlock();
    } else {
      // Spring back
      x.set(0);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-2 select-none">
      <div
        ref={containerRef}
        className="relative h-14 rounded-full p-1 border flex items-center overflow-hidden transition-all shadow-inner"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderColor: `${theme.primary}30`,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)'
        }}
      >
        {/* Progress Background Tint */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 rounded-full pointer-events-none opacity-25"
          style={{
            width: backgroundFillWidth,
            background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})`
          }}
        />

        {/* Shimmering Instructional Text */}
        <motion.div
          style={{ opacity: textOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none pl-12 pr-4 text-center"
        >
          <div className="flex items-center gap-1.5 font-serif text-xs font-medium tracking-wider text-[#526058]">
            <span>滑动解开火漆信封</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-60 animate-pulse text-[#E88765]" />
          </div>
        </motion.div>

        {/* Draggable Wax Seal Handle */}
        <motion.div
          drag={disabled || isUnlocking || isCompleted ? false : 'x'}
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0.08}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="relative z-10 w-12 h-12 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center shadow-md transition-shadow active:shadow-lg touch-manipulation select-none"
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center border-2 border-white/90 shadow-md relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.primaryDark})`
            }}
          >
            {/* Wax Seal Rim Highlights */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/30 pointer-events-none rounded-full" />
            
            {isUnlocking || isCompleted ? (
              <Flame className="w-5 h-5 text-white animate-bounce" />
            ) : (
              <Flame className="w-5 h-5 text-white drop-shadow-xs" />
            )}
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#6E7C75] px-2 font-sans">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-[#5B7B6D]" />
          <span>时光封蜡密封</span>
        </span>
        {unlockDate && (
          <span className="font-mono text-[#E88765] font-medium">
            约定开启: {unlockDate}
          </span>
        )}
      </div>
    </div>
  );
};
