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
  userNumber: string; // e.g. "00018"
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
    acc === 'author' ||
    acc === 'xiaoxiao' ||
    acc === '笑笑'
  );
}

export function isAuthorUser(user: DomesticUser | null): boolean {
  if (!user) return false;
  const acc = (user.account || '').trim().toLowerCase();
  const name = (user.displayName || '').trim();
  return (
    acc === 'author' ||
    acc === 'xiaoxiao' ||
    name === '笑笑' ||
    name === '拾年 · 作者' ||
    (user.userNumber === '00001' && (acc === 'author' || name === '拾年 · 作者'))
  );
}

// Preview next user number (Starts from 00002 as 00001 is permanently locked for author)
export async function getNextUserNumberPreview(accountHint?: string): Promise<string> {
  if (accountHint && isAuthorAccount(accountHint)) {
    return '00001';
  }

  try {
    const counterRef = doc(db, 'system_counters', 'user_registration');
    const snap = await getDoc(counterRef);
    let nextCount = 2; // Default start at 00002
    if (snap.exists()) {
      const dbCount = snap.data().currentCount || 1;
      nextCount = Math.max(2, dbCount + 1);
    }
    return String(nextCount).padStart(5, '0');
  } catch (err) {
    // Local fallback counter starting at 2
    const localCount = parseInt(localStorage.getItem('shinian_fallback_user_counter') || '2', 10);
    return String(Math.max(2, localCount)).padStart(5, '0');
  }
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

  // Get and increment sequential user number atomically
  let assignedNumberStr = '00002';
  if (isAuthor) {
    assignedNumberStr = '00001';
  } else {
    const counterRef = doc(db, 'system_counters', 'user_registration');
    try {
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentCount = 1; // 00001 is author
        if (counterDoc.exists()) {
          currentCount = counterDoc.data().currentCount || 1;
        }
        const nextCount = Math.max(2, currentCount + 1);
        assignedNumberStr = String(nextCount).padStart(5, '0');
        transaction.set(counterRef, {
          counterId: 'user_registration',
          currentCount: nextCount,
          updatedAt: now
        });
      });
    } catch (err) {
      // Fallback if counter update fails
      const localCount = parseInt(localStorage.getItem('shinian_fallback_user_counter') || '2', 10);
      const nextCount = Math.max(2, localCount);
      assignedNumberStr = String(nextCount).padStart(5, '0');
      localStorage.setItem('shinian_fallback_user_counter', String(nextCount + 1));
    }
  }

  const uid = `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const effectiveTrialDays = getEffectiveTrialDays();
  const isZeroTrial = effectiveTrialDays === 0;

  const newUser: DomesticUser = {
    uid,
    account: cleanAccount,
    displayName: isAuthor && (!params.displayName.trim() || params.displayName === '拾年墨客') ? '拾年 · 作者' : cleanName,
    userNumber: assignedNumberStr,
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
  const rawInput = accountOrEmailOrPhone.trim();
  const cleanInput = rawInput.toLowerCase();
  const hashedPassword = await hashPassword(passwordPlain);

  const isUserMatch = (u: DomesticUser | null | undefined): boolean => {
    if (!u) return false;
    const acc = (u.account || '').toLowerCase();
    const name = (u.displayName || '').trim();
    const nameLower = name.toLowerCase();
    const mail = (u.email || '').toLowerCase();
    const phone = (u.phone || '').trim();

    return (
      acc === cleanInput ||
      name === rawInput ||
      nameLower === cleanInput ||
      (!!mail && mail === cleanInput) ||
      (!!phone && phone === rawInput)
    );
  };

  // 1. 检查当前本地登录用户
  const local = getLocalDomesticUser();
  if (isUserMatch(local)) {
    if (local!.passwordHash === hashedPassword) {
      return local!;
    }
    throw new Error('密码不正确，请重新输入');
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

  // 3. 检查服务端持久化存储 API (针对新注册或多设备用户)
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

  // 4. 穿透查询 Firestore 云端集合
  if (!matchedUser) {
    try {
      const usersRef = collection(db, 'users');
      // 按账号查询
      let snap = await getDocs(query(usersRef, where('account', '==', cleanInput), limit(1)));
      // 按昵称查询
      if (snap.empty && rawInput) {
        snap = await getDocs(query(usersRef, where('displayName', '==', rawInput), limit(1)));
      }
      // 按邮箱查询
      if (snap.empty && cleanInput.includes('@')) {
        snap = await getDocs(query(usersRef, where('email', '==', cleanInput), limit(1)));
      }
      // 按手机号查询
      if (snap.empty && /^\d+$/.test(rawInput)) {
        snap = await getDocs(query(usersRef, where('phone', '==', rawInput), limit(1)));
      }

      if (!snap.empty) {
        matchedUser = snap.docs[0].data() as DomesticUser;
      }
    } catch (err) {
      console.warn('Firestore login query error:', err);
    }
  }

  // 5. 校验找到的目标用户
  if (matchedUser) {
    if (matchedUser.passwordHash && matchedUser.passwordHash !== hashedPassword) {
      throw new Error('密码不正确，请重新输入');
    }

    const isXiaoxiaoOrAuthor =
      isAuthorAccount(matchedUser.account) ||
      (matchedUser.displayName || '').includes('笑笑') ||
      (matchedUser.account || '').toLowerCase() === 'xiaoxiao';
    if (isXiaoxiaoOrAuthor) {
      matchedUser.userNumber = matchedUser.userNumber || '00001';
      matchedUser.role = 'admin';
      matchedUser.licenseStatus = 'active';
    }

    setLocalDomesticUser(matchedUser);

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

  // 作者账号免注自启保护
  if (isAuthorAccount(cleanInput)) {
    return await registerDomesticUser({
      account: cleanInput,
      displayName: '拾年 · 作者',
      passwordPlain: passwordPlain,
      photoURL: ''
    });
  }

  throw new Error('未找到该账号、昵称或邮箱，请检查输入或先进行注册');
}

// Update User Profile (Merge with setDoc to guarantee Firestore persistence)
export async function updateDomesticUserProfile(updatedFields: Partial<DomesticUser>): Promise<DomesticUser> {
  const current = getLocalDomesticUser();
  if (!current) throw new Error('未登录');

  const now = new Date().toISOString();
  const merged: DomesticUser = {
    ...current,
    ...updatedFields,
    updatedAt: now
  };

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
}

const SMTP_CONFIG_KEY = 'shinian_smtp_config_v1';

export async function fetchServerSmtpConfig(): Promise<SmtpConfig> {
  try {
    const res = await fetch(buildApiUrl('/api/admin/smtp-config'));
    if (res.ok) {
      const data = await res.json();
      if (data.config && data.config.user && data.config.pass) {
        saveSmtpConfig(data.config);
        return data.config;
      }
    }
  } catch (e) {
    console.warn('Fetch server smtp config error:', e);
  }
  return getSmtpConfig();
}

export function getSmtpConfig(): SmtpConfig {
  try {
    const raw = localStorage.getItem(SMTP_CONFIG_KEY);
    return raw ? JSON.parse(raw) : {
      host: '',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      senderName: '拾年时光',
      isConfigured: false
    };
  } catch {
    return {
      host: '',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      senderName: '拾年时光',
      isConfigured: false
    };
  }
}

export function saveSmtpConfig(config: SmtpConfig): void {
  const cleanConfig: SmtpConfig = {
    ...config,
    host: String(config.host || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, ''),
    user: String(config.user || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, ''),
    pass: String(config.pass || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, ''),
    isConfigured: !!(config.host && config.user && config.pass)
  };
  localStorage.setItem(SMTP_CONFIG_KEY, JSON.stringify(cleanConfig));
  // 同步通知服务端持久化保存
  fetch(buildApiUrl('/api/admin/save-smtp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanConfig)
  }).catch(() => {});
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

  const response = await fetch(buildApiUrl('/api/admin/test-smtp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: cleanHost,
      port: config.port,
      user: cleanUser,
      pass: cleanPass,
      toEmail: cleanToEmail
    })
  });

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

  // 1. 从本地缓存预热
  try {
    const rawCache = localStorage.getItem('shinian_all_users_cache');
    if (rawCache) {
      const cachedList: DomesticUser[] = JSON.parse(rawCache);
      cachedList.forEach(u => {
        if (u && u.uid) usersMap.set(u.uid, u);
      });
    }
  } catch {}

  // 2. 从 Firestore 云端读取
  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    snap.docs.forEach(d => {
      const u = d.data() as any;
      const isXiaoxiaoOrAuthor =
        isAuthorAccount(u.account) ||
        (u.displayName || '').includes('笑笑') ||
        (u.account || '').toLowerCase() === 'xiaoxiao';
      const role = isXiaoxiaoOrAuthor ? 'admin' : (u.role || 'user');
      const userNumber = isXiaoxiaoOrAuthor ? (u.userNumber || '00001') : (u.userNumber || '00002');
      const formatted: DomesticUser = {
        uid: u.uid || d.id,
        account: u.account || '',
        displayName: u.displayName || '拾年墨客',
        userNumber,
        photoURL: u.photoURL || u.avatar || u.avatarUrl || '',
        email: u.email || '',
        phone: u.phone || '',
        role,
        licenseStatus: u.licenseStatus || (isXiaoxiaoOrAuthor || role === 'admin' ? 'active' : 'trial'),
        trialExpireAt: u.trialExpireAt,
        licensedAt: u.licensedAt || (isXiaoxiaoOrAuthor || role === 'admin' ? u.createdAt : undefined),
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

  // 3. 从后端服务端磁盘持久化接口读取 (杜绝云端波动导致用户消失)
  try {
    const res = await fetch(buildApiUrl('/api/admin/users'));
    if (res.ok) {
      const resJson = await res.json();
      if (Array.isArray(resJson.users)) {
        resJson.users.forEach((u: any) => {
          if (u && u.uid) {
            const existing = usersMap.get(u.uid);
            usersMap.set(u.uid, {
              ...existing,
              ...u,
              photoURL: u.photoURL || existing?.photoURL || ''
            });
          }
        });
      }
    }
  } catch (e) {
    console.warn('Server list users error:', e);
  }

  // 4. 同步当前本地登录用户状态
  const local = getLocalDomesticUser();
  if (local && local.uid) {
    const existing = usersMap.get(local.uid);
    if (existing) {
      const updatedLocal: DomesticUser = {
        ...local,
        ...existing,
        photoURL: local.photoURL || existing.photoURL || ''
      };
      setLocalDomesticUser(updatedLocal);
      usersMap.set(local.uid, updatedLocal);
    }
  }

  const allUsers = Array.from(usersMap.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

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

  // 确保初始 5 组预置卡密不丢失并同步至多端
  const defaultCodes = [
    { code: 'SHINIAN-8888-A3F1-9C2D', createdAt: 1711900000000, note: '系统预置买断卡密' },
    { code: 'SHINIAN-9999-E5B7-1A4C', createdAt: 1711900000000, note: '系统预置买断卡密' },
    { code: 'SHINIAN-YEAR-2026-ZEN1', createdAt: 1711900000000, note: '系统预置买断卡密' },
    { code: 'SHINIAN-VIP-2026-FREE', createdAt: 1711900000000, note: '官方体验卡密' },
    { code: 'SHINIAN-BUYOUT-VIP-888', createdAt: 1711900000000, note: '官方永久买断卡密' }
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
