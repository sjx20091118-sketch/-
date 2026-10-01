import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Cloud,
  CloudUpload,
  CloudDownload,
  Trash2,
  LogOut,
  Camera,
  Edit3,
  Shield,
  KeyRound,
  RefreshCw,
  X,
  Server,
  User,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import {
  DomesticUser,
  CloudBackupRecord,
  uploadDomesticBackupToCloud,
  listDomesticUserBackups,
  deleteDomesticUserBackup,
  updateDomesticUserProfile,
  hashPassword,
  setLocalDomesticUser
} from '../services/cloudSyncService';
import { compressImageFile } from './LocalImageUploader';
import { MediaImage } from './MediaImage';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';
import { AppData } from '../types';

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DomesticUser | null;
  onUserUpdated: (user: DomesticUser | null) => void;
  appData: AppData;
  onRestoreData: (restoredData: AppData) => void;
  onOpenAdminPortal?: () => void;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  appData,
  onRestoreData,
  onOpenAdminPortal,
  currentTheme,
  isDarkMode,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'security'>('cloud');
  const [backups, setBackups] = useState<CloudBackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backupTitle, setBackupTitle] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Edit Profile States
  const [editingName, setEditingName] = useState(currentUser?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setEditingName(currentUser.displayName);
      fetchBackups();
    }
  }, [isOpen, currentUser]);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const records = await listDomesticUserBackups();
      setBackups(records);
    } catch (err) {
      console.error('Fetch backups failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      sound.playWaterDrop(840);
      const compressed = await compressImageFile(file, 400, 0.85);
      const updated = await updateDomesticUserProfile({ photoURL: compressed });
      onUserUpdated(updated);
      showToast('头像已更新');
      sound.playZenBell();
    } catch (err) {
      showToast('头像更新失败');
    }
  };

  const handleUpdateName = async () => {
    if (!editingName.trim()) {
      showToast('请输入墨客雅号');
      return;
    }
    try {
      sound.playWaterDrop(880);
      const updated = await updateDomesticUserProfile({ displayName: editingName.trim() });
      onUserUpdated(updated);
      showToast('墨客雅号已更新');
      sound.playZenBell();
    } catch (err) {
      showToast('更新失败');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      showToast('新密码至少需要 4 位');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('两次输入的新密码不一致');
      return;
    }
    try {
      sound.playWaterDrop(880);
      const hashedPassword = await hashPassword(newPassword);
      const updated = await updateDomesticUserProfile({ passwordHash: hashedPassword });
      onUserUpdated(updated);
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('登录密码已成功修改');
      sound.playZenBell();
    } catch (err) {
      showToast('修改密码失败');
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsUploading(true);
      sound.playWaterDrop(950);
      await uploadDomesticBackupToCloud(appData, backupTitle.trim() || undefined);
      setBackupTitle('');
      showToast('云境归档同步成功！');
      sound.playZenBell();
      await fetchBackups();
    } catch (err: any) {
      console.error('Backup error:', err);
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
    if (!window.confirm(`确定要删除云端归档「${title}」吗？`)) return;
    try {
      sound.playHapticClick(700);
      await deleteDomesticUserBackup(backupId);
      showToast('已清除该云端备份');
      setBackups(prev => prev.filter(b => b.backupId !== backupId));
    } catch (err) {
      showToast('删除失败');
    }
  };

  const handleLogout = () => {
    if (!window.confirm('确定要退出当前账号吗？')) return;
    sound.playHapticClick(600);
    setLocalDomesticUser(null);
    onUserUpdated(null);
    showToast('已安全退出账号');
    onClose();
  };

  if (!isOpen || !currentUser) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Window */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl z-10 border border-white/30 dark:border-white/15 apple-liquid-glass"
          style={{
            backgroundColor: isDarkMode ? 'rgba(20, 26, 23, 0.95)' : 'rgba(253, 251, 247, 0.96)'
          }}
        >
          {/* Header Profile Banner */}
          <div className="p-6 pb-4 border-b border-black/5 dark:border-white/10 relative">
            <button
              onClick={() => {
                sound.playHapticClick(800);
                onClose();
              }}
              className="absolute right-5 top-5 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4">
              {/* Avatar with edit button */}
              <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400/60 shadow-md flex items-center justify-center bg-black/5">
                  {currentUser.photoURL ? (
                    <MediaImage src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-serif font-bold text-white text-xl"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      {currentUser.displayName?.slice(0, 1) || '墨'}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 p-1 rounded-full bg-amber-500 text-white shadow-xs">
                  <Camera size={10} />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* User Info & Gold Seal */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-serif font-bold truncate" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    {currentUser.displayName}
                  </h3>
                  {currentUser.role === 'admin' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      ADMIN
                    </span>
                  )}
                </div>

                {/* Gold Foil Sequential Number Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15">
                  <Sparkles size={11} className="text-amber-500" />
                  <span
                    className="text-[11px] font-serif font-bold tracking-wider bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-400 bg-clip-text text-transparent"
                  >
                    拾年归客 · 第 {currentUser.userNumber} 号
                  </span>
                </div>

                <div className="text-[10px] opacity-60 font-mono">
                  账号: {currentUser.account} · 入卷时间: {new Date(currentUser.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            </div>

            {/* Navigation Tab Pills */}
            <div className="flex items-center gap-2 mt-4 pt-2">
              <button
                onClick={() => {
                  sound.playWaterDrop(840);
                  setActiveTab('cloud');
                }}
                className={`py-1.5 px-3 rounded-xl text-xs font-serif font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'cloud'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'bg-black/5 dark:bg-white/5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <Cloud size={13} />
                云境 · 跨端漫游 ({backups.length})
              </button>

              <button
                onClick={() => {
                  sound.playWaterDrop(840);
                  setActiveTab('security');
                }}
                className={`py-1.5 px-3 rounded-xl text-xs font-serif font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'bg-black/5 dark:bg-white/5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <Shield size={13} />
                个人资料与安全
              </button>

              {currentUser.role === 'admin' && onOpenAdminPortal && (
                <button
                  onClick={() => {
                    sound.playWaterDrop(1000);
                    onClose();
                    onOpenAdminPortal();
                  }}
                  className="ml-auto py-1.5 px-2.5 rounded-xl text-[11px] font-serif font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Server size={12} />
                  管理中枢
                </button>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {activeTab === 'cloud' && (
              <div className="space-y-4">
                {/* Create Backup Box */}
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
                        新建云端漫游快照
                      </span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">
                      本地：{appData.people.length}知己 · {appData.timeline.length}拾光
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={backupTitle}
                      onChange={(e) => setBackupTitle(e.target.value)}
                      placeholder="归档名称（选填，如：初中三年全量封存）"
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500"
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

                {/* Backups List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-bold opacity-80" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                      云端漫游归档记录 ({backups.length})
                    </span>
                    <button
                      onClick={fetchBackups}
                      className="text-[11px] font-serif text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                      刷新
                    </button>
                  </div>

                  {loading && backups.length === 0 ? (
                    <div className="p-8 text-center text-xs opacity-50 font-serif">
                      正在连接云境拉取归档...
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="p-8 text-center text-xs opacity-50 font-serif border border-dashed rounded-2xl">
                      暂无云端归档，点击上方「上传云端」封存首个备份
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
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
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                {/* Nickname modification */}
                <div
                  className="p-4 rounded-2xl border space-y-2.5"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                  }}
                >
                  <label className="text-xs font-serif font-bold block" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    修改墨客雅号（昵称）
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      onClick={handleUpdateName}
                      className="px-4 py-1.5 rounded-xl text-xs font-serif font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
                    >
                      保存昵称
                    </button>
                  </div>
                </div>

                {/* Password modification */}
                <div
                  className="p-4 rounded-2xl border space-y-2.5"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                  }}
                >
                  <label className="text-xs font-serif font-bold block" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    修改登录密码
                  </label>
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="输入新密码（至少 4 位）"
                      className="w-full px-3 py-1.5 rounded-xl text-xs font-mono border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      placeholder="再次确认新密码"
                      className="w-full px-3 py-1.5 rounded-xl text-xs font-mono border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      onClick={handleChangePassword}
                      className="w-full py-2 rounded-xl text-xs font-serif font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
                    >
                      更新密码
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
            <span className="text-[10px] opacity-40 font-serif">
              拾年 · 岁华清照 · 专属记忆档案馆
            </span>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-serif flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              退出登录
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
