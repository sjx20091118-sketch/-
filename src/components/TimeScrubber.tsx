import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock } from 'lucide-react';
import { sound } from '../utils/soundEngine';

interface TimeScrubberProps {
  years: string[];
  selectedYear: string;
  onSelectYear: (year: string) => void;
}

export const TimeScrubber: React.FC<TimeScrubberProps> = ({
  years,
  selectedYear,
  onSelectYear
}) => {
  const [hoveredYear, setHoveredYear] = useState<string | null>(null);

  const displayYears = ['all', ...years.filter(y => y !== 'all')];

  return (
    <div className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center py-3 px-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.08)] select-none">
      <div className="w-2 h-2 rounded-full bg-[#E88765]/80 mb-2 shadow-xs" />
      
      <div className="flex flex-col items-center gap-1.5">
        {displayYears.map((yr) => {
          const isSelected = selectedYear === yr;
          const isHovered = hoveredYear === yr;
          const label = yr === 'all' ? '全部' : yr.slice(2);

          return (
            <div
              key={yr}
              className="relative flex items-center justify-center cursor-pointer py-0.5 group touch-manipulation"
              onMouseEnter={() => {
                setHoveredYear(yr);
                sound.playWaterDrop(720);
              }}
              onMouseLeave={() => setHoveredYear(null)}
              onClick={() => {
                sound.playWaterDrop(960);
                onSelectYear(yr);
              }}
            >
              {/* 年份气泡提示 (Hover 或点击时呼出) */}
              <AnimatePresence>
                {(isHovered || isSelected) && (
                  <motion.div
                    initial={{ opacity: 0, x: 8, scale: 0.85 }}
                    animate={{ opacity: 1, x: -6, scale: 1 }}
                    exit={{ opacity: 0, x: 8, scale: 0.85 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-full pointer-events-none whitespace-nowrap px-2 py-0.5 rounded-lg bg-[#2B332E] text-white text-[11px] font-mono shadow-md flex items-center gap-1.5"
                  >
                    <span>{yr === 'all' ? '全部十年岁月' : `${yr} 年纪`}</span>
                    <div className="w-1.5 h-1.5 rotate-45 bg-[#2B332E] absolute -right-0.5 top-1/2 -translate-y-1/2" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 刻度线或微点 */}
              <div
                className={`transition-all duration-300 rounded-full flex items-center justify-center ${
                  isSelected
                    ? 'w-6 h-6 bg-[#5B7B6D] text-white text-[10px] font-mono font-bold shadow-xs'
                    : 'w-2 h-2 bg-[#5B7B6D]/30 group-hover:bg-[#E88765] group-hover:scale-125'
                }`}
              >
                {isSelected ? label : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-2 h-2 rounded-full bg-[#5B7B6D]/40 mt-2" />
    </div>
  );
};
