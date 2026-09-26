import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  LockOpen,
  Wand2,
  Cpu,
  Download,
  Upload,
  Volume2,
  VolumeX,
  X,
  MapPin,
  Clock,
  Users,
  BookOpen,
  Package,
  Mail,
  MailOpen,
  Image as ImageIcon,
  Film,
  Plus,
  Calendar,
  CalendarRange,
  Compass,
  ChevronDown,
  ChevronLeft,
  Trash2,
  Share2,
  Edit3,
  Bot,
  Send,
  Landmark,
  ChevronRight,
  KeyRound,
  ShieldCheck,
  Filter,
  RotateCcw,
  Shuffle,
  Palette,
  Check,
  Play,
  Layers,
  Search,
  FileJson,
  Database,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Settings,
  UserPlus,
  Folder,
  FolderPlus,
  FolderOpen,
  Copy,
  MessageCircle,
  Phone,
  Feather,
  Flame,
  Hourglass,
  Camera,
  SlidersHorizontal,
  Sun,
  Moon
} from 'lucide-react';
import { AppData, Person, Story, Artifact, Letter, ChatMessage, TimelineItem } from './types';
import { INITIAL_SEED } from './data/initialData';
import { LocalImageUploader, PRESET_AVATARS, compressImageFile } from './components/LocalImageUploader';
import { LocalMediaUploader } from './components/LocalMediaUploader';
import { VintageVideoPlayer } from './components/VintageVideoPlayer';
import { TimelineVideoCard } from './components/TimelineVideoCard';
import { ChronoGalleryTimeline } from './components/ChronoGalleryTimeline';
import { VinylMusicPlayer } from './components/VinylMusicPlayer';
import { MemoirCardStudioModal, UniversalShareSource } from './components/MemoirCardStudioModal';
import { FullscreenZenClock } from './components/FullscreenZenClock';
import { isVideoMedia } from './utils/mediaStorage';
import { ThemedDatePickerModal } from './components/ThemedDatePickerModal';
import { PersonAlbum } from './components/PersonAlbum';
import { PersonArtifactsShelf } from './components/PersonArtifactsShelf';
import { PersonStoriesShelf } from './components/PersonStoriesShelf';
import { SealingWaxRitual } from './components/SealingWaxRitual';
import { sound } from './utils/soundEngine';
import { TimeAiCompanion } from './components/TimeAiCompanion';
import { SlideToUnlock } from './components/SlideToUnlock';
import { ThemedToast } from './components/ThemedToast';
import { ArtifactMediaUploader } from './components/ArtifactMediaUploader';
import { ArtifactGalleryViewer } from './components/ArtifactGalleryViewer';
import { useAndroidBackHandler } from './hooks/useAndroidBackHandler';
import { useKeyboardStatus } from './hooks/useKeyboardStatus';
import TTSAudioEngine from './utils/audioUnlocker';
import { exportZipArchive, parseBackupArchive } from './utils/zipBackup';
import { buildApiUrl, callClientGeminiDirect, callClientDeepSeekDirect } from './services/apiConfig';

export interface TtsVoiceOption {
  id: string;
  name: string;
  gender: '女声' | '男声';
  character: string;
  desc: string;
  tags: string[];
  previewQuote: string;
}

export const TTS_VOICES: TtsVoiceOption[] = [
  {
    id: 'zh-CN-XiaoxiaoNeural',
    name: '素问',
    gender: '女声',
    character: '清雅书卷 · 岁华温婉',
    desc: '微软神经语音。温婉知性、咬字清亮细腻，如在暖阳下翻阅泛黄书信般娓娓道来',
    tags: ['知性温婉', '书卷气', '深情叙事'],
    previewQuote: '岁华清照，拾年归处。我是素问，愿用温婉的书卷之声，陪你静静回味泛黄岁月里的温柔。'
  },
  {
    id: 'zh-CN-XiaoyiNeural',
    name: '微澜',
    gender: '女声',
    character: '空灵澄澈 · 治愈微光',
    desc: '微软神经语音。轻柔空灵、明澈纯净，带有抚慰人心的温暖微光与治愈共情力',
    tags: ['治愈微光', '空灵轻柔', '抚慰心灵'],
    previewQuote: '风过林梢，时光微澜。我是微澜，愿如同一缕清风，为你轻声抚慰记忆里的点滴微光。'
  },
  {
    id: 'zh-CN-XiaoyouNeural',
    name: '拾光小语',
    gender: '女声',
    character: '灵动甜润 · 亲和陪伴',
    desc: '微软神经语音。活泼明亮、甜润亲和，如邻家小妹伴你在午后闲话家常与童年回忆',
    tags: ['灵动甜美', '亲和陪伴', '生动自然'],
    previewQuote: '记忆的小匣子打开啦！我是拾光小语，陪你一起发现那些藏在日常角落里的美好与欢笑。'
  },
  {
    id: 'zh-CN-YunxiNeural',
    name: '初阳',
    gender: '男声',
    character: '温润明朗 · 少年朝气',
    desc: '微软神经语音。温润明朗、朝气蓬勃，如林间晨曦般唤起青春校园与明媚回忆',
    tags: ['少年感', '温润明朗', '真挚阳光'],
    previewQuote: '阳光正好，青春未央！我是初阳，愿用明朗温润的少年朝气，带你重温那些热烈璀璨的时光。'
  },
  {
    id: 'zh-CN-YunjianNeural',
    name: '松风',
    gender: '男声',
    character: '沉稳醇厚 · 岁月磁性',
    desc: '微软神经语音。沉稳低回、岁月厚重，如老友围炉夜话般富有深沉的故事感',
    tags: ['磁性沉稳', '岁月厚重', '围炉夜话'],
    previewQuote: '岁月如酒，沉静从容。我是松风，愿以沉稳磁性的声音，如老友围炉夜话般为你讲述旧日光阴。'
  },
  {
    id: 'zh-CN-YunyangNeural',
    name: '朗川',
    gender: '男声',
    character: '专业开阔 · 纪实叙事',
    desc: '微软神经语音。富有新闻质感、大气开阔，适宜记录人生大事件与时代印记',
    tags: ['大气开阔', '纪实播音', '厚重力量'],
    previewQuote: '记录时代洪流与个体记忆的交汇。我是朗川，愿以铿锵有力的叙事之声，为你的十年历程留存最真实的见证。'
  }
];

async function fetchGeminiWithBackoff(url: string, payload: any, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}

