import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Server,
  Users,
  GitBranch,
  Radio,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Shield,
  Sparkles,
  BarChart3,
  Send
} from 'lucide-react';
import {
  listAllUsers,
  listAllAppVersions,
  publishAppVersion,
  deleteAppVersion,
  listAllSystemNotices,
  publishSystemNotice,
  deleteSystemNotice,
  CloudUserProfile,
  CloudAppVersion,
  CloudSystemNotice
} from '../services/cloudSyncService';
import { auth } from '../firebase';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  isDarkMode,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'versions' | 'notices'>('dashboard');
  const [loading, setLoading] = useState(false);

  // Data states
  const [usersList, setUsersList] = useState<CloudUserProfile[]>([]);
  const [versionsList, setVersionsList] = useState<CloudAppVersion[]>([]);
  const [noticesList, setNoticesList] = useState<CloudSystemNotice[]>([]);

  // Forms
  const [isVersionFormOpen, setIsVersionFormOpen] = useState(false);
  const [versionNumber, setVersionNumber] = useState('v1.2.1');
  const [versionTitle, setVersionTitle] = useState('岁华微澜 · 性能与体验优化');
  const [versionChangelog, setVersionChangelog] = useState('1. 优化云端漫游同步速度\n2. 升级锁屏空间毛玻璃按键质感\n3. 修复部分机型头像显示异常');
  const [versionForceUpdate, setVersionForceUpdate] = useState(false);
  const [versionDownloadUrl, setVersionDownloadUrl] = useState('');

  const [isNoticeFormOpen, setIsNoticeFormOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('《拾年》云端漫游上线寄语');
  const [noticeContent, setNoticeContent] = useState('浮生若梦，为欢几何。愿《拾年》常伴左右，为您锁住岁月里的每一寸暖阳。');
  const [noticeLevel, setNoticeLevel] = useState<'info' | 'poem' | 'warning' | 'celebration'>('poem');

  const refreshAllData = async () => {
    setLoading(true);
    try {
      const [u, v, n] = await Promise.all([
        listAllUsers().catch(() => []),
        listAllAppVersions().catch(() => []),
        listAllSystemNotices().catch(() => [])
      ]);
      setUsersList(u);
      setVersionsList(v);
      setNoticesList(n);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      showToast('拉取管理数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshAllData();
    }
  }, [isOpen]);

  const handlePublishVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionNumber.trim() || !versionTitle.trim() || !versionChangelog.trim()) {
      showToast('请完整填写版本必填信息');
      return;
    }
    try {
      sound.playWaterDrop(950);
      const newVersion: CloudAppVersion = {
        versionId: `ver_${Date.now()}`,
        versionNumber: versionNumber.trim(),
        title: versionTitle.trim(),
        releaseDate: new Date().toLocaleDateString('zh-CN'),
        changelog: versionChangelog.trim(),
        isForceUpdate: versionForceUpdate,
        downloadUrl: versionDownloadUrl.trim() || undefined,
        author: auth.currentUser?.email || '管理员',
        createdAt: new Date().toISOString()
      };
      await publishAppVersion(newVersion);
      showToast(`已成功发版「${versionNumber}」！`);
      sound.playZenBell();
      setIsVersionFormOpen(false);
      await refreshAllData();
    } catch (err: any) {
      showToast('发版失败：' + err.message);
    }
  };

  const handleDeleteVersion = async (versionId: string, verNum: string) => {
    if (!window.confirm(`确定要撤销下线版本 ${verNum} 吗？`)) return;
    try {
      sound.playHapticClick(700);
      await deleteAppVersion(versionId);
      showToast(`已撤销版本 ${verNum}`);
      setVersionsList(prev => prev.filter(v => v.versionId !== versionId));
    } catch (err: any) {
      showToast('删除失败');
    }
  };

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      showToast('请完整填写广播内容');
      return;
    }
    try {
      sound.playWaterDrop(950);
      const newNotice: CloudSystemNotice = {
        noticeId: `notice_${Date.now()}`,
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        level: noticeLevel,
        isPublished: true,
        createdAt: new Date().toISOString()
      };
      await publishSystemNotice(newNotice);
      showToast('系统广播已成功向全网发布！');
      sound.playZenBell();
      setIsNoticeFormOpen(false);
      await refreshAllData();
    } catch (err: any) {
      showToast('发布广播失败：' + err.message);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (!window.confirm('确定要删除此条广播公告吗？')) return;
    try {
      sound.playHapticClick(700);
      await deleteSystemNotice(noticeId);
      showToast('已删除广播公告');
      setNoticesList(prev => prev.filter(n => n.noticeId !== noticeId));
    } catch (err: any) {
      showToast('删除失败');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-lg"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="relative w-full max-w-4xl h-[88vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl z-10 border border-white/40 dark:border-white/15 apple-liquid-glass"
          style={{
            backgroundColor: isDarkMode ? 'rgba(20, 25, 22, 0.96)' : 'rgba(253, 251, 247, 0.98)'
          }}
        >
          {/* Top Navbar */}
          <div className="p-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-amber-600 to-amber-400 text-white shadow-md">
                <Server size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-serif font-bold tracking-wider" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    灵台 · 后端管理控制中枢
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    MASTER ADMIN
                  </span>
                </div>
                <p className="text-xs font-serif opacity-70 tracking-wide mt-0.5" style={{ color: isDarkMode ? '#C2CDC7' : '#526058' }}>
                  全局用户透视 · 版本发版中枢 · 系统广播发布
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshAllData}
                className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-neutral-500 cursor-pointer"
                title="刷新数据"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => {
                  sound.playHapticClick(800);
                  onClose();
                }}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 border-b border-black/5 dark:border-white/10 flex items-center gap-2 bg-black/[0.02] dark:bg-white/[0.02]">
            {[
              { id: 'dashboard', label: '灵台全景', icon: BarChart3 },
              { id: 'users', label: `用户档案 (${usersList.length})`, icon: Users },
              { id: 'versions', label: `版本发版 (${versionsList.length})`, icon: GitBranch },
              { id: 'notices', label: `系统广播 (${noticesList.length})`, icon: Radio }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    sound.playWaterDrop(840);
                    setActiveTab(tab.id as any);
                  }}
                  className={`py-3 px-3.5 text-xs font-serif font-medium flex items-center gap-1.5 border-b-2 transition-all select-none cursor-pointer ${
                    isActive
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
            {/* 1. Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="text-xs font-serif opacity-60 mb-1 flex items-center gap-1.5">
                      <Users size={13} className="text-sky-500" />
                      云端总用户
                    </div>
                    <div className="text-2xl font-serif font-bold" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                      {usersList.length}
                    </div>
                    <div className="text-[10px] opacity-50 font-serif mt-1">实时接入 Firestore</div>
                  </div>

                  <div className="p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="text-xs font-serif opacity-60 mb-1 flex items-center gap-1.5">
                      <GitBranch size={13} className="text-emerald-500" />
                      已发布版本
                    </div>
                    <div className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400">
                      {versionsList.length}
                    </div>
                    <div className="text-[10px] opacity-50 font-serif mt-1">
                      最新：{versionsList[0]?.versionNumber || 'v1.2.0'}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="text-xs font-serif opacity-60 mb-1 flex items-center gap-1.5">
                      <Radio size={13} className="text-amber-500" />
                      全网系统广播
                    </div>
                    <div className="text-2xl font-serif font-bold text-amber-600 dark:text-amber-400">
                      {noticesList.length}
                    </div>
                    <div className="text-[10px] opacity-50 font-serif mt-1">全网即时推送</div>
                  </div>

                  <div className="p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="text-xs font-serif opacity-60 mb-1 flex items-center gap-1.5">
                      <Shield size={13} className="text-indigo-500" />
                      安全与防御
                    </div>
                    <div className="text-2xl font-serif font-bold text-indigo-600 dark:text-indigo-400">
                      100%
                    </div>
                    <div className="text-[10px] opacity-50 font-serif mt-1">ABAC 零信任规则</div>
                  </div>
                </div>

                {/* Quick Action Matrix */}
                <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-500 w-4 h-4" />
                    <h4 className="text-xs font-serif font-bold text-amber-700 dark:text-amber-300">
                      快速运维操作
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => {
                        setActiveTab('versions');
                        setIsVersionFormOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-serif font-bold bg-amber-500 text-white shadow-xs hover:bg-amber-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} />
                      在线发布新版本
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('notices');
                        setIsNoticeFormOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-serif font-bold border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send size={14} />
                      广播全网公告
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-serif font-bold opacity-80" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    已注册墨友名录 ({usersList.length})
                  </h4>
                  <span className="text-[10px] font-serif opacity-50">实时同步自 Firebase Authentication & Firestore</span>
                </div>

                {usersList.length === 0 ? (
                  <div className="p-12 text-center text-xs opacity-50 font-serif border border-dashed rounded-2xl">
                    暂无用户注册，当新用户使用 Google 登录后将自动收录于此。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {usersList.map(u => (
                      <div
                        key={u.uid}
                        className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="Avatar" className="w-9 h-9 rounded-full object-cover border shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-serif font-bold shrink-0">
                              {u.displayName?.slice(0, 1) || '墨'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-serif font-bold flex items-center gap-2 truncate" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                              <span>{u.displayName || '未命名'}</span>
                              {u.role === 'admin' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-mono">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] opacity-60 font-mono truncate">{u.email || u.uid}</div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] opacity-40 font-mono">
                            注册: {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                          {u.lastSyncAt && (
                            <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                              同步: {new Date(u.lastSyncAt).toLocaleTimeString('zh-CN')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Versions Tab */}
            {activeTab === 'versions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-serif font-bold opacity-80" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    版本发版与更新中枢
                  </h4>
                  <button
                    onClick={() => setIsVersionFormOpen(!isVersionFormOpen)}
                    className="px-3 py-1.5 rounded-xl text-xs font-serif font-bold bg-amber-500 text-white shadow-xs hover:bg-amber-600 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    {isVersionFormOpen ? '收起表单' : '发布新版本'}
                  </button>
                </div>

                {/* Publish Form */}
                <AnimatePresence>
                  {isVersionFormOpen && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handlePublishVersion}
                      className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] space-y-3"
                    >
                      <div className="text-xs font-serif font-bold text-amber-700 dark:text-amber-300">
                        新建发布版本
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-serif opacity-70 block mb-1">版本号 (如 v1.2.0)</label>
                          <input
                            type="text"
                            required
                            value={versionNumber}
                            onChange={e => setVersionNumber(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl text-xs font-mono border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-serif opacity-70 block mb-1">发版主题标题</label>
                          <input
                            type="text"
                            required
                            value={versionTitle}
                            onChange={e => setVersionTitle(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-serif opacity-70 block mb-1">更新日志与特性列表 (支持换行)</label>
                        <textarea
                          rows={4}
                          required
                          value={versionChangelog}
                          onChange={e => setVersionChangelog(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 custom-scrollbar"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={versionForceUpdate}
                            onChange={e => setVersionForceUpdate(e.target.checked)}
                            className="w-4 h-4 text-amber-500 rounded"
                          />
                          <span className="text-xs font-serif">设为强制全员更新</span>
                        </label>

                        <button
                          type="submit"
                          className="ml-auto px-5 py-2 rounded-xl text-xs font-serif font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm cursor-pointer"
                        >
                          立即全网发布
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Versions List */}
                <div className="space-y-2">
                  {versionsList.map(v => (
                    <div
                      key={v.versionId}
                      className="p-4 rounded-2xl border transition-all space-y-2"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            {v.versionNumber}
                          </span>
                          <span className="text-xs font-serif font-bold" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                            {v.title}
                          </span>
                          {v.isForceUpdate && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/15 text-red-500 font-serif">
                              强制更新
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] opacity-40 font-mono">{v.releaseDate}</span>
                          <button
                            onClick={() => handleDeleteVersion(v.versionId, v.versionNumber)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs font-serif opacity-75 whitespace-pre-wrap pl-1 border-l-2 border-amber-500/30">
                        {v.changelog}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Notices Tab */}
            {activeTab === 'notices' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-serif font-bold opacity-80" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                    天光云影 · 系统广播与寄语
                  </h4>
                  <button
                    onClick={() => setIsNoticeFormOpen(!isNoticeFormOpen)}
                    className="px-3 py-1.5 rounded-xl text-xs font-serif font-bold bg-amber-500 text-white shadow-xs hover:bg-amber-600 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    {isNoticeFormOpen ? '收起表单' : '发布新广播'}
                  </button>
                </div>

                {/* Notice Form */}
                <AnimatePresence>
                  {isNoticeFormOpen && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handlePublishNotice}
                      className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] space-y-3"
                    >
                      <div className="text-xs font-serif font-bold text-amber-700 dark:text-amber-300">
                        发布全网公告 / 诗意寄语
                      </div>

                      <div>
                        <label className="text-[11px] font-serif opacity-70 block mb-1">广播标题</label>
                        <input
                          type="text"
                          required
                          value={noticeTitle}
                          onChange={e => setNoticeTitle(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-serif opacity-70 block mb-1">广播正文</label>
                        <textarea
                          rows={3}
                          required
                          value={noticeContent}
                          onChange={e => setNoticeContent(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 custom-scrollbar"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <select
                          value={noticeLevel}
                          onChange={e => setNoticeLevel(e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none"
                        >
                          <option value="poem" className="bg-neutral-800 text-white">诗意雅韵</option>
                          <option value="info" className="bg-neutral-800 text-white">常规通知</option>
                          <option value="celebration" className="bg-neutral-800 text-white">佳节欢庆</option>
                          <option value="warning" className="bg-neutral-800 text-white">重要提醒</option>
                        </select>

                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl text-xs font-serif font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm cursor-pointer"
                        >
                          向全网下发广播
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Notices List */}
                <div className="space-y-2">
                  {noticesList.map(n => (
                    <div
                      key={n.noticeId}
                      className="p-4 rounded-2xl border transition-all space-y-1.5"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-serif font-bold" style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}>
                          {n.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] opacity-40 font-mono">
                            {new Date(n.createdAt).toLocaleString('zh-CN')}
                          </span>
                          <button
                            onClick={() => handleDeleteNotice(n.noticeId)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-serif opacity-75 leading-relaxed">{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
