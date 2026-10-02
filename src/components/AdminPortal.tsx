import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  GitBranch,
  Radio,
  Trash2,
  RefreshCw,
  X,
  BarChart3,
  Send,
  Download,
  Copy,
  Check,
  Search,
  Edit2,
  AlertTriangle,
  Info,
  Flame,
  UserPlus,
  ArrowLeft,
  Mail,
  ShieldCheck,
  Crown,
  Key,
  Leaf,
  CheckCircle2,
  Camera
} from 'lucide-react';
import {
  DomesticUser,
  CloudAppVersion,
  CloudSystemNotice,
  listAllUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  listAllAppVersions,
  publishAppVersion,
  deleteAppVersion,
  listAllSystemNotices,
  publishSystemNotice,
  deleteSystemNotice,
  hashPassword,
  getLocalDomesticUser,
  setLocalDomesticUser,
  isAuthorUser,
  getSmtpConfig,
  fetchServerSmtpConfig,
  saveSmtpConfig,
  testSmtpConnection,
  SmtpConfig,
  listAllLicenseCodes,
  generateBatchLicenseCodes,
  deleteLicenseCode,
  adminSetUserLicenseStatus,
  fetchServerSystemSettings,
  saveServerSystemSettings
} from '../services/cloudSyncService';
import { compressImageFile } from './LocalImageUploader';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';

// 用户头像安全渲染器：支持 Base64 / 远程图片与首字徽标无缝回退
const UserListItemAvatar: React.FC<{ photoURL?: string; displayName?: string; primaryColor: string }> = ({
  photoURL,
  displayName,
  primaryColor
}) => {
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    setHasError(false);
  }, [photoURL]);
  return (
    <div
      className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 border"
      style={{ borderColor: `${primaryColor}40` }}
    >
      {photoURL && !hasError ? (
        <img
          src={photoURL}
          alt={displayName || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-serif font-bold text-white text-xs select-none"
          style={{ backgroundColor: primaryColor }}
        >
          {displayName?.slice(0, 1) || '拾'}
        </div>
      )}
    </div>
  );
};

