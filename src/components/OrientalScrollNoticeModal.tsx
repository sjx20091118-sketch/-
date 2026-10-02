import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Check, ArrowDownCircle } from 'lucide-react';
import { CloudSystemNotice, CloudAppVersion } from '../services/cloudSyncService';
import { sound } from '../utils/soundEngine';

interface OrientalScrollNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice?: CloudSystemNotice | null;
  version?: CloudAppVersion | null;
  currentTheme?: any;
  isDarkMode?: boolean;
}

// 优雅时间剪辑函数：过滤原始 ISO 机械时间为温润的自然时间
export function formatOrientalDateTime(dateStr?: string): string {
  if (!dateStr) return '刚刚';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs >= 0 && diffMs < 60000) return '刚刚';
    if (diffMs >= 0 && diffMs < 3600000) return `${Math.floor(diffMs / 60000)} 分钟前`;
    
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

export const OrientalScrollNoticeModal: React.FC<OrientalScrollNoticeModalProps> = ({
  isOpen,
  onClose,
  notice,
  version,
  currentTheme,
  isDarkMode
}) => {
  const primaryColor = currentTheme?.primary || '#5B7B6D';
  const primaryDark = currentTheme?.primaryDark || '#3E564B';
  const [animationStage, setAnimationStage] = useState<'idle' | 'dropping' | 'expanding' | 'opened'>('idle');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimationStage('dropping');
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadComplete(false);

      // 阶段 1 -> 阶段 2: 垂直重力下坠耗时 380ms，触底激荡水纹与空灵禅钟
      const t1 = setTimeout(() => {
        sound.playWaterDrop(960);
        sound.playZenBell(580);
        setAnimationStage('expanding');
      }, 380);

      // 阶段 2 -> 阶段 3: 水纹向外激荡后，长卷自中心向两侧画卷式展开
      const t2 = setTimeout(() => {
        setAnimationStage('opened');
      }, 760);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setAnimationStage('idle');
    }
  }, [isOpen]);

  const handleInstallApp = () => {
    sound.playZenBell(600);
    const rawUrl = version?.downloadUrl?.trim();
    if (rawUrl) {
      try {
        // 安卓系统直调系统包安装器或直接打开安装包
        const link = document.createElement('a');
        link.href = rawUrl;
        link.setAttribute('type', 'application/vnd.android.package-archive');
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        const inferredFilename = rawUrl.split('/').pop()?.split('?')[0] || `shinian-${version?.versionNumber || 'update'}.apk`;
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

  const handleDownloadVersion = () => {
    if (downloadComplete) {
      handleInstallApp();
      return;
    }
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(20);
    sound.playWaterDrop(880);

    // 真实触发版本下载：优先下载后台填写的下载链接，若为空则导出真实版本更新清单包
    const rawUrl = version?.downloadUrl?.trim();
    if (rawUrl) {
      try {
        const link = document.createElement('a');
        link.href = rawUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const inferredFilename = rawUrl.split('/').pop()?.split('?')[0] || `shinian-${version?.versionNumber || 'update'}`;
        link.setAttribute('download', inferredFilename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.open(rawUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      try {
        const payload = {
          name: '拾年 · 时光与共',
          version: version?.versionNumber || '1.0.0',
          title: version?.title || '新版本',
          changelog: version?.changelog || '',
          releaseDate: version?.releaseDate || new Date().toISOString(),
          author: version?.author || '拾年 · 作者',
          downloadedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `shinian-${version?.versionNumber || 'v1.0'}-update.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch {}
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

  if (!isOpen || (!notice && !version)) return null;

  const isVersionUpdate = !!version;
  const formattedDate = isVersionUpdate
    ? formatOrientalDateTime(version?.releaseDate || version?.createdAt)
    : formatOrientalDateTime(notice?.createdAt);

  const screenCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 350;

  // 广播等级与印章标签
  const noticeLevelBadge = (() => {
    if (isVersionUpdate) return { label: '新版启程', color: '#E88765', bg: 'rgba(232,135,101,0.15)' };
    const lvl = notice?.level;
    if (lvl === 'celebration') return { label: '活动庆典', color: '#D97706', bg: 'rgba(217,119,6,0.15)' };
    if (lvl === 'warning') return { label: '重要提醒', color: '#DC2626', bg: 'rgba(220,38,38,0.15)' };
    if (lvl === 'poem') return { label: '诗意留白', color: '#5B7B6D', bg: 'rgba(91,123,109,0.15)' };
    return { label: '公文通告', color: '#5B7B6D', bg: 'rgba(91,123,109,0.15)' };
  })();

  return typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-auto select-none p-4 sm:p-6 overflow-hidden">
            {/* 背景虚化与遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              onClick={onClose}
              className="fixed inset-0 bg-[#141C18]/60 dark:bg-black/80 backdrop-blur-md"
            />

            {/* ================= 阶段 1: 屏幕正上方高空垂直重力下坠 (纯单轴加速度，丝滑 120fps) ================= */}
            {animationStage === 'dropping' && (
              <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[100000]">
                <motion.div
                  initial={{
                    y: -screenCenterY - 30,
                    scale: 0.7,
                    opacity: 0.95,
                  }}
                  animate={{
                    y: 0,
                    scale: [0.7, 1.15, 1.4],
                    opacity: [0.95, 1, 1],
                  }}
                  transition={{
                    duration: 0.38,
                    ease: [0.32, 0, 0.67, 0], // 重力加速度曲线
                  }}
                  className="w-3.5 h-3.5 rounded-full bg-[#E88765] shadow-[0_0_24px_#E88765]"
                />
              </div>
            )}

            {/* ================= 阶段 2: 触底激荡三层同心水墨波纹涟漪 (3-Tier Concentric Ink Ripples) ================= */}
            {animationStage === 'expanding' && (
              <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[100000]">
                {/* 第一层：墨韵主波 (深翠主波) */}
                <motion.div
                  initial={{ scale: 0.1, opacity: 0.95 }}
                  animate={{ scale: 4.5, opacity: 0 }}
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className="w-36 h-36 rounded-full border-2 border-[#5B7B6D]/60 dark:border-[#A7D1BF]/60 bg-[#5B7B6D]/15 backdrop-blur-xs shadow-[0_0_30px_rgba(91,123,109,0.3)]"
                />
                {/* 第二层：暖朱副波 (中层温润朱砂波) */}
                <motion.div
                  initial={{ scale: 0.1, opacity: 0.85 }}
                  animate={{ scale: 3.3, opacity: 0 }}
                  transition={{ duration: 0.56, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute w-28 h-28 rounded-full border border-[#E88765]/55 bg-[#E88765]/10"
                />
                {/* 第三层：晨曦金晕微波 (内层精妙金光微波) */}
                <motion.div
                  initial={{ scale: 0.1, opacity: 0.8 }}
                  animate={{ scale: 2.3, opacity: 0 }}
                  transition={{ duration: 0.48, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute w-20 h-20 rounded-full border border-[#D97706]/40 bg-[#D97706]/10"
                />
                {/* 聚心水滴绽放原点 */}
                <motion.div
                  initial={{ scale: 0.3, opacity: 1 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute w-5 h-5 rounded-full bg-[#5B7B6D] dark:bg-[#A7D1BF] shadow-[0_0_24px_#5B7B6D]"
                />
              </div>
            )}

            {/* ================= 阶段 3: 长卷自中心向两侧画卷式展开 (Scroll Unfolding from Center to Sides) ================= */}
            {(animationStage === 'expanding' || animationStage === 'opened') && (
              <motion.div
                initial={{
                  scaleX: 0.12,
                  scaleY: 0.88,
                  opacity: 0,
                  y: 8
                }}
                animate={{
                  scaleX: 1,
                  scaleY: 1,
                  opacity: 1,
                  y: 0
                }}
                exit={{
                  scaleX: 0.2,
                  scaleY: 0.9,
                  opacity: 0,
                  y: 6
                }}
                transition={{
                  type: 'spring',
                  damping: 24,
                  stiffness: 260,
                  mass: 0.85
                }}
                className="relative z-[100001] w-full max-w-lg origin-center bg-white/88 dark:bg-[#15201B]/92 backdrop-blur-2xl rounded-[32px] border border-white/70 dark:border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden text-[#2B332E] dark:text-[#FAF8F5] transition-all"
              >
                {/* 右上角极简关闭按钮 */}
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-5 right-5 p-2 rounded-full text-[#6E7C75] dark:text-[#A7B4AD] hover:text-[#2B332E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10 cursor-pointer"
                  title="关闭"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* 顶部居中标题区 */}
                <div className="px-6 sm:px-10 pt-8 pb-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <span
                      className="text-[10px] font-serif font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        color: noticeLevelBadge.color,
                        backgroundColor: noticeLevelBadge.bg,
                        borderColor: `${noticeLevelBadge.color}35`
                      }}
                    >
                      {noticeLevelBadge.label}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5] tracking-tight">
                    {isVersionUpdate ? (version?.title || '新版本发布') : notice?.title}
                  </h3>

                  {/* 优雅剪辑时间与版本小字说明 */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs text-[#6E7C75] dark:text-[#A7B4AD] font-serif">
                    {isVersionUpdate && (
                      <>
                        <span className="font-mono font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#5B7B6D] dark:text-[#A7D1BF]">
                          {version?.versionNumber ? `版本 ${version.versionNumber}` : '最新版本'}
                        </span>
                        <span>·</span>
                      </>
                    )}
                    <span>{formattedDate}</span>
                    {isVersionUpdate && version?.isForceUpdate && (
                      <>
                        <span>·</span>
                        <span className="text-[#E88765] font-medium">推荐立即升级</span>
                      </>
                    )}
                    {!isVersionUpdate && notice?.level && (
                      <>
                        <span>·</span>
                        <span>{notice.level === 'warning' ? '重要提醒' : notice.level === 'celebration' ? '活动庆典' : notice.level === 'poem' ? '诗意留白' : '公文通告'}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 内容区域 */}
                <div className="px-6 sm:px-10 py-4 max-h-[52vh] overflow-y-auto custom-scrollbar space-y-4">
                  {isVersionUpdate ? (
                    <div className="space-y-4">
                      {(() => {
                        const rawLogs = version?.changelog;
                        const changelogList: string[] = Array.isArray(rawLogs)
                          ? rawLogs
                          : typeof rawLogs === 'string'
                          ? (rawLogs as string).split('\n').map(s => s.trim()).filter(Boolean)
                          : [];
                        if (changelogList.length === 0) return null;
                        return (
                          <div className="p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/5 dark:border-white/8 space-y-2">
                            <h4 className="text-xs font-serif font-bold text-[#6E7C75] dark:text-[#A7B4AD] tracking-wider">
                              更新要点
                            </h4>
                            <ul className="space-y-1.5">
                              {changelogList.map((log, idx) => (
                                <li
                                  key={idx}
                                  className="text-xs sm:text-sm font-serif leading-relaxed text-[#3D4C44] dark:text-[#D6E0DA] flex items-start gap-2"
                                >
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5B7B6D] dark:bg-[#A7D1BF] mt-1.5 shrink-0" />
                                  <span>{log}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}

                      {/* 下载进度条（与当前主题调色板深度适配） */}
                      {(isDownloading || downloadComplete) && (
                        <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 space-y-2">
                          <div className="flex items-center justify-between text-xs font-serif">
                            <span style={{ color: primaryColor }} className="font-bold">
                              {downloadComplete ? '下载就绪 · 待安装' : `正在下载新版本... ${downloadProgress}%`}
                            </span>
                            <span className="text-[#6E7C75] dark:text-[#A7B4AD] text-[11px] font-mono">
                              {downloadProgress}%
                            </span>
                          </div>
                          <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{
                                background: `linear-gradient(90deg, ${primaryDark}, ${primaryColor})`
                              }}
                              initial={{ width: 0 }}
                              animate={{ width: `${downloadProgress}%` }}
                              transition={{ ease: 'easeOut', duration: 0.2 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/5 dark:border-white/8">
                      <p className="text-sm font-serif leading-relaxed text-[#3D4C44] dark:text-[#D6E0DA] whitespace-pre-wrap">
                        {notice?.content}
                      </p>
                    </div>
                  )}
                </div>

                {/* 底部操作：版本更新为【立即下载 / 立即安装】，系统广播为【已阅知 · 封存长卷】 */}
                <div className="px-6 sm:px-10 py-5 border-t border-black/5 dark:border-white/8 bg-black/[0.01] dark:bg-white/[0.02] flex items-center justify-center">
                  {isVersionUpdate ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!downloadComplete && !isDownloading) {
                          handleDownloadVersion();
                        } else if (downloadComplete) {
                          handleInstallApp();
                        }
                      }}
                      disabled={isDownloading}
                      className="w-full sm:w-56 py-2.5 px-6 rounded-2xl text-white font-serif text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryDark} 100%)`
                      }}
                    >
                      {downloadComplete ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>立即安装</span>
                        </>
                      ) : isDownloading ? (
                        <>
                          <Download className="w-4 h-4 animate-bounce" />
                          <span>正在下载... {downloadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>立即下载</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playWaterDrop(840);
                        onClose();
                      }}
                      className="w-full sm:w-52 py-2.5 px-6 rounded-2xl bg-[#5B7B6D] hover:bg-[#4A675A] text-white font-serif text-sm font-medium shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 opacity-90" />
                      <span>已阅知 · 封存长卷</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </AnimatePresence>,
        document.body
      )
    : null;
};
