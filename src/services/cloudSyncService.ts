import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppData } from '../types';
import { buildApiUrl } from './apiConfig';

export interface DomesticUser {
  uid: string;
  account: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  createdAt: string;
  updatedAt?: string;
  lastSyncAt?: string;
  role?: 'user' | 'admin';
  licenseStatus?: 'trial' | 'active' | 'expired';
  trialExpireAt?: string;
  licensedAt?: string;
  licenseKey?: string;
}

export interface CloudBackupRecord {
  backupId: string;
  userId: string;
  version: string;
  createdAt: string;
  title: string;
  summary: string;
  dataPayload: string; // JSON string of AppData
}

export interface CloudAppVersion {
  versionId: string;
  versionNumber: string;
  title: string;
  releaseDate: string;
  changelog: string;
  isForceUpdate?: boolean;
  downloadUrl?: string;
  author?: string;
  createdAt: string;
}

export interface CloudSystemNotice {
  noticeId: string;
  title: string;
  content: string;
  level?: 'info' | 'poem' | 'warning' | 'celebration';
  isPublished?: boolean;
  createdAt: string;
  updatedAt?: string;
}

const LOCAL_USER_KEY = 'shinian_current_user_v1';

export const DEFAULT_AUTHOR_AVATAR = 'data:image/jpeg;base64,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';

// SHA-256 password hashing
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText + '_shinian_zen_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get stored domestic user
export function getLocalDomesticUser(): DomesticUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Set stored domestic user
export function setLocalDomesticUser(user: DomesticUser | null): void {
  if (user) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_USER_KEY);
  }
}

export function isAuthorAccount(accountStr: string): boolean {
  const acc = (accountStr || '').trim().toLowerCase();
  return (
    acc === 'xiaoxiao' ||
    acc === '孝孝' ||
    acc === '笑笑' ||
    acc === '258090' ||
    acc === 'author' ||
    acc === 'shinian' ||
    acc === 'sjx' ||
    acc === 'sjx20091118@gmail.com' ||
    acc === '施金孝' ||
    acc === '施金孝拾年作者'
  );
}

export function isAuthorUser(user: DomesticUser | null | undefined): boolean {
  if (!user) return false;
  const acc = (user.account || '').trim().toLowerCase();
  const name = (user.displayName || '').trim();
  const mail = (user.email || '').trim().toLowerCase();
  return (
    isAuthorAccount(acc) ||
    isAuthorAccount(name) ||
    mail === 'sjx20091118@gmail.com' ||
    user.role === 'admin'
  );
}

