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
  Trash2
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
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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

  // Canvas fluid wave exit background animation
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (isExitingWave && waveStartTimeRef.current > 0) {
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
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
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

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const cleanName = editingName.trim();
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
    const cleanEmail = editingEmail.trim().toLowerCase();
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

  const handleConfirmBind = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    const cleanEmail = editingEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('请输入有效的电子邮箱地址');
      return;
    }
    if (!bindOtp.trim() || bindOtp.trim().length < 4) {
      showToast('请输入 6 位邮箱验证码');
      return;
    }

    try {
      setIsSavingEmail(true);
      sound.playWaterDrop(880);

      // 校验验证码合法性
      await verifyEmailCode(cleanEmail, bindOtp.trim(), 'bind');

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

  const handleConfirmUnbind = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser?.email) return;
    if (!unbindOtp.trim() || unbindOtp.trim().length < 4) {
      showToast('请输入 6 位解绑验证码');
      return;
    }

    try {
      setIsUnbinding(true);
      sound.playWaterDrop(880);

      // 校验解绑验证码
      await verifyEmailCode(currentUser.email, unbindOtp.trim(), 'unbind');

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newPassword || newPassword.length < 4) {
      showToast('密码至少需要 4 位');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('两次输入的密码不一致');
      return;
    }
    try {
      setIsSavingPass(true);
      sound.playWaterDrop(880);
      const hashedPassword = await hashPassword(newPassword);

      const updatedUser: DomesticUser = {
        ...currentUser,
        passwordHash: hashedPassword,
        updatedAt: new Date().toISOString()
      };
      setLocalDomesticUser(updatedUser);
      onUserUpdated(updatedUser);

      await updateDomesticUserProfile({ passwordHash: hashedPassword });
      setNewPassword('');
      setConfirmNewPassword('');
      sound.playZenBell();
      showToast('密码设置成功');
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
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 select-none overflow-hidden">
        {/* 背景 Canvas：用于支持令用户惊艳的流体水墨海浪消融退出动画 */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* 背景遮罩：带有水墨消融退隐效果 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isExitingWave ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={handleCloseWithEffect}
          className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* 个人管理极简卡片（苹果极简主义 + 东方留白 + 严格视口自适应） */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={
            isExitingWave
              ? { scale: 0.94, opacity: 0, y: -10 }
              : { scale: 1, opacity: 1, y: 0 }
          }
          exit={{ scale: 0.94, opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md max-h-[85vh] rounded-[32px] overflow-hidden shadow-2xl z-10 border border-white/60 dark:border-white/15 apple-liquid-glass flex flex-col my-auto gpu-layer-isolate"
          style={{
            backgroundColor: isDarkMode ? 'rgba(18, 24, 21, 0.95)' : 'rgba(255, 253, 249, 0.97)',
            color: isDarkMode ? '#FAF8F5' : '#223028'
          }}
        >
          {/* 1. 顶部身份展示栏 (吸顶固定) */}
          <div className="p-5 sm:p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* 头像上传区 */}
              <div
                className="relative group cursor-pointer shrink-0"
                onClick={() => avatarInputRef.current?.click()}
                title="点击更换头像"
              >
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 shadow-sm flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{
                    borderColor: `${currentTheme.primary}70`,
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'
                  }}
                >
                  {avatarUrl ? (
                    <img
                      key={avatarUrl}
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={() => setAvatarUrl('')}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-serif font-bold text-white text-lg sm:text-xl select-none"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      {currentUser.displayName?.[0] || '拾'}
                    </div>
                  )}
                </div>

                <div
                  className="absolute bottom-0 left-0 -translate-x-1 translate-y-0.5 p-1.5 rounded-full text-white shadow-md border-2 border-white dark:border-[#141B18] group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: currentTheme.primary }}
                  title="点击更换头像"
                >
                  <Camera size={11} />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* 核心信息 */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <h3
                  className="text-base sm:text-lg font-serif font-bold truncate tracking-wide"
                  style={{ color: isDarkMode ? '#FAF8F5' : '#223028' }}
                >
                  {currentUser.displayName}
                </h3>
                <div className="text-xs opacity-60 font-mono tracking-tight">
                  账号: {currentUser.account}
                </div>
              </div>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={handleCloseWithEffect}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* 2. 核心操作表单（中间可滚动区域，丝滑自适应任何视口高度） */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
            {/* 分组 1: 修改昵称 */}
            <form onSubmit={handleUpdateName} className="space-y-1.5">
              <label className="text-xs font-serif font-bold tracking-wider flex items-center gap-1.5 opacity-80">
                <User size={13} style={{ color: currentTheme.primary }} />
                <span>修改昵称</span>
              </label>

              <div
                className="relative flex items-center rounded-2xl border transition-all apple-liquid-glass"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                }}
              >
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="输入新昵称"
                  required
                  className="w-full min-h-[44px] pl-4 pr-20 bg-transparent text-xs sm:text-sm font-serif outline-none"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <button
                    type="submit"
                    disabled={isSavingName || !editingName.trim() || editingName.trim() === currentUser.displayName}
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-serif font-bold transition-all cursor-pointer disabled:opacity-30 hover:opacity-95 shadow-2xs"
                    style={{
                      backgroundColor: currentTheme.primary
                    }}
                  >
                    {isSavingName ? '保存中' : '保存'}
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
                  className="p-3.5 rounded-2xl border apple-liquid-glass flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-sans font-medium truncate" style={{ color: isDarkMode ? '#FAF8F5' : '#223028' }}>
                      {currentUser.email}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playWaterDrop(840);
                        setEmailSubMode('change');
                        setEditingEmail('');
                        setShowBindOtpInput(false);
                        setBindOtp('');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-serif font-medium border transition-all cursor-pointer hover:opacity-90 active:scale-95"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                        color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
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
                      className="px-3 py-1.5 rounded-xl text-xs font-serif font-medium border border-red-500/20 text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer active:scale-95"
                    >
                      解绑
                    </button>
                  </div>
                </div>
              )}

              {/* Case 2: 换绑邮箱模式 或 初始绑定模式 */}
              {(!currentUser.email || emailSubMode === 'change') && (
                <div
                  className="space-y-2 p-3 rounded-2xl border apple-liquid-glass"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
                  }}
                >
                  {/* 邮箱输入框 */}
                  <div
                    className="relative flex items-center rounded-2xl border transition-all apple-liquid-glass"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                    }}
                  >
                    <input
                      type="email"
                      value={editingEmail}
                      onChange={(e) => {
                        setEditingEmail(e.target.value);
                      }}
                      placeholder="输入电子邮箱地址"
                      className="w-full min-h-[44px] pl-4 pr-24 bg-transparent text-xs sm:text-sm font-sans outline-none"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                      <button
                        type="button"
                        disabled={isSendingBindOtp || bindCountdown > 0 || !editingEmail.trim() || editingEmail.trim().toLowerCase() === (currentUser.email || '').toLowerCase()}
                        onClick={handleSendBindOtp}
                        className="px-3 py-1.5 rounded-xl text-white text-xs font-serif font-bold transition-all cursor-pointer disabled:opacity-30 hover:opacity-95 shadow-2xs"
                        style={{
                          backgroundColor: currentTheme.primary
                        }}
                      >
                        {isSendingBindOtp ? '发送中...' : bindCountdown > 0 ? `${bindCountdown}s` : '获取验证码'}
                      </button>
                    </div>
                  </div>

                  {/* 展开的 6 位验证码输入与确认按钮 */}
                  {showBindOtpInput && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={bindOtp}
                          onChange={(e) => setBindOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="输入 6 位验证码"
                          className="sm:col-span-3 min-h-[42px] px-3.5 rounded-2xl border text-xs font-mono tracking-widest outline-none transition-all apple-liquid-glass text-center font-bold"
                          style={{
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                          }}
                        />
                        <button
                          type="button"
                          disabled={isSavingEmail || !bindOtp.trim() || bindOtp.trim().length < 4}
                          onClick={() => handleConfirmBind()}
                          className="sm:col-span-2 min-h-[42px] px-3 rounded-2xl text-xs font-serif font-bold text-white transition-all shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-30 hover:opacity-95"
                          style={{
                            backgroundColor: currentTheme.primary
                          }}
                        >
                          {isSavingEmail ? '校验中...' : currentUser.email ? '确认换绑' : '确认绑定'}
                        </button>
                      </div>
                      <p className="text-[10px] font-serif opacity-60 text-center">
                        验证码已发送至 {editingEmail.trim()}，请查收邮件并填入校验
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Case 3: 解绑邮箱安全验证模式 */}
              {currentUser.email && emailSubMode === 'unbind' && (
                <div
                  className="space-y-2.5 p-4 rounded-2xl border apple-liquid-glass"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.04)' : 'rgba(239, 68, 68, 0.02)',
                    borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'
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

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={unbindOtp}
                      onChange={(e) => setUnbindOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="输入 6 位解绑码"
                      className="sm:col-span-3 min-h-[42px] px-3.5 rounded-2xl border text-xs font-mono tracking-widest outline-none transition-all apple-liquid-glass text-center font-bold"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                      }}
                    />
                    <button
                      type="button"
                      disabled={isSendingUnbindOtp || unbindCountdown > 0}
                      onClick={handleSendUnbindOtp}
                      className="sm:col-span-2 min-h-[42px] px-3 rounded-2xl text-xs font-serif font-medium border flex items-center justify-center cursor-pointer disabled:opacity-50 transition-all"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                        color: isDarkMode ? '#FAF8F5' : '#2B332E'
                      }}
                    >
                      {isSendingUnbindOtp ? '发送中...' : unbindCountdown > 0 ? `${unbindCountdown}s 后重发` : '获取验证码'}
                    </button>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isUnbinding || !unbindOtp.trim() || unbindOtp.trim().length < 4}
                      onClick={() => handleConfirmUnbind()}
                      className="w-full min-h-[40px] rounded-xl text-white text-xs font-serif font-bold transition-all shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-35 hover:brightness-110"
                      style={{
                        backgroundColor: '#DC2626'
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
                {isPasswordMatch && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-serif flex items-center gap-0.5">
                    <CheckCircle2 size={11} /> 密码一致
                  </span>
                )}
                {isPasswordMismatch && (
                  <span className="text-[10px] text-red-500 font-serif flex items-center gap-0.5">
                    <AlertCircle size={11} /> 两次密码不一致
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div
                  className="flex items-center rounded-2xl border px-3.5 min-h-[42px] transition-all apple-liquid-glass"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                  }}
                >
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="输入新密码"
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
                  className="flex items-center rounded-2xl border px-3.5 min-h-[42px] transition-all apple-liquid-glass"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                  }}
                >
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="再次确认新密码"
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

                <div className="pt-0.5 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingPass || !newPassword || newPassword.length < 4 || newPassword !== confirmNewPassword}
                    className="w-full min-h-[40px] rounded-xl text-white text-xs font-serif font-bold transition-all cursor-pointer disabled:opacity-30 hover:opacity-95"
                    style={{
                      backgroundColor: currentTheme.primary
                    }}
                  >
                    {isSavingPass ? '保存中' : '保存密码'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* 3. 底部退出登录与注销账号 (吸底固定，确保任何屏幕尺寸均完美可见) */}
          <div className="p-4 sm:p-5 border-t border-black/5 dark:border-white/10 shrink-0 bg-white/40 dark:bg-black/20 backdrop-blur-md flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 py-2 rounded-2xl border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 font-serif text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>退出登录</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playWaterDrop(740);
                setShowDeregisterConfirm(true);
              }}
              className="py-2 px-3.5 rounded-2xl border border-red-500/20 text-red-500/80 hover:text-red-500 hover:bg-red-500/10 font-serif text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="注销此账号及解绑邮箱"
            >
              <Trash2 size={13} />
              <span>注销账号</span>
            </button>
          </div>
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
