import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, CloudUpload, CloudDownload, Trash2, LogIn, LogOut, RefreshCw, X, UserCheck } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import {
  uploadBackupToCloud,
  listUserBackups,
  deleteUserBackup,
  syncUserProfile,
  checkIsAdmin,
  CloudBackupRecord
} from '../services/cloudSyncService';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';
import { AppData } from '../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onRestoreData: (restoredData: AppData) => void;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  appData,
  onRestoreData,
  currentTheme,
  isDarkMode,
  showToast
}) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [backups, setBackups] = useState<CloudBackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupTitle, setBackupTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Monitor Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        syncUserProfile({
          displayName: currentUser.displayName || '拾年墨友',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || ''
        }).catch(() => {});
        const adminStatus = await checkIsAdmin(currentUser.uid, currentUser.email || undefined);
        setIsAdmin(adminStatus);
        fetchBackups();
      } else {
        setBackups([]);
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  const fetchBackups = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const records = await listUserBackups();
      setBackups(records);
    } catch (err: any) {
      console.error('Fetch backups failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      sound.playWaterDrop(880);
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      showToast('云端账号接入成功');
      sound.playZenBell();
    } catch (err: any) {
      console.error('Login error:', err);
      showToast('登录失败：' + (err.message || '请重试'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      sound.playHapticClick(600);
      await signOut(auth);
      showToast('已安全退出云端账号');
    } catch (err: any) {
      showToast('退出失败');
    }
  };

  const handleCreateBackup = async () => {
    if (!user) {
      showToast('请先登录云端账号');
      return;
    }
    try {
      setIsUploading(true);
      sound.playWaterDrop(980);
      await uploadBackupToCloud(appData, backupTitle.trim() || undefined);
      setBackupTitle('');
      showToast('云境归档同步成功！');
      sound.playZenBell();
      await fetchBackups();
    } catch (err: any) {
      console.error('Upload backup error:', err);
      showToast('备份失败：' + (err.message || '网络异常'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRestore = async (backup: CloudBackupRecord) => {
    try {
      setRestoringId(backup.backupId);
      sound.playWaterDrop(1050);
      const parsedData = JSON.parse(backup.dataPayload) as AppData;
      if (!parsedData.people || !parsedData.timeline) {
        throw new Error('备份文件格式不兼容');
      }
      onRestoreData(parsedData);
      showToast(`已成功还原归档「${backup.title}」`);
      sound.playZenBell();
      onClose();
    } catch (err: any) {
      console.error('Restore error:', err);
      showToast('还原备份失败：' + (err.message || '数据解析错误'));
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async (backupId: string, title: string) => {
    if (!window.confirm(`确定要从云端删除备份「${title}」吗？`)) return;
    try {
      sound.playHapticClick(700);
      await deleteUserBackup(backupId);
      showToast('已清除该云端备份');
      setBackups(prev => prev.filter(b => b.backupId !== backupId));
    } catch (err: any) {
      showToast('删除失败');
    }
  };

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
          className="absolute inset-0 bg-black/65 backdrop-blur-md"
        />

        {/* Window */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl z-10 border border-white/40 dark:border-white/15 apple-liquid-glass"
          style={{
            backgroundColor: isDarkMode ? 'rgba(26, 32, 28, 0.94)' : 'rgba(253, 251, 247, 0.96)'
          }}
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md relative overflow-hidden shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.accent || currentTheme.primary} 0%, ${currentTheme.primary} 100%)`
                }}
              >
                <Cloud className="text-white w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-serif font-bold tracking-wider" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    云境 · 多端漫游归档
                  </h3>
                  {isAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-serif font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                      管理员
                    </span>
                  )}
                </div>
                <p className="text-xs font-serif opacity-70 tracking-wide mt-0.5" style={{ color: isDarkMode ? '#C2CDC7' : '#526058' }}>
                  岁月无垠 · 数据无忧 · 随时随地跨端同步
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playHapticClick(800);
                onClose();
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Account Card */}
            {user ? (
              <div
                className="p-4 rounded-2xl border flex items-center justify-between"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-white/40 shadow-xs shrink-0" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-white shadow-xs shrink-0"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      {user.displayName?.slice(0, 1) || '墨'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-serif font-bold truncate" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                      {user.displayName || '拾年用户'}
                    </div>
                    <div className="text-[11px] opacity-60 truncate font-mono">
                      {user.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-serif flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  <LogOut size={13} />
                  退出
                </button>
              </div>
            ) : (
              <div
                className="p-5 rounded-2xl border text-center space-y-3"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }}
              >
                <div className="mx-auto w-10 h-10 rounded-full flex items-center justify-center bg-sky-500/15 text-sky-500">
                  <UserCheck size={20} />
                </div>
                <div>
                  <div className="text-xs font-serif font-bold" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    开启云端空间与多端同步
                  </div>
                  <p className="text-[11px] opacity-65 mt-1 font-serif">
                    登录后可将《拾年》本地记忆一键封存至云端，实现换机无缝恢复与多端漫游。
                  </p>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-serif font-bold text-white shadow-md flex items-center justify-center gap-2 hover:opacity-95 transition-opacity cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryDark} 100%)`
                  }}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn size={15} />
                      一键快速接入云端
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Create Cloud Backup Box */}
            {user && (
              <div
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudUpload size={15} style={{ color: currentTheme.primary }} />
                    <span className="text-xs font-serif font-bold" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                      新建云端快照归档
                    </span>
                  </div>
                  <span className="text-[11px] font-mono opacity-60">
                    当前本地：{appData.people.length}位知己 · {appData.timeline.length}段拾光
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={backupTitle}
                    onChange={(e) => setBackupTitle(e.target.value)}
                    placeholder="归档备注名称（选填，如：初中毕业全量留念）"
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1"
                  />
                  <button
                    onClick={handleCreateBackup}
                    disabled={isUploading}
                    className="px-4 py-2 rounded-xl text-xs font-serif font-bold text-white shadow-sm flex items-center gap-1.5 shrink-0 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload size={14} />}
                    上传云端
                  </button>
                </div>
              </div>
            )}

            {/* Cloud Backups List */}
            {user && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-bold opacity-80" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    云端历史归档记录 ({backups.length})
                  </span>
                  <button
                    onClick={fetchBackups}
                    className="text-[11px] font-serif text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                    刷新列表
                  </button>
                </div>

                {loading && backups.length === 0 ? (
                  <div className="p-8 text-center text-xs opacity-50 font-serif">
                    正在连接云境拉取归档...
                  </div>
                ) : backups.length === 0 ? (
                  <div className="p-8 text-center text-xs opacity-50 font-serif border border-dashed rounded-2xl">
                    暂无云端归档，点击上方「上传云端」创建首个备份
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {backups.map((item) => (
                      <div
                        key={item.backupId}
                        className="p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-serif font-bold truncate" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                            {item.title}
                          </div>
                          <div className="text-[10px] opacity-60 font-serif mt-0.5 truncate">
                            {item.summary}
                          </div>
                          <div className="text-[9px] opacity-40 font-mono mt-1">
                            {new Date(item.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleRestore(item)}
                            disabled={restoringId === item.backupId}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-serif font-bold border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {restoringId === item.backupId ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <CloudDownload size={12} />
                            )}
                            还原
                          </button>

                          <button
                            onClick={() => handleDeleteBackup(item.backupId, item.title)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
