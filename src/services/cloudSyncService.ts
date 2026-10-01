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

export interface DomesticUser {
  uid: string;
  account: string;
  displayName: string;
  userNumber: string; // e.g. "00018"
  photoURL?: string;
  passwordHash?: string;
  createdAt: string;
  updatedAt?: string;
  lastSyncAt?: string;
  role?: 'user' | 'admin';
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

// Preview next user number (e.g. 00018)
export async function getNextUserNumberPreview(): Promise<string> {
  try {
    const counterRef = doc(db, 'system_counters', 'user_registration');
    const snap = await getDoc(counterRef);
    let nextCount = 1;
    if (snap.exists()) {
      nextCount = (snap.data().currentCount || 0) + 1;
    }
    return String(nextCount).padStart(5, '0');
  } catch (err) {
    // Local fallback counter
    const localCount = parseInt(localStorage.getItem('shinian_fallback_user_counter') || '1', 10);
    return String(localCount).padStart(5, '0');
  }
}

// Domestic Register
export async function registerDomesticUser(params: {
  account: string;
  displayName: string;
  passwordPlain: string;
  photoURL?: string;
}): Promise<DomesticUser> {
  const cleanAccount = params.account.trim().toLowerCase();
  const cleanName = params.displayName.trim() || '拾年墨客';
  const hashedPassword = await hashPassword(params.passwordPlain);
  const now = new Date().toISOString();

  // Check if account already exists
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('account', '==', cleanAccount), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error(`账号「${cleanAccount}」已被注册，请尝试直接登录或更换账号`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('已被注册')) {
      throw err;
    }
  }

  // Get and increment sequential user number atomically
  let assignedNumberStr = '00001';
  const counterRef = doc(db, 'system_counters', 'user_registration');

  try {
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentCount = 0;
      if (counterDoc.exists()) {
        currentCount = counterDoc.data().currentCount || 0;
      }
      const nextCount = currentCount + 1;
      assignedNumberStr = String(nextCount).padStart(5, '0');
      transaction.set(counterRef, {
        counterId: 'user_registration',
        currentCount: nextCount,
        updatedAt: now
      });
    });
  } catch (err) {
    // Fallback if counter update fails
    const localCount = parseInt(localStorage.getItem('shinian_fallback_user_counter') || '1', 10);
    assignedNumberStr = String(localCount).padStart(5, '0');
    localStorage.setItem('shinian_fallback_user_counter', String(localCount + 1));
  }

  const uid = `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newUser: DomesticUser = {
    uid,
    account: cleanAccount,
    displayName: cleanName,
    userNumber: assignedNumberStr,
    photoURL: params.photoURL || '',
    passwordHash: hashedPassword,
    createdAt: now,
    updatedAt: now,
    lastSyncAt: now,
    role: cleanAccount === 'admin' || cleanAccount === 'sjx20091118' ? 'admin' : 'user'
  };

  // Write to Firestore
  try {
    await setDoc(doc(db, 'users', uid), newUser);
  } catch (err) {
    console.warn('Firestore user write error, saved locally:', err);
  }

  setLocalDomesticUser(newUser);
  return newUser;
}

// Domestic Login
export async function loginDomesticUser(account: string, passwordPlain: string): Promise<DomesticUser> {
  const cleanAccount = account.trim().toLowerCase();
  const hashedPassword = await hashPassword(passwordPlain);

  // First check local user
  const local = getLocalDomesticUser();
  if (local && local.account.toLowerCase() === cleanAccount && local.passwordHash === hashedPassword) {
    return local;
  }

  // Query Firestore
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('account', '==', cleanAccount), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error('未找到该账号，请检查输入或先进行注册');
    }

    const userData = snap.docs[0].data() as DomesticUser;
    if (userData.passwordHash && userData.passwordHash !== hashedPassword) {
      throw new Error('密码不正确，请重新输入');
    }

    setLocalDomesticUser(userData);
    return userData;
  } catch (err: any) {
    if (err.message && (err.message.includes('未找到') || err.message.includes('密码不正确'))) {
      throw err;
    }
    // If network fails and credentials match local
    if (local && local.account.toLowerCase() === cleanAccount) {
      if (local.passwordHash === hashedPassword) {
        return local;
      }
      throw new Error('密码不正确');
    }
    throw new Error(err.message || '登录失败，请检查网络');
  }
}

// Update User Profile
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
    await updateDoc(doc(db, 'users', current.uid), {
      ...updatedFields,
      updatedAt: now
    });
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

// App Version Management
export async function getLatestAppVersion(): Promise<CloudAppVersion | null> {
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
  const versionsRef = collection(db, 'app_versions');
  try {
    const q = query(versionsRef, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CloudAppVersion);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'app_versions');
  }
}

export async function publishAppVersion(version: CloudAppVersion): Promise<void> {
  const versionRef = doc(db, 'app_versions', version.versionId);
  try {
    await setDoc(versionRef, version);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `app_versions/${version.versionId}`);
  }
}

export async function deleteAppVersion(versionId: string): Promise<void> {
  const versionRef = doc(db, 'app_versions', versionId);
  try {
    await deleteDoc(versionRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `app_versions/${versionId}`);
  }
}

// System Notices Management
export async function getPublishedNotices(): Promise<CloudSystemNotice[]> {
  const noticesRef = collection(db, 'system_notices');
  try {
    const q = query(noticesRef, orderBy('createdAt', 'desc'), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CloudSystemNotice).filter(n => n.isPublished !== false);
  } catch (error) {
    console.warn('Could not fetch system notices:', error);
    return [];
  }
}

export async function listAllSystemNotices(): Promise<CloudSystemNotice[]> {
  const noticesRef = collection(db, 'system_notices');
  try {
    const q = query(noticesRef, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CloudSystemNotice);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'system_notices');
  }
}

export async function publishSystemNotice(notice: CloudSystemNotice): Promise<void> {
  const noticeRef = doc(db, 'system_notices', notice.noticeId);
  try {
    await setDoc(noticeRef, notice);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `system_notices/${notice.noticeId}`);
  }
}

export async function deleteSystemNotice(noticeId: string): Promise<void> {
  const noticeRef = doc(db, 'system_notices', noticeId);
  try {
    await deleteDoc(noticeRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `system_notices/${noticeId}`);
  }
}

// Admin: List all registered users
export async function listAllUsers(): Promise<DomesticUser[]> {
  const usersRef = collection(db, 'users');
  try {
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DomesticUser);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}