function fileToBase64(file: File): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      const mimeType = file.type || 'image/jpeg';
      resolve({ base64Data, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function pcmToWav(pcmInt16Array: Int16Array, sampleRate = 24000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmInt16Array.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < pcmInt16Array.length; i++) {
    view.setInt16(44 + i * 2, pcmInt16Array[i], true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// 自动根据生日计算星座
export function getZodiacFromBirthday(birthdayStr: string): string {
  if (!birthdayStr || !birthdayStr.trim()) return '未知';
  const str = birthdayStr.trim();

  let month = 0;
  let day = 0;

  // 尝试匹配 "X月X日"、"X.X"、"X-X"、"X/X" 或 "XXXX-XX-XX"
  const match1 = str.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/);
  const match2 = str.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  const match3 = str.match(/(\d{1,2})[-/.](\d{1,2})/);

  if (match1) {
    month = parseInt(match1[1], 10);
    day = parseInt(match1[2], 10);
  } else if (match2) {
    month = parseInt(match2[2], 10);
    day = parseInt(match2[3], 10);
  } else if (match3) {
    month = parseInt(match3[1], 10);
    day = parseInt(match3[2], 10);
  }

  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return '未知';
  }

  const days = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22];
  const signs = [
    '摩羯座', '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座',
    '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座'
  ];

  return day < days[month - 1] ? signs[month - 1] : signs[month];
}

// 格式化时光记忆切片日期 (如: 2026.8.6)
export function formatImpressionDate(val?: string): string {
  if (!val || !val.trim()) return '时光印记';
  const clean = val.replace(/年|月/g, '.').replace(/日|切片/g, '').trim();
  const parts = clean.split(/[-./]/).filter(Boolean);
  if (parts.length === 3) {
    return `${parts[0]}.${parseInt(parts[1], 10)}.${parseInt(parts[2], 10)}`;
  } else if (parts.length === 2) {
    return `${parts[0]}.${parseInt(parts[1], 10)}`;
  } else if (parts.length === 1 && parts[0].length === 4) {
    return `${parts[0]}`;
  }
  return clean;
}

// 自动根据相识起始日期计算相识天数
export function calculateDaysKnown(knownDate?: string): number | null {
  if (!knownDate || !knownDate.trim()) return null;
  const str = knownDate.trim();
  const start = new Date(str).getTime();
  if (isNaN(start)) return null;
  const now = Date.now();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
}

export interface HealingTheme {
  id: string;
  name: string;
  enName: string;
  quote: string;
  primary: string;       // Primary brand color
  primaryDark: string;   // Hover or deep state
  accent: string;        // Accent / highlight color
  accentLight: string;   // Soft badge background
  paper: string;         // Light container background
  canvas: string;        // Body & Card canvas
  primaryRgb: string;    // R, G, B for opacity
  primaryDarkRgb: string;
  accentRgb: string;
  dark?: {
    primary: string;
    primaryDark: string;
    accent: string;
    accentLight: string;
    paper: string;
    canvas: string;
    primaryRgb: string;
    primaryDarkRgb: string;
    accentRgb: string;
  };
}

export const HEALING_THEMES: HealingTheme[] = [
  {
    id: 'breeze-sage',
    name: '松烟青瓷',
    enName: 'Pine & Celadon',
    quote: '如雨过天青，沉静温润',
    primary: '#5B7B6D',
    primaryDark: '#3E564B',
    accent: '#4EBA86',
    accentLight: '#EDF7F2',
    paper: '#F2EFE9',
    canvas: '#FAF8F5',
    primaryRgb: '91, 123, 109',
    primaryDarkRgb: '62, 86, 75',
    accentRgb: '78, 186, 134',
    dark: {
      primary: '#4EBA86',
      primaryDark: '#2D7250',
      accent: '#6EE7B7',
      accentLight: 'rgba(78, 186, 134, 0.16)',
      paper: '#14201B',
      canvas: '#0D1411',
      primaryRgb: '78, 186, 134',
      primaryDarkRgb: '45, 114, 80',
      accentRgb: '110, 231, 183'
    }
  },
  {
    id: 'azure-meadow',
    name: '晴空碧草',
    enName: 'Azure & Meadow',
    quote: '天青湛蓝，初晴碧草，静谧治愈',
    primary: '#2D7FA8',
    primaryDark: '#1C5572',
    accent: '#38C172',
    accentLight: '#F0FDF4',
    paper: '#EEF5F9',
    canvas: '#F7FAFC',
    primaryRgb: '45, 127, 168',
    primaryDarkRgb: '28, 85, 114',
    accentRgb: '56, 193, 114',
    dark: {
      primary: '#38BDF8',
      primaryDark: '#0284C7',
      accent: '#4ADE80',
      accentLight: 'rgba(56, 189, 248, 0.14)',
      paper: '#101B24',
      canvas: '#0A1218',
      primaryRgb: '56, 189, 248',
      primaryDarkRgb: '2, 132, 199',
      accentRgb: '74, 222, 128'
    }
  },
  {
    id: 'ocean-glaze',
    name: '海盐雾蓝',
    enName: 'Nordic Mist',
    quote: '晨雾初散，海盐与远方清风',
    primary: '#3E6F8E',
    primaryDark: '#294F66',
    accent: '#38BDF8',
    accentLight: '#EBF5FB',
    paper: '#EBF1F6',
    canvas: '#F7FAFD',
    primaryRgb: '62, 111, 142',
    primaryDarkRgb: '41, 79, 102',
    accentRgb: '56, 189, 248',
    dark: {
      primary: '#38BDF8',
      primaryDark: '#0284C7',
      accent: '#7DD3FC',
      accentLight: 'rgba(56, 189, 248, 0.16)',
      paper: '#101E2B',
      canvas: '#09121A',
      primaryRgb: '56, 189, 248',
      primaryDarkRgb: '2, 132, 199',
      accentRgb: '125, 211, 252'
    }
  },
  {
    id: 'mist-lavender',
    name: '暮山晚紫',
    enName: 'Twilight Iris',
    quote: '山黛晚照，温柔如初',
    primary: '#5D5580',
    primaryDark: '#443D61',
    accent: '#A78BFA',
    accentLight: '#F3F0FA',
    paper: '#EEEBF5',
    canvas: '#FAF8FC',
    primaryRgb: '93, 85, 128',
    primaryDarkRgb: '68, 61, 97',
    accentRgb: '167, 139, 250',
    dark: {
      primary: '#A78BFA',
      primaryDark: '#7C3AED',
      accent: '#C4B5FD',
      accentLight: 'rgba(167, 139, 250, 0.16)',
      paper: '#1B152C',
      canvas: '#110D1C',
      primaryRgb: '167, 139, 250',
      primaryDarkRgb: '124, 58, 237',
      accentRgb: '196, 181, 253'
    }
  },
  {
    id: 'cherry-sakura',
    name: '山樱初雪',
    enName: 'Sakura & Frost',
    quote: '落樱如雪，春光细语温柔',
    primary: '#9C5874',
    primaryDark: '#753C54',
    accent: '#5EEAD4',
    accentLight: '#EBF4F2',
    paper: '#F7EDF1',
    canvas: '#FCF7F9',
    primaryRgb: '156, 88, 116',
    primaryDarkRgb: '117, 60, 84',
    accentRgb: '94, 234, 212',
    dark: {
      primary: '#E879A8',
      primaryDark: '#BE185D',
      accent: '#5EEAD4',
      accentLight: 'rgba(232, 121, 168, 0.16)',
      paper: '#231522',
      canvas: '#160E16',
      primaryRgb: '232, 121, 168',
      primaryDarkRgb: '190, 24, 93',
      accentRgb: '94, 234, 212'
    }
  }
];

type TabType = 'home' | 'timeline' | 'people' | 'stories' | 'artifacts' | 'letters';

// In-memory TTS audio cache map to prevent redundant API calls and save quota
const ttsAudioCache = new Map<string, string>();

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const local = localStorage.getItem('shinian_app_data_v6');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.people && parsed.people.length > 0) {
          if (parsed.artifacts) {
            parsed.artifacts = parsed.artifacts.filter((a: any) => a.id !== 'a-103' && a.name !== '装满用尽笔芯的透明笔袋');
          }
          const authorPerson = parsed.people.find((p: any) => p.id === 'p-author' || p.name === '作者');
          if (authorPerson && authorPerson.birthday === '2009.11.20') {
            authorPerson.birthday = '2009.11.18';
            authorPerson.knownDate = '2009-11-18';
          }
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse local storage', e);
      }
    }
    // Clean up old cached versions
    try {
      localStorage.removeItem('shinian_app_data_v5');
      localStorage.removeItem('shinian_app_data_v4');
      localStorage.removeItem('shinian_app_data_v3');
      localStorage.removeItem('shinian_app_data_v2');
      localStorage.removeItem('shinian_app_data');
    } catch (e) {}
    return INITIAL_SEED;
  });

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [isYearPickerOpen, setIsYearPickerOpen] = useState<boolean>(false);
  const [isTopNavMenuOpen, setIsTopNavMenuOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('shinian_dark_mode') === 'true');
  const [isFullscreenClockOpen, setIsFullscreenClockOpen] = useState<boolean>(false);
  const [topNavSubView, setTopNavSubView] = useState<'main' | 'theme' | 'settings' | 'backup' | 'voice' | 'security' | 'ai' | 'panoramicTime' | 'friendGroups'>('main');
  const [topNavNewGroupInput, setTopNavNewGroupInput] = useState<string>('');
  const [themeId, setThemeId] = useState<string>(() => {
    const saved = localStorage.getItem('shinian_theme_id');
    if (saved === 'grass-cream' || saved === 'autumn-amber' || saved === 'sunlit-apricot') return 'breeze-sage';
    return saved || 'breeze-sage';
  });
  const [isThemePickerOpen, setIsThemePickerOpen] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => localStorage.getItem('shinian_is_locked') === 'true');
  const [lockPin, setLockPin] = useState<string>(() => localStorage.getItem('shinian_lock_pin') || '1234');
  const [pinInput, setPinInput] = useState<string>('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [readerStory, setReaderStory] = useState<Story | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [selectedArtifactImagePreview, setSelectedArtifactImagePreview] = useState<string>('');
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [shareMemoirItem, setShareMemoirItem] = useState<UniversalShareSource | TimelineItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Century-wide panoramic years list (2000 to 2035)
  const centuryYears = useMemo(() => {
    const list = ['all'];
    for (let y = 2035; y >= 2000; y--) {
      list.push(String(y));
    }
    return list;
  }, []);

  // Auto-dismiss splash screen after 1.8 seconds
  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, [showSplash]);

  // Sync dark class on documentElement for Tailwind dark: variants and global styling
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Custom UI Notifications & Dialogs
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, duration = 1500) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  const currentTheme = useMemo(() => {
    const base = HEALING_THEMES.find(t => t.id === themeId) || HEALING_THEMES[0];
    if (!isDarkMode) return base;
    if (base.dark) {
      return {
        ...base,
        ...base.dark
      };
    }
    return base;
  }, [themeId, isDarkMode]);

  const contextualAction = useMemo(() => {
    if (activeTab === 'home') {
      return {
        isDayNight: true,
        label: isDarkMode ? '暗夜' : '明亮',
        onClick: () => {
          const next = !isDarkMode;
          setIsDarkMode(next);
          localStorage.setItem('shinian_dark_mode', String(next));
          sound.playWaterDrop(next ? 640 : 880);
          showToast(next ? '已开启暗夜冥想模式 🌙' : '已开启晨曦明亮模式 ☀️');
        }
      };
    }
    if (activeTab === 'timeline') {
      return { label: '定格瞬间', onClick: () => setActiveModal('addTimeline') };
    }
    if (activeTab === 'people') {
      if (!selectedPerson) {
        return { label: '添加人物', onClick: () => setActiveModal('addPerson') };
      }
      return null;
    }
    if (activeTab === 'stories') {
      if (!readerStory) {
        return { label: '新增章节', onClick: () => setActiveModal('addStory') };
      }
      return null;
    }
    if (activeTab === 'artifacts') {
      if (!selectedArtifact) {
        return { label: '收藏旧物', onClick: () => setActiveModal('addArtifact') };
      }
      return null;
    }
    if (activeTab === 'letters') {
      if (!selectedLetter) {
        return { label: '封存信件', onClick: () => setActiveModal('addLetter') };
      }
      return null;
    }
    return null;
  }, [activeTab, selectedPerson, readerStory, selectedArtifact, selectedLetter, isDarkMode, showToast]);

  // Sync current theme CSS variables globally across the document and all UI
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', currentTheme.primary);
    root.style.setProperty('--theme-primary-dark', currentTheme.primaryDark);
    root.style.setProperty('--theme-accent', currentTheme.accent);
    root.style.setProperty('--theme-accent-light', currentTheme.accentLight);
    root.style.setProperty('--theme-paper', currentTheme.paper);
    root.style.setProperty('--theme-canvas', currentTheme.canvas);
    root.style.setProperty('--primary-rgb', currentTheme.primaryRgb);
    root.style.setProperty('--primary-dark-rgb', currentTheme.primaryDarkRgb);
    root.style.setProperty('--accent-rgb', currentTheme.accentRgb);

    // Sync Android Status Bar Theme Color & Edge-to-Edge System Bar Overlays
    const metaTheme = document.getElementById('meta-theme-color') || document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', currentTheme.canvas);
    }
    try {
      const capacitorPlugins = (window as any).Capacitor?.Plugins;
      if (capacitorPlugins?.StatusBar) {
        // Overlay webview so background colors seamlessly extend through status bar
        capacitorPlugins.StatusBar.setOverlaysWebView?.({ overlay: true });
        // Set transparent background to let the web canvas bleed through
        capacitorPlugins.StatusBar.setBackgroundColor?.({ color: '#00000000' });
        // Light system bar style means dark text/icons (for light theme background)
        capacitorPlugins.StatusBar.setStyle?.({ style: 'LIGHT' });
      }
      if (capacitorPlugins?.NavigationBar) {
        capacitorPlugins.NavigationBar.setColor?.({ color: '#00000000', darkButtons: true });
        capacitorPlugins.NavigationBar.setTransparency?.({ isTransparent: true });
      }
    } catch (e) {}

    // Auto-detect and ensure fallback safe area variables if not injected by native shell
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      const topInset = computedStyle.getPropertyValue('--safe-area-top').trim();
      const bottomInset = computedStyle.getPropertyValue('--safe-area-bottom').trim();
      if (!topInset) {
        document.documentElement.style.setProperty('--safe-area-top', '28px');
      }
      if (!bottomInset) {
        document.documentElement.style.setProperty('--safe-area-bottom', '16px');
      }
    };
    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    return () => window.removeEventListener('resize', updateSafeArea);
  }, [currentTheme]);

  const handleCopyText = (text: string, label = '内容') => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`已复制${label}：${text}`);
    }).catch(() => {
      showToast(`已选定：${text}`);
    });
  };

  const handleSelectTheme = (id: string) => {
    setThemeId(id);
    localStorage.setItem('shinian_theme_id', id);
    setIsThemePickerOpen(false);
    const themeObj = HEALING_THEMES.find(t => t.id === id);
    showToast(`已换上治愈色调 · ${themeObj?.name || ''}`, 1500);
  };

  // Password Modification State
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);
  const [oldPinInput, setOldPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');

  // Person sub-modals / actions
  const [isEditingPerson, setIsEditingPerson] = useState<boolean>(false);
  const [newImpressionYear, setNewImpressionYear] = useState<string>('');
  const [newImpressionText, setNewImpressionText] = useState<string>('');
  const [editingImpression, setEditingImpression] = useState<{ id: string; year: string; text: string } | null>(null);
  const [editImpressionYear, setEditImpressionYear] = useState<string>('');
  const [editImpressionText, setEditImpressionText] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{ type?: keyof AppData; id?: string; name: string; onConfirm?: () => void } | null>(null);

  // Global Themed Date Picker Modal State
  const [datePickerConfig, setDatePickerConfig] = useState<{
    isOpen: boolean;
    value: string;
    title: string;
    mode: 'full' | 'month-day';
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    value: '',
    title: '选择日期',
    mode: 'full',
    onConfirm: () => {}
  });

  // Controlled date states for visual pickers
  const [formTimelineDate, setFormTimelineDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [formArtifactDate, setFormArtifactDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [formArtifactImages, setFormArtifactImages] = useState<string[]>([]);
  const [formArtifactVideo, setFormArtifactVideo] = useState<string | undefined>(undefined);
  const [formArtifactVideoPoster, setFormArtifactVideoPoster] = useState<string | undefined>(undefined);
  const [formArtifactMediaType, setFormArtifactMediaType] = useState<'image' | 'video'>('image');
  const [formStoryDate, setFormStoryDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [formLetterUnlockDate, setFormLetterUnlockDate] = useState<string>('2030-01-01');
  const [editStoryDate, setEditStoryDate] = useState<string>('');

  // Artifact Edit State
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [editArtifactDate, setEditArtifactDate] = useState<string>('');
  const [editArtifactImage, setEditArtifactImage] = useState<string>('');
  const [editArtifactImages, setEditArtifactImages] = useState<string[]>([]);
  const [editArtifactVideo, setEditArtifactVideo] = useState<string | undefined>(undefined);
  const [editArtifactVideoPoster, setEditArtifactVideoPoster] = useState<string | undefined>(undefined);
  const [editArtifactMediaType, setEditArtifactMediaType] = useState<'image' | 'video'>('image');

  // Edit Person / Add Person controlled date states for visual pickers
  const [editPersonBirthday, setEditPersonBirthday] = useState<string>('');
  const [editPersonKnownDate, setEditPersonKnownDate] = useState<string>('');
  const [addPersonBirthday, setAddPersonBirthday] = useState<string>('');
  const [addPersonKnownDate, setAddPersonKnownDate] = useState<string>('2021-09-01');

  // AI States & Dual Engine Support
  const [aiEngine, setAiEngine] = useState<'gemini' | 'deepseek'>(() => {
    return (localStorage.getItem('shinian_ai_engine') as 'gemini' | 'deepseek') || 'gemini';
  });
  const [deepSeekKey, setDeepSeekKey] = useState<string>(() => {
    return localStorage.getItem('shinian_deepseek_key') || '';
  });
  const [aiApiKey, setAiApiKey] = useState<string>(() => localStorage.getItem('shinian_gemini_key') || '');
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: '你好！我是《拾年》时光 AI 对话助手。我已经阅读了你保存的所有时光记忆，想聊聊过去的哪段时光或哪位老朋友？' }
  ]);
  const [aiChatInput, setAiChatInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [audioPlayingUrl, setAudioPlayingUrl] = useState<string | null>(null);
  const [audioPlayingVoiceName, setAudioPlayingVoiceName] = useState<string>('');
  const [isTtsGenerating, setIsTtsGenerating] = useState<boolean>(false);
  const [ttsSelectedVoice, setTtsSelectedVoice] = useState<string>(() => {
    const saved = localStorage.getItem('shinian_tts_voice');
    if (saved) {
      if (saved === 'Kore') return 'zh-CN-XiaoxiaoNeural';
      if (saved === 'Zephyr') return 'zh-CN-XiaoyiNeural';
      if (saved === 'Puck') return 'zh-CN-YunxiNeural';
      if (saved === 'Fenrir') return 'zh-CN-YunjianNeural';
      if (TTS_VOICES.some(v => v.id === saved)) return saved;
    }
    return 'zh-CN-XiaoxiaoNeural';
  });
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isVoicePickerModalOpen, setIsVoicePickerModalOpen] = useState<boolean>(false);
  const [voiceFilterGender, setVoiceFilterGender] = useState<'all' | '女声' | '男声'>('all');

  // Backup Import States
  const [importPreview, setImportPreview] = useState<{
    data: AppData;
    filename: string;
    timelineCount: number;
    peopleCount: number;
    storiesCount: number;
    artifactsCount: number;
    lettersCount: number;
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Form AI assistance state
  const [isAiGenImageLoading, setIsAiGenImageLoading] = useState<boolean>(false);
  const [isAiVisionLoading, setIsAiVisionLoading] = useState<boolean>(false);
  const [isAiPolishLoading, setIsAiPolishLoading] = useState<boolean>(false);

  // Modal Local Image & Video Upload States
  const [formTimelineImage, setFormTimelineImage] = useState<string>('');
  const [formTimelineVideo, setFormTimelineVideo] = useState<string>('');
  const [formTimelineVideoPoster, setFormTimelineVideoPoster] = useState<string>('');
  const [formTimelineMediaType, setFormTimelineMediaType] = useState<'image' | 'video'>('image');
  const [formPersonAvatar, setFormPersonAvatar] = useState<string>('');
  const [formPersonRel, setFormPersonRel] = useState<string>('');
  const [formPersonGroup, setFormPersonGroup] = useState<string>('未分组');
  const [formArtifactImage, setFormArtifactImage] = useState<string>('');
  const [editPersonAvatar, setEditPersonAvatar] = useState<string>('');
  const [editPersonRel, setEditPersonRel] = useState<string>('');
  const [editPersonGroup, setEditPersonGroup] = useState<string>('未分组');

  // People grouping & top status bar state
  const [selectedPersonGroup, setSelectedPersonGroup] = useState<string>('all');
  const [formGroupPickerTarget, setFormGroupPickerTarget] = useState<'add' | 'edit' | null>(null);
  const [isGroupPickerOpen, setIsGroupPickerOpen] = useState<boolean>(false);
  const [customGroups, setCustomGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shinian_custom_groups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return ['大学同窗', '师长前辈', '青春同窗', '挚友亲朋', '未分组'];
  });

  const allGroupsList = useMemo(() => {
    const set = new Set<string>([...customGroups, ...data.people.map(p => p.group || '未分组')]);
    const list = Array.from(set).filter(Boolean);
    return [
      ...list.filter(g => g !== '未分组'),
      ...(list.includes('未分组') ? ['未分组'] : [])
    ];
  }, [customGroups, data.people]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isAddingGroup, setIsAddingGroup] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [movingPerson, setMovingPerson] = useState<Person | null>(null);

  // Story Edit State
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  // Letter Unsealing Animation State
  const [isUnsealingLetter, setIsUnsealingLetter] = useState<boolean>(false);
  const [sealingRitualData, setSealingRitualData] = useState<{ title: string; unlockDate: string } | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => sound.getIsMuted());

  const filteredPeople = useMemo(() => {
    return data.people.filter(p => {
      if (selectedPersonGroup === 'all') return true;
      return (p.group || '未分组') === selectedPersonGroup;
    });
  }, [data.people, selectedPersonGroup]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('shinian_app_data_v6', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('shinian_custom_groups', JSON.stringify(customGroups));
  }, [customGroups]);

  // Mobile Hardware & Gesture Back Button Interception (Centralized 17-Level Back Stack)
  useAndroidBackHandler({
    selectedArtifactImagePreview,
    closeArtifactImagePreview: () => setSelectedArtifactImagePreview(''),

    isShareModalOpen,
    closeShareModal: () => setIsShareModalOpen(false),

    datePickerOpen: datePickerConfig.isOpen,
    closeDatePicker: () => setDatePickerConfig(prev => ({ ...prev, isOpen: false })),

    confirmDialog,
    closeConfirmDialog: () => setConfirmDialog(null),

    sealingRitualData,
    closeSealingRitual: () => setSealingRitualData(null),

    editingImpression,
    closeEditingImpression: () => setEditingImpression(null),

    movingPerson,
    closeMovingPerson: () => setMovingPerson(null),

    isAddingGroup,
    closeAddingGroup: () => setIsAddingGroup(false),

    isChangingPin,
    closeChangingPin: () => setIsChangingPin(false),

    importPreview,
    closeImportPreview: () => setImportPreview(null),

    isEditingPerson,
    closeEditingPerson: () => setIsEditingPerson(false),

    editingStory,
    closeEditingStory: () => setEditingStory(null),

    editingArtifact,
    closeEditingArtifact: () => setEditingArtifact(null),

    activeModal,
    closeActiveModal: () => setActiveModal(null),

    readerStory,
    closeReaderStory: () => setReaderStory(null),

    selectedPerson,
    closeSelectedPerson: () => {
      setIsEditingPerson(false);
      setSelectedPerson(null);
    },

    selectedArtifact,
    closeSelectedArtifact: () => setSelectedArtifact(null),

    selectedLetter,
    closeSelectedLetter: () => setSelectedLetter(null),

    isVoicePickerModalOpen,
    closeVoicePickerModal: () => setIsVoicePickerModalOpen(false),

    isGroupPickerOpen,
    closeGroupPicker: () => setIsGroupPickerOpen(false),

    isTopNavMenuOpen,
    closeTopNavMenu: () => setIsTopNavMenuOpen(false),
    topNavSubView,
    setTopNavSubView,

    isFullscreenClockOpen,
    closeFullscreenClock: () => setIsFullscreenClockOpen(false),

    isThemePickerOpen,
    closeThemePicker: () => setIsThemePickerOpen(false),

    isYearPickerOpen,
    closeYearPicker: () => setIsYearPickerOpen(false),

    activeTab,
    setActiveTab,

    showToast,
  });

  const { isKeyboardVisible } = useKeyboardStatus();
  const mainContentRef = useRef<HTMLElement | null>(null);

  // Reset scroll position to top on navigation/modal transitions
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activeTab, readerStory, selectedPerson, selectedArtifact, selectedLetter]);

  useEffect(() => {
    if (chatEndRef.current && activeTab === 'ai') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatMessages, activeTab]);

  useEffect(() => {
    if (selectedPerson) {
      const updated = data.people.find(p => p.id === selectedPerson.id);
      if (updated) setSelectedPerson(updated);
    }
  }, [data, selectedPerson]);

  const getYearFromDate = useCallback((dateStr?: string): string | null => {
    if (!dateStr) return null;
    const match = dateStr.match(/\b(19\d\d|20\d\d)\b/);
    if (match) return match[1];
    const trimmed = dateStr.trim();
    if (trimmed.length >= 4 && /^\d{4}$/.test(trimmed.slice(0, 4))) {
      return trimmed.slice(0, 4);
    }
    return null;
  }, []);

  // Dynamically extract only years with actual memory records across all categories
  const years = useMemo(() => {
    const ySet = new Set<string>();
    data.timeline.forEach(item => {
      const yr = getYearFromDate(item.date);
      if (yr) ySet.add(yr);
    });
    data.artifacts.forEach(item => {
      const yr = getYearFromDate(item.date);
      if (yr) ySet.add(yr);
    });
    data.stories.forEach(item => {
      const yr = getYearFromDate(item.date);
      if (yr) ySet.add(yr);
    });
    data.people.forEach(p => {
      const yr = getYearFromDate(p.knownDate);
      if (yr) ySet.add(yr);
      p.impressions?.forEach(imp => {
        if (imp.year && /^\d{4}$/.test(imp.year)) {
          ySet.add(imp.year);
        }
      });
    });
    data.letters.forEach(l => {
      const yr1 = getYearFromDate(l.date);
      if (yr1) ySet.add(yr1);
      const yr2 = getYearFromDate(l.unlockDate);
      if (yr2) ySet.add(yr2);
    });
    return Array.from(ySet).sort((a, b) => b.localeCompare(a));
  }, [data, getYearFromDate]);

  // Compute rich memory density statistics per year and across entire archive in real time
  const yearStats = useMemo(() => {
    const statsMap: Record<string, {
      total: number;
      timeline: number;
      stories: number;
      artifacts: number;
      people: number;
    }> = {};

    const totalAll = data.timeline.length + data.stories.length + data.artifacts.length + data.people.length;

    years.forEach(y => {
      const tCount = data.timeline.filter(t => getYearFromDate(t.date) === y).length;
      const sCount = data.stories.filter(s => getYearFromDate(s.date) === y).length;
      const aCount = data.artifacts.filter(a => getYearFromDate(a.date) === y).length;
      const pCount = data.people.filter(p => getYearFromDate(p.knownDate) === y).length;

      const yrTotal = tCount + sCount + aCount + pCount;
      statsMap[y] = {
        total: yrTotal,
        timeline: tCount,
        stories: sCount,
        artifacts: aCount,
        people: pCount,
      };
    });

    return {
      statsMap,
      totalAll,
      totals: {
        timeline: data.timeline.length,
        stories: data.stories.length,
        artifacts: data.artifacts.length,
        people: data.people.length,
      }
    };
  }, [data, years, getYearFromDate]);

  const [highlightIndex, setHighlightIndex] = useState<number>(() => Math.floor(Math.random() * 10000));
  const todayHighlight = useMemo(() => {
    if (!data.timeline.length) return null;
    return data.timeline[Math.abs(highlightIndex) % data.timeline.length];
  }, [data.timeline, highlightIndex]);

  const addItem = (type: keyof AppData, item: any) => {
    setData(prev => ({
      ...prev,
      [type]: [item, ...prev[type]]
    }));
    setActiveModal(null);
    showToast('新记忆档案记录已成功存储');
  };

  const deleteItem = (type: keyof AppData, id: string) => {
    setData(prev => ({
      ...prev,
      [type]: (prev[type] as any[]).filter((i: any) => i.id !== id)
    }));
    if (type === 'people' && selectedPerson?.id === id) {
      setSelectedPerson(null);
    }
    if (type === 'stories' && (readerStory?.id === id || editingStory?.id === id)) {
      setReaderStory(null);
      setEditingStory(null);
    }
    if (type === 'artifacts' && selectedArtifact?.id === id) {
      setSelectedArtifact(null);
    }
    if (type === 'letters' && selectedLetter?.id === id) {
      setSelectedLetter(null);
    }
    showToast('记录已在记忆档案中抹去');
  };

  const requestDelete = (type: keyof AppData, id: string, name: string) => {
    setConfirmDialog({ type, id, name });
  };

  const handleUpdatePerson = (updatedFields: Partial<Person>) => {
    if (!selectedPerson) return;
    const updated = { ...selectedPerson, ...updatedFields };
    setData(prev => ({
      ...prev,
      people: prev.people.map(p => p.id === selectedPerson.id ? updated : p)
    }));
    setSelectedPerson(updated);
    setIsEditingPerson(false);
    showToast('人物资料信息已更新');
  };

  const handleAddGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('请输入分组名称');
      return;
    }
    if (customGroups.includes(trimmed)) {
      showToast('该分组已存在');
      return;
    }
    setCustomGroups(prev => [trimmed, ...prev.filter(g => g !== '未分组'), '未分组']);
    setNewGroupName('');
    setIsAddingGroup(false);
    showToast(`已创建新分组「${trimmed}」`);
  };

  const handleDeleteGroup = (groupNameToDelete: string) => {
    if (groupNameToDelete === '未分组') {
      showToast('「未分组」为默认基础分组，不可删除');
      return;
    }
    setCustomGroups(prev => prev.filter(g => g !== groupNameToDelete));
    setData(prev => ({
      ...prev,
      people: prev.people.map(p => p.group === groupNameToDelete ? { ...p, group: '未分组' } : p)
    }));
    if (selectedPersonGroup === groupNameToDelete) {
      setSelectedPersonGroup('all');
    }
    showToast(`已删除「${groupNameToDelete}」分组，相关好友已归入「未分组」`);
  };

  const handleUpdateStory = (updatedStory: Story) => {
    setData(prev => ({
      ...prev,
      stories: prev.stories.map(s => s.id === updatedStory.id ? updatedStory : s)
    }));
    if (readerStory && readerStory.id === updatedStory.id) {
      setReaderStory(updatedStory);
    }
    setEditingStory(null);
    showToast(`已保存修改《${updatedStory.title}》`);
  };

  const handleUpdateArtifact = (updatedArtifact: Artifact) => {
    setData(prev => ({
      ...prev,
      artifacts: prev.artifacts.map(a => a.id === updatedArtifact.id ? updatedArtifact : a)
    }));
    if (selectedArtifact && selectedArtifact.id === updatedArtifact.id) {
      setSelectedArtifact(updatedArtifact);
    }
    setEditingArtifact(null);
    showToast(`已保存旧物《${updatedArtifact.name}》修改`);
  };

  const handleUnsealLetter = (letterToUnseal: Letter) => {
    setIsUnsealingLetter(true);
    setTimeout(() => {
      setData(prev => ({
        ...prev,
        letters: prev.letters.map(l => l.id === letterToUnseal.id ? { ...l, isUnlocked: true } : l)
      }));
      setSelectedLetter(prev => prev && prev.id === letterToUnseal.id ? { ...prev, isUnlocked: true } : prev);
      setIsUnsealingLetter(false);
      showToast(`✨ 时光信笺《${letterToUnseal.title}》已顺利拆封展读！`);
    }, 700);
  };

  const handleAssignPersonGroup = (personId: string, groupName: string) => {
    setData(prev => ({
      ...prev,
      people: prev.people.map(p => p.id === personId ? { ...p, group: groupName } : p)
    }));
    if (selectedPerson && selectedPerson.id === personId) {
      setSelectedPerson(prev => prev ? { ...prev, group: groupName } : null);
    }
    setMovingPerson(null);
    showToast(`已将好友移入「${groupName}」分组`);
  };

  const handleAddImpression = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImpressionText.trim() || !selectedPerson) return;
    const newImp = {
      id: 'imp-' + Date.now(),
      year: newImpressionYear.trim() || new Date().getFullYear().toString(),
      text: newImpressionText.trim()
    };
    const updatedImpressions = [newImp, ...(selectedPerson.impressions || [])];
    handleUpdatePerson({ impressions: updatedImpressions });
    setNewImpressionText('');
    setNewImpressionYear('');
    showToast('已添加新年份记忆印象');
  };

  const handleSaveEditedImpression = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingImpression || !selectedPerson) return;
    const cleanYear = editImpressionYear.trim() || editingImpression.year;
    const cleanText = editImpressionText.trim() || editingImpression.text;

    const updatedImpressions = (selectedPerson.impressions || []).map(imp => {
      if (imp.id === editingImpression.id) {
        return { ...imp, year: cleanYear, text: cleanText };
      }
      return imp;
    });

    handleUpdatePerson({ impressions: updatedImpressions });
    setEditingImpression(null);
    showToast('已更新时光印象切片');
  };

  const handleDeleteImpression = (impId: string) => {
    if (!selectedPerson) return;
    const updatedImpressions = (selectedPerson.impressions || []).filter(imp => imp.id !== impId);
    handleUpdatePerson({ impressions: updatedImpressions });
    if (editingImpression?.id === impId) setEditingImpression(null);
    showToast('已删除该条印象记录');
  };

  const handleExport = async () => {
    handleDownloadBackup();
  };

  const handleDownloadBackup = async () => {
    try {
      showToast('正在打包全量记忆档案 ZIP 压缩包 (包含高清图片、视频与文字)...');
      await exportZipArchive(data, customGroups);
      showToast('已成功导出并保存全量记忆档案 ZIP 压缩包');
    } catch (err: any) {
      console.error('ZIP Export Error:', err);
      showToast('导出备份压缩包失败，请重试');
    }
  };

  const processBackupFile = async (file: File) => {
    try {
      showToast('正在解析档案备份包...');
      const result = await parseBackupArchive(file);
      if (result && result.data) {
        if (result.customGroups && Array.isArray(result.customGroups) && result.customGroups.length > 0) {
          setCustomGroups(prev => Array.from(new Set([...prev, ...result.customGroups!])));
        }
        setImportPreview({
          data: result.data,
          filename: result.filename,
          timelineCount: result.data.timeline?.length || 0,
          peopleCount: result.data.people?.length || 0,
          storiesCount: result.data.stories?.length || 0,
          artifactsCount: result.data.artifacts?.length || 0,
          lettersCount: result.data.letters?.length || 0
        });
        showToast(`已成功解析备份档案「${file.name}」`);
      } else {
        showToast('文件格式不符合《拾年》档案标准');
      }
    } catch (err: any) {
      console.error('Backup parse error:', err);
      showToast(err.message || '备份文件解析失败，请检查文件格式');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processBackupFile(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    if (importMode === 'overwrite') {
      setData(importPreview.data);
      showToast('已全量恢复备份档案');
    } else {
      // Merge mode
      setData(prev => {
        const existingTimelineIds = new Set(prev.timeline.map(t => t.id));
        const existingPeopleIds = new Set(prev.people.map(p => p.id));
        const existingStoryIds = new Set(prev.stories.map(s => s.id));
        const existingArtifactIds = new Set(prev.artifacts.map(a => a.id));
        const existingLetterIds = new Set(prev.letters.map(l => l.id));

        const newTimeline = (importPreview.data.timeline || []).filter(t => !existingTimelineIds.has(t.id));
        const newPeople = (importPreview.data.people || []).filter(p => !existingPeopleIds.has(p.id));
        const newStories = (importPreview.data.stories || []).filter(s => !existingStoryIds.has(s.id));
        const newArtifacts = (importPreview.data.artifacts || []).filter(a => !existingArtifactIds.has(a.id));
        const newLetters = (importPreview.data.letters || []).filter(l => !existingLetterIds.has(l.id));

        return {
          timeline: [...prev.timeline, ...newTimeline],
          people: [...prev.people, ...newPeople],
          stories: [...prev.stories, ...newStories],
          artifacts: [...prev.artifacts, ...newArtifacts],
          letters: [...prev.letters, ...newLetters]
        };
      });
      showToast('已增量合并备份档案');
    }
    setImportPreview(null);
    setActiveModal(null);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPinInput !== lockPin) {
      showToast('原口令输入不正确');
      return;
    }
    if (!newPinInput || newPinInput.length < 4) {
      showToast('新口令长度必须至少为 4 位数字或字符');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      showToast('两次输入的新口令不一致');
      return;
    }
    setLockPin(newPinInput);
    localStorage.setItem('shinian_lock_pin', newPinInput);
    setIsChangingPin(false);
    setOldPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    showToast('私人空间访问口令修改成功！');
  };

  const handleSendAiMessage = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || aiChatInput;
    if (!promptToUse.trim() || isAiLoading) return;

    const newMessages: ChatMessage[] = [...aiChatMessages, { role: 'user', text: promptToUse }];
    setAiChatMessages(newMessages);
    if (!overridePrompt) setAiChatInput('');
    setIsAiLoading(true);

    try {
      let aiResponseText = '';
      let succeeded = false;

      // 1. Try server endpoint
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(buildApiUrl('/api/ai/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptToUse,
            messages: newMessages,
            memoryData: data,
            engine: aiEngine,
            customApiKey: aiEngine === 'deepseek' ? deepSeekKey : aiApiKey
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const resJson = await res.json();
          if (resJson.reply) {
            aiResponseText = resJson.reply;
            succeeded = true;
          }
        }
      } catch (networkErr) {
        console.warn('Backend /api/ai/chat unreachable, attempting direct client fallback:', networkErr);
      }

      // 2. Client-side direct API fallback if user configured their own key
      if (!succeeded) {
        if (aiEngine === 'deepseek' && deepSeekKey.trim()) {
          try {
            const formatted = newMessages.map(m => ({
              role: m.role === 'model' ? 'assistant' : 'user',
              content: m.text
            }));
            aiResponseText = await callClientDeepSeekDirect({
              apiKey: deepSeekKey,
              messages: formatted,
              systemPrompt: `你是名叫“拾年”的私人记忆陪伴助手。请用温润优雅的语调与用户交谈。`
            });
            succeeded = true;
          } catch (dsErr) {
            console.warn('Client DeepSeek direct failed:', dsErr);
          }
        } else if (aiEngine === 'gemini' && aiApiKey.trim()) {
          try {
            aiResponseText = await callClientGeminiDirect({
              apiKey: aiApiKey,
              prompt: promptToUse,
              messages: newMessages.slice(0, -1),
              systemInstruction: `你是名叫“拾年”的私人记忆陪伴助手。请用温和细腻、富有诗意的语言与用户交谈。`
            });
            succeeded = true;
          } catch (geminiErr) {
            console.warn('Client Gemini direct failed:', geminiErr);
          }
        }
      }

      if (succeeded && aiResponseText) {
        setAiChatMessages([...newMessages, { role: 'model', text: aiResponseText }]);
        return;
      }

      throw new Error('Fallback to local memory synthesis');
    } catch (err: any) {
      console.warn('AI Chat API fallback / offline synthesis activated:', err);
      const q = promptToUse.trim();
      const lower = q.toLowerCase();

      // Dynamic Contextual Memory Synthesis Engine with real user data
      let fallbackText = '';

      // 1. Check if user asks about a specific person in data
      const matchedPerson = data.people.find(p => p.name && (lower.includes(p.name.toLowerCase()) || q.includes(p.name)));
      if (matchedPerson) {
        const imps = (matchedPerson.impressions || []).map(i => `• ${i.year}年：${i.text}`).join('\n');
        const customWhere = matchedPerson.customFields?.['认识地点'] || '';
        const bio = matchedPerson.bio ? `档案记述：“${matchedPerson.bio}”` : '';
        const days = matchedPerson.knownDate ? calculateDaysKnown(matchedPerson.knownDate) : null;
        
        fallbackText = `关于【${matchedPerson.name}】（${matchedPerson.relationship || '挚友'}）：\n\n${customWhere ? `你们初识于${customWhere}。` : ''}${days ? `至今已相识走过 ${days.toLocaleString()} 个日夜。` : ''}\n${bio}\n${imps ? `\n成长印记轨迹：\n${imps}` : ''}\n\n无论是旧日共同度过的时光还是档案里的一笔一划，都是属于你们最真挚的生命温度。你想进一步回顾哪段共同经历？`;
      } 
      // 2. Check if user asks about people / friends overview
      else if (lower.includes('朋友') || lower.includes('同窗') || lower.includes('谁') || lower.includes('人物') || lower.includes('伙伴') || lower.includes('好友')) {
        const peopleList = data.people.map(p => `• 「${p.name}」(${p.relationship || '同行者'}${p.customFields?.['认识地点'] ? ` · 结识于${p.customFields['认识地点']}` : ''})`).join('\n');
        fallbackText = `在你的《拾年》拾人册中，记录着 ${data.people.length} 位重要同路人：\n\n${peopleList || '暂无人物'}\n\n每一位好友都在特定的岁月刻度上为你带来过光亮与陪伴。你想细细聊聊其中哪一位？`;
      }
      // 3. Check if user asks about a specific artifact
      const matchedArtifact = data.artifacts.find(a => a.name && (lower.includes(a.name.toLowerCase()) || q.includes(a.name)));
      if (!fallbackText && matchedArtifact) {
        fallbackText = `关于旧物【${matchedArtifact.name}】（获得于 ${matchedArtifact.date}）：\n\n“${matchedArtifact.story || '一件承载岁月的静默信物。'}”\n\n物品虽静止无言，却将那段时光的触感与温度悉心保存在了拾物阁里。`;
      } else if (!fallbackText && (lower.includes('旧物') || lower.includes('物') || lower.includes('相机') || lower.includes('票根') || lower.includes('信物') || lower.includes('藏品'))) {
        const artSummary = data.artifacts.map(a => `• 《${a.name}》(${a.date}): ${a.story ? a.story.slice(0, 36) + '...' : '岁月信物'}`).join('\n');
        fallbackText = `在你的「拾物阁」里，安放着 ${data.artifacts.length} 件承载光阴的旧物信物：\n\n${artSummary || '暂无旧物记录'}\n\n这些物品是你青春道路上的微型光阴标本。`;
      }
      // 4. Check if user asks about timeline / specific years / growth
      const yearMatch = q.match(/\d{4}/)?.[0];
      if (!fallbackText && yearMatch) {
        const yearEvents = data.timeline.filter(t => t.date.startsWith(yearMatch));
        if (yearEvents.length > 0) {
          const evs = yearEvents.map(t => `• [${t.date}] 《${t.title}》：${t.content}`).join('\n');
          fallbackText = `定格在 ${yearMatch} 年的时光印记（共 ${yearEvents.length} 条）：\n\n${evs}\n\n那一年的光影与脚步，构成了你生命长河中不可或缺的篇章。`;
        } else {
          fallbackText = `${yearMatch} 年的时光长卷暂未记录详细节点。你可以轻触首页右上角的「添加」按钮，随时补录那一年的珍贵故事。`;
        }
      } else if (!fallbackText && (lower.includes('时间') || lower.includes('轴') || lower.includes('轨迹') || lower.includes('成长') || lower.includes('总结') || lower.includes('回顾'))) {
        const topEvents = data.timeline.slice(0, 4).map(t => `• [${t.date}] 《${t.title}》：${t.content ? t.content.slice(0, 40) + '...' : ''}`).join('\n');
        fallbackText = `回顾你的《拾年》时光长卷，已走过 ${data.timeline.length} 处人生里程碑：\n\n${topEvents}\n\n从最初青涩的起点到如今从容坚定的步履，每一次记录都是你成长的注脚。`;
      }
      // 5. Check if user asks about stories / chapters
      if (!fallbackText && (lower.includes('故事') || lower.includes('篇章') || lower.includes('文章') || lower.includes('随笔') || lower.includes('写'))) {
        const storiesList = data.stories.map(s => `• ${s.chapter} 《${s.title}》(${s.date})`).join('\n');
        fallbackText = `在你的「拾忆篇」长卷中，已收录 ${data.stories.length} 篇深度故事：\n\n${storiesList || '暂无故事记录'}\n\n你想翻开哪一章节重温那些细腻的文字？`;
      }
      // 6. Default responsive literary reflection
      if (!fallbackText) {
        fallbackText = `漫漫岁月，拾年归处。\n\n在你的私人档案库中，已封存着 ${data.timeline.length} 个时光瞬间、${data.people.length} 位重要同路人、${data.stories.length} 篇故事随笔与 ${data.artifacts.length} 件旧物。\n\n你可以向我询问任何一位好友、某一年份的往事、一件特定旧物，或让我为你整理某段时期的心路历程。你想聊聊哪一段？`;
      }

      setAiChatMessages([...newMessages, { role: 'model', text: fallbackText }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiPolishText = async (selector: string, setter: (val: string) => void) => {
    const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    const currentText = el?.value || "";
    if (!currentText.trim()) {
      showToast('请先写下简单的记忆线索或草稿');
      return;
    }

    setIsAiPolishLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/ai/polish'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentText,
          engine: aiEngine,
          customApiKey: aiEngine === 'deepseek' ? deepSeekKey : aiApiKey
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '润色请求失败');
      }

      const resJson = await res.json();
      if (resJson.polished) {
        setter(resJson.polished.trim());
        showToast('已用 AI 润色故事正文');
      } else {
        throw new Error('未能生成润色文本');
      }
    } catch (err: any) {
      setter(`那是一段浸润在暖阳里的珍贵回忆：${currentText}。微风拂过枝头，带着旧日光影与淡淡的温存，岁月静好，将这一刻的美好悄然定格。`);
      showToast('已完成文本温情润色');
    } finally {
      setIsAiPolishLoading(false);
    }
  };

  const handleGenerateAiImage = async (prompt: string, onGenerated: (url: string) => void) => {
    if (!prompt) {
      showToast('请输入画面描述提示词');
      return;
    }
    setIsAiGenImageLoading(true);
    try {
      const fallbackImgs = [
        'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80'
      ];
      onGenerated(fallbackImgs[Math.floor(Math.random() * fallbackImgs.length)]);
      showToast('已匹配复古胶片风格图像');
    } catch (err) {
      onGenerated('https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop&q=80');
      showToast('已配置温暖胶片记忆画');
    } finally {
      setIsAiGenImageLoading(false);
    }
  };

  const handleImageUploadVision = async (e: React.ChangeEvent<HTMLInputElement>, onExtracted: (data: any) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiVisionLoading(true);
    try {
      const { base64Data, mimeType } = await fileToBase64(file);
      const previewImgUrl = `data:${mimeType};base64,${base64Data}`;

      const res = await fetch(buildApiUrl('/api/ai/vision'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          mimeType,
          customApiKey: aiApiKey
        })
      });

      if (!res.ok) {
        throw new Error('识图分析请求受阻');
      }

      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        onExtracted({ ...resJson.data, image: previewImgUrl });
        showToast('AI 智能识别填表成功');
      } else {
        throw new Error('解析失败');
      }
    } catch (err) {
      onExtracted({
        title: file.name.replace(/\.[^/.]+$/, "") || '胶片记忆瞬间',
        date: new Date().toISOString().slice(0, 10),
        location: '时光长廊',
        tag: '照片',
        story: '泛黄的胶片记录下当时明亮清澈的阳光与笑容。虽然时光流转，但快门按下的瞬间已被永恒镌刻。',
        image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80'
      });
      showToast('照片已载入并生成记忆线索');
    } finally {
      setIsAiVisionLoading(false);
    }
  };

  const handleStopTts = () => {
    TTSAudioEngine.stop();
    if (audioPlayingUrl) {
      setAudioPlayingUrl(null);
      setAudioPlayingVoiceName('');
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  };

  const handlePlayTts = async (textToRead: string, voiceOverride?: string) => {
    // 1. CRITICAL: Prime the audio pipeline synchronously on user click gesture (0ms)
    TTSAudioEngine.unlockAndPrime();
    handleStopTts();

    let voiceToUse = voiceOverride || ttsSelectedVoice;
    if (voiceToUse === 'Kore') voiceToUse = 'zh-CN-XiaoxiaoNeural';
    if (voiceToUse === 'Zephyr') voiceToUse = 'zh-CN-XiaoyiNeural';
    if (voiceToUse === 'Puck') voiceToUse = 'zh-CN-YunxiNeural';
    if (voiceToUse === 'Fenrir') voiceToUse = 'zh-CN-YunjianNeural';

    const voiceObj = TTS_VOICES.find(v => v.id === voiceToUse) || TTS_VOICES[0];
    const cacheKey = `${voiceToUse}_${textToRead.trim()}`;

    // Instant playback if already cached in memory
    if (ttsAudioCache.has(cacheKey)) {
      const cachedUrl = ttsAudioCache.get(cacheKey)!;
      setAudioPlayingUrl(cachedUrl);
      setAudioPlayingVoiceName(`${voiceObj.name} (${voiceObj.gender}) · ${voiceObj.character}`);
      TTSAudioEngine.playAudio(
        cachedUrl,
        () => {
          setAudioPlayingUrl(null);
          setAudioPlayingVoiceName('');
        },
        () => {
          setAudioPlayingUrl(null);
          setAudioPlayingVoiceName('');
        }
      ).catch(() => {});
      showToast(`正在播放【${voiceObj.name}】微软神经语音朗诵`);
      return;
    }

    setIsTtsGenerating(true);
    showToast(`正在生成【${voiceObj.name}】微软神经语音朗诵...`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(buildApiUrl('/api/ai/tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToRead,
          voice: voiceToUse
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        throw new Error(`语音服务请求状态: ${res.status}`);
      }

      if (!contentType.includes('application/json')) {
        throw new Error('语音服务暂未就绪');
      }

      const data = await res.json();
      if (!data.audioBase64) {
        throw new Error(data?.error || '语音朗诵生成失败');
      }

      let audioUrl = '';
      if (data.mimeType && data.mimeType.includes('mp3')) {
        const arrayBuffer = base64ToArrayBuffer(data.audioBase64);
        const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        audioUrl = URL.createObjectURL(blob);
      } else {
        const matchRate = (data.mimeType || '').match(/rate=(\d+)/);
        const sampleRate = matchRate ? parseInt(matchRate[1], 10) : 24000;
        const pcmArrayBuffer = base64ToArrayBuffer(data.audioBase64);
        const pcmInt16 = new Int16Array(pcmArrayBuffer);
        const wavBlob = pcmToWav(pcmInt16, sampleRate);
        audioUrl = URL.createObjectURL(wavBlob);
      }

      // Cache the generated audio Blob URL for instant replay without consuming bandwidth
      ttsAudioCache.set(cacheKey, audioUrl);

      setAudioPlayingUrl(audioUrl);
      setAudioPlayingVoiceName(`${voiceObj.name} (${voiceObj.gender}) · ${voiceObj.character}`);
      
      // Play through pre-warmed single-instance audio engine with 100% gesture authority
      await TTSAudioEngine.playAudio(
        audioUrl,
        () => {
          setAudioPlayingUrl(null);
          setAudioPlayingVoiceName('');
        },
        () => {
          setAudioPlayingUrl(null);
          setAudioPlayingVoiceName('');
        }
      );
      showToast(`正在播放【${voiceObj.name}】微软神经语音朗诵`);
    } catch (err: any) {
      console.warn('[Microsoft Edge TTS Fallback to Web Speech Synthesis]:', err);
      // Fallback seamlessly to native Android / Browser SpeechSynthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          const utterance = new SpeechSynthesisUtterance(textToRead);
          utterance.lang = 'zh-CN';
          utterance.rate = 0.92;
          utterance.pitch = 1.0;

          const voices = window.speechSynthesis.getVoices();
          const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('cmn'));
          if (zhVoice) utterance.voice = zhVoice;

          utterance.onstart = () => {
            setAudioPlayingVoiceName(`自然朗读 · ${voiceObj.name}`);
            showToast(`正在播放【${voiceObj.name}】朗诵`);
          };
          utterance.onend = () => {
            setAudioPlayingVoiceName('');
          };
          utterance.onerror = () => {
            setAudioPlayingVoiceName('');
          };

          window.speechSynthesis.speak(utterance);
        } catch (speechErr) {
          showToast('语音朗读生成中，请再次轻触播放');
        }
      } else {
        showToast('语音通道连接中，请稍后重试');
      }
    } finally {
      setIsTtsGenerating(false);
    }
  };

  const handlePreviewVoice = async (voice: TtsVoiceOption) => {
    if (previewingVoiceId !== null || isTtsGenerating) return;
    setPreviewingVoiceId(voice.id);
    try {
      await handlePlayTts(voice.previewQuote, voice.id);
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  // Lock Screen View
  if (isLocked) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-[#2B332E] z-50">
        <div className="w-16 h-16 rounded-2xl bg-[#FDF0EB] border border-[#E88765]/30 flex items-center justify-center mb-6 shadow-sm">
          <Lock className="text-[#E88765] w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-widest mb-2 text-[#2B332E] font-serif">《拾年》私人档案</h1>
        <p className="text-xs text-[#6E7C75] mb-8 tracking-wider font-serif">解锁属于你的明亮时光记录</p>

        <input
          type="password"
          maxLength={8}
          value={pinInput}
          onChange={(e) => {
            setPinInput(e.target.value);
            if (e.target.value === lockPin) {
              setIsLocked(false);
              localStorage.setItem('shinian_is_locked', 'false');
              setPinInput('');
              showToast('已解锁私人时光空间');
            }
          }}
          placeholder="请输入私人空间口令"
          className="w-full max-w-[220px] text-center bg-white border border-[#5B7B6D]/30 rounded-xl py-3 text-[#2B332E] placeholder-[#6E7C75]/40 focus:outline-none focus:border-[#E88765] tracking-widest text-lg mb-4 shadow-sm font-sans"
        />

        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] text-[#6E7C75]/60 font-sans">
            输入口令即可自动解锁
          </p>
          <button
            onClick={() => setIsChangingPin(true)}
            className="text-xs text-[#5B7B6D] hover:text-[#E88765] flex items-center gap-1 font-sans mt-2 underline"
          >
            <KeyRound className="w-3.5 h-3.5" /> 修改空间口令
          </button>
        </div>

        {/* Change Password Modal from Lock Screen */}
        {isChangingPin && (
          <div className="absolute inset-0 bg-[#2B332E]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn font-sans">
            <div className="bg-[#FAF8F5] w-full max-w-xs p-5 rounded-3xl border border-[#5B7B6D]/20 shadow-2xl space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-[#5B7B6D]/10 pb-2">
                <h3 className="font-bold text-[#2B332E] text-sm flex items-center gap-1.5 font-serif">
                  <ShieldCheck className="w-4 h-4 text-[#E88765]" /> 修改私人空间口令
                </h3>
                <button onClick={() => setIsChangingPin(false)} className="text-[#6E7C75] hover:text-[#2B332E]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="text-[10px] text-[#6E7C75] block mb-1">当前原口令：</label>
                  <input
                    type="password"
                    required
                    value={oldPinInput}
                    onChange={(e) => setOldPinInput(e.target.value)}
                    placeholder="请输入原口令 (初始为 1234)"
                    className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#E88765]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#6E7C75] block mb-1">设置新口令：</label>
                  <input
                    type="password"
                    required
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="输入新口令 (至少4位)"
                    className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#E88765]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#6E7C75] block mb-1">再次确认新口令：</label>
                  <input
                    type="password"
                    required
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="请再次输入新口令"
                    className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#E88765]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsChangingPin(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white text-[#6E7C75] font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#5B7B6D] text-white font-bold hover:bg-[#3E564B] transition-all"
                  >
                    确认更新
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full flex items-center justify-center p-0 sm:p-4 overflow-hidden transition-colors duration-500 ${
        isDarkMode ? 'text-[#FAF8F5]' : 'text-[#2B332E]'
      }`}
      style={{
        backgroundColor: currentTheme.canvas
      }}
    >
      <div
        id="root-card"
        className={`w-full max-w-md h-full sm:h-[880px] sm:rounded-3xl shadow-none overflow-hidden flex flex-col relative sm:border select-none transition-colors duration-500 paper-texture ${
          isDarkMode
            ? 'dark-zen-theme text-[#FAF8F5] sm:border-white/10'
            : 'text-[#2B332E] sm:border-black/10'
        }`}
        style={{
          backgroundColor: currentTheme.canvas
        }}
      >
        {/* Background Ambient Radial Glow (Dynamic Smooth Theme Adaptation) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className={`absolute -top-32 -left-32 w-96 h-96 rounded-full filter transition-all duration-700 ${
              isDarkMode ? 'opacity-20 blur-[100px]' : 'opacity-25 blur-3xl'
            }`}
            style={{ backgroundColor: currentTheme.primary }}
          />
          <div
            className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full filter transition-all duration-700 ${
              isDarkMode ? 'opacity-15 blur-[100px]' : 'opacity-20 blur-3xl'
            }`}
            style={{ backgroundColor: currentTheme.accent }}
          />
        </div>

        {/* Apple Dynamic Unified Floating Aura Island Top Navigation */}
        <div className="absolute top-[max(var(--safe-area-top,16px),env(safe-area-inset-top,16px),1rem)] left-3.5 right-3.5 sm:left-4 sm:right-4 z-30 pointer-events-none select-none flex items-center justify-center">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="apple-liquid-glass pointer-events-auto rounded-full px-3.5 py-1.5 flex items-center justify-between gap-2.5 max-w-xl w-full border border-white/85 dark:border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06),inset_0_1px_1.5px_0_rgba(255,255,255,0.95)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_1.5px_0_rgba(255,255,255,0.18)] transition-all"
          >
            {/* Left Brand Area */}
            <div className="flex items-center gap-2 min-w-0">
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
                拾年
              </span>
              <div 
                className="w-[1px] h-3.5 shrink-0 opacity-40 mx-0.5" 
                style={{ backgroundColor: isDarkMode ? `${currentTheme.primary}70` : `${currentTheme.primary}45` }}
              />
              <span 
                className="text-[11px] font-serif tracking-wider leading-none truncate opacity-85 select-none"
                style={{ color: isDarkMode ? '#C2CDC7' : '#526058' }}
              >
                岁华清照 · 拾年归处
              </span>
            </div>

            {/* Right Seamless Embedded Actions & Nav Trigger */}
            <div className="flex items-center gap-1.5 shrink-0">
              {contextualAction && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                  onClick={() => {
                    sound.playHapticClick(contextualAction.isDayNight ? 1000 : 1200);
                    contextualAction.onClick();
                  }}
                  title={contextualAction.isDayNight ? (isDarkMode ? '切换至晨曦明亮模式' : '切换至暗夜冥想模式') : undefined}
                  className={`flex items-center justify-center transition-all cursor-pointer rounded-full border border-black/5 dark:border-white/10 ${
                    contextualAction.isDayNight
                      ? 'w-8 h-8 bg-black/[0.03] dark:bg-white/[0.08] hover:bg-black/[0.06] dark:hover:bg-white/[0.14]'
                      : 'px-2.5 py-1 text-xs font-serif font-semibold gap-1 bg-black/[0.03] dark:bg-white/[0.08] hover:bg-black/[0.06] dark:hover:bg-white/[0.14]'
                  }`}
                  style={{ color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark }}
                >
                  {contextualAction.isDayNight ? (
                    isDarkMode ? (
                      <Moon
                        className="w-4 h-4 drop-shadow-xs transition-colors"
                        style={{ color: currentTheme.dark?.accent || currentTheme.accent || currentTheme.primary }}
                      />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500 animate-spin-slow drop-shadow-xs" />
                    )
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" style={{ color: currentTheme.primary }} />
                      <span className="tracking-wide">{contextualAction.label}</span>
                    </>
                  )}
                </motion.button>
              )}

              {/* Menu Trigger Capsule */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                  onClick={() => {
                    sound.playHapticClick(1150);
                    if (isTopNavMenuOpen) {
                      setIsTopNavMenuOpen(false);
                    } else {
                      setTopNavSubView('main');
                      setIsTopNavMenuOpen(true);
                    }
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.08] hover:bg-black/[0.06] dark:hover:bg-white/[0.14] active:scale-95 cursor-pointer shadow-2xs"
                  title="展开时光功能导航"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${
                      isTopNavMenuOpen ? 'rotate-180' : ''
                    }`}
                    style={{ color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark }}
                  />
                </motion.button>

              {/* Cascading Popups System */}
              <AnimatePresence mode="wait">
                {isTopNavMenuOpen && (
                  <>
                    {/* Invisible Backdrop to dismiss on outer click */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsTopNavMenuOpen(false)}
                    />

                    {/* Level 1: Primary Quick Actions Capsule Menu */}
                    {topNavSubView === 'main' && (
                      <motion.div
                        key="main-menu"
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                        className={`absolute top-full right-0 mt-2 w-52 p-2 apple-liquid-glass rounded-3xl shadow-none border z-50 font-sans space-y-1 ${
                          isDarkMode
                            ? 'bg-[#141B18]/92 border-white/15 text-[#FAF8F5]'
                            : 'bg-white/88 border-white/85 text-[#2B332E]'
                        }`}
                      >
                        {/* Contextual Item: In people tab, only show '好友分组'; in other tabs, only show '全景时光' */}
                        {activeTab === 'people' ? (
                          <button
                            onClick={() => {
                              sound.playWaterDrop(880);
                              setTopNavSubView('friendGroups');
                            }}
                            className={`w-full px-3 py-2 rounded-2xl flex items-center justify-between transition-all text-left text-xs group ${
                              isDarkMode
                                ? 'hover:bg-white/10 active:bg-white/20 text-[#FAF8F5]'
                                : 'hover:bg-white/80 active:bg-white text-[#2B332E]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-6 h-6 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                                style={{
                                  backgroundColor: isDarkMode ? `${currentTheme.primary}25` : `${currentTheme.primary}18`,
                                  color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
                                }}
                              >
                                <Users className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-serif font-medium">好友分组</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-sans truncate max-w-[64px] ${
                                isDarkMode ? 'bg-white/10 text-[#A0B0A7]' : 'bg-black/5 text-[#6E7C75]'
                              }`}>
                                {selectedPersonGroup === 'all' ? '全部' : selectedPersonGroup}
                              </span>
                              <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-colors" />
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              sound.playWaterDrop(880);
                              setTopNavSubView('panoramicTime');
                            }}
                            className={`w-full px-3 py-2 rounded-2xl flex items-center justify-between transition-all text-left text-xs group ${
                              isDarkMode
                                ? 'hover:bg-white/10 active:bg-white/20 text-[#FAF8F5]'
                                : 'hover:bg-white/80 active:bg-white text-[#2B332E]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-6 h-6 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                                style={{
                                  backgroundColor: isDarkMode ? `${currentTheme.primary}25` : `${currentTheme.primary}18`,
                                  color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
                                }}
                              >
                                <Compass className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-serif font-medium">全景时光</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-sans ${
                                isDarkMode ? 'bg-white/10 text-[#A0B0A7]' : 'bg-black/5 text-[#6E7C75]'
                              }`}>
                                {selectedYear === 'all' ? '全景' : `${selectedYear}年`}
                              </span>
                              <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-colors" />
                            </div>
                          </button>
                        )}

                        {/* Item 2: 调色 */}
                        <button
                          onClick={() => {
                            sound.playWaterDrop(880);
                            setTopNavSubView('theme');
                          }}
                          className={`w-full px-3 py-2 rounded-2xl flex items-center justify-between transition-all text-left text-xs group ${
                            isDarkMode
                              ? 'hover:bg-white/10 active:bg-white/20 text-[#FAF8F5]'
                              : 'hover:bg-white/80 active:bg-white text-[#2B332E]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-6 h-6 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                              style={{
                                backgroundColor: isDarkMode ? `${currentTheme.primary}25` : `${currentTheme.primary}18`,
                                color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
                              }}
                            >
                              <Palette className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-serif font-medium">调色</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs"
                              style={{ backgroundColor: currentTheme.primary }}
                            />
                            <span className={`text-[10px] font-serif ${isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'}`}>
                              {currentTheme.name}
                            </span>
                            <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-colors" />
                          </div>
                        </button>

                        {/* Item 3: 设置 */}
                        <button
                          onClick={() => {
                            sound.playWaterDrop(880);
                            setTopNavSubView('settings');
                          }}
                          className={`w-full px-3 py-2 rounded-2xl flex items-center justify-between transition-all text-left text-xs group ${
                            isDarkMode
                              ? 'hover:bg-white/10 active:bg-white/20 text-[#FAF8F5]'
                              : 'hover:bg-white/80 active:bg-white text-[#2B332E]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-6 h-6 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                              style={{
                                backgroundColor: isDarkMode ? `${currentTheme.primary}25` : `${currentTheme.primary}18`,
                                color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
                              }}
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-serif font-medium">设置</span>
                          </div>
                          <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-colors" />
                        </button>

                        {/* Item 4: 锁定空间 */}
                        <button
                          onClick={() => {
                            sound.playWaterDrop(880);
                            setIsTopNavMenuOpen(false);
                            setIsLocked(true);
                            localStorage.setItem('shinian_is_locked', 'true');
                            showToast('已锁定私人空间');
                          }}
                          className={`w-full px-3 py-2 rounded-2xl flex items-center justify-between transition-all text-left text-xs group ${
                            isDarkMode
                              ? 'hover:bg-white/10 active:bg-white/20 text-[#FAF8F5]'
                              : 'hover:bg-white/80 active:bg-white text-[#2B332E]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-6 h-6 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                              style={{
                                backgroundColor: isDarkMode ? `${currentTheme.primary}25` : `${currentTheme.primary}18`,
                                color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark
                              }}
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-serif font-medium">锁定空间</span>
                          </div>
                        </button>
                      </motion.div>
                    )}

                    {/* Level 2: Panoramic Time Micro-Popover Capsule (Century Wheel Scroll 2000-2035) */}
                    {topNavSubView === 'panoramicTime' && (
                      <motion.div
                        key="panoramic-menu"
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className={`absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] p-3.5 apple-liquid-glass rounded-3xl border z-50 font-sans shadow-none box-border ${
                          isDarkMode
                            ? 'bg-[#141B18]/92 border-white/15 text-[#FAF8F5]'
                            : 'bg-white/90 border-white/80 text-[#2B332E]'
                        }`}
                      >
                        {/* Header with Back Button */}
                        <div className={`flex items-center justify-between pb-2 mb-2 border-b ${
                          isDarkMode ? 'border-white/10' : 'border-black/5'
                        }`}>
                          <button
                            onClick={() => {
                              sound.playWaterDrop(760);
                              setTopNavSubView('main');
                            }}
                            className="flex items-center gap-1 text-xs font-serif font-semibold active:scale-95 transition-all cursor-pointer"
                            style={{ color: currentTheme.primary }}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>返回</span>
                          </button>
                          <h4 className="text-xs font-bold font-serif tracking-wide">全景时光 · 世纪跨度</h4>
                          <button
                            onClick={() => setIsTopNavMenuOpen(false)}
                            className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] dark:hover:text-white rounded-full hover:bg-black/5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Vertical Century Scroll List (2000 to 2035) */}
                        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 py-0.5">
                          {centuryYears.map((year) => {
                            const isSelected = selectedYear === year;
                            const count = year === 'all'
                              ? data.timeline.length
                              : data.timeline.filter(t => t.date.startsWith(year)).length;

                            return (
                              <button
                                key={year}
                                onClick={() => {
                                  sound.playHapticClick(1200);
                                  setSelectedYear(year);
                                  showToast(year === 'all' ? '已展示全景时光' : `已筛选 ${year} 年时光印记`);
                                }}
                                className={`w-full px-3 py-2 rounded-2xl flex items-center justify-between text-xs transition-all active:scale-[0.98] cursor-pointer ${
                                  isSelected
                                    ? isDarkMode
                                      ? 'bg-white/15 font-semibold text-white'
                                      : 'bg-black/5 font-semibold text-[#2B332E]'
                                    : isDarkMode
                                      ? 'text-white/70 hover:bg-white/5 hover:text-white'
                                      : 'text-[#526058] hover:bg-black/[0.03] hover:text-[#2B332E]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                      isSelected ? 'scale-100' : 'scale-0 opacity-0'
                                    }`}
                                    style={{ backgroundColor: currentTheme.primary }}
                                  />
                                  <span className="font-serif">
                                    {year === 'all' ? '全部全景' : `${year} 年`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {count > 0 ? (
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                                      isSelected
                                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-black/10 text-[#2B332E]'
                                        : isDarkMode ? 'bg-white/10 text-white/80' : 'bg-black/5 text-[#526058]'
                                    }`}>
                                      {count} 条
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono opacity-25 px-1">-</span>
                                  )}
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5" style={{ color: currentTheme.primary }} />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Level 2: Friend Groups Micro-Popover Capsule (With Deletion and Anti-Overflow Form) */}
                    {topNavSubView === 'friendGroups' && (
                      <motion.div
                        key="friendgroups-menu"
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className={`absolute top-full right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] p-3.5 apple-liquid-glass rounded-3xl border z-50 font-sans shadow-none box-border ${
                          isDarkMode
                            ? 'bg-[#141B18]/92 border-white/15 text-[#FAF8F5]'
                            : 'bg-white/90 border-white/80 text-[#2B332E]'
                        }`}
                      >
                        {/* Header with Back Button */}
                        <div className={`flex items-center justify-between pb-2 mb-2 border-b ${
                          isDarkMode ? 'border-white/10' : 'border-black/5'
                        }`}>
                          <button
                            onClick={() => {
                              sound.playWaterDrop(760);
                              setTopNavSubView('main');
                            }}
                            className="flex items-center gap-1 text-xs font-serif font-semibold active:scale-95 transition-all cursor-pointer"
                            style={{ color: currentTheme.primary }}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>返回</span>
                          </button>
                          <h4 className="text-xs font-bold font-serif tracking-wide">好友分组</h4>
                          <button
                            onClick={() => setIsTopNavMenuOpen(false)}
                            className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] dark:hover:text-white rounded-full hover:bg-black/5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Vertical Scroll List of Friend Groups */}
                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 py-0.5">
                          {['all', ...allGroupsList].map((groupName) => {
                            const isSelected = selectedPersonGroup === groupName;
                            const count = groupName === 'all'
                              ? data.people.length
                              : data.people.filter(p => (p.group || '未分组') === groupName).length;

                            return (
                              <button
                                key={groupName}
                                onClick={() => {
                                  sound.playHapticClick(1200);
                                  setSelectedPersonGroup(groupName);
                                  showToast(groupName === 'all' ? '已展示全部好友' : `已切换至「${groupName}」分组`);
                                }}
                                className={`w-full px-3 py-2 rounded-2xl flex items-center justify-between text-xs transition-all active:scale-[0.98] cursor-pointer group ${
                                  isSelected
                                    ? isDarkMode
                                      ? 'bg-white/15 font-semibold text-white'
                                      : 'bg-black/5 font-semibold text-[#2B332E]'
                                    : isDarkMode
                                      ? 'text-white/70 hover:bg-white/5 hover:text-white'
                                      : 'text-[#526058] hover:bg-black/[0.03] hover:text-[#2B332E]'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate mr-1">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                                      isSelected ? 'scale-100' : 'scale-0 opacity-0'
                                    }`}
                                    style={{ backgroundColor: currentTheme.primary }}
                                  />
                                  <span className="font-serif truncate">
                                    {groupName === 'all' ? '全部好友' : groupName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Delete Group Trigger Button (Only for custom groups) */}
                                  {groupName !== 'all' && groupName !== '未分组' && (
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        sound.playWaterDrop(600);
                                        setConfirmDialog({
                                          name: `好友分组「${groupName}」`,
                                          onConfirm: () => handleDeleteGroup(groupName)
                                        });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.stopPropagation();
                                          setConfirmDialog({
                                            name: `好友分组「${groupName}」`,
                                            onConfirm: () => handleDeleteGroup(groupName)
                                          });
                                        }
                                      }}
                                      className="p-1 rounded-lg text-[#6E7C75]/60 hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
                                      title="删除此分组"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                                    isSelected
                                      ? isDarkMode ? 'bg-white/20 text-white' : 'bg-black/10 text-[#2B332E]'
                                      : isDarkMode ? 'bg-white/5 text-white/50' : 'bg-black/5 text-[#6E7C75]'
                                  }`}>
                                    {count} 人
                                  </span>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5" style={{ color: currentTheme.primary }} />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Bottom Action: Integrated Compact "+ 添加好友分组" (Never overflows) */}
                        <div className={`pt-2 mt-1.5 border-t box-border ${
                          isDarkMode ? 'border-white/10' : 'border-black/5'
                        }`}>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const val = topNavNewGroupInput.trim();
                              if (val) {
                                handleAddGroup(val);
                                setTopNavNewGroupInput('');
                                setSelectedPersonGroup(val);
                                showToast(`已新建分组「${val}」`);
                              }
                            }}
                            className="flex items-center gap-1.5 w-full box-border"
                          >
                            <input
                              type="text"
                              value={topNavNewGroupInput}
                              onChange={(e) => setTopNavNewGroupInput(e.target.value)}
                              placeholder="新建分组..."
                              className={`min-w-0 flex-1 px-2.5 py-1.5 text-xs rounded-xl border font-serif outline-none transition-all box-border ${
                                isDarkMode
                                  ? 'bg-black/25 border-white/15 text-white placeholder-white/30 focus:border-white/40'
                                  : 'bg-white/90 border-black/10 text-[#2B332E] placeholder-[#6E7C75]/60 focus:border-black/30'
                              }`}
                            />
                            <button
                              type="submit"
                              disabled={!topNavNewGroupInput.trim()}
                              className={`px-3 py-1.5 rounded-xl text-xs font-serif font-medium flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                                topNavNewGroupInput.trim()
                                  ? 'text-white active:scale-95'
                                  : 'opacity-35 cursor-not-allowed text-[#6E7C75]'
                              }`}
                              style={{
                                backgroundColor: topNavNewGroupInput.trim()
                                  ? currentTheme.primary
                                  : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                              }}
                            >
                              <Plus className="w-3 h-3" />
                              <span>添加</span>
                            </button>
                          </form>
                        </div>
                      </motion.div>
                    )}

                    {/* Level 2: Healing Palette Theme Picker Card */}
                    {topNavSubView === 'theme' && (
                      <motion.div
                        key="theme-menu"
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                        className={`absolute top-full right-0 mt-2 w-64 p-3.5 apple-liquid-glass rounded-3xl shadow-none border z-50 font-sans ${
                          isDarkMode
                            ? 'bg-[#141B18]/92 border-white/15 text-[#FAF8F5]'
                            : 'bg-white/90 border-white/80 text-[#2B332E]'
                        }`}
                      >
                        {/* Header with Back Button */}
                        <div className={`flex items-center justify-between pb-2 mb-2 border-b ${
                          isDarkMode ? 'border-white/10' : 'border-black/5'
                        }`}>
                          <button
                            onClick={() => {
                              sound.playWaterDrop(760);
                              setTopNavSubView('main');
                            }}
                            className="flex items-center gap-1 text-xs hover:underline font-serif font-semibold active:scale-95 transition-all cursor-pointer"
                            style={{ color: currentTheme.primary }}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>返回</span>
                          </button>
                          <h4 className="text-xs font-bold font-serif tracking-wide">时光色调</h4>
                          <button
                            onClick={() => setIsTopNavMenuOpen(false)}
                            className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] dark:hover:text-white rounded-full hover:bg-black/5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Theme Options */}
                        <div className="space-y-1.5">
                          {HEALING_THEMES.map(th => {
                            const isSelected = th.id === currentTheme.id;
                            const thPrimary = isDarkMode && th.dark ? th.dark.primary : th.primary;
                            const thAccent = isDarkMode && th.dark ? th.dark.accent : th.accent;

                            return (
                              <button
                                key={th.id}
                                onClick={() => {
                                  handleSelectTheme(th.id);
                                  setIsTopNavMenuOpen(false);
                                }}
                                className={`w-full p-2 rounded-2xl flex items-center justify-between border transition-all text-left cursor-pointer ${
                                  isSelected
                                    ? isDarkMode
                                      ? 'border-white/30 bg-white/15 shadow-none font-semibold text-white'
                                      : 'border-[#5B7B6D]/40 bg-black/5 shadow-none font-semibold text-[#2B332E]'
                                    : isDarkMode
                                      ? 'border-transparent hover:bg-white/5 text-white/80'
                                      : 'border-transparent hover:bg-black/[0.03] text-[#526058]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="flex items-center -space-x-1">
                                    <div
                                      className="w-4 h-4 rounded-full border border-white/60 shadow-2xs"
                                      style={{ backgroundColor: thPrimary }}
                                    />
                                    <div
                                      className="w-4 h-4 rounded-full border border-white/60 shadow-2xs"
                                      style={{ backgroundColor: thAccent }}
                                    />
                                  </div>
                                  <div>
                                    <div className="text-xs flex items-center gap-1 font-serif">
                                      <span>{th.name}</span>
                                      <span className="text-[9px] opacity-60 font-mono">({th.enName})</span>
                                    </div>
                                    <div className="text-[9px] opacity-70 font-serif leading-tight mt-0.5">
                                      {th.quote}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: currentTheme.primary }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Level 2: Settings Sub-Options Menu */}
                    {topNavSubView === 'settings' && (
                      <motion.div
                        key="settings-menu"
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                        className={`absolute top-full right-0 mt-2 w-64 p-3.5 apple-liquid-glass rounded-3xl shadow-none border z-50 font-sans ${
                          isDarkMode
                            ? 'bg-[#141B18]/92 border-white/15 text-[#FAF8F5]'
                            : 'bg-white/90 border-white/85 text-[#2B332E]'
                        }`}
                      >
                        {/* Header with Back Button */}
                        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-black/5">
                          <button
                            onClick={() => {
                              sound.playWaterDrop(760);
                              setTopNavSubView('main');
                            }}
                            className="flex items-center gap-1 text-xs hover:underline font-serif font-semibold active:scale-95 transition-all"
                            style={{ color: currentTheme.primaryDark }}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>返回</span>
                          </button>
                          <h4 className="text-xs font-bold text-[#2B332E] font-serif">偏好与设置</h4>
                          <button
                            onClick={() => setIsTopNavMenuOpen(false)}
                            className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] rounded-full hover:bg-black/5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Settings Sub-Items */}
                        <div className="space-y-1.5">
                          {/* Sub 1: 离线档案备份与恢复 */}
                          <button
                            onClick={() => {
                              sound.playWaterDrop(880);
                              setTopNavSubView('backup');
                            }}
                            className="w-full p-2.5 rounded-2xl flex items-center justify-between hover:bg-white/80 active:bg-white transition-all text-left group border border-transparent hover:border-white/60"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                                style={{ backgroundColor: `${currentTheme.primary}18`, color: currentTheme.primaryDark }}
                              >
                                <Database className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-serif font-medium text-[#2B332E] truncate">离线档案备份</div>
                                <div className="text-[10px] text-[#6E7C75] truncate">JSON 导入导出全量备份</div>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-[#6E7C75]/60 group-hover:text-[#2B332E] shrink-0 ml-1" />
                          </button>

                          {/* Sub 2: 朗读者音色 */}
                          <button
                            onClick={() => {
                              sound.playWaterDrop(880);
                              setTopNavSubView('voice');
                            }}
                            className="w-full p-2.5 rounded-2xl flex items-center justify-between hover:bg-white/80 active:bg-white transition-all text-left group border border-transparent hover:border-white/60"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                                style={{ backgroundColor: `${currentTheme.primary}18`, color: currentTheme.primaryDark }}
                              >
                                <Headphones className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-serif font-medium text-[#2B332E] truncate">朗读者音色</div>
                                <div className="text-[10px] text-[#6E7C75] truncate">
                                  {TTS_VOICES.find(v => v.id === ttsSelectedVoice)?.name || '素问'} · 情感朗诵
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-[#6E7C75]/60 group-hover:text-[#2B332E] shrink-0 ml-1" />
                          </button>

                          {/* Sub 3: 空间安全口令 */}
                          <button
                            onClick={() => {
                              sound.playWaterDrop(880);
                              setTopNavSubView('security');
                            }}
                            className="w-full p-2.5 rounded-2xl flex items-center justify-between hover:bg-white/80 active:bg-white transition-all text-left group border border-transparent hover:border-white/60"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                                style={{ backgroundColor: `${currentTheme.primary}18`, color: currentTheme.primaryDark }}
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-serif font-medium text-[#2B332E] truncate">空间访问口令</div>
                                <div className="text-[10px] text-[#6E7C75] truncate">修改 4 位锁屏加密口令</div>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-[#6E7C75]/60 group-hover:text-[#2B332E] shrink-0 ml-1" />
                          </button>

                          {/* Sub 4: AI 智能引擎 */}
                          <button
                            onClick={() => {
                              sound.playWaterDrop(880);
                              setTopNavSubView('ai');
                            }}
                            className="w-full p-2.5 rounded-2xl flex items-center justify-between hover:bg-white/80 active:bg-white transition-all text-left group border border-transparent hover:border-white/60"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                                style={{ backgroundColor: `${currentTheme.primary}18`, color: currentTheme.primaryDark }}
                              >
                                <Cpu className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-serif font-medium text-[#2B332E] truncate">AI 智能引擎</div>
                                <div className="text-[10px] text-[#6E7C75] truncate">
                                  {aiEngine === 'deepseek' ? 'DeepSeek 引擎' : '标准 AI 模型'}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-[#6E7C75]/60 group-hover:text-[#2B332E] shrink-0 ml-1" />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Level 3: 离线档案备份与恢复 Sub-Card */}
                    {topNavSubView === 'backup' && (
                      <motion.div
                        key="backup-card"
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                        className={`absolute top-full right-0 mt-2 w-64 p-3.5 apple-liquid-glass rounded-3xl shadow-none border z-50 font-sans space-y-2.5 ${
                          isDarkMode
                            ? 'bg-[#141B18]/92 border-white/15 text-[#FAF8F5]'
                            : 'bg-white/90 border-white/85 text-[#2B332E]'
                        }`}
                      >
                        {/* Header */}
                        <div className={`flex items-center justify-between pb-2 border-b ${
                          isDarkMode ? 'border-white/10' : 'border-black/5'
                        }`}>
                          <button
                            onClick={() => {
                              sound.playWaterDrop(760);
                              setTopNavSubView('settings');
                            }}
                            className="flex items-center gap-1 text-xs hover:underline font-serif font-semibold active:scale-95 transition-all cursor-pointer"
                            style={{ color: currentTheme.primary }}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>返回设置</span>
                          </button>
                          <h4 className="text-xs font-bold font-serif">离线档案备份</h4>
                          <button
                            onClick={() => setIsTopNavMenuOpen(false)}
                            className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] dark:hover:text-white rounded-full hover:bg-black/5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Summary Badge */}
                        <div className={`p-2 rounded-2xl border flex items-center justify-between text-[11px] ${
                          isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/70 border-[#5B7B6D]/15'
                        }`}>
                          <span className="opacity-75 font-serif">时光记忆存档</span>
                          <span className="font-bold font-mono">
                            共 {data.timeline.length + data.people.length + data.stories.length + data.artifacts.length + data.letters.length} 项
                          </span>
                        </div>

                        {/* Export Action: Clean ZIP Archive Package */}
                        <button
                          type="button"
                          onClick={() => {
                            handleDownloadBackup();
                            setIsTopNavMenuOpen(false);
                          }}
                          className="w-full py-2.5 px-3 text-white font-serif font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                          style={{ backgroundColor: currentTheme.primary }}
                        >
                          <Download className="w-4 h-4" />
                          <span>导出ZIP离线备份包</span>
                        </button>

                        {/* Import Dropzone (.zip) */}
                        <div className={`p-3 rounded-2xl border border-dashed text-center relative transition-colors cursor-pointer ${
                          isDarkMode
                            ? 'bg-white/5 border-white/20 hover:border-white/40'
                            : 'bg-white/80 border-[#5B7B6D]/25 hover:border-[#5B7B6D]/50'
                        }`}>
                          <input
                            type="file"
                            accept=".zip,.json,application/zip,application/json"
                            onChange={(e) => {
                              handleImport(e);
                              setIsTopNavMenuOpen(false);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="w-4 h-4 mx-auto mb-1" style={{ color: currentTheme.primary }} />
                          <div className="text-xs font-bold font-serif">导入还原备份档案</div>
                          <div className="text-[10px] opacity-70 mt-0.5 font-serif">支持选取或拖入 .zip 压缩包</div>
                        </div>
                      </motion.div>
                    )}

                    {/* Level 3: 朗读者音色选择 Sub-Card */}
                    {topNavSubView === 'voice' && (
                      <motion.div
                        key="voice-card"
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                        className={`absolute top-full right-0 mt-2 w-72 max-h-[78vh] flex flex-col p-3.5 apple-liquid-glass rounded-3xl shadow-none border z-50 font-sans ${
                          isDarkMode
                            ? 'bg-[#141B18]/92 border-white/15 text-[#FAF8F5]'
                            : 'bg-white/90 border-white/85 text-[#2B332E]'
                        }`}
                      >
                        {/* Header */}
                        <div className={`flex items-center justify-between pb-2 border-b shrink-0 ${
                          isDarkMode ? 'border-white/10' : 'border-black/5'
                        }`}>
                          <button
                            onClick={() => {
                              sound.playWaterDrop(760);
                              setTopNavSubView('settings');
                            }}
                            className="flex items-center gap-1 text-xs hover:underline font-serif font-semibold active:scale-95 transition-all cursor-pointer"
                            style={{ color: currentTheme.primary }}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>返回设置</span>
                          </button>
                          <h4 className="text-xs font-bold font-serif">朗读者音色</h4>
                          <button
                            onClick={() => setIsTopNavMenuOpen(false)}
                            className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] dark:hover:text-white rounded-full hover:bg-black/5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Gender Filter Tabs */}
                        <div className="flex gap-1 my-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl shrink-0">
                          {(['all', '女声', '男声'] as const).map(g => (
                            <button
                              key={g}
                              onClick={() => setVoiceFilterGender(g)}
                              className={`flex-1 py-1 rounded-lg text-[11px] font-serif font-medium transition-all cursor-pointer ${
                                voiceFilterGender === g
                                  ? 'bg-white dark:bg-white/20 text-[#2B332E] dark:text-white shadow-none font-bold'
                                  : 'text-[#6E7C75] dark:text-white/60 hover:text-[#2B332E] dark:hover:text-white'
                              }`}
                            >
                              {g === 'all' ? '全部' : g}
                            </button>
                          ))}
                        </div>

                        {/* Scrollable Voice Cards */}
                        <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5 custom-scrollbar">
                          {TTS_VOICES
                            .filter(v => voiceFilterGender === 'all' || v.gender === voiceFilterGender)
                            .map(v => {
                              const isSelected = ttsSelectedVoice === v.id;
                              const isPreviewing = previewingVoiceId === v.id;

                              return (
                                <div
                                  key={v.id}
                                  onClick={() => {
                                    setTtsSelectedVoice(v.id);
                                    localStorage.setItem('shinian_tts_voice', v.id);
                                    showToast(`已选用朗诵音色：${v.name}`);
                                  }}
                                  className={`p-2.5 rounded-2xl border transition-all text-left cursor-pointer ${
                                    isSelected
                                      ? isDarkMode
                                        ? 'bg-white/15 border-white/30 shadow-none'
                                        : 'bg-white/90 border-[#5B7B6D] shadow-none'
                                      : isDarkMode
                                        ? 'bg-white/5 border-transparent hover:bg-white/10'
                                        : 'bg-white/50 border-transparent hover:bg-white/70'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="font-serif font-bold text-xs truncate">{v.name}</span>
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-black/5 dark:bg-white/10 font-sans shrink-0 opacity-75">
                                        {v.gender}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePreviewVoice(v);
                                      }}
                                      disabled={isTtsGenerating}
                                      className="text-[10px] px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-[#5B7B6D] hover:text-white transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                    >
                                      <Play className="w-2.5 h-2.5" />
                                      <span>{isPreviewing ? '播放中' : '试听'}</span>
                                    </button>
                                  </div>
                                  <p className="text-[10px] opacity-75 font-serif line-clamp-1 mt-1 leading-tight">
                                    {v.character}
                                  </p>
                                </div>
                              );
                            })}
                        </div>
                      </motion.div>
                    )}

                    {/* Level 3: 空间访问口令 Sub-Card */}
                    {topNavSubView === 'security' && (
                      <motion.div
                        key="security-card"
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                        className={`absolute top-full right-0 mt-2 w-72 p-4 apple-liquid-glass rounded-3xl shadow-none border z-50 font-sans space-y-3 ${
                          isDarkMode
                            ? 'bg-[#141B18]/92 border-white/15 text-[#FAF8F5]'
                            : 'bg-white/90 border-white/85 text-[#2B332E]'
                        }`}
                      >
                        {/* Header */}
                        <div className={`flex items-center justify-between pb-2 border-b ${
                          isDarkMode ? 'border-white/10' : 'border-black/5'
                        }`}>
                          <button
                            onClick={() => {
                              sound.playWaterDrop(760);
                              setTopNavSubView('settings');
                            }}
                            className="flex items-center gap-1 text-xs hover:underline font-serif font-semibold active:scale-95 transition-all cursor-pointer"
                            style={{ color: currentTheme.primary }}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>返回设置</span>
                          </button>
                          <h4 className="text-xs font-bold font-serif">修改访问口令</h4>
                          <button
                            onClick={() => setIsTopNavMenuOpen(false)}
                            className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] dark:hover:text-white rounded-full hover:bg-black/5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <form onSubmit={(e) => {
                          handleChangePassword(e);
                          setIsTopNavMenuOpen(false);
                        }} className="space-y-2.5 text-xs">
                          <div>
                            <label className="text-[10px] opacity-75 block mb-1 font-serif">当前原口令：</label>
                            <input
                              type="password"
                              required
                              value={oldPinInput}
                              onChange={(e) => setOldPinInput(e.target.value)}
                              placeholder="默认 1234"
                              className={`w-full p-2 rounded-xl border focus:outline-none font-mono text-xs ${
                                isDarkMode ? 'bg-black/30 border-white/15 text-white' : 'bg-white/90 border-[#5B7B6D]/20 text-[#2B332E]'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="text-[10px] opacity-75 block mb-1 font-serif">设置新口令：</label>
                            <input
                              type="password"
                              required
                              value={newPinInput}
                              onChange={(e) => setNewPinInput(e.target.value)}
                              placeholder="至少 4 位"
                              className={`w-full p-2 rounded-xl border focus:outline-none font-mono text-xs ${
                                isDarkMode ? 'bg-black/30 border-white/15 text-white' : 'bg-white/90 border-[#5B7B6D]/20 text-[#2B332E]'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="text-[10px] opacity-75 block mb-1 font-serif">确认新口令：</label>
                            <input
                              type="password"
                              required
                              value={confirmPinInput}
                              onChange={(e) => setConfirmPinInput(e.target.value)}
                              placeholder="再次输入"
                              className={`w-full p-2 rounded-xl border focus:outline-none font-mono text-xs ${
                                isDarkMode ? 'bg-black/30 border-white/15 text-white' : 'bg-white/90 border-[#5B7B6D]/20 text-[#2B332E]'
                              }`}
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 text-white font-serif font-bold rounded-xl shadow-none transition-all active:scale-95 cursor-pointer"
                            style={{ backgroundColor: currentTheme.primary }}
                          >
                            保存新口令
                          </button>
                        </form>
                      </motion.div>
                    )}

                    {/* Level 3: AI 智能引擎 Sub-Card */}
                    {topNavSubView === 'ai' && (
                      <motion.div
                        key="ai-card"
                        initial={{ opacity: 0, scale: 0.94, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                        className={`absolute top-full right-0 mt-2 w-72 p-4 apple-liquid-glass rounded-3xl shadow-none border z-50 font-sans space-y-3 ${
                          isDarkMode
                            ? 'bg-[#141B18]/92 border-white/15 text-[#FAF8F5]'
                            : 'bg-white/90 border-white/85 text-[#2B332E]'
                        }`}
                      >
                        {/* Header */}
                        <div className={`flex items-center justify-between pb-2 border-b ${
                          isDarkMode ? 'border-white/10' : 'border-black/5'
                        }`}>
                          <button
                            onClick={() => {
                              sound.playWaterDrop(760);
                              setTopNavSubView('settings');
                            }}
                            className="flex items-center gap-1 text-xs hover:underline font-serif font-semibold active:scale-95 transition-all cursor-pointer"
                            style={{ color: currentTheme.primary }}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>返回设置</span>
                          </button>
                          <h4 className="text-xs font-bold font-serif">AI 智能引擎</h4>
                          <button
                            onClick={() => setIsTopNavMenuOpen(false)}
                            className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] dark:hover:text-white rounded-full hover:bg-black/5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Radios */}
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAiEngine('gemini');
                              localStorage.setItem('shinian_ai_engine', 'gemini');
                              showToast('已切换为标准 AI 模型');
                            }}
                            className={`w-full p-2.5 rounded-2xl border text-left transition-all ${
                              aiEngine === 'gemini'
                                ? 'bg-white/90 border-[#5B7B6D] shadow-xs'
                                : 'bg-white/50 border-transparent hover:bg-white/70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-serif font-bold text-xs text-[#2B332E]">⚡ 标准模型</span>
                              {aiEngine === 'gemini' && <Check className="w-3.5 h-3.5 text-[#5B7B6D]" />}
                            </div>
                            <p className="text-[10px] text-[#6E7C75] font-serif mt-0.5">内置快速响应，支持回忆对谈与识图</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAiEngine('deepseek');
                              localStorage.setItem('shinian_ai_engine', 'deepseek');
                              showToast('已切换为 DeepSeek 引擎');
                            }}
                            className={`w-full p-2.5 rounded-2xl border text-left transition-all ${
                              aiEngine === 'deepseek'
                                ? 'bg-white/90 border-[#5B7B6D] shadow-xs'
                                : 'bg-white/50 border-transparent hover:bg-white/70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-serif font-bold text-xs text-[#2B332E] dark:text-[#FAF8F5] flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-[#1D72F3] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M21.8 12.8c-.4-3.3-2.9-6-6.2-6.8-4-1-8.2.2-11 3.2-1.9 2.1-2.8 4.8-2.3 7.6.3 1.6 1.3 2.9 2.7 3.8 2.4 1.5 5.4 1.7 8 .8 3.4-1 6-3.6 7.4-6.8.3-.5.9-.8 1.5-.7.6.1 1.1.5 1.2 1.1.2 1.2.9 2.3 2 2.8.4.2 1 .1 1.3-.2.3-.3.4-.8.2-1.3-1.1-2.2-1-2.9-4.7-3.5zm-8.2-2.5c.7 0 1.3.6 1.3 1.3s-.6 1.3-1.3 1.3-1.3-.6-1.3-1.3.6-1.3 1.3-1.3z" />
                                </svg>
                                DeepSeek 引擎
                              </span>
                              {aiEngine === 'deepseek' && <Check className="w-3.5 h-3.5 text-[#5B7B6D]" />}
                            </div>
                            <p className="text-[10px] text-[#6E7C75] font-serif mt-0.5">DeepSeek-V3 深度文本推理</p>
                          </button>
                        </div>

                        {/* Gemini / Standard API Key Input */}
                        {aiEngine === 'gemini' && (
                          <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-black/40 border border-[#5B7B6D]/20 dark:border-white/15 space-y-1">
                            <label className="text-[10px] font-bold block opacity-90">Gemini API 密钥（选填）：</label>
                            <input
                              type="password"
                              value={aiApiKey}
                              onChange={(e) => {
                                setAiApiKey(e.target.value);
                                localStorage.setItem('shinian_gemini_key', e.target.value);
                              }}
                              placeholder="AIzaSy..."
                              className="w-full p-2 rounded-xl border border-[#5B7B6D]/20 dark:border-white/15 bg-[#FAF8F5] dark:bg-black/30 focus:outline-none font-mono text-[10px]"
                            />
                          </div>
                        )}

                        {/* DeepSeek API Key Input */}
                        {aiEngine === 'deepseek' && (
                          <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-black/40 border border-[#5B7B6D]/20 dark:border-white/15 space-y-1">
                            <label className="text-[10px] font-bold block opacity-90">DeepSeek API 密钥：</label>
                            <input
                              type="password"
                              value={deepSeekKey}
                              onChange={(e) => {
                                setDeepSeekKey(e.target.value);
                                localStorage.setItem('shinian_deepseek_key', e.target.value);
                              }}
                              placeholder="sk-..."
                              className="w-full p-2 rounded-xl border border-[#5B7B6D]/20 dark:border-white/15 bg-[#FAF8F5] dark:bg-black/30 focus:outline-none font-mono text-[10px]"
                            />
                          </div>
                        )}

                        {/* Custom API Server Base URL */}
                        <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-black/40 border border-[#5B7B6D]/20 dark:border-white/15 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold block opacity-90">云端服务节点：</label>
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.removeItem('shinian_api_server_url');
                                showToast('已恢复预设官方云端节点');
                              }}
                              className="text-[9px] text-[#5B7B6D] dark:text-[#A0B0A7] hover:underline cursor-pointer"
                            >
                              恢复预设
                            </button>
                          </div>
                          <input
                            type="text"
                            defaultValue={localStorage.getItem('shinian_api_server_url') || ''}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val) {
                                localStorage.setItem('shinian_api_server_url', val);
                                showToast('已保存云端服务节点');
                              } else {
                                localStorage.removeItem('shinian_api_server_url');
                              }
                            }}
                            placeholder="默认已预设官方云端解析节点"
                            className="w-full p-2 rounded-xl border border-[#5B7B6D]/20 dark:border-white/15 bg-[#FAF8F5] dark:bg-black/30 focus:outline-none font-mono text-[10px]"
                          />
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

        {/* Refactored Literary Paper Themed Toast Notification */}
        <ThemedToast toast={toast} theme={currentTheme} isDarkMode={isDarkMode} />

        {/* Floating Audio Player Bar */}
        {audioPlayingUrl && (
          <div className="absolute top-[68px] sm:top-[72px] left-3.5 right-3.5 sm:left-4 sm:right-4 apple-liquid-glass rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs text-[#2B332E] animate-fadeIn z-25 shadow-md border border-white/80">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <div className="w-7 h-7 rounded-full bg-[#FDF0EB] border border-[#E88765]/30 flex items-center justify-center text-[#E88765] shrink-0">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#3E564B] text-[11px] truncate font-serif">
                    {audioPlayingVoiceName || 'AI 情感朗读'}
                  </span>
                  <button
                    onClick={() => setIsVoicePickerModalOpen(true)}
                    className="text-[10px] text-[#E88765] hover:underline font-sans whitespace-nowrap"
                  >
                    换音色
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <audio
                src={audioPlayingUrl}
                autoPlay
                controls
                className="h-7 w-32 xs:w-40 sm:w-48"
                onEnded={() => {
                  setAudioPlayingUrl(null);
                  setAudioPlayingVoiceName('');
                }}
              />
              <button
                onClick={() => {
                  handleStopTts();
                }}
                className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] hover:bg-stone-200/50 rounded-lg transition-colors"
                title="关闭音频"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area: Elevated layer above ambient glow with robust CSS clearance for floating island */}
        <main ref={mainContentRef} id="main-content-scroll" className="flex-1 overflow-y-auto custom-scrollbar p-4 main-content-clearance pb-28 sm:pb-32 space-y-4 overscroll-contain relative z-10">

          {/* Home Tab */}
          {activeTab === 'home' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-4"
            >
              {/* Today's Memory / Featured Spotlight Card (Classic Polaroid with Soft Floating & Shimmer Animation) */}
              {todayHighlight ? (
                <div className={`p-4.5 sm:p-5 rounded-3xl border relative overflow-hidden transition-all duration-300 animate-float-card group ${
                  isDarkMode
                    ? 'bg-[#161D19]/90 border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-white/25 text-[#FAF8F5]'
                    : 'bg-white border-[#5B7B6D]/20 shadow-md hover:shadow-xl hover:border-[#E88765]/40 text-[#2B332E]'
                }`}>
                  {/* Subtle Polaroid Ambient Shimmer */}
                  <div className="polaroid-shimmer" />

                  {/* Top Status & Date Info Bar */}
                  <div className="flex items-center justify-between text-xs font-bold mb-3 font-serif relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#FDF0EB] border border-[#E88765]/30 text-[#E88765] flex items-center justify-center shadow-2xs">
                        <Hourglass className="w-3.5 h-3.5 text-[#E88765]" />
                      </div>
                      <div>
                        <span className={`font-bold text-xs tracking-wide ${isDarkMode ? 'text-[#FAF8F5]' : 'text-[#2B332E]'}`}>今日回顾</span>
                        <span className={`text-[11px] ml-1.5 font-mono font-normal ${isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'}`}>· {todayHighlight.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FDF0EB] text-[#E88765] border border-[#E88765]/30 text-[10px] font-sans font-semibold">
                        {todayHighlight.tag}
                      </span>
                      {data.timeline.length > 1 && (
                        <button
                          onClick={() => {
                            setHighlightIndex(prev => {
                              const len = data.timeline.length;
                              if (len <= 1) return prev;
                              let next = Math.floor(Math.random() * len);
                              if (next === Math.abs(prev) % len) {
                                next = (next + 1) % len;
                              }
                              return next;
                            });
                          }}
                          title="换一段回忆"
                          className={`p-1.5 rounded-full border transition-all shadow-2xs active:scale-95 ${
                            isDarkMode
                              ? 'bg-[#222B26] border-white/15 text-[#A0B0A7] hover:text-[#FAF8F5]'
                              : 'bg-[#FAF8F5] hover:bg-[#F2EFE9] border-[#5B7B6D]/15 text-[#6E7C75] hover:text-[#2B332E]'
                          }`}
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Highlight Story Body */}
                  <div className="relative z-10">
                    <h2 className={`text-base sm:text-lg font-bold mb-2 font-serif transition-colors leading-snug ${
                      isDarkMode ? 'text-[#FAF8F5] group-hover:text-amber-200' : 'text-[#2B332E] group-hover:text-[#5B7B6D]'
                    }`}>
                      {todayHighlight.title}
                    </h2>
                    <p className={`text-xs line-clamp-3 leading-relaxed mb-3.5 font-serif ${
                      isDarkMode ? 'text-[#C2CDC7]' : 'text-[#526058]'
                    }`}>
                      {todayHighlight.content}
                    </p>

                    {/* Classic Polaroid Styled Media Frame (Photo or Video) */}
                    {(todayHighlight.image || todayHighlight.video) && (() => {
                      const isVideo = Boolean(todayHighlight.video || (todayHighlight.image && isVideoMedia(todayHighlight.image)));
                      const videoSrc = todayHighlight.video || (isVideo ? todayHighlight.image : undefined);

                      return (
                        <div className={`p-2 border rounded-2xl mb-3.5 shadow-xs transition-transform duration-300 group-hover:scale-[1.01] ${
                          isDarkMode ? 'bg-[#1C2621] border-white/10' : 'bg-[#FAF8F5] border-[#5B7B6D]/15'
                        }`}>
                          {isVideo && videoSrc ? (
                            <div className="rounded-xl overflow-hidden border border-black/10 shadow-sm">
                              <TimelineVideoCard
                                videoUrl={videoSrc}
                                poster={todayHighlight.videoPoster}
                                title={todayHighlight.title}
                                date={todayHighlight.date}
                              />
                            </div>
                          ) : todayHighlight.image ? (
                            <div className="h-44 sm:h-48 w-full rounded-xl overflow-hidden relative">
                              <img
                                src={todayHighlight.image}
                                alt={todayHighlight.title || 'cover'}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}

                    {/* Card Footer Actions & Location */}
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] border-t pt-3 ${
                      isDarkMode ? 'border-white/10 text-[#A0B0A7]' : 'border-[#F2EFE9] text-[#6E7C75]'
                    }`}>
                      <div className="flex items-center gap-1.5 font-sans min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                        <span className="truncate">{todayHighlight.location || '离线记忆'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                        <button
                          type="button"
                          onClick={() => handlePlayTts(todayHighlight.content)}
                          disabled={isTtsGenerating}
                          className={`px-3 py-1.5 rounded-full border font-medium flex items-center gap-1.5 transition-all text-xs active:scale-95 shadow-2xs whitespace-nowrap ${
                            isDarkMode
                              ? 'bg-[#222B26] hover:bg-[#2A3630] border-white/15 text-[#FAF8F5]'
                              : 'bg-[#FAF8F5] hover:bg-[#F2EFE9] border-[#5B7B6D]/20 text-[#2B332E]'
                          }`}
                        >
                          <Volume2 className={`w-3.5 h-3.5 text-[#E88765] shrink-0 ${isTtsGenerating ? 'animate-bounce' : ''}`} />
                          <span>{isTtsGenerating ? '准备语音...' : '听回忆'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('timeline')}
                          className="px-3 py-1.5 rounded-full bg-[#5B7B6D] text-white font-bold text-xs shadow-sm hover:bg-[#3E564B] transition-all active:scale-95 flex items-center gap-1 whitespace-nowrap"
                        >
                          <span>展开拾光轴</span>
                          <ChevronRight className="w-3 h-3 shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-6 rounded-2xl border border-dashed text-center space-y-2 ${
                  isDarkMode ? 'bg-[#161D19]/90 border-white/15 text-[#FAF8F5]' : 'bg-white border-[#5B7B6D]/20'
                }`}>
                  <p className={`text-xs font-serif leading-relaxed ${isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'}`}>
                    暂无拾光节点，点击下方「拾光轴」开启你的十年记录
                  </p>
                  <button
                    onClick={() => setActiveModal('addTimeline')}
                    className="text-xs px-3.5 py-1.5 bg-[#5B7B6D] text-white rounded-xl hover:bg-[#3E564B] font-medium shadow-2xs"
                  >
                    新建第一条记忆
                  </button>
                </div>
              )}

              {/* Four Core Entry Cards (Bento 2x2) */}
              <div className="grid grid-cols-2 gap-3">
                <EntranceCard
                  title="拾光轴"
                  subtitle="时光流转的痕迹"
                  icon={Clock}
                  count={data.timeline.length}
                  unit="条记录"
                  onClick={() => setActiveTab('timeline')}
                  isDarkMode={isDarkMode}
                />
                <EntranceCard
                  title="拾人册"
                  subtitle="重要人物成长档案"
                  icon={Users}
                  count={data.people.length}
                  unit="位挚友"
                  onClick={() => {
                    setSelectedPerson(null);
                    setActiveTab('people');
                  }}
                  isDarkMode={isDarkMode}
                />
                <EntranceCard
                  title="拾忆篇"
                  subtitle="长篇章节沉浸阅读"
                  icon={BookOpen}
                  count={data.stories.length}
                  unit="篇长章"
                  onClick={() => {
                    setReaderStory(null);
                    setActiveTab('stories');
                  }}
                  isDarkMode={isDarkMode}
                />
                <EntranceCard
                  title="拾物阁"
                  subtitle="旧物与背后的故事"
                  icon={Package}
                  count={data.artifacts.length}
                  unit="件藏品"
                  onClick={() => setActiveTab('artifacts')}
                  isDarkMode={isDarkMode}
                />
              </div>

              {/* Time Capsule Entry Banner - Japanese Indie Capsule Design */}
              <div 
                onClick={() => setActiveTab('letters')}
                className={`group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer overflow-hidden flex items-center justify-between ${
                  isDarkMode
                    ? 'bg-[#161D19]/90 border-white/12 hover:border-white/25 text-[#FAF8F5] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                    : 'bg-white border-[#5B7B6D]/15 hover:border-[#E88765]/40 shadow-sm'
                }`}
              >
                {/* Decorative retro stamp & background texture accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#E88765]/10 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-3 right-4 opacity-15 group-hover:opacity-30 transition-opacity font-mono text-[10px] text-[#5B7B6D] tracking-widest uppercase select-none">
                  TIME CAPSULE · 封
                </div>

                <div className="flex items-center gap-3.5 min-w-0 flex-1 relative z-10">
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs transition-colors ${
                    isDarkMode
                      ? 'bg-[#222B26] border-white/15 text-[#E88765]'
                      : 'bg-[#F2EFE9] group-hover:bg-[#FDF0EB] text-[#5B7B6D] group-hover:text-[#E88765] border-[#5B7B6D]/15'
                  }`}>
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm sm:text-base font-bold font-serif group-hover:text-[#E88765] transition-colors ${
                        isDarkMode ? 'text-[#FAF8F5]' : 'text-[#2B332E]'
                      }`}>
                        寄年 · 时光胶囊
                      </h4>
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#E88765] font-sans">
                        {data.letters.length} 封信件
                      </span>
                    </div>
                    <p className={`text-[11px] sm:text-xs font-sans leading-relaxed line-clamp-1 ${
                      isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'
                    }`}>
                      寄给未来的信，写给岁月深处的微光与期许
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-[#6E7C75] group-hover:text-[#E88765] group-hover:translate-x-0.5 transition-all shrink-0 ml-2 relative z-10">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Refactored "拾年 · 慢言" Floating Literary Companion Card */}
              <TimeAiCompanion
                aiEngine={aiEngine}
                onToggleEngine={() => {
                  const nextEngine = aiEngine === 'gemini' ? 'deepseek' : 'gemini';
                  setAiEngine(nextEngine);
                  localStorage.setItem('shinian_ai_engine', nextEngine);
                  showToast(nextEngine === 'deepseek' ? '已切换为 DeepSeek 引擎' : '已切换为标准 AI 模型');
                }}
                messages={aiChatMessages}
                onClearMessages={() => {
                  setAiChatMessages([{ role: 'model', text: '你好呀。我是这里的时光慢言守护者。你想聊聊哪一段封存的故事，或是哪位很久没见的朋友？' }]);
                }}
                input={aiChatInput}
                setInput={setAiChatInput}
                onSendMessage={(customPrompt) => handleSendAiMessage(customPrompt)}
                isLoading={isAiLoading}
                theme={currentTheme}
                showToast={showToast}
                onPlayTts={(text) => handlePlayTts(text)}
                isDarkMode={isDarkMode}
              />
            </motion.div>
          )}

          {/* Timeline Tab: Chrono Gallery Architecture */}
          {activeTab === 'timeline' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <ChronoGalleryTimeline
                items={data.timeline}
                selectedYear={selectedYear}
                themeColor={currentTheme.primary}
                isDarkMode={isDarkMode}
                onSelectYear={(yr) => {
                  setSelectedYear(yr);
                  if (yr === 'all') {
                    showToast('已切换至全景时光画卷');
                  } else {
                    showToast(`已定格至 ${yr} 年纪`);
                  }
                }}
                onOpenAdd={() => setActiveModal('addTimeline')}
                onPlayTts={(text) => handlePlayTts(text)}
                onDelete={(item) => requestDelete('timeline', item.id, item.title)}
                onOpenYearPicker={() => setIsYearPickerOpen(true)}
                onShare={(item) => {
                  setShareMemoirItem(item);
                  setIsShareModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {/* People List Tab: High-Aesthetic Japanese Literary Portrait Memoir Album */}
          {activeTab === 'people' && !selectedPerson && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-4"
            >
              {/* People Cards Grid - Japanese Literary Portrait Memoir Cards */}
              {filteredPeople.length === 0 ? (
                <div className="bg-white dark:bg-[#161D19]/90 p-8 rounded-3xl border border-dashed border-[#5B7B6D]/20 dark:border-white/15 text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 rounded-full bg-[#FAF8F5] dark:bg-white/10 border border-[#5B7B6D]/20 dark:border-white/15 text-[#5B7B6D] dark:text-[#A0B0A7] flex items-center justify-center mx-auto shadow-2xs">
                    <Users className="w-6 h-6" style={{ color: isDarkMode ? (currentTheme.dark?.primary || currentTheme.primary) : currentTheme.primary }} />
                  </div>
                  <h3 className="font-bold text-[#2B332E] dark:text-[#FAF8F5] text-sm font-serif">
                    {selectedPersonGroup !== 'all' ? `「${selectedPersonGroup}」分组暂无好友` : '暂无好友记录'}
                  </h3>
                  <div className="flex justify-center gap-2 pt-1 font-sans">
                    {selectedPersonGroup !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedPersonGroup('all')}
                        className="px-4 py-1.5 bg-[#F2EFE9] dark:bg-white/10 text-[#5B7B6D] dark:text-[#FAF8F5] text-xs rounded-xl font-medium shadow-2xs hover:bg-[#E8E4DC] dark:hover:bg-white/20 transition-all"
                      >
                        查看全部好友
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPersonGroup !== 'all') {
                          setFormPersonGroup(selectedPersonGroup);
                        }
                        setActiveModal('addPerson');
                      }}
                      className="px-4 py-1.5 text-white text-xs rounded-xl font-medium shadow-2xs transition-all active:scale-95"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      添加人物
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredPeople.map((person, idx) => (
                    <motion.div
                      key={person.id}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-20px' }}
                      transition={{ duration: 0.35, delay: Math.min(idx * 0.03, 0.2), ease: 'easeOut' }}
                      onClick={() => setSelectedPerson(person)}
                      className="bg-white hover:bg-white rounded-3xl p-4.5 border border-[#5B7B6D]/20 hover:border-[#5B7B6D]/50 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                    >
                      {/* Decorative corner accent stamp */}
                      <div className="absolute top-0 right-0 w-16 h-16 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#E88765]/10 via-transparent to-transparent pointer-events-none" />

                      <div>
                        {/* Top: Avatar + Identity + Actions */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative shrink-0">
                              <img
                                src={person.avatar}
                                alt={person.name}
                                className="w-13 h-13 rounded-2xl object-cover border border-[#D9CFC1] shadow-2xs group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-bold text-[#2B332E] text-base group-hover:text-[#5B7B6D] transition-colors font-serif truncate">
                                  {person.name}
                                </h3>
                                {person.relationship && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#E88765] font-medium font-sans border border-[#E88765]/20 shrink-0">
                                    {person.relationship}
                                  </span>
                                )}
                              </div>

                              {person.knownDate && calculateDaysKnown(person.knownDate) !== null ? (
                                <div className="text-[10px] text-[#5B7B6D] font-mono flex items-center gap-1 opacity-90 pt-0.5">
                                  <Calendar className="w-2.5 h-2.5 text-[#5B7B6D]" />
                                  <span>相识第 {calculateDaysKnown(person.knownDate)?.toLocaleString()} 天</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-[#6E7C75]/70 font-sans pt-0.5">
                                  拾光挚友
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDelete('people', person.id, person.name);
                              }}
                              title="删除人物"
                              className="p-1.5 text-[#6E7C75]/30 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all opacity-70 group-hover:opacity-100 shrink-0 active:scale-90"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareMemoirItem({ type: 'person', data: person });
                                setIsShareModalOpen(true);
                              }}
                              title="生成知交肖像画报分享"
                              className="p-1.5 text-[#5B7B6D] hover:text-[#E88765] rounded-xl hover:bg-[#5B7B6D]/10 transition-all opacity-70 group-hover:opacity-100 shrink-0 active:scale-90"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Middle: Poetic Memoir Snippet */}
                        <div className="my-2.5 bg-[#FAF8F5]/85 p-2.5 rounded-xl border border-[#5B7B6D]/10 group-hover:border-[#5B7B6D]/20 transition-colors">
                          <p className="text-xs text-[#526058] font-serif leading-relaxed italic line-clamp-2">
                            {person.bio ? `「${person.bio}」` : '「同行的回忆，是岁月写下的诗行」'}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Footer: Minimal Meta & Page Turn Hint */}
                      <div className="flex items-center justify-between text-[11px] text-[#6E7C75]/75 font-sans pt-1 border-t border-[#F2EFE9]">
                        <div className="flex items-center gap-2 min-w-0">
                          {person.birthday && person.birthday !== '未填写' && (
                            <span className="flex items-center gap-1 truncate text-[10px]">
                              🎂 {person.birthday}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-[#5B7B6D] font-medium flex items-center gap-0.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0">
                          <span>翻看手账</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Selected Person Detailed Archive View - Curated Japanese Indie Profile Journal */}
          {activeTab === 'people' && selectedPerson && !readerStory && (
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -22 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Header Navigation */}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setSelectedPerson(null)}
                  className="text-xs text-[#526058] flex items-center gap-1.5 hover:text-[#5B7B6D] font-medium bg-white px-3 py-1.5 rounded-xl border border-[#5B7B6D]/15 shadow-2xs active:scale-95 transition-all"
                >
                  ← 返回人物册
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPersonBirthday(selectedPerson.birthday !== '未填写' ? selectedPerson.birthday : '');
                      setEditPersonKnownDate(selectedPerson.knownDate || '2021-09-01');
                      setEditPersonRel(selectedPerson.relationship || '挚友');
                      setEditPersonGroup(selectedPerson.group || '未分组');
                      setEditPersonAvatar(selectedPerson.avatar || '');
                      setIsEditingPerson(true);
                    }}
                    className="text-xs text-[#5B7B6D] hover:text-[#3E564B] flex items-center gap-1 font-medium bg-white px-3 py-1.5 rounded-xl border border-[#5B7B6D]/20 shadow-2xs hover:bg-[#FAF8F5] transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> 编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      requestDelete('people', selectedPerson.id, selectedPerson.name);
                    }}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50/80 px-2.5 py-1.5 rounded-xl border border-red-200/70 hover:bg-red-100 transition-all"
                    title="删除人物"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShareMemoirItem({ type: 'person', data: selectedPerson });
                      setIsShareModalOpen(true);
                    }}
                    className="text-xs text-[#5B7B6D] hover:text-[#3E564B] flex items-center gap-1 font-medium bg-white px-3 py-1.5 rounded-xl border border-[#5B7B6D]/20 shadow-2xs hover:bg-[#FAF8F5] transition-all"
                    title="生成人物肖像画报"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#E88765]" /> 分享
                  </button>
                </div>
              </div>

              {/* Profile Card - Minimalist Japanese Journal Layout */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#D9CFC1] shadow-2xs space-y-6 relative overflow-hidden">
                {/* Subtle corner watermark */}
                <div className="absolute top-4 right-4 text-[10px] font-mono text-[#5B7B6D]/40 uppercase tracking-widest pointer-events-none select-none">
                  MEMOIR · 拾人
                </div>

                {/* Hero Avatar & Identity Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
                  <div className="relative shrink-0">
                    <img 
                      src={selectedPerson.avatar} 
                      alt={selectedPerson.name} 
                      className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl object-cover border-2 border-[#E88765]/30 shadow-xs" 
                    />
                  </div>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-[#2B332E] font-serif tracking-wide">{selectedPerson.name}</h2>
                      {selectedPerson.relationship && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FAF6F0] text-[#E88765] font-medium border border-[#E88765]/25 font-sans">
                          {selectedPerson.relationship}
                        </span>
                      )}
                      {selectedPerson.group && selectedPerson.group !== '未分组' && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D] font-medium border border-[#5B7B6D]/20 font-sans">
                          {selectedPerson.group}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#526058] leading-relaxed font-serif max-w-md">
                      {selectedPerson.bio || '记录在时光册里的同路人'}
                    </p>

                    {selectedPerson.knownDate && calculateDaysKnown(selectedPerson.knownDate) !== null && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FDF0EB]/80 text-[#E88765] rounded-full text-[11px] font-semibold border border-[#E88765]/25 font-sans">
                        <Calendar className="w-3.5 h-3.5 text-[#E88765]" />
                        <span>相识于 {selectedPerson.knownDate} · 第 <strong>{calculateDaysKnown(selectedPerson.knownDate)?.toLocaleString()}</strong> 天</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtle Divider */}
                <div className="h-px bg-[#F2EFE9] w-full" />

                {/* Clean 2-Column Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                  {/* 好友生日 */}
                  {selectedPerson.birthday && (
                    <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#5B7B6D]/10 flex items-center gap-3">
                      <span className="text-base p-2 rounded-xl bg-white border border-[#5B7B6D]/10 shrink-0">🎂</span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-[#6E7C75] block">好友生日</span>
                        <span className="font-semibold text-[#2B332E] block truncate">
                          {selectedPerson.birthday || '未填生日'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 初识地点 */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#5B7B6D]/10 flex items-center gap-3">
                    <span className="text-base p-2 rounded-xl bg-white border border-[#5B7B6D]/10 shrink-0">📍</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[#6E7C75] block">初识地点</span>
                      <span className="font-semibold text-[#2B332E] block truncate">
                        {selectedPerson.customFields?.['认识地点'] || '时光长廊'}
                      </span>
                    </div>
                  </div>

                  {/* 喜欢的颜色 */}
                  {selectedPerson.color && (
                    <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#5B7B6D]/10 flex items-center gap-3">
                      <span className="text-base p-2 rounded-xl bg-white border border-[#5B7B6D]/10 shrink-0">🎨</span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-[#6E7C75] block">喜欢的颜色</span>
                        <span className="font-semibold text-[#2B332E] block truncate">{selectedPerson.color}</span>
                      </div>
                    </div>
                  )}

                  {/* 爱好 */}
                  {selectedPerson.hobbies && (
                    <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#5B7B6D]/10 flex items-center gap-3">
                      <span className="text-base p-2 rounded-xl bg-white border border-[#5B7B6D]/10 shrink-0">⚽</span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-[#6E7C75] block">兴趣爱好</span>
                        <span className="font-semibold text-[#2B332E] block truncate">{selectedPerson.hobbies}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Drawer / Bar */}
                {(selectedPerson.wechat || selectedPerson.qq || selectedPerson.phone) && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-[#5B7B6D] font-serif flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-[#5B7B6D]" /> 联络信息
                      </span>
                      <span className="text-[10px] text-[#6E7C75]">轻触快速复制</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-sans">
                      {selectedPerson.wechat && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(selectedPerson.wechat!, '微信号')}
                          className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#5B7B6D] hover:text-white text-[#2B332E] border border-[#5B7B6D]/15 flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs group/btn"
                        >
                          <span className="text-[#5B7B6D] group-hover/btn:text-white font-medium text-[11px]">微:</span>
                          <span className="font-mono text-xs">{selectedPerson.wechat}</span>
                          <Copy className="w-3 h-3 text-[#6E7C75] group-hover/btn:text-white ml-1 opacity-70" />
                        </button>
                      )}
                      {selectedPerson.qq && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(selectedPerson.qq!, 'QQ号')}
                          className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#E88765] hover:text-white text-[#2B332E] border border-[#E88765]/20 flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs group/btn"
                        >
                          <span className="text-[#E88765] group-hover/btn:text-white font-medium text-[11px]">QQ:</span>
                          <span className="font-mono text-xs">{selectedPerson.qq}</span>
                          <Copy className="w-3 h-3 text-[#6E7C75] group-hover/btn:text-white ml-1 opacity-70" />
                        </button>
                      )}
                      {selectedPerson.phone && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(selectedPerson.phone!, '手机号')}
                          className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#5B7B6D] hover:text-white text-[#2B332E] border border-[#5B7B6D]/15 flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs group/btn"
                        >
                          <span className="text-[#5B7B6D] group-hover/btn:text-white font-medium text-[11px]">电话:</span>
                          <span className="font-mono text-xs">{selectedPerson.phone}</span>
                          <Copy className="w-3 h-3 text-[#6E7C75] group-hover/btn:text-white ml-1 opacity-70" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Person Exclusive Album Card (Located directly above Impressions & Stories) */}
              <PersonAlbum
                photos={selectedPerson.photos || []}
                personName={selectedPerson.name}
                onUpdatePhotos={(updatedPhotos) => {
                  handleUpdatePerson({ photos: updatedPhotos });
                }}
                showToast={showToast}
              />

              {/* 专属信物陈列柜 (直接从拾物阁拣选并陈列，点击直接唤起拾物阁同款大卡片弹窗) */}
              <PersonArtifactsShelf
                personName={selectedPerson.name}
                boundArtifactIds={selectedPerson.artifactIds || []}
                allArtifacts={data.artifacts || []}
                onUpdateBoundArtifacts={(newIds) => {
                  handleUpdatePerson({ artifactIds: newIds });
                }}
                onSelectArtifact={(art) => setSelectedArtifact(art)}
                showToast={showToast}
              />

              {/* 关联拾忆篇章 (从拾忆篇中拣选文章，点击卡片直接进入长卷阅读模式) */}
              <PersonStoriesShelf
                personName={selectedPerson.name}
                boundStoryIds={selectedPerson.storyIds || []}
                allStories={data.stories || []}
                onUpdateBoundStories={(newIds) => {
                  handleUpdatePerson({ storyIds: newIds });
                }}
                onReadStory={(story) => {
                  setReaderStory(story);
                }}
                showToast={showToast}
              />
            </motion.div>
          )}

          {/* Stories Tab */}
          {activeTab === 'stories' && !readerStory && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-4"
            >
              {data.stories.filter(story => selectedYear === 'all' || getYearFromDate(story.date) === selectedYear).length === 0 ? (
                <div className="bg-white dark:bg-[#161D19]/90 p-8 rounded-3xl border border-dashed border-[#5B7B6D]/20 dark:border-white/15 text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF8F5] dark:bg-white/10 flex items-center justify-center border border-[#5B7B6D]/20 dark:border-white/15 shadow-2xs">
                    <BookOpen className="w-6 h-6" style={{ color: isDarkMode ? (currentTheme.dark?.primary || currentTheme.primary) : currentTheme.primary }} />
                  </div>
                  <h3 className="font-bold text-[#2B332E] dark:text-[#FAF8F5] text-sm font-serif">
                    {selectedYear !== 'all' ? `「${selectedYear} 年暂无档案记录」` : '暂无长篇章节记录'}
                  </h3>
                  <p className="text-xs text-[#6E7C75] dark:text-[#A0B0A7] font-serif">
                    {selectedYear !== 'all' ? '岁序常易，此年暂未留存瞬间' : '写下属于你们的长卷故事与岁月记忆'}
                  </p>
                  <div className="flex justify-center gap-2 pt-1 font-sans">
                    <button
                      onClick={() => {
                        if (selectedYear !== 'all') {
                          setFormStoryDate(`${selectedYear}-01-01`);
                        }
                        setActiveModal('addStory');
                      }}
                      className="text-xs px-3.5 py-1.5 text-white rounded-xl font-medium transition-all active:scale-95"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      {selectedYear !== 'all' ? `＋ 记录 ${selectedYear} 年首篇长章` : '新增章节'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.stories
                    .filter(story => selectedYear === 'all' || getYearFromDate(story.date) === selectedYear)
                    .map(story => (
                      <div
                        key={story.id}
                        onClick={() => setReaderStory(story)}
                        className="relative isolate overflow-hidden bg-white dark:bg-[#18231E] rounded-3xl p-4.5 border border-[#5B7B6D]/20 hover:border-[#5B7B6D]/50 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex justify-between items-center group active:scale-[0.99]"
                      >
                        {/* Decorative corner accent stamp */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#E88765]/10 via-transparent to-transparent pointer-events-none" />
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider font-sans px-2.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: isDarkMode ? `${currentTheme.primary}25` : `${currentTheme.primary}12`,
                                color: isDarkMode ? (currentTheme.dark?.accent || currentTheme.accent) : currentTheme.primary,
                                border: `1px solid ${isDarkMode ? `${currentTheme.primary}40` : `${currentTheme.primary}25`}`
                              }}
                            >
                              {story.chapter}
                            </span>
                            <span className="text-[10px] text-[#6E7C75] dark:text-[#A7B4AD] font-mono">{story.date}</span>
                          </div>
                          <h3 className="font-bold text-[#2B332E] dark:text-[#FAF8F5] text-base group-hover:text-[#5B7B6D] transition-colors font-serif mt-1">{story.title}</h3>
                          <p className="text-xs text-[#526058] dark:text-[#C2CDC7] line-clamp-2 mt-1 leading-relaxed font-serif">{story.content}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingStory(story);
                              setEditStoryDate(story.date || new Date().toISOString().slice(0, 10));
                            }}
                            className="p-1.5 text-[#6E7C75]/40 hover:text-[#5B7B6D] rounded-lg hover:bg-[#5B7B6D]/10 transition-all opacity-80 group-hover:opacity-100"
                            title="编辑篇章"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDelete('stories', story.id, story.title);
                            }}
                            className="p-1.5 text-[#6E7C75]/30 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all opacity-80 group-hover:opacity-100"
                            title="删除篇章"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareMemoirItem({ type: 'story', data: story });
                              setIsShareModalOpen(true);
                            }}
                            className="p-1.5 text-[#5B7B6D] hover:text-[#E88765] rounded-lg hover:bg-[#5B7B6D]/10 transition-all opacity-80 group-hover:opacity-100"
                            title="生成诗意长卷海报分享"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <BookOpen className="w-4 h-4 text-[#5B7B6D] ml-1" />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Reading Mode View: Universal immersive reader scroll with paper texture */}
          {readerStory && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-[#5B7B6D]/20 shadow-md space-y-5 min-h-[520px] flex flex-col justify-between paper-texture"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#5B7B6D]/15 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setReaderStory(null)}
                    className="text-xs text-[#526058] hover:text-[#5B7B6D] font-serif font-medium bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#5B7B6D]/15 hover:border-[#5B7B6D]/35 transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    <span>
                      {selectedPerson && activeTab === 'people'
                        ? `← 返回【${selectedPerson.name}】人物手账`
                        : '← 退出阅读'}
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStory(readerStory);
                        setEditStoryDate(readerStory.date || new Date().toISOString().slice(0, 10));
                      }}
                      className="text-[11px] px-3 py-1.5 text-[#5B7B6D] bg-[#5B7B6D]/10 hover:bg-[#5B7B6D]/20 rounded-xl font-sans transition-all flex items-center gap-1 active:scale-95 cursor-pointer font-medium"
                      title="编辑当前文章"
                    >
                      <Edit3 className="w-3 h-3 text-[#5B7B6D]" />
                      <span>编辑篇章</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShareMemoirItem({ type: 'story', data: readerStory });
                        setIsShareModalOpen(true);
                      }}
                      className="text-[11px] px-3 py-1.5 text-[#5B7B6D] bg-[#FAF8F5] hover:bg-[#5B7B6D]/10 rounded-xl font-sans transition-all flex items-center gap-1 border border-[#5B7B6D]/20 active:scale-95 cursor-pointer font-medium"
                      title="生成文章精美长图分享"
                    >
                      <Share2 className="w-3 h-3 text-[#E88765]" />
                      <span>分享</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlayTts(`${readerStory.title}。${readerStory.content}`)}
                      disabled={isTtsGenerating}
                      className="flex items-center gap-1 text-xs px-3.5 py-1.5 bg-[#FDF0EB] text-[#E88765] rounded-xl border border-[#E88765]/30 font-medium hover:bg-[#E88765] hover:text-white transition-all font-sans active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isTtsGenerating ? 'animate-bounce' : ''}`} />
                      <span>{isTtsGenerating ? 'AI 语音合成中...' : '朗读'}</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-mono font-bold text-[#E88765] tracking-widest px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E88765]/20 uppercase inline-block">
                    {readerStory.chapter}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#2B332E] font-serif leading-tight">
                    {readerStory.title}
                  </h2>
                </div>
                <div className="text-sm sm:text-base text-[#2B332E] leading-loose whitespace-pre-line font-serif pt-3 border-t border-[#5B7B6D]/10">
                  {readerStory.content}
                </div>
              </div>
              <div className="text-center text-[11px] text-[#6E7C75]/60 border-t border-[#5B7B6D]/10 pt-4 font-serif">
                《拾年》时光长卷阅读模式 · {readerStory.date}
              </div>
            </motion.div>
          )}

          {/* Artifacts Tab */}
          {activeTab === 'artifacts' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-4"
            >
              {data.artifacts.filter(item => selectedYear === 'all' || getYearFromDate(item.date) === selectedYear).length === 0 ? (
                <div className="bg-white dark:bg-[#161D19]/90 p-8 rounded-3xl border border-dashed border-[#5B7B6D]/20 dark:border-white/15 text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF8F5] dark:bg-white/10 flex items-center justify-center border border-[#5B7B6D]/20 dark:border-white/15 shadow-2xs">
                    <Package className="w-6 h-6" style={{ color: isDarkMode ? (currentTheme.dark?.primary || currentTheme.primary) : currentTheme.primary }} />
                  </div>
                  <h3 className="font-bold text-[#2B332E] dark:text-[#FAF8F5] text-sm font-serif">
                    {selectedYear !== 'all' ? `「${selectedYear} 年暂无档案记录」` : '暂无旧物藏品记录'}
                  </h3>
                  <p className="text-xs text-[#6E7C75] dark:text-[#A0B0A7] font-serif">
                    {selectedYear !== 'all' ? '岁序常易，此年暂未留存瞬间' : '一件旧物，封存一段岁月温度'}
                  </p>
                  <div className="flex justify-center gap-2 pt-1 font-sans">
                    <button
                      onClick={() => {
                        if (selectedYear !== 'all') {
                          setFormArtifactDate(`${selectedYear}-01-01`);
                        }
                        setActiveModal('addArtifact');
                      }}
                      className="text-xs px-3.5 py-1.5 text-white rounded-xl font-medium transition-all active:scale-95"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      {selectedYear !== 'all' ? `＋ 记录 ${selectedYear} 年首件旧物` : '收藏新物'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {data.artifacts
                    .filter(item => selectedYear === 'all' || getYearFromDate(item.date) === selectedYear)
                    .map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-20px' }}
                        transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.2), ease: 'easeOut' }}
                        onClick={() => setSelectedArtifact(item)}
                        className="relative isolate overflow-hidden bg-white dark:bg-[#18231E] p-3.5 rounded-3xl border border-[#5B7B6D]/20 hover:border-[#5B7B6D]/50 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98]"
                      >
                        {/* Decorative corner accent stamp */}
                        <div className="absolute top-0 right-0 w-14 h-14 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#E88765]/10 via-transparent to-transparent pointer-events-none" />

                        <div className="relative z-10">
                          {/* Polaroid Stack or Single Media Container */}
                          <div className="relative h-28 w-full mb-2">
                            {item.images && item.images.length > 1 && (
                              <div className="absolute inset-0 rounded-2xl bg-[#F2EFE9] dark:bg-black/40 border border-[#5B7B6D]/15 dark:border-white/10 rotate-2 translate-x-1 translate-y-0.5 pointer-events-none" />
                            )}
                            <div className="relative h-full w-full rounded-2xl overflow-hidden bg-[#FAF8F5] dark:bg-black/30 border border-[#5B7B6D]/15 dark:border-white/10 group-hover:opacity-95 transition-opacity shadow-2xs">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              {item.images && item.images.length > 1 && (
                                <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[9px] font-sans font-medium flex items-center gap-1 shadow-sm">
                                  <ImageIcon className="w-2.5 h-2.5" />
                                  <span>{item.images.length}张</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <h3 className="font-bold text-[#2B332E] dark:text-[#FAF8F5] text-sm group-hover:text-[#5B7B6D] transition-colors font-serif truncate">{item.name}</h3>
                          <p className="text-[10px] text-[#5B7B6D] dark:text-[#A7B4AD] font-semibold mt-0.5 font-sans">{item.date}</p>
                          <p className="text-xs text-[#526058] dark:text-[#C2CDC7] line-clamp-2 mt-1 leading-relaxed font-serif">{item.story}</p>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#F2EFE9] dark:border-white/10 relative z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTts(`${item.name}。${item.story}`);
                            }}
                            className="text-xs font-sans font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer py-1 px-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: isDarkMode ? (currentTheme.dark?.accent || currentTheme.accent || currentTheme.primary) : currentTheme.primary }}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>听回忆</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDelete('artifacts', item.id, item.name);
                              }}
                              className="p-1.5 text-[#6E7C75]/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all cursor-pointer"
                              title="删除旧物"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareMemoirItem({ type: 'artifact', data: item });
                                setIsShareModalOpen(true);
                              }}
                              className="p-1.5 text-[#5B7B6D] hover:text-white hover:bg-[#5B7B6D] dark:text-[#A7B4AD] dark:hover:text-white rounded-xl transition-all cursor-pointer"
                              title="生成旧物珍藏海报"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Future Letters Tab - Curated Japanese Indie Time Capsule Aesthetic */}
          {activeTab === 'letters' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-5"
            >
              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="text-xs text-[#526058] hover:text-[#5B7B6D] font-medium flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-[#5B7B6D]/20 shadow-2xs hover:shadow-xs transition-all active:scale-95"
                  >
                    ← 返回
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-[#2B332E] tracking-wide font-serif">寄年 · 时光胶囊</h2>
                    <span className="text-[10px] text-[#6E7C75] font-sans">封存时光 · 见字如晤</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal('addLetter')}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 bg-[#5B7B6D] hover:bg-[#3E564B] text-white rounded-xl shadow-xs font-bold transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> 封存信件
                </button>
              </div>

              {/* Letters Capsule Grid / List */}
              {data.letters.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-dashed border-[#5B7B6D]/20 text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#5B7B6D]/20 text-[#5B7B6D] flex items-center justify-center mx-auto text-xl">
                    ✉️
                  </div>
                  <h3 className="font-bold text-[#2B332E] text-sm font-serif">暂无时光信笺</h3>
                  <p className="text-xs text-[#6E7C75]">封存一封给未来的信，写下此刻的心情与期许</p>
                  <button
                    type="button"
                    onClick={() => setActiveModal('addLetter')}
                    className="px-4 py-1.5 bg-[#5B7B6D] text-white text-xs rounded-xl font-medium shadow-2xs"
                  >
                    封存信件
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {data.letters.map((letter, idx) => {
                    const isUnlocked = letter.isUnlocked || new Date().toISOString().slice(0, 10) >= letter.unlockDate;
                    return (
                      <motion.div
                        key={letter.id}
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-20px' }}
                        transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.2), ease: 'easeOut' }}
                        onClick={() => setSelectedLetter(letter)}
                        className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer group select-none flex flex-col justify-between ${
                          isUnlocked
                            ? 'bg-white border-[#5B7B6D]/25 shadow-xs hover:shadow-md hover:border-[#5B7B6D]/50 active:scale-[0.99]'
                            : 'bg-gradient-to-b from-[#FAF8F5] to-[#F2EFE9] border-[#D9CFC1] shadow-2xs hover:border-[#E88765]/40 hover:shadow-xs active:scale-[0.99]'
                        }`}
                      >
                        {/* Top Meta Bar: Category & Status Badge - Clear Flow Layout without Absolute Collision */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover:scale-105 ${
                                isUnlocked
                                  ? 'bg-[#FDF0EB] text-[#E88765] border-[#E88765]/30'
                                  : 'bg-white text-[#6E7C75] border-[#5B7B6D]/15'
                              }`}
                            >
                              {isUnlocked ? (
                                <Mail className="w-3.5 h-3.5 text-[#E88765]" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-[#6E7C75]" />
                              )}
                            </div>
                            <span className="text-xs font-sans font-semibold text-[#5B7B6D] tracking-wide shrink-0">
                              时光信笺
                            </span>
                            <span className="text-[10px] text-[#6E7C75]/70 font-sans truncate">
                              {letter.date ? `· 封存于 ${letter.date}` : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-sans font-medium border flex items-center gap-1 shadow-2xs whitespace-nowrap ${
                                isUnlocked
                                  ? 'bg-[#FDF0EB] text-[#E88765] border-[#E88765]/30'
                                  : 'bg-white text-[#526058] border-[#5B7B6D]/20'
                              }`}
                            >
                              {isUnlocked ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E88765]" />
                                  <span>已拆封 · 展读</span>
                                </>
                              ) : (
                                <>
                                  <Calendar className="w-3 h-3 text-[#5B7B6D]" />
                                  <span>约定开启: {letter.unlockDate}</span>
                                </>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDelete('letters', letter.id, letter.title);
                              }}
                              className="text-[#6E7C75]/40 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 transition-all opacity-70 group-hover:opacity-100"
                              title="删除胶囊"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Full-width Title - Dedicated Row with No Overlap */}
                        <div className="my-1">
                          <h3 className="font-bold text-base text-[#2B332E] font-serif leading-snug break-words">
                            {letter.title}
                          </h3>
                        </div>

                        {/* Bottom Row Preview / Action */}
                        {isUnlocked ? (
                          <div className="pt-2.5 mt-2 border-t border-[#F2EFE9] flex items-center justify-between gap-2">
                            <p className="text-xs text-[#6E7C75] font-serif line-clamp-1 italic pr-2 flex-1">
                              「{letter.content.slice(0, 45)}...」
                            </p>
                            <div className="text-[11px] text-[#E88765] font-sans font-medium flex items-center gap-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                              <span>弹窗拆阅</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2.5 mt-2 border-t border-[#5B7B6D]/10 flex items-center justify-between text-xs text-[#6E7C75] font-serif">
                            <p className="italic text-[11px] opacity-80 truncate pr-2">
                              「火漆封存完好，轻触弹窗查看胶囊密闭详情」
                            </p>
                            <div className="text-[10px] font-sans text-[#5B7B6D] bg-white/80 px-2 py-0.5 rounded-lg border border-[#5B7B6D]/15 flex items-center gap-1 shrink-0 whitespace-nowrap">
                              <Lock className="w-2.5 h-2.5" /> 密闭中
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </main>

        {/* Universal Creation & Settings Modals */}
        {activeModal && (
          <div className="absolute inset-0 bg-[#2B332E]/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className={`bg-[#FAF8F5] dark:bg-[#141B18] text-[#2B332E] dark:text-[#FAF8F5] w-full max-w-lg ${isKeyboardVisible ? 'max-h-[96%] pb-12' : 'max-h-[88%]'} overflow-y-auto p-5 sm:p-6 rounded-t-[32px] sm:rounded-3xl border border-[#5B7B6D]/15 dark:border-white/15 shadow-2xl space-y-4 transition-all duration-200 paper-texture`}>
              {/* Apple Sheet Pull Indicator */}
              <div className="w-10 h-1 bg-black/15 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />
              <div className="flex justify-between items-center border-b border-black/5 dark:border-white/10 pb-3">
                <h3 className="font-bold text-base flex items-center gap-2 font-serif" style={{ color: currentTheme.primary }}>
                  {activeModal === 'addTimeline' && '新建时光节点'}
                  {activeModal === 'addPerson' && '添加人物档案'}
                  {activeModal === 'addStory' && '新增故事章节'}
                  {activeModal === 'addArtifact' && '收藏旧物档案'}
                  {activeModal === 'addLetter' && '撰写未来寄信'}
                  {activeModal === 'backup' && '数据管理与私人安全设置'}
                  {activeModal === 'summaryReportModal' && '《拾年》时光总结报告'}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-full text-[#6E7C75] hover:text-[#2B332E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal 1: Timeline Item Form (Apple Segmented Card Flow) */}
              {activeModal === 'addTimeline' && (
                <form id="timelineForm" onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addItem('timeline', {
                    id: 't-' + Date.now(),
                    title: fd.get('title') as string,
                    date: formTimelineDate || (fd.get('date') as string) || new Date().toISOString().slice(0, 10),
                    location: (fd.get('location') as string) || '时光驿站',
                    content: fd.get('content') as string,
                    tag: (fd.get('tag') as string) || '时光印记',
                    image: formTimelineMediaType === 'image'
                      ? (formTimelineImage || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80')
                      : undefined,
                    video: formTimelineMediaType === 'video' ? formTimelineVideo : undefined,
                    videoPoster: formTimelineVideoPoster || undefined,
                    mediaType: formTimelineMediaType
                  });
                  setFormTimelineImage('');
                  setFormTimelineVideo('');
                  setFormTimelineVideoPoster('');
                  setFormTimelineMediaType('image');
                  setFormTimelineDate(new Date().toISOString().slice(0, 10));
                }} className="space-y-4 text-xs font-sans">

                  {/* Title Header Input */}
                  <div>
                    <input
                      name="title"
                      required
                      placeholder="定格一个瞬间标题..."
                      className="w-full text-base sm:text-lg font-serif font-bold bg-transparent border-b border-black/10 dark:border-white/10 pb-2 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/40"
                    />
                  </div>

                  {/* Local Media Uploader */}
                  <LocalMediaUploader
                    value={formTimelineMediaType === 'video' ? formTimelineVideo : formTimelineImage}
                    poster={formTimelineVideoPoster}
                    mediaType={formTimelineMediaType}
                    onChange={(url, type, poster) => {
                      setFormTimelineMediaType(type);
                      if (type === 'video') {
                        setFormTimelineVideo(url);
                        setFormTimelineVideoPoster(poster || '');
                      } else {
                        setFormTimelineImage(url);
                        setFormTimelineVideo('');
                        setFormTimelineVideoPoster('');
                      }
                    }}
                    onClear={() => {
                      setFormTimelineImage('');
                      setFormTimelineVideo('');
                      setFormTimelineVideoPoster('');
                      setFormTimelineMediaType('image');
                    }}
                    label="时光影像记录 (支持照片 / 视频)"
                    allowVideo={true}
                  />

                  {/* Content Narrative Card */}
                  <div className="bg-white/80 dark:bg-white/[0.04] p-3 rounded-2xl border border-black/5 dark:border-white/10 space-y-1.5 shadow-2xs">
                    <div className="flex justify-between items-center px-0.5">
                      <label className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD]">记忆详述</label>
                      <button
                        type="button"
                        onClick={() => handleAiPolishText('textarea[name="content"]', (val) => {
                          const area = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                          if (area) area.value = val;
                        })}
                        disabled={isAiPolishLoading}
                        className="text-[11px] font-serif hover:underline flex items-center gap-1 transition-opacity"
                        style={{ color: currentTheme.primary }}
                      >
                        <Feather className="w-3 h-3" /> {isAiPolishLoading ? '润色中...' : '文墨润色'}
                      </button>
                    </div>
                    <textarea
                      name="content"
                      required
                      rows={3}
                      placeholder="写下当时的感受、心境与难忘的细节..."
                      className="w-full p-2 bg-transparent text-[#2B332E] dark:text-[#FAF8F5] font-serif leading-relaxed text-xs focus:outline-none resize-none placeholder-[#6E7C75]/40"
                    />
                  </div>

                  {/* Segmented Metadata Card (Date, Location, Tag) */}
                  <div className="bg-white/80 dark:bg-white/[0.04] rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 shadow-2xs">
                    {/* Date Row */}
                    <div className="flex items-center justify-between p-3">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">记录日期</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDatePickerConfig({
                            isOpen: true,
                            title: '选择时光记录日期',
                            value: formTimelineDate || new Date().toISOString().slice(0, 10),
                            mode: 'full',
                            onConfirm: (val) => setFormTimelineDate(val)
                          });
                        }}
                        className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-white/10 border border-[#5B7B6D]/25 hover:border-[#5B7B6D] transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#5B7B6D]" />
                        <span>{formTimelineDate || new Date().toISOString().slice(0, 10)}</span>
                      </button>
                      <input type="hidden" name="date" value={formTimelineDate || new Date().toISOString().slice(0, 10)} />
                    </div>

                    {/* Location Row */}
                    <div className="flex items-center justify-between p-3 gap-2">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">发生地点</span>
                      <input
                        name="location"
                        placeholder="选填，如：校园老图书馆"
                        className="text-right text-xs bg-transparent text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/40 flex-1 font-serif"
                      />
                    </div>

                    {/* Tag Row */}
                    <div className="flex items-center justify-between p-3 gap-2">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">标签分类</span>
                      <input
                        name="tag"
                        placeholder="选填，如：青春、旅途"
                        className="text-right text-xs bg-transparent text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/40 flex-1 font-serif"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 text-white font-serif font-bold text-xs rounded-2xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    定格时光瞬间
                  </button>
                </form>
              )}

              {/* Modal 2: Add Person */}
              {activeModal === 'addPerson' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const nameVal = (fd.get('name') as string)?.trim();
                  const relVal = formPersonRel || (fd.get('relationship') as string)?.trim();
                  const birthdayVal = (fd.get('birthday') as string)?.trim() || '';
                  const groupVal = formPersonGroup || (fd.get('group') as string)?.trim() || '未分组';
                  const knowWhereVal = (fd.get('knowWhere') as string)?.trim() || '时光长廊';
                  const zodiacVal = birthdayVal ? getZodiacFromBirthday(birthdayVal) : '未知';
                  const knownDateVal = (fd.get('knownDate') as string)?.trim() || '2021-09-01';
                  const wechatVal = (fd.get('wechat') as string)?.trim() || '';
                  const qqVal = (fd.get('qq') as string)?.trim() || '';
                  const phoneVal = (fd.get('phone') as string)?.trim() || '';
                  const tagsInput = (fd.get('tags') as string)?.trim();
                  const tagsVal = tagsInput ? tagsInput.split(/[\s,，]+/).filter(Boolean) : [];
                  const messageVal = (fd.get('message') as string)?.trim() || '';

                  if (!formPersonAvatar) {
                    showToast('请上传人物头像相片（必填项）');
                    return;
                  }
                  if (!nameVal) {
                    showToast('请填写人物姓名或称谓（必填项）');
                    return;
                  }
                  if (!relVal) {
                    showToast('请填写或选择与该人物的关系（必填项）');
                    return;
                  }
                  addItem('people', {
                    id: 'p-' + Date.now(),
                    name: nameVal,
                    avatar: formPersonAvatar,
                    relationship: relVal,
                    group: groupVal,
                    birthday: birthdayVal || '未填写',
                    zodiac: zodiacVal,
                    knownDate: knownDateVal,
                    wechat: wechatVal,
                    qq: qqVal,
                    phone: phoneVal,
                    hobbies: (fd.get('hobbies') as string)?.trim() || '未填写',
                    color: (fd.get('color') as string)?.trim() || '暖杏粉',
                    bio: (fd.get('bio') as string)?.trim() || `${relVal} · 珍贵回忆的同路人`,
                    customFields: { '认识地点': knowWhereVal },
                    impressions: (fd.get('impression') as string)?.trim()
                      ? [{ id: 'imp-0', year: new Date().getFullYear().toString(), text: (fd.get('impression') as string)?.trim() }]
                      : []
                  });
                  setFormPersonAvatar('');
                  setFormPersonRel('挚友');
                  setFormPersonGroup('未分组');
                }} className="space-y-4 text-xs font-sans">

                  {/* Header: Pure Minimalist Avatar Frame & Centered Name Input */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <LocalImageUploader
                      value={formPersonAvatar}
                      onChange={setFormPersonAvatar}
                      mode="avatar"
                      required={true}
                    />
                    <div className="w-full text-center">
                      <input
                        name="name"
                        required
                        placeholder="好友姓名或称谓..."
                        className="w-full text-center text-xl font-serif font-bold bg-transparent border-b-2 border-stone-200/90 dark:border-white/10 pb-1 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
                      />
                    </div>
                  </div>

                  {/* Card 1: 身名与岁月坐标 (Identity, Group & Milestones) */}
                  <div className="bg-white/90 dark:bg-white/[0.04] rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 shadow-2xs">
                    {/* Relationship Row */}
                    <div className="flex items-center justify-between p-3 gap-2">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">身份关系</span>
                      <input
                        name="relationship"
                        required
                        value={formPersonRel}
                        onChange={(e) => setFormPersonRel(e.target.value)}
                        placeholder="输入关系"
                        className="w-28 sm:w-32 text-right text-xs bg-stone-50/90 dark:bg-black/20 p-2 rounded-xl border border-stone-200/80 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50 font-serif"
                      />
                    </div>

                    {/* Group Row */}
                    <div className="flex items-center justify-between p-3">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">所属分组</span>
                      <button
                        type="button"
                        onClick={() => setFormGroupPickerTarget('add')}
                        className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Folder className="w-3.5 h-3.5 text-[#5B7B6D]" />
                        <span>{formPersonGroup || '未分组'}</span>
                        <ChevronDown className="w-3 h-3 text-[#6E7C75]" />
                      </button>
                      <input type="hidden" name="group" value={formPersonGroup || '未分组'} />
                    </div>

                    {/* Known Date Row */}
                    <div className="flex items-center justify-between p-3">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">相识时日</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDatePickerConfig({
                            isOpen: true,
                            title: '选择相识起始日期',
                            value: addPersonKnownDate || '2021-09-01',
                            mode: 'full',
                            onConfirm: (val) => setAddPersonKnownDate(val)
                          });
                        }}
                        className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#5B7B6D]" />
                        <span>{addPersonKnownDate || '2021-09-01'}</span>
                      </button>
                      <input type="hidden" name="knownDate" value={addPersonKnownDate || '2021-09-01'} />
                    </div>

                    {/* Birthday Row */}
                    <div className="flex items-center justify-between p-3">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">好友生辰</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDatePickerConfig({
                            isOpen: true,
                            title: '选择好友生日',
                            value: addPersonBirthday || '',
                            mode: 'month-day',
                            onConfirm: (val) => setAddPersonBirthday(val)
                          });
                        }}
                        className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#E88765]" />
                        <span>{addPersonBirthday || '选填生日'}</span>
                      </button>
                      <input type="hidden" name="birthday" value={addPersonBirthday || ''} />
                    </div>

                    {/* Know Where Row */}
                    <div className="flex items-center justify-between p-3 gap-2">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">初遇地点</span>
                      <input
                        name="knowWhere"
                        placeholder="选填，如：新沂一中"
                        className="w-40 sm:w-44 text-right text-xs bg-stone-50/90 dark:bg-black/20 p-2 rounded-xl border border-stone-200/80 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50 font-serif"
                      />
                    </div>
                  </div>

                  {/* Card 3: 寄语与初识印象 (Bio & Impression) */}
                  <div className="bg-white/90 dark:bg-white/[0.04] p-3.5 rounded-2xl border border-black/5 dark:border-white/10 space-y-2 shadow-2xs">
                    <span className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD]">一句话总结与初识印象</span>
                    <input
                      name="bio"
                      placeholder="选填，如：知心挚友，同路前行"
                      className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
                    />
                    <textarea
                      name="impression"
                      rows={2}
                      placeholder="初识温存细节或深刻回忆（选填）..."
                      className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none resize-none placeholder-[#6E7C75]/50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 text-white font-serif font-bold text-xs rounded-2xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    建立人物档案
                  </button>
                </form>
              )}

              {/* Modal 3: Add Story (Apple Segmented Form Sheet) */}
              {activeModal === 'addStory' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addItem('stories', {
                    id: 's-' + Date.now(),
                    chapter: (fd.get('chapter') as string) || '第一篇',
                    title: fd.get('title') as string,
                    content: fd.get('content') as string,
                    date: formStoryDate || (fd.get('date') as string) || new Date().toISOString().slice(0, 10)
                  });
                  setFormStoryDate(new Date().toISOString().slice(0, 10));
                }} className="space-y-4 text-xs font-sans">
                  {/* Hero Title Input */}
                  <div>
                    <input
                      name="title"
                      required
                      placeholder="篇章题名 (如: 梧桐树下的午后)..."
                      className="w-full text-base sm:text-lg font-serif font-bold bg-transparent border-b border-black/10 dark:border-white/10 pb-2 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/40"
                    />
                  </div>

                  {/* Segmented Metadata Card */}
                  <div className="bg-white/80 dark:bg-white/[0.04] rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 shadow-2xs">
                    <div className="flex items-center justify-between p-3 gap-2">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">章节归序</span>
                      <input
                        name="chapter"
                        required
                        defaultValue="第一章"
                        placeholder="例: 第一章、序章"
                        className="text-right text-xs bg-transparent text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/40 flex-1 font-serif"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">记录日期</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDatePickerConfig({
                            isOpen: true,
                            title: '选择故事篇章日期',
                            value: formStoryDate || new Date().toISOString().slice(0, 10),
                            mode: 'full',
                            onConfirm: (val) => setFormStoryDate(val)
                          });
                        }}
                        className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-white/10 border border-[#5B7B6D]/25 hover:border-[#5B7B6D] transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#5B7B6D]" />
                        <span>{formStoryDate || new Date().toISOString().slice(0, 10)}</span>
                      </button>
                      <input type="hidden" name="date" value={formStoryDate || new Date().toISOString().slice(0, 10)} />
                    </div>
                  </div>

                  {/* Segmented Narrative Textarea */}
                  <div className="bg-white/80 dark:bg-white/[0.04] p-3 rounded-2xl border border-black/5 dark:border-white/10 space-y-1.5 shadow-2xs">
                    <div className="flex justify-between items-center px-0.5">
                      <label className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD]">正文笔墨</label>
                      <button
                        type="button"
                        onClick={() => handleAiPolishText('textarea[name="content"]', (val) => {
                          const area = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                          if (area) area.value = val;
                        })}
                        disabled={isAiPolishLoading}
                        className="text-[11px] font-serif hover:underline flex items-center gap-1 transition-opacity"
                        style={{ color: currentTheme.primary }}
                      >
                        <Feather className="w-3 h-3" /> {isAiPolishLoading ? '润色中...' : '文墨润色'}
                      </button>
                    </div>
                    <textarea
                      name="content"
                      required
                      rows={5}
                      placeholder="落墨篇章，长叙岁月深处的温存故事..."
                      className="w-full p-2 bg-transparent text-[#2B332E] dark:text-[#FAF8F5] font-serif leading-relaxed text-xs focus:outline-none resize-none placeholder-[#6E7C75]/40"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 text-white font-serif font-bold text-xs rounded-2xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    收入拾忆篇
                  </button>
                </form>
              )}

              {/* Modal 4: Add Artifact (Apple Segmented Form Sheet) */}
              {activeModal === 'addArtifact' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const artifactName = (fd.get('name') as string)?.trim() || '未命名旧物';
                  const primaryImage = formArtifactImage || formArtifactImages[0] || (formArtifactVideoPoster ? formArtifactVideoPoster : 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80');

                  addItem('artifacts', {
                    id: 'a-' + Date.now(),
                    name: artifactName,
                    date: formArtifactDate || (fd.get('date') as string) || new Date().toISOString().slice(0, 10),
                    story: (fd.get('story') as string) || '',
                    image: primaryImage,
                    images: formArtifactImages.length > 0 ? formArtifactImages : undefined,
                    video: formArtifactVideo,
                    videoPoster: formArtifactVideoPoster,
                    mediaType: formArtifactMediaType
                  });

                  // Reset states
                  setFormArtifactImage('');
                  setFormArtifactImages([]);
                  setFormArtifactVideo(undefined);
                  setFormArtifactVideoPoster(undefined);
                  setFormArtifactMediaType('image');
                  setFormArtifactDate(new Date().toISOString().slice(0, 10));
                  setActiveModal(null);
                  showToast('旧物已成功入藏拾物阁 ✨');
                }} className="space-y-4 text-xs font-sans">

                  {/* Hero Title Input */}
                  <div>
                    <input
                      name="name"
                      required
                      placeholder="旧物称谓 (如: 理光GR相机、毕业明信片)..."
                      className="w-full text-base sm:text-lg font-serif font-bold bg-transparent border-b border-black/10 dark:border-white/10 pb-2 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
                    />
                  </div>

                  {/* Multi-Media Uploader: Multi-photos & Short Video */}
                  <ArtifactMediaUploader
                    image={formArtifactImage}
                    images={formArtifactImages}
                    video={formArtifactVideo}
                    videoPoster={formArtifactVideoPoster}
                    mediaType={formArtifactMediaType}
                    onChange={(media) => {
                      setFormArtifactImage(media.image);
                      setFormArtifactImages(media.images);
                      setFormArtifactVideo(media.video);
                      setFormArtifactVideoPoster(media.videoPoster);
                      setFormArtifactMediaType(media.mediaType);
                    }}
                    onGenerateAiImage={(callback) => {
                      const name = (document.querySelector('input[name="name"]') as HTMLInputElement)?.value || '古老纪念物';
                      handleGenerateAiImage(name, callback);
                    }}
                    isAiGenLoading={isAiGenImageLoading}
                  />

                  {/* Segmented Metadata Card */}
                  <div className="bg-white/90 dark:bg-white/[0.04] rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 shadow-2xs">
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">获得或纪念时日</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDatePickerConfig({
                            isOpen: true,
                            title: '选择旧物获得/纪念日期',
                            value: formArtifactDate || new Date().toISOString().slice(0, 10),
                            mode: 'full',
                            onConfirm: (val) => setFormArtifactDate(val)
                          });
                        }}
                        className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-white/10 border border-[#5B7B6D]/25 hover:border-[#5B7B6D] transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#5B7B6D]" />
                        <span>{formArtifactDate || new Date().toISOString().slice(0, 10)}</span>
                      </button>
                      <input type="hidden" name="date" value={formArtifactDate || new Date().toISOString().slice(0, 10)} />
                    </div>
                  </div>

                  {/* Segmented Narrative Textarea */}
                  <div className="bg-white/90 dark:bg-white/[0.04] p-3.5 rounded-2xl border border-black/5 dark:border-white/10 space-y-2 shadow-2xs">
                    <div className="flex justify-between items-center px-0.5">
                      <label className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD]">物品回忆与纪念意义</label>
                      <button
                        type="button"
                        onClick={() => handleAiPolishText('textarea[name="story"]', (val) => {
                          const area = document.querySelector('textarea[name="story"]') as HTMLTextAreaElement;
                          if (area) area.value = val;
                        })}
                        disabled={isAiPolishLoading}
                        className="text-[11px] font-serif hover:underline flex items-center gap-1 transition-opacity text-[#5B7B6D]"
                      >
                        <Feather className="w-3 h-3" /> {isAiPolishLoading ? '润色中...' : '文墨润色'}
                      </button>
                    </div>
                    <textarea
                      name="story"
                      required
                      rows={4}
                      placeholder="写下这件旧物与你之间的专属故事与温存回忆..."
                      className="w-full p-3 bg-[#FAF8F5] dark:bg-black/20 rounded-xl border border-[#5B7B6D]/20 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] font-serif leading-relaxed text-xs focus:outline-none resize-none placeholder-[#6E7C75]/50 focus:border-[#5B7B6D]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 text-white font-serif font-bold text-xs rounded-2xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    展出旧物
                  </button>
                </form>
              )}

              {/* Modal 5: Add Letter (Apple Segmented Form Sheet) */}
              {activeModal === 'addLetter' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const title = (fd.get('title') as string) || '未命名时光信笺';
                  const unlockDate = formLetterUnlockDate || (fd.get('unlockDate') as string) || '2030-01-01';
                  const content = fd.get('content') as string;

                  addItem('letters', {
                    id: 'l-' + Date.now(),
                    title,
                    unlockDate,
                    content,
                    isUnlocked: false
                  });
                  setFormLetterUnlockDate('2030-01-01');
                  setActiveModal(null);
                  setSealingRitualData({ title, unlockDate });
                }} className="space-y-4 text-xs font-sans">

                  {/* Hero Title Input */}
                  <div>
                    <input
                      name="title"
                      required
                      placeholder="时光信笺标题 (如: 致三十岁的自己)..."
                      className="w-full text-base sm:text-lg font-serif font-bold bg-transparent border-b border-black/10 dark:border-white/10 pb-2 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/40"
                    />
                  </div>

                  {/* Segmented Metadata Card */}
                  <div className="bg-white/80 dark:bg-white/[0.04] rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 shadow-2xs">
                    <div className="flex items-center justify-between p-3">
                      <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">未来开启时日</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDatePickerConfig({
                            isOpen: true,
                            title: '设定未来寄信开启日期',
                            value: formLetterUnlockDate || '2030-01-01',
                            mode: 'full',
                            onConfirm: (val) => setFormLetterUnlockDate(val)
                          });
                        }}
                        className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        <span>{formLetterUnlockDate || '2030-01-01'}</span>
                        <Calendar className="w-3.5 h-3.5 opacity-60" style={{ color: currentTheme.primary }} />
                      </button>
                      <input type="hidden" name="unlockDate" value={formLetterUnlockDate || '2030-01-01'} />
                    </div>
                  </div>

                  {/* Segmented Narrative Textarea */}
                  <div className="bg-white/80 dark:bg-white/[0.04] p-3 rounded-2xl border border-black/5 dark:border-white/10 space-y-1.5 shadow-2xs">
                    <label className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD] block px-0.5">见字如晤 · 寄信内容</label>
                    <textarea
                      name="content"
                      required
                      rows={5}
                      placeholder="写给未来的期许、秘密与此刻的心境..."
                      className="w-full p-2 bg-transparent text-[#2B332E] dark:text-[#FAF8F5] font-serif leading-relaxed text-xs focus:outline-none resize-none placeholder-[#6E7C75]/40"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 text-white font-serif font-bold text-xs rounded-2xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    封存时光胶囊
                  </button>
                </form>
              )}

            </div>
          </div>
        )}

        {/* Modal for Editing Person Profile (Apple Segmented Form Sheet) */}
        {isEditingPerson && selectedPerson && (
          <div className="absolute inset-0 bg-[#2B332E]/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn font-sans">
            <div className={`bg-[#FAF8F5] dark:bg-[#141B18] text-[#2B332E] dark:text-[#FAF8F5] w-full max-w-lg ${isKeyboardVisible ? 'max-h-[96%] pb-12' : 'max-h-[88%]'} overflow-y-auto p-5 sm:p-6 rounded-t-[32px] sm:rounded-3xl border border-black/10 dark:border-white/15 shadow-2xl space-y-4 transition-all duration-200 paper-texture`}>
              {/* Apple Sheet Pull Indicator */}
              <div className="w-10 h-1 bg-black/15 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />
              <div className="flex justify-between items-center border-b border-black/5 dark:border-white/10 pb-3">
                <h3 className="font-bold text-base flex items-center gap-2 font-serif" style={{ color: currentTheme.primary }}>
                  <UserPlus className="w-4 h-4" />
                  <span>编辑【{selectedPerson.name}】档案</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingPerson(false)}
                  className="p-1 rounded-full text-[#6E7C75] hover:text-[#2B332E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const nameVal = (fd.get('name') as string)?.trim();
                const relVal = editPersonRel || (fd.get('relationship') as string)?.trim() || selectedPerson.relationship;
                const birthdayVal = (fd.get('birthday') as string)?.trim() || selectedPerson.birthday || '';
                const groupVal = editPersonGroup || (fd.get('group') as string)?.trim() || selectedPerson.group || '未分组';
                const knowWhereVal = (fd.get('knowWhere') as string)?.trim() || selectedPerson.customFields?.['认识地点'] || '时光长廊';
                const zodiacVal = birthdayVal && birthdayVal !== '未填写' ? getZodiacFromBirthday(birthdayVal) : (selectedPerson.zodiac || '未知');
                const knownDateVal = (fd.get('knownDate') as string)?.trim() || selectedPerson.knownDate || '2021-09-01';
                const wechatVal = (fd.get('wechat') as string)?.trim() || '';
                const qqVal = (fd.get('qq') as string)?.trim() || '';
                const phoneVal = (fd.get('phone') as string)?.trim() || '';
                const finalAvatar = editPersonAvatar || selectedPerson.avatar;

                if (!finalAvatar) {
                  showToast('请上传人物头像相片（必填项）');
                  return;
                }
                if (!nameVal) {
                  showToast('请填写人物姓名（必填项）');
                  return;
                }
                if (!relVal) {
                  showToast('请填写与该人物的关系（必填项）');
                  return;
                }
                handleUpdatePerson({
                  name: nameVal,
                  relationship: relVal,
                  group: groupVal,
                  birthday: birthdayVal || '未填写',
                  zodiac: zodiacVal,
                  knownDate: knownDateVal,
                  wechat: wechatVal,
                  qq: qqVal,
                  phone: phoneVal,
                  hobbies: (fd.get('hobbies') as string)?.trim() || '未填写',
                  color: (fd.get('color') as string)?.trim() || '暖杏粉',
                  bio: (fd.get('bio') as string)?.trim() || `${relVal} · 珍贵回忆的同路人`,
                  avatar: finalAvatar,
                  customFields: {
                    ...(selectedPerson.customFields || {}),
                    '认识地点': knowWhereVal
                  }
                });
              }} className="space-y-4 text-xs font-sans">

                {/* Hero Avatar & Name Section */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  <LocalImageUploader
                    value={editPersonAvatar || selectedPerson.avatar}
                    onChange={setEditPersonAvatar}
                    mode="avatar"
                    required={true}
                  />
                  <div className="w-full text-center">
                    <input
                      name="name"
                      defaultValue={selectedPerson.name}
                      required
                      placeholder="姓名或称谓..."
                      className="w-full text-center text-xl font-serif font-bold bg-transparent border-b-2 border-stone-200/90 dark:border-white/10 pb-1 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
                    />
                  </div>
                </div>

                {/* Card 1: 身名与岁月坐标 (Identity, Group & Milestones) */}
                <div className="bg-white/90 dark:bg-white/[0.04] rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 shadow-2xs">
                  {/* Relationship Row */}
                  <div className="flex items-center justify-between p-3 gap-2">
                    <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">身份关系</span>
                    <input
                      name="relationship"
                      required
                      value={editPersonRel || selectedPerson.relationship}
                      onChange={(e) => setEditPersonRel(e.target.value)}
                      placeholder="输入关系"
                      className="w-28 sm:w-32 text-right text-xs bg-stone-50/90 dark:bg-black/20 p-2 rounded-xl border border-stone-200/80 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50 font-serif"
                    />
                  </div>

                  {/* Group Row */}
                  <div className="flex items-center justify-between p-3">
                    <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">所属分组</span>
                    <button
                      type="button"
                      onClick={() => setFormGroupPickerTarget('edit')}
                      className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Folder className="w-3.5 h-3.5 text-[#5B7B6D]" />
                      <span>{editPersonGroup || selectedPerson.group || '未分组'}</span>
                      <ChevronDown className="w-3 h-3 text-[#6E7C75]" />
                    </button>
                    <input type="hidden" name="group" value={editPersonGroup || selectedPerson.group || '未分组'} />
                  </div>

                  {/* Known Date Row */}
                  <div className="flex items-center justify-between p-3">
                    <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">相识时日</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDatePickerConfig({
                          isOpen: true,
                          title: `设置与【${selectedPerson.name}】相识日期`,
                          value: editPersonKnownDate || selectedPerson.knownDate || '2021-09-01',
                          mode: 'full',
                          onConfirm: (val) => setEditPersonKnownDate(val)
                        });
                      }}
                      className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#5B7B6D]" />
                      <span>{editPersonKnownDate || selectedPerson.knownDate || '2021-09-01'}</span>
                    </button>
                    <input type="hidden" name="knownDate" value={editPersonKnownDate || selectedPerson.knownDate || '2021-09-01'} />
                  </div>

                  {/* Birthday Row */}
                  <div className="flex items-center justify-between p-3">
                    <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">好友生辰</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDatePickerConfig({
                          isOpen: true,
                          title: `设置【${selectedPerson.name}】的生日`,
                          value: editPersonBirthday || (selectedPerson.birthday !== '未填写' ? selectedPerson.birthday : ''),
                          mode: 'month-day',
                          onConfirm: (val) => setEditPersonBirthday(val)
                        });
                      }}
                      className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100/80 dark:bg-white/10 border border-stone-200 dark:border-white/10 hover:border-primary transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#E88765]" />
                      <span>{editPersonBirthday || (selectedPerson.birthday !== '未填写' ? selectedPerson.birthday : '选填生日')}</span>
                    </button>
                    <input type="hidden" name="birthday" value={editPersonBirthday || (selectedPerson.birthday !== '未填写' ? selectedPerson.birthday : '')} />
                  </div>

                  {/* Know Where Row */}
                  <div className="flex items-center justify-between p-3 gap-2">
                    <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">初遇地点</span>
                    <input
                      name="knowWhere"
                      defaultValue={selectedPerson.customFields?.['认识地点'] || ''}
                      placeholder="选填，如：新沂一中"
                      className="w-40 sm:w-44 text-right text-xs bg-stone-50/90 dark:bg-black/20 p-2 rounded-xl border border-stone-200/80 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50 font-serif"
                    />
                  </div>

                  {/* Hobbies Row */}
                  <div className="flex items-center justify-between p-3 gap-2">
                    <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">兴趣偏好</span>
                    <input
                      name="hobbies"
                      defaultValue={selectedPerson.hobbies !== '未填写' ? selectedPerson.hobbies : ''}
                      placeholder="选填如摄影旅行"
                      className="w-40 sm:w-44 text-right text-xs bg-stone-50/90 dark:bg-black/20 p-2 rounded-xl border border-stone-200/80 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50 font-serif"
                    />
                  </div>
                </div>

                {/* Card 3: 社交信息与总结寄语 (Contacts & Bio) */}
                <div className="bg-white/90 dark:bg-white/[0.04] p-3.5 rounded-2xl border border-black/5 dark:border-white/10 space-y-2.5 shadow-2xs">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name="wechat"
                      defaultValue={selectedPerson.wechat || ''}
                      placeholder="微信号 (选填)"
                      className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
                    />
                    <input
                      name="phone"
                      defaultValue={selectedPerson.phone || ''}
                      placeholder="联系电话 (选填)"
                      className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
                    />
                  </div>
                  <textarea
                    name="bio"
                    defaultValue={selectedPerson.bio}
                    rows={2}
                    placeholder="人物总结寄语 (如: 晚自习后看过无数次晚霞的知心挚友)..."
                    className="w-full p-2.5 text-xs font-serif rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/90 dark:bg-black/20 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none resize-none placeholder-[#6E7C75]/50"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingPerson(false)}
                    className="flex-1 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] text-[#6E7C75] dark:text-[#A7B4AD] font-serif font-semibold text-xs hover:bg-black/5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl text-white font-serif font-bold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    保存档案
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Selected Artifact Detail Modal */}
        {selectedArtifact && (
          <div className="absolute inset-0 bg-[#2B332E]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#1A221E] w-full max-w-lg max-h-[90%] overflow-y-auto p-5 sm:p-6 rounded-3xl border border-[#5B7B6D]/20 shadow-2xl space-y-4 relative paper-texture">
              <div className="flex justify-between items-center border-b border-[#5B7B6D]/10 dark:border-white/10 pb-3">
                <div
                  className="flex items-center gap-1.5 text-base sm:text-lg font-bold font-mono tracking-tight"
                  style={{ color: isDarkMode ? (currentTheme.dark?.primary || currentTheme.dark?.accent || currentTheme.primary) : currentTheme.primary }}
                >
                  <Calendar className="w-4.5 h-4.5" />
                  <span>{selectedArtifact.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePlayTts(`${selectedArtifact.name}。${selectedArtifact.story}`)}
                    className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all font-sans cursor-pointer shadow-2xs"
                    style={{
                      backgroundColor: `${currentTheme.primary}15`,
                      color: currentTheme.primary
                    }}
                  >
                    <Volume2 className="w-3 h-3" /> 听回忆
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingArtifact(selectedArtifact);
                      setEditArtifactDate(selectedArtifact.date || new Date().toISOString().slice(0, 10));
                      setEditArtifactImage(selectedArtifact.image || '');
                      setEditArtifactImages(selectedArtifact.images || (selectedArtifact.image ? [selectedArtifact.image] : []));
                      setEditArtifactVideo(selectedArtifact.video);
                      setEditArtifactVideoPoster(selectedArtifact.videoPoster);
                      setEditArtifactMediaType(selectedArtifact.mediaType || (selectedArtifact.video ? 'video' : 'image'));
                      setSelectedArtifact(null);
                    }}
                    className="p-1.5 text-[#5B7B6D] hover:text-[#3E564B] dark:text-[#A7B4AD] dark:hover:text-white rounded-xl hover:bg-black/5 transition-all cursor-pointer"
                    title="编辑此旧物"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedArtifact(null)} className="p-1 text-[#6E7C75] hover:text-[#2B332E] dark:hover:text-white cursor-pointer rounded-xl hover:bg-black/5">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Media Display: Video or Multi-Photo Gallery */}
              {selectedArtifact.video ? (
                <div className="w-full rounded-2xl overflow-hidden shadow-sm aspect-video">
                  <VintageVideoPlayer
                    src={selectedArtifact.video}
                    poster={selectedArtifact.videoPoster}
                    title={selectedArtifact.name}
                    date={selectedArtifact.date}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-64 w-full rounded-2xl overflow-hidden bg-[#FAF8F5] dark:bg-black/30 border border-[#5B7B6D]/15 shadow-sm">
                    <img
                      src={selectedArtifactImagePreview || selectedArtifact.image}
                      alt={selectedArtifact.name}
                      className="w-full h-full object-cover transition-all duration-300"
                    />
                  </div>
                  {/* Photo Switcher Row if multiple photos */}
                  {selectedArtifact.images && selectedArtifact.images.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
                      {selectedArtifact.images.map((imgUrl, idx) => {
                        const isCurrent = (selectedArtifactImagePreview || selectedArtifact.image) === imgUrl;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedArtifactImagePreview(imgUrl)}
                            className={`w-13 h-13 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                              isCurrent
                                ? 'border-[#5B7B6D] ring-2 ring-[#5B7B6D]/30 scale-105 shadow-xs'
                                : 'border-[#5B7B6D]/15 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={imgUrl} alt={`缩略图 ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-bold text-[#2B332E] dark:text-[#FAF8F5] font-serif">{selectedArtifact.name}</h2>
                <div className="p-4.5 bg-[#FAF8F5] dark:bg-black/20 rounded-2xl border border-[#5B7B6D]/15 dark:border-white/10 shadow-2xs">
                  <p className="text-xs sm:text-sm text-[#2B332E] dark:text-[#FAF8F5] leading-relaxed font-serif whitespace-pre-line select-text">
                    {selectedArtifact.story}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedArtifact(null)}
                className="w-full py-3 bg-[#5B7B6D] text-white font-bold font-serif rounded-2xl shadow-xs hover:bg-[#3E564B] transition-all text-xs cursor-pointer active:scale-[0.98]"
              >
                关闭旧物展台
              </button>
            </div>
          </div>
        )}

        {/* Artifact Edit Modal (Apple Segmented Form Sheet) */}
        {editingArtifact && (
          <div className="absolute inset-0 bg-[#2B332E]/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#1E2822] w-full max-w-lg max-h-[92%] sm:max-h-[88%] rounded-t-3xl sm:rounded-3xl border border-stone-200/90 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden text-xs font-sans">
              {/* Sheet Pull Indicator for Mobile */}
              <div className="w-10 h-1 bg-stone-300 dark:bg-white/20 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/10 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentTheme.primary }}
                  />
                  <h3 className="font-bold text-base text-[#2B332E] dark:text-[#FAF8F5] font-serif">
                    编辑【{editingArtifact.name}】旧物档案
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingArtifact(null)}
                  className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#6E7C75] dark:text-[#A7B4AD] hover:text-[#2B332E] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const updatedName = (fd.get('name') as string)?.trim() || editingArtifact.name;
                  const updatedStory = (fd.get('story') as string) || '';
                  const primaryImage = editArtifactImage || editArtifactImages[0] || editingArtifact.image;

                  const updated: Artifact = {
                    ...editingArtifact,
                    name: updatedName,
                    date: editArtifactDate || editingArtifact.date,
                    story: updatedStory,
                    image: primaryImage,
                    images: editArtifactImages.length > 0 ? editArtifactImages : undefined,
                    video: editArtifactVideo,
                    videoPoster: editArtifactVideoPoster,
                    mediaType: editArtifactMediaType
                  };

                  handleUpdateArtifact(updated);
                }}
                className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1"
              >
                {/* Hero Title Input */}
                <div>
                  <label className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] block mb-1">旧物名称</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingArtifact.name}
                    placeholder="旧物称谓 (如: 理光GR相机、毕业明信片)..."
                    className="w-full text-base sm:text-lg font-serif font-bold bg-transparent border-b border-black/10 dark:border-white/10 pb-2 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/50"
                  />
                </div>

                {/* Media Uploader */}
                <ArtifactMediaUploader
                  image={editArtifactImage}
                  images={editArtifactImages}
                  video={editArtifactVideo}
                  videoPoster={editArtifactVideoPoster}
                  mediaType={editArtifactMediaType}
                  onChange={(media) => {
                    setEditArtifactImage(media.image);
                    setEditArtifactImages(media.images);
                    setEditArtifactVideo(media.video);
                    setEditArtifactVideoPoster(media.videoPoster);
                    setEditArtifactMediaType(media.mediaType);
                  }}
                  onGenerateAiImage={(callback) => {
                    const name = (document.querySelector('input[name="name"]') as HTMLInputElement)?.value || editingArtifact.name;
                    handleGenerateAiImage(name, callback);
                  }}
                  isAiGenLoading={isAiGenImageLoading}
                />

                {/* Date Setting Card */}
                <div className="bg-white/90 dark:bg-white/[0.04] rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 shadow-2xs">
                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">获得或纪念时日</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDatePickerConfig({
                          isOpen: true,
                          title: '修改旧物获得/纪念日期',
                          value: editArtifactDate || editingArtifact.date || new Date().toISOString().slice(0, 10),
                          mode: 'full',
                          onConfirm: (val) => setEditArtifactDate(val)
                        });
                      }}
                      className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-white/10 border border-[#5B7B6D]/25 hover:border-[#5B7B6D] transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#5B7B6D]" />
                      <span>{editArtifactDate || editingArtifact.date}</span>
                    </button>
                    <input type="hidden" name="date" value={editArtifactDate || editingArtifact.date} />
                  </div>
                </div>

                {/* Story Textarea */}
                <div className="bg-white/90 dark:bg-white/[0.04] p-3.5 rounded-2xl border border-black/5 dark:border-white/10 space-y-2 shadow-2xs">
                  <div className="flex justify-between items-center px-0.5">
                    <label className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD]">物品回忆与纪念意义</label>
                    <button
                      type="button"
                      onClick={() => handleAiPolishText('textarea[name="story"]', (val) => {
                        const area = document.querySelector('textarea[name="story"]') as HTMLTextAreaElement;
                        if (area) area.value = val;
                      })}
                      disabled={isAiPolishLoading}
                      className="text-[11px] font-serif hover:underline flex items-center gap-1 transition-opacity text-[#5B7B6D]"
                    >
                      <Feather className="w-3 h-3" /> {isAiPolishLoading ? '润色中...' : '文墨润色'}
                    </button>
                  </div>
                  <textarea
                    name="story"
                    required
                    rows={4}
                    defaultValue={editingArtifact.story}
                    placeholder="写下这件旧物与你之间的专属故事与温存回忆..."
                    className="w-full p-3 bg-[#FAF8F5] dark:bg-black/20 rounded-xl border border-[#5B7B6D]/20 dark:border-white/10 text-[#2B332E] dark:text-[#FAF8F5] font-serif leading-relaxed text-xs focus:outline-none resize-none placeholder-[#6E7C75]/50 focus:border-[#5B7B6D]"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingArtifact(null)}
                    className="flex-1 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] text-[#6E7C75] dark:text-[#A7B4AD] font-serif font-semibold text-xs hover:bg-black/5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl text-white font-serif font-bold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    保存旧物更新
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal from Active State */}
        {isChangingPin && !isLocked && (
          <div className="absolute inset-0 bg-[#2B332E]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn font-sans">
            <div className="bg-[#FAF8F5] w-full max-w-xs p-5 rounded-3xl border border-[#5B7B6D]/20 shadow-2xl space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-[#5B7B6D]/10 pb-2">
                <h3 className="font-bold text-[#2B332E] text-sm flex items-center gap-1.5 font-serif">
                  <ShieldCheck className="w-4 h-4 text-[#E88765]" /> 修改空间访问口令
                </h3>
                <button onClick={() => setIsChangingPin(false)} className="text-[#6E7C75] hover:text-[#2B332E]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="text-[10px] text-[#6E7C75] block mb-1">当前原口令：</label>
                  <input
                    type="password"
                    required
                    value={oldPinInput}
                    onChange={(e) => setOldPinInput(e.target.value)}
                    placeholder="请输入原口令 (默认 1234)"
                    className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#E88765]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#6E7C75] block mb-1">设置新口令：</label>
                  <input
                    type="password"
                    required
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="输入新口令 (至少4位)"
                    className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#E88765]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#6E7C75] block mb-1">再次确认新口令：</label>
                  <input
                    type="password"
                    required
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="请再次输入新口令"
                    className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#E88765]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsChangingPin(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white text-[#6E7C75] font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#5B7B6D] text-white font-bold hover:bg-[#3E564B] transition-all"
                  >
                    确认修改
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dedicated AI Voice Picker Modal */}
        {isVoicePickerModalOpen && (
          <div className="absolute inset-0 bg-[#2B332E]/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn font-sans">
            <div className="bg-[#FAF8F5] w-full max-w-sm rounded-3xl shadow-2xl border border-[#5B7B6D]/20 overflow-hidden flex flex-col max-h-[88%] paper-texture">
              {/* Modal Header */}
              <div className="p-4 bg-white/90 backdrop-blur-md border-b border-[#5B7B6D]/15 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#5B7B6D]/20 flex items-center justify-center text-[#5B7B6D] shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-[#2B332E] font-serif truncate">选择时光朗读者音色</h3>
                    <p className="text-[10px] text-[#6E7C75] truncate">高品质情感人声 · 区分男女性格质感</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsVoicePickerModalOpen(false)}
                  className="p-1.5 text-[#6E7C75] hover:text-[#2B332E] hover:bg-stone-100 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Gender Filter Tabs */}
              <div className="px-3.5 py-2 flex items-center gap-1.5 border-b border-[#5B7B6D]/10 bg-white/60 shrink-0">
                {(['all', '女声', '男声'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setVoiceFilterGender(filter)}
                    className={`flex-1 whitespace-nowrap px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-center ${
                      voiceFilterGender === filter
                        ? 'bg-[#5B7B6D] text-white shadow-2xs font-semibold'
                        : 'bg-white text-[#6E7C75] border border-[#5B7B6D]/15 hover:text-[#2B332E]'
                    }`}
                  >
                    {filter === 'all' ? '全部音色' : filter}
                  </button>
                ))}
              </div>

              {/* Voice Cards List */}
              <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1">
                {TTS_VOICES
                  .filter(v => voiceFilterGender === 'all' || v.gender === voiceFilterGender)
                  .map((v) => {
                    const isSelected = ttsSelectedVoice === v.id;
                    const isPreviewing = previewingVoiceId === v.id;

                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setTtsSelectedVoice(v.id);
                          localStorage.setItem('shinian_tts_voice', v.id);
                          showToast(`已选用朗诵音色：${v.name}`);
                        }}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-2.5 ${
                          isSelected
                            ? 'bg-white border-[#5B7B6D] ring-2 ring-[#5B7B6D]/25 shadow-xs'
                            : 'bg-white/80 border-[#5B7B6D]/15 hover:border-[#5B7B6D]/40 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-xs text-[#2B332E] font-serif truncate">{v.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium font-sans shrink-0 ${
                              v.gender === '女声'
                                ? 'bg-[#FDF0EB] text-[#E88765] border border-[#E88765]/20'
                                : 'bg-[#5B7B6D]/10 text-[#5B7B6D] border border-[#5B7B6D]/20'
                            }`}>
                              {v.gender}
                            </span>
                            <span className="text-[10px] text-[#6E7C75] font-serif hidden xs:inline truncate">
                              · {v.character}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] text-[#5B7B6D] font-bold flex items-center gap-1 bg-[#5B7B6D]/10 px-2 py-0.5 rounded-full font-sans shrink-0">
                              <Check className="w-3 h-3" /> 已选用
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#6E7C75] leading-relaxed font-serif">{v.desc}</p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#5B7B6D]/10">
                          <div className="flex flex-wrap gap-1">
                            {v.tags.map(t => (
                              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#FAF8F5] border border-[#5B7B6D]/10 text-[#6E7C75] font-sans whitespace-nowrap">
                                #{t}
                              </span>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewVoice(v);
                            }}
                            disabled={isTtsGenerating || previewingVoiceId !== null}
                            className={`text-[11px] px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all font-medium font-sans shrink-0 ${
                              isPreviewing
                                ? 'bg-[#E88765] text-white animate-pulse shadow-xs'
                                : 'bg-[#5B7B6D]/10 text-[#5B7B6D] hover:bg-[#5B7B6D] hover:text-white'
                            }`}
                          >
                            {isPreviewing ? (
                              <>
                                <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                                <span className="whitespace-nowrap">试听中...</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                <span className="whitespace-nowrap">试听声线</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-white/90 backdrop-blur-md border-t border-[#5B7B6D]/15 shrink-0">
                <button
                  onClick={() => setIsVoicePickerModalOpen(false)}
                  className="w-full py-2.5 bg-[#5B7B6D] text-white font-bold rounded-xl hover:bg-[#3E564B] transition-all text-xs shadow-xs"
                >
                  确定并完成
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Letter Popup Modal: Aesthetic Japanese Stationery Capsule Letter Reader */}
        {selectedLetter && (
          <div
            className="absolute inset-0 bg-[#2B332E]/60 backdrop-blur-sm z-50 flex items-center justify-center p-3.5 sm:p-5 animate-fadeIn"
            onClick={() => setSelectedLetter(null)}
          >
            <div
              className="bg-[#FAF8F5] w-full max-w-lg max-h-[88%] flex flex-col rounded-3xl border border-[#5B7B6D]/30 shadow-2xl overflow-hidden animate-scaleUp paper-texture relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Letter Bar */}
              <div className="px-5 py-4 bg-white/80 border-b border-[#5B7B6D]/15 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
                      selectedLetter.isUnlocked || new Date().toISOString().slice(0, 10) >= selectedLetter.unlockDate
                        ? 'bg-[#FDF0EB] text-[#E88765] border-[#E88765]/30'
                        : 'bg-white text-[#6E7C75] border-[#5B7B6D]/20'
                    }`}
                  >
                    {selectedLetter.isUnlocked || new Date().toISOString().slice(0, 10) >= selectedLetter.unlockDate ? (
                      <MailOpen className="w-4.5 h-4.5 text-[#E88765]" />
                    ) : (
                      <Lock className="w-4.5 h-4.5 text-[#6E7C75]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#5B7B6D] font-mono tracking-widest block font-medium">
                      CHRONO LETTER
                    </span>
                    <span className="text-xs text-[#6E7C75] font-sans">
                      封存信笺 · 见字如面
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      requestDelete('letters', selectedLetter.id, selectedLetter.title);
                    }}
                    className="p-1.5 text-[#6E7C75]/40 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all"
                    title="删除此信"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLetter(null)}
                    className="p-1.5 text-[#6E7C75] hover:text-[#2B332E] rounded-xl hover:bg-black/5 transition-all"
                    title="关闭弹窗"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Letter Content */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {/* Full Unbroken Title */}
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#2B332E] font-serif leading-snug break-words">
                    {selectedLetter.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E7C75] font-sans mt-2 pt-2 border-t border-[#5B7B6D]/10">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#5B7B6D]" />
                      封存日期: {selectedLetter.date || '时光原点'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#E88765]" />
                      约定开启: {selectedLetter.unlockDate}
                    </span>
                  </div>
                </div>

                {/* Status Indicator / Unlocked Letter Card */}
                {selectedLetter.isUnlocked || new Date().toISOString().slice(0, 10) >= selectedLetter.unlockDate ? (
                  <div className="space-y-4">
                    {/* Letter Paper Body */}
                    <div className="p-4 sm:p-5 bg-white/95 rounded-2xl border border-[#5B7B6D]/20 shadow-xs space-y-3 relative overflow-hidden animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-[#5B7B6D]/10 pb-2">
                        <span className="text-[10px] text-[#5B7B6D] font-mono tracking-wider flex items-center gap-1">
                          <Feather className="w-3 h-3 text-[#E88765]" /> 封存信笺 · 展读模式
                        </span>
                        <span className="text-[10px] text-[#E88765] bg-[#FDF0EB] px-2 py-0.5 rounded-full font-medium">
                          已解开火漆
                        </span>
                      </div>
                      <div className="text-sm text-[#2B332E] font-serif leading-relaxed whitespace-pre-line break-words pt-1 select-text">
                        {selectedLetter.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-white/80 rounded-2xl border border-dashed border-[#5B7B6D]/25 text-center space-y-4 shadow-2xs">
                    <div className="relative inline-block mx-auto">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FAF8F5] to-[#F2EFE9] border-2 border-[#D9CFC1] text-[#E88765] flex items-center justify-center text-2xl shadow-inner">
                        📮
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#5B7B6D] text-white rounded-full flex items-center justify-center text-[10px] shadow-2xs">
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    <div className="space-y-1.5 max-w-sm mx-auto">
                      <h4 className="font-bold text-sm sm:text-base text-[#2B332E] font-serif">
                        信笺尚在时光封蜡中
                      </h4>
                      <p className="text-xs text-[#6E7C75] leading-relaxed font-serif">
                        这封信原约定于 <strong className="text-[#E88765] font-bold">{selectedLetter.unlockDate}</strong> 开启解封。
                      </p>
                      <p className="text-[11px] text-[#6E7C75]/80 font-sans">
                        你可以静候约定之日自动开启，亦可在下方滑动解开时光火漆封蜡提前展读。
                      </p>
                    </div>

                    {/* Slide to Unlock Interactive Component */}
                    <div className="pt-2">
                      <SlideToUnlock
                        onUnlock={() => handleUnsealLetter(selectedLetter)}
                        isUnlocking={isUnsealingLetter}
                        theme={currentTheme}
                        unlockDate={selectedLetter.unlockDate}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-white/90 border-t border-[#5B7B6D]/15 flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-[#6E7C75] font-sans">
                  {selectedLetter.isUnlocked || new Date().toISOString().slice(0, 10) >= selectedLetter.unlockDate ? (
                    <span className="text-[#E88765] font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E88765]" />
                      已到期拆封
                    </span>
                  ) : (
                    <span className="text-[#5B7B6D] font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      封存密闭中
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(selectedLetter.isUnlocked || new Date().toISOString().slice(0, 10) >= selectedLetter.unlockDate) && (
                    <button
                      type="button"
                      onClick={() => handlePlayTts(selectedLetter.content)}
                      className="text-xs px-3.5 py-2 bg-[#FDF0EB] text-[#E88765] rounded-xl border border-[#E88765]/25 flex items-center gap-1.5 font-medium hover:bg-[#E88765] hover:text-white transition-all font-sans active:scale-95 shadow-2xs"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> <span>朗读</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedLetter(null)}
                    className="text-xs px-4 py-2 bg-[#5B7B6D] text-white rounded-xl font-medium hover:bg-[#3E564B] transition-all active:scale-95 shadow-2xs"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Story Edit Modal (Apple Segmented Form Sheet) */}
        {editingStory && (
          <div className="absolute inset-0 bg-[#2B332E]/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className={`bg-[#FAF8F5] dark:bg-[#141B18] text-[#2B332E] dark:text-[#FAF8F5] w-full max-w-lg ${isKeyboardVisible ? 'max-h-[96%] pb-12' : 'max-h-[88%]'} overflow-y-auto p-5 sm:p-6 rounded-t-[32px] sm:rounded-3xl border border-black/10 dark:border-white/15 shadow-2xl space-y-4 transition-all duration-200 paper-texture`}>
              {/* Apple Sheet Pull Indicator */}
              <div className="w-10 h-1 bg-black/15 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />
              <div className="flex justify-between items-center border-b border-black/5 dark:border-white/10 pb-3">
                <h3 className="font-bold text-base flex items-center gap-2 font-serif" style={{ color: currentTheme.primary }}>
                  <Edit3 className="w-4 h-4" />
                  <span>修改故事篇章</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingStory(null)}
                  className="p-1 rounded-full text-[#6E7C75] hover:text-[#2B332E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                handleUpdateStory({
                  id: editingStory.id,
                  chapter: (fd.get('chapter') as string)?.trim() || '篇章',
                  title: (fd.get('title') as string)?.trim() || '未命名故事',
                  date: editStoryDate || (fd.get('date') as string) || new Date().toISOString().slice(0, 10),
                  content: (fd.get('editStoryContent') as string)?.trim() || ''
                });
              }} className="space-y-4 text-xs font-sans">
                {/* Hero Title Input */}
                <div>
                  <input
                    name="title"
                    required
                    defaultValue={editingStory.title}
                    placeholder="篇章题名..."
                    className="w-full text-base sm:text-lg font-serif font-bold bg-transparent border-b border-black/10 dark:border-white/10 pb-2 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/40"
                  />
                </div>

                {/* Segmented Metadata Card */}
                <div className="bg-white/80 dark:bg-white/[0.04] rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 shadow-2xs">
                  <div className="flex items-center justify-between p-3 gap-2">
                    <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">篇章卷次</span>
                    <input
                      name="chapter"
                      required
                      defaultValue={editingStory.chapter}
                      placeholder="例如: 第一章 · 初见"
                      className="text-right text-xs bg-transparent text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none placeholder-[#6E7C75]/40 flex-1 font-serif"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] shrink-0">故事所属时日</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDatePickerConfig({
                          isOpen: true,
                          title: '修改故事篇章所属日期',
                          value: editStoryDate || editingStory.date || new Date().toISOString().slice(0, 10),
                          mode: 'full',
                          onConfirm: (val) => setEditStoryDate(val)
                        });
                      }}
                      className="font-mono text-xs text-[#2B332E] dark:text-[#FAF8F5] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-white/10 border border-[#5B7B6D]/25 hover:border-[#5B7B6D] transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#5B7B6D]" />
                      <span>{editStoryDate || editingStory.date || new Date().toISOString().slice(0, 10)}</span>
                    </button>
                    <input
                      type="hidden"
                      name="date"
                      value={editStoryDate || editingStory.date || new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                </div>

                {/* Segmented Narrative Textarea */}
                <div className="bg-white/80 dark:bg-white/[0.04] p-3 rounded-2xl border border-black/5 dark:border-white/10 space-y-1.5 shadow-2xs">
                  <div className="flex justify-between items-center px-0.5">
                    <label className="text-[11px] font-serif font-medium text-[#526058] dark:text-[#A7B4AD]">篇章正文</label>
                    <button
                      type="button"
                      onClick={() => handleAiPolishText('textarea[name="editStoryContent"]', (val) => {
                        const area = document.querySelector('textarea[name="editStoryContent"]') as HTMLTextAreaElement;
                        if (area) area.value = val;
                      })}
                      disabled={isAiPolishLoading}
                      className="text-[11px] font-serif hover:underline flex items-center gap-1 transition-opacity"
                      style={{ color: currentTheme.primary }}
                    >
                      <Feather className="w-3 h-3" /> {isAiPolishLoading ? '润色中...' : '文墨润色'}
                    </button>
                  </div>
                  <textarea
                    name="editStoryContent"
                    required
                    rows={8}
                    defaultValue={editingStory.content}
                    placeholder="在此编辑正文故事..."
                    className="w-full p-2 bg-transparent text-[#2B332E] dark:text-[#FAF8F5] font-serif leading-relaxed text-xs focus:outline-none resize-none placeholder-[#6E7C75]/40"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingStory(null)}
                    className="flex-1 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.05] text-[#6E7C75] dark:text-[#A7B4AD] font-serif font-semibold text-xs hover:bg-black/5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl text-white font-serif font-bold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    保存篇章修改
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Impression (岁月印记时光切片) Card Modal */}
        {editingImpression && (
          <div className="absolute inset-0 bg-[#2B332E]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn font-sans">
            <div className="bg-[#FAF8F5] w-full max-w-md p-5 sm:p-6 rounded-3xl border border-[#5B7B6D]/20 shadow-2xl space-y-4.5 paper-texture">
              <div className="flex justify-between items-center border-b border-[#5B7B6D]/15 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#5B7B6D]/10 flex items-center justify-center text-[#5B7B6D]">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2B332E] text-base font-serif">编辑时光印记切片</h3>
                    <p className="text-[11px] text-[#6E7C75]">修订岁月切片记忆细节与年份描述</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingImpression(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#6E7C75] hover:text-[#2B332E] hover:bg-[#5B7B6D]/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditedImpression} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#5B7B6D] flex items-center justify-between">
                    <span>切片日期</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDatePickerConfig({
                          isOpen: true,
                          title: '选取时光切片日期',
                          value: new Date().toISOString().slice(0, 10),
                          mode: 'full',
                          onConfirm: (val) => {
                            const parts = val.split('-');
                            if (parts.length === 3) {
                              setEditImpressionYear(`${parts[0]}.${parseInt(parts[1], 10)}.${parseInt(parts[2], 10)}`);
                            } else {
                              setEditImpressionYear(val);
                            }
                          }
                        });
                      }}
                      className="text-[11px] text-[#E88765] hover:underline flex items-center gap-1 font-normal cursor-pointer"
                    >
                      <Calendar className="w-3 h-3" /> 弹窗选择日期
                    </button>
                  </label>
                  <input
                    type="text"
                    value={editImpressionYear}
                    onChange={(e) => setEditImpressionYear(e.target.value)}
                    placeholder="如：2026.8.6"
                    className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white font-mono text-xs focus:outline-none focus:border-[#5B7B6D]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#5B7B6D]">
                    切片细节描述
                  </label>
                  <textarea
                    rows={4}
                    value={editImpressionText}
                    onChange={(e) => setEditImpressionText(e.target.value)}
                    placeholder="记录该年份留下的深刻印象、共同经历或瞬间..."
                    className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white font-serif text-xs leading-relaxed focus:outline-none focus:border-[#5B7B6D]"
                    required
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingImpression(null)}
                    className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/25 bg-white text-[#6E7C75] text-xs font-semibold hover:bg-[#F2EFE9] transition-all active:scale-95 shadow-2xs"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#5B7B6D] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#3E564B] transition-all active:scale-95"
                  >
                    保存切片修改
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Custom Delete Confirmation Modal with Bulletproof Cross-Device Styles */}
        {confirmDialog && (
          <div className="absolute inset-0 bg-[#2B332E]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn font-sans">
            <div className="bg-[#FAF8F5] w-full max-w-xs p-5 sm:p-6 rounded-3xl border border-[#5B7B6D]/20 shadow-2xl text-center space-y-4 paper-texture">
              <div
                className="w-13 h-13 rounded-full flex items-center justify-center mx-auto shadow-2xs"
                style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
              >
                <Trash2 className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#2B332E] text-sm sm:text-base font-serif">确认要抹去此项记忆记录吗？</h3>
                <p className="text-xs text-[#6E7C75] font-serif bg-white/80 py-1 px-2.5 rounded-xl border border-[#5B7B6D]/15 inline-block max-w-full truncate">
                  {confirmDialog.name}
                </p>
                <p className="text-[11px] text-[#6E7C75]/80 leading-relaxed font-sans pt-0.5">
                  抹去后该项记录将从当前私人时光空间中彻底移除
                </p>
              </div>
              <div className="flex gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/25 bg-white text-[#6E7C75] text-xs font-semibold hover:bg-[#F2EFE9] transition-all active:scale-95 shadow-2xs"
                  style={{ backgroundColor: '#FFFFFF', color: '#6E7C75', borderColor: 'rgba(91, 123, 109, 0.25)' }}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDialog.onConfirm) {
                      confirmDialog.onConfirm();
                    } else if (confirmDialog.type && confirmDialog.id) {
                      deleteItem(confirmDialog.type, confirmDialog.id);
                    }
                    setConfirmDialog(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all active:scale-95 hover:brightness-110"
                  style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: '1px solid #B91C1C' }}
                >
                  确认抹去
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Apple Dynamic Liquid Glass Floating Capsule Dock */}
        <div className="absolute bottom-3 sm:bottom-4 left-3 right-3 sm:left-4 sm:right-4 z-30 pointer-events-none select-none">
          <nav 
            id="dynamic-bottom-nav" 
            className="apple-liquid-glass pointer-events-auto relative rounded-full px-2 py-1.5 flex justify-around items-center"
          >
            <NavItem id="home" label="首页" icon={Landmark} active={activeTab} onClick={() => setActiveTab('home')} />
            <NavItem id="timeline" label="拾光轴" icon={Clock} active={activeTab} onClick={() => setActiveTab('timeline')} />
            <NavItem id="people" label="拾人册" icon={Users} active={activeTab} onClick={() => { setSelectedPerson(null); setActiveTab('people'); }} />
            <NavItem id="stories" label="拾忆篇" icon={BookOpen} active={activeTab} onClick={() => { setReaderStory(null); setActiveTab('stories'); }} />
            <NavItem id="artifacts" label="拾物阁" icon={Package} active={activeTab} onClick={() => setActiveTab('artifacts')} />
          </nav>
        </div>

        {/* Global Themed Date Picker Modal */}
        <ThemedDatePickerModal
          isOpen={datePickerConfig.isOpen}
          onClose={() => setDatePickerConfig(prev => ({ ...prev, isOpen: false }))}
          title={datePickerConfig.title}
          value={datePickerConfig.value}
          mode={datePickerConfig.mode}
          onConfirm={(val) => {
            datePickerConfig.onConfirm(val);
            setDatePickerConfig(prev => ({ ...prev, isOpen: false }));
          }}
          theme={currentTheme}
        />

        {/* Friend Group Picker Bottom Sheet Modal */}
        <AnimatePresence>
          {isGroupPickerOpen && (
            <FriendGroupPickerModal
              isOpen={isGroupPickerOpen}
              onClose={() => setIsGroupPickerOpen(false)}
              selectedGroup={selectedPersonGroup}
              onSelectGroup={(grp) => {
                setSelectedPersonGroup(grp);
                setIsGroupPickerOpen(false);
                showToast(grp === 'all' ? '已切换至全部好友全览' : `已切换至【${grp}】分组`);
              }}
              people={data.people}
              customGroups={customGroups}
              onAddGroup={handleAddGroup}
              onDeleteGroup={handleDeleteGroup}
              theme={currentTheme}
              isDarkMode={isDarkMode}
            />
          )}
          {formGroupPickerTarget && (
            <PersonGroupSelectModal
              isOpen={true}
              onClose={() => setFormGroupPickerTarget(null)}
              selectedGroup={formGroupPickerTarget === 'add' ? formPersonGroup : (editPersonGroup || selectedPerson?.group || '未分组')}
              onSelectGroup={(grp) => {
                const targetGrp = grp === 'all' ? '未分组' : grp;
                if (formGroupPickerTarget === 'add') {
                  setFormPersonGroup(targetGrp);
                } else if (formGroupPickerTarget === 'edit') {
                  setEditPersonGroup(targetGrp);
                }
                setFormGroupPickerTarget(null);
                showToast(`已选定所属分组「${targetGrp}」`);
              }}
              people={data.people}
              allGroupsList={allGroupsList}
              onAddGroup={(newG) => {
                handleAddGroup(newG);
                if (formGroupPickerTarget === 'add') {
                  setFormPersonGroup(newG);
                } else if (formGroupPickerTarget === 'edit') {
                  setEditPersonGroup(newG);
                }
                setFormGroupPickerTarget(null);
                showToast(`已新建并选定分组「${newG}」`);
              }}
              onDeleteGroup={handleDeleteGroup}
              theme={currentTheme}
              isDarkMode={isDarkMode}
            />
          )}
        </AnimatePresence>

        {/* Chrono Year Picker Bottom Sheet Modal */}
        <AnimatePresence>
          {isYearPickerOpen && (
            <ChronoYearPickerModal
              isOpen={isYearPickerOpen}
              onClose={() => setIsYearPickerOpen(false)}
              selectedYear={selectedYear}
              onSelectYear={(y) => {
                setSelectedYear(y);
                setIsYearPickerOpen(false);
                showToast(y === 'all' ? '已切换至全景时光' : `已切换至【${y} 年】时光档案`);
              }}
              years={years}
              yearStats={yearStats}
              theme={currentTheme}
              isDarkMode={isDarkMode}
            />
          )}
        </AnimatePresence>

        {/* 寄年火漆封蜡崇高仪式微动效 */}
        <AnimatePresence>
          {sealingRitualData && (
            <SealingWaxRitual
              title={sealingRitualData.title}
              unlockDate={sealingRitualData.unlockDate}
              onComplete={() => {
                setSealingRitualData(null);
                showToast(`信笺已通过火漆印章封存，将于 ${sealingRitualData.unlockDate} 启封`);
              }}
            />
          )}
        </AnimatePresence>

        {/* iOS Styled Splash Screen Entrance Animation */}
        <AnimatePresence>
          {showSplash && (
            <SplashScreen
              theme={currentTheme}
              onDismiss={() => setShowSplash(false)}
            />
          )}
        </AnimatePresence>

        {/* 记忆卡片艺术工坊（拍立得 / 电影票根高清海报生成与多端分享） */}
        <MemoirCardStudioModal
          source={shareMemoirItem}
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setShareMemoirItem(null);
          }}
          onShowToast={(msg) => showToast(msg)}
        />

        {/* 常驻灵动黑胶唱机（全网任意搜歌播放 + 复古复调大唱盘） */}
        <VinylMusicPlayer
          onShowToast={(msg) => showToast(msg)}
        />

        {/* 全屏时光禅意时钟 */}
        <FullscreenZenClock
          isOpen={isFullscreenClockOpen}
          onClose={() => setIsFullscreenClockOpen(false)}
          theme={currentTheme}
        />

      </div>
    </div>
  );
}

