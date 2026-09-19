import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { sound } from '../utils/soundEngine';

interface SealingWaxRitualProps {
  title: string;
  unlockDate: string;
  onComplete: () => void;
}

export const SealingWaxRitual: React.FC<SealingWaxRitualProps> = ({
  title,
  unlockDate,
  onComplete
}) => {
  useEffect(() => {
    // 仪式声音时序编排
    sound.playPaperRustle();
    const timer1 = setTimeout(() => {
      sound.playWaterDrop(520); // 蜡液滴落声
    }, 700);

    const timer2 = setTimeout(() => {
      sound.playSealStamp(); // 金属印章重扣与凝固声
    }, 1500);

    const timer3 = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-sm bg-[#FAF8F5] rounded-3xl p-7 border border-[#D9CFC1] shadow-2xl text-center space-y-6 overflow-hidden"
      >
        {/* 背景信封折叠投影 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F2ECE4] to-[#FAF8F5] opacity-80 pointer-events-none" />

        {/* 仪式标题 */}
        <div className="relative z-10 space-y-1">
          <span className="text-[10px] font-mono tracking-widest text-[#E88765] uppercase">
            TIME CAPSULE · RITUAL
          </span>
          <h3 className="font-serif font-bold text-lg text-[#2B332E]">
            时光火漆封存仪式
          </h3>
          <p className="text-xs text-[#6E7C75] font-serif truncate px-4">
            正在将《{title}》锁入时光信笺
          </p>
        </div>

        {/* 拟真信封与火漆印章动画容器 */}
        <div className="relative z-10 py-6 flex flex-col items-center justify-center">
          {/* 仿羊皮信封 */}
          <div className="relative w-48 h-32 bg-[#F0EAE1] rounded-xl border border-[#D4C9BC] shadow-inner flex items-center justify-center">
            {/* 信封折痕 */}
            <div className="absolute inset-x-0 top-0 h-16 border-b border-[#D4C9BC]/60 [clip-path:polygon(0_0,50%_100%,100%_0)] bg-[#E8E1D5]/70" />

            {/* 滴落的热熔红蜡油 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
              className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-[#A83232] via-[#851E1E] to-[#5C1414] shadow-lg flex items-center justify-center"
            >
              {/* 蜡油边缘不规则溢出效果 */}
              <div className="absolute -inset-1 rounded-full bg-[#851E1E]/50 blur-xs -z-10" />

              {/* 缓缓压下的黄铜金属印章 */}
              <motion.div
                initial={{ y: -60, opacity: 0, scale: 1.4 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, duration: 0.35, type: 'spring', stiffness: 450, damping: 20 }}
                className="w-13 h-13 rounded-full bg-gradient-to-br from-[#DFB15B] via-[#B88728] to-[#8C6214] border border-[#FFE799] shadow-md flex flex-col items-center justify-center text-amber-100"
              >
                <span className="text-[9px] font-mono tracking-tighter opacity-80">SEALED</span>
                <span className="text-xs font-serif font-bold text-white tracking-widest leading-none">拾年</span>
                <span className="text-[8px] font-mono opacity-80">{unlockDate.slice(0, 4)}</span>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* 解锁倒计时提示 */}
        <div className="relative z-10 text-xs font-serif text-[#6E7C75]">
          封存开启于 <span className="font-mono text-[#E88765] font-bold">{unlockDate}</span>
          <p className="text-[10px] text-[#8C9B92] font-mono mt-1">时光已铭刻 · 岁月可期</p>
        </div>
      </motion.div>
    </div>
  );
};
