import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, CheckCircle, X, ShieldAlert } from 'lucide-react';
import { CloudAppVersion } from '../services/cloudSyncService';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';

interface UpdateNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: CloudAppVersion | null;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
}

export const UpdateNoticeModal: React.FC<UpdateNoticeModalProps> = ({
  isOpen,
  onClose,
  version,
  currentTheme,
  isDarkMode
}) => {
  if (!isOpen || !version) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={version.isForceUpdate ? undefined : onClose}
          className="absolute inset-0 bg-black/65 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="relative w-full max-w-md flex flex-col rounded-3xl overflow-hidden shadow-2xl z-10 border border-white/40 dark:border-white/15 apple-liquid-glass"
          style={{
            backgroundColor: isDarkMode ? 'rgba(26, 32, 28, 0.95)' : 'rgba(253, 251, 247, 0.96)'
          }}
        >
          {/* Header Banner */}
          <div className="p-6 pb-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryDark} 100%)`
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-serif font-bold tracking-wider" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    发现新版本
                  </h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
                    style={{
                      backgroundColor: `${currentTheme.primary}20`,
                      color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
                    }}
                  >
                    {version.versionNumber}
                  </span>
                </div>
                <p className="text-xs font-serif opacity-70 tracking-wide mt-0.5" style={{ color: isDarkMode ? '#C2CDC7' : '#526058' }}>
                  {version.title} · {version.releaseDate}
                </p>
              </div>
            </div>

            {!version.isForceUpdate && (
              <button
                onClick={() => {
                  sound.playHapticClick(800);
                  onClose();
                }}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Changelog Content */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div
              className="p-4 rounded-2xl border"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
              }}
            >
              <div className="text-xs font-serif font-bold mb-2 flex items-center gap-1.5" style={{ color: currentTheme.primary }}>
                <CheckCircle size={14} />
                更新日志与新特性
              </div>
              <div
                className="text-xs font-serif leading-relaxed whitespace-pre-wrap opacity-85"
                style={{ color: isDarkMode ? '#D4DDD8' : '#3E4943' }}
              >
                {version.changelog}
              </div>
            </div>

            {version.isForceUpdate && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-serif">
                <ShieldAlert size={15} className="shrink-0" />
                <span>此版本包含核心安全与架构升级，建议立即更新使用。</span>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-black/5 dark:border-white/10 flex items-center gap-3">
            {!version.isForceUpdate && (
              <button
                onClick={() => {
                  sound.playHapticClick(800);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-serif hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                style={{ color: isDarkMode ? '#C2CDC7' : '#526058' }}
              >
                稍后再说
              </button>
            )}

            <button
              onClick={() => {
                sound.playWaterDrop(1000);
                if (version.downloadUrl) {
                  window.open(version.downloadUrl, '_blank');
                } else {
                  window.location.reload();
                }
              }}
              className="flex-1 py-2.5 rounded-xl text-xs font-serif font-bold text-white shadow-md flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryDark} 100%)`
              }}
            >
              <Download size={14} />
              立即体验新版本
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