interface SplashScreenProps {
  theme: HealingTheme;
  onDismiss: () => void;
}

function SplashScreen({ theme, onDismiss }: SplashScreenProps) {
  return (
    <motion.div
      key="app-splash-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.03,
        filter: 'blur(8px)',
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
      }}
      style={{ willChange: 'opacity, transform, filter', backgroundColor: theme.canvas }}
      className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col items-center justify-center p-6 overflow-hidden select-none cursor-pointer transform-gpu"
      onClick={() => {
        sound.playHapticClick(900);
        onDismiss();
      }}
    >
      {/* Background Ambient Fluid Glows (100% Identical to Fullscreen Zen Clock) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full opacity-35 filter blur-3xl transition-colors duration-700"
          style={{ backgroundColor: theme.primary }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full opacity-25 filter blur-3xl transition-colors duration-700"
          style={{ backgroundColor: theme.accent }}
        />
        <div className="absolute inset-0 paper-texture opacity-25" />
      </div>

      {/* Center Display: Pure Minimalist Logo & Typography */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6">
        {/* Artistic Calligraphy Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div
            className="absolute inset-0 blur-3xl opacity-35 -z-10 scale-150 transition-colors duration-500"
            style={{ backgroundColor: theme.primary }}
          />
          <h1
            className="text-7xl sm:text-8xl md:text-9xl font-bold font-serif tracking-[0.35em] pl-[0.35em] drop-shadow-sm select-none"
            style={{
              fontFamily: '"Noto Serif SC", "Ma Shan Zheng", Georgia, serif',
              color: theme.primaryDark
            }}
          >
            拾年
          </h1>
        </motion.div>

        {/* Poetic Subtitles */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2"
        >
          <p
            className="text-base sm:text-lg font-serif font-bold tracking-[0.3em] pl-[0.3em] select-none"
            style={{ color: theme.primaryDark }}
          >
            岁华清照 · 拾年归处
          </p>
          <p className="text-xs text-[#6E7C75] font-serif tracking-[0.2em] pl-[0.2em] opacity-80 select-none">
            愿岁月不负所期 · 拾光长卷
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

function NavItem({
  id,
  label,
  icon: IconComp,
  active,
  onClick
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: string;
  onClick: () => void;
}) {
  const isActive = active === id;
  return (
    <motion.button
      type="button"
      id={`nav-item-${id}`}
      onClick={() => {
        sound.playWaterDrop(880);
        onClick();
      }}
      whileTap={{ scale: 0.91 }}
      transition={{ type: 'spring', stiffness: 480, damping: 26 }}
      className={`min-h-[46px] min-w-[50px] flex-1 max-w-[76px] flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-full transition-colors duration-200 select-none touch-manipulation relative ${
        isActive
          ? 'text-[#E88765] font-bold'
          : 'text-[#6E7C75] hover:text-[#2B332E] active:text-[#2B332E]'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="active-floating-dock-pill"
          className="absolute inset-0.5 rounded-full bg-white/80 shadow-xs border border-white/90"
          transition={{ type: 'spring', stiffness: 440, damping: 32 }}
        />
      )}
      <div 
        className={`p-1.5 rounded-full transition-all duration-300 relative z-10 ${
          isActive 
            ? 'text-[#E88765] scale-105' 
            : 'text-current bg-transparent'
        }`}
      >
        <IconComp className="w-4 h-4" />
      </div>
      <span className={`text-[10px] tracking-wider font-serif whitespace-nowrap leading-none transition-colors duration-200 relative z-10 ${
        isActive ? 'text-[#E88765] font-bold' : 'text-[#6E7C75]'
      }`}>
        {label}
      </span>
    </motion.button>
  );
}

function EntranceCard({
  title,
  subtitle,
  icon: IconComp,
  count,
  unit = '项记录',
  onClick,
  isDarkMode = false
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  unit?: string;
  onClick: () => void;
  isDarkMode?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3.5 rounded-2xl border cursor-pointer hover:border-[#E88765]/40 active:border-[#E88765] active:scale-[0.98] transition-all flex flex-col justify-between h-28 group select-none touch-manipulation ${
        isDarkMode
          ? 'bg-[#161D19]/90 border-white/12 text-[#FAF8F5] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
          : 'bg-white border-[#5B7B6D]/15 shadow-sm text-[#2B332E]'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-xl transition-colors ${
          isDarkMode
            ? 'bg-[#222B26] text-[#E88765]'
            : 'bg-[#F2EFE9] text-[#5B7B6D] group-hover:bg-[#FDF0EB] group-hover:text-[#E88765]'
        }`}>
          <IconComp className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-bold text-[#E88765] font-sans">{count} {unit}</span>
      </div>
      <div>
        <h3 className={`font-bold text-sm font-serif group-hover:text-[#E88765] transition-colors ${
          isDarkMode ? 'text-[#FAF8F5]' : 'text-[#2B332E]'
        }`}>
          {title}
        </h3>
        <p className={`text-[10px] font-sans ${isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'}`}>{subtitle}</p>
      </div>
    </div>
  );
}

interface ChronoYearPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
  years: string[];
  yearStats: {
    statsMap: Record<string, {
      total: number;
      timeline: number;
      stories: number;
      artifacts: number;
      people: number;
    }>;
    totalAll: number;
    totals: {
      timeline: number;
      stories: number;
      artifacts: number;
      people: number;
    };
  };
  theme: HealingTheme;
  isDarkMode?: boolean;
}

function ChronoYearPickerModal({
  isOpen: _isOpen,
  onClose,
  selectedYear,
  onSelectYear,
  years,
  yearStats,
  theme,
  isDarkMode = false
}: ChronoYearPickerModalProps) {
  const [filterMode, setFilterMode] = useState<'all_recorded' | 'recent' | 'custom'>('all_recorded');
  const [customYearInput, setCustomYearInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentYearNum = new Date().getFullYear();

  // Filtered years according to user interaction
  const displayedYears = useMemo(() => {
    let list = [...years];
    if (filterMode === 'recent') {
      list = list.filter(y => {
        const num = parseInt(y, 10);
        return !isNaN(num) && (currentYearNum - num <= 3);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(y => y.includes(q));
    }
    return list;
  }, [years, filterMode, searchQuery, currentYearNum]);

  // Max total memories in a single year for relative density bars
  const maxYearCount = useMemo(() => {
    let max = 1;
    Object.values(yearStats.statsMap).forEach(st => {
      if (st.total > max) max = st.total;
    });
    return max;
  }, [yearStats]);

  const handleCustomYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customYearInput.trim();
    if (/^\d{4}$/.test(clean)) {
      onSelectYear(clean);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Dim backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* iOS Modal Sheet Card */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className={`relative w-full max-w-lg rounded-t-[32px] sm:rounded-[28px] border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] z-10 font-sans transform-gpu apple-liquid-glass ${
          isDarkMode
            ? 'bg-[#141A17]/90 border-white/15 text-[#FAF8F5]'
            : 'bg-[#FAF8F5]/95 border-[#5B7B6D]/20 text-[#2B332E]'
        }`}
        style={{
          boxShadow: isDarkMode
            ? '0 -10px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
            : '0 -10px 40px -10px rgba(43, 51, 46, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
          willChange: 'transform'
        }}
      >
        {/* iOS Grabber */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-black/20'}`} />
        </div>

        {/* Modal Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDarkMode ? 'border-white/10 bg-[#1A231F]/80' : 'border-[#5B7B6D]/10 bg-white/40'
        }`}>
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-2xl shadow-xs"
              style={{ backgroundColor: `${theme.primary}20`, color: isDarkMode ? theme.accent : theme.primaryDark }}
            >
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-sm font-serif flex items-center gap-1.5 ${
                isDarkMode ? 'text-[#FAF8F5]' : 'text-[#2B332E]'
              }`}>
                时光纪年 · 岁月回溯
              </h3>
              <p className={`text-[10px] font-serif ${isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'}`}>
                默认全景时光 · 沉淀十载光阴
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-all active:scale-90 ${
              isDarkMode ? 'bg-white/10 text-[#C2CDC7] hover:bg-white/20 hover:text-white' : 'bg-black/5 text-[#6E7C75] hover:bg-black/10 hover:text-[#2B332E]'
            }`}
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Hero Selection Card: 「全景时光」 (Panorama Timeline) */}
          <div
            onClick={() => onSelectYear('all')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              selectedYear === 'all'
                ? isDarkMode
                  ? 'bg-gradient-to-br from-[#1E2823] via-[#161D19] to-[#121815] border-[#E88765] shadow-md ring-2 ring-[#E88765]/30'
                  : 'bg-gradient-to-br from-white via-[#FAF8F5] to-[#F2EFE9] border-[#5B7B6D] shadow-md ring-2 ring-[#5B7B6D]/20'
                : isDarkMode
                  ? 'bg-[#1A221E]/80 border-white/10 hover:border-white/25 hover:bg-[#202B26]'
                  : 'bg-white/80 border-[#5B7B6D]/15 hover:border-[#5B7B6D]/40 hover:bg-white'
            }`}
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    selectedYear === 'all'
                      ? 'bg-[#5B7B6D] text-white shadow-sm'
                      : isDarkMode ? 'bg-[#222B26] text-[#E88765]' : 'bg-[#F2EFE9] text-[#5B7B6D] group-hover:bg-[#E8E4DC]'
                  }`}
                >
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-sm font-serif ${isDarkMode ? 'text-[#FAF8F5]' : 'text-[#2B332E]'}`}>
                      🌟 全景时光 · 浩瀚岁月
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5B7B6D]/20 text-[#E88765] font-medium">
                      默认全览
                    </span>
                  </div>
                  <p className={`text-[11px] mt-0.5 font-serif ${isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'}`}>
                    汇聚全部时光记忆（共 {yearStats.totalAll} 项时光档案）
                  </p>
                </div>
              </div>

              {selectedYear === 'all' ? (
                <div className="w-6 h-6 rounded-full bg-[#5B7B6D] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                </div>
              ) : (
                <span className="text-[11px] font-medium text-[#E88765] opacity-0 group-hover:opacity-100 transition-opacity">
                  切换全览 →
                </span>
              )}
            </div>

            {/* Real-time Category Breakdown in Panorama Card */}
            <div className={`flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t text-[10px] font-sans ${
              isDarkMode ? 'border-white/10 text-[#C2CDC7]' : 'border-[#5B7B6D]/10 text-[#5B7B6D]'
            }`}>
              <span className={`px-2 py-0.5 rounded-md border font-medium shadow-2xs ${
                isDarkMode ? 'bg-[#222B26] border-white/10' : 'bg-white border-[#5B7B6D]/15'
              }`}>
                {yearStats.totals.timeline} 节点
              </span>
              <span className={`px-2 py-0.5 rounded-md border font-medium shadow-2xs ${
                isDarkMode ? 'bg-[#222B26] border-white/10' : 'bg-white border-[#5B7B6D]/15'
              }`}>
                {yearStats.totals.stories} 篇章
              </span>
              <span className={`px-2 py-0.5 rounded-md border font-medium shadow-2xs ${
                isDarkMode ? 'bg-[#222B26] border-white/10' : 'bg-white border-[#5B7B6D]/15'
              }`}>
                {yearStats.totals.artifacts} 旧物
              </span>
              <span className={`px-2 py-0.5 rounded-md border font-medium shadow-2xs ${
                isDarkMode ? 'bg-[#222B26] border-white/10' : 'bg-white border-[#5B7B6D]/15'
              }`}>
                {yearStats.totals.people} 人物
              </span>
            </div>

            {/* Micro subtle sheen bar */}
            {selectedYear === 'all' && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: theme.primary }}
              />
            )}
          </div>

          {/* Quick Filter Navigation Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <div className={`flex items-center gap-1 p-1 rounded-xl w-full sm:w-auto ${
              isDarkMode ? 'bg-white/10' : 'bg-black/5'
            }`}>
              <button
                type="button"
                onClick={() => setFilterMode('all_recorded')}
                className={`flex-1 sm:flex-initial whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  filterMode === 'all_recorded'
                    ? isDarkMode ? 'bg-[#222B26] text-[#FAF8F5] font-semibold' : 'bg-white text-[#2B332E] shadow-2xs font-semibold'
                    : isDarkMode ? 'text-[#A0B0A7] hover:text-white' : 'text-[#6E7C75] hover:text-[#2B332E]'
                }`}
              >
                全部年份 ({years.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('recent')}
                className={`flex-1 sm:flex-initial whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  filterMode === 'recent'
                    ? isDarkMode ? 'bg-[#222B26] text-[#FAF8F5] font-semibold' : 'bg-white text-[#2B332E] shadow-2xs font-semibold'
                    : isDarkMode ? 'text-[#A0B0A7] hover:text-white' : 'text-[#6E7C75] hover:text-[#2B332E]'
                }`}
              >
                近3年
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('custom')}
                className={`flex-1 sm:flex-initial whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  filterMode === 'custom'
                    ? isDarkMode ? 'bg-[#222B26] text-[#FAF8F5] font-semibold' : 'bg-white text-[#2B332E] shadow-2xs font-semibold'
                    : isDarkMode ? 'text-[#A0B0A7] hover:text-white' : 'text-[#6E7C75] hover:text-[#2B332E]'
                }`}
              >
                任意年份
              </button>
            </div>

            {/* Quick Search */}
            {filterMode !== 'custom' && years.length > 4 && (
              <div className="relative w-full sm:w-36">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索年份..."
                  className={`w-full pl-7 pr-2.5 py-1.5 border rounded-xl text-xs focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-[#18201C] border-white/15 text-[#FAF8F5] placeholder-[#A0B0A7]/60'
                      : 'bg-white/80 border-[#5B7B6D]/15 text-[#2B332E]'
                  }`}
                />
                <Search className={`w-3.5 h-3.5 absolute left-2 top-2.5 ${isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'}`} />
              </div>
            )}
          </div>

          {/* Custom Year Direct Input Option */}
          {filterMode === 'custom' ? (
            <form
              onSubmit={handleCustomYearSubmit}
              className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-[#1A221E] border-white/15' : 'bg-white border-[#5B7B6D]/20 shadow-xs'
              }`}
            >
              <div className={`text-xs font-medium font-serif ${isDarkMode ? 'text-[#FAF8F5]' : 'text-[#2B332E]'}`}>
                🧭 快速回溯或筛选任意指定年份：
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1900"
                  max="2099"
                  value={customYearInput}
                  onChange={(e) => setCustomYearInput(e.target.value)}
                  placeholder="例如: 2018 或 2025"
                  className={`flex-1 p-2.5 border rounded-xl text-xs focus:outline-none font-mono ${
                    isDarkMode
                      ? 'bg-[#121815] border-white/15 text-[#FAF8F5] placeholder-[#A0B0A7]/60'
                      : 'bg-[#FAF8F5] border-[#5B7B6D]/20 text-[#2B332E]'
                  }`}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!/^\d{4}$/.test(customYearInput.trim())}
                  className="px-4 py-2.5 bg-[#5B7B6D] text-white rounded-xl text-xs font-bold hover:bg-[#3E564B] transition-all disabled:opacity-40"
                >
                  回溯此年
                </button>
              </div>
              <p className={`text-[10px] ${isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'}`}>
                提示：选择后可针对该特定年份进行记录检索或新增专属时光碎片。
              </p>
            </form>
          ) : (
            /* Year Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedYears.map((yr) => {
                const isCurrentSelected = selectedYear === yr;
                const stats = yearStats.statsMap[yr] || { total: 0, timeline: 0, stories: 0, artifacts: 0, people: 0 };
                const yrNum = parseInt(yr, 10);
                let relativeLabel = '';
                if (!isNaN(yrNum)) {
                  const diff = currentYearNum - yrNum;
                  if (diff === 0) relativeLabel = '今年';
                  else if (diff === 1) relativeLabel = '去年';
                  else if (diff > 1) relativeLabel = `${diff}年前`;
                  else if (diff < 0) relativeLabel = `${Math.abs(diff)}年后`;
                }

                // Calculate relative bar percentage
                const densityPercent = Math.min(100, Math.max(12, (stats.total / maxYearCount) * 100));

                return (
                  <div
                    key={yr}
                    onClick={() => onSelectYear(yr)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group active:scale-[0.98] ${
                      isCurrentSelected
                        ? isDarkMode
                          ? 'bg-[#281E19] border-[#E88765] ring-2 ring-[#E88765]/30'
                          : 'bg-[#FDF0EB] border-[#E88765] shadow-sm ring-2 ring-[#E88765]/25'
                        : isDarkMode
                          ? 'bg-[#1A221E] hover:bg-[#202B26] border-white/10 hover:border-white/20'
                          : 'bg-white hover:bg-[#FAF8F5] border-[#5B7B6D]/15 hover:border-[#5B7B6D]/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-base font-bold font-mono tracking-tight ${
                          isCurrentSelected ? 'text-[#E88765]' : isDarkMode ? 'text-[#FAF8F5]' : 'text-[#2B332E]'
                        }`}>
                          {yr}
                        </span>
                        <span className={`text-xs font-serif ${isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'}`}>年</span>
                        {relativeLabel && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-sans ${
                            isDarkMode ? 'bg-white/10 text-[#A0B0A7]' : 'bg-black/5 text-[#6E7C75]'
                          }`}>
                            {relativeLabel}
                          </span>
                        )}
                      </div>

                      {isCurrentSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#E88765] text-white flex items-center justify-center shadow-2xs">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                          isDarkMode ? 'text-[#E88765] bg-white/10' : 'text-[#5B7B6D] bg-[#F2EFE9]'
                        }`}>
                          {stats.total} 项
                        </span>
                      )}
                    </div>

                    {/* Breakdown Tags */}
                    <div className="flex flex-wrap gap-1 mt-2 text-[9px] font-sans">
                      {stats.timeline > 0 && (
                        <span className={`px-1.5 py-0.5 rounded border ${
                          isDarkMode ? 'bg-white/5 border-white/10 text-[#A0B0A7]' : 'bg-[#FAF8F5] border-[#5B7B6D]/10 text-[#6E7C75]'
                        }`}>
                          {stats.timeline} 节点
                        </span>
                      )}
                      {stats.stories > 0 && (
                        <span className={`px-1.5 py-0.5 rounded border ${
                          isDarkMode ? 'bg-white/5 border-white/10 text-[#A0B0A7]' : 'bg-[#FAF8F5] border-[#5B7B6D]/10 text-[#6E7C75]'
                        }`}>
                          {stats.stories} 篇章
                        </span>
                      )}
                      {stats.artifacts > 0 && (
                        <span className={`px-1.5 py-0.5 rounded border ${
                          isDarkMode ? 'bg-white/5 border-white/10 text-[#A0B0A7]' : 'bg-[#FAF8F5] border-[#5B7B6D]/10 text-[#6E7C75]'
                        }`}>
                          {stats.artifacts} 旧物
                        </span>
                      )}
                      {stats.people > 0 && (
                        <span className={`px-1.5 py-0.5 rounded border ${
                          isDarkMode ? 'bg-white/5 border-white/10 text-[#A0B0A7]' : 'bg-[#FAF8F5] border-[#5B7B6D]/10 text-[#6E7C75]'
                        }`}>
                          {stats.people} 结识
                        </span>
                      )}
                    </div>

                    {/* Density Meter Bar */}
                    <div className={`mt-2.5 w-full h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCurrentSelected ? 'bg-[#E88765]' : 'bg-[#5B7B6D]/60 group-hover:bg-[#5B7B6D]'
                        }`}
                        style={{ width: `${densityPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {displayedYears.length === 0 && (
                <div className={`col-span-full py-8 text-center rounded-2xl border border-dashed text-xs font-serif ${
                  isDarkMode ? 'bg-[#1A221E] border-white/15 text-[#A0B0A7]' : 'bg-white border-[#5B7B6D]/20 text-[#6E7C75]'
                }`}>
                  未找到与当前筛选匹配的年份
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className={`p-3 pb-[max(var(--safe-area-bottom,16px),env(safe-area-inset-bottom,16px),0.75rem)] border-t flex items-center justify-between text-[11px] ${
          isDarkMode ? 'bg-[#18201C]/80 border-white/10 text-[#A0B0A7]' : 'bg-white/70 border-[#5B7B6D]/10 text-[#6E7C75]'
        }`}>
          <span className="font-serif">
            已选状态：
            <strong className={`font-medium ml-1 ${isDarkMode ? 'text-[#FAF8F5]' : 'text-[#2B332E]'}`}>
              {selectedYear === 'all' ? '全景时光（无年份限制）' : `回溯 ${selectedYear} 年档案`}
            </strong>
          </span>
          {selectedYear !== 'all' && (
            <button
              onClick={() => onSelectYear('all')}
              className="text-[#E88765] hover:underline font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> 重置为全景时光
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------
// Apple Liquid Glass Person Group Selection Modal (Matches Top Nav Extension Bar Style)
// ----------------------------------------------------

interface PersonGroupSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  people: Person[];
  allGroupsList: string[];
  onAddGroup: (groupName: string) => void;
  onDeleteGroup: (groupName: string) => void;
  theme: HealingTheme;
  isDarkMode?: boolean;
}

function PersonGroupSelectModal({
  isOpen,
  onClose,
  selectedGroup,
  onSelectGroup,
  people,
  allGroupsList,
  onAddGroup,
  onDeleteGroup,
  theme,
  isDarkMode = false
}: PersonGroupSelectModalProps) {
  const [newGroupInput, setNewGroupInput] = useState('');
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none animate-fadeIn">
      {/* Dim backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#2B332E]/45 backdrop-blur-xs"
      />

      {/* Apple Liquid Glass Card */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 8 }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        className={`relative w-full max-w-xs apple-liquid-glass rounded-3xl p-4 shadow-2xl border z-10 font-sans space-y-3 ${
          isDarkMode
            ? 'bg-[#141B18]/94 border-white/15 text-[#FAF8F5]'
            : 'bg-white/92 border-white/85 text-[#2B332E]'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-2 border-b ${
          isDarkMode ? 'border-white/10' : 'border-black/5'
        }`}>
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-xl flex items-center justify-center shadow-2xs"
              style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}
            >
              <Folder className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-bold font-serif tracking-wide">选择所属分组</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] dark:hover:text-white rounded-full hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Group List */}
        <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1 py-0.5">
          {allGroupsList.map((groupName) => {
            const isSelected = (selectedGroup || '未分组') === groupName;
            const count = people.filter(p => (p.group || '未分组') === groupName).length;

            return (
              <button
                key={groupName}
                type="button"
                onClick={() => {
                  sound.playHapticClick(1200);
                  onSelectGroup(groupName);
                }}
                className={`w-full px-3 py-2 rounded-2xl flex items-center justify-between text-xs transition-all active:scale-[0.98] cursor-pointer group ${
                  isSelected
                    ? isDarkMode
                      ? 'bg-white/15 font-semibold text-white'
                      : 'bg-black/5 font-semibold text-[#2B332E]'
                    : isDarkMode
                      ? 'text-white/70 hover:bg-white/5 hover:text-white'
                      : 'text-[#526058] hover:bg-black/[0.03] hover:text-[#2B332E]'
                }`}
              >
                <div className="flex items-center gap-2 truncate mr-1">
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                      isSelected ? 'scale-100' : 'scale-0 opacity-0'
                    }`}
                    style={{ backgroundColor: theme.primary }}
                  />
                  <span className="font-serif truncate">{groupName}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {groupName !== '未分组' && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.playWaterDrop(600);
                        setGroupToDelete(groupName);
                      }}
                      className="p-1 rounded-lg text-[#6E7C75]/60 hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
                      title="删除此分组"
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  )}
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    isSelected
                      ? isDarkMode ? 'bg-white/20 text-white' : 'bg-black/10 text-[#2B332E]'
                      : isDarkMode ? 'bg-white/5 text-white/50' : 'bg-black/5 text-[#6E7C75]'
                  }`}>
                    {count} 人
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5" style={{ color: theme.primary }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Delete Confirmation mini prompt if triggered */}
        {groupToDelete && (
          <div className={`p-2.5 rounded-2xl border text-xs space-y-2 animate-fadeIn ${
            isDarkMode ? 'bg-red-950/40 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <p className="font-serif text-[11px]">
              确认删除分组「{groupToDelete}」吗？
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                className="flex-1 py-1 rounded-xl bg-white/80 dark:bg-white/10 text-[10px] font-serif hover:bg-black/5 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteGroup(groupToDelete);
                  setGroupToDelete(null);
                }}
                className="flex-1 py-1 rounded-xl bg-red-600 text-white text-[10px] font-serif font-bold hover:bg-red-700 cursor-pointer"
              >
                删除
              </button>
            </div>
          </div>
        )}

        {/* Bottom Action: Integrated Compact "+ 添加好友分组" */}
        <div className={`pt-2 mt-1.5 border-t box-border ${
          isDarkMode ? 'border-white/10' : 'border-black/5'
        }`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = newGroupInput.trim();
              if (val) {
                onAddGroup(val);
                setNewGroupInput('');
                onSelectGroup(val);
              }
            }}
            className="flex items-center gap-1.5 w-full box-border"
          >
            <input
              type="text"
              value={newGroupInput}
              onChange={(e) => setNewGroupInput(e.target.value)}
              placeholder="新建分组..."
              className={`min-w-0 flex-1 px-2.5 py-1.5 text-xs rounded-xl border font-serif outline-none transition-all box-border ${
                isDarkMode
                  ? 'bg-black/25 border-white/15 text-white placeholder-white/30 focus:border-white/40'
                  : 'bg-white/90 border-black/10 text-[#2B332E] placeholder-[#6E7C75]/60 focus:border-black/30'
              }`}
            />
            <button
              type="submit"
              disabled={!newGroupInput.trim()}
              className={`px-3 py-1.5 rounded-xl text-xs font-serif font-medium flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                newGroupInput.trim()
                  ? 'text-white active:scale-95'
                  : 'opacity-35 cursor-not-allowed text-[#6E7C75]'
              }`}
              style={{
                backgroundColor: newGroupInput.trim()
                  ? theme.primary
                  : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
              }}
            >
              <Plus className="w-3 h-3" />
              <span>添加</span>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------
// iOS Styled QQ Friend Group Sheet Modal
// ----------------------------------------------------

interface FriendGroupPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  people: Person[];
  customGroups: string[];
  onAddGroup: (groupName: string) => void;
  onDeleteGroup: (groupName: string) => void;
  theme: HealingTheme;
  isDarkMode?: boolean;
}

