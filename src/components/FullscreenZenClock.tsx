import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, Minimize2, Moon, Sun, Clock } from 'lucide-react';
import { HealingTheme } from '../types';

interface FullscreenZenClockProps {
  isOpen: boolean;
  onClose: () => void;
  theme: HealingTheme;
}

export const FullscreenZenClock: React.FC<FullscreenZenClockProps> = ({
  isOpen,
  onClose,
  theme
}) => {
  const [time, setTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZenDark, setIsZenDark] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Fullscreen toggle failed:', e);
    }
  };

  if (!isOpen) return null;

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');

  const year = time.getFullYear();
  const month = time.getMonth() + 1;
  const day = time.getDate();
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekDay = weekDays[time.getDay()];

  return (
    <AnimatePresence>
      <motion.div
        key="fullscreen-zen-clock"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-0 z-[100] flex flex-col justify-between p-6 sm:p-10 select-none backdrop-blur-2xl transition-colors duration-500 ${
          isZenDark ? 'bg-[#121614] text-[#FAF8F5]' : 'bg-[#FAF8F5]/96 text-[#17201B]'
        }`}
      >
        {/* Background Ambient Radial Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30 filter blur-3xl transition-colors duration-700"
            style={{ backgroundColor: theme.primary }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20 filter blur-3xl transition-colors duration-700"
            style={{ backgroundColor: theme.accent }}
          />
        </div>

        {/* Top Controls Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="apple-liquid-glass rounded-full px-4 py-1.5 flex items-center gap-2 border border-white/60 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-[#5B7B6D]" />
            <span className="text-xs font-serif font-medium tracking-wide">
              全屏时光时钟
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsZenDark(!isZenDark)}
              title={isZenDark ? '明亮模式' : '暗夜冥想'}
              className="apple-liquid-glass w-9 h-9 rounded-full flex items-center justify-center border border-white/60 text-[#6E7C75] hover:text-[#17201B] transition-transform active:scale-95 shadow-xs"
            >
              {isZenDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#5B7B6D]" />}
            </button>

            <button
              onClick={toggleFullscreen}
              title="切换浏览器全屏"
              className="apple-liquid-glass w-9 h-9 rounded-full flex items-center justify-center border border-white/60 text-[#6E7C75] hover:text-[#17201B] transition-transform active:scale-95 shadow-xs"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              title="退出全屏时钟"
              className="apple-liquid-glass w-9 h-9 rounded-full flex items-center justify-center border border-white/60 text-[#6E7C75] hover:text-[#17201B] transition-transform active:scale-95 shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Clock Display */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto space-y-4">
          {/* Poetic Date & Solar Term */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex items-center gap-2 text-sm sm:text-base font-serif tracking-widest text-[#6E7C75]"
          >
            <span>{year}年{month}月{day}日</span>
            <span>·</span>
            <span>{weekDay}</span>
          </motion.div>

          {/* Large Modern Serif Digital Clock Numbers */}
          <div className="flex items-baseline justify-center font-serif tracking-tight tabular-nums">
            <span className="text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tight">
              {hours}
            </span>
            <span className="text-4xl sm:text-6xl md:text-7xl px-1 sm:px-2 font-light opacity-60 animate-pulse">
              :
            </span>
            <span className="text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tight">
              {minutes}
            </span>
            <span className="text-2xl sm:text-4xl md:text-5xl font-mono font-normal ml-3 sm:ml-4 opacity-75" style={{ color: theme.primary }}>
              {seconds}
            </span>
          </div>

          {/* Theme Quote */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-xs sm:text-sm font-serif italic text-[#6E7C75] tracking-widest pt-3 max-w-md"
          >
            {theme.quote || '岁华清照，十年归处。愿岁月不负所期。'}
          </motion.p>
        </div>

        {/* Bottom Zen Footnote */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-[#6E7C75] font-serif">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
            <span>当前时光色调 · {theme.name}</span>
          </span>
          <span>轻触右上角随时返回</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
