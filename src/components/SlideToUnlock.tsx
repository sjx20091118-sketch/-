import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { Flame, Lock, ArrowRight } from 'lucide-react';
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
  const [containerWidth, setContainerWidth] = useState<number>(320);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const x = useMotionValue(0);

  // ResizeObserver 精准且高频监听容器宽度变动，杜绝尺寸不匹配导致的滑动卡顿
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSize = 48; // Size of the wax seal thumb
  const maxDrag = Math.max(100, containerWidth - handleSize - 8);

  // 动态轨迹与淡出变换 (高帧率流体算力适配)
  const textOpacity = useTransform(x, [0, maxDrag * 0.55], [1, 0]);
  const backgroundFillWidth = useTransform(x, (val) => `${Math.max(0, val + handleSize / 2)}px`);

  const handleDragEnd = () => {
    if (disabled || isUnlocking || isCompleted) return;
    const currentX = x.get();
    
    // 拖拽超过 68% 触发顺滑弹簧吸附终点并完成解锁
    if (currentX >= maxDrag * 0.68) {
      animate(x, maxDrag, {
        type: 'spring',
        stiffness: 380,
        damping: 26,
        mass: 0.8
      });
      setIsCompleted(true);
      if (navigator.vibrate) {
        try {
          navigator.vibrate([20, 30, 40]);
        } catch {}
      }
      onUnlock();
    } else {
      // 未达到门槛，平滑回弹零点
      animate(x, 0, {
        type: 'spring',
        stiffness: 420,
        damping: 28,
        mass: 0.8
      });
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-2 select-none">
      <div
        ref={containerRef}
        className="relative h-14 rounded-full p-1 border flex items-center overflow-hidden transition-colors shadow-inner"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: `${theme.primary}35`,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)'
        }}
      >
        {/* 滑动进度半透明填充背景 (GPU 加速) */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 rounded-full pointer-events-none opacity-30"
          style={{
            width: backgroundFillWidth,
            background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})`,
            willChange: 'width'
          }}
        />

        {/* 提示文案淡出 */}
        <motion.div
          style={{ opacity: textOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none pl-12 pr-4 text-center"
        >
          <div className="flex items-center gap-1.5 font-serif text-xs font-medium tracking-wider text-[#404E47]">
            <span>滑动解开火漆信封 · 进入长卷</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-70 animate-pulse text-[#E88765]" />
          </div>
        </motion.div>

        {/* 核心可拖拽火漆印章句柄 */}
        <motion.div
          drag={disabled || isUnlocking || isCompleted ? false : 'x'}
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ x, willChange: 'transform' }}
          className="relative z-10 w-12 h-12 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center shadow-md touch-none select-none"
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center border-2 border-white/95 shadow-md relative overflow-hidden transition-transform active:scale-105"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.primaryDark})`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/35 pointer-events-none rounded-full" />
            
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
