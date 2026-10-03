import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Mail,
  KeyRound
} from 'lucide-react';
import {
  registerDomesticUser,
  loginDomesticUser,
  DomesticUser,
  sendEmailVerificationCode,
  verifyEmailCode,
  loginWithEmailVerificationCode
} from '../services/cloudSyncService';
import { compressImageFile } from './LocalImageUploader';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';

interface AuthPortalModalProps {
  isOpen: boolean;
  onSuccess: (user: DomesticUser) => void;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  onSuccess,
  currentTheme,
  isDarkMode,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [isSuccessExiting, setIsSuccessExiting] = useState(false);

  // 确保重新进入或登出时，认证表单 100% 保持立即可见，杜绝 isSuccessExiting 遗留隐身 Bug
  useEffect(() => {
    if (isOpen) {
      setIsSuccessExiting(false);
      setLoading(false);
    }
  }, [isOpen]);

  // 表单字段
  const [avatar, setAvatar] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [account, setAccount] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 验证码登录专属状态
  const [loginMethod, setLoginMethod] = useState<'code' | 'password'>('code');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginCountdown, setLoginCountdown] = useState(0);
  const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);
  const [isSendingRegisterOtp, setIsSendingRegisterOtp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 注册验证码倒计时
  useEffect(() => {
    let timer: any = null;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // 登录验证码倒计时
  useEffect(() => {
    let timer: any = null;
    if (loginCountdown > 0) {
      timer = setTimeout(() => setLoginCountdown(c => c - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loginCountdown]);

  const handleSendLoginOtp = async () => {
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('请输入有效的电子邮箱地址');
      return;
    }
    try {
      setIsSendingLoginOtp(true);
      sound.playWaterDrop(880);
      const res = await sendEmailVerificationCode(cleanEmail, 'login');
      setLoginCountdown(60);
      sound.playZenBell();
      showToast(res.message);
    } catch (err: any) {
      showToast(err.message || '发送验证码失败');
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  const handleSendRegisterOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('请输入有效的电子邮箱地址');
      return;
    }
    try {
      setIsSendingRegisterOtp(true);
      sound.playWaterDrop(880);
      const res = await sendEmailVerificationCode(cleanEmail, 'register');
      setCountdown(60);
      sound.playZenBell();
      showToast(res.message);
    } catch (err: any) {
      showToast(err.message || '发送验证码失败');
    } finally {
      setIsSendingRegisterOtp(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      sound.playWaterDrop(840);
      const compressed = await compressImageFile(file, 256, 256, 0.85);
      setAvatar(compressed);
      showToast('头像已选择');
    } catch (err) {
      console.error('Avatar load error:', err);
      showToast('头像读取失败，请重试');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast('请输入昵称');
      return;
    }
    if (!account.trim()) {
      showToast('请输入专属账号');
      return;
    }
    if (account.trim().length < 3) {
      showToast('账号至少需要 3 个字符');
      return;
    }
    if (!password) {
      showToast('请设置密码');
      return;
    }
    if (password.length < 6) {
      showToast('密码至少需要 6 位字符');
      return;
    }
    if (password !== confirmPassword) {
      showToast('两次输入的密码不一致');
      return;
    }

    try {
      setLoading(true);
      sound.playWaterDrop(920);
      const user = await registerDomesticUser({
        account: account.trim().toLowerCase(),
        displayName: displayName.trim(),
        passwordPlain: password,
        photoURL: avatar || undefined
      });
      sound.playSealStamp();
      sound.playZenBell();
      showToast(`注册成功，欢迎 ${user.displayName}`);
      setIsSuccessExiting(true);
      setTimeout(() => {
        onSuccess(user);
      }, 500);
    } catch (err: any) {
      console.error('Registration failed:', err);
      showToast(err.message || '注册失败，请更换账号重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. 验证码免密直接登录
    if (loginMethod === 'code') {
      const cleanEmail = loginEmail.trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        showToast('请输入有效的电子邮箱地址');
        return;
      }
      if (!loginOtp.trim()) {
        showToast('请输入 6 位邮箱验证码');
        return;
      }
      try {
        setLoading(true);
        sound.playWaterDrop(880);
        const user = await loginWithEmailVerificationCode(cleanEmail, loginOtp.trim());
        sound.playSealStamp();
        sound.playZenBell();
        showToast(`欢迎入卷，${user.displayName}`);
        setIsSuccessExiting(true);
        setTimeout(() => onSuccess(user), 500);
      } catch (err: any) {
        showToast(err.message || '验证码登录失败');
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. 账号/邮箱 + 密码传统登录
    if (!account.trim()) {
      showToast('请输入账号或电子邮箱');
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
      sound.playSealStamp();
      sound.playZenBell();
      showToast(`欢迎回来，${user.displayName}`);
      setIsSuccessExiting(true);
      setTimeout(() => {
        onSuccess(user);
      }, 500);
    } catch (err: any) {
      console.error('Login failed:', err);
      showToast(err.message || '账号或密码不正确');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isPasswordMatch = password && confirmPassword && password === confirmPassword;
  const isPasswordMismatch = password && confirmPassword && password !== confirmPassword;

  return createPortal(
    <div
      className="fixed inset-0 w-screen h-screen z-[99999] select-none overflow-y-auto paper-texture transition-colors duration-500 custom-scrollbar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        backgroundColor: currentTheme.canvas || (isDarkMode ? '#111613' : '#FAF8F5'),
        color: isDarkMode ? '#FAF8F5' : '#223028'
      }}
    >
      {/* 1. 视口全景固定双色晕染与宣纸微噪点层 (Pinned Fullscreen Fixed Ambient Ink Glow) */}
      <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div
          className={`absolute -top-28 -left-28 sm:-top-36 sm:-left-36 w-[32rem] sm:w-[48rem] h-[32rem] sm:h-[48rem] rounded-full smooth-radial-glow transition-all duration-700 ${
            isDarkMode ? 'opacity-25' : 'opacity-30'
          }`}
          style={{
            background: `radial-gradient(circle at 50% 50%, ${currentTheme.primary} 0%, ${currentTheme.primary}80 30%, ${currentTheme.primary}20 65%, transparent 100%)`
          }}
        />
        <div
          className={`absolute -bottom-28 -right-28 sm:-bottom-36 sm:-right-36 w-[32rem] sm:w-[48rem] h-[32rem] sm:h-[48rem] rounded-full smooth-radial-glow transition-all duration-700 ${
            isDarkMode ? 'opacity-20' : 'opacity-25'
          }`}
          style={{
            background: `radial-gradient(circle at 50% 50%, ${currentTheme.accent} 0%, ${currentTheme.accent}80 30%, ${currentTheme.accent}20 65%, transparent 100%)`
          }}
        />
        {/* 微米级仿生宣纸微噪点层 */}
        <div className="absolute inset-0 ambient-glow-dither opacity-70" />
      </div>

      {/* 2. 页面主体内容（min-h-full flex-col 确保内容拉伸与滚动时背景全连贯贯通，彻底消除底部白边与割裂） */}
      <div className="relative z-10 min-h-full w-full flex flex-col justify-between p-6 sm:p-10 pb-16 box-border bg-transparent">
        {/* 顶部极简品牌标志与氛围 */}
        <header className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between pt-2 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full animate-pulse shadow-xs"
            style={{ backgroundColor: currentTheme.primary }}
          />
          <h1
            className="text-xl sm:text-2xl font-serif font-bold tracking-widest leading-none"
            style={{
              fontFamily: '"Noto Serif SC", "Ma Shan Zheng", Georgia, serif',
              color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
            }}
          >
            拾年
          </h1>
          <div className="w-[1px] h-3.5 bg-black/15 dark:bg-white/20 mx-1" />
          <span className="text-xs font-serif opacity-70 tracking-widest hidden sm:inline">
            东方生命画卷 · 数字静修
          </span>
        </div>

        <div className="text-[11px] font-serif opacity-50 tracking-wider">
          登录后开启专属长卷
        </div>
      </header>

      {/* 核心大屏幕认证主舞台（全屏展开，拒绝局促小卡片，深度契合东方留白美学） */}
      <main className="w-full max-w-lg mx-auto py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={
            isSuccessExiting
              ? { scale: 0.95, opacity: 0, y: -16 }
              : { scale: 1, opacity: 1, y: 0 }
          }
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-7 gpu-layer-isolate"
        >
          {/* 切换选项卡：登录与注册 */}
          <div className="flex justify-center">
            <div
              className="p-1 rounded-full border flex items-center gap-1 apple-liquid-glass shadow-xs"
              style={{
                borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
                backgroundColor: isDarkMode ? 'rgba(22, 30, 26, 0.72)' : 'rgba(255, 255, 255, 0.78)'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  sound.playWaterDrop(840);
                  setActiveTab('login');
                }}
                className={`px-6 py-2 rounded-full text-xs font-serif font-bold transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                style={{
                  backgroundColor: activeTab === 'login' ? currentTheme.primary : 'transparent'
                }}
              >
                登录账号
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playWaterDrop(840);
                  setActiveTab('register');
                }}
                className={`px-6 py-2 rounded-full text-xs font-serif font-bold transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                style={{
                  backgroundColor: activeTab === 'register' ? currentTheme.primary : 'transparent'
                }}
              >
                注册新账号
              </button>
            </div>
          </div>

          {/* 表单主体 */}
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.form
                key="form-login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                {/* 登录方式子选项卡 */}
                <div className="flex items-center justify-center p-1 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/8 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playWaterDrop(820);
                      setLoginMethod('code');
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      loginMethod === 'code'
                        ? 'bg-white dark:bg-white/15 text-[#2B332E] dark:text-[#FAF8F5] shadow-xs'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Mail size={13} style={{ color: currentTheme.primary }} />
                    <span>邮箱验证码登录</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playWaterDrop(820);
                      setLoginMethod('password');
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      loginMethod === 'password'
                        ? 'bg-white dark:bg-white/15 text-[#2B332E] dark:text-[#FAF8F5] shadow-xs'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <KeyRound size={13} style={{ color: currentTheme.primary }} />
                    <span>账号密码登录</span>
                  </button>
                </div>

                {loginMethod === 'code' ? (
                  /* 邮箱动态验证码免密登录 */
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-serif font-bold tracking-wider block opacity-80">
                        电子邮箱
                      </label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        onBlur={(e) => setLoginEmail(e.currentTarget.value.trim().toLowerCase())}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="输入您的电子邮箱地址"
                        required
                        className="w-full min-h-[48px] px-4 rounded-2xl border text-sm font-sans outline-none transition-all apple-liquid-glass"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-serif font-bold tracking-wider block opacity-80">
                        动态安全验证码
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={loginOtp}
                          onChange={(e) => setLoginOtp(e.target.value)}
                          onBlur={(e) => setLoginOtp(e.currentTarget.value.replace(/\D/g, '').trim())}
                          autoComplete="one-time-code"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder="输入 6 位验证码"
                          required
                          className="sm:col-span-3 min-h-[48px] px-4 rounded-2xl border text-sm font-mono tracking-widest outline-none transition-all apple-liquid-glass text-center font-bold"
                          style={{
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                          }}
                        />
                        <button
                          type="button"
                          disabled={loginCountdown > 0 || isSendingLoginOtp}
                          onClick={handleSendLoginOtp}
                          className="sm:col-span-2 min-h-[48px] px-3 rounded-2xl text-xs font-serif font-bold transition-all border flex items-center justify-center cursor-pointer disabled:opacity-50"
                          style={{
                            backgroundColor: loginCountdown > 0 ? (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') : `${currentTheme.primary}18`,
                            borderColor: `${currentTheme.primary}40`,
                            color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
                          }}
                        >
                          {loginCountdown > 0
                            ? `${loginCountdown}s 后重发`
                            : isSendingLoginOtp
                            ? '正在发送...'
                            : '获取验证码'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 传统账号/邮箱 + 密码登录 */
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-serif font-bold tracking-wider block opacity-80">
                        账号或电子邮箱
                      </label>
                      <input
                        type="text"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        onBlur={(e) => setAccount(e.currentTarget.value.trim().toLowerCase())}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="输入账号或绑定的电子邮箱"
                        required
                        className="w-full min-h-[48px] px-4 rounded-2xl border text-sm font-sans outline-none transition-all apple-liquid-glass"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-serif font-bold tracking-wider block opacity-80">
                        密码
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={(e) => setPassword(e.currentTarget.value)}
                          autoComplete="new-password"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder="输入登录密码"
                          required
                          className="w-full min-h-[48px] pl-4 pr-10 rounded-2xl border text-sm font-sans outline-none transition-all apple-liquid-glass"
                          style={{
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[48px] rounded-2xl text-white font-serif font-bold text-sm tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-95 disabled:opacity-50"
                    style={{
                      backgroundColor: currentTheme.primary
                    }}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>正在入卷...</span>
                      </>
                    ) : (
                      <span>进入长卷</span>
                    )}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="form-register"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                {/* 头像上传（删除了预设默认头像行，简洁纯净） */}
                <div className="flex flex-col items-center justify-center gap-2 pb-1">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    title="点击上传自定义头像"
                  >
                    <div
                      className="w-20 h-20 rounded-full overflow-hidden border-2 shadow-sm flex items-center justify-center transition-transform group-hover:scale-105"
                      style={{
                        borderColor: `${currentTheme.primary}70`,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'
                      }}
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          onError={() => setAvatar('')}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-400 gap-1">
                          <Camera className="w-5 h-5 opacity-70" />
                          <span className="text-[10px] font-serif">上传头像</span>
                        </div>
                      )}
                    </div>

                    <div
                      className="absolute bottom-0 right-0 p-1.5 rounded-full text-white shadow-md border-2 border-white dark:border-[#141B18] group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* 昵称 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-serif font-bold tracking-wider block opacity-80">
                    昵称
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={(e) => setDisplayName(e.currentTarget.value.trim())}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="输入您的昵称"
                    required
                    className="w-full min-h-[48px] px-4 rounded-2xl border text-sm font-serif outline-none transition-all apple-liquid-glass"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                    }}
                  />
                </div>

                {/* 账号 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-serif font-bold tracking-wider block opacity-80">
                    专属账号
                  </label>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    onBlur={(e) => setAccount(e.currentTarget.value.trim().toLowerCase())}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="输入专属账号（英文/数字）"
                    required
                    minLength={3}
                    className="w-full min-h-[48px] px-4 rounded-2xl border text-sm font-mono outline-none transition-all apple-liquid-glass"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                    }}
                  />
                </div>

                {/* 密码与确认密码 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-serif font-bold tracking-wider block opacity-80">
                      设置密码
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={(e) => setPassword(e.currentTarget.value)}
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="密码至少 6 位"
                        required
                        minLength={6}
                        className="w-full min-h-[48px] pl-4 pr-10 rounded-2xl border text-sm font-sans outline-none transition-all apple-liquid-glass"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-serif font-bold tracking-wider flex items-center justify-between opacity-80">
                      <span>确认密码</span>
                      {isPasswordMatch && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-serif flex items-center gap-0.5">
                          <CheckCircle2 size={11} /> 一致
                        </span>
                      )}
                      {isPasswordMismatch && (
                        <span className="text-[10px] text-red-500 font-serif flex items-center gap-0.5">
                          <AlertCircle size={11} /> 不一致
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={(e) => setConfirmPassword(e.currentTarget.value)}
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="再次输入密码"
                        required
                        minLength={6}
                        className="w-full min-h-[48px] pl-4 pr-10 rounded-2xl border text-sm font-sans outline-none transition-all apple-liquid-glass"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading || Boolean(isPasswordMismatch)}
                    className="w-full min-h-[48px] rounded-2xl text-white font-serif font-bold text-sm tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-95 disabled:opacity-50"
                    style={{
                      backgroundColor: currentTheme.primary
                    }}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>正在注册账号...</span>
                      </>
                    ) : (
                      <span>进入长卷</span>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* 底部禅意落款 */}
      <footer className="w-full max-w-4xl mx-auto flex items-center justify-center pb-2 text-center shrink-0">
        <p className="text-[11px] font-serif opacity-40 tracking-widest">
          岁华清照 · 拾年归处
        </p>
      </footer>
      </div>
    </div>,
    document.body
  );
};
