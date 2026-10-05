import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  X,
  User,
  Mail,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Copy,
  Check,
  ArrowLeft
} from 'lucide-react';
import {
  DomesticUser,
  updateDomesticUserProfile,
  setLocalDomesticUser,
  hashPassword,
  deregisterDomesticUser,
  sendEmailVerificationCode,
  verifyEmailCode
} from '../services/cloudSyncService';
import { compressImageFile } from './LocalImageUploader';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DomesticUser | null;
  onUserUpdated: (user: DomesticUser | null) => void;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
  onOpenAdminPortal?: () => void;
  onOpenCheckout?: () => void;
  appData?: any;
  onRestoreData?: (data: any) => void;
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  currentTheme,
  isDarkMode,
  showToast,
  onOpenCheckout
}) => {
  const [editingName, setEditingName] = useState(currentUser?.displayName || '');
  const [editingEmail, setEditingEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [isExitingWave, setIsExitingWave] = useState(false);
  const [showDeregisterConfirm, setShowDeregisterConfirm] = useState(false);
  const [isDeregistering, setIsDeregistering] = useState(false);

  // 邮箱换绑/绑定安全验证码状态
  const [bindOtp, setBindOtp] = useState('');
  const [bindCountdown, setBindCountdown] = useState(0);
  const [isSendingBindOtp, setIsSendingBindOtp] = useState(false);
  const [showBindOtpInput, setShowBindOtpInput] = useState(false);

  // 邮箱解绑专用安全验证状态
  const [unbindOtp, setUnbindOtp] = useState('');
  const [unbindCountdown, setUnbindCountdown] = useState(0);
  const [isSendingUnbindOtp, setIsSendingUnbindOtp] = useState(false);
  const [isUnbinding, setIsUnbinding] = useState(false);

  // 邮箱管理子模式：'idle'（查看/操作面板）| 'change'（换绑模式）| 'unbind'（解绑安全校验）
  const [emailSubMode, setEmailSubMode] = useState<'idle' | 'change' | 'unbind'>('idle');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveStartTimeRef = useRef<number>(0);

  // 换绑邮箱倒计时
  useEffect(() => {
    let timer: any = null;
    if (bindCountdown > 0) {
      timer = setTimeout(() => setBindCountdown(c => c - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [bindCountdown]);

  // 解绑邮箱倒计时
  useEffect(() => {
    let timer: any = null;
    if (unbindCountdown > 0) {
      timer = setTimeout(() => setUnbindCountdown(c => c - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [unbindCountdown]);

  // 实时头像状态：毫秒级同步渲染，彻底杜绝重合与显示延迟
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser?.photoURL || '');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const handleCopyAccount = () => {
    if (!currentUser?.account) return;
    try {
      navigator.clipboard.writeText(currentUser.account);
      setCopiedAccount(true);
      showToast('已复制用户账号');
      sound.playHapticClick();
      setTimeout(() => setCopiedAccount(false), 2000);
    } catch {
      showToast(`账号：${currentUser.account}`);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      setEditingName(currentUser.displayName || '');
      setEditingEmail(currentUser.email || '');
      setAvatarUrl(currentUser.photoURL || '');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsExitingWave(false);
      setShowDeregisterConfirm(false);
      setShowBindOtpInput(false);
      setBindOtp('');
      setUnbindOtp('');
      setEmailSubMode('idle');
    }
  }, [isOpen]);

  const handleCloseWithEffect = () => {
    if (isExitingWave) return;
    setIsExitingWave(true);
    waveStartTimeRef.current = Date.now();
    sound.playSealStamp();
    sound.playWaterDrop(920);
    setTimeout(() => {
      setIsExitingWave(false);
      onClose();
    }, 720);
  };

  // Canvas fluid wave exit background animation (Optimized: zero CPU cost when idle)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    if (!isExitingWave) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (waveStartTimeRef.current > 0) {
        const elapsed = (Date.now() - waveStartTimeRef.current) / 720;
        const progress = Math.min(1, Math.max(0, elapsed));
        const maxDist = Math.hypot(width, height);
        const currentWaveRadius = progress * maxDist * 1.35;

        const waveGrad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.max(0, currentWaveRadius - 160),
          width / 2,
          height / 2,
          currentWaveRadius
        );
        waveGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        waveGrad.addColorStop(0.7, `${currentTheme.primary}40`);
        waveGrad.addColorStop(1, `${currentTheme.primary}90`);

        ctx.fillStyle = waveGrad;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, currentWaveRadius, 0, Math.PI * 2);
        ctx.fill();

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(render);
        }
      }
    };

    animationFrameId = requestAnimationFrame(render);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, isExitingWave, currentTheme]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    try {
      sound.playWaterDrop(840);
      const compressed = await compressImageFile(file, 256, 256, 0.85);

      // 1. 本地状态即时刷新
      setAvatarUrl(compressed);

      // 2. 同步更新内存与 LocalStorage，保证扩展栏与其他视图 0ms 实时生效
      const updatedUser: DomesticUser = {
        ...currentUser,
        photoURL: compressed,
        updatedAt: new Date().toISOString()
      };
      setLocalDomesticUser(updatedUser);
      onUserUpdated(updatedUser);

      // 3. 异步持久化到云端，不阻碍本地渲染
      updateDomesticUserProfile({ photoURL: compressed }).catch(err => {
        console.warn('Firestore avatar sync failed, saved locally:', err);
      });

      sound.playZenBell();
      showToast('头像已更新');
    } catch (err) {
      console.error('Update avatar error:', err);
      showToast('头像更换失败');
    } finally {
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleUpdateName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    const fd = new FormData(e.currentTarget);
    const cleanName = ((fd.get('displayName') as string) || editingName).trim();
    if (!cleanName) {
      showToast('请输入新昵称');
      return;
    }
    if (cleanName === currentUser.displayName) {
      showToast('昵称未变更');
      return;
    }
    try {
      setIsSavingName(true);
      sound.playWaterDrop(880);

      // 同步即时更新
      const updatedUser: DomesticUser = {
        ...currentUser,
        displayName: cleanName,
        updatedAt: new Date().toISOString()
      };
      setLocalDomesticUser(updatedUser);
      onUserUpdated(updatedUser);

      await updateDomesticUserProfile({ displayName: cleanName });
      sound.playZenBell();
      showToast('昵称已更新');
    } catch (err) {
      showToast('更新失败');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSendBindOtp = async () => {
    const emailInput = document.querySelector('input[name="bindEmail"]') as HTMLInputElement;
    const cleanEmail = (emailInput?.value || editingEmail).trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('请输入有效的电子邮箱地址');
      return;
    }
    if (cleanEmail === (currentUser?.email || '').toLowerCase()) {
      showToast('当前已绑定该邮箱');
      return;
    }
    try {
      setIsSendingBindOtp(true);
      sound.playWaterDrop(880);
      const res = await sendEmailVerificationCode(cleanEmail, 'bind');
      setBindCountdown(60);
      setShowBindOtpInput(true);
      sound.playZenBell();
      showToast(res.message || '验证码已发送，请查收');
    } catch (err: any) {
      showToast(err.message || '发送验证码失败');
    } finally {
      setIsSendingBindOtp(false);
    }
  };

  const handleConfirmBind = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    const emailInput = document.querySelector('input[name="bindEmail"]') as HTMLInputElement;
    const otpInput = document.querySelector('input[name="bindOtp"]') as HTMLInputElement;
    const cleanEmail = (emailInput?.value || editingEmail).trim().toLowerCase();
    const cleanOtp = (otpInput?.value || bindOtp).trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('请输入有效的电子邮箱地址');
      return;
    }
    if (!cleanOtp || cleanOtp.length < 4) {
      showToast('请输入 6 位邮箱验证码');
      return;
    }

    try {
      setIsSavingEmail(true);
      sound.playWaterDrop(880);

      // 校验验证码合法性
      await verifyEmailCode(cleanEmail, cleanOtp, 'bind');

      const isRebind = !!currentUser.email;
      const updatedUser: DomesticUser = {
        ...currentUser,
        email: cleanEmail,
        updatedAt: new Date().toISOString()
      };
      setLocalDomesticUser(updatedUser);
      onUserUpdated(updatedUser);

      await updateDomesticUserProfile({ email: cleanEmail });
      sound.playZenBell();
      setShowBindOtpInput(false);
      setBindOtp('');
      setEmailSubMode('idle');
      showToast(isRebind ? '电子邮箱换绑成功' : '电子邮箱绑定成功');
    } catch (err: any) {
      showToast(err.message || '验证码错误或已失效');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSendUnbindOtp = async () => {
    if (!currentUser?.email) {
      showToast('当前尚未绑定邮箱');
      return;
    }
    try {
      setIsSendingUnbindOtp(true);
      sound.playWaterDrop(880);
      const res = await sendEmailVerificationCode(currentUser.email, 'unbind');
      setUnbindCountdown(60);
      sound.playZenBell();
      showToast(res.message || `解绑验证码已发送至 ${currentUser.email}`);
    } catch (err: any) {
      showToast(err.message || '发送解绑验证码失败');
    } finally {
      setIsSendingUnbindOtp(false);
    }
  };

  const handleConfirmUnbind = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!currentUser?.email) return;
    const unbindInput = document.querySelector('input[name="unbindOtp"]') as HTMLInputElement;
    const cleanUnbindOtp = (unbindInput?.value || unbindOtp).trim();
    if (!cleanUnbindOtp || cleanUnbindOtp.length < 4) {
      showToast('请输入 6 位解绑验证码');
      return;
    }

    try {
      setIsUnbinding(true);
      sound.playWaterDrop(880);

      // 校验解绑验证码
      await verifyEmailCode(currentUser.email, cleanUnbindOtp, 'unbind');

      const updatedUser: DomesticUser = {
        ...currentUser,
        email: undefined,
        updatedAt: new Date().toISOString()
      };
      setLocalDomesticUser(updatedUser);
      onUserUpdated(updatedUser);

      await updateDomesticUserProfile({ email: undefined });
      sound.playZenBell();
      setEmailSubMode('idle');
      setUnbindOtp('');
      setEditingEmail('');
      showToast('电子邮箱已成功解绑');
    } catch (err: any) {
      showToast(err.message || '解绑验证码错误或已失效');
    } finally {
      setIsUnbinding(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    const fd = new FormData(e.currentTarget);
    const pass = ((fd.get('newPassword') as string) || newPassword).trim();
    const confPass = ((fd.get('confirmNewPassword') as string) || confirmNewPassword).trim();

    if (!pass || pass.length < 4) {
      showToast('密码至少需要 4 位');
      return;
    }
    if (pass !== confPass) {
      showToast('两次输入的密码不一致');
      return;
    }
    try {
      setIsSavingPass(true);
      sound.playWaterDrop(880);
      const hashedPassword = await hashPassword(pass);

      const updatedUser: DomesticUser = {
        ...currentUser,
        passwordHash: hashedPassword,
        updatedAt: new Date().toISOString()
      };
      setLocalDomesticUser(updatedUser);
      onUserUpdated(updatedUser);

      await updateDomesticUserProfile({ passwordHash: hashedPassword });
      sound.playZenBell();
      showToast('密码设置成功');
      if (e.currentTarget) {
        e.currentTarget.reset();
      }
    } catch (err) {
      showToast('设置密码失败');
    } finally {
      setIsSavingPass(false);
    }
  };

  const handleLogout = () => {
    sound.playSealStamp();
    sound.playWaterDrop(600);
    setLocalDomesticUser(null);
    onUserUpdated(null);
    showToast('已退出登录');
    onClose();
  };

  const handleDeregister = async () => {
    if (!currentUser) return;
    try {
      setIsDeregistering(true);
      await deregisterDomesticUser(currentUser.uid);
      setLocalDomesticUser(null);
      onUserUpdated(null);
      sound.playZenBell(520);
      showToast('账号与邮箱已成功注销，期待与您江湖再会');
      setShowDeregisterConfirm(false);
      onClose();
    } catch {
      showToast('注销账号失败，请重试');
    } finally {
      setIsDeregistering(false);
    }
  };

  if (!isOpen || !currentUser) return null;

  const isPasswordMatch = newPassword && confirmNewPassword && newPassword === confirmNewPassword;
  const isPasswordMismatch = newPassword && confirmNewPassword && newPassword !== confirmNewPassword;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] overflow-y-auto custom-scrollbar select-none">
        {/* 背景 Canvas：用于支持令用户惊艳的流体水墨海浪消融退出动画 */}
        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* 全局全屏沉浸式页面主体 (一体化通体水墨弥散背景，零横线割裂，60FPS GPU硬件加速) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={
            isExitingWave
              ? { opacity: 0, y: -6 }
              : { opacity: 1, y: 0 }
          }
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative min-h-screen w-full flex flex-col z-10 transform-gpu"
          style={{
            backgroundColor: isDarkMode ? '#121815' : '#FAF8F5',
            color: isDarkMode ? '#FAF8F5' : '#223028',
            willChange: 'opacity, transform'
          }}
        >
          {/* 全屏通体统一水墨弥散底图与氛围光晕 (静态渲染+GPU加速，彻底解决显卡高斯模糊卡顿) */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 transform-gpu">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-full h-full object-cover scale-125 blur-3xl opacity-30 dark:opacity-20 transform-gpu"
                style={{ willChange: 'opacity' }}
              />
            ) : (
              <div
                className="w-full h-full opacity-30 dark:opacity-20 blur-3xl transform-gpu"
                style={{
                  background: `radial-gradient(circle at 50% 20%, ${currentTheme.primary}80, ${currentTheme.accent}60 50%, transparent 80%)`
                }}
              />
            )}
            {/* 全屏水墨通透柔光渐变 - 无缝贯通全屏，彻底消除割裂线 */}
            <div
              className="absolute inset-0"
              style={{
                background: isDarkMode
                  ? 'linear-gradient(to bottom, rgba(18,24,21,0.5) 0%, rgba(18,24,21,0.78) 45%, rgba(18,24,21,0.95) 100%)'
                  : 'linear-gradient(to bottom, rgba(250,248,245,0.45) 0%, rgba(250,248,245,0.75) 45%, rgba(250,248,245,0.95) 100%)'
              }}
            />
            {/* 顶部中央东方水墨泼彩主氛围晕染 */}
            <div
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-[520px] h-[360px] rounded-full blur-3xl pointer-events-none opacity-40"
              style={{ backgroundColor: currentTheme.primary }}
            />
            {/* 侧下方辅助弥散光晕 */}
            <div
              className="absolute bottom-10 right-10 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-25"
              style={{ backgroundColor: currentTheme.accent }}
            />
          </div>

          {/* 左上角精致悬浮返回按钮 (单向返回，保留返回，绝对无右上角关闭按钮) */}
          <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-30">
            <button
              type="button"
              onClick={handleCloseWithEffect}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 dark:bg-white/10 hover:bg-white/95 dark:hover:bg-white/20 border border-black/5 dark:border-white/15 backdrop-blur-md text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer shadow-xs group active:scale-95"
              title="返回主界面"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5 duration-200" />
              <span className="text-xs font-serif font-bold tracking-wider">返回</span>
            </button>
          </div>

          {/* 动画包裹层：流畅无缝浮现 (丝滑 60FPS) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.985, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex-1 flex flex-col z-10 transform-gpu"
          >
            {/* 1. 顶部身份展示区 (无任何生硬单色圆框，纯粹水墨晕染与无缝衔接) */}
            <div className="relative pt-12 sm:pt-16 pb-4 px-6 shrink-0 flex flex-col items-center justify-center text-center select-none z-10">
              {/* 居中悬浮纯净无界大头像 (96px) 与背后多层柔光呼吸泼彩晕染 */}
              <div
                className="relative z-10 group cursor-pointer mt-1"
                onClick={() => avatarInputRef.current?.click()}
                title="点击更换头像"
              >
                {/* 外层大范围水墨泼彩弥散色晕 (Splatter Bloom Glow) */}
                <div
                  className="absolute -inset-6 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-pulse pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${currentTheme.primary} 20%, ${currentTheme.accent} 60%, transparent 85%)`
                  }}
                />

                {/* 次层多重柔光呼吸光晕 (Multi-layer Ambient Soft Halo) */}
                <div
                  className="absolute -inset-2 rounded-full blur-xl opacity-85 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${currentTheme.accent} 20%, ${currentTheme.primary} 70%, transparent 90%)`
                  }}
                />

                {/* 纯净无边界大头像本体 (无任何生硬单色边框，纯悬浮质感) */}
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-2xl relative transition-transform duration-300 group-hover:scale-105 flex items-center justify-center"
                >
                  {avatarUrl ? (
                    <img
                      key={avatarUrl}
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={() => setAvatarUrl('')}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-serif font-bold text-white text-3xl select-none"
                      style={{
                        background: `linear-gradient(135deg, ${currentTheme.primary}, ${currentTheme.accent})`
                      }}
                    >
                      {currentUser.displayName?.[0] || '拾'}
                    </div>
                  )}
                </div>

              {/* 悬浮微晶相机换头像徽章 */}
              <div
                className="absolute bottom-0 right-0 p-2 rounded-full text-white shadow-lg backdrop-blur-md group-hover:scale-110 transition-transform cursor-pointer border border-white/40 dark:border-white/20"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.primary}, ${currentTheme.accent})`
                }}
                title="点击更换头像"
              >
                <Camera size={13} />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* 居中昵称 */}
            <h2
              className="mt-3.5 text-xl sm:text-2xl font-serif font-bold tracking-wide relative z-10 drop-shadow-2xs"
              style={{ color: isDarkMode ? '#FAF8F5' : '#1C2822' }}
            >
              {currentUser.displayName || '拾年墨客'}
            </h2>

            {/* 居中胶囊账号徽章 (点击复制) */}
            <button
              type="button"
              onClick={handleCopyAccount}
              title="点击复制账号"
              className="mt-2 relative z-10 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/15 hover:bg-white/90 dark:hover:bg-white/20 backdrop-blur-md text-xs font-mono tracking-tight transition-all cursor-pointer shadow-2xs group active:scale-95"
              style={{ color: isDarkMode ? 'rgba(250,248,245,0.85)' : 'rgba(34,48,40,0.85)' }}
            >
              <span className="opacity-70">账号:</span>
              <span className="font-semibold">{currentUser.account}</span>
              {copiedAccount ? (
                <Check size={12} className="text-emerald-500 ml-0.5" />
              ) : (
                <Copy size={12} className="opacity-50 group-hover:opacity-90 ml-0.5 transition-opacity" />
              )}
            </button>
          </div>

          {/* 2. 下方全透明极简表单区 (无缝融汇于水墨背景，无任何横线与纯白割裂) */}
          <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-12 space-y-6 z-10 relative">
            {/* 分组 1: 修改昵称 */}
            <form onSubmit={handleUpdateName} className="space-y-2">
              <label className="text-xs font-serif font-bold tracking-wider flex items-center gap-1.5 opacity-80">
                <User size={13} style={{ color: currentTheme.primary }} />
                <span>修改昵称</span>
              </label>

              <div
                className="relative flex items-center rounded-2xl border transition-all duration-300 backdrop-blur-md focus-within:ring-2"
                style={{
                  background: isDarkMode
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.35) 100%)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.03)'
                }}
              >
                <input
                  name="displayName"
                  type="text"
                  defaultValue={currentUser.displayName}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="输入新昵称"
                  required
                  className="w-full min-h-[48px] pl-4 pr-28 bg-transparent text-xs sm:text-sm font-serif outline-none"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <button
                    type="submit"
                    disabled={isSavingName}
                    className="px-4 py-2 rounded-xl text-white text-xs font-serif font-bold transition-all duration-200 cursor-pointer disabled:opacity-40 hover:brightness-110 active:scale-95 flex items-center gap-1 shadow-sm"
                    style={{
                      backgroundColor: currentTheme.primary,
                      color: '#FFFFFF',
                      boxShadow: `0 3px 12px ${currentTheme.primary}40`
                    }}
                  >
                    <span>{isSavingName ? '保存中' : '保存昵称'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* 分组 2: 绑定、换绑与解绑电子邮箱（全流程必须通过安全验证码核验） */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-bold tracking-wider flex items-center gap-1.5 opacity-80">
                  <Mail size={13} style={{ color: currentTheme.primary }} />
                  <span>电子邮箱</span>
                </label>
                {emailSubMode === 'change' && currentUser?.email && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playWaterDrop(740);
                      setEmailSubMode('idle');
                      setEditingEmail(currentUser.email || '');
                      setShowBindOtpInput(false);
                      setBindOtp('');
                    }}
                    className="text-[11px] font-serif opacity-60 hover:opacity-100 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    取消换绑
                  </button>
                )}
              </div>

              {/* Case 1: 用户当前已绑定邮箱，且处于默认查看状态 */}
              {currentUser.email && emailSubMode === 'idle' && (
                <div
                  className="p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between gap-2 transition-all duration-300"
                  style={{
                    background: isDarkMode
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.35) 100%)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.03)'
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-sans font-medium truncate" style={{ color: isDarkMode ? '#FAF8F5' : '#223028' }}>
                      {currentUser.email}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playWaterDrop(840);
                        setEmailSubMode('change');
                        setEditingEmail('');
                        setShowBindOtpInput(false);
                        setBindOtp('');
                      }}
                      className="px-4 py-2 rounded-xl text-white text-xs font-serif font-bold transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-95 shadow-sm"
                      style={{
                        backgroundColor: currentTheme.primary,
                        color: '#FFFFFF',
                        boxShadow: `0 3px 12px ${currentTheme.primary}40`
                      }}
                    >
                      换绑
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playWaterDrop(760);
                        setEmailSubMode('unbind');
                        setUnbindOtp('');
                        handleSendUnbindOtp();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-serif font-bold border border-red-500/30 text-red-500/90 hover:text-white hover:bg-red-500 transition-all duration-200 cursor-pointer active:scale-95 shadow-xs backdrop-blur-md"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)'
                      }}
                    >
                      解绑
                    </button>
                  </div>
                </div>
              )}

              {/* Case 2: 换绑邮箱模式 或 初始绑定模式 */}
              {(!currentUser.email || emailSubMode === 'change') && (
                <div
                  className="space-y-3 p-4 sm:p-5 rounded-2xl border backdrop-blur-md transition-all duration-300"
                  style={{
                    background: isDarkMode
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.35) 100%)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* 邮箱输入框 */}
                  <div
                    className="relative flex items-center rounded-2xl border transition-all duration-300 backdrop-blur-md focus-within:ring-2"
                    style={{
                      background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.45) 100%)',
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'
                    }}
                  >
                    <input
                      name="bindEmail"
                      type="email"
                      defaultValue={currentUser.email || ''}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="输入电子邮箱地址"
                      className="w-full min-h-[48px] pl-4 pr-32 bg-transparent text-xs sm:text-sm font-sans outline-none"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                      <button
                        type="button"
                        disabled={isSendingBindOtp || bindCountdown > 0}
                        onClick={handleSendBindOtp}
                        className="px-3.5 py-2 rounded-xl text-white text-xs font-serif font-bold transition-all duration-200 cursor-pointer disabled:opacity-40 hover:brightness-110 active:scale-95 shadow-sm"
                        style={{
                          backgroundColor: currentTheme.primary,
                          color: '#FFFFFF',
                          boxShadow: `0 3px 12px ${currentTheme.primary}40`
                        }}
                      >
                        {isSendingBindOtp ? '发送中...' : bindCountdown > 0 ? `${bindCountdown}s` : '获取验证码'}
                      </button>
                    </div>
                  </div>

                  {/* 展开的 6 位验证码输入与确认按钮 */}
                  {showBindOtpInput && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                        <input
                          name="bindOtp"
                          type="text"
                          maxLength={6}
                          defaultValue=""
                          autoComplete="one-time-code"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder="输入 6 位验证码"
                          className="sm:col-span-3 min-h-[48px] px-3.5 rounded-2xl border text-xs font-mono tracking-widest outline-none transition-all text-center font-bold backdrop-blur-md"
                          style={{
                            background: isDarkMode
                              ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)'
                              : 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.45) 100%)',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'
                          }}
                        />
                        <button
                          type="button"
                          disabled={isSavingEmail}
                          onClick={() => handleConfirmBind()}
                          className="sm:col-span-2 min-h-[48px] px-3 rounded-2xl text-xs font-serif font-bold text-white transition-all duration-200 shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-40 hover:brightness-110 active:scale-95"
                          style={{
                            backgroundColor: currentTheme.primary,
                            color: '#FFFFFF',
                            boxShadow: `0 3px 12px ${currentTheme.primary}40`
                          }}
                        >
                          {isSavingEmail ? '校验中...' : currentUser.email ? '确认换绑' : '确认绑定'}
                        </button>
                      </div>
                      <p className="text-[10px] font-serif opacity-60 text-center">
                        请查收邮件并将 6 位验证码填入校验
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Case 3: 解绑邮箱安全验证模式 */}
              {currentUser.email && emailSubMode === 'unbind' && (
                <div
                  className="space-y-3 p-4 sm:p-5 rounded-2xl border backdrop-blur-md transition-all duration-300"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.03)',
                    borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.18)',
                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.06)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-bold text-red-500/90 flex items-center gap-1.5">
                      <AlertCircle size={13} />
                      <span>安全校验 · 解绑当前邮箱</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playWaterDrop(740);
                        setEmailSubMode('idle');
                        setUnbindOtp('');
                      }}
                      className="text-[11px] font-serif text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      取消
                    </button>
                  </div>

                  <p className="text-[11px] font-serif opacity-75 leading-relaxed">
                    解绑需向当前绑定邮箱「<span className="font-mono font-medium">{currentUser.email}</span>」发送验证码以验证本人身份。
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1">
                    <input
                      name="unbindOtp"
                      type="text"
                      maxLength={6}
                      defaultValue=""
                      autoComplete="one-time-code"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="输入 6 位解绑码"
                      className="sm:col-span-3 min-h-[48px] px-3.5 rounded-2xl border text-xs font-mono tracking-widest outline-none transition-all text-center font-bold backdrop-blur-md"
                      style={{
                        background: isDarkMode
                          ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)'
                          : 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.45) 100%)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'
                      }}
                    />
                    <button
                      type="button"
                      disabled={isSendingUnbindOtp || unbindCountdown > 0}
                      onClick={handleSendUnbindOtp}
                      className="sm:col-span-2 min-h-[48px] px-3 rounded-2xl text-xs font-serif font-bold text-white transition-all duration-200 shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-40 hover:brightness-110 active:scale-95"
                      style={{
                        backgroundColor: currentTheme.primary,
                        color: '#FFFFFF',
                        boxShadow: `0 3px 12px ${currentTheme.primary}40`
                      }}
                    >
                      {isSendingUnbindOtp ? '发送中...' : unbindCountdown > 0 ? `${unbindCountdown}s 重发` : '获取验证码'}
                    </button>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isUnbinding}
                      onClick={() => handleConfirmUnbind()}
                      className="w-full min-h-[48px] rounded-2xl text-white text-xs font-serif font-bold transition-all duration-200 shadow-md flex items-center justify-center cursor-pointer disabled:opacity-40 hover:brightness-110 active:scale-95 border border-red-400/30"
                      style={{
                        background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                        boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)'
                      }}
                    >
                      {isUnbinding ? '解绑中...' : '确认解绑该邮箱'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 分组 3: 设置密码 */}
            <form onSubmit={handleChangePassword} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-bold tracking-wider flex items-center gap-1.5 opacity-80">
                  <Lock size={13} style={{ color: currentTheme.primary }} />
                  <span>设置密码</span>
                </label>
              </div>

              <div className="space-y-3">
                <div
                  className="flex items-center rounded-2xl border px-4 min-h-[48px] transition-all duration-300 backdrop-blur-md focus-within:ring-2"
                  style={{
                    background: isDarkMode
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.35) 100%)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.03)'
                  }}
                >
                  <input
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    defaultValue=""
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="输入新密码 (至少 4 位)"
                    required
                    minLength={4}
                    className="flex-1 bg-transparent text-xs sm:text-sm font-sans outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <div
                  className="flex items-center rounded-2xl border px-4 min-h-[48px] transition-all duration-300 backdrop-blur-md focus-within:ring-2"
                  style={{
                    background: isDarkMode
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.35) 100%)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.03)'
                  }}
                >
                  <input
                    name="confirmNewPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    defaultValue=""
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="再次确认新密码"
                    required
                    minLength={4}
                    className="flex-1 bg-transparent text-xs sm:text-sm font-sans outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSavingPass}
                    className="w-full min-h-[48px] rounded-2xl text-white text-xs font-serif font-bold transition-all duration-200 cursor-pointer disabled:opacity-40 hover:brightness-110 active:scale-95 shadow-md flex items-center justify-center"
                    style={{
                      backgroundColor: currentTheme.primary,
                      color: '#FFFFFF',
                      boxShadow: `0 4px 14px ${currentTheme.primary}45`
                    }}
                  >
                    {isSavingPass ? '保存中...' : '保存密码'}
                  </button>
                </div>
              </div>
            </form>

            {/* 分组 4: 退出登录与注销账号 (一体化无缝流排版，无任何割裂横线) */}
            <div className="pt-4 pb-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-3.5 px-4 rounded-2xl border text-neutral-700 dark:text-neutral-200 font-serif text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-95 backdrop-blur-md shadow-xs"
                style={{
                  background: isDarkMode
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.35) 100%)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                }}
              >
                <LogOut size={15} />
                <span>退出登录</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playWaterDrop(740);
                  setShowDeregisterConfirm(true);
                }}
                className="py-3.5 px-5 rounded-2xl border border-red-500/30 text-red-600/90 dark:text-red-400 font-serif text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-95 backdrop-blur-md shadow-xs"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)'
                }}
                title="注销此账号及解绑邮箱"
              >
                <Trash2 size={14} />
                <span>注销账号</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

        {/* 注销账号确认弹窗 */}
        <AnimatePresence>
          {showDeregisterConfirm && (
            <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl apple-liquid-glass space-y-4"
                style={{
                  backgroundColor: isDarkMode ? '#1A231F' : '#FFFFFF',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                }}
              >
                <div className="flex items-center justify-center">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.25)'
                    }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="text-center space-y-1.5">
                  <h3 className="font-serif font-bold text-base" style={{ color: isDarkMode ? '#FAF8F5' : '#223028' }}>
                    确认注销当前账号吗？
                  </h3>
                  <div
                    className="text-xs font-serif py-1 px-3 rounded-xl inline-block max-w-full truncate font-bold"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      color: isDarkMode ? '#C2CDC7' : '#4E5A52'
                    }}
                  >
                    {currentUser.displayName} · {currentUser.account}
                  </div>
                  <p className="text-[11px] opacity-70 font-serif leading-relaxed">
                    {currentUser.email ? `将彻底解绑邮箱「${currentUser.email}」并清除所有云端备份` : '将彻底清除所有个人档案与云端备份'}
                  </p>
                  <p className="text-[11px] text-red-500/90 font-serif pt-1">
                    注销后账号资格与邮箱将被完全释放，此操作不可撤销
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isDeregistering}
                    onClick={() => {
                      sound.playWaterDrop(740);
                      setShowDeregisterConfirm(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl border text-xs font-serif font-bold transition-all active:scale-95 cursor-pointer opacity-75 hover:opacity-100 disabled:opacity-50"
                    style={{
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={isDeregistering}
                    onClick={handleDeregister}
                    className="flex-1 py-2.5 rounded-xl text-white text-xs font-serif font-bold shadow-md transition-all active:scale-95 hover:brightness-110 cursor-pointer disabled:opacity-50"
                    style={{
                      backgroundColor: '#DC2626',
                      border: '1px solid #B91C1C'
                    }}
                  >
                    {isDeregistering ? '注销中...' : '确认注销'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>,
    document.body
  );
};