// 细线极简几何微芒圆点（规避十字星，契合东方静谧与Apple微芒美学）
const ZenMicroDot = ({ color = '#D97706', size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className="shrink-0">
    <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth="1.2" strokeOpacity="0.5" />
    <circle cx="10" cy="10" r="4" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" strokeOpacity="0.8" />
    <circle cx="10" cy="10" r="1.8" fill={color} />
  </svg>
);

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
  currentUser?: DomesticUser | null;
  onUserUpdated?: (user: DomesticUser | null) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  isDarkMode,
  showToast,
  currentUser,
  onUserUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'versions' | 'notices' | 'commercial'>('dashboard');
  const [loading, setLoading] = useState(false);

  // 商业化与卡密授权状态
  const [licenseCodes, setLicenseCodes] = useState<any[]>([]);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [batchCount, setBatchCount] = useState<number>(5);
  const [batchNote, setBatchNote] = useState('后台批量生成');
  const [buyoutPrice, setBuyoutPrice] = useState(localStorage.getItem('sn_buyout_price') || '19.9');
  const [trialDays, setTrialDays] = useState(localStorage.getItem('sn_trial_days') || '7');
  const [payGatewayType, setPayGatewayType] = useState<'easypay' | 'code_only'>(
    (localStorage.getItem('sn_gateway_type') as any) === 'code_only' ? 'code_only' : 'easypay'
  );
  const [easypayUrl, setEasypayUrl] = useState(localStorage.getItem('sn_easypay_url') || '');
  const [easypayPid, setEasypayPid] = useState(localStorage.getItem('sn_easypay_pid') || '');
  const [easypayKey, setEasypayKey] = useState(localStorage.getItem('sn_easypay_key') || '');

  // 数据列表
  const [usersList, setUsersList] = useState<DomesticUser[]>([]);
  const [versionsList, setVersionsList] = useState<CloudAppVersion[]>([]);
  const [noticesList, setNoticesList] = useState<CloudSystemNotice[]>([]);

  // 退出流体海浪印章消融动画状态
  const [isExitingWave, setIsExitingWave] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveStartTimeRef = useRef<number>(0);

  // 1. 用户管理表单与深度买断授权状态
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [userLicenseFilter, setUserLicenseFilter] = useState<'all' | 'active' | 'trial'>('all');
  const [newAccount, setNewAccount] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const newAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newUserLicenseStatus, setNewUserLicenseStatus] = useState<'trial' | 'active'>('trial');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [operatingUserId, setOperatingUserId] = useState<string | null>(null);

  const handleNewAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      sound.playWaterDrop(840);
      const compressed = await compressImageFile(file, 256, 256, 0.85);
      setNewAvatar(compressed);
      showToast('新用户头像已加载');
    } catch {
      showToast('头像读取失败');
    } finally {
      if (newAvatarInputRef.current) newAvatarInputRef.current.value = '';
    }
  };

  // 卡密筛选模式
  const [codeFilter, setCodeFilter] = useState<'all' | 'unredeemed' | 'redeemed'>('all');

  // 用户编辑行状态
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<'user' | 'admin'>('user');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserLicenseStatus, setEditUserLicenseStatus] = useState<'trial' | 'active'>('trial');
  const [editUserLicenseKey, setEditUserLicenseKey] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // 2. 版本发布表单状态（直接置于新版本发布模块中）
  const [versionNumber, setVersionNumber] = useState('v1.2.6');
  const [versionTitle, setVersionTitle] = useState('全屏管理工作台与东方美学升级');
  const [versionChangelog, setVersionChangelog] = useState('1. 作者管理后台升级为主界面同款全屏空间\n2. 修复头像实时上传显示链路\n3. 全局上线水墨海浪退出动效\n4. 提供全平台独立安装与更新包下载');
  const [versionForceUpdate, setVersionForceUpdate] = useState(false);
  const [versionDownloadUrl, setVersionDownloadUrl] = useState('https://github.com/shinian-space/releases/download/v1.2.6/shiguang-v1.2.6.zip');
  const [isPublishingVersion, setIsPublishingVersion] = useState(false);
  const [copiedVersionId, setCopiedVersionId] = useState<string | null>(null);

  // 3. 广播表单状态（直接置于系统广播模块中）
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeLevel, setNoticeLevel] = useState<'info' | 'warning' | 'celebration'>('info');
  const [isPublishingNotice, setIsPublishingNotice] = useState(false);

  // 4. SMTP 邮件发信服务配置状态
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => getSmtpConfig());
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [smtpDiagnosticResult, setSmtpDiagnosticResult] = useState<{
    success: boolean;
    message: string;
    diagnostic?: string;
    elapsed?: number;
  } | null>(null);

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    sound.playWaterDrop(880);
    const updated: SmtpConfig = {
      ...smtpConfig,
      isConfigured: !!(smtpConfig.host && smtpConfig.user && smtpConfig.pass)
    };
    saveSmtpConfig(updated);
    setSmtpConfig(updated);
    sound.playZenBell();
    showToast('SMTP 邮件发信服务配置已保存');
    setIsSavingSmtp(false);
  };

  const handleSendTestEmail = async () => {
    if (!smtpConfig.host.trim() || !smtpConfig.user.trim() || !smtpConfig.pass.trim()) {
      showToast('请先完整填写 SMTP 主机地址、发信账号与授权码');
      return;
    }
    const target = testEmailAddress.trim() || smtpConfig.user.trim();
    if (!target || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      showToast('请输入有效的测试接收邮箱');
      return;
    }
    setIsSendingTestEmail(true);
    setSmtpDiagnosticResult(null);
    sound.playWaterDrop(920);

    try {
      const res = await testSmtpConnection(smtpConfig, target);
      sound.playZenBell();
      setSmtpDiagnosticResult({
        success: true,
        message: res.message,
        elapsed: res.elapsed
      });
      showToast(res.message);
    } catch (err: any) {
      sound.playHapticClick(600);
      setSmtpDiagnosticResult({
        success: false,
        message: err.message || 'SMTP 测试发信失败',
        diagnostic: err.message
      });
      showToast('SMTP 发信测试未通过，请查看下方诊断排查提示');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // 全站统一删除确认弹窗状态
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'version' | 'notice' | 'user';
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  const refreshAllData = async () => {
    setLoading(true);
    try {
      const [u, v, n, codes] = await Promise.all([
        listAllUsers(),
        listAllAppVersions().catch(() => []),
        listAllSystemNotices(),
        listAllLicenseCodes().catch(() => [])
      ]);
      setUsersList(u || []);
      setVersionsList(v || []);
      setLicenseCodes(codes || []);

      // 彻底清理并过滤掉“十年云端漫游上线”及其他遗留无用通知
      const cleanedNotices = (n || []).filter(
        item => !item.title.includes('十年云端漫游') && !item.title.includes('漫游上线')
      );
      setNoticesList(cleanedNotices);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      showToast('拉取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCommercialConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playWaterDrop(880);
    const cleanTrialDays = Math.max(0, parseInt(trialDays.trim(), 10) || 0);
    const cleanBuyoutPrice = Math.max(0, parseFloat(buyoutPrice.trim()) || 19.9);

    await saveServerSystemSettings({
      trialDays: cleanTrialDays,
      buyoutPrice: cleanBuyoutPrice,
      easypayUrl: easypayUrl.trim(),
      easypayPid: easypayPid.trim(),
      easypayKey: easypayKey.trim()
    });

    localStorage.setItem('sn_buyout_price', String(cleanBuyoutPrice));
    localStorage.setItem('sn_trial_days', String(cleanTrialDays));
    localStorage.setItem('sn_gateway_type', payGatewayType);
    localStorage.setItem('sn_easypay_url', easypayUrl.trim());
    localStorage.setItem('sn_easypay_pid', easypayPid.trim());
    localStorage.setItem('sn_easypay_key', easypayKey.trim());

    // 触发全局 storage 事件以同步各模块权限状态
    window.dispatchEvent(new Event('storage'));

    sound.playZenBell();
    showToast(
      cleanTrialDays === 0
        ? '商业买断配置已生效：体验天数已设为 0 天（全站即刻阻断未买断创作）'
        : `商业买断配置已生效：体验天数 ${cleanTrialDays} 天，买断价格 ¥${cleanBuyoutPrice}`
    );
  };

  const handleGenerateBatchCodes = async () => {
    try {
      setIsGeneratingCodes(true);
      sound.playWaterDrop(880);
      await generateBatchLicenseCodes(batchCount, batchNote.trim() || '后台批量生成');
      const latestCodes = await listAllLicenseCodes();
      setLicenseCodes(latestCodes);
      sound.playZenBell();
      showToast(`已成功生成 ${batchCount} 个买断授权激活卡密并同步至云端`);
    } catch (err: any) {
      showToast(err.message || '生成激活码失败');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const handleDeleteCode = async (code: string) => {
    try {
      sound.playWaterDrop(760);
      await deleteLicenseCode(code);
      setLicenseCodes(prev => prev.filter(c => c.code !== code));
      showToast(`激活卡密 ${code} 已删除`);
    } catch (err: any) {
      showToast('删除激活卡密失败');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsExitingWave(false);
      refreshAllData();
      fetchServerSystemSettings().then(st => {
        if (st) {
          if (st.trialDays !== undefined) setTrialDays(String(st.trialDays));
          if (st.buyoutPrice !== undefined) setBuyoutPrice(String(st.buyoutPrice));
          if (st.easypayUrl !== undefined) setEasypayUrl(st.easypayUrl);
          if (st.easypayPid !== undefined) setEasypayPid(st.easypayPid);
          if (st.easypayKey !== undefined) setEasypayKey(st.easypayKey);
        }
      });
      fetchServerSmtpConfig().then(cfg => {
        if (cfg && cfg.user && cfg.pass) {
          setSmtpConfig(cfg);
        }
      });
    }
  }, [isOpen]);

  // 触发令用户赞赏的退出流体海浪印章消融动画
  const triggerWaveExit = useCallback(() => {
    if (isExitingWave) return;
    setIsExitingWave(true);
    waveStartTimeRef.current = Date.now();
    sound.playSealStamp();
    sound.playWaterDrop(920);

    setTimeout(() => {
      onClose();
    }, 750);
  }, [isExitingWave, onClose]);

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
        const elapsed = (Date.now() - waveStartTimeRef.current) / 750;
        const progress = Math.min(1, Math.max(0, elapsed));
        const maxDist = Math.hypot(width, height);
        const currentWaveRadius = progress * maxDist * 1.35;

        const waveGrad = ctx.createRadialGradient(
          0,
          height,
          Math.max(0, currentWaveRadius - 160),
          0,
          height,
          currentWaveRadius
        );
        waveGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        waveGrad.addColorStop(0.7, `${currentTheme.primary}40`);
        waveGrad.addColorStop(1, `${currentTheme.primary}90`);

        ctx.fillStyle = waveGrad;
        ctx.beginPath();
        ctx.arc(0, height, currentWaveRadius, 0, Math.PI * 2);
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

  // 1. 用户管理操作
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.trim() || !newDisplayName.trim() || !newPassword) {
      showToast('请完整填写新用户信息');
      return;
    }
    if (newEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      showToast('请输入有效的电子邮箱格式');
      return;
    }
    if (newPassword.length < 4) {
      showToast('密码至少需要 4 位');
      return;
    }
    try {
      setIsCreatingUser(true);
      sound.playWaterDrop(880);
      const created = await adminCreateUser({
        account: newAccount.trim().toLowerCase(),
        displayName: newDisplayName.trim(),
        email: newEmail.trim().toLowerCase() || undefined,
        passwordPlain: newPassword,
        role: newRole,
        licenseStatus: newUserLicenseStatus,
        photoURL: newAvatar || undefined
      });

      if (newUserLicenseStatus === 'active') {
        const customKey = `NEW_GRANT_${Date.now().toString(36).toUpperCase()}`;
        await adminSetUserLicenseStatus(created.uid, 'active', customKey);
        created.licenseStatus = 'active';
        created.licensedAt = new Date().toISOString();
        created.licenseKey = customKey;
      } else {
        await adminSetUserLicenseStatus(created.uid, 'trial', '');
        created.licenseStatus = 'trial';
        created.licenseKey = '';
      }

      setUsersList(prev => [created, ...prev.filter(u => u.uid !== created.uid)]);
      setNewAccount('');
      setNewEmail('');
      setNewDisplayName('');
      setNewPassword('');
      setNewAvatar('');
      setNewUserLicenseStatus('trial');
      setNewRole('user');
      sound.playZenBell();
      showToast(`已成功添加用户 ${created.displayName}`);
    } catch (err: any) {
      showToast(err.message || '添加用户失败');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleStartEditUser = (user: DomesticUser) => {
    sound.playHapticClick(700);
    setEditingUserId(user.uid);
    setEditUserName(user.displayName);
    setEditUserEmail(user.email || '');
    setEditUserRole(user.role || 'user');
    setEditUserPassword('');
    setEditUserLicenseStatus(user.licenseStatus === 'active' || user.role === 'admin' ? 'active' : 'trial');
    setEditUserLicenseKey(user.licenseKey || '');
  };

  const handleSaveEditUser = async (uid: string) => {
    if (!editUserName.trim()) {
      showToast('昵称不能为空');
      return;
    }
    try {
      setIsSavingUser(true);
      sound.playWaterDrop(880);
      const updates: Partial<DomesticUser> = {
        displayName: editUserName.trim(),
        role: editUserRole,
        email: editUserEmail.trim() || undefined,
        licenseStatus: editUserLicenseStatus,
        licenseKey: editUserLicenseStatus === 'active' ? (editUserLicenseKey.trim() || `SN_MANUAL_${Date.now().toString(36).toUpperCase()}`) : '',
        licensedAt: editUserLicenseStatus === 'active' ? new Date().toISOString() : undefined
      };
      if (editUserPassword.trim()) {
        if (editUserPassword.trim().length < 4) {
          showToast('新密码至少需要 4 位');
          setIsSavingUser(false);
          return;
        }
        updates.passwordHash = await hashPassword(editUserPassword.trim());
      }
      await adminUpdateUser(uid, updates);
      setUsersList(prev => prev.map(u => (u.uid === uid ? { ...u, ...updates } : u)));
      setEditingUserId(null);

      // 同步当前账号状态：如果自降权限为普通用户，自动退出管理后台
      const self = getLocalDomesticUser();
      if (self && self.uid === uid) {
        const updatedSelf: DomesticUser = { ...self, ...updates };
        setLocalDomesticUser(updatedSelf);
        if (updates.role && updates.role !== 'admin') {
          sound.playSealStamp();
          showToast('当前账号管理员权限已被撤销，正在离开管理后台...');
          setTimeout(() => {
            triggerWaveExit();
          }, 800);
        }
      }

      sound.playZenBell();
      showToast('用户档案与买断授权已更新');
    } catch (err) {
      showToast('保存失败');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id, title } = deleteConfirm;
    try {
      sound.playHapticClick(700);
      if (type === 'version') {
        await deleteAppVersion(id);
        setVersionsList(prev => prev.filter(v => v.versionId !== id));
        showToast(`已删除版本 ${title}`);
      } else if (type === 'notice') {
        await deleteSystemNotice(id);
        setNoticesList(prev => prev.filter(n => n.noticeId !== id));
        showToast(`已删除系统广播通知`);
      } else if (type === 'user') {
        await adminDeleteUser(id);
        setUsersList(prev => prev.filter(u => u.uid !== id));
        if (editingUserId === id) setEditingUserId(null);
        showToast(`已成功注销该用户，释放邮箱与账号登录资格`);
      }
      sound.playWaterDrop(840);
    } catch (err: any) {
      showToast('删除操作失败，请重试');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteUser = (uid: string, name: string, email?: string) => {
    setDeleteConfirm({
      type: 'user',
      id: uid,
      title: name || '该用户',
      subtitle: email ? `绑定邮箱：${email}（注销后彻底释放此邮箱与账号）` : '注销此账号档案及释放登录名'
    });
  };

  // 2. 版本发布操作
  const handlePublishVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionNumber.trim() || !versionTitle.trim() || !versionChangelog.trim()) {
      showToast('请完整填写版本信息');
      return;
    }
    if (!versionDownloadUrl.trim()) {
      showToast('请提供有效的下载链接，以便用户下载');
      return;
    }
    try {
      setIsPublishingVersion(true);
      sound.playWaterDrop(950);
      const newVersion: CloudAppVersion = {
        versionId: `ver_${Date.now()}`,
        versionNumber: versionNumber.trim(),
        title: versionTitle.trim(),
        releaseDate: new Date().toLocaleDateString('zh-CN'),
        changelog: versionChangelog.trim(),
        isForceUpdate: versionForceUpdate,
        downloadUrl: versionDownloadUrl.trim(),
        author: getLocalDomesticUser()?.displayName || '拾年 · 作者',
        createdAt: new Date().toISOString()
      };
      await publishAppVersion(newVersion);
      showToast(`已成功发布版本「${versionNumber}」`);
      sound.playZenBell();
      setVersionsList(prev => [newVersion, ...prev.filter(v => v.versionId !== newVersion.versionId)]);
      setVersionNumber('');
      setVersionTitle('');
      setVersionChangelog('');
    } catch (err: any) {
      showToast('发布失败：' + err.message);
    } finally {
      setIsPublishingVersion(false);
    }
  };

  const handleDeleteVersion = (versionId: string, verNum: string, title?: string) => {
    setDeleteConfirm({
      type: 'version',
      id: versionId,
      title: `版本 ${verNum}`,
      subtitle: title ? `《${title}》` : '该版本的更新日志及关联链接'
    });
  };

  const handleCopyDownloadUrl = (v: CloudAppVersion) => {
    if (!v.downloadUrl) return;
    navigator.clipboard.writeText(v.downloadUrl);
    setCopiedVersionId(v.versionId);
    sound.playWaterDrop(840);
    showToast('下载链接已复制到剪贴板');
    setTimeout(() => setCopiedVersionId(null), 2000);
  };

  // 3. 系统广播操作
  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      showToast('请填写标题和内容');
      return;
    }
    try {
      setIsPublishingNotice(true);
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
      setNoticesList(prev => [newNotice, ...prev.filter(n => n.noticeId !== newNotice.noticeId)]);
      setNoticeTitle('');
      setNoticeContent('');
      sound.playZenBell();
      showToast('系统广播已成功发布');
    } catch (err: any) {
      showToast('发布失败：' + err.message);
    } finally {
      setIsPublishingNotice(false);
    }
  };

  const handleDeleteNotice = (noticeId: string, title?: string) => {
    setDeleteConfirm({
      type: 'notice',
      id: noticeId,
      title: title ? `广播「${title}」` : '该系统广播',
      subtitle: '此广播内容将从云端及客户端全量同步删除'
    });
  };

  if (!isOpen) return null;

  const currentAdmin = getLocalDomesticUser();
  const isAuthorizedAdmin = isAuthorUser(currentAdmin) || currentAdmin?.role === 'admin' || currentAdmin?.userNumber === '00001' || currentAdmin?.userNumber === '0001';

  if (!isAuthorizedAdmin) {
    return createPortal(
      <AnimatePresence>
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 select-none ${isDarkMode ? 'dark-zen-theme dark' : ''}`}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="relative z-10 max-w-sm w-full p-6 rounded-3xl apple-liquid-glass border border-red-500/20 text-center space-y-4 shadow-2xl"
            style={{
              backgroundColor: isDarkMode ? 'rgba(18, 24, 21, 0.96)' : 'rgba(255, 253, 249, 0.98)',
              color: isDarkMode ? '#FAF8F5' : '#223028'
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif font-bold text-base">权限不足 · 仅限系统管理者访问</h3>
              <p className="text-xs font-serif opacity-70 leading-relaxed">
                管理后台包含全域用户治理、系统通告与发信网关等核心运维模块，仅限系统管理员及作者使用。
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-serif font-bold text-white shadow-sm cursor-pointer transition-all hover:opacity-95"
              style={{ backgroundColor: currentTheme.primary }}
            >
              返回前台
            </button>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    );
  }

  const filteredUsers = usersList.filter(u => {
    if (userRoleFilter !== 'all') {
      const targetRole = userRoleFilter === 'admin' ? 'admin' : 'user';
      if ((u.role || 'user') !== targetRole) return false;
    }
    if (userLicenseFilter !== 'all') {
      const isBuyout = u.licenseStatus === 'active' || isAuthorUser(u);
      if (userLicenseFilter === 'active' && !isBuyout) return false;
      if (userLicenseFilter === 'trial' && isBuyout) return false;
    }
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.account || '').toLowerCase().includes(q) ||
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.userNumber || '').includes(q) ||
      (u.licenseKey || '').toLowerCase().includes(q)
    );
  });

  const filteredLicenseCodes = licenseCodes.filter(c => {
    if (codeFilter === 'unredeemed') return !c.redeemedBy;
    if (codeFilter === 'redeemed') return !!c.redeemedBy;
    return true;
  });

  return createPortal(
    <AnimatePresence>
      <motion.div
        animate={
          isExitingWave
            ? { opacity: 0, scale: 0.96, filter: 'blur(8px)' }
            : { opacity: 1, scale: 1, filter: 'blur(0px)' }
        }
        transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed inset-0 z-[10000] flex flex-col overflow-hidden select-text ${isDarkMode ? 'dark-zen-theme dark' : ''}`}
        style={{
          backgroundColor: isDarkMode ? '#101412' : '#FAF8F5',
          color: isDarkMode ? '#FAF8F5' : '#223028'
        }}
      >
        {/* 背景 Canvas：用于支持令用户惊艳的流体水墨海浪消融退出动画 */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* ================= 1. 深度对齐主界面：顶部悬浮导航动态岛胶囊 ================= */}
        <div className="absolute top-[max(var(--safe-area-top,16px),env(safe-area-inset-top,16px),1rem)] left-3.5 right-3.5 sm:left-4 sm:right-4 z-30 pointer-events-none select-none flex items-center justify-center">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="apple-liquid-glass pointer-events-auto rounded-full px-3.5 py-1.5 flex items-center justify-between gap-2.5 max-w-xl w-full border border-white/85 dark:border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06),inset_0_1px_1.5px_0_rgba(255,255,255,0.95)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_1.5px_0_rgba(255,255,255,0.18)] transition-all"
          >
            {/* 左侧：返回箭头按键（直接触发水墨退隐平滑回缩动效，简洁无赘述） */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={triggerWaveExit}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.08] hover:bg-black/[0.06] dark:hover:bg-white/[0.14] active:scale-95 shadow-2xs"
              style={{ color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark }}
              title="返回空间"
            >
              <ArrowLeft size={16} />
            </motion.button>

            {/* 中间：管理中枢核心品牌指示 */}
            <div className="flex items-center gap-2 select-none">
              <div
                className="w-2 h-2 rounded-full shrink-0 animate-pulse transition-colors duration-500 shadow-xs"
                style={{ backgroundColor: currentTheme.primary }}
              />
              <span
                className="text-base font-bold tracking-widest font-serif leading-none select-none shrink-0 drop-shadow-2xs"
                style={{
                  fontFamily: '"Noto Serif SC", "Ma Shan Zheng", Georgia, serif',
                  color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
                }}
              >
                管理中枢
              </span>
            </div>

            {/* 右侧：刷新数据按键 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={refreshAllData}
              disabled={loading}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.08] hover:bg-black/[0.06] dark:hover:bg-white/[0.14] active:scale-95 shadow-2xs"
              style={{ color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark }}
              title="刷新数据"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </motion.button>
          </motion.div>
        </div>

        {/* 顶部遮罩虚化光晕：彻底消除卡片向上滚动时的穿透与重叠冲突 */}
        <div
          className="absolute top-0 left-0 right-0 h-28 pointer-events-none z-20 transition-colors"
          style={{
            background: isDarkMode
              ? 'linear-gradient(to bottom, #101412 0%, rgba(16,20,18,0.92) 55%, transparent 100%)'
              : 'linear-gradient(to bottom, #FAF8F5 0%, rgba(250,248,245,0.92) 55%, transparent 100%)'
          }}
        />

        {/* ================= 2. 核心主内容区（参照用户主界面间距，呼吸留白恰到好处） ================= */}
        <main className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-8 pt-[5.25rem] sm:pt-24 pb-36 max-w-4xl w-full mx-auto custom-scrollbar select-text">
          {/* ================= 模块 1: 运行概览 ================= */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* 核心指标矩阵 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: '用户总数', val: usersList.length, icon: Users, color: currentTheme.primary },
                  { label: '发布版本', val: versionsList.length, icon: GitBranch, color: '#3B82F6' },
                  { label: '系统广播', val: noticesList.length, icon: Radio, color: '#10B981' },
                  { label: '空间活跃度', val: '99.9%', icon: BarChart3, color: '#F59E0B' }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-3xl border transition-all apple-liquid-glass"
                      style={{
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                      }}
                    >
                      <div className="flex items-center justify-between opacity-70 mb-2">
                        <span className="text-xs font-serif">{item.label}</span>
                        <Icon size={15} style={{ color: item.color }} />
                      </div>
                      <div className="text-xl sm:text-2xl font-mono font-bold tracking-tight">
                        {item.val}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SMTP 真实邮件发信服务配置卡片（精简无重叠排版 + 智能诊断与一键预设） */}
              <div
                className="p-5 sm:p-6 rounded-[28px] border apple-liquid-glass space-y-4"
                style={{
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Mail size={16} style={{ color: currentTheme.primary }} />
                    <h3 className="text-sm font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5]">
                      SMTP 邮件发信服务网关
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold shrink-0 self-start sm:self-auto ${
                      smtpConfig.isConfigured
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-black/5 dark:bg-white/10 opacity-70'
                    }`}
                  >
                    {smtpConfig.isConfigured ? '已启用真实发信通道' : '未配置 (使用本地安全模式)'}
                  </span>
                </div>

                {/* 常用服务商 1 键预设胶囊 */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-serif opacity-70">
                    快速填充服务商配置：
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'QQ 邮箱', host: 'smtp.qq.com', port: 465 },
                      { name: '163 网易邮箱', host: 'smtp.163.com', port: 465 },
                      { name: 'Gmail', host: 'smtp.gmail.com', port: 465 },
                      { name: 'Outlook', host: 'smtp-mail.outlook.com', port: 587 },
                      { name: '腾讯企业邮', host: 'smtp.exmail.qq.com', port: 465 },
                      { name: '阿里企业邮', host: 'smtp.qiye.aliyun.com', port: 465 }
                    ].map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          sound.playWaterDrop(840);
                          setSmtpConfig(prev => ({
                            ...prev,
                            host: preset.host,
                            port: preset.port
                          }));
                          showToast(`已填充 ${preset.name} 服务器地址与端口`);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-serif border border-black/8 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSaveSmtp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-serif font-medium opacity-80 block">
                        SMTP 服务器地址 (Host)
                      </label>
                      <input
                        type="text"
                        value={smtpConfig.host}
                        onChange={e => setSmtpConfig(prev => ({ ...prev, host: e.target.value.trim() }))}
                        placeholder="如: smtp.qq.com 或 smtp.163.com"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-serif font-medium opacity-80 block">
                        SMTP 端口 (Port)
                      </label>
                      <input
                        type="number"
                        value={smtpConfig.port}
                        onChange={e => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value, 10) || 465 }))}
                        placeholder="465 (SSL) / 587 (TLS)"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-serif font-medium opacity-80 block">
                        发信邮箱账号 (User / From)
                      </label>
                      <input
                        type="email"
                        value={smtpConfig.user}
                        onChange={e => setSmtpConfig(prev => ({ ...prev, user: e.target.value.trim() }))}
                        placeholder="如: service@qq.com"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs font-sans border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-serif font-medium opacity-80 block">
                        授权码 / 密钥 (Auth Pass/Key)
                      </label>
                      <input
                        type="password"
                        value={smtpConfig.pass}
                        onChange={e => setSmtpConfig(prev => ({ ...prev, pass: e.target.value }))}
                        placeholder="邮箱服务商生成的 16 位 POP3/SMTP 专用授权码"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                  </div>

                  {/* 实时诊断反馈控制台 */}
                  {smtpDiagnosticResult && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs font-serif leading-relaxed ${
                        smtpDiagnosticResult.success
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        {smtpDiagnosticResult.success ? '✓ 发信诊断：联调测试通过' : '✕ 发信诊断：网络握手或授权异常'}
                      </div>
                      <div className="whitespace-pre-wrap opacity-90">
                        {smtpDiagnosticResult.diagnostic || smtpDiagnosticResult.message}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="email"
                        value={testEmailAddress}
                        onChange={e => setTestEmailAddress(e.target.value.trim())}
                        placeholder="输入测试收信邮箱 (留空默认为发信账号)"
                        className="px-3.5 py-2 rounded-xl text-xs font-sans border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 focus:outline-none flex-1 min-w-0"
                      />
                      <button
                        type="button"
                        disabled={isSendingTestEmail}
                        onClick={handleSendTestEmail}
                        className="px-3.5 py-2 rounded-xl text-xs font-serif font-medium border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        {isSendingTestEmail ? '握手测试中...' : '测试发信'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingSmtp}
                      className="px-5 py-2 rounded-xl text-xs font-serif font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 hover:opacity-95"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      <ShieldCheck size={14} />
                      <span>保存 SMTP 配置</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ================= 模块 2: 用户管理（深度适配商业买断授权机制） ================= */}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* 用户核心概览指标 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: '用户总数', val: usersList.length, icon: Users, color: currentTheme.primary },
                  {
                    label: '终身买断用户',
                    val: usersList.filter(u => u.licenseStatus === 'active' || isAuthorUser(u)).length,
                    icon: Crown,
                    color: '#F59E0B'
                  },
                  {
                    label: '试用体验用户',
                    val: usersList.filter(u => u.licenseStatus !== 'active' && !isAuthorUser(u)).length,
                    icon: Leaf,
                    color: '#10B981'
                  },
                  {
                    label: '已绑定邮箱',
                    val: usersList.filter(u => !!u.email).length,
                    icon: Mail,
                    color: '#3B82F6'
                  }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-3xl border transition-all apple-liquid-glass"
                      style={{
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                      }}
                    >
                      <div className="flex items-center justify-between opacity-70 mb-2">
                        <span className="text-xs font-serif">{item.label}</span>
                        <Icon size={15} style={{ color: item.color }} />
                      </div>
                      <div className="text-xl sm:text-2xl font-mono font-bold tracking-tight">
                        {item.val}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 添加用户表单（极简留白 + 买断授权选项） */}
              <form
                onSubmit={handleCreateUser}
                className="p-5 sm:p-6 rounded-3xl border apple-liquid-glass space-y-4"
                style={{
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }}
              >
                <div className="flex items-center gap-2">
                  <UserPlus size={15} style={{ color: currentTheme.primary }} />
                  <h3 className="text-xs font-serif font-bold">添加新用户</h3>
                </div>

                {/* 账号上方正中间新增专属头像上传 */}
                <div className="flex flex-col items-center justify-center py-2">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => newAvatarInputRef.current?.click()}
                  >
                    <div
                      className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-2 shadow-sm relative transition-transform group-hover:scale-105"
                      style={{
                        borderColor: currentTheme.primary,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                      }}
                    >
                      {newAvatar ? (
                        <img src={newAvatar} alt="New User Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center text-white font-serif font-bold text-xs select-none"
                          style={{ backgroundColor: currentTheme.primary }}
                        >
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-serif">
                        {newAvatar ? '更换头像' : '上传头像'}
                      </div>
                    </div>
                  </div>
                  <input
                    ref={newAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleNewAvatarFileChange}
                  />
                  <span className="text-[10px] font-serif opacity-60 mt-1.5">
                    {newAvatar ? '头像已准备就绪' : '点击上传新用户专属头像（可选）'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] opacity-70 block mb-1 font-serif">账号</label>
                    <input
                      type="text"
                      required
                      value={newAccount}
                      onChange={e => setNewAccount(e.target.value.toLowerCase().trim())}
                      placeholder="账号"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-mono border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] opacity-70 block mb-1 font-serif">昵称</label>
                    <input
                      type="text"
                      required
                      value={newDisplayName}
                      onChange={e => setNewDisplayName(e.target.value)}
                      placeholder="昵称"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] opacity-70 block mb-1 font-serif">密码</label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="至少 4 位"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-sans border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 权限角色选择 */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs opacity-75 font-serif">权限：</label>
                      <div className="relative p-1 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06] flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playWaterDrop(760);
                            setNewRole('user');
                          }}
                          className={`relative z-10 px-3 py-1 rounded-xl text-xs font-serif transition-colors duration-200 cursor-pointer ${
                            newRole === 'user'
                              ? 'font-bold text-[#2B332E] dark:text-[#FAF8F5]'
                              : 'opacity-65 hover:opacity-100 text-[#6E7C75] dark:text-[#A7B4AD]'
                          }`}
                        >
                          {newRole === 'user' && (
                            <motion.div
                              layoutId="new-user-role-pill"
                              className="absolute inset-0 rounded-xl bg-white dark:bg-white/15 shadow-sm border border-black/5 dark:border-white/10"
                              transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10">普通用户</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            sound.playWaterDrop(840);
                            setNewRole('admin');
                          }}
                          className={`relative z-10 px-3 py-1 rounded-xl text-xs font-serif transition-colors duration-200 cursor-pointer ${
                            newRole === 'admin'
                              ? 'font-bold text-[#2B332E] dark:text-[#FAF8F5]'
                              : 'opacity-65 hover:opacity-100 text-[#6E7C75] dark:text-[#A7B4AD]'
                          }`}
                        >
                          {newRole === 'admin' && (
                            <motion.div
                              layoutId="new-user-role-pill"
                              className="absolute inset-0 rounded-xl bg-white dark:bg-white/15 shadow-sm border border-black/5 dark:border-white/10"
                              transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10">管理员</span>
                        </button>
                      </div>
                    </div>

                    {/* 买断授权初始状态 */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs opacity-75 font-serif">授权：</label>
                      <div className="relative p-1 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06] flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playWaterDrop(760);
                            setNewUserLicenseStatus('trial');
                          }}
                          className={`relative z-10 px-3 py-1 rounded-xl text-xs font-serif transition-colors duration-200 cursor-pointer ${
                            newUserLicenseStatus === 'trial'
                              ? 'font-bold text-[#2B332E] dark:text-[#FAF8F5]'
                              : 'opacity-65 hover:opacity-100 text-[#6E7C75] dark:text-[#A7B4AD]'
                          }`}
                        >
                          {newUserLicenseStatus === 'trial' && (
                            <motion.div
                              layoutId="new-user-license-pill"
                              className="absolute inset-0 rounded-xl bg-white dark:bg-white/15 shadow-sm border border-black/5 dark:border-white/10"
                              transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10">体验用户</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            sound.playWaterDrop(840);
                            setNewUserLicenseStatus('active');
                          }}
                          className={`relative z-10 px-3 py-1 rounded-xl text-xs font-serif transition-colors duration-200 cursor-pointer flex items-center gap-1 ${
                            newUserLicenseStatus === 'active'
                              ? 'font-bold text-amber-700 dark:text-amber-300'
                              : 'opacity-65 hover:opacity-100 text-[#6E7C75] dark:text-[#A7B4AD]'
                          }`}
                        >
                          {newUserLicenseStatus === 'active' && (
                            <motion.div
                              layoutId="new-user-license-pill"
                              className="absolute inset-0 rounded-xl bg-amber-500/20 shadow-sm border border-amber-500/30"
                              transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                            />
                          )}
                          <Crown size={11} className="relative z-10 text-amber-500" />
                          <span className="relative z-10">直接开通买断</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="px-5 py-2 rounded-xl text-xs font-serif font-bold text-white shadow-xs cursor-pointer hover:opacity-95 disabled:opacity-50"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    {isCreatingUser ? '添加中...' : '添加用户'}
                  </button>
                </div>
              </form>

              {/* 用户检索与管理列表 */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 mr-1">
                      <Users size={15} style={{ color: currentTheme.primary }} />
                      <span className="text-xs font-serif font-bold">
                        用户列表 ({filteredUsers.length})
                      </span>
                    </div>

                    {/* 权限角色过滤分段胶囊 */}
                    <div className="relative p-0.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.05] flex items-center">
                      {(['all', 'user', 'admin'] as const).map(rf => {
                        const isSel = userRoleFilter === rf;
                        const label = rf === 'all' ? '全部角色' : rf === 'user' ? '普通用户' : '管理员';
                        return (
                          <button
                            key={rf}
                            type="button"
                            onClick={() => {
                              sound.playWaterDrop(780);
                              setUserRoleFilter(rf);
                            }}
                            className={`relative z-10 px-2.5 py-1 rounded-lg text-[11px] font-serif transition-colors duration-200 cursor-pointer ${
                              isSel
                                ? 'font-bold text-[#2B332E] dark:text-[#FAF8F5]'
                                : 'opacity-60 hover:opacity-90 text-[#6E7C75] dark:text-[#A7B4AD]'
                            }`}
                          >
                            {isSel && (
                              <motion.div
                                layoutId="user-list-role-filter-pill"
                                className="absolute inset-0 rounded-lg bg-white dark:bg-white/15 shadow-2xs border border-black/5 dark:border-white/10"
                                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                              />
                            )}
                            <span className="relative z-10">{label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* 买断状态过滤分段胶囊 */}
                    <div className="relative p-0.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.05] flex items-center">
                      {(['all', 'active', 'trial'] as const).map(lf => {
                        const isSel = userLicenseFilter === lf;
                        const label = lf === 'all' ? '全部授权' : lf === 'active' ? '已买断' : '体验中';
                        return (
                          <button
                            key={lf}
                            type="button"
                            onClick={() => {
                              sound.playWaterDrop(780);
                              setUserLicenseFilter(lf);
                            }}
                            className={`relative z-10 px-2.5 py-1 rounded-lg text-[11px] font-serif transition-colors duration-200 cursor-pointer flex items-center gap-1 ${
                              isSel
                                ? 'font-bold text-[#2B332E] dark:text-[#FAF8F5]'
                                : 'opacity-60 hover:opacity-90 text-[#6E7C75] dark:text-[#A7B4AD]'
                            }`}
                          >
                            {isSel && (
                              <motion.div
                                layoutId="user-list-license-filter-pill"
                                className="absolute inset-0 rounded-lg bg-white dark:bg-white/15 shadow-2xs border border-black/5 dark:border-white/10"
                                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                              />
                            )}
                            {lf === 'active' && <Crown size={10} className="relative z-10 text-amber-500" />}
                            <span className="relative z-10">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      placeholder="搜索账号 / 昵称 / 卡密"
                      className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredUsers.map(u => {
                    const isBuyout = u.licenseStatus === 'active' || isAuthorUser(u);
                    const isOperating = operatingUserId === u.uid;
                    return (
                      <div
                        key={u.uid}
                        className="p-4 rounded-2xl border transition-all apple-liquid-glass"
                        style={{
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                        }}
                      >
                        {editingUserId === u.uid ? (
                          /* 编辑状态：全面支持昵称、邮箱、密码、角色与买断授权调整 */
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              <div>
                                <label className="text-[10px] opacity-60 block mb-1">修改昵称</label>
                                <input
                                  type="text"
                                  value={editUserName}
                                  onChange={e => setEditUserName(e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-lg text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] opacity-60 block mb-1">绑定邮箱 (清空即解绑)</label>
                                <input
                                  type="email"
                                  value={editUserEmail}
                                  onChange={e => setEditUserEmail(e.target.value)}
                                  placeholder="未绑定电子邮箱"
                                  className="w-full px-3 py-1.5 rounded-lg text-xs font-sans border border-black/10 dark:border-white/10 bg-transparent"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] opacity-60 block mb-1">重置密码 (留空则不改)</label>
                                <input
                                  type="password"
                                  value={editUserPassword}
                                  onChange={e => setEditUserPassword(e.target.value)}
                                  placeholder="新密码"
                                  className="w-full px-3 py-1.5 rounded-lg text-xs font-sans border border-black/10 dark:border-white/10 bg-transparent"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="text-[10px] opacity-60 block mb-1">权限角色</label>
                                <div className="relative p-0.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06] flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      sound.playWaterDrop(760);
                                      setEditUserRole('user');
                                    }}
                                    className={`relative z-10 flex-1 py-1 px-2 rounded-lg text-xs font-serif transition-colors duration-200 cursor-pointer text-center ${
                                      editUserRole === 'user'
                                        ? 'font-bold text-[#2B332E] dark:text-[#FAF8F5]'
                                        : 'opacity-60 hover:opacity-100 text-[#6E7C75] dark:text-[#A7B4AD]'
                                    }`}
                                  >
                                    {editUserRole === 'user' && (
                                      <motion.div
                                        layoutId={`edit-user-role-pill-${u.uid}`}
                                        className="absolute inset-0 rounded-lg bg-white dark:bg-white/15 shadow-2xs border border-black/5 dark:border-white/10"
                                        transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                                      />
                                    )}
                                    <span className="relative z-10">普通用户</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      sound.playWaterDrop(840);
                                      setEditUserRole('admin');
                                    }}
                                    className={`relative z-10 flex-1 py-1 px-2 rounded-lg text-xs font-serif transition-colors duration-200 cursor-pointer text-center ${
                                      editUserRole === 'admin'
                                        ? 'font-bold text-[#2B332E] dark:text-[#FAF8F5]'
                                        : 'opacity-60 hover:opacity-100 text-[#6E7C75] dark:text-[#A7B4AD]'
                                    }`}
                                  >
                                    {editUserRole === 'admin' && (
                                      <motion.div
                                        layoutId={`edit-user-role-pill-${u.uid}`}
                                        className="absolute inset-0 rounded-lg bg-white dark:bg-white/15 shadow-2xs border border-black/5 dark:border-white/10"
                                        transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                                      />
                                    )}
                                    <span className="relative z-10">管理员</span>
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] opacity-60 block mb-1">终身买断授权状态</label>
                                <div className="relative p-0.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06] flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      sound.playWaterDrop(760);
                                      setEditUserLicenseStatus('trial');
                                    }}
                                    className={`relative z-10 flex-1 py-1 px-2 rounded-lg text-xs font-serif transition-colors duration-200 cursor-pointer text-center ${
                                      editUserLicenseStatus === 'trial'
                                        ? 'font-bold text-[#2B332E] dark:text-[#FAF8F5]'
                                        : 'opacity-60 hover:opacity-100 text-[#6E7C75] dark:text-[#A7B4AD]'
                                    }`}
                                  >
                                    {editUserLicenseStatus === 'trial' && (
                                      <motion.div
                                        layoutId={`edit-user-license-pill-${u.uid}`}
                                        className="absolute inset-0 rounded-lg bg-white dark:bg-white/15 shadow-2xs border border-black/5 dark:border-white/10"
                                        transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                                      />
                                    )}
                                    <span className="relative z-10">体验用户</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      sound.playWaterDrop(840);
                                      setEditUserLicenseStatus('active');
                                    }}
                                    className={`relative z-10 flex-1 py-1 px-2 rounded-lg text-xs font-serif transition-colors duration-200 cursor-pointer text-center flex items-center justify-center gap-1 ${
                                      editUserLicenseStatus === 'active'
                                        ? 'font-bold text-amber-700 dark:text-amber-300'
                                        : 'opacity-60 hover:opacity-100 text-[#6E7C75] dark:text-[#A7B4AD]'
                                    }`}
                                  >
                                    {editUserLicenseStatus === 'active' && (
                                      <motion.div
                                        layoutId={`edit-user-license-pill-${u.uid}`}
                                        className="absolute inset-0 rounded-lg bg-amber-500/20 shadow-2xs border border-amber-500/30"
                                        transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                                      />
                                    )}
                                    <Crown size={11} className="relative z-10 text-amber-500" />
                                    <span className="relative z-10">已终身买断</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {editUserLicenseStatus === 'active' && (
                              <div>
                                <label className="text-[10px] opacity-60 block mb-1 font-mono">
                                  绑定卡密 / 授权凭证号 (可选)
                                </label>
                                <input
                                  type="text"
                                  value={editUserLicenseKey}
                                  onChange={e => setEditUserLicenseKey(e.target.value)}
                                  placeholder="如: SHINIAN-XXXX-XXXX-XXXX 或系统自动生成"
                                  className="w-full px-3 py-1.5 rounded-lg text-xs font-mono border border-black/10 dark:border-white/10 bg-transparent"
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              {!isAuthorUser(u) ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.uid, u.displayName, u.email)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-serif text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-1 border border-red-500/20"
                                  title="注销该用户账号"
                                >
                                  <Trash2 size={12} />
                                  <span>删除账号</span>
                                </button>
                              ) : <div />}

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  className="px-3 py-1 rounded-lg text-xs font-serif border border-black/10 dark:border-white/10 opacity-70 cursor-pointer hover:opacity-100"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingUser}
                                  onClick={() => handleSaveEditUser(u.uid)}
                                  className="px-4 py-1 rounded-lg text-xs font-serif font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                                  style={{ backgroundColor: currentTheme.primary }}
                                >
                                  {isSavingUser ? '保存中' : '保存修改'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* 展示状态：深度适配买断授权胶囊标签、卡密凭据与一键快捷授权 */
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <UserListItemAvatar
                                photoURL={u.photoURL}
                                displayName={u.displayName}
                                primaryColor={currentTheme.primary}
                              />

                              <div className="min-w-0">
                                <div className="text-xs font-serif font-bold flex items-center gap-2 truncate">
                                  <span>{u.displayName || '未命名'}</span>
                                  <span className="text-[9px] font-mono opacity-40 font-normal">#{u.userNumber}</span>
                                  
                                  {/* 买断状态胶囊徽章 */}
                                  {isBuyout ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-serif font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 flex items-center gap-1">
                                      <Crown size={10} className="text-amber-500" />
                                      <span>已终身买断</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-serif bg-black/5 dark:bg-white/10 opacity-70">
                                      体验用户
                                    </span>
                                  )}

                                  {u.role === 'admin' && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-serif font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300">
                                      管理员
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] opacity-65 font-mono flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                  <span>账号: {u.account}</span>
                                  {u.email ? (
                                    <span className="text-[#5B7B6D] dark:text-[#A7D1BF]">· 邮箱: {u.email}</span>
                                  ) : (
                                    <span className="opacity-40">· 未绑定邮箱</span>
                                  )}
                                  {u.licenseKey && (
                                    <span className="text-amber-600 dark:text-amber-400">· 卡密: {u.licenseKey}</span>
                                  )}
                                  <span>·</span>
                                  <span>
                                    {u.licensedAt
                                      ? `买断于: ${new Date(u.licensedAt).toLocaleDateString('zh-CN')}`
                                      : `注册: ${new Date(u.createdAt).toLocaleDateString('zh-CN')}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => handleStartEditUser(u)}
                                className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-serif shadow-2xs"
                                title="编辑档案与修改密码"
                              >
                                <Edit2 size={13} />
                                <span className="hidden sm:inline">编辑</span>
                              </button>
                              {!isAuthorUser(u) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.uid, u.displayName, u.email)}
                                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-500 hover:text-red-600 transition-all cursor-pointer flex items-center gap-1 text-xs font-serif shadow-2xs"
                                  title="注销删除该用户账号"
                                >
                                  <Trash2 size={13} />
                                  <span className="hidden sm:inline">删除</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= 模块 3: 新版本发布（自动展示发布表单与带真实下载链接的版本流） ================= */}
          {activeTab === 'versions' && (
            <motion.div
              key="versions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* 发布新版本表单（极简留白） */}
              <form
                onSubmit={handlePublishVersion}
                className="p-5 sm:p-6 rounded-3xl border apple-liquid-glass space-y-4"
                style={{
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }}
              >
                <div className="flex items-center gap-2">
                  <Download size={15} style={{ color: currentTheme.primary }} />
                  <h3 className="text-xs font-serif font-bold">发布新版本</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] opacity-70 block mb-1 font-serif">版本号</label>
                    <input
                      type="text"
                      required
                      value={versionNumber}
                      onChange={e => setVersionNumber(e.target.value)}
                      placeholder="例如：v1.2.6"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-mono border border-black/10 dark:border-white/10 bg-transparent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] opacity-70 block mb-1 font-serif">版本主题</label>
                    <input
                      type="text"
                      required
                      value={versionTitle}
                      onChange={e => setVersionTitle(e.target.value)}
                      placeholder="版本简述"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] opacity-70 block mb-1 font-serif">下载链接</label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={versionDownloadUrl}
                      onChange={e => setVersionDownloadUrl(e.target.value)}
                      placeholder="https://... 安装包下载链接"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-mono border border-black/10 dark:border-white/10 bg-transparent focus:outline-none"
                    />
                    <Download size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] opacity-70 block mb-1 font-serif">更新日志</label>
                  <textarea
                    rows={3}
                    required
                    value={versionChangelog}
                    onChange={e => setVersionChangelog(e.target.value)}
                    placeholder="更新说明"
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none custom-scrollbar"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={versionForceUpdate}
                      onChange={e => setVersionForceUpdate(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs font-serif opacity-80">设为强制更新</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isPublishingVersion}
                    className="px-5 py-2 rounded-xl text-xs font-serif font-bold text-white shadow-xs cursor-pointer hover:opacity-95 disabled:opacity-50"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    {isPublishingVersion ? '发布中...' : '发布版本'}
                  </button>
                </div>
              </form>

              {/* 已发布版本流 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GitBranch size={15} style={{ color: currentTheme.primary }} />
                  <span className="text-xs font-serif font-bold">
                    版本发布历史 ({versionsList.length})
                  </span>
                </div>

                <div className="space-y-3">
                  {versionsList.map(v => (
                    <div
                      key={v.versionId}
                      className="p-5 rounded-2xl border transition-all space-y-3 apple-liquid-glass"
                      style={{
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold text-white"
                            style={{ backgroundColor: currentTheme.primary }}
                          >
                            {v.versionNumber}
                          </span>
                          <span className="text-sm font-serif font-bold">{v.title}</span>
                          {v.isForceUpdate && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-serif bg-amber-500/20 text-amber-600 dark:text-amber-400">
                              重要更新
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs opacity-50 font-mono">{v.releaseDate}</span>
                          <button
                            onClick={() => handleDeleteVersion(v.versionId, v.versionNumber, v.title)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="删除版本"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-serif opacity-75 whitespace-pre-wrap leading-relaxed">
                        {v.changelog}
                      </p>

                      {/* 下载链接区域（方便用户直接获取安装包或复制） */}
                      <div
                        className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        style={{
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Download size={14} className="shrink-0 opacity-60" />
                          <span className="text-xs font-mono truncate opacity-80">
                            {v.downloadUrl || '无可用下载链接'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {v.downloadUrl && (
                            <>
                              <button
                                onClick={() => handleCopyDownloadUrl(v)}
                                className="px-3 py-1 rounded-lg text-xs font-serif border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {copiedVersionId === v.versionId ? (
                                  <>
                                    <Check size={12} className="text-emerald-500" />
                                    <span>已复制</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>复制链接</span>
                                  </>
                                )}
                              </button>

                              <a
                                href={v.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-1 rounded-lg text-xs font-serif font-bold text-white shadow-xs flex items-center gap-1 hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: currentTheme.primary }}
                              >
                                <Download size={12} />
                                <span>立即下载</span>
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= 模块 4: 系统广播（深度调色适配三色卡片，删除十年云端漫游冗余标签） ================= */}
          {activeTab === 'notices' && (
            <motion.div
              key="notices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* 自动展示：发布广播表单 */}
              <form
                onSubmit={handlePublishNotice}
                className="p-5 sm:p-6 rounded-[28px] border apple-liquid-glass space-y-4"
                style={{
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio size={16} style={{ color: currentTheme.primary }} />
                    <h3 className="text-xs font-serif font-bold">发布全域系统广播</h3>
                  </div>
                  <span className="text-[11px] opacity-50">实时同步推送给全部在线与离线访客</span>
                </div>

                <div>
                  <label className="text-[11px] opacity-70 block mb-1">广播标题</label>
                  <input
                    type="text"
                    required
                    value={noticeTitle}
                    onChange={e => setNoticeTitle(e.target.value)}
                    placeholder="输入广播标题"
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] opacity-70 block mb-1">广播详细内容</label>
                  <textarea
                    rows={3}
                    required
                    value={noticeContent}
                    onChange={e => setNoticeContent(e.target.value)}
                    placeholder="输入广播详细正文..."
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-serif border border-black/10 dark:border-white/10 bg-transparent focus:outline-none custom-scrollbar"
                  />
                </div>

                {/* 深度适配调色板与美术的三选一广播类型卡片（极简无废话） */}
                <div className="space-y-1.5">
                  <label className="text-[11px] opacity-70 block font-serif">广播类型：</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: 'info',
                        label: '常规通知',
                        icon: Info,
                        color: currentTheme.primary
                      },
                      {
                        id: 'warning',
                        label: '重要提醒',
                        icon: AlertTriangle,
                        color: '#D97706'
                      },
                      {
                        id: 'celebration',
                        label: '活动庆典',
                        icon: Flame,
                        color: '#E11D48'
                      }
                    ].map(type => {
                      const Icon = type.icon;
                      const isSelected = noticeLevel === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            sound.playWaterDrop(840);
                            setNoticeLevel(type.id as any);
                          }}
                          className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'shadow-xs font-bold scale-[1.02]'
                              : 'opacity-65 hover:opacity-100 hover:scale-[1.01]'
                          }`}
                          style={{
                            borderColor: isSelected ? type.color : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                            backgroundColor: isSelected ? `${type.color}18` : (isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                            color: isSelected ? type.color : 'inherit'
                          }}
                        >
                          <Icon size={13} style={{ color: isSelected ? type.color : undefined }} />
                          <span className="text-xs font-serif">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPublishingNotice}
                    className="px-6 py-2 rounded-xl text-xs font-serif font-bold text-white shadow-xs cursor-pointer flex items-center gap-1.5 hover:opacity-95 disabled:opacity-50"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    <Send size={13} />
                    <span>{isPublishingNotice ? '发布中...' : '立即发布广播'}</span>
                  </button>
                </div>
              </form>

              {/* 广播历史（已彻底清除“十年云端漫游上线”及冗余标签） */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Radio size={15} style={{ color: currentTheme.primary }} />
                  <span className="text-xs font-serif font-bold">
                    当前广播列表 ({noticesList.length})
                  </span>
                </div>

                <div className="space-y-2.5">
                  {noticesList.length === 0 ? (
                    <div className="p-8 text-center text-xs opacity-50 border border-dashed rounded-3xl">
                      暂无系统广播
                    </div>
                  ) : (
                    noticesList.map(n => {
                      const levelColor =
                        n.level === 'warning'
                          ? '#D97706'
                          : n.level === 'celebration'
                          ? '#E11D48'
                          : currentTheme.primary;
                      const levelLabel =
                        n.level === 'warning'
                          ? '重要提醒'
                          : n.level === 'celebration'
                          ? '活动庆典'
                          : '常规通知';

                      return (
                        <div
                          key={n.noticeId}
                          className="p-4 sm:p-5 rounded-2xl border transition-all space-y-2 apple-liquid-glass"
                          style={{
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-[10px] px-2.5 py-0.5 rounded-full font-serif font-bold"
                                style={{
                                  backgroundColor: `${levelColor}20`,
                                  color: levelColor
                                }}
                              >
                                {levelLabel}
                              </span>
                              <span className="text-xs sm:text-sm font-serif font-bold">
                                {n.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] opacity-40 font-mono">
                                {new Date(n.createdAt).toLocaleDateString('zh-CN')}
                              </span>
                              <button
                                onClick={() => handleDeleteNotice(n.noticeId, n.title)}
                                className="p-1 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="删除广播"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs font-serif opacity-75 whitespace-pre-wrap leading-relaxed">
                            {n.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= 模块 5: 商业化与授权控制台 ================= */}
          {activeTab === 'commercial' && (
            <motion.div
              key="commercial"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* 核心商业指标 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: '终身买断用户', val: usersList.filter(u => u.licenseStatus === 'active' || u.role === 'admin').length, icon: Crown, color: '#F59E0B' },
                  { label: '试用体验用户', val: usersList.filter(u => u.licenseStatus !== 'active' && u.role !== 'admin').length, icon: Users, color: currentTheme.primary },
                  { label: '可用激活卡密', val: licenseCodes.filter(c => !c.redeemedBy).length, icon: Key, color: '#10B981' },
                  { label: '预设买断价格', val: `¥${buyoutPrice}`, icon: Crown, color: '#6366F1' }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-3xl border transition-all apple-liquid-glass"
                      style={{
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                      }}
                    >
                      <div className="flex items-center justify-between opacity-70 mb-2">
                        <span className="text-xs font-serif">{item.label}</span>
                        <Icon size={15} style={{ color: item.color }} />
                      </div>
                      <div className="text-xl sm:text-2xl font-mono font-bold tracking-tight">
                        {item.val}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 支付网关对接与定价配置卡片 */}
              <form
                onSubmit={handleSaveCommercialConfig}
                className="p-5 sm:p-6 rounded-[28px] border apple-liquid-glass space-y-4"
                style={{
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Crown size={16} style={{ color: currentTheme.primary }} />
                    <h3 className="text-sm font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5]">
                      商业化定价与支付网关配置
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-serif font-medium opacity-80 block">
                      终身买断单价 (元)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={buyoutPrice}
                      onChange={e => setBuyoutPrice(e.target.value)}
                      placeholder="19.9"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono apple-glass-input focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-serif font-medium opacity-80 block">
                      新用户体验天数 (设为0即刻拦截)
                    </label>
                    <input
                      type="number"
                      value={trialDays}
                      onChange={e => setTrialDays(e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono apple-glass-input focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-serif font-medium opacity-80 block">
                      支付网关接入模式
                    </label>
                    <select
                      value={payGatewayType}
                      onChange={e => setPayGatewayType(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs font-serif apple-glass-input focus:outline-none cursor-pointer"
                    >
                      <option value="easypay">个人免签聚合易支付 (支持微信/支付宝)</option>
                      <option value="code_only">纯官方激活卡密模式 (免签约)</option>
                    </select>
                  </div>
                </div>

                {payGatewayType === 'easypay' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-serif font-bold opacity-85">
                        个人免签聚合易支付（EasyPay）通信参数
                      </div>
                      <span className="text-[11px] font-serif opacity-50">
                        配置后前台将自动调用生成真实收银码并秒级监听状态
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] opacity-60 block mb-1">易支付 API 接口地址</label>
                        <input
                          type="url"
                          value={easypayUrl}
                          onChange={e => setEasypayUrl(e.target.value)}
                          placeholder="https://pay.example.com/"
                          className="w-full px-3 py-2 rounded-xl text-xs font-mono apple-glass-input focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] opacity-60 block mb-1">商户编号 (PID)</label>
                        <input
                          type="text"
                          value={easypayPid}
                          onChange={e => setEasypayPid(e.target.value)}
                          placeholder="商户 PID (数字)"
                          className="w-full px-3 py-2 rounded-xl text-xs font-mono apple-glass-input focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] opacity-60 block mb-1">商户通信密钥 (Key)</label>
                        <input
                          type="password"
                          value={easypayKey}
                          onChange={e => setEasypayKey(e.target.value)}
                          placeholder="商户通信 Secret Key"
                          className="w-full px-3 py-2 rounded-xl text-xs font-mono apple-glass-input focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-serif font-bold text-white shadow-xs cursor-pointer hover:opacity-95"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    保存商业化与网关设置
                  </button>
                </div>
              </form>

              {/* 买断激活码/卡密批量生成与列表管理（持久化云端存储 + 筛选与一键复制） */}
              <div
                className="p-5 sm:p-6 rounded-[28px] border apple-liquid-glass space-y-4"
                style={{
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/5 dark:border-white/5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2">
                      <Key size={16} style={{ color: currentTheme.primary }} />
                      <h3 className="text-sm font-serif font-bold text-[#2B332E] dark:text-[#FAF8F5]">
                        买断激活卡密管理 ({licenseCodes.length})
                      </h3>
                    </div>

                    {/* 卡密使用状态筛选胶囊 */}
                    <div className="relative p-0.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.05] flex items-center">
                      {(['all', 'unredeemed', 'redeemed'] as const).map(cf => {
                        const isSel = codeFilter === cf;
                        const label =
                          cf === 'all'
                            ? `全部 (${licenseCodes.length})`
                            : cf === 'unredeemed'
                            ? `待使用 (${licenseCodes.filter(c => !c.redeemedBy).length})`
                            : `已兑换 (${licenseCodes.filter(c => !!c.redeemedBy).length})`;
                        return (
                          <button
                            key={cf}
                            type="button"
                            onClick={() => {
                              sound.playWaterDrop(780);
                              setCodeFilter(cf);
                            }}
                            className={`relative z-10 px-2.5 py-1 rounded-lg text-[11px] font-serif transition-colors duration-200 cursor-pointer ${
                              isSel
                                ? 'font-bold text-[#2B332E] dark:text-[#FAF8F5]'
                                : 'opacity-60 hover:opacity-90 text-[#6E7C75] dark:text-[#A7B4AD]'
                            }`}
                          >
                            {isSel && (
                              <motion.div
                                layoutId="license-code-filter-pill"
                                className="absolute inset-0 rounded-lg bg-white dark:bg-white/15 shadow-2xs border border-black/5 dark:border-white/10"
                                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                              />
                            )}
                            <span className="relative z-10">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={batchCount}
                      onChange={e => setBatchCount(parseInt(e.target.value, 10) || 5)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-serif border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 cursor-pointer"
                    >
                      <option value={5}>生成 5 个</option>
                      <option value={10}>生成 10 个</option>
                      <option value={20}>生成 20 个</option>
                      <option value={50}>生成 50 个</option>
                    </select>

                    <button
                      type="button"
                      disabled={isGeneratingCodes}
                      onClick={handleGenerateBatchCodes}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold text-white shadow-xs cursor-pointer hover:opacity-95 disabled:opacity-50"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      {isGeneratingCodes ? '生成中...' : '批量生成卡密'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
                  {filteredLicenseCodes.length === 0 ? (
                    <div className="text-center py-8 text-xs font-serif opacity-50">
                      暂无匹配的激活码，点击上方按键可快速生成
                    </div>
                  ) : (
                    filteredLicenseCodes.map(codeItem => (
                      <div
                        key={codeItem.code}
                        className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono transition-all"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-bold text-sm select-text text-emerald-600 dark:text-emerald-400">
                            {codeItem.code}
                          </span>
                          <span className="text-[10px] opacity-50 font-serif hidden sm:inline">
                            {codeItem.note || '买断卡密'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {codeItem.redeemedBy ? (
                            <span className="text-[10px] font-serif px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 opacity-70">
                              已兑换: {codeItem.redeemedBy}
                            </span>
                          ) : (
                            <span className="text-[10px] font-serif px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                              待使用
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(codeItem.code);
                              sound.playWaterDrop(840);
                              showToast(`卡密 ${codeItem.code} 已复制`);
                            }}
                            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                            title="复制卡密"
                          >
                            <Copy size={13} />
                          </button>

                          {!codeItem.redeemedBy && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCode(codeItem.code)}
                              className="p-1 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                              title="删除未兑换卡密"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </main>

        {/* ================= 3. 仿照主界面：底部悬浮导航栏 Dock 胶囊 ================= */}
        <div className="absolute bottom-[calc(8px+env(safe-area-inset-bottom,0px))] sm:bottom-3.5 left-3 right-3 sm:left-4 sm:right-4 z-40 pointer-events-none select-none flex justify-center">
          <nav
            id="dynamic-admin-bottom-nav"
            className="apple-liquid-glass pointer-events-auto relative rounded-full px-2 py-1.5 flex justify-around items-center shadow-lg max-w-lg w-full border border-white/80 dark:border-white/20"
          >
            {[
              { id: 'dashboard', label: '概览', icon: BarChart3 },
              { id: 'users', label: '用户管理', icon: Users },
              { id: 'versions', label: '新版本发布', icon: GitBranch },
              { id: 'notices', label: '系统广播', icon: Radio },
              { id: 'commercial', label: '商业授权', icon: Crown }
            ].map(tab => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    sound.playWaterDrop(880);
                    setActiveTab(tab.id as any);
                  }}
                  whileTap={{ scale: 0.91 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 26 }}
                  className={`min-h-[46px] min-w-[50px] flex-1 max-w-[80px] flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-full transition-colors duration-200 select-none touch-manipulation relative ${
                    isActive
                      ? 'font-bold'
                      : 'text-[#6E7C75] hover:text-[#2B332E] dark:hover:text-[#FAF8F5]'
                  }`}
                  style={{
                    color: isActive ? currentTheme.primary : undefined
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-admin-dock-pill"
                      className="absolute inset-0.5 rounded-full bg-white/85 dark:bg-white/10 shadow-xs border border-white/90 dark:border-white/15"
                      transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                    />
                  )}
                  <div
                    className={`p-1.5 rounded-full transition-all duration-300 relative z-10 ${
                      isActive ? 'scale-105' : 'bg-transparent'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] tracking-wider font-serif whitespace-nowrap leading-none relative z-10">
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* 全站统一删除确认弹窗（东方典雅纸材质感与红泥微印） */}
        <AnimatePresence>
          {deleteConfirm && (
            <div
              className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-text"
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 12 }}
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl p-6 sm:p-7 border shadow-2xl space-y-4 relative apple-liquid-glass"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(24, 30, 26, 0.96)' : 'rgba(253, 251, 247, 0.98)',
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
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
                    {deleteConfirm.type === 'version'
                      ? '确认删除该发布版本吗？'
                      : deleteConfirm.type === 'notice'
                      ? '确认删除该系统广播吗？'
                      : '确认注销该用户账号吗？'}
                  </h3>
                  <div
                    className="text-xs font-serif py-1 px-3 rounded-xl inline-block max-w-full truncate font-bold"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      color: isDarkMode ? '#C2CDC7' : '#4E5A52'
                    }}
                  >
                    {deleteConfirm.title}
                  </div>
                  {deleteConfirm.subtitle && (
                    <p className="text-[11px] opacity-60 font-serif leading-relaxed">
                      {deleteConfirm.subtitle}
                    </p>
                  )}
                  <p className="text-[11px] text-red-500/90 font-serif pt-1">
                    {deleteConfirm.type === 'user'
                      ? '此操作将从云端彻底注销该用户档案，释放绑定的电子邮箱与账号，不可撤销'
                      : '此操作不可撤销，数据将从云端彻底移除'}
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playWaterDrop(740);
                      setDeleteConfirm(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border text-xs font-serif font-bold transition-all active:scale-95 cursor-pointer opacity-75 hover:opacity-100"
                    style={{
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="flex-1 py-2.5 rounded-xl text-white text-xs font-serif font-bold shadow-md transition-all active:scale-95 hover:brightness-110 cursor-pointer"
                    style={{
                      backgroundColor: '#DC2626',
                      border: '1px solid #B91C1C'
                    }}
                  >
                    {deleteConfirm.type === 'user' ? '确认注销' : '确认删除'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
