import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Camera,
  User,
  Lock,
  Check,
  AlertCircle,
  RefreshCw,
  Feather,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  registerDomesticUser,
  loginDomesticUser,
  getNextUserNumberPreview,
  DomesticUser
} from '../services/cloudSyncService';
import { compressImageFile } from './LocalImageUploader';
import { MediaImage } from './MediaImage';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';

interface AuthPortalModalProps {
  isOpen: boolean;
  onSuccess: (user: DomesticUser) => void;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80'
];

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  onSuccess,
  currentTheme,
  isDarkMode,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');
  const [loading, setLoading] = useState(false);
  const [nextNumberPreview, setNextNumberPreview] = useState('00001');

  // Form Fields
  const [avatar, setAvatar] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load next user number preview on mount or tab change
  useEffect(() => {
    if (isOpen) {
      getNextUserNumberPreview().then(num => {
        setNextNumberPreview(num);
      }).catch(() => {});
    }
  }, [isOpen, activeTab]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      sound.playWaterDrop(840);
      const compressed = await compressImageFile(file, 400, 0.85);
      setAvatar(compressed);
      showToast('头像上传就绪');
    } catch (err) {
      showToast('头像处理失败，请重试');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.trim()) {
      showToast('请输入您的拾年专属账号');
      return;
    }
    if (account.trim().length < 3) {
      showToast('账号长度至少需要 3 个字符');
      return;
    }
    if (!displayName.trim()) {
      showToast('请填写您的墨客雅号（昵称）');
      return;
    }
    if (!password) {
      showToast('请输入登录密码');
      return;
    }
    if (password.length < 4) {
      showToast('密码长度至少需要 4 位');
      return;
    }
    if (password !== confirmPassword) {
      showToast('两次输入的密码不一致，请核对');
      return;
    }

    try {
      setLoading(true);
      sound.playWaterDrop(900);
      const user = await registerDomesticUser({
        account,
        displayName,
        passwordPlain: password,
        photoURL: avatar || PRESET_AVATARS[0]
      });
      showToast(`恭喜！您已成功入卷，成为拾年第 ${user.userNumber} 位墨客`);
      sound.playZenBell();
      onSuccess(user);
    } catch (err: any) {
      console.error('Registration failed:', err);
      showToast(err.message || '注册失败，请检查网络或重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.trim()) {
      showToast('请输入账号');
      return;
    }
    if (!password) {
      showToast('请输入密码');
      return;
    }

    try {
      setLoading(true);
      sound.playWaterDrop(880);
      const user = await loginDomesticUser(account, password);
      showToast(`欢迎归来，${user.displayName}`);
      sound.playZenBell();
      onSuccess(user);
    } catch (err: any) {
      console.error('Login failed:', err);
      showToast(err.message || '登录失败，请核对账号密码');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden select-none">
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 bg-[#0E1310] overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full opacity-35 filter blur-3xl animate-pulse"
          style={{
            background: `radial-gradient(circle, ${currentTheme.primary} 0%, transparent 70%)`
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[36rem] h-[36rem] rounded-full opacity-30 filter blur-3xl"
          style={{
            background: `radial-gradient(circle, ${currentTheme.accent || currentTheme.primary} 0%, transparent 70%)`
          }}
        />
        {/* Paper texture overlay */}
        <div className="absolute inset-0 ambient-glow-dither opacity-80" />
      </div>

      {/* Main Glassmorphic Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-white/20 dark:border-white/15 apple-liquid-glass z-10"
        style={{
          backgroundColor: isDarkMode ? 'rgba(20, 26, 23, 0.88)' : 'rgba(253, 251, 247, 0.92)'
        }}
      >
        {/* Top Decorative Header */}
        <div className="p-6 pb-3 text-center space-y-3 shrink-0">
          <div className="flex items-center justify-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryDark} 100%)`
              }}
            >
              <span className="font-serif text-base font-bold">拾</span>
            </div>
            <span
              className="text-xl font-bold font-serif tracking-widest drop-shadow-xs"
              style={{
                fontFamily: '"Noto Serif SC", "Ma Shan Zheng", serif',
                color: isDarkMode ? '#FAF8F5' : '#2B332E'
              }}
            >
              拾年 · 岁华清照
            </span>
          </div>

          {/* Gold Foil Sequential Number Badge */}
          <div className="inline-flex items-center justify-center">
            <div className="relative group px-4 py-1.5 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 shadow-[0_2px_14px_rgba(245,158,11,0.18)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                <span
                  className="text-xs font-serif font-bold tracking-widest bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-400 bg-clip-text text-transparent"
                  style={{ fontFamily: '"Noto Serif SC", serif' }}
                >
                  {activeTab === 'register'
                    ? `拾年归客 · 第 ${nextNumberPreview} 号（自动锁定）`
                    : '岁华重溯 · 墨客登临'}
                </span>
              </div>
            </div>
          </div>

          {/* Capsule Tab Switcher */}
          <div className="p-1 rounded-full bg-black/5 dark:bg-white/10 flex items-center max-w-[240px] mx-auto border border-black/5 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                sound.playWaterDrop(840);
                setActiveTab('register');
              }}
              className={`flex-1 py-1.5 rounded-full text-xs font-serif font-medium transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-[#2A332E] text-[#2B332E] dark:text-white shadow-sm font-bold'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              归客入卷（注册）
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playWaterDrop(840);
                setActiveTab('login');
              }}
              className={`flex-1 py-1.5 rounded-full text-xs font-serif font-medium transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-[#2A332E] text-[#2B332E] dark:text-white shadow-sm font-bold'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              岁华重溯（登录）
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4 custom-scrollbar">
          {activeTab === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Avatar Selector */}
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div
                    className="w-18 h-18 rounded-full overflow-hidden border-2 border-amber-400/50 shadow-md flex items-center justify-center bg-black/5 dark:bg-white/5 transition-transform group-hover:scale-105"
                  >
                    {avatar ? (
                      <MediaImage src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-neutral-400 gap-1">
                        <Camera size={20} />
                        <span className="text-[10px] font-serif">选头像</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-amber-500 text-white shadow-xs">
                    <Camera size={11} />
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Preset Avatars Quick Select */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-serif opacity-60">预设：</span>
                  {PRESET_AVATARS.slice(0, 4).map((pUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        sound.playWaterDrop(780);
                        setAvatar(pUrl);
                      }}
                      className="w-5 h-5 rounded-full overflow-hidden border border-white/40 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <img src={pUrl} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Nickname */}
              <div>
                <label className="text-[11px] font-serif opacity-75 block mb-1">
                  墨客雅号（用户名/昵称）
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="如：东坡居士 / 清照 / 拾年故人"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-serif border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  />
                  <Feather className="absolute right-3.5 top-3 w-3.5 h-3.5 opacity-40 pointer-events-none" />
                </div>
              </div>

              {/* Account ID */}
              <div>
                <label className="text-[11px] font-serif opacity-75 block mb-1">
                  专属账号（登录唯一凭据，字母或数字）
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={account}
                    onChange={e => setAccount(e.target.value)}
                    placeholder="如：shinian_user / phone / email"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  />
                  <User className="absolute right-3.5 top-3 w-3.5 h-3.5 opacity-40 pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-serif opacity-75 block mb-1">
                  设置密码（至少 4 位）
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-[11px] font-serif opacity-75 block mb-1 flex items-center justify-between">
                  <span>再次确认密码</span>
                  {password && confirmPassword && (
                    <span className={`text-[10px] ${password === confirmPassword ? 'text-emerald-500' : 'text-red-400'}`}>
                      {password === confirmPassword ? '✓ 密码一致' : '✕ 密码不符'}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  />
                  <Lock className="absolute right-3.5 top-3 w-3.5 h-3.5 opacity-40 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl text-xs font-serif font-bold text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer mt-2"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryDark} 100%)`
                }}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles size={15} />
                    入卷启封 · 步入拾年
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4 pt-2">
              {/* Account ID */}
              <div>
                <label className="text-[11px] font-serif opacity-75 block mb-1">
                  拾年账号
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={account}
                    onChange={e => setAccount(e.target.value)}
                    placeholder="请输入您的账号"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  />
                  <User className="absolute right-3.5 top-3 w-3.5 h-3.5 opacity-40 pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-serif opacity-75 block mb-1">
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl text-xs font-serif font-bold text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer mt-4"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryDark} 100%)`
                }}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    启卷重温 · 进入拾年
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-4 border-t border-black/5 dark:border-white/10 text-center text-[10px] font-serif opacity-60">
          岁月长河 · 一人一卷 · 专属编号永久留存
        </div>
      </motion.div>
    </div>
  );
};