function FriendGroupPickerModal({
  isOpen: _isOpen,
  onClose,
  selectedGroup,
  onSelectGroup,
  people,
  customGroups,
  onAddGroup,
  onDeleteGroup,
  theme,
  isDarkMode = false
}: FriendGroupPickerModalProps) {
  const [filterMode, setFilterMode] = useState<'all_groups' | 'create_group'>('all_groups');
  const [newGroupNameInput, setNewGroupNameInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  // Collect all unique group names
  const allGroups = useMemo(() => {
    const set = new Set<string>([...customGroups, ...people.map(p => p.group || '未分组')]);
    const list = Array.from(set).filter(Boolean);
    return [
      ...list.filter(g => g !== '未分组'),
      ...(list.includes('未分组') ? ['未分组'] : [])
    ];
  }, [customGroups, people]);

  // Group stats & members map
  const groupStatsMap = useMemo(() => {
    const map: Record<string, Person[]> = {};
    allGroups.forEach(g => {
      map[g] = people.filter(p => (p.group || '未分组') === g);
    });
    return map;
  }, [allGroups, people]);

  const displayedGroups = useMemo(() => {
    let list = [...allGroups];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(g => {
        if (g.toLowerCase().includes(q)) return true;
        const members = groupStatsMap[g] || [];
        return members.some(m => m.name.toLowerCase().includes(q));
      });
    }
    return list;
  }, [allGroups, searchQuery, groupStatsMap]);

  const maxGroupCount = useMemo(() => {
    let max = 1;
    (Object.values(groupStatsMap) as Person[][]).forEach(list => {
      if (list && list.length > max) max = list.length;
    });
    return max;
  }, [groupStatsMap]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newGroupNameInput.trim();
    if (clean) {
      onAddGroup(clean);
      setNewGroupNameInput('');
      setFilterMode('all_groups');
      onSelectGroup(clean);
    }
  };

  const presetSuggestions = ['高中密友', '摄影伙伴', '工作搭子', '社团同道', '旅行驴友', '家族亲人', '导师同门'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Dim backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* iOS Modal Sheet Card */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className={`relative w-full max-w-lg rounded-t-[32px] sm:rounded-[28px] border shadow-none overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] z-10 font-sans backdrop-blur-xl transform-gpu ${
          isDarkMode
            ? 'bg-[#151D18]/95 text-emerald-50 border-emerald-500/30'
            : 'bg-[#FAF8F5]/95 text-[#2B332E] border-[#5B7B6D]/20'
        }`}
        style={{
          boxShadow: 'none',
          willChange: 'transform'
        }}
      >
        {/* iOS Grabber */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-black/20'}`} />
        </div>

        {/* Modal Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDarkMode ? 'border-emerald-500/20 bg-black/20' : 'border-[#5B7B6D]/10 bg-white/40'
        }`}>
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-2xl shadow-xs"
              style={{ backgroundColor: `${theme.primary}25`, color: isDarkMode ? '#86EFAC' : theme.primaryDark }}
            >
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-sm font-serif flex items-center gap-1.5 ${
                isDarkMode ? 'text-emerald-100' : 'text-[#2B332E]'
              }`}>
                好友分组 · 拾人图谱
              </h3>
              <p className={`text-[10px] font-serif ${isDarkMode ? 'text-emerald-400/80' : 'text-[#6E7C75]'}`}>
                沉淀相遇缘起
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-all active:scale-90 ${
              isDarkMode
                ? 'bg-white/10 hover:bg-white/20 text-emerald-200'
                : 'bg-black/5 hover:bg-black/10 text-[#6E7C75] hover:text-[#2B332E]'
            }`}
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Hero Selection Card: 「全部好友」 (All Friends) */}
          <div
            onClick={() => onSelectGroup('all')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              selectedGroup === 'all'
                ? isDarkMode
                  ? 'bg-gradient-to-br from-emerald-950/80 via-emerald-900/40 to-black/60 border-emerald-500/60 shadow-lg ring-2 ring-emerald-500/30'
                  : 'bg-gradient-to-br from-white via-[#FAF8F5] to-[#F2EFE9] border-[#5B7B6D] shadow-md ring-2 ring-[#5B7B6D]/20'
                : isDarkMode
                  ? 'bg-white/5 border-emerald-500/15 hover:border-emerald-500/30 hover:bg-white/10'
                  : 'bg-white/80 border-[#5B7B6D]/15 hover:border-[#5B7B6D]/40 hover:bg-white'
            }`}
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    selectedGroup === 'all'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDarkMode
                        ? 'bg-emerald-900/50 text-emerald-300'
                        : 'bg-[#F2EFE9] text-[#5B7B6D] group-hover:bg-[#E8E4DC]'
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-sm font-serif ${isDarkMode ? 'text-emerald-100' : 'text-[#2B332E]'}`}>
                      🌟 全部好友 · 拾人全览
                    </h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#5B7B6D]/10 text-[#5B7B6D]'
                    }`}>
                      默认全览
                    </span>
                  </div>
                  <p className={`text-[11px] mt-0.5 font-serif ${isDarkMode ? 'text-emerald-300/70' : 'text-[#6E7C75]'}`}>
                    汇聚全部相遇的同路人（共 {people.length} 位好友）
                  </p>
                </div>
              </div>

              {selectedGroup === 'all' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                </div>
              ) : (
                <span className={`text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDarkMode ? 'text-emerald-400' : 'text-[#5B7B6D]'
                }`}>
                  切换全览 →
                </span>
              )}
            </div>

            {selectedGroup === 'all' && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: isDarkMode ? '#10B981' : theme.primary }}
              />
            )}
          </div>

          {/* Quick Filter Navigation Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <div className={`flex items-center gap-1 p-1 rounded-xl w-full sm:w-auto ${
              isDarkMode ? 'bg-white/5' : 'bg-black/5'
            }`}>
              <button
                type="button"
                onClick={() => setFilterMode('all_groups')}
                className={`flex-1 sm:flex-initial whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  filterMode === 'all_groups'
                    ? isDarkMode
                      ? 'bg-emerald-900/60 text-emerald-100 shadow-2xs font-semibold'
                      : 'bg-white text-[#2B332E] shadow-2xs font-semibold'
                    : isDarkMode
                      ? 'text-emerald-400 hover:text-emerald-200'
                      : 'text-[#6E7C75] hover:text-[#2B332E]'
                }`}
              >
                全部已建分组 ({allGroups.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('create_group')}
                className={`flex-1 sm:flex-initial whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  filterMode === 'create_group'
                    ? isDarkMode
                      ? 'bg-emerald-900/60 text-emerald-100 shadow-2xs font-semibold'
                      : 'bg-white text-[#2B332E] shadow-2xs font-semibold'
                    : isDarkMode
                      ? 'text-emerald-400 hover:text-emerald-200'
                      : 'text-[#6E7C75] hover:text-[#2B332E]'
                }`}
              >
                + 新建分组
              </button>
            </div>

            {/* Quick Search */}
            {filterMode === 'all_groups' && allGroups.length > 2 && (
              <div className="relative w-full sm:w-40">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索分组或成员..."
                  className={`w-full pl-7 pr-2.5 py-1.5 rounded-xl text-xs focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-white/10 border border-emerald-500/20 text-emerald-100 placeholder:text-emerald-400/50 focus:border-emerald-400'
                      : 'bg-white/80 border border-[#5B7B6D]/15 text-[#2B332E] focus:border-[#5B7B6D]'
                  }`}
                />
                <Search className={`w-3.5 h-3.5 absolute left-2 top-2.5 ${isDarkMode ? 'text-emerald-400' : 'text-[#6E7C75]'}`} />
              </div>
            )}
          </div>

          {/* Create Group Tab View */}
          {filterMode === 'create_group' ? (
            <div className={`p-4 rounded-2xl border shadow-xs space-y-3.5 ${
              isDarkMode ? 'bg-white/5 border-emerald-500/20' : 'bg-white border-[#5B7B6D]/20'
            }`}>
              <div className={`text-xs font-medium font-serif flex items-center gap-1.5 ${
                isDarkMode ? 'text-emerald-200' : 'text-[#2B332E]'
              }`}>
                <FolderPlus className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-[#5B7B6D]'}`} /> 自定义新建好友分组：
              </div>
              <form onSubmit={handleCreateSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={newGroupNameInput}
                  onChange={(e) => setNewGroupNameInput(e.target.value)}
                  placeholder="例如: 高中密友、摄影伙伴、工作搭子"
                  className={`flex-1 p-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-black/30 border border-emerald-500/25 text-emerald-100 placeholder:text-emerald-400/50 focus:border-emerald-400'
                      : 'bg-[#FAF8F5] border border-[#5B7B6D]/20 text-[#2B332E] focus:border-[#E88765]'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!newGroupNameInput.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-40 select-none touch-manipulation min-h-[44px]"
                >
                  创建并筛选
                </button>
              </form>

              <div>
                <span className={`text-[10px] block mb-1.5 ${isDarkMode ? 'text-emerald-400/80' : 'text-[#6E7C75]'}`}>
                  推荐快捷灵感：
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {presetSuggestions.map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        onAddGroup(sug);
                        setFilterMode('all_groups');
                        onSelectGroup(sug);
                      }}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                        isDarkMode
                          ? 'bg-white/5 border-emerald-500/20 text-emerald-300 hover:border-emerald-400 hover:text-emerald-100'
                          : 'bg-[#FAF8F5] border-[#5B7B6D]/15 text-[#6E7C75] hover:border-[#5B7B6D] hover:text-[#2B332E]'
                      }`}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Groups Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedGroups.map(grpName => {
                const isCurrentSelected = selectedGroup === grpName;
                const members = groupStatsMap[grpName] || [];
                const count = members.length;
                const densityPercent = Math.min(100, Math.max(12, (count / maxGroupCount) * 100));

                return (
                  <div
                    key={grpName}
                    onClick={() => onSelectGroup(grpName)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group active:scale-[0.98] ${
                      isCurrentSelected
                        ? isDarkMode
                          ? 'bg-emerald-900/40 border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                          : 'bg-[#FDF0EB] border-[#E88765] shadow-sm ring-2 ring-[#E88765]/25'
                        : isDarkMode
                          ? 'bg-white/5 border-emerald-500/15 hover:border-emerald-500/30 hover:bg-white/10'
                          : 'bg-white hover:bg-[#FAF8F5] border-[#5B7B6D]/15 hover:border-[#5B7B6D]/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${
                            isCurrentSelected
                              ? 'bg-emerald-500 text-white'
                              : isDarkMode
                                ? 'bg-white/10 text-emerald-300 border border-emerald-500/20'
                                : 'bg-[#FAF8F5] text-[#5B7B6D] border border-[#5B7B6D]/15'
                          }`}
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-sm font-bold font-serif ${
                          isCurrentSelected
                            ? isDarkMode ? 'text-emerald-300' : 'text-[#E88765]'
                            : isDarkMode ? 'text-emerald-100' : 'text-[#2B332E]'
                        }`}>
                          {grpName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {grpName !== '未分组' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroupToDelete(grpName);
                            }}
                            className="p-1 text-red-400/60 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all opacity-60 hover:opacity-100"
                            title={`删除「${grpName}」分组`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isCurrentSelected ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                            isDarkMode ? 'text-emerald-300 bg-emerald-950/60' : 'text-[#5B7B6D] bg-[#F2EFE9]'
                          }`}>
                            {count} 人
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Member Avatars Overlapping Stack & Names Preview */}
                    <div className={`flex items-center justify-between gap-2 mt-2.5 pt-2 border-t ${
                      isDarkMode ? 'border-emerald-500/15' : 'border-[#5B7B6D]/10'
                    }`}>
                      <div className="flex items-center">
                        {members.slice(0, 3).map((m) => (
                          <img
                            key={m.id}
                            src={m.avatar}
                            alt={m.name}
                            className={`w-5 h-5 rounded-full object-cover border-2 shadow-2xs -ml-1.5 first:ml-0 ${
                              isDarkMode ? 'border-[#151D18]' : 'border-white'
                            }`}
                          />
                        ))}
                        {members.length > 3 && (
                          <span className={`w-5 h-5 rounded-full border text-[9px] font-bold flex items-center justify-center -ml-1.5 ${
                            isDarkMode
                              ? 'bg-emerald-900 border-[#151D18] text-emerald-300'
                              : 'bg-[#F2EFE9] border-white text-[#6E7C75]'
                          }`}>
                            +{members.length - 3}
                          </span>
                        )}
                      </div>

                      <div className={`text-[10px] truncate max-w-[150px] font-serif ${
                        isDarkMode ? 'text-emerald-400/70' : 'text-[#6E7C75]'
                      }`}>
                        {members.length > 0
                          ? members.map(m => m.name).join('、')
                          : '暂无成员归类'}
                      </div>
                    </div>

                    {/* Density Meter Bar */}
                    <div className="mt-2.5 w-full bg-black/10 h-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCurrentSelected
                            ? 'bg-emerald-500'
                            : isDarkMode
                              ? 'bg-emerald-500/40 group-hover:bg-emerald-400'
                              : 'bg-[#5B7B6D]/60 group-hover:bg-[#5B7B6D]'
                        }`}
                        style={{ width: `${densityPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {displayedGroups.length === 0 && (
                <div className={`col-span-full py-8 text-center rounded-2xl border border-dashed text-xs font-serif ${
                  isDarkMode
                    ? 'bg-white/5 border-emerald-500/20 text-emerald-400/60'
                    : 'bg-white border-[#5B7B6D]/20 text-[#6E7C75]'
                }`}>
                  未找到与搜索匹配的分组
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 pb-[max(var(--safe-area-bottom,16px),env(safe-area-inset-bottom,16px),0.75rem)] bg-white/70 border-t border-[#5B7B6D]/10 flex items-center justify-between text-[11px] text-[#6E7C75]">
          <span className="font-serif">
            已选状态：
            <strong className="text-[#2B332E] font-medium ml-1">
              {selectedGroup === 'all' ? '全部好友（无分组限制）' : `仅浏览「${selectedGroup}」分组`}
            </strong>
          </span>
          {selectedGroup !== 'all' && (
            <button
              onClick={() => onSelectGroup('all')}
              className="text-[#E88765] hover:underline font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> 重置为全部好友
            </button>
          )}
        </div>

        {/* Delete Group Confirmation Modal */}
        {groupToDelete && (
          <div
            className="absolute inset-0 bg-[#2B332E]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn font-sans"
            onClick={(e) => {
              e.stopPropagation();
              setGroupToDelete(null);
            }}
          >
            <div
              className="bg-[#FAF8F5] w-full max-w-xs p-5 rounded-3xl border border-[#5B7B6D]/20 shadow-2xl text-center space-y-4 paper-texture"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-2xs"
                style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
              >
                <Trash2 className="w-5 h-5" style={{ color: '#DC2626' }} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#2B332E] text-sm font-serif">确认删除该好友分组吗？</h3>
                <p className="text-xs text-[#6E7C75] font-serif bg-white/80 py-1 px-2.5 rounded-xl border border-[#5B7B6D]/15 inline-block max-w-full truncate">
                  分组：{groupToDelete}
                </p>
                <p className="text-[11px] text-[#6E7C75]/80 leading-relaxed font-sans pt-0.5">
                  删除后该分组下的好友将自动归入「未分组」，好友档案数据不会丢失
                </p>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setGroupToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/25 bg-white text-[#6E7C75] text-xs font-semibold hover:bg-[#F2EFE9] transition-all active:scale-95 shadow-2xs"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteGroup(groupToDelete);
                    setGroupToDelete(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all active:scale-95 hover:brightness-110"
                  style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: '1px solid #B91C1C' }}
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
