import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Feather, BookOpen, RefreshCw, X, Server } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';

interface AboutAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrologue: () => void;
  onCheckUpdate: () => void;
  onOpenAdminPortal?: () => void;
  isAdmin?: boolean;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
}

export const AboutAppModal: React.FC<AboutAppModalProps> = ({
  isOpen,
  onClose,
  onOpenPrologue,
  onCheckUpdate,
  onOpenAdminPortal,
  isAdmin,
  currentTheme,
  isDarkMode
}) => {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl z-10 border border-white/40 dark:border-white/15 apple-liquid-glass"
          style={{
            backgroundColor: isDarkMode ? 'rgba(26, 32, 28, 0.92)' : 'rgba(253, 251, 247, 0.94)'
          }}
        >
          {/* Header Banner */}
          <div className="relative p-6 pb-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md relative overflow-hidden shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryDark} 100%)`
                }}
              >
                <span className="font-serif text-white font-bold text-xl select-none">拾</span>
                <div className="absolute inset-0 bg-white/20 pointer-events-none" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className="text-lg font-serif font-bold tracking-wider"
                    style={{
                      fontFamily: '"Noto Serif SC", "Ma Shan Zheng", serif',
                      color: isDarkMode ? '#FAF8F5' : '#2B332E'
                    }}
                  >
                    关于《拾年》
                  </h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border"
                    style={{
                      backgroundColor: isDarkMode ? `${currentTheme.primary}25` : `${currentTheme.primary}15`,
                      borderColor: `${currentTheme.primary}40`,
                      color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
                    }}
                  >
                    v1.2.0 云境版
                  </span>
                </div>
                <p className="text-xs font-serif opacity-70 tracking-widest mt-0.5" style={{ color: isDarkMode ? '#C2CDC7' : '#526058' }}>
                  岁华沉淀 · 匠心致远
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playHapticClick(800);
                onClose();
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-sm">
            {/* Design Philosophy Card */}
            <div
              className="p-4 rounded-2xl border transition-all"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Feather size={15} style={{ color: currentTheme.primary }} />
                <span className="font-serif font-bold text-xs tracking-wider" style={{ color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark }}>
                  设计哲学 · 东方意韵与极客质感
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-85 font-serif" style={{ color: isDarkMode ? '#D4DDD8' : '#3E4943' }}>
                《拾年》不仅是一座生命时光记忆档案馆，更是一份沉淀岁月温情的数字信物。融合传统宋代水墨疏朗留白之气韵，与苹果现代化液态毛玻璃微光质感，让每一张相片、每一个名字与每一段回忆，都在静谧中生生不息。
              </p>
            </div>

            {/* Core Modules Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className="p-3 rounded-2xl border"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                }}
              >
                <div className="text-xs font-serif font-bold mb-1" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                  知己与拾光
                </div>
                <div className="text-[11px] opacity-70 leading-normal">
                  多维人物名录 · 专属相册 · 珍藏信物柜与浮生拾忆
                </div>
              </div>

              <div
                className="p-3 rounded-2xl border"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                }}
              >
                <div className="text-xs font-serif font-bold mb-1" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                  云端一体架构
                </div>
                <div className="text-[11px] opacity-70 leading-normal">
                  本地离线优先 · Firebase 秒级多端漫游备份 · 隐私安全
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  sound.playWaterDrop(880);
                  onClose();
                  onOpenPrologue();
                }}
                className="w-full py-3 px-4 rounded-2xl flex items-center justify-between transition-all border group cursor-pointer"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${currentTheme.primary}20` }}
                  >
                    <BookOpen size={16} style={{ color: currentTheme.primary }} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-serif font-bold" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                      重温开篇序章
                    </div>
                    <div className="text-[10px] opacity-60">聆听诗意篇章与清心颂曲</div>
                  </div>
                </div>
                <span className="text-xs font-serif text-neutral-400 group-hover:translate-x-0.5 transition-transform">
                  开启 &rarr;
                </span>
              </button>

              <button
                onClick={() => {
                  sound.playWaterDrop(960);
                  onCheckUpdate();
                }}
                className="w-full py-3 px-4 rounded-2xl flex items-center justify-between transition-all border group cursor-pointer"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${currentTheme.accent || currentTheme.primary}20` }}
                  >
                    <RefreshCw size={16} style={{ color: currentTheme.accent || currentTheme.primary }} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-serif font-bold" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                      检查版本更新
                    </div>
                    <div className="text-[10px] opacity-60">检测云端发版与新特性日志</div>
                  </div>
                </div>
                <span className="text-xs font-serif text-neutral-400 group-hover:translate-x-0.5 transition-transform">
                  检测 &rarr;
                </span>
              </button>

              {isAdmin && onOpenAdminPortal && (
                <button
                  onClick={() => {
                    sound.playWaterDrop(1100);
                    onClose();
                    onOpenAdminPortal();
                  }}
                  className="w-full py-3 px-4 rounded-2xl flex items-center justify-between transition-all border group bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/20">
                      <Server size={16} className="text-amber-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-serif font-bold text-amber-600 dark:text-amber-400">
                        灵台 · 后端管理控制台
                      </div>
                      <div className="text-[10px] opacity-70 text-amber-700 dark:text-amber-300">
                        发版中枢 · 用户档案 · 系统广播
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-serif text-amber-500 group-hover:translate-x-0.5 transition-transform">
                    进入后台 &rarr;
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="p-4 border-t border-black/5 dark:border-white/10 text-center">
            <p className="text-[11px] font-serif opacity-50 select-none" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
              © 2026 拾年 · 岁华清照 · 拾年归处 · 保留所有权利
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
