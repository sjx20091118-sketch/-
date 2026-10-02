import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Download, CheckCircle, X, ShieldAlert, Check } from 'lucide-react';
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);

  if (!isOpen || !version) return null;

  const handleInstallApp = () => {
    sound.playZenBell(600);
    const rawUrl = version.downloadUrl?.trim();
    if (rawUrl) {
      try {
        const link = document.createElement('a');
        link.href = rawUrl;
        link.setAttribute('type', 'application/vnd.android.package-archive');
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        const inferredFilename = rawUrl.split('/').pop()?.split('?')[0] || `shinian-${version.versionNumber || 'update'}.apk`;
        link.setAttribute('download', inferredFilename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.location.href = rawUrl;
      } catch {
        window.open(rawUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      try {
        window.location.reload();
      } catch {}
    }
    onClose();
  };

  const handleDownload = () => {
    if (downloadComplete) {
      handleInstallApp();
      return;
    }
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(20);
    sound.playWaterDrop(880);

    const rawUrl = version.downloadUrl?.trim();
    if (rawUrl) {
      try {
        const link = document.createElement('a');
        link.href = rawUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const inferredFilename = rawUrl.split('/').pop()?.split('?')[0] || `shinian-${version.versionNumber || 'update'}`;
        link.setAttribute('download', inferredFilename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.open(rawUrl, '_blank', 'noopener,noreferrer');
      }
    }

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          setDownloadComplete(true);
          sound.playZenBell(640);
          return 100;
        }
        return prev + Math.floor(Math.random() * 25) + 20;
      });
    }, 180);
  };

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
                <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
                  <circle cx="10" cy="10" r="3" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-serif font-bold tracking-wider" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                  {version.title || '新版本启程'}
                </h3>
                <p className="text-xs font-serif opacity-70 tracking-wide mt-1 flex items-center gap-1.5" style={{ color: isDarkMode ? '#C2CDC7' : '#526058' }}>
                  <span className="font-mono font-medium px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px]">
                    版本 {version.versionNumber}
                  </span>
                  <span>·</span>
                  <span>{version.releaseDate}</span>
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

            {/* 下载进度条 */}
            {(isDownloading || downloadComplete) && (
              <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 space-y-1.5">
                <div className="flex justify-between text-xs font-serif">
                  <span style={{ color: currentTheme.primary }}>
                    {downloadComplete ? '下载就绪' : `正在下载新版本... ${downloadProgress}%`}
                  </span>
                  <span className="font-mono text-[11px] opacity-70">
                    {downloadProgress}%
                  </span>
                </div>
                <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${currentTheme.primaryDark}, ${currentTheme.primary})`
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${downloadProgress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.2 }}
                  />
                </div>
              </div>
            )}

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
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 py-2.5 rounded-xl text-xs font-serif font-bold text-white shadow-md flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-75"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryDark} 100%)`
              }}
            >
              {downloadComplete ? (
                <>
                  <Check size={14} />
                  <span>立即安装</span>
                </>
              ) : isDownloading ? (
                <>
                  <Download size={14} className="animate-bounce" />
                  <span>正在下载... {downloadProgress}%</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>立即下载</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