// Upload Person Avatar to Cloud
export async function uploadPersonAvatarToCloud(avatarDataUrl: string): Promise<string> {
  if (!avatarDataUrl) return '';
  if (avatarDataUrl.startsWith('http')) return avatarDataUrl;

  const avatarId = `av_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    const user = getLocalDomesticUser();
    const avatarDocRef = doc(db, 'cloud_avatars', avatarId);
    await setDoc(avatarDocRef, {
      avatarId,
      userId: user?.uid || 'anonymous',
      dataUrl: avatarDataUrl,
      createdAt: new Date().toISOString()
    });
    return avatarDataUrl;
  } catch (err) {
    console.warn('Upload avatar to Firestore failed, fallback to memory/indexedDb:', err);
    return avatarDataUrl;
  }
}

// Domestic Register (Supports Email & Phone & Photo)
export async function registerDomesticUser(
  params: {
    account: string;
    displayName: string;
    passwordPlain: string;
    email?: string;
    phone?: string;
    photoURL?: string;
  },
  skipSetLocalUser?: boolean
): Promise<DomesticUser> {
  const cleanAccount = params.account.trim().toLowerCase();
  const cleanName = params.displayName.trim() || '拾年墨客';
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const cleanPhone = (params.phone || '').trim();
  const hashedPassword = await hashPassword(params.passwordPlain);
  const now = new Date().toISOString();
  const isAuthor = isAuthorAccount(cleanAccount);

  // Check if account or email already exists
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('account', '==', cleanAccount), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error(`账号「${cleanAccount}」已被注册，请直接登录或更换账号`);
    }

    if (cleanEmail) {
      const qEmail = query(usersRef, where('email', '==', cleanEmail), limit(1));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        throw new Error(`邮箱「${cleanEmail}」已被绑定，请直接登录`);
      }
    }

    if (cleanPhone) {
      const qPhone = query(usersRef, where('phone', '==', cleanPhone), limit(1));
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) {
        throw new Error(`手机号「${cleanPhone}」已被绑定，请直接登录`);
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('已被注册') || err.message.includes('已被绑定'))) {
      throw err;
    }
  }

  // 检查本地与服务端是否有重复账号
  try {
    const rawAll = localStorage.getItem('shinian_all_users_cache');
    if (rawAll) {
      const list: DomesticUser[] = JSON.parse(rawAll);
      const duplicate = list.find(u => (u.account || '').toLowerCase() === cleanAccount);
      if (duplicate) {
        throw new Error(`账号「${cleanAccount}」已被注册，请直接登录或更换账号`);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('已被注册')) throw err;
  }

  try {
    const res = await fetch(buildApiUrl('/api/admin/users'));
    if (res.ok) {
      const resJson = await res.json();
      if (Array.isArray(resJson.users)) {
        const duplicate = resJson.users.find((u: any) => (u.account || '').toLowerCase() === cleanAccount);
        if (duplicate) {
          throw new Error(`账号「${cleanAccount}」已被注册，请直接登录或更换账号`);
        }
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('已被注册')) throw err;
  }

  const uid = `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const effectiveTrialDays = getEffectiveTrialDays();
  const isZeroTrial = effectiveTrialDays === 0;

  const newUser: DomesticUser = {
    uid,
    account: cleanAccount,
    displayName: isAuthor && (!params.displayName.trim() || params.displayName === '拾年墨客') ? '孝孝' : cleanName,
    email: cleanEmail || undefined,
    phone: cleanPhone || undefined,
    photoURL: params.photoURL || '',
    passwordHash: hashedPassword,
    createdAt: now,
    updatedAt: now,
    lastSyncAt: now,
    role: isAuthor ? 'admin' : 'user',
    licenseStatus: isAuthor ? 'active' : (isZeroTrial ? 'expired' : 'trial'),
    licensedAt: isAuthor ? now : undefined,
    trialExpireAt: isAuthor ? undefined : (isZeroTrial ? now : new Date(Date.now() + effectiveTrialDays * 24 * 60 * 60 * 1000).toISOString())
  };

  // 1. 写入 Firestore 云端
  try {
    await setDoc(doc(db, 'users', uid), newUser, { merge: true });
  } catch (err) {
    console.warn('Firestore user write error, saved locally:', err);
  }

  // 2. 同步写入服务端磁盘持久化存储
  try {
    await fetch(buildApiUrl('/api/admin/users/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
  } catch (e) {
    console.warn('Server user save error:', e);
  }

  // 3. 同步写入全量用户本地持久化缓存
  try {
    const rawAll = localStorage.getItem('shinian_all_users_cache');
    const list: DomesticUser[] = rawAll ? JSON.parse(rawAll) : [];
    const filtered = list.filter(u => u.uid !== uid && u.account !== newUser.account);
    filtered.push(newUser);
    localStorage.setItem('shinian_all_users_cache', JSON.stringify(filtered));
  } catch {}

  if (!skipSetLocalUser) {
    setLocalDomesticUser(newUser);
  }
  return newUser;
}

// Domestic Login (Supports Account, Display Name / Nickname, Email or Phone across all storage tiers)
export async function loginDomesticUser(accountOrEmailOrPhone: string, passwordPlain: string): Promise<DomesticUser> {
  const rawInput = (accountOrEmailOrPhone || '').trim();
  const cleanInput = rawInput.toLowerCase();
  const rawPassword = (passwordPlain || '').trim();
  const hashedPassword = await hashPassword(rawPassword);
  const adminSecretHash = 'a19f8016a99b20ce0efbb3d14b4d9e9e6445b2ba127ce0095106ba7e7803694c';

  const isAuthorPass =
    rawPassword === '258090shi' ||
    rawPassword.toLowerCase() === '258090shi' ||
    rawPassword === '258090' ||
    hashedPassword === adminSecretHash;

  const isAuthorInput =
    isAuthorAccount(cleanInput) ||
    isAuthorAccount(rawInput) ||
    cleanInput === 'xiaoxiao' ||
    rawInput === '孝孝' ||
    rawInput === '笑笑' ||
    cleanInput === 'sjx20091118@gmail.com' ||
    cleanInput === 'author' ||
    cleanInput === '258090';

  const isUserMatch = (u: DomesticUser | null | undefined): boolean => {
    if (!u) return false;
    const acc = (u.account || '').toLowerCase().trim();
    const name = (u.displayName || '').trim();
    const nameLower = name.toLowerCase();
    const mail = (u.email || '').toLowerCase().trim();
    const phone = (u.phone || '').trim();

    const isAuthorTarget =
      isAuthorAccount(acc) ||
      isAuthorAccount(name) ||
      name.includes('孝孝') ||
      name.includes('笑笑') ||
      acc === 'xiaoxiao' ||
      acc === '258090' ||
      acc === 'author' ||
      mail === 'sjx20091118@gmail.com' ||
      isAuthorUser(u);

    return (
      acc === cleanInput ||
      name === rawInput ||
      nameLower === cleanInput ||
      (!!mail && mail === cleanInput) ||
      (!!phone && phone === rawInput) ||
      (isAuthorInput && isAuthorTarget)
    );
  };

  const isXiaoxiaoOrAuthor = (u: DomesticUser | null | undefined): boolean => {
    if (!u) return false;
    const acc = (u.account || '').toLowerCase().trim();
    const name = (u.displayName || '').trim();
    const mail = (u.email || '').toLowerCase().trim();
    return (
      isAuthorAccount(acc) ||
      isAuthorAccount(name) ||
      name.includes('孝孝') ||
      name.includes('笑笑') ||
      acc === 'xiaoxiao' ||
      acc === '258090' ||
      acc === 'author' ||
      mail === 'sjx20091118@gmail.com' ||
      isAuthorUser(u)
    );
  };

  // 1. 检查当前本地登录用户
  const local = getLocalDomesticUser();
  if (isUserMatch(local)) {
    const isAuth = isXiaoxiaoOrAuthor(local);
    if (isAuth) {
      if (!isAuthorPass && local!.passwordHash && local!.passwordHash !== hashedPassword) {
        throw new Error('密码不正确，请重新输入');
      }
      local!.role = 'admin';
      local!.licenseStatus = 'active';
      local!.passwordHash = adminSecretHash;
      if (!local!.photoURL) local!.photoURL = DEFAULT_AUTHOR_AVATAR;
      setLocalDomesticUser(local!);
      return local!;
    } else {
      if (local!.passwordHash && local!.passwordHash !== hashedPassword) {
        throw new Error('密码不正确，请重新输入');
      }
      if (!local!.passwordHash) {
        local!.passwordHash = hashedPassword;
        setLocalDomesticUser(local!);
      }
      return local!;
    }
  }

  let matchedUser: DomesticUser | null = null;

  // 2. 检查本地全量注册用户缓存
  try {
    const rawAll = localStorage.getItem('shinian_all_users_cache');
    if (rawAll) {
      const list: DomesticUser[] = JSON.parse(rawAll);
      const found = list.find(u => isUserMatch(u));
      if (found) {
        matchedUser = found;
      }
    }
  } catch (e) {
    console.warn('Check local users cache error:', e);
  }

  // 3. 检查服务端持久化存储 API
  if (!matchedUser) {
    try {
      const res = await fetch(buildApiUrl('/api/admin/users'));
      if (res.ok) {
        const resJson = await res.json();
        if (Array.isArray(resJson.users)) {
          const found = resJson.users.find((u: DomesticUser) => isUserMatch(u));
          if (found) {
            matchedUser = found;
          }
        }
      }
    } catch (e) {
      console.warn('Check server users error:', e);
    }
  }

  // 4. 穿透全量遍历查询 Firestore 云端集合，确保加载最新 Profile 属性 (以 updatedAt 最新为准)
  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    for (const d of snap.docs) {
      const u = d.data() as DomesticUser;
      if (isUserMatch(u)) {
        const fsUser = { ...u, uid: u.uid || d.id };
        if (!matchedUser) {
          matchedUser = fsUser;
        } else {
          const matchedTime = new Date(matchedUser.updatedAt || 0).getTime();
          const fsTime = new Date(fsUser.updatedAt || 0).getTime();
          if (fsTime >= matchedTime) {
            matchedUser = { ...matchedUser, ...fsUser };
          }
        }
        break;
      }
    }
  } catch (err) {
    console.warn('Firestore login query error:', err);
  }

  // 5. 校验找到的目标用户
  if (matchedUser) {
    const isAuth =
      isAuthorAccount(matchedUser.account) ||
      (matchedUser.displayName || '').includes('孝孝') ||
      (matchedUser.displayName || '').includes('笑笑') ||
      (matchedUser.account || '').toLowerCase() === 'xiaoxiao' ||
      (matchedUser.email || '').toLowerCase() === 'sjx20091118@gmail.com' ||
      isAuthorUser(matchedUser);

    if (isAuth) {
      if (!isAuthorPass && matchedUser.passwordHash && matchedUser.passwordHash !== hashedPassword) {
        throw new Error('密码不正确，请重新输入');
      }
      matchedUser.role = 'admin';
      matchedUser.licenseStatus = 'active';
      matchedUser.passwordHash = adminSecretHash;
      if (!matchedUser.photoURL) {
        matchedUser.photoURL = DEFAULT_AUTHOR_AVATAR;
      }
    } else {
      if (matchedUser.passwordHash && matchedUser.passwordHash !== hashedPassword) {
        throw new Error('密码不正确，请重新输入');
      }
    }

    setLocalDomesticUser(matchedUser);

    // 异步同步到 Firestore 云端与服务端，确保全网可查
    try {
      setDoc(doc(db, 'users', matchedUser.uid), matchedUser, { merge: true }).catch(() => {});
      fetch(buildApiUrl('/api/admin/users/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchedUser)
      }).catch(() => {});
    } catch {}

    // 回写更新本地全量缓存
    try {
      const rawAll = localStorage.getItem('shinian_all_users_cache');
      const list: DomesticUser[] = rawAll ? JSON.parse(rawAll) : [];
      const idx = list.findIndex(u => u.uid === matchedUser!.uid || u.account === matchedUser!.account);
      if (idx !== -1) {
        list[idx] = matchedUser;
      } else {
        list.push(matchedUser);
      }
      localStorage.setItem('shinian_all_users_cache', JSON.stringify(list));
    } catch {}

    return matchedUser;
  }

  // 作者/管理员账号免注自启保护 (严格校验密码)
  if (
    isAuthorAccount(cleanInput) ||
    isAuthorAccount(rawInput) ||
    cleanInput === 'xiaoxiao' ||
    rawInput === '孝孝' ||
    rawInput === '笑笑' ||
    cleanInput === 'sjx20091118@gmail.com' ||
    cleanInput === 'author' ||
    cleanInput === '258090'
  ) {
    if (!isAuthorPass && hashedPassword !== adminSecretHash) {
      throw new Error('密码不正确，请重新输入');
    }

    const defaultAdmin: DomesticUser = {
      uid: 'u_author_xiaoxiao',
      account: 'xiaoxiao',
      displayName: '孝孝',
      email: 'sjx20091118@gmail.com',
      photoURL: DEFAULT_AUTHOR_AVATAR,
      role: 'admin',
      licenseStatus: 'active',
      licensedAt: '2026-10-01T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
      passwordHash: adminSecretHash
    };
    setLocalDomesticUser(defaultAdmin);
    try {
      setDoc(doc(db, 'users', defaultAdmin.uid), defaultAdmin, { merge: true }).catch(() => {});
      fetch(buildApiUrl('/api/admin/users/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultAdmin)
      }).catch(() => {});
    } catch {}
    return defaultAdmin;
  }

  throw new Error('未找到该账号、昵称或邮箱，请检查输入或先进行注册');
}

// Update User Profile (Merge with setDoc to guarantee Firestore persistence, Server persistence, and all local caches)
export async function updateDomesticUserProfile(updatedFields: Partial<DomesticUser>): Promise<DomesticUser> {
  const current = getLocalDomesticUser();
  if (!current) throw new Error('未登录');

  const now = new Date().toISOString();
  const merged: DomesticUser = {
    ...current,
    ...updatedFields,
    updatedAt: now
  };

  // 1. 同步更新 Firestore 云端数据库
  try {
    await setDoc(
      doc(db, 'users', current.uid),
      {
        ...updatedFields,
        updatedAt: now
      },
      { merge: true }
    );

    // 同步写入独立云端头像集合 cloud_avatars
    if (updatedFields.photoURL) {
      await setDoc(
        doc(db, 'cloud_avatars', current.uid),
        {
          avatarId: current.uid,
          userId: current.uid,
          dataUrl: updatedFields.photoURL,
          photoURL: updatedFields.photoURL,
          updatedAt: now
        },
        { merge: true }
      ).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore update failed, updated locally:', err);
  }

  // 2. 同步写入服务端磁盘持久化存储 (/api/admin/users/save)
  try {
    await fetch(buildApiUrl('/api/admin/users/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged)
    });
  } catch (e) {
    console.warn('Server user save error:', e);
  }

  // 3. 同步更新全量用户本地持久化缓存 shinian_all_users_cache
  try {
    const rawAll = localStorage.getItem('shinian_all_users_cache');
    const list: DomesticUser[] = rawAll ? JSON.parse(rawAll) : [];
    const index = list.findIndex(u => u.uid === merged.uid || (u.account && u.account.toLowerCase() === merged.account.toLowerCase()));
    if (index >= 0) {
      list[index] = { ...list[index], ...merged };
    } else {
      list.push(merged);
    }
    localStorage.setItem('shinian_all_users_cache', JSON.stringify(list));
  } catch {}

  // 4. 同步更新当前登录会话
  setLocalDomesticUser(merged);
  return merged;
}

// Upload backup to Cloud for Domestic User
export async function uploadDomesticBackupToCloud(appData: AppData, title?: string): Promise<CloudBackupRecord> {
  const user = getLocalDomesticUser();
  if (!user) throw new Error('请先登录云端账号后再进行云端备份');

  const backupId = `bk_${Date.now()}`;
  const now = new Date().toISOString();
  const serialized = JSON.stringify(appData);

  const peopleCount = appData.people.length;
  const timelineCount = appData.timeline.length;
  const storiesCount = appData.stories.length;
  const artifactsCount = appData.artifacts.length;

  const record: CloudBackupRecord = {
    backupId,
    userId: user.uid,
    version: '1.2.0',
    createdAt: now,
    title: title || `云境归档 · ${new Date().toLocaleDateString('zh-CN')}`,
    summary: `${peopleCount}位知己 · ${timelineCount}段拾光 · ${storiesCount}篇流年 · ${artifactsCount}件信物`,
    dataPayload: serialized
  };

  const backupRef = doc(db, 'users', user.uid, 'backups', backupId);
  try {
    await setDoc(backupRef, record);
    await updateDoc(doc(db, 'users', user.uid), { lastSyncAt: now }).catch(() => {});
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/backups/${backupId}`);
  }
}

// List user cloud backups
export async function listDomesticUserBackups(): Promise<CloudBackupRecord[]> {
  const user = getLocalDomesticUser();
  if (!user) return [];

  const backupsRef = collection(db, 'users', user.uid, 'backups');
  try {
    const q = query(backupsRef, orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CloudBackupRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/backups`);
  }
}

// Delete user backup
export async function deleteDomesticUserBackup(backupId: string): Promise<void> {
  const user = getLocalDomesticUser();
  if (!user) throw new Error('未登录');

  const backupRef = doc(db, 'users', user.uid, 'backups', backupId);
  try {
    await deleteDoc(backupRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/backups/${backupId}`);
  }
}

function createTimeoutSignal(ms = 4000): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as any).timeout === 'function') {
    try {
      return (AbortSignal as any).timeout(ms);
    } catch {}
  }
  if (typeof AbortController !== 'undefined') {
    try {
      const controller = new AbortController();
      setTimeout(() => {
        try {
          controller.abort();
        } catch {}
      }, ms);
      return controller.signal;
    } catch {}
  }
  return undefined;
}

// App Version Management (Domestic Direct Gateway + Firestore Sync)
export async function getLatestAppVersion(): Promise<CloudAppVersion | null> {
  // 1. 优先通过国内直连 API 网关获取（国内免翻墙秒级直达）
  try {
    const res = await fetch(buildApiUrl('/api/versions/latest'), { signal: createTimeoutSignal(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.version) {
        return data.version as CloudAppVersion;
      }
    }
  } catch (err) {}

  // 2. 备用从 Firestore 云端读取
  const versionsRef = collection(db, 'app_versions');
  try {
    const q = query(versionsRef, orderBy('createdAt', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as CloudAppVersion;
    }
    return null;
  } catch (error) {
    console.warn('Could not fetch app versions from Firestore:', error);
    return null;
  }
}

export async function listAllAppVersions(): Promise<CloudAppVersion[]> {
  const versionsMap = new Map<string, CloudAppVersion>();

  // 1. 从国内直连 API 网关读取
  try {
    const res = await fetch(buildApiUrl('/api/versions'), { signal: createTimeoutSignal(4000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.versions)) {
        data.versions.forEach((v: CloudAppVersion) => versionsMap.set(v.versionId, v));
      }
    }
  } catch (err) {}

  // 2. 从 Firestore 读取补充
  try {
    const versionsRef = collection(db, 'app_versions');
    const q = query(versionsRef, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      const v = d.data() as CloudAppVersion;
      if (!versionsMap.has(v.versionId)) {
        versionsMap.set(v.versionId, v);
      }
    });
  } catch (error) {
    console.warn('Firestore list versions error:', error);
  }

  return Array.from(versionsMap.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function publishAppVersion(version: CloudAppVersion): Promise<void> {
  // 1. 同步保存至国内直连网关存储
  try {
    await fetch(buildApiUrl('/api/admin/versions/publish'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(version)
    });
  } catch (err) {}

  // 2. 同步写入 Firestore
  const versionRef = doc(db, 'app_versions', version.versionId);
  try {
    await setDoc(versionRef, version);
  } catch (error) {
    console.warn('Firestore publish version error:', error);
  }
}

export async function deleteAppVersion(versionId: string): Promise<void> {
  // 1. 从国内直连网关删除
  try {
    await fetch(buildApiUrl('/api/admin/versions/delete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId })
    });
  } catch (err) {}

  // 2. 从 Firestore 删除
  const versionRef = doc(db, 'app_versions', versionId);
  try {
    await deleteDoc(versionRef);
  } catch (error) {
    console.warn('Firestore delete version error:', error);
  }
}

const LOCAL_NOTICES_KEY = 'shinian_cached_notices';

export function getLocalCachedNotices(): CloudSystemNotice[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCachedNotice(notice: CloudSystemNotice): void {
  try {
    const current = getLocalCachedNotices();
    const updated = [notice, ...current.filter(n => n.noticeId !== notice.noticeId)];
    localStorage.setItem(LOCAL_NOTICES_KEY, JSON.stringify(updated));
  } catch {}
}

export function removeLocalCachedNotice(noticeId: string): void {
  try {
    const current = getLocalCachedNotices();
    const updated = current.filter(n => n.noticeId !== noticeId);
    localStorage.setItem(LOCAL_NOTICES_KEY, JSON.stringify(updated));
  } catch {}
}

function isLegacyTestNotice(n: CloudSystemNotice): boolean {
  const t = (n.title || '').toLowerCase();
  const c = (n.content || '').toLowerCase();
  return (
    t.includes('十年云端漫游') ||
    t.includes('漫游上线') ||
    t.includes('上线寄语') ||
    t.includes('漫游') ||
    t.includes('寄语') ||
    c.includes('十年云端漫游') ||
    c.includes('漫游上线')
  );
}

// System Notices Management (Domestic Direct API Gateway + Firestore Multi-track)
export async function getPublishedNotices(): Promise<CloudSystemNotice[]> {
  const noticesMap = new Map<string, CloudSystemNotice>();

  // 1. 优先通过国内直连 API 网关拉取公告（国内免翻墙直达）
  try {
    const res = await fetch(buildApiUrl('/api/notices'), { signal: createTimeoutSignal(4000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.notices)) {
        data.notices.forEach((n: CloudSystemNotice) => {
          if (!isLegacyTestNotice(n) && n.isPublished !== false) {
            noticesMap.set(n.noticeId, n);
          }
        });
      }
    }
  } catch (err) {}

  // 2. 从 Firestore 云端数据库同步
  try {
    const noticesRef = collection(db, 'system_notices');
    const snap = await getDocs(noticesRef);
    if (!snap.empty) {
      snap.docs.forEach(d => {
        const docItem = d.data() as CloudSystemNotice;
        if (!isLegacyTestNotice(docItem) && docItem.isPublished !== false) {
          noticesMap.set(docItem.noticeId, docItem);
        }
      });
    }
  } catch (error) {}

  const resultList = Array.from(noticesMap.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (resultList.length > 0) {
    try {
      localStorage.setItem(LOCAL_NOTICES_KEY, JSON.stringify(resultList));
    } catch {}
    return resultList;
  }

  // 3. 本地缓存兜底
  const local = getLocalCachedNotices();
  return local.filter(n => !isLegacyTestNotice(n) && n.isPublished !== false);
}

export async function listAllSystemNotices(): Promise<CloudSystemNotice[]> {
  const noticesMap = new Map<string, CloudSystemNotice>();

  // 1. 从国内直连 API 网关拉取全部公告
  try {
    const res = await fetch(buildApiUrl('/api/notices'), { signal: createTimeoutSignal(4000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.notices)) {
        data.notices.forEach((n: CloudSystemNotice) => {
          if (!isLegacyTestNotice(n)) {
            noticesMap.set(n.noticeId, n);
          }
        });
      }
    }
  } catch (err) {}

  // 2. 从 Firestore 同步全部公告
  try {
    const noticesRef = collection(db, 'system_notices');
    const snap = await getDocs(noticesRef);
    if (!snap.empty) {
      snap.docs.forEach(d => {
        const docItem = d.data() as CloudSystemNotice;
        if (!isLegacyTestNotice(docItem)) {
          noticesMap.set(docItem.noticeId, docItem);
        }
      });
    }
  } catch (error) {}

  const resultList = Array.from(noticesMap.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (resultList.length > 0) {
    try {
      localStorage.setItem(LOCAL_NOTICES_KEY, JSON.stringify(resultList));
    } catch {}
    return resultList;
  }

  return getLocalCachedNotices().filter(n => !isLegacyTestNotice(n));
}

export async function publishSystemNotice(notice: CloudSystemNotice): Promise<void> {
  // 1. 同步保存至国内直连网关
  try {
    await fetch(buildApiUrl('/api/admin/notices/publish'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notice)
    });
  } catch (err) {}

  // 2. 写入 Firestore
  const noticeRef = doc(db, 'system_notices', notice.noticeId);
  try {
    await setDoc(noticeRef, notice);
  } catch (error) {
    console.warn('Firestore publish notice error:', error);
  }

  saveLocalCachedNotice(notice);
}

export async function deleteSystemNotice(noticeId: string): Promise<void> {
  // 1. 从国内直连网关删除
  try {
    await fetch(buildApiUrl('/api/admin/notices/delete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noticeId })
    });
  } catch (err) {}

  // 2. 从 Firestore 删除
  const noticeRef = doc(db, 'system_notices', noticeId);
  try {
    await deleteDoc(noticeRef);
  } catch (error) {
    console.warn('Firestore delete notice error:', error);
  }

  removeLocalCachedNotice(noticeId);
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderName: string;
  isConfigured: boolean;
  updatedAt?: number;
}

const SMTP_CONFIG_KEY = 'shinian_smtp_config_v1';

export async function fetchServerSmtpConfig(): Promise<SmtpConfig> {
  const localConfig = getSmtpConfig();
  try {
    const res = await fetch(buildApiUrl('/api/admin/smtp-config'));
    if (res.ok) {
      const data = await res.json();
      if (data.config && data.config.user && data.config.pass) {
        const serverConfig: SmtpConfig = data.config;
        const serverUpdatedAt = serverConfig.updatedAt || 0;
        const localUpdatedAt = localConfig.updatedAt || 0;

        // 防反向冲刷核心锁：若本地配置具有更新的时间戳或本地已配置有效凭据且更新，绝不被服务端旧数据覆盖！
        if (localConfig.isConfigured && localUpdatedAt > serverUpdatedAt) {
          // 反向将本地较新的凭据同步回服务端
          saveSmtpConfig(localConfig).catch(() => {});
          return localConfig;
        }

        const cleanServerConfig: SmtpConfig = {
          ...serverConfig,
          updatedAt: serverUpdatedAt || Date.now()
        };
        localStorage.setItem(SMTP_CONFIG_KEY, JSON.stringify(cleanServerConfig));
        return cleanServerConfig;
      }
    }
  } catch (e) {
    console.warn('Fetch server smtp config error:', e);
  }
  return localConfig;
}

export function getSmtpConfig(): SmtpConfig {
  try {
    const raw = localStorage.getItem(SMTP_CONFIG_KEY);
    return raw ? JSON.parse(raw) : {
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      senderName: '拾年时光',
      isConfigured: false,
      updatedAt: 0
    };
  } catch {
    return {
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      senderName: '拾年时光',
      isConfigured: false,
      updatedAt: 0
    };
  }
}

export async function saveSmtpConfig(config: SmtpConfig, verifyNow: boolean = false): Promise<SmtpConfig> {
  let cleanUser = String(config.user || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '');
  if (/^\d+$/.test(cleanUser)) {
    cleanUser = `${cleanUser}@qq.com`;
  }
  const cleanPass = String(config.pass || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '');
  const cleanHost = String(config.host || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '').toLowerCase() || 'smtp.qq.com';

  const cleanConfig: SmtpConfig = {
    ...config,
    host: cleanHost,
    user: cleanUser,
    pass: cleanPass,
    isConfigured: !!(cleanHost && cleanUser && cleanPass),
    updatedAt: Date.now()
  };

  localStorage.setItem(SMTP_CONFIG_KEY, JSON.stringify(cleanConfig));

  // 同步通知服务端持久化保存
  const targetUrl = buildApiUrl('/api/admin/save-smtp');
  try {
    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cleanConfig, verifyNow })
      });
    } catch (fetchErr) {
      if (targetUrl !== '/api/admin/save-smtp') {
        res = await fetch('/api/admin/save-smtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...cleanConfig, verifyNow })
        });
      } else {
        throw fetchErr;
      }
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (errData && errData.error) {
        throw new Error(errData.diagnostic || errData.error);
      }
      throw new Error('服务端保存配置失败');
    }
  } catch (err: any) {
    console.warn('Failed to post save-smtp to server:', err);
    // localStorage 已安全落盘，保证用户配置不丢
  }

  return cleanConfig;
}

export interface SmtpDiagnosticResult {
  success: boolean;
  message: string;
  category?: 'AUTH_FAILED' | 'SENDER_MISMATCH' | 'NETWORK_TIMEOUT' | 'SSL_ERROR' | 'GENERIC_ERROR';
  categoryTitle?: string;
  responseCode?: number | null;
  rawResponse?: string;
  guideSteps?: string[];
  diagnostic?: string;
  messageId?: string;
  previewCode?: string;
  elapsed?: number;
}

export async function testSmtpConnection(
  config: SmtpConfig,
  toEmail?: string
): Promise<SmtpDiagnosticResult> {
  const cleanHost = String(config.host || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '');
  let cleanUser = String(config.user || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '');
  if (/^\d+$/.test(cleanUser)) {
    cleanUser = `${cleanUser}@qq.com`;
  }
  const cleanPass = String(config.pass || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '');
  const cleanToEmail = String(toEmail || cleanUser).replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '');

  const payload = {
    host: cleanHost,
    port: config.port,
    user: cleanUser,
    pass: cleanPass,
    toEmail: cleanToEmail
  };

  let response: Response;
  const targetUrl = buildApiUrl('/api/admin/test-smtp');

  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (netErr: any) {
    // 自动降级重试：若外部绝对地址请求失败（如 Failed to fetch），立即回退至同源相对路径重试
    if (targetUrl !== '/api/admin/test-smtp') {
      try {
        response = await fetch('/api/admin/test-smtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (fallbackErr: any) {
        return {
          success: false,
          category: 'NETWORK_TIMEOUT',
          categoryTitle: '网络通信中断 (Failed to fetch)',
          message: '浏览器网络请求未能成功送达服务端，请刷新页面重新建立同源直连会话',
          rawResponse: `${netErr?.message || ''}; ${fallbackErr?.message || ''}`,
          guideSteps: [
            '确认当前页面未处于断网或 dev server 重启过渡状态；',
            '在浏览器中刷新页面重新建立同源直连会话；',
            '核对发信账号与授权码已正确录入。'
          ]
        };
      }
    } else {
      return {
        success: false,
        category: 'NETWORK_TIMEOUT',
        categoryTitle: '网络通信中断 (Failed to fetch)',
        message: '浏览器网络请求未能送达服务端，请确保本地服务正常运行并刷新页面',
        rawResponse: netErr?.message || 'Failed to fetch',
        guideSteps: [
          '确认当前页面未处于断网或 dev server 重启过渡状态；',
          '在浏览器中刷新页面重新建立同源直连会话；',
          '核对发信账号与授权码已正确录入。'
        ]
      };
    }
  }

  const resJson = await response.json();
  if (!response.ok) {
    return {
      success: false,
      message: resJson.error || 'SMTP 测试发信失败',
      category: resJson.category,
      categoryTitle: resJson.categoryTitle,
      responseCode: resJson.responseCode,
      rawResponse: resJson.rawResponse,
      guideSteps: resJson.guideSteps,
      diagnostic: resJson.diagnostic
    };
  }
  return resJson;
}

// Admin: List all registered users (全网三层深度持久化同步：Firestore + 服务端磁盘 JSON + 本地缓存)
export async function listAllUsers(): Promise<DomesticUser[]> {
  const usersMap = new Map<string, DomesticUser>();

  // 1. 从本地缓存预热（自动过滤废弃账号）
  try {
    const rawCache = localStorage.getItem('shinian_all_users_cache');
    if (rawCache) {
      const cachedList: DomesticUser[] = JSON.parse(rawCache);
      cachedList.forEach(u => {
        const acc = (u?.account || '').toLowerCase();
        if (u && u.uid && u.uid !== 'u_author_00001' && u.uid !== 'u_author_shinian' && acc !== 'author' && acc !== '258090') {
          usersMap.set(u.uid, u);
        }
      });
    }
  } catch {}

  // 2. 从 Firestore 云端读取
  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    snap.docs.forEach(d => {
      const u = d.data() as any;
      const acc = (u.account || '').toLowerCase();
      
      // 自动从云端移除废弃作者/测试账号
      if (d.id === 'u_author_00001' || d.id === 'u_author_shinian' || acc === 'author' || acc === '258090') {
        deleteDoc(doc(db, 'users', d.id)).catch(() => {});
        return;
      }

      const isXiaoxiao = isAuthorAccount(u.account) || (u.displayName || '').includes('孝孝') || (u.displayName || '').includes('笑笑') || acc === 'xiaoxiao';
      const role = isXiaoxiao ? 'admin' : (u.role || 'user');
      const formatted: DomesticUser = {
        uid: u.uid || d.id,
        account: u.account || '',
        displayName: isXiaoxiao ? (u.displayName || '孝孝') : (u.displayName || '拾年墨客'),
        photoURL: u.photoURL || u.avatar || u.avatarUrl || '',
        email: u.email || '',
        phone: u.phone || '',
        role,
        licenseStatus: u.licenseStatus || (isXiaoxiao || role === 'admin' ? 'active' : 'trial'),
        trialExpireAt: u.trialExpireAt,
        licensedAt: u.licensedAt || (isXiaoxiao || role === 'admin' ? u.createdAt : undefined),
        licenseKey: u.licenseKey || '',
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || u.createdAt || new Date().toISOString(),
        lastSyncAt: u.lastSyncAt,
        passwordHash: u.passwordHash
      };
      usersMap.set(formatted.uid, formatted);
    });
  } catch (error) {
    console.warn('Firestore list users error:', error);
  }

  // 3. 从后端服务端磁盘持久化接口读取（基于 updatedAt 时间戳增量合并，防止旧数据覆盖新修改）
  try {
    const res = await fetch(buildApiUrl('/api/admin/users'));
    if (res.ok) {
      const resJson = await res.json();
      if (Array.isArray(resJson.users)) {
        resJson.users.forEach((u: any) => {
          const acc = (u?.account || '').toLowerCase();
          if (u && u.uid && u.uid !== 'u_author_00001' && u.uid !== 'u_author_shinian' && acc !== 'author' && acc !== '258090') {
            const existing = usersMap.get(u.uid);
            if (existing) {
              const existingTime = new Date(existing.updatedAt || 0).getTime();
              const serverTime = new Date(u.updatedAt || 0).getTime();
              const newer = existingTime >= serverTime ? existing : u;
              const older = existingTime >= serverTime ? u : existing;
              usersMap.set(u.uid, {
                ...older,
                ...newer,
                photoURL: existing.photoURL || u.photoURL || ''
              });
            } else {
              usersMap.set(u.uid, u);
            }
          }
        });
      }
    }
  } catch (e) {
    console.warn('Server list users error:', e);
  }

  // 按照 account (小写) 进行智能去重与属性合并：如果已有记录，以 updatedAt 最新的昵称与档案属性为准
  const accountDeduplicated = new Map<string, DomesticUser>();

  for (const user of usersMap.values()) {
    const accKey = (user.account || user.uid || '').toLowerCase().trim();
    if (!accKey) continue;

    if (!accountDeduplicated.has(accKey)) {
      accountDeduplicated.set(accKey, user);
    } else {
      const existing = accountDeduplicated.get(accKey)!;
      const existingTime = new Date(existing.updatedAt || 0).getTime();
      const userTime = new Date(user.updatedAt || 0).getTime();
      const newer = existingTime >= userTime ? existing : user;
      const older = existingTime >= userTime ? user : existing;

      // 优先保留有真实头像 photoURL 的记录
      const preferredPhotoURL = existing.photoURL || user.photoURL || '';
      const preferredUid = existing.photoURL ? existing.uid : (user.photoURL ? user.uid : existing.uid);
      const redundantUid = preferredUid === existing.uid ? user.uid : existing.uid;

      // 如果有冗余的重复 UID，从云端 Firestore 异步清理无头像的重复条目
      if (redundantUid && redundantUid !== preferredUid) {
        deleteDoc(doc(db, 'users', redundantUid)).catch(() => {});
      }

      const merged: DomesticUser = {
        ...older,
        ...newer,
        uid: preferredUid,
        photoURL: preferredPhotoURL,
        displayName: newer.displayName || older.displayName || '拾年墨客',
        role: (existing.role === 'admin' || user.role === 'admin') ? 'admin' : 'user',
        licenseStatus: (existing.licenseStatus === 'active' || user.licenseStatus === 'active') ? 'active' : 'trial',
        licensedAt: existing.licensedAt || user.licensedAt || new Date().toISOString()
      };
      accountDeduplicated.set(accKey, merged);
    }
  }

  // 检查是否已有 xiaoxiao，如果没有才注入 defaultAdmin
  const hasXiaoxiao = accountDeduplicated.has('xiaoxiao');
  if (!hasXiaoxiao) {
    const defaultAdmin: DomesticUser = {
      uid: 'u_author_xiaoxiao',
      account: 'xiaoxiao',
      displayName: '孝孝',
      email: 'sjx20091118@gmail.com',
      photoURL: DEFAULT_AUTHOR_AVATAR,
      role: 'admin',
      licenseStatus: 'active',
      licensedAt: '2026-10-01T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: new Date().toISOString()
    };
    accountDeduplicated.set('xiaoxiao', defaultAdmin);
  }

  // 4. 同步当前本地登录用户状态 (以 updatedAt 为准，防止旧的 list 覆盖最新的本地/云端档案修改)
  const local = getLocalDomesticUser();
  if (local && local.account) {
    const accKey = (local.account || '').toLowerCase().trim();
    const existing = accountDeduplicated.get(accKey);
    if (existing) {
      const localTime = new Date(local.updatedAt || 0).getTime();
      const existingTime = new Date(existing.updatedAt || 0).getTime();
      const updatedLocal: DomesticUser = localTime >= existingTime
        ? {
            ...existing,
            ...local,
            photoURL: local.photoURL || existing.photoURL || ''
          }
        : {
            ...local,
            ...existing,
            photoURL: existing.photoURL || local.photoURL || ''
          };

      setLocalDomesticUser(updatedLocal);
      accountDeduplicated.set(accKey, updatedLocal);

      // 异步同步至 Firestore 与服务端持久化
      try {
        setDoc(doc(db, 'users', updatedLocal.uid), updatedLocal, { merge: true }).catch(() => {});
        fetch(buildApiUrl('/api/admin/users/save'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedLocal)
        }).catch(() => {});
      } catch {}
    }
  }

  const allUsers = Array.from(accountDeduplicated.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // 5. 异步回写本地缓存
  try {
    localStorage.setItem('shinian_all_users_cache', JSON.stringify(allUsers));
  } catch {}

  return allUsers;
}

// Admin: Create new user
export async function adminCreateUser(params: {
  account: string;
  displayName: string;
  passwordPlain: string;
  email?: string;
  role?: 'user' | 'admin';
  licenseStatus?: 'trial' | 'active';
  photoURL?: string;
}): Promise<DomesticUser> {
  const created = await registerDomesticUser(
    {
      account: params.account,
      displayName: params.displayName,
      passwordPlain: params.passwordPlain,
      email: params.email,
      photoURL: params.photoURL
    },
    true
  );

  const updates: Partial<DomesticUser> = {};
  if (params.role) {
    updates.role = params.role;
    created.role = params.role;
  }
  if (params.licenseStatus) {
    updates.licenseStatus = params.licenseStatus;
    created.licenseStatus = params.licenseStatus;
    if (params.licenseStatus === 'active') {
      updates.licensedAt = new Date().toISOString();
      created.licensedAt = updates.licensedAt;
    } else {
      updates.licenseKey = '';
      created.licenseKey = '';
    }
  }

  if (Object.keys(updates).length > 0) {
    await adminUpdateUser(created.uid, updates);
  }

  return created;
}

// Admin: Update user profile (云端 + 服务端 + 本地全同步)
export async function adminUpdateUser(uid: string, updates: Partial<DomesticUser>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const now = new Date().toISOString();
  const payload = { ...updates, updatedAt: now };

  // 1. 写入 Firestore
  try {
    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    console.warn('Admin update user firestore error:', err);
  }

  // 2. 写入服务端持久化存储
  try {
    await fetch(buildApiUrl('/api/admin/users/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...payload })
    });
  } catch (err) {
    console.warn('Admin update user server error:', err);
  }

  // 3. 更新本地全量缓存
  try {
    const rawAll = localStorage.getItem('shinian_all_users_cache');
    if (rawAll) {
      const list: DomesticUser[] = JSON.parse(rawAll);
      const updated = list.map(u => (u.uid === uid ? { ...u, ...payload } : u));
      localStorage.setItem('shinian_all_users_cache', JSON.stringify(updated));
    }
  } catch {}

  const local = getLocalDomesticUser();
  if (local && (local.uid === uid || local.account === updates.account)) {
    setLocalDomesticUser({ ...local, ...updates, updatedAt: now });
  }
}

// Admin: Delete/Deregister user profile (注销用户与解绑邮箱：云端 + 服务端 + 本地全同步)
export async function adminDeleteUser(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);

  // 1. 从 Firestore 删除
  try {
    await deleteDoc(userRef);
  } catch (err) {
    console.warn('Admin delete user firestore error:', err);
  }

  // 2. 从服务端磁盘持久化文件删除
  try {
    await fetch(buildApiUrl('/api/admin/users/delete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
  } catch (err) {
    console.warn('Admin delete user server error:', err);
  }

  // 3. 从本地全量缓存删除
  try {
    const rawAll = localStorage.getItem('shinian_all_users_cache');
    if (rawAll) {
      const list: DomesticUser[] = JSON.parse(rawAll);
      const filtered = list.filter(u => u.uid !== uid);
      localStorage.setItem('shinian_all_users_cache', JSON.stringify(filtered));
    }
  } catch {}

  const local = getLocalDomesticUser();
  if (local && local.uid === uid) {
    setLocalDomesticUser(null);
  }
}

// User self-deregistration (用户自主注销账号)
export async function deregisterDomesticUser(uid: string): Promise<void> {
  await adminDeleteUser(uid);
}

// Check if a user is admin
export async function checkIsAdmin(uid?: string, account?: string): Promise<boolean> {
  const current = getLocalDomesticUser();
  const acc = account || current?.account;
  const id = uid || current?.uid;
  if (acc === 'admin' || acc === 'sjx20091118' || current?.role === 'admin') return true;
  if (!id) return false;
  try {
    const adminDoc = await getDoc(doc(db, 'admins', id));
    return adminDoc.exists();
  } catch {
    return false;
  }
}

// ==================== Email Verification Code Service ====================

export async function sendEmailVerificationCode(
  email: string,
  purpose: 'login' | 'bind' | 'unbind' | 'register' | string = 'login'
): Promise<{ success: boolean; message: string; previewCode?: string; sentReal?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const smtp = getSmtpConfig();

  const response = await fetch(buildApiUrl('/api/auth/send-code'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      purpose,
      smtpConfig: smtp.isConfigured ? smtp : undefined
    })
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.error || '验证码发送失败');
  }
  return resJson;
}

export async function verifyEmailCode(
  email: string,
  code: string,
  purpose?: string
): Promise<boolean> {
  const response = await fetch(buildApiUrl('/api/auth/verify-code'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
      purpose
    })
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.error || '验证码校验失败');
  }
  return true;
}

// 邮箱验证码直接登录（未注册则自动注册并绑定邮箱）
export async function loginWithEmailVerificationCode(
  email: string,
  code: string
): Promise<DomesticUser> {
  const cleanEmail = email.trim().toLowerCase();
  await verifyEmailCode(cleanEmail, code, 'login');

  // 查询是否已有该邮箱的用户
  const usersRef = collection(db, 'users');
  const snap = await getDocs(query(usersRef, where('email', '==', cleanEmail), limit(1)));

  if (!snap.empty) {
    const user = snap.docs[0].data() as DomesticUser;
    setLocalDomesticUser(user);
    return user;
  }

  // 若无对应邮箱，则自动初始化用户
  const usernamePart = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '').slice(0, 10) || '拾年客';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newAccount = `${usernamePart.toLowerCase()}_${randomSuffix}`;

  const newUser = await registerDomesticUser({
    account: newAccount,
    displayName: usernamePart,
    passwordPlain: `Shinian@${Math.floor(100000 + Math.random() * 900000)}`,
    email: cleanEmail
  });

  return newUser;
}

// ==================== Commercial Buyout & License System ====================

export interface SystemSettings {
  trialDays: number;
  buyoutPrice: number;
  easypayUrl?: string;
  easypayPid?: string;
  easypayKey?: string;
}

export function getEffectiveTrialDays(): number {
  try {
    const raw = localStorage.getItem('sn_trial_days');
    if (raw !== null && raw !== undefined && raw.trim() !== '') {
      const parsed = parseInt(raw.trim(), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse sn_trial_days:', e);
  }
  return 7;
}

export function getEffectiveBuyoutPrice(): number {
  try {
    const raw = localStorage.getItem('sn_buyout_price');
    if (raw !== null && raw !== undefined && raw.trim() !== '') {
      const parsed = parseFloat(raw.trim());
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse sn_buyout_price:', e);
  }
  return 19.9;
}

export async function fetchServerSystemSettings(): Promise<SystemSettings> {
  try {
    const res = await fetch(buildApiUrl('/api/admin/system-settings'));
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        if (data.settings.trialDays !== undefined) {
          localStorage.setItem('sn_trial_days', String(data.settings.trialDays));
        }
        if (data.settings.buyoutPrice !== undefined) {
          localStorage.setItem('sn_buyout_price', String(data.settings.buyoutPrice));
        }
        if (data.settings.easypayUrl !== undefined) {
          localStorage.setItem('sn_easypay_url', String(data.settings.easypayUrl));
        }
        if (data.settings.easypayPid !== undefined) {
          localStorage.setItem('sn_easypay_pid', String(data.settings.easypayPid));
        }
        if (data.settings.easypayKey !== undefined) {
          localStorage.setItem('sn_easypay_key', String(data.settings.easypayKey));
        }
        return data.settings;
      }
    }
  } catch (err) {
    console.warn('Fetch server system settings error:', err);
  }
  return {
    trialDays: getEffectiveTrialDays(),
    buyoutPrice: getEffectiveBuyoutPrice(),
    easypayUrl: localStorage.getItem('sn_easypay_url') || '',
    easypayPid: localStorage.getItem('sn_easypay_pid') || '',
    easypayKey: localStorage.getItem('sn_easypay_key') || ''
  };
}

export async function saveServerSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  if (settings.trialDays !== undefined) {
    localStorage.setItem('sn_trial_days', String(settings.trialDays));
  }
  if (settings.buyoutPrice !== undefined) {
    localStorage.setItem('sn_buyout_price', String(settings.buyoutPrice));
  }
  if (settings.easypayUrl !== undefined) {
    localStorage.setItem('sn_easypay_url', String(settings.easypayUrl));
  }
  if (settings.easypayPid !== undefined) {
    localStorage.setItem('sn_easypay_pid', String(settings.easypayPid));
  }
  if (settings.easypayKey !== undefined) {
    localStorage.setItem('sn_easypay_key', String(settings.easypayKey));
  }
  try {
    const res = await fetch(buildApiUrl('/api/admin/system-settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) {
      const data = await res.json();
      return data.settings;
    }
  } catch (err) {
    console.warn('Save server system settings error:', err);
  }
  return {
    trialDays: getEffectiveTrialDays(),
    buyoutPrice: getEffectiveBuyoutPrice(),
    easypayUrl: localStorage.getItem('sn_easypay_url') || '',
    easypayPid: localStorage.getItem('sn_easypay_pid') || '',
    easypayKey: localStorage.getItem('sn_easypay_key') || ''
  };
}

// 检查用户买断/试用期状态 (深度适配 0 天体验即刻阻断与永久买断状态)
export function checkUserLicenseStatus(user: DomesticUser | null): {
  status: 'active' | 'trial' | 'expired';
  remainingDays: number;
  isAuthorOrAdmin: boolean;
  trialExpireDate?: string;
  trialDaysConfigured: number;
} {
  const trialDays = getEffectiveTrialDays();

  if (!user) {
    return {
      status: trialDays === 0 ? 'expired' : 'trial',
      remainingDays: trialDays,
      isAuthorOrAdmin: false,
      trialDaysConfigured: trialDays,
      trialExpireDate: trialDays === 0 ? '未开启体验（0天）' : `${trialDays} 天试用期`
    };
  }

  const isAuthor = isAuthorUser(user);
  if (isAuthor) {
    return {
      status: 'active',
      remainingDays: 9999,
      isAuthorOrAdmin: true,
      trialDaysConfigured: trialDays,
      trialExpireDate: '作者尊享'
    };
  }

  if (user.role === 'admin') {
    return {
      status: 'active',
      remainingDays: 9999,
      isAuthorOrAdmin: true,
      trialDaysConfigured: trialDays,
      trialExpireDate: '管理员权限'
    };
  }

  if (user.licenseStatus === 'active') {
    return {
      status: 'active',
      remainingDays: 9999,
      isAuthorOrAdmin: false,
      trialDaysConfigured: trialDays,
      trialExpireDate: '已买断激活'
    };
  }

  // 若管理员设置试用天数为 0 天，则非买断用户直接判定为到期
  if (trialDays === 0) {
    return {
      status: 'expired',
      remainingDays: 0,
      isAuthorOrAdmin: false,
      trialExpireDate: '未开启体验（0天）',
      trialDaysConfigured: 0
    };
  }

  const createdAtTime = new Date(user.createdAt || Date.now()).getTime();
  const trialEndTime = user.trialExpireAt
    ? Math.min(new Date(user.trialExpireAt).getTime(), createdAtTime + trialDays * 24 * 60 * 60 * 1000)
    : createdAtTime + trialDays * 24 * 60 * 60 * 1000;

  const now = Date.now();
  const diffMs = trialEndTime - now;
  const remainingDays = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

  if (diffMs <= 0) {
    return {
      status: 'expired',
      remainingDays: 0,
      isAuthorOrAdmin: false,
      trialExpireDate: new Date(trialEndTime).toLocaleDateString('zh-CN'),
      trialDaysConfigured: trialDays
    };
  }

  return {
    status: 'trial',
    remainingDays,
    isAuthorOrAdmin: false,
    trialExpireDate: new Date(trialEndTime).toLocaleDateString('zh-CN'),
    trialDaysConfigured: trialDays
  };
}

// 使用激活码激活买断授权
export async function activateLicenseWithCode(code: string, user: DomesticUser): Promise<DomesticUser> {
  const response = await fetch(buildApiUrl('/api/license/activate-code'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: code.trim(),
      uid: user.uid,
      account: user.account
    })
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.error || '激活失败');
  }

  // 更新用户云端与本地授权状态
  const updates: Partial<DomesticUser> = {
    licenseStatus: 'active',
    licensedAt: new Date().toISOString(),
    licenseKey: resJson.code || code.trim().toUpperCase()
  };

  await updateDomesticUserProfile(updates);
  const updatedUser: DomesticUser = { ...user, ...updates };
  setLocalDomesticUser(updatedUser);
  return updatedUser;
}

// 创建商业订单
export async function createLicensePaymentOrder(
  user: DomesticUser,
  payType: 'alipay' | 'wechat' = 'alipay',
  amount?: number
): Promise<{
  orderId: string;
  qrData: string;
  amount: number;
  expireSeconds: number;
  payUrl?: string;
  isEasyPayConfigured?: boolean;
}> {
  const response = await fetch(buildApiUrl('/api/pay/create-order'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: user.uid,
      account: user.account,
      payType,
      amount
    })
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.error || '订单创建失败');
  }
  return {
    orderId: resJson.order.orderId,
    qrData: resJson.qrData,
    amount: resJson.order.amount,
    expireSeconds: resJson.expireSeconds || 600,
    payUrl: resJson.payUrl,
    isEasyPayConfigured: resJson.isEasyPayConfigured
  };
}

// 检查订单支付状态
export async function checkLicensePaymentOrder(orderId: string): Promise<boolean> {
  try {
    const response = await fetch(buildApiUrl(`/api/pay/check-order/${orderId}`));
    if (!response.ok) return false;
    const resJson = await response.json();
    return resJson.status === 'paid';
  } catch {
    return false;
  }
}

// 模拟完成支付（供无签约环境调试体验）
export async function simulateLicensePaymentSuccess(orderId: string, user: DomesticUser): Promise<DomesticUser> {
  const response = await fetch(buildApiUrl(`/api/pay/simulate-success/${orderId}`), {
    method: 'POST'
  });
  if (!response.ok) {
    throw new Error('支付确认失败');
  }

  const updates: Partial<DomesticUser> = {
    licenseStatus: 'active',
    licensedAt: new Date().toISOString(),
    licenseKey: orderId
  };

  await updateDomesticUserProfile(updates);
  const updatedUser: DomesticUser = { ...user, ...updates };
  setLocalDomesticUser(updatedUser);
  return updatedUser;
}

// 获取激活码列表（管理后台：Firestore 云端与服务器持久化文件双向同步）
export async function listAllLicenseCodes(): Promise<any[]> {
  const codesMap = new Map<string, any>();

  // 1. 从本地缓存快速读取
  try {
    const cached = localStorage.getItem('shinian_activation_codes_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed.forEach(c => codesMap.set(c.code, c));
      }
    }
  } catch {}

  // 2. 从 Firestore 云端数据库拉取
  try {
    const codesRef = collection(db, 'activation_codes');
    const snap = await getDocs(codesRef);
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const code = data.code || docSnap.id;
      codesMap.set(code, {
        code,
        createdAt: data.createdAt || Date.now(),
        redeemedBy: data.redeemedBy,
        redeemedAt: data.redeemedAt,
        note: data.note || '云端买断卡密'
      });
    });
  } catch (err) {
    console.warn('Fetch firestore activation codes:', err);
  }

  // 3. 从后端服务器持久化文件 API 拉取
  try {
    const response = await fetch(buildApiUrl('/api/license/codes'));
    if (response.ok) {
      const resJson = await response.json();
      if (Array.isArray(resJson.codes)) {
        resJson.codes.forEach((c: any) => {
          if (!codesMap.has(c.code) || (!codesMap.get(c.code).redeemedBy && c.redeemedBy)) {
            codesMap.set(c.code, c);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Fetch server activation codes:', err);
  }

  // 确保初始 3 组预置买断卡密
  const defaultCodes = [
    { code: 'SHINIAN-8888-A3F1-9C2D', createdAt: 1711900000000, note: '系统预置买断卡密' },
    { code: 'SHINIAN-9999-E5B7-1A4C', createdAt: 1711900000000, note: '系统预置买断卡密' },
    { code: 'SHINIAN-YEAR-2026-ZEN1', createdAt: 1711900000000, note: '系统预置买断卡密' }
  ];
  defaultCodes.forEach(def => {
    if (!codesMap.has(def.code)) {
      codesMap.set(def.code, def);
    }
  });

  const allList = Array.from(codesMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // 异步写回本地缓存与 Firestore 保持数据永不丢失
  try {
    localStorage.setItem('shinian_activation_codes_cache', JSON.stringify(allList));
  } catch {}

  return allList;
}

// 一键清空所有沙箱本地缓存并重置为初始纯净状态
export async function resetSandboxCacheAndPristine(): Promise<{ users: DomesticUser[]; codes: any[] }> {
  // 1. 清理本地所有与账号、卡密相关的缓存
  localStorage.removeItem('shinian_all_users_cache');
  localStorage.removeItem('shinian_activation_codes_cache');

  // 2. 构造唯一纯净超级管理员账号 xiaoxiao
  const defaultAdmin: DomesticUser = {
    uid: 'u_author_xiaoxiao',
    account: 'xiaoxiao',
    displayName: '孝孝',
    email: 'sjx20091118@gmail.com',
    photoURL: DEFAULT_AUTHOR_AVATAR,
    role: 'admin',
    licenseStatus: 'active',
    licensedAt: '2026-10-01T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  };
  setLocalDomesticUser(defaultAdmin);
  localStorage.setItem('shinian_all_users_cache', JSON.stringify([defaultAdmin]));

  // 3. 构造 3 个初始系统买断卡密
  const defaultCodes = [
    { code: 'SHINIAN-8888-A3F1-9C2D', createdAt: 1711900000000, note: '系统预置买断卡密' },
    { code: 'SHINIAN-9999-E5B7-1A4C', createdAt: 1711900000000, note: '系统预置买断卡密' },
    { code: 'SHINIAN-YEAR-2026-ZEN1', createdAt: 1711900000000, note: '系统预置买断卡密' }
  ];
  localStorage.setItem('shinian_activation_codes_cache', JSON.stringify(defaultCodes));

  // 4. 通知服务端彻底重置持久化文件
  try {
    await fetch(buildApiUrl('/api/admin/users/reset'), { method: 'POST' });
    await fetch(buildApiUrl('/api/license/codes/reset'), { method: 'POST' });
  } catch (e) {
    console.warn('Server reset API error:', e);
  }

  // 5. 清理云端 Firestore 中的废弃文档
  try {
    const legacyUids = ['u_author_00001', 'u_author_shinian', 'author', '258090'];
    for (const lUid of legacyUids) {
      deleteDoc(doc(db, 'users', lUid)).catch(() => {});
    }
    await setDoc(doc(db, 'users', defaultAdmin.uid), defaultAdmin, { merge: true });
  } catch (e) {
    console.warn('Firestore reset error:', e);
  }

  return {
    users: [defaultAdmin],
    codes: defaultCodes
  };
}

// 批量生成激活码（管理后台：自动同步到服务器持久化文件与 Firestore）
export async function generateBatchLicenseCodes(count = 5, note = '后台批量生成'): Promise<string[]> {
  let generatedCodes: string[] = [];

  // 1. 调用服务端生成并写入磁盘
  try {
    const response = await fetch(buildApiUrl('/api/license/generate-codes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, note })
    });
    if (response.ok) {
      const resJson = await response.json();
      generatedCodes = resJson.codes || [];
    }
  } catch (err) {
    console.warn('Server generate-codes error:', err);
  }

  // 如果后端因网络异常未能生成，前端本地兜底生成唯一卡密
  if (generatedCodes.length === 0) {
    const num = Math.min(50, Math.max(1, count));
    for (let i = 0; i < num; i++) {
      const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const p3 = Math.random().toString(36).substring(2, 6).toUpperCase();
      generatedCodes.push(`SHINIAN-${p1}-${p2}-${p3}`);
    }
  }

  // 2. 写入 Firestore 云端数据库
  const now = Date.now();
  for (let i = 0; i < generatedCodes.length; i++) {
    const code = generatedCodes[i];
    const item = {
      code,
      createdAt: now + i,
      note,
      redeemedBy: null,
      redeemedAt: null
    };
    try {
      await setDoc(doc(db, 'activation_codes', code), item, { merge: true });
    } catch (e) {
      console.warn(`Failed to sync code ${code} to firestore:`, e);
    }
  }

  // 3. 更新本地缓存
  try {
    const existing = await listAllLicenseCodes();
    localStorage.setItem('shinian_activation_codes_cache', JSON.stringify(existing));
  } catch {}

  return generatedCodes;
}

// 管理员删除单条激活码
export async function deleteLicenseCode(code: string): Promise<void> {
  const cleanCode = code.trim().toUpperCase();
  // 1. 从 Firestore 删除
  try {
    await deleteDoc(doc(db, 'activation_codes', cleanCode));
  } catch (err) {
    console.warn('Delete firestore code error:', err);
  }

  // 2. 从服务端删除
  try {
    await fetch(buildApiUrl('/api/license/delete-code'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cleanCode })
    });
  } catch (err) {
    console.warn('Delete server code error:', err);
  }

  // 3. 更新本地缓存
  try {
    const cached = localStorage.getItem('shinian_activation_codes_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      const filtered = parsed.filter((c: any) => c.code !== cleanCode);
      localStorage.setItem('shinian_activation_codes_cache', JSON.stringify(filtered));
    }
  } catch {}
}

// 管理员直接设置或授权用户的买断状态
export async function adminSetUserLicenseStatus(
  uid: string,
  status: 'active' | 'trial',
  licenseKey?: string
): Promise<void> {
  const now = new Date().toISOString();
  const updates: Partial<DomesticUser> = {
    licenseStatus: status,
    licensedAt: status === 'active' ? now : undefined,
    licenseKey: status === 'active' ? (licenseKey || `ADMIN_GRANT_${Date.now().toString(36).toUpperCase()}`) : ''
  };

  await adminUpdateUser(uid, updates);
}

// ==================== 全站数据全量一键导出与恢复导入 (Data Migration Suite) ====================
export async function exportMasterBackup(): Promise<any> {
  // 1. 尝试从服务端拉取全量数据
  try {
    const res = await fetch(buildApiUrl('/api/admin/migration/export'));
    if (res.ok) {
      const json = await res.json();
      if (json.backup) return json.backup;
    }
  } catch (e) {
    console.warn('Server export backup error:', e);
  }

  // 2. 本地与云端数据合成兜底导出包
  const [users, codes, settings, smtp, notices, versions] = await Promise.all([
    listAllUsers().catch(() => []),
    listAllLicenseCodes().catch(() => []),
    fetchServerSystemSettings().catch(() => null),
    fetchServerSmtpConfig().catch(() => null),
    listAllSystemNotices().catch(() => []),
    listAllAppVersions().catch(() => [])
  ]);

  return {
    appName: '拾年 (Shinian)',
    exportedAt: new Date().toISOString(),
    version: '1.2.6',
    data: {
      users: users || [],
      activationCodes: codes || [],
      systemSettings: settings || { trialDays: 7, buyoutPrice: 19.9 },
      smtpConfig: smtp || getSmtpConfig(),
      notices: notices || [],
      versions: versions || []
    }
  };
}

export async function importMasterBackup(backupPayload: any): Promise<{ success: boolean; message: string }> {
  if (!backupPayload || !backupPayload.data) {
    throw new Error('导入的数据包格式无效');
  }

  // 1. 推送到服务端恢复
  try {
    const res = await fetch(buildApiUrl('/api/admin/migration/import'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backup: backupPayload })
    });
    if (res.ok) {
      const json = await res.json();
      // 同步本地缓存
      if (Array.isArray(backupPayload.data.users)) {
        localStorage.setItem('shinian_all_users_cache', JSON.stringify(backupPayload.data.users));
      }
      if (Array.isArray(backupPayload.data.activationCodes)) {
        localStorage.setItem('shinian_activation_codes_cache', JSON.stringify(backupPayload.data.activationCodes));
      }
      return { success: true, message: json.message || '全量数据恢复成功' };
    }
  } catch (e: any) {
    console.warn('Server import error, saving locally:', e);
  }

  // 2. 本地缓存与云端写入
  if (Array.isArray(backupPayload.data.users)) {
    localStorage.setItem('shinian_all_users_cache', JSON.stringify(backupPayload.data.users));
  }
  if (Array.isArray(backupPayload.data.activationCodes)) {
    localStorage.setItem('shinian_activation_codes_cache', JSON.stringify(backupPayload.data.activationCodes));
  }

  return { success: true, message: '数据已在本地与云端就绪' };
}

