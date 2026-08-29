import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  LockOpen,
  Sparkles,
  Download,
  Upload,
  Volume2,
  X,
  MapPin,
  Clock,
  Users,
  BookOpen,
  Package,
  Mail,
  MailOpen,
  Plus,
  Calendar,
  CalendarRange,
  Compass,
  ChevronDown,
  Trash2,
  Edit3,
  Bot,
  Send,
  Wand2,
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
  FolderPlus,
  FolderOpen,
  Copy,
  MessageCircle,
  Phone
} from 'lucide-react';
import { AppData, Person, Story, Artifact, Letter, ChatMessage } from './types';
import { INITIAL_SEED } from './data/initialData';
import { LocalImageUploader, PRESET_AVATARS, compressImageFile } from './components/LocalImageUploader';

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
}

export const HEALING_THEMES: HealingTheme[] = [
  {
    id: 'breeze-sage',
    name: '松烟青瓷',
    enName: 'Pine & Celadon',
    quote: '如雨过天青，沉静温润',
    primary: '#5B7B6D',
    primaryDark: '#3E564B',
    accent: '#E88765',
    accentLight: '#FDF0EB',
    paper: '#F2EFE9',
    canvas: '#FAF8F5',
    primaryRgb: '91, 123, 109',
    primaryDarkRgb: '62, 86, 75',
    accentRgb: '232, 135, 101'
  },
  {
    id: 'mist-lavender',
    name: '暮山晚紫',
    enName: 'Twilight Iris',
    quote: '山黛晚照，温柔如初',
    primary: '#5D5580',
    primaryDark: '#443D61',
    accent: '#D97757',
    accentLight: '#F7EDE9',
    paper: '#EEEBF5',
    canvas: '#FAF8FC',
    primaryRgb: '93, 85, 128',
    primaryDarkRgb: '68, 61, 97',
    accentRgb: '217, 119, 87'
  },
  {
    id: 'spring-tea',
    name: '春水煎茶',
    enName: 'Spring Matcha',
    quote: '嫩芽初绽，满院草木清香',
    primary: '#43765A',
    primaryDark: '#2E553F',
    accent: '#C87F3B',
    accentLight: '#FAF1E8',
    paper: '#EBF3EC',
    canvas: '#F7FAF7',
    primaryRgb: '67, 118, 90',
    primaryDarkRgb: '46, 85, 63',
    accentRgb: '200, 127, 59'
  },
  {
    id: 'cherry-sakura',
    name: '山樱初雪',
    enName: 'Sakura & Frost',
    quote: '落樱如雪，春光细语温柔',
    primary: '#9C5874',
    primaryDark: '#753C54',
    accent: '#4B7B75',
    accentLight: '#EBF4F2',
    paper: '#F7EDF1',
    canvas: '#FCF7F9',
    primaryRgb: '156, 88, 116',
    primaryDarkRgb: '117, 60, 84',
    accentRgb: '75, 123, 117'
  },
  {
    id: 'warm-amber',
    name: '落叶琥珀',
    enName: 'Autumn Amber',
    quote: '暖阳斜照，满地金黄焦糖香',
    primary: '#9E5B32',
    primaryDark: '#753F1E',
    accent: '#3D7A68',
    accentLight: '#EBF5F1',
    paper: '#F7EFE8',
    canvas: '#FCFAF7',
    primaryRgb: '158, 91, 50',
    primaryDarkRgb: '117, 63, 30',
    accentRgb: '61, 122, 104'
  },
  {
    id: 'ocean-glaze',
    name: '海盐雾蓝',
    enName: 'Nordic Mist',
    quote: '晨雾初散，海盐与远方清风',
    primary: '#3E6F8E',
    primaryDark: '#294F66',
    accent: '#C77558',
    accentLight: '#FBF0EB',
    paper: '#EBF1F6',
    canvas: '#F7FAFD',
    primaryRgb: '62, 111, 142',
    primaryDarkRgb: '41, 79, 102',
    accentRgb: '199, 117, 88'
  },
  {
    id: 'bamboo-ink',
    name: '竹林青黛',
    enName: 'Bamboo & Slate',
    quote: '青石阶前，竹影随清风婆娑',
    primary: '#386660',
    primaryDark: '#234742',
    accent: '#BA7A40',
    accentLight: '#F8F1E9',
    paper: '#EAF0EE',
    canvas: '#F6F9F8',
    primaryRgb: '56, 102, 96',
    primaryDarkRgb: '35, 71, 66',
    accentRgb: '186, 122, 64'
  },
  {
    id: 'vintage-wine',
    name: '晚风勃艮第',
    enName: 'Vintage Burgundy',
    quote: '壁炉微火，老黑胶唱片醇香',
    primary: '#7E434D',
    primaryDark: '#5E2D35',
    accent: '#477B70',
    accentLight: '#EBF5F2',
    paper: '#F5ECEE',
    canvas: '#FAF6F7',
    primaryRgb: '126, 67, 77',
    primaryDarkRgb: '94, 45, 53',
    accentRgb: '71, 123, 112'
  }
];

type TabType = 'home' | 'timeline' | 'people' | 'stories' | 'artifacts' | 'letters';

// In-memory TTS audio cache map to prevent redundant API calls and save quota
const ttsAudioCache = new Map<string, string>();

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const local = localStorage.getItem('shinian_app_data_v3');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.people && parsed.people.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse local storage', e);
      }
    }
    return INITIAL_SEED;
  });

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [isYearPickerOpen, setIsYearPickerOpen] = useState<boolean>(false);
  const [themeId, setThemeId] = useState<string>(() => localStorage.getItem('shinian_theme_id') || 'breeze-sage');
  const [isThemePickerOpen, setIsThemePickerOpen] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => localStorage.getItem('shinian_is_locked') === 'true');
  const [lockPin, setLockPin] = useState<string>(() => localStorage.getItem('shinian_lock_pin') || '1234');
  const [pinInput, setPinInput] = useState<string>('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [readerStory, setReaderStory] = useState<Story | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Auto-dismiss splash screen after 2.5 seconds
  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2600);
    return () => clearTimeout(timer);
  }, [showSplash]);

  const currentTheme = useMemo(() => {
    return HEALING_THEMES.find(t => t.id === themeId) || HEALING_THEMES[0];
  }, [themeId]);

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
  }, [currentTheme]);

  // Custom UI Notifications & Dialogs
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, duration = 1500) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  };

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
  const [newImpressionYear, setNewImpressionYear] = useState<string>(new Date().getFullYear().toString());
  const [newImpressionText, setNewImpressionText] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{ type: keyof AppData; id: string; name: string } | null>(null);

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

  // Modal Local Image Upload States
  const [formTimelineImage, setFormTimelineImage] = useState<string>('');
  const [formPersonAvatar, setFormPersonAvatar] = useState<string>('');
  const [formPersonRel, setFormPersonRel] = useState<string>('挚友');
  const [formPersonGroup, setFormPersonGroup] = useState<string>('未分组');
  const [formArtifactImage, setFormArtifactImage] = useState<string>('');
  const [editPersonAvatar, setEditPersonAvatar] = useState<string>('');
  const [editPersonRel, setEditPersonRel] = useState<string>('');
  const [editPersonGroup, setEditPersonGroup] = useState<string>('未分组');

  // People grouping & top status bar state
  const [selectedPersonGroup, setSelectedPersonGroup] = useState<string>('all');
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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isAddingGroup, setIsAddingGroup] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [movingPerson, setMovingPerson] = useState<Person | null>(null);

  // Story Edit State
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  // Letter Unsealing Animation State
  const [isUnsealingLetter, setIsUnsealingLetter] = useState<boolean>(false);

  const filteredPeople = useMemo(() => {
    return data.people.filter(p => {
      if (selectedPersonGroup === 'all') return true;
      return (p.group || '未分组') === selectedPersonGroup;
    });
  }, [data.people, selectedPersonGroup]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('shinian_app_data_v3', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('shinian_custom_groups', JSON.stringify(customGroups));
  }, [customGroups]);

  // Mobile Hardware / Gesture Back Button Interception (Full Android Native Stack)
  // Priority: Confirm Dialogs -> Sub Modals/Drawers -> Detail Readers -> Secondary Tabs -> Double Tap to Exit App
  const lastBackPressRef = useRef<number>(0);
  const mainContentRef = useRef<HTMLElement | null>(null);

  const currentOpenLayer = useMemo(() => {
    if (confirmDialog) return `confirm-dialog-${confirmDialog.id}`;
    if (movingPerson) return `moving-person-${movingPerson.id}`;
    if (isAddingGroup) return 'adding-group';
    if (isChangingPin) return 'changing-pin';
    if (activeModal) return `modal-${activeModal}`;
    if (editingStory) return `edit-story-${editingStory.id}`;
    if (readerStory) return `story-${readerStory.id}`;
    if (selectedPerson) return `person-${selectedPerson.id}`;
    if (selectedArtifact) return `artifact-${selectedArtifact.id}`;
    if (selectedLetter) return `letter-${selectedLetter.id}`;
    if (isGroupPickerOpen) return 'group-picker';
    if (isThemePickerOpen) return 'theme-picker';
    if (isVoicePickerModalOpen) return 'voice-picker';
    if (isYearPickerOpen) return 'year-picker';
    if (activeTab !== 'home') return `tab-${activeTab}`;
    return null;
  }, [
    confirmDialog,
    movingPerson,
    isAddingGroup,
    isChangingPin,
    activeModal,
    editingStory,
    readerStory,
    selectedPerson,
    selectedArtifact,
    selectedLetter,
    isGroupPickerOpen,
    isThemePickerOpen,
    isVoicePickerModalOpen,
    isYearPickerOpen,
    activeTab,
  ]);

  const prevLayerRef = useRef<string | null>(null);
  const isPoppingStateRef = useRef<boolean>(false);

  useEffect(() => {
    if (isPoppingStateRef.current) {
      isPoppingStateRef.current = false;
      prevLayerRef.current = currentOpenLayer;
      return;
    }

    if (currentOpenLayer && currentOpenLayer !== prevLayerRef.current) {
      window.history.pushState({ layer: currentOpenLayer }, '');
    }
    prevLayerRef.current = currentOpenLayer;
  }, [currentOpenLayer]);

  // Unified Android Back Button Consumer
  const handleNativeBackAction = useCallback((): boolean => {
    // 1. Confirm dialog
    if (confirmDialog) {
      setConfirmDialog(null);
      return true;
    }
    // 2. Move person dialog
    if (movingPerson) {
      setMovingPerson(null);
      return true;
    }
    // 3. Add group popup
    if (isAddingGroup) {
      setIsAddingGroup(false);
      return true;
    }
    // 4. Change PIN popup
    if (isChangingPin) {
      setIsChangingPin(false);
      return true;
    }
    // 5. Active modal (add/edit items, backups, search)
    if (activeModal) {
      setActiveModal(null);
      return true;
    }
    // 6. Story edit modal
    if (editingStory) {
      setEditingStory(null);
      return true;
    }
    // 7. Full-screen story reader
    if (readerStory) {
      setReaderStory(null);
      return true;
    }
    // 8. Person detail modal / editor
    if (selectedPerson) {
      if (isEditingPerson) {
        setIsEditingPerson(false);
      } else {
        setSelectedPerson(null);
      }
      return true;
    }
    // 9. Artifact detail modal
    if (selectedArtifact) {
      setSelectedArtifact(null);
      return true;
    }
    // 10. Letter modal
    if (selectedLetter) {
      setSelectedLetter(null);
      return true;
    }
    // 11. Bottom drawer pickers
    if (isGroupPickerOpen) {
      setIsGroupPickerOpen(false);
      return true;
    }
    if (isThemePickerOpen) {
      setIsThemePickerOpen(false);
      return true;
    }
    if (isVoicePickerModalOpen) {
      setIsVoicePickerModalOpen(false);
      return true;
    }
    if (isYearPickerOpen) {
      setIsYearPickerOpen(false);
      return true;
    }
    // 12. Return from secondary tabs back to home
    if (activeTab !== 'home') {
      setActiveTab('home');
      return true;
    }

    // 13. On Home tab with zero modals open: Double-tap back button to exit
    const now = Date.now();
    if (now - lastBackPressRef.current < 2000) {
      try {
        (window as any).Capacitor?.Plugins?.App?.exitApp?.();
      } catch (e) {}
      return false;
    } else {
      lastBackPressRef.current = now;
      showToast('再按一次返回键退出「拾年」', 1800);
      return true;
    }
  }, [
    confirmDialog,
    movingPerson,
    isAddingGroup,
    isChangingPin,
    activeModal,
    editingStory,
    readerStory,
    selectedPerson,
    isEditingPerson,
    selectedArtifact,
    selectedLetter,
    isGroupPickerOpen,
    isThemePickerOpen,
    isVoicePickerModalOpen,
    isYearPickerOpen,
    activeTab,
  ]);

  // Web PopState Listener
  useEffect(() => {
    const handlePopState = () => {
      isPoppingStateRef.current = true;
      handleNativeBackAction();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleNativeBackAction]);

  // Android Capacitor & Cordova Hardware Back Button Listener
  useEffect(() => {
    const onDocumentBackButton = (e: Event) => {
      e.preventDefault();
      handleNativeBackAction();
    };

    document.addEventListener('backbutton', onDocumentBackButton as any);

    // If Capacitor App plugin is available
    let capacitorListener: any = null;
    const capacitorApp = (window as any).Capacitor?.Plugins?.App;
    if (capacitorApp?.addListener) {
      capacitorApp.addListener('backButton', () => {
        handleNativeBackAction();
      }).then((listener: any) => {
        capacitorListener = listener;
      }).catch(() => {});
    }

    return () => {
      document.removeEventListener('backbutton', onDocumentBackButton as any);
      if (capacitorListener?.remove) {
        capacitorListener.remove();
      }
    };
  }, [handleNativeBackAction]);

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
      impressions: number;
      people: number;
      letters: number;
    }> = {};

    let totalImpressions = 0;
    data.people.forEach(p => {
      totalImpressions += (p.impressions?.length || 0);
    });

    const totalAll = data.timeline.length + data.stories.length + data.artifacts.length + data.people.length + data.letters.length + totalImpressions;

    years.forEach(y => {
      const tCount = data.timeline.filter(t => getYearFromDate(t.date) === y).length;
      const sCount = data.stories.filter(s => getYearFromDate(s.date) === y).length;
      const aCount = data.artifacts.filter(a => getYearFromDate(a.date) === y).length;
      const pCount = data.people.filter(p => getYearFromDate(p.knownDate) === y).length;
      const lCount = data.letters.filter(l => getYearFromDate(l.date) === y || getYearFromDate(l.unlockDate) === y).length;
      let iCount = 0;
      data.people.forEach(p => {
        iCount += (p.impressions?.filter(imp => imp.year === y).length || 0);
      });

      const yrTotal = tCount + sCount + aCount + pCount + lCount + iCount;
      statsMap[y] = {
        total: yrTotal,
        timeline: tCount,
        stories: sCount,
        artifacts: aCount,
        impressions: iCount,
        people: pCount,
        letters: lCount,
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
        impressions: totalImpressions,
        letters: data.letters.length,
      }
    };
  }, [data, years, getYearFromDate]);

  // Adjust selectedYear if the active selectedYear no longer exists
  useEffect(() => {
    if (selectedYear !== 'all' && !years.includes(selectedYear)) {
      setSelectedYear('all');
    }
  }, [years, selectedYear]);

  const [highlightIndex, setHighlightIndex] = useState<number>(0);
  const todayHighlight = useMemo(() => {
    if (!data.timeline.length) return null;
    return data.timeline[highlightIndex % data.timeline.length];
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
      year: newImpressionYear || new Date().getFullYear().toString(),
      text: newImpressionText.trim()
    };
    const updatedImpressions = [newImp, ...(selectedPerson.impressions || [])];
    handleUpdatePerson({ impressions: updatedImpressions });
    setNewImpressionText('');
    showToast('已添加新年份记忆印象');
  };

  const handleExport = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `拾年_记忆档案备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('离线记忆档案包导出成功');
  };

  const processBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (Array.isArray(parsed.timeline) || Array.isArray(parsed.people) || Array.isArray(parsed.stories))) {
          setImportPreview({
            data: {
              timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
              people: Array.isArray(parsed.people) ? parsed.people : [],
              stories: Array.isArray(parsed.stories) ? parsed.stories : [],
              artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
              letters: Array.isArray(parsed.letters) ? parsed.letters : []
            },
            filename: file.name,
            timelineCount: parsed.timeline?.length || 0,
            peopleCount: parsed.people?.length || 0,
            storiesCount: parsed.stories?.length || 0,
            artifactsCount: parsed.artifacts?.length || 0,
            lettersCount: parsed.letters?.length || 0
          });
          showToast('已成功解析备份档案文件');
        } else {
          showToast('文件格式不符合《拾年》档案标准');
        }
      } catch (err) {
        showToast('JSON 文件解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
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
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          messages: newMessages,
          memoryData: data,
          engine: aiEngine,
          customApiKey: aiEngine === 'deepseek' ? deepSeekKey : aiApiKey
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `请求异常 (${res.status})`);
      }

      const resJson = await res.json();
      const aiResponseText = resJson.reply || "抱歉，我刚刚沉思了一下，未能返回回应。";
      setAiChatMessages([...newMessages, { role: 'model', text: aiResponseText }]);
    } catch (err: any) {
      console.warn('AI Chat API fallback activated:', err);
      const q = promptToUse.toLowerCase();
      let fallbackText = '';

      if (aiEngine === 'deepseek' && !deepSeekKey) {
        fallbackText = "提示：当前选择 DeepSeek 引擎，尚未配置 API Key。可在右上角「设置」中填入你的专属密钥，或直接切换为内置推荐的标准模型。";
      } else if (q.includes('朋友') || q.includes('同窗') || q.includes('谁') || q.includes('人') || q.includes('陆青寻') || q.includes('林夏') || q.includes('陈导师')) {
        const peopleDetails = data.people.map(p => `${p.name}（${p.relationship || '朋友'}，${p.bio || '重要同行者'}）`).join('；');
        fallbackText = `在你的拾人册中，记录着这些重要同行者：${peopleDetails || '陆青寻、林夏'}。其中陆青寻是大学同窗与默契设计搭档，林夏是一路相伴的知心密友。无论是深夜改图的陪伴还是海边晚风的约定，这些温暖的羁绊都是你成长中最坚韧的底色。`;
      } else if (q.includes('成长') || q.includes('轨迹') || q.includes('几年') || q.includes('总结') || q.includes('回忆')) {
        const topEvents = data.timeline.slice(0, 3).map(t => `《${t.title}》`).join('、');
        fallbackText = `回顾你的《拾年》档案，从操场看台上的晚霞与吉他弹唱，到毕业旅行与拥有自己的温馨空间，你在 ${data.timeline.length} 处时光节点（如 ${topEvents}）中一步步蜕变成长。每一段足迹都闪烁着独属于你的青春光芒。`;
      } else if (q.includes('旧物') || q.includes('物') || q.includes('相机') || q.includes('票根') || q.includes('宝藏')) {
        const artNames = data.artifacts.map(a => `《${a.name}》`).join('、');
        fallbackText = `在你的拾物阁里，静静珍藏着 ${artNames || '理光GR相机、毕业旅行海边日落票根'} 等 ${data.artifacts.length} 件旧物。这些信物虽不言语，却承载着特定时光的温存记忆与指尖温度。`;
      } else {
        fallbackText = `岁月如一条静淌的小河。在你的档案里，记录着 ${data.timeline.length} 个时光瞬间、${data.people.length} 位同路人、${data.stories.length} 篇故事随笔与 ${data.artifacts.length} 件旧物。无论走得多远，只要翻开回忆，那些美好的温暖与感动都依旧如初。你想了解其中的哪一段？`;
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
      const res = await fetch('/api/ai/polish', {
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

      const res = await fetch('/api/ai/vision', {
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
      showToast(`正在播放【${voiceObj.name}】微软神经语音朗诵`);
      return;
    }

    setIsTtsGenerating(true);
    showToast(`正在生成【${voiceObj.name}】微软神经语音朗诵...`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('/api/ai/tts', {
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
      showToast(`正在播放【${voiceObj.name}】微软神经语音朗诵`);
    } catch (err: any) {
      console.warn('[Microsoft Edge TTS Fallback to Web Speech Synthesis]:', err);
      // Fallback seamlessly to native Android / Browser SpeechSynthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(textToRead);
          utterance.lang = 'zh-CN';
          utterance.rate = 0.92;
          utterance.pitch = 1.0;

          const voices = window.speechSynthesis.getVoices();
          const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('cmn'));
          if (zhVoice) utterance.voice = zhVoice;

          utterance.onstart = () => {
            setAudioPlayingVoiceName(`系统内置语音 · ${voiceObj.name}`);
            showToast(`正在播放【${voiceObj.name}】朗读`);
          };
          utterance.onend = () => {
            setAudioPlayingVoiceName('');
          };
          utterance.onerror = () => {
            setAudioPlayingVoiceName('');
          };

          window.speechSynthesis.speak(utterance);
        } catch (speechErr) {
          showToast('语音朗读遇到波动，请重试');
        }
      } else {
        showToast('当前设备环境暂不支持直接语音播放');
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
    <div className="h-full w-full flex items-center justify-center p-0 sm:p-4 text-[#2B332E] bg-[#FAF8F5] overflow-hidden">
      <div id="root-card" className="w-full max-w-md h-full sm:h-[880px] bg-[#FAF8F5] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative sm:border sm:border-[#E88765]/20 paper-texture select-none">

        {/* Top HeaderBar with Seamless Safe Area Inset Support */}
        <header className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 bg-[#FAF8F5]/98 sm:bg-white/90 backdrop-blur-md text-[#2B332E] flex items-center justify-between border-b border-[#5B7B6D]/15 shadow-2xs z-20 relative transition-colors shrink-0 select-none">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold tracking-widest font-serif text-[#5B7B6D]">
                拾年
              </h1>
              <button
                onClick={() => setIsThemePickerOpen(prev => !prev)}
                title="切换治愈雅致色调"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#F2EFE9] hover:bg-[#E88765]/15 text-[#5B7B6D] hover:text-[#E88765] transition-all border border-[#5B7B6D]/20 text-[10px] font-sans font-medium"
              >
                <Palette className="w-3 h-3 text-[#E88765]" />
                <span className="hidden xs:inline">{currentTheme.name}</span>
              </button>
            </div>
            <p className="text-[10px] text-[#6E7C75] font-serif tracking-wider mt-0.5 leading-none">
              岁华清照 · 拾年归处
            </p>
          </div>

          {/* Healing Palette Theme Picker Popup */}
          {isThemePickerOpen && (
            <div className="absolute top-full left-3 mt-1.5 w-64 p-3 bg-white rounded-2xl shadow-xl border border-[#5B7B6D]/20 z-50 animate-fadeIn font-sans">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F2EFE9]">
                <div>
                  <h4 className="text-xs font-bold text-[#2B332E]">选择时光色调</h4>
                  <p className="text-[10px] text-[#6E7C75]">小众清新 · 治愈系配色</p>
                </div>
                <button
                  onClick={() => setIsThemePickerOpen(false)}
                  className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {HEALING_THEMES.map(th => {
                  const isSelected = th.id === currentTheme.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => handleSelectTheme(th.id)}
                      className={`w-full p-2 rounded-xl flex items-center justify-between border transition-all text-left ${
                        isSelected
                          ? 'border-[#5B7B6D] bg-[#F2EFE9]/70 shadow-2xs font-semibold'
                          : 'border-transparent hover:bg-[#FAF8F5] hover:border-[#5B7B6D]/15'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center -space-x-1">
                          <div
                            className="w-4 h-4 rounded-full border border-white shadow-2xs"
                            style={{ backgroundColor: th.primary }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-white shadow-2xs"
                            style={{ backgroundColor: th.accent }}
                          />
                        </div>
                        <div>
                          <div className="text-xs text-[#2B332E] flex items-center gap-1">
                            <span>{th.name}</span>
                            <span className="text-[9px] text-[#6E7C75]/70 font-mono">({th.enName})</span>
                          </div>
                          <div className="text-[9px] text-[#6E7C75] font-serif leading-tight mt-0.5">
                            {th.quote}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#5B7B6D]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Replay iOS Entrance Animation */}
              <div className="pt-2 mt-2 border-t border-[#F2EFE9]">
                <button
                  onClick={() => {
                    setIsThemePickerOpen(false);
                    setShowSplash(true);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE9] border border-[#5B7B6D]/15 text-[#5B7B6D] text-[11px] font-sans flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Play className="w-3 h-3 text-[#E88765]" />
                  <span>重温 iOS 开屏入场动画</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {activeTab === 'people' ? (
              /* Silky Animated iOS Friend Group Trigger Capsule */
              <button
                onClick={() => setIsGroupPickerOpen(true)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-sans font-medium shadow-2xs active:scale-95 shrink-0 ${
                  selectedPersonGroup === 'all'
                    ? 'bg-[#F2EFE9] text-[#5B7B6D] border-[#5B7B6D]/20 hover:bg-[#E88765]/10'
                    : 'bg-[#FDF0EB] text-[#E88765] border-[#E88765]/35 hover:bg-[#FBE6DC]'
                }`}
                title="点击选择好友分组"
              >
                {selectedPersonGroup === 'all' ? (
                  <>
                    <Users className="w-3.5 h-3.5 text-[#5B7B6D] shrink-0" />
                    <span className="font-semibold whitespace-nowrap">全部好友</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                    <span className="font-bold whitespace-nowrap truncate max-w-[80px]">{selectedPersonGroup}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPersonGroup('all');
                        showToast('已切换至全部好友');
                      }}
                      className="p-0.5 rounded-full hover:bg-black/10 transition-colors ml-0.5"
                      title="返回全部好友"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </>
                )}
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5 shrink-0" />
              </button>
            ) : (
              /* Silky Animated iOS Year Trigger Capsule */
              <button
                onClick={() => setIsYearPickerOpen(true)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-sans font-medium shadow-2xs active:scale-95 shrink-0 ${
                  selectedYear === 'all'
                    ? 'bg-[#F2EFE9] text-[#5B7B6D] border-[#5B7B6D]/20 hover:bg-[#E88765]/10'
                    : 'bg-[#FDF0EB] text-[#E88765] border-[#E88765]/35 hover:bg-[#FBE6DC]'
                }`}
                title="点击选择回溯年份或全景时光"
              >
                {selectedYear === 'all' ? (
                  <>
                    <Compass className="w-3.5 h-3.5 text-[#5B7B6D] shrink-0" />
                    <span className="font-semibold whitespace-nowrap">全景时光</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                    <span className="font-bold whitespace-nowrap">{selectedYear} 年</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedYear('all');
                        showToast('已切换至全景时光');
                      }}
                      className="p-0.5 rounded-full hover:bg-black/10 transition-colors ml-0.5"
                      title="返回全景时光"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </>
                )}
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5 shrink-0" />
              </button>
            )}

            <button
              onClick={() => setActiveModal('backup')}
              title="空间设置与数据管理"
              className="p-2 rounded-xl bg-[#F2EFE9] border border-[#5B7B6D]/20 text-[#5B7B6D] hover:bg-[#5B7B6D] hover:text-white transition-all shadow-2xs shrink-0 active:scale-95"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsLocked(true);
                localStorage.setItem('shinian_is_locked', 'true');
                showToast('已锁定私人空间');
              }}
              title="锁定私人空间"
              className="p-2 rounded-xl bg-[#F2EFE9] border border-[#5B7B6D]/20 text-[#5B7B6D] hover:bg-[#5B7B6D] hover:text-white transition-all shadow-2xs shrink-0 active:scale-95"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#2B332E]/90 text-white text-xs px-4 py-2 rounded-xl shadow-lg z-50 flex items-center gap-2 animate-fadeIn font-sans">
            <Sparkles className="w-3.5 h-3.5 text-[#E88765]" />
            <span>{toast}</span>
          </div>
        )}

        {/* Audio Player Bar */}
        {audioPlayingUrl && (
          <div className="bg-[#FAF6EC] border-b border-[#E88765]/30 px-3.5 py-2 flex items-center justify-between text-xs text-[#2B332E] animate-fadeIn z-20 shadow-xs">
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
                  setAudioPlayingUrl(null);
                  setAudioPlayingVoiceName('');
                }}
                className="p-1 text-[#6E7C75]/60 hover:text-[#2B332E] hover:bg-stone-200/50 rounded-lg transition-colors"
                title="关闭音频"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main ref={mainContentRef} id="main-content-scroll" className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-6 sm:pb-8 space-y-4 overscroll-contain">

          {/* Home Tab */}
          {activeTab === 'home' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Today's Memory / Featured Spotlight Card (Classic Polaroid with Soft Floating & Shimmer Animation) */}
              {todayHighlight ? (
                <div className="bg-white p-4.5 sm:p-5 rounded-3xl border border-[#5B7B6D]/20 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-[#E88765]/40 animate-float-card group">
                  {/* Subtle Polaroid Ambient Shimmer */}
                  <div className="polaroid-shimmer" />

                  {/* Top Status & Date Info Bar */}
                  <div className="flex items-center justify-between text-xs font-bold mb-3 font-serif relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#FDF0EB] border border-[#E88765]/30 text-[#E88765] flex items-center justify-center shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                      </div>
                      <div>
                        <span className="text-[#2B332E] font-bold text-xs tracking-wide">今日回顾</span>
                        <span className="text-[11px] text-[#6E7C75] ml-1.5 font-mono font-normal">· {todayHighlight.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FDF0EB] text-[#E88765] border border-[#E88765]/30 text-[10px] font-sans font-semibold">
                        {todayHighlight.tag}
                      </span>
                      {data.timeline.length > 1 && (
                        <button
                          onClick={() => setHighlightIndex(prev => prev + 1)}
                          title="换一段回忆"
                          className="p-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#F2EFE9] border border-[#5B7B6D]/15 text-[#6E7C75] hover:text-[#2B332E] transition-all shadow-2xs active:scale-95"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Highlight Story Body */}
                  <div className="relative z-10">
                    <h2 className="text-base sm:text-lg font-bold text-[#2B332E] mb-2 font-serif group-hover:text-[#5B7B6D] transition-colors leading-snug">
                      {todayHighlight.title}
                    </h2>
                    <p className="text-xs text-[#526058] line-clamp-3 leading-relaxed mb-3.5 font-serif">
                      {todayHighlight.content}
                    </p>

                    {/* Classic Polaroid Styled Photo Frame */}
                    {todayHighlight.image && (
                      <div className="p-2 bg-[#FAF8F5] border border-[#5B7B6D]/15 rounded-2xl mb-3.5 shadow-xs transition-transform duration-300 group-hover:scale-[1.01]">
                        <div className="h-44 sm:h-48 w-full rounded-xl overflow-hidden relative">
                          <img
                            src={todayHighlight.image}
                            alt="cover"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Card Footer Actions & Location */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] text-[#6E7C75] border-t border-[#F2EFE9] pt-3">
                      <div className="flex items-center gap-1.5 font-sans text-[#526058] min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                        <span className="truncate">{todayHighlight.location || '离线记忆'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                        <button
                          type="button"
                          onClick={() => handlePlayTts(todayHighlight.content)}
                          disabled={isTtsGenerating}
                          className="px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#F2EFE9] border border-[#5B7B6D]/20 text-[#2B332E] font-medium flex items-center gap-1.5 transition-all text-xs active:scale-95 shadow-2xs whitespace-nowrap"
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
                <div className="p-6 bg-white rounded-2xl border border-dashed border-[#5B7B6D]/20 text-center space-y-2">
                  <p className="text-xs text-[#6E7C75] font-serif leading-relaxed">暂无拾光节点，点击下方「拾光轴」开启你的十年记录</p>
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
                />
                <EntranceCard
                  title="拾物阁"
                  subtitle="旧物与背后的故事"
                  icon={Package}
                  count={data.artifacts.length}
                  unit="件藏品"
                  onClick={() => setActiveTab('artifacts')}
                />
              </div>

              {/* Time Capsule Entry Banner - Japanese Indie Capsule Design */}
              <div 
                onClick={() => setActiveTab('letters')}
                className="group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#5B7B6D]/15 bg-white shadow-sm hover:shadow-md hover:border-[#E88765]/40 transition-all cursor-pointer overflow-hidden flex items-center justify-between"
              >
                {/* Decorative retro stamp & background texture accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#E88765]/10 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-3 right-4 opacity-15 group-hover:opacity-30 transition-opacity font-mono text-[10px] text-[#5B7B6D] tracking-widest uppercase select-none">
                  TIME CAPSULE · 封
                </div>

                <div className="flex items-center gap-3.5 min-w-0 flex-1 relative z-10">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F2EFE9] group-hover:bg-[#FDF0EB] text-[#5B7B6D] group-hover:text-[#E88765] border border-[#5B7B6D]/15 flex items-center justify-center shrink-0 shadow-2xs transition-colors">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-[#2B332E] font-serif group-hover:text-[#5B7B6D] transition-colors">
                        寄年 · 时光胶囊
                      </h4>
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#E88765] font-sans">
                        {data.letters.length} 封信件
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-[#6E7C75] font-sans leading-relaxed line-clamp-1">
                      寄给未来的信，写给岁月深处的微光与期许
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-[#6E7C75] group-hover:text-[#5B7B6D] group-hover:translate-x-0.5 transition-all shrink-0 ml-2 relative z-10">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* AI Companion Section on Home Page */}
              <div className="bg-white rounded-2xl border border-[#5B7B6D]/20 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-[#FAF8F5] px-4 py-3 border-b border-[#5B7B6D]/15 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#5B7B6D] text-white flex items-center justify-center shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#2B332E] font-serif flex items-center gap-1.5">
                        拾年 · 时光 AI 陪伴
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-sans font-normal border bg-white text-[#5B7B6D] border-[#5B7B6D]/20">
                          {aiEngine === 'deepseek' ? '🐉 DeepSeek-V3' : '⚡ 标准模型'}
                        </span>
                      </h3>
                      <p className="text-[10px] text-[#6E7C75]">回忆检索与情感对谈</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const nextEngine = aiEngine === 'gemini' ? 'deepseek' : 'gemini';
                        setAiEngine(nextEngine);
                        localStorage.setItem('shinian_ai_engine', nextEngine);
                        showToast(nextEngine === 'deepseek' ? '已切换为 DeepSeek 引擎' : '已切换为标准 AI 模型');
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-white border border-[#5B7B6D]/20 text-[#5B7B6D] hover:bg-[#5B7B6D]/10 font-sans transition-all flex items-center gap-1"
                      title="点击切换 AI 驱动引擎"
                    >
                      <RotateCcw className="w-3 h-3" />
                      切换引擎
                    </button>
                    <button
                      onClick={() => setAiChatMessages([{ role: 'model', text: '对话已重置。你想聊聊哪一段时光记录？' }])}
                      className="text-[10px] text-[#6E7C75] hover:text-[#5B7B6D] underline font-sans"
                    >
                      清空记录
                    </button>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div className="px-3 py-2 bg-[#F2EFE9]/40 flex gap-1.5 overflow-x-auto custom-scrollbar border-b border-[#5B7B6D]/10 text-[11px] font-sans">
                  <button
                    onClick={() => handleSendAiMessage("请根据我的记忆档案，总结我过去几年的成长变化与主线痕迹。")}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-[#5B7B6D]/20 text-[#5B7B6D] hover:bg-[#5B7B6D] hover:text-white transition-all shadow-2xs"
                  >
                    ✨ 总结成长轨迹
                  </button>
                  <button
                    onClick={() => handleSendAiMessage("回顾一下我和重要朋友（比如江川、许知夏、沈砚）的故事与印象变化。")}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-[#5B7B6D]/20 text-[#5B7B6D] hover:bg-[#5B7B6D] hover:text-white transition-all shadow-2xs"
                  >
                    🤝 回顾重要朋友
                  </button>
                  <button
                    onClick={() => handleSendAiMessage("帮我推荐一段今天非常值得重温的时光记忆片段。")}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-[#5B7B6D]/20 text-[#5B7B6D] hover:bg-[#5B7B6D] hover:text-white transition-all shadow-2xs"
                  >
                    📖 推荐重温片段
                  </button>
                </div>

                {/* Chat Message Scroll List */}
                <div className="h-64 overflow-y-auto custom-scrollbar p-3.5 space-y-3 bg-[#FAF8F5]/40">
                  {aiChatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#5B7B6D] text-white rounded-br-none shadow-sm font-sans'
                          : 'bg-white text-[#2B332E] border border-[#5B7B6D]/15 rounded-bl-none font-serif shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isAiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-[#5B7B6D]/15 p-3 rounded-2xl rounded-bl-none text-xs text-[#6E7C75] flex items-center gap-2 font-sans shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-[#E88765] animate-spin" />
                        AI 正在翻阅回忆档案...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-2.5 bg-white border-t border-[#5B7B6D]/15 flex gap-2">
                  <input
                    type="text"
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
                    placeholder="问问 AI，如：还记得2024年夏天发生了什么吗？"
                    className="flex-1 p-2 text-xs bg-[#F2EFE9] border border-[#5B7B6D]/20 rounded-xl focus:outline-none focus:border-[#E88765] font-sans"
                  />
                  <button
                    onClick={() => handleSendAiMessage()}
                    disabled={isAiLoading}
                    className="px-3.5 py-2 bg-[#E88765] text-white rounded-xl hover:bg-[#E88765]/90 transition-all text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold text-[#2B332E] tracking-wider font-serif">
                  拾光轴 ({data.timeline.filter(item => selectedYear === 'all' || getYearFromDate(item.date) === selectedYear).length})
                </h2>
                <button
                  onClick={() => setActiveModal('addTimeline')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#5B7B6D] text-white rounded-xl shadow-sm hover:bg-[#3E564B] font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> 新建节点
                </button>
              </div>

              {/* Year Filter Status Banner */}
              {selectedYear !== 'all' && (
                <div className="p-3 bg-[#5B7B6D]/10 rounded-2xl border border-[#5B7B6D]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#5B7B6D] font-sans shadow-2xs">
                  <div className="flex items-center gap-2 font-medium leading-normal">
                    <Filter className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                    <span>
                      正在筛选【<strong className="font-bold text-[#E88765]">{selectedYear} 年</strong>】时光轴
                      <span className="opacity-75 font-normal ml-1">（共 {data.timeline.filter(item => getYearFromDate(item.date) === selectedYear).length} 条）</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setIsYearPickerOpen(true)}
                      className="text-[11px] font-semibold text-[#5B7B6D] bg-white/95 hover:bg-white px-2.5 py-1 rounded-xl border border-[#5B7B6D]/20 flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                    >
                      <CalendarRange className="w-3 h-3 text-[#E88765]" /> 换年份
                    </button>
                    <button
                      onClick={() => {
                        setSelectedYear('all');
                        showToast('已切换至全景时光');
                      }}
                      className="text-[11px] font-bold text-[#E88765] hover:underline flex items-center gap-1 px-1.5 py-1"
                    >
                      <RotateCcw className="w-3 h-3" /> 全景时光
                    </button>
                  </div>
                </div>
              )}

              {data.timeline.filter(item => selectedYear === 'all' || getYearFromDate(item.date) === selectedYear).length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-[#5B7B6D]/20 text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#FAF8F5] flex items-center justify-center text-[#5B7B6D]">
                    <Clock className="w-5 h-5 opacity-60" />
                  </div>
                  <div className="text-xs text-[#6E7C75] font-serif">
                    {selectedYear === 'all' ? '暂无拾光轴记录' : `暂无 ${selectedYear} 年的拾光记录`}
                  </div>
                  <div className="flex justify-center gap-2 pt-1 font-sans">
                    {selectedYear !== 'all' && (
                      <button
                        onClick={() => setSelectedYear('all')}
                        className="text-xs px-3 py-1.5 bg-[#F2EFE9] text-[#5B7B6D] rounded-xl hover:bg-[#E8E4DC] font-medium"
                      >
                        查看全景时光
                      </button>
                    )}
                    <button
                      onClick={() => setActiveModal('addTimeline')}
                      className="text-xs px-3 py-1.5 bg-[#5B7B6D] text-white rounded-xl hover:bg-[#3E564B] font-medium"
                    >
                      新建节点
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative pl-4 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#5B7B6D]/25">
                  {data.timeline
                    .filter(item => selectedYear === 'all' || getYearFromDate(item.date) === selectedYear)
                    .map((item) => (
                      <div key={item.id} className="relative pl-6 group">
                        <div className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full bg-[#E88765] border-2 border-[#FAF8F5] shadow-sm" />

                        <div className="bg-white p-4 rounded-2xl border border-[#5B7B6D]/15 shadow-sm space-y-2 hover:border-[#E88765]/30 transition-all">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-[#E88765] flex items-center gap-1 font-sans">
                              <Calendar className="w-3 h-3" /> {item.date}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePlayTts(`${item.title}。${item.content}`)}
                                title="AI 朗诵"
                                className="text-[#5B7B6D] hover:text-[#E88765] p-1"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => requestDelete('timeline', item.id, item.title)}
                                title="删除节点"
                                className="text-[#6E7C75]/40 hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="font-bold text-[#2B332E] text-base font-serif">{item.title}</h3>
                          <p className="text-xs text-[#6E7C75] leading-relaxed whitespace-pre-line font-serif">{item.content}</p>

                          {item.image && (
                            <div className="h-40 w-full rounded-xl overflow-hidden border border-[#5B7B6D]/10 mt-2">
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="flex justify-between items-center text-[11px] text-[#6E7C75]/70 pt-2 border-t border-[#F2EFE9]">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location || '离线记忆'}</span>
                            <span className="px-2 py-0.5 rounded-md bg-[#F2EFE9] text-[#5B7B6D] text-[10px] font-medium font-sans">{item.tag}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* People List Tab: High-Aesthetic Japanese Literary Portrait Memoir Album */}
          {activeTab === 'people' && !selectedPerson && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold text-[#2B332E] tracking-wider font-serif">
                  拾人册 ({selectedPersonGroup === 'all' ? data.people.length : filteredPeople.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveModal('addPerson')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#5B7B6D] text-white rounded-xl shadow-sm hover:bg-[#3E564B] font-medium transition-all active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> 添加人物
                </button>
              </div>

              {/* Group Filter Status Banner */}
              {selectedPersonGroup !== 'all' && (
                <div className="p-3 bg-[#E88765]/10 rounded-2xl border border-[#E88765]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#E88765] font-sans shadow-2xs">
                  <div className="flex items-center gap-2 font-medium leading-normal">
                    <FolderOpen className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                    <span>
                      正在浏览【<strong className="font-bold text-[#2B332E]">{selectedPersonGroup}</strong>】分组
                      <span className="opacity-75 font-normal ml-1">（共 {filteredPeople.length} 位好友）</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setIsGroupPickerOpen(true)}
                      className="text-[11px] font-semibold text-[#5B7B6D] bg-white/95 hover:bg-white px-2.5 py-1 rounded-xl border border-[#5B7B6D]/20 flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                    >
                      <Users className="w-3 h-3 text-[#E88765]" /> 换分组
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPersonGroup('all');
                        showToast('已切换至全部好友全览');
                      }}
                      className="text-[11px] font-bold text-[#E88765] hover:underline flex items-center gap-1 px-1.5 py-1"
                    >
                      <RotateCcw className="w-3 h-3" /> 全部好友
                    </button>
                  </div>
                </div>
              )}

              {/* People Cards Grid - Japanese Literary Portrait Memoir Cards */}
              {filteredPeople.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-dashed border-[#5B7B6D]/20 text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#5B7B6D]/20 text-[#5B7B6D] flex items-center justify-center mx-auto text-xl">
                    👥
                  </div>
                  <h3 className="font-bold text-[#2B332E] text-sm font-serif">
                    {selectedPersonGroup !== 'all' ? `「${selectedPersonGroup}」分组暂无好友` : '暂无好友记录'}
                  </h3>
                  <p className="text-xs text-[#6E7C75]">
                    {selectedPersonGroup !== 'all'
                      ? '可点击好友卡片编辑资料将其归入此分组，或切换回全部好友'
                      : '轻触右上角「添加人物」即可开启拾人纪实'}
                  </p>
                  <div className="flex justify-center gap-2 pt-1 font-sans">
                    {selectedPersonGroup !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedPersonGroup('all')}
                        className="px-4 py-1.5 bg-[#F2EFE9] text-[#5B7B6D] text-xs rounded-xl font-medium shadow-2xs hover:bg-[#E8E4DC]"
                      >
                        查看全部好友
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveModal('addPerson')}
                      className="px-4 py-1.5 bg-[#5B7B6D] text-white text-xs rounded-xl font-medium shadow-2xs hover:bg-[#3E564B]"
                    >
                      添加人物
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredPeople.map(person => (
                    <div
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      className="bg-[#FFFDF9] hover:bg-white rounded-3xl p-4.5 border border-[#E3DACD] hover:border-[#5B7B6D]/45 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
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
                                <div className="text-[10px] text-[#5B7B6D] font-mono flex items-center gap-1 opacity-90">
                                  <Calendar className="w-2.5 h-2.5 text-[#5B7B6D]" />
                                  <span>相识第 {calculateDaysKnown(person.knownDate)?.toLocaleString()} 天</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-[#6E7C75]/70 font-sans">
                                  {person.group || '拾光挚友'}
                                </div>
                              )}
                            </div>
                          </div>

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
                        <div className="flex items-center gap-2.5 min-w-0">
                          {person.birthday && (
                            <span className="flex items-center gap-1 truncate">
                              🎂 {person.birthday}
                            </span>
                          )}
                          {person.zodiac && (
                            <span className="flex items-center gap-1 shrink-0">
                              ✨ {person.zodiac}
                            </span>
                          )}
                          <span className="shrink-0 font-mono">
                            📖 {person.impressions?.length || 0} 则印记
                          </span>
                        </div>

                        <div className="text-[11px] text-[#5B7B6D] font-medium flex items-center gap-0.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0">
                          <span>翻看手账</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Person Detailed Archive View - Curated Japanese Indie Profile Journal */}
          {activeTab === 'people' && selectedPerson && (
            <div className="space-y-4 animate-fadeIn">
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
                    onClick={() => setIsEditingPerson(true)}
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
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
                  {/* 生日星座 */}
                  {(selectedPerson.birthday || selectedPerson.zodiac) && (
                    <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#5B7B6D]/10 flex items-center gap-3">
                      <span className="text-base p-2 rounded-xl bg-white border border-[#5B7B6D]/10 shrink-0">🎂</span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-[#6E7C75] block">生日 · 星座</span>
                        <span className="font-semibold text-[#2B332E] block truncate">
                          {selectedPerson.birthday || '未填生日'} {selectedPerson.zodiac ? `(${selectedPerson.zodiac})` : ''}
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

              {/* Yearly Memories & Impressions Section - Clean Journal Stream */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#D9CFC1] shadow-2xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[#2B332E] text-sm flex items-center gap-2 font-serif">
                    <Sparkles className="w-4 h-4 text-[#E88765]" />
                    <span>岁月印记与故事轨迹</span>
                  </h3>
                  <span className="text-[11px] text-[#6E7C75] font-sans">共 {selectedPerson.impressions?.length || 0} 则记录</span>
                </div>

                {/* Form to append new memory impression */}
                <form onSubmit={handleAddImpression} className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#5B7B6D]/15 space-y-2.5 text-xs font-sans">
                  <span className="font-bold text-[#5B7B6D] text-xs block">记录一段新回忆 / 印象切片：</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newImpressionYear}
                      onChange={(e) => setNewImpressionYear(e.target.value)}
                      placeholder="年份 (如 2026)"
                      className="w-full sm:w-28 p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D] shrink-0 font-mono text-xs"
                    />
                    <div className="flex gap-2 flex-1 min-w-0">
                      <input
                        type="text"
                        value={newImpressionText}
                        onChange={(e) => setNewImpressionText(e.target.value)}
                        placeholder="记录这个阶段的心情、感动细节或共同经历..."
                        className="flex-1 min-w-0 p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D] text-xs font-serif"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-[#5B7B6D] hover:bg-[#3E564B] text-white font-bold rounded-xl transition-all shadow-xs shrink-0 whitespace-nowrap active:scale-95"
                      >
                        记录
                      </button>
                    </div>
                  </div>
                </form>

                {/* Impressions Stream */}
                <div className="space-y-3 pt-1">
                  {selectedPerson.impressions?.map((imp, idx) => (
                    <div key={imp.id || idx} className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#5B7B6D]/10 text-xs text-[#2B332E] space-y-2 shadow-2xs hover:border-[#5B7B6D]/30 transition-all">
                      <div className="flex justify-between items-center text-[11px] font-sans">
                        <span className="font-bold text-[#E88765] bg-white px-2.5 py-0.5 rounded-lg border border-[#E88765]/20">
                          {imp.year} 年切片
                        </span>
                        <button 
                          type="button"
                          onClick={() => handlePlayTts(imp.text)} 
                          className="text-[#5B7B6D] hover:text-[#E88765] flex items-center gap-1 font-medium bg-white px-2.5 py-1 rounded-lg border border-[#5B7B6D]/15 transition-all shadow-2xs"
                        >
                          <Volume2 className="w-3 h-3" /> 朗诵
                        </button>
                      </div>
                      <p className="leading-relaxed font-serif text-[#3E4A42] text-xs whitespace-pre-line break-words">
                        {imp.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stories Tab */}
          {activeTab === 'stories' && !readerStory && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold text-[#2B332E] tracking-wider font-serif">
                  拾忆篇 ({data.stories.filter(story => selectedYear === 'all' || getYearFromDate(story.date) === selectedYear).length})
                </h2>
                <button
                  onClick={() => setActiveModal('addStory')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#5B7B6D] text-white rounded-xl shadow-sm hover:bg-[#3E564B] font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> 新增章节
                </button>
              </div>

              {/* Year Filter Status Banner */}
              {selectedYear !== 'all' && (
                <div className="p-3 bg-[#5B7B6D]/10 rounded-2xl border border-[#5B7B6D]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#5B7B6D] font-sans shadow-2xs">
                  <div className="flex items-center gap-2 font-medium leading-normal">
                    <Filter className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                    <span>
                      正在筛选【<strong className="font-bold text-[#E88765]">{selectedYear} 年</strong>】长篇篇章
                      <span className="opacity-75 font-normal ml-1">（共 {data.stories.filter(story => getYearFromDate(story.date) === selectedYear).length} 篇）</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setIsYearPickerOpen(true)}
                      className="text-[11px] font-semibold text-[#5B7B6D] bg-white/95 hover:bg-white px-2.5 py-1 rounded-xl border border-[#5B7B6D]/20 flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                    >
                      <CalendarRange className="w-3 h-3 text-[#E88765]" /> 换年份
                    </button>
                    <button
                      onClick={() => {
                        setSelectedYear('all');
                        showToast('已切换至全景时光');
                      }}
                      className="text-[11px] font-bold text-[#E88765] hover:underline flex items-center gap-1 px-1.5 py-1"
                    >
                      <RotateCcw className="w-3 h-3" /> 全景时光
                    </button>
                  </div>
                </div>
              )}

              {data.stories.filter(story => selectedYear === 'all' || getYearFromDate(story.date) === selectedYear).length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-[#5B7B6D]/20 text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#FAF8F5] flex items-center justify-center text-[#5B7B6D]">
                    <BookOpen className="w-5 h-5 opacity-60" />
                  </div>
                  <div className="text-xs text-[#6E7C75] font-serif">
                    {selectedYear === 'all' ? '暂无长篇章节记录' : `暂无 ${selectedYear} 年的故事章节`}
                  </div>
                  <div className="flex justify-center gap-2 pt-1 font-sans">
                    {selectedYear !== 'all' && (
                      <button
                        onClick={() => setSelectedYear('all')}
                        className="text-xs px-3 py-1.5 bg-[#F2EFE9] text-[#5B7B6D] rounded-xl hover:bg-[#E8E4DC] font-medium"
                      >
                        查看全部篇章
                      </button>
                    )}
                    <button
                      onClick={() => setActiveModal('addStory')}
                      className="text-xs px-3 py-1.5 bg-[#5B7B6D] text-white rounded-xl hover:bg-[#3E564B] font-medium"
                    >
                      新增章节
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
                        className="bg-white p-4 rounded-2xl border border-[#5B7B6D]/15 shadow-sm cursor-pointer hover:border-[#E88765]/50 transition-all flex justify-between items-center group"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#E88765] font-bold uppercase tracking-wider font-sans">{story.chapter}</span>
                            <span className="text-[10px] text-[#6E7C75]/60 font-sans">{story.date}</span>
                          </div>
                          <h3 className="font-bold text-[#2B332E] text-base group-hover:text-[#E88765] transition-colors font-serif">{story.title}</h3>
                          <p className="text-xs text-[#6E7C75] line-clamp-2 mt-1 leading-relaxed font-serif">{story.content}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingStory(story);
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
                          <BookOpen className="w-4 h-4 text-[#5B7B6D] ml-1" />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Reading Mode View */}
          {activeTab === 'stories' && readerStory && (
            <div className="bg-white p-6 rounded-2xl border border-[#5B7B6D]/20 shadow-md space-y-4 animate-fadeIn min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <button
                    onClick={() => setReaderStory(null)}
                    className="text-xs text-[#6E7C75] hover:text-[#5B7B6D] font-medium"
                  >
                    ← 退出阅读
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingStory(readerStory)}
                      className="text-[11px] px-2.5 py-1 text-[#5B7B6D] bg-[#5B7B6D]/10 hover:bg-[#5B7B6D]/20 rounded-full font-sans transition-all flex items-center gap-1 active:scale-95"
                      title="编辑当前文章"
                    >
                      <Edit3 className="w-3 h-3 text-[#5B7B6D]" />
                      <span>编辑篇章</span>
                    </button>
                    <button
                      onClick={() => setIsVoicePickerModalOpen(true)}
                      className="text-[11px] px-2.5 py-1 text-[#6E7C75] bg-stone-100 hover:bg-stone-200 rounded-full font-sans transition-all flex items-center gap-1"
                      title="更换朗读音色"
                    >
                      <Headphones className="w-3 h-3 text-[#5B7B6D]" />
                      <span>{TTS_VOICES.find(v => v.id === ttsSelectedVoice)?.name.split(' ')[0] || '选音色'}</span>
                    </button>
                    <button
                      onClick={() => handlePlayTts(`${readerStory.title}。${readerStory.content}`)}
                      disabled={isTtsGenerating}
                      className="flex items-center gap-1 text-xs px-3 py-1 bg-[#FDF0EB] text-[#E88765] rounded-full border border-[#E88765]/30 font-medium hover:bg-[#E88765] hover:text-white transition-all font-sans active:scale-95"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isTtsGenerating ? 'animate-bounce' : ''}`} />
                      <span>{isTtsGenerating ? 'AI 语音合成中...' : '朗读'}</span>
                    </button>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#E88765] tracking-widest uppercase font-sans">{readerStory.chapter}</span>
                <h2 className="text-2xl font-bold text-[#2B332E] mb-4 font-serif">{readerStory.title}</h2>
                <div className="text-sm text-[#2B332E] leading-loose whitespace-pre-line font-serif">
                  {readerStory.content}
                </div>
              </div>
              <div className="text-center text-[10px] text-[#6E7C75]/50 border-t border-[#5B7B6D]/10 pt-4 font-sans">
                《拾年》电子书阅读模式 · {readerStory.date}
              </div>
            </div>
          )}

          {/* Artifacts Tab */}
          {activeTab === 'artifacts' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold text-[#2B332E] tracking-wider font-serif">
                  拾物阁 ({data.artifacts.filter(item => selectedYear === 'all' || getYearFromDate(item.date) === selectedYear).length})
                </h2>
                <button
                  onClick={() => setActiveModal('addArtifact')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#5B7B6D] text-white rounded-xl shadow-sm hover:bg-[#3E564B] font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> 收藏新物
                </button>
              </div>

              {/* Year Filter Status Banner */}
              {selectedYear !== 'all' && (
                <div className="p-3 bg-[#5B7B6D]/10 rounded-2xl border border-[#5B7B6D]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#5B7B6D] font-sans shadow-2xs">
                  <div className="flex items-center gap-2 font-medium leading-normal">
                    <Filter className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                    <span>
                      正在筛选【<strong className="font-bold text-[#E88765]">{selectedYear} 年</strong>】旧物藏品
                      <span className="opacity-75 font-normal ml-1">（共 {data.artifacts.filter(item => getYearFromDate(item.date) === selectedYear).length} 件）</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setIsYearPickerOpen(true)}
                      className="text-[11px] font-semibold text-[#5B7B6D] bg-white/95 hover:bg-white px-2.5 py-1 rounded-xl border border-[#5B7B6D]/20 flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                    >
                      <CalendarRange className="w-3 h-3 text-[#E88765]" /> 换年份
                    </button>
                    <button
                      onClick={() => {
                        setSelectedYear('all');
                        showToast('已切换至全景时光');
                      }}
                      className="text-[11px] font-bold text-[#E88765] hover:underline flex items-center gap-1 px-1.5 py-1"
                    >
                      <RotateCcw className="w-3 h-3" /> 全景时光
                    </button>
                  </div>
                </div>
              )}

              {data.artifacts.filter(item => selectedYear === 'all' || getYearFromDate(item.date) === selectedYear).length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-[#5B7B6D]/20 text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#FAF8F5] flex items-center justify-center text-[#5B7B6D]">
                    <Package className="w-5 h-5 opacity-60" />
                  </div>
                  <div className="text-xs text-[#6E7C75] font-serif">
                    {selectedYear === 'all' ? '暂无旧物藏品记录' : `暂无 ${selectedYear} 年的旧物藏品`}
                  </div>
                  <div className="flex justify-center gap-2 pt-1 font-sans">
                    {selectedYear !== 'all' && (
                      <button
                        onClick={() => setSelectedYear('all')}
                        className="text-xs px-3 py-1.5 bg-[#F2EFE9] text-[#5B7B6D] rounded-xl hover:bg-[#E8E4DC] font-medium"
                      >
                        查看全部旧物
                      </button>
                    )}
                    <button
                      onClick={() => setActiveModal('addArtifact')}
                      className="text-xs px-3 py-1.5 bg-[#5B7B6D] text-white rounded-xl hover:bg-[#3E564B] font-medium"
                    >
                      收藏新物
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {data.artifacts
                    .filter(item => selectedYear === 'all' || getYearFromDate(item.date) === selectedYear)
                    .map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedArtifact(item)}
                        className="bg-white p-3 rounded-2xl border border-[#5B7B6D]/15 shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#E88765]/50 hover:shadow-md transition-all group"
                      >
                        <div>
                          <div className="h-28 w-full rounded-xl overflow-hidden mb-2 bg-[#F2EFE9] border border-[#5B7B6D]/10 group-hover:opacity-95 transition-opacity">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <h3 className="font-bold text-[#2B332E] text-sm group-hover:text-[#E88765] transition-colors font-serif">{item.name}</h3>
                          <p className="text-[10px] text-[#E88765] font-semibold mt-0.5 font-sans">{item.date}</p>
                          <p className="text-xs text-[#6E7C75] line-clamp-2 mt-1 leading-relaxed font-serif">{item.story}</p>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#F2EFE9]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTts(`${item.name}。${item.story}`);
                            }}
                            className="text-[#5B7B6D] hover:text-[#E88765] text-xs flex items-center gap-1 font-sans"
                          >
                            <Volume2 className="w-3 h-3" /> 听旧物
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDelete('artifacts', item.id, item.name);
                            }}
                            className="text-[#6E7C75]/40 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Future Letters Tab - Curated Japanese Indie Time Capsule Aesthetic */}
          {activeTab === 'letters' && (
            <div className="space-y-5 animate-fadeIn">
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
                  {data.letters.map(letter => {
                    const isUnlocked = letter.isUnlocked || new Date().toISOString().slice(0, 10) >= letter.unlockDate;
                    return (
                      <div
                        key={letter.id}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>

        {/* Universal Creation & Settings Modals */}
        {activeModal && (
          <div className="absolute inset-0 bg-[#2B332E]/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className="bg-[#FAF8F5] w-full max-h-[85%] overflow-y-auto p-5 rounded-t-3xl sm:rounded-3xl border border-[#5B7B6D]/20 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-[#5B7B6D]/10 pb-3">
                <h3 className="font-bold text-[#2B332E] text-base flex items-center gap-2 font-serif">
                  {activeModal === 'addTimeline' && '新建时光节点'}
                  {activeModal === 'addPerson' && '添加人物档案'}
                  {activeModal === 'addStory' && '新增故事章节'}
                  {activeModal === 'addArtifact' && '收藏旧物档案'}
                  {activeModal === 'addLetter' && '撰写未来寄信'}
                  {activeModal === 'backup' && '数据管理与私人安全设置'}
                  {activeModal === 'summaryReportModal' && '《拾年》时光总结报告'}
                </h3>
                <button onClick={() => setActiveModal(null)} className="text-[#6E7C75] hover:text-[#2B332E]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal 1: Timeline Item Form */}
              {activeModal === 'addTimeline' && (
                <form id="timelineForm" onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addItem('timeline', {
                    id: 't-' + Date.now(),
                    title: fd.get('title') as string,
                    date: fd.get('date') as string,
                    location: (fd.get('location') as string) || '时光驿站',
                    content: fd.get('content') as string,
                    tag: (fd.get('tag') as string) || '时光印记',
                    image: formTimelineImage || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80'
                  });
                  setFormTimelineImage('');
                }} className="space-y-3.5 text-xs font-sans">

                  <div className="p-3 bg-[#FDF0EB]/80 border border-[#E88765]/30 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#E88765] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> 照片 AI 智能识图填表
                      </span>
                      <label className="cursor-pointer text-[11px] px-2.5 py-1 bg-[#E88765] text-white rounded-lg font-medium shadow-xs hover:bg-[#E88765]/90 transition-all">
                        {isAiVisionLoading ? 'AI 识别中...' : '选取照片/票据'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          handleImageUploadVision(e, (data) => {
                            const form = document.getElementById('timelineForm') as HTMLFormElement;
                            if (form) {
                              if (data.title) (form.elements.namedItem('title') as HTMLInputElement).value = data.title;
                              if (data.date) (form.elements.namedItem('date') as HTMLInputElement).value = data.date;
                              if (data.location) (form.elements.namedItem('location') as HTMLInputElement).value = data.location;
                              if (data.tag) (form.elements.namedItem('tag') as HTMLInputElement).value = data.tag;
                              if (data.story) (form.elements.namedItem('content') as HTMLTextAreaElement).value = data.story;
                            }
                            if (data.image) setFormTimelineImage(data.image);
                          });
                        }} />
                      </label>
                    </div>
                    <p className="text-[10px] text-[#6E7C75]">上传老照片、车票或纪念物，AI 将自动填写标题、日期、地点与叙事内容！</p>
                  </div>

                  {/* Local Image Uploader */}
                  <LocalImageUploader
                    value={formTimelineImage}
                    onChange={setFormTimelineImage}
                    label="时光配图 (本地上传)"
                    helperText="支持本地选取/拖拽图片，自动压缩离线保存到本地档案"
                    aspectRatio="video"
                    extraAction={
                      <button
                        type="button"
                        onClick={() => {
                          const title = (document.querySelector('input[name="title"]') as HTMLInputElement)?.value || '时光记忆';
                          handleGenerateAiImage(title, (url) => {
                            setFormTimelineImage(url);
                          });
                        }}
                        disabled={isAiGenImageLoading}
                        className="text-[11px] text-[#E88765] hover:text-[#D46C49] flex items-center gap-1 font-medium transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        {isAiGenImageLoading ? '绘图中...' : '🎨 AI 生成时光画'}
                      </button>
                    }
                  />

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">记忆标题 <span className="text-[#E88765] font-bold">* 必填</span></label>
                    <input name="title" required placeholder="如：毕业季海边日落、第一次租房..." className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">记录日期 <span className="text-[#E88765] font-bold">* 必填</span></label>
                      <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">地点 (选填)</label>
                      <input name="location" placeholder="如：威海火炬八街、校园老图书馆" className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">标签分类 (选填)</label>
                    <input name="tag" placeholder="如：青春、旅途、奋斗、家庭" className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] text-[#6E7C75]">记忆故事与描述 <span className="text-[#E88765] font-bold">* 必填</span>：</label>
                      <button
                        type="button"
                        onClick={() => handleAiPolishText('textarea[name="content"]', (val) => {
                          const area = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                          if (area) area.value = val;
                        })}
                        disabled={isAiPolishLoading}
                        className="text-[10px] text-[#E88765] hover:underline flex items-center gap-0.5"
                      >
                        <Wand2 className="w-3 h-3" /> {isAiPolishLoading ? '润色中...' : '✨ AI 润色故事'}
                      </button>
                    </div>
                    <textarea name="content" required rows={3} placeholder="写下当时的感受、心境与难忘的细节..." className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  </div>

                  <button type="submit" className="w-full py-3 bg-[#5B7B6D] text-white font-bold rounded-xl shadow-sm hover:bg-[#3E564B] transition-all">存入拾光轴</button>
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

                  {/* Section 1: 必填核心档案 */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E88765]/30 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                      <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-[#E88765] rounded-full inline-block"></span>
                        核心档案
                      </h4>
                      <span className="text-[10px] text-[#E88765] bg-[#FDF0EB] px-2 py-0.5 rounded-full font-medium border border-[#E88765]/20">
                        * 必填项
                      </span>
                    </div>

                    {/* Local Avatar Uploader */}
                    <LocalImageUploader
                      value={formPersonAvatar}
                      onChange={setFormPersonAvatar}
                      mode="avatar"
                      label="人物头像"
                      required={true}
                    />

                    <div>
                      <label className="text-[11px] font-medium text-[#2B332E] block mb-1">
                        姓名 / 称谓 <span className="text-[#E88765] font-bold">* 必填</span>
                      </label>
                      <input
                        name="name"
                        required
                        placeholder="如：陆青寻、林夏、老林、陈老师"
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E88765] transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-medium text-[#2B332E]">
                          与我的关系 <span className="text-[#E88765] font-bold">* 必填</span>
                        </label>
                        <span className="text-[10px] text-[#6E7C75]">可点击下方标签快捷选择</span>
                      </div>
                      <input
                        name="relationship"
                        required
                        value={formPersonRel}
                        onChange={(e) => setFormPersonRel(e.target.value)}
                        placeholder="如：挚友、大学室友、高中闺蜜、父母、恩师"
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E88765] transition-colors mb-2"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {['挚友', '发小', '高中同窗', '大学室友', '父母家人', '恩师', '同行伙伴'].map((rel) => (
                          <button
                            key={rel}
                            type="button"
                            onClick={() => setFormPersonRel(rel)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                              formPersonRel === rel
                                ? 'bg-[#5B7B6D] text-white border-[#5B7B6D]'
                                : 'bg-[#FAF8F5] text-[#6E7C75] border-[#5B7B6D]/15 hover:border-[#5B7B6D]/40'
                            }`}
                          >
                            {rel}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: 分组归类与基本信息 */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                      <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-[#5B7B6D] rounded-full inline-block"></span>
                        分组归类与基本信息
                      </h4>
                      <span className="text-[10px] text-[#6E7C75] bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                        选填
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">好友分组</label>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {Array.from(new Set([...customGroups, '未分组'])).map(grp => (
                          <button
                            key={grp}
                            type="button"
                            onClick={() => setFormPersonGroup(grp)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                              formPersonGroup === grp
                                ? 'bg-[#5B7B6D] text-white border-[#5B7B6D]'
                                : 'bg-[#FAF8F5] text-[#6E7C75] border-[#5B7B6D]/15 hover:border-[#5B7B6D]/40'
                            }`}
                          >
                            {grp}
                          </button>
                        ))}
                      </div>
                      <input
                        name="group"
                        value={formPersonGroup}
                        onChange={(e) => setFormPersonGroup(e.target.value)}
                        placeholder="或输入自定义分组名称"
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-[#6E7C75] block mb-1">
                          相识起始日期
                        </label>
                        <input
                          name="knownDate"
                          type="date"
                          defaultValue="2021-09-01"
                          className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#6E7C75] block mb-1">
                          生日
                        </label>
                        <input
                          name="birthday"
                          placeholder="如：10月24日、1998-05-12"
                          className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-[#6E7C75] block mb-1">认识地点</label>
                        <input
                          name="knowWhere"
                          placeholder="如：老校区林荫路、大一画室"
                          className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#6E7C75] block mb-1">喜欢的颜色</label>
                        <input name="color" placeholder="如：鼠尾草绿、暖杏粉" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">兴趣爱好</label>
                      <input name="hobbies" placeholder="如：胶片摄影、烘焙甜品、骑行" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                    </div>
                  </div>

                  {/* Section 3: 社交与联系方式 (选填) */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                      <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-[#5B7B6D] rounded-full inline-block"></span>
                        社交与联系方式
                      </h4>
                      <span className="text-[10px] text-[#6E7C75] bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                        选填
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-[#6E7C75] block mb-1">微信号</label>
                        <input
                          name="wechat"
                          placeholder="如：wx_summer07"
                          className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#6E7C75] block mb-1">QQ 号</label>
                        <input
                          name="qq"
                          placeholder="如：83920194"
                          className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">手机 / 电话</label>
                      <input
                        name="phone"
                        placeholder="如：13812349201"
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                  </div>

                  {/* Section 4: 时光印记与生平寄语 */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                      <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-[#8C6D52] rounded-full inline-block"></span>
                        生平寄语与初识印象
                      </h4>
                      <span className="text-[10px] text-[#6E7C75] bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                        选填
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">一句话人物总结</label>
                      <input name="bio" placeholder="如：一起在晚自习后看过无数次晚霞的知心挚友" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">初识或目前记忆印象</label>
                      <textarea name="impression" rows={2} placeholder="如：还记得大一军训休息时递来的那瓶冰橘子汽水，眼睛笑起来像弯月..." className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-3 bg-[#5B7B6D] text-white font-bold rounded-xl shadow-sm hover:bg-[#3E564B] transition-all">
                    建立人物档案
                  </button>
                </form>
              )}

              {/* Modal 3: Add Story */}
              {activeModal === 'addStory' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addItem('stories', {
                    id: 's-' + Date.now(),
                    chapter: fd.get('chapter') as string,
                    title: fd.get('title') as string,
                    content: fd.get('content') as string,
                    date: (fd.get('date') as string) || new Date().toISOString().slice(0, 10)
                  });
                }} className="space-y-3 text-xs font-sans">
                  <div className="grid grid-cols-2 gap-2">
                    <input name="chapter" required placeholder="章节序号 (例: 第一章)" className="p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                    <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  </div>
                  <input name="title" required placeholder="章节标题" className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />

                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] text-[#6E7C75]">正文内容：</label>
                      <button
                        type="button"
                        onClick={() => handleAiPolishText('textarea[name="content"]', (val) => {
                          const area = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                          if (area) area.value = val;
                        })}
                        disabled={isAiPolishLoading}
                        className="text-[10px] text-[#E88765] hover:underline flex items-center gap-0.5"
                      >
                        <Wand2 className="w-3 h-3" /> {isAiPolishLoading ? '润色中...' : '✨ AI 润色正文'}
                      </button>
                    </div>
                    <textarea name="content" required rows={6} placeholder="正文内容..." className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white font-serif focus:outline-none focus:border-[#5B7B6D]" />
                  </div>

                  <button type="submit" className="w-full py-3 bg-[#5B7B6D] text-white font-bold rounded-xl shadow-sm hover:bg-[#3E564B] transition-all">收入拾忆篇</button>
                </form>
              )}

              {/* Modal 4: Add Artifact */}
              {activeModal === 'addArtifact' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addItem('artifacts', {
                    id: 'a-' + Date.now(),
                    name: fd.get('name') as string,
                    date: fd.get('date') as string,
                    story: fd.get('story') as string,
                    image: formArtifactImage || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80'
                  });
                  setFormArtifactImage('');
                }} className="space-y-3.5 text-xs font-sans">

                  <LocalImageUploader
                    value={formArtifactImage}
                    onChange={setFormArtifactImage}
                    label="旧物照片 (本地上传)"
                    helperText="上传纪念物、老物件实物照片，支持离线永久保存"
                    aspectRatio="video"
                    extraAction={
                      <button
                        type="button"
                        onClick={() => {
                          const name = (document.querySelector('input[name="name"]') as HTMLInputElement)?.value || '古老纪念物';
                          handleGenerateAiImage(name, (url) => {
                            setFormArtifactImage(url);
                          });
                        }}
                        disabled={isAiGenImageLoading}
                        className="text-[11px] text-[#E88765] hover:text-[#D46C49] flex items-center gap-1 font-medium transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        {isAiGenImageLoading ? '绘图中...' : '🎨 AI 生成旧物画'}
                      </button>
                    }
                  />

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">物品名称 <span className="text-[#E88765] font-bold">* 必填</span></label>
                    <input name="name" required placeholder="如：理光GR胶片机、毕业明信片、第一台随身听" className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">获得/纪念日期 <span className="text-[#E88765] font-bold">* 必填</span></label>
                    <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">物品背后的回忆与意义 <span className="text-[#E88765] font-bold">* 必填</span></label>
                    <textarea name="story" required rows={3} placeholder="写下这件旧物与你之间的专属故事与温存回忆..." className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  </div>

                  <button type="submit" className="w-full py-3 bg-[#5B7B6D] text-white font-bold rounded-xl shadow-sm hover:bg-[#3E564B] transition-all">展出旧物</button>
                </form>
              )}

              {/* Modal 5: Add Letter */}
              {activeModal === 'addLetter' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addItem('letters', {
                    id: 'l-' + Date.now(),
                    title: fd.get('title') as string,
                    unlockDate: fd.get('unlockDate') as string,
                    content: fd.get('content') as string,
                    isUnlocked: false
                  });
                }} className="space-y-3 text-xs font-sans">
                  <input name="title" required placeholder="信件标题" className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#6E7C75]">设定的未来的开启日期：</label>
                    <input name="unlockDate" type="date" required defaultValue="2030-01-01" className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  </div>
                  <textarea name="content" required rows={4} placeholder="写给未来的话语..." className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  <button type="submit" className="w-full py-3 bg-[#5B7B6D] text-white font-bold rounded-xl shadow-sm hover:bg-[#3E564B] transition-all">封存胶囊</button>
                </form>
              )}

              {/* Modal: Backup, Password, and Gemini Settings */}
              {activeModal === 'backup' && (
                <div className="space-y-4 text-xs font-sans">
                  {/* Security PIN & Persistent Lock Section */}
                  <div className="p-3.5 bg-white rounded-2xl border border-[#5B7B6D]/15 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-[#2B332E] flex items-center gap-1.5 text-xs font-serif">
                        <ShieldCheck className="w-4 h-4 text-[#E88765]" /> 私人空间安全与锁定
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D] font-medium font-sans">
                        已启用持久防护
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6E7C75] leading-relaxed">
                      锁定后即使彻底关闭后台或重启 App，重新打开依旧保持锁定状态，需输入口令方可进入。
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLocked(true);
                          localStorage.setItem('shinian_is_locked', 'true');
                          setActiveModal(null);
                          showToast('私人空间已锁定');
                        }}
                        className="flex-1 py-2 bg-[#5B7B6D] text-white rounded-xl text-xs font-bold hover:bg-[#3E564B] transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Lock className="w-3.5 h-3.5" /> 即刻锁定空间
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null);
                          setIsChangingPin(true);
                        }}
                        className="py-2 px-3 bg-[#FAF8F5] text-[#E88765] border border-[#E88765]/30 rounded-xl text-xs font-medium hover:bg-[#FDF0EB] transition-all flex items-center justify-center gap-1"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> 修改口令
                      </button>
                    </div>
                  </div>

                  {/* Minimalist AI Engine Settings */}
                  <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#5B7B6D]/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-[#2B332E] flex items-center gap-1.5 text-xs font-serif">
                        <Sparkles className="w-4 h-4 text-[#E88765]" /> AI 智能引擎
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#5B7B6D]/20 text-[#5B7B6D] font-medium font-sans">
                        {aiEngine === 'deepseek' ? 'DeepSeek 模式' : '标准模型'}
                      </span>
                    </div>

                    {/* Engine Selection Radios */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAiEngine('gemini');
                          localStorage.setItem('shinian_ai_engine', 'gemini');
                          showToast('已切换为标准 AI 模型');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          aiEngine === 'gemini'
                            ? 'bg-white border-[#5B7B6D] ring-1 ring-[#5B7B6D]/30 shadow-xs'
                            : 'bg-white/60 border-[#5B7B6D]/15 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[11px] text-[#2B332E] flex items-center gap-1">
                            ⚡ 标准模型
                          </span>
                          {aiEngine === 'gemini' && <Check className="w-3.5 h-3.5 text-[#5B7B6D]" />}
                        </div>
                        <p className="text-[10px] text-[#6E7C75] leading-relaxed">内置快速响应，支持回忆对谈与识图</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiEngine('deepseek');
                          localStorage.setItem('shinian_ai_engine', 'deepseek');
                          showToast('已切换为 DeepSeek 引擎');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          aiEngine === 'deepseek'
                            ? 'bg-white border-[#E88765] ring-1 ring-[#E88765]/30 shadow-xs'
                            : 'bg-white/60 border-[#5B7B6D]/15 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[11px] text-[#2B332E] flex items-center gap-1">
                            🐉 DeepSeek
                          </span>
                          {aiEngine === 'deepseek' && <Check className="w-3.5 h-3.5 text-[#E88765]" />}
                        </div>
                        <p className="text-[10px] text-[#6E7C75] leading-relaxed">DeepSeek-V3 深度文本推理</p>
                      </button>
                    </div>

                    {/* Conditional DeepSeek API Key Input */}
                    {aiEngine === 'deepseek' && (
                      <div className="space-y-1.5 pt-1 animate-fadeIn bg-white p-2.5 rounded-xl border border-[#E88765]/25">
                        <label className="text-[10px] text-[#2B332E] font-bold flex items-center justify-between">
                          <span>DeepSeek API Key (sk-...)：</span>
                          <a
                            href="https://platform.deepseek.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#E88765] hover:underline"
                          >
                            获取 Key &gt;
                          </a>
                        </label>
                        <input
                          type="password"
                          value={deepSeekKey}
                          onChange={(e) => {
                            setDeepSeekKey(e.target.value);
                            localStorage.setItem('shinian_deepseek_key', e.target.value);
                          }}
                          placeholder="粘贴你的 DeepSeek API Key"
                          className="w-full p-2 rounded-lg border border-[#E88765]/30 bg-[#FAF8F5] focus:outline-none font-mono text-[11px]"
                        />
                      </div>
                    )}
                  </div>

                  {/* AI Voice Selection Compact Trigger Card (Optimized for Mobile) */}
                  {(() => {
                    const currentVoiceObj = TTS_VOICES.find(v => v.id === ttsSelectedVoice) || TTS_VOICES[0];
                    return (
                      <div
                        onClick={() => setIsVoicePickerModalOpen(true)}
                        className="p-3.5 bg-white rounded-2xl border border-[#5B7B6D]/15 hover:border-[#5B7B6D]/40 transition-all cursor-pointer flex flex-col xs:flex-row xs:items-center justify-between gap-3 shadow-2xs group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#5B7B6D]/20 flex items-center justify-center shrink-0 group-hover:bg-[#5B7B6D]/10 transition-colors">
                            <Headphones className="w-5 h-5 text-[#5B7B6D]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4 className="font-bold text-[#2B332E] text-xs font-serif whitespace-nowrap">AI 朗诵音色偏好</h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-sans font-medium shrink-0 whitespace-nowrap ${
                                currentVoiceObj.gender === '女声'
                                  ? 'bg-[#FDF0EB] text-[#E88765]'
                                  : currentVoiceObj.gender === '男声'
                                  ? 'bg-[#5B7B6D]/10 text-[#5B7B6D]'
                                  : 'bg-stone-100 text-stone-600'
                              }`}>
                                {currentVoiceObj.gender} · {currentVoiceObj.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#6E7C75] truncate mt-0.5 leading-tight">{currentVoiceObj.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-1 shrink-0 text-[#5B7B6D] text-[11px] font-medium font-sans bg-[#FAF8F5] group-hover:bg-[#5B7B6D] group-hover:text-white px-3 py-1.5 rounded-xl border border-[#5B7B6D]/20 transition-all shadow-2xs self-end xs:self-center">
                          <span className="whitespace-nowrap">选择音色</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Export & Import Full Offline Archive */}
                  <div className="p-3.5 bg-white rounded-2xl border border-[#5B7B6D]/15 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-[#2B332E] flex items-center gap-1.5 text-xs font-serif">
                        <Database className="w-4 h-4 text-[#5B7B6D]" /> 离线档案备份与恢复
                      </h4>
                      <span className="text-[10px] text-[#6E7C75]">纯本地单机存储</span>
                    </div>

                    {/* Export Card */}
                    <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#5B7B6D]/15 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#2B332E] text-[11px] flex items-center gap-1">
                          <Download className="w-3.5 h-3.5 text-[#5B7B6D]" /> 导出全量离线档案
                        </span>
                        <span className="text-[10px] text-[#6E7C75]">
                          共 {data.timeline.length + data.people.length + data.stories.length + data.artifacts.length + data.letters.length} 项记录
                        </span>
                      </div>
                      <p className="text-[#6E7C75] text-[10px]">将全部时间轴、人物档案、故事长篇、旧物及寄年胶囊打包下载保存为标准 JSON 备份包。</p>
                      <button
                        type="button"
                        onClick={handleExport}
                        className="w-full py-2 bg-[#5B7B6D] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#3E564B] transition-all shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" /> 下载离线档案包 (.json)
                      </button>
                    </div>

                    {/* Import Card / Center */}
                    <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#5B7B6D]/15 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#2B332E] text-[11px] flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5 text-[#E88765]" /> 导入恢复离线档案
                        </span>
                        {importPreview && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                            已解析文件
                          </span>
                        )}
                      </div>

                      {!importPreview ? (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(true);
                          }}
                          onDragLeave={() => setIsDraggingFile(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) processBackupFile(file);
                          }}
                          className={`p-4 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer relative ${
                            isDraggingFile
                              ? 'border-[#E88765] bg-[#FDF0EB]/60'
                              : 'border-[#5B7B6D]/20 bg-white hover:border-[#5B7B6D]/50'
                          }`}
                        >
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <FileJson className="w-7 h-7 mx-auto text-[#5B7B6D]/60 mb-1.5" />
                          <p className="text-[11px] font-bold text-[#2B332E]">点击选择或拖放 JSON 备份文件至此</p>
                          <p className="text-[10px] text-[#6E7C75] mt-0.5">支持从其他设备或先前导出的《拾年》离线数据包</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-white rounded-xl border border-[#5B7B6D]/20 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-[#5B7B6D]/10 pb-2">
                            <div className="flex items-center gap-2">
                              <FileJson className="w-4 h-4 text-[#5B7B6D]" />
                              <span className="font-bold text-[11px] text-[#2B332E] truncate max-w-[180px]">{importPreview.filename}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setImportPreview(null)}
                              className="text-[10px] text-[#6E7C75] hover:text-[#E88765] underline"
                            >
                              重新选择
                            </button>
                          </div>

                          {/* Data preview badges */}
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center text-[10px]">
                            <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#5B7B6D]/10">
                              <span className="block text-[#6E7C75] text-[9px]">时光轴</span>
                              <strong className="text-[#5B7B6D] font-bold">{importPreview.timelineCount}</strong>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#5B7B6D]/10">
                              <span className="block text-[#6E7C75] text-[9px]">拾人册</span>
                              <strong className="text-[#5B7B6D] font-bold">{importPreview.peopleCount}</strong>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#5B7B6D]/10">
                              <span className="block text-[#6E7C75] text-[9px]">故事篇</span>
                              <strong className="text-[#5B7B6D] font-bold">{importPreview.storiesCount}</strong>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#5B7B6D]/10">
                              <span className="block text-[#6E7C75] text-[9px]">旧物阁</span>
                              <strong className="text-[#5B7B6D] font-bold">{importPreview.artifactsCount}</strong>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#5B7B6D]/10">
                              <span className="block text-[#6E7C75] text-[9px]">寄年胶囊</span>
                              <strong className="text-[#5B7B6D] font-bold">{importPreview.lettersCount}</strong>
                            </div>
                          </div>

                          {/* Import Mode Selector */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-[#2B332E] font-bold block">选择恢复导入方式：</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setImportMode('merge')}
                                className={`p-2 rounded-xl border text-left transition-all ${
                                  importMode === 'merge'
                                    ? 'bg-[#FAF8F5] border-[#5B7B6D] ring-1 ring-[#5B7B6D]/30'
                                    : 'bg-white border-stone-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="font-bold text-[10px] text-[#2B332E]">增量合并 (推荐)</span>
                                  {importMode === 'merge' && <Check className="w-3 h-3 text-[#5B7B6D]" />}
                                </div>
                                <p className="text-[9px] text-[#6E7C75]">保留现有数据，仅合入不重复的新增记录</p>
                              </button>

                              <button
                                type="button"
                                onClick={() => setImportMode('overwrite')}
                                className={`p-2 rounded-xl border text-left transition-all ${
                                  importMode === 'overwrite'
                                    ? 'bg-[#FDF0EB] border-[#E88765] ring-1 ring-[#E88765]/30'
                                    : 'bg-white border-stone-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="font-bold text-[10px] text-[#E88765]">全量覆盖还原</span>
                                  {importMode === 'overwrite' && <Check className="w-3 h-3 text-[#E88765]" />}
                                </div>
                                <p className="text-[9px] text-[#6E7C75]">清空当前记录，完全以该备份为准</p>
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setImportPreview(null)}
                              className="flex-1 py-2 rounded-xl border border-stone-200 text-[#6E7C75] hover:bg-stone-50 text-[11px]"
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmImport}
                              className="flex-2 py-2 bg-[#E88765] text-white font-bold rounded-xl hover:bg-[#E88765]/90 transition-all text-[11px] shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              确认恢复档案
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Modal for Editing Person Profile */}
        {isEditingPerson && selectedPerson && (
          <div className="absolute inset-0 bg-[#2B332E]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn font-sans">
            <div className="bg-[#FAF8F5] w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 rounded-3xl border border-[#5B7B6D]/20 shadow-2xl space-y-3.5 text-xs">
              <div className="flex justify-between items-center border-b border-[#5B7B6D]/10 pb-2">
                <h3 className="font-bold text-[#2B332E] text-sm font-serif flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#5B7B6D]" />
                  修改【{selectedPerson.name}】档案
                </h3>
                <button onClick={() => setIsEditingPerson(false)} className="text-[#6E7C75] hover:text-[#2B332E]">
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
              }} className="space-y-3.5">

                {/* Section 1: 核心必填档案 */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#E88765]/30 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                    <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-[#E88765] rounded-full inline-block"></span>
                      核心档案
                    </h4>
                    <span className="text-[10px] text-[#E88765] bg-[#FDF0EB] px-2 py-0.5 rounded-full font-medium border border-[#E88765]/20">
                      * 必填项
                    </span>
                  </div>

                  {/* Local Avatar Uploader */}
                  <LocalImageUploader
                    value={editPersonAvatar || selectedPerson.avatar}
                    onChange={setEditPersonAvatar}
                    mode="avatar"
                    label="人物头像"
                    required={true}
                  />

                  <div>
                    <label className="text-[11px] font-medium text-[#2B332E] block mb-1">
                      姓名 / 称谓 <span className="text-[#E88765] font-bold">* 必填</span>
                    </label>
                    <input
                      name="name"
                      defaultValue={selectedPerson.name}
                      required
                      placeholder="如：陆青寻、林夏、老林、陈老师"
                      className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E88765] transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-medium text-[#2B332E]">
                        与我的关系 <span className="text-[#E88765] font-bold">* 必填</span>
                      </label>
                      <span className="text-[10px] text-[#6E7C75]">可点击下方标签快捷选择</span>
                    </div>
                    <input
                      name="relationship"
                      required
                      value={editPersonRel || selectedPerson.relationship}
                      onChange={(e) => setEditPersonRel(e.target.value)}
                      placeholder="如：挚友、大学室友、高中闺蜜、父母、恩师"
                      className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E88765] transition-colors mb-2"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {['挚友', '发小', '高中同窗', '大学室友', '父母家人', '恩师', '同行伙伴'].map((rel) => (
                        <button
                          key={rel}
                          type="button"
                          onClick={() => setEditPersonRel(rel)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                            (editPersonRel || selectedPerson.relationship) === rel
                              ? 'bg-[#5B7B6D] text-white border-[#5B7B6D]'
                              : 'bg-[#FAF8F5] text-[#6E7C75] border-[#5B7B6D]/15 hover:border-[#5B7B6D]/40'
                          }`}
                        >
                          {rel}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 2: 分组归类与基本信息 */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                    <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-[#5B7B6D] rounded-full inline-block"></span>
                      分组归类与基本信息
                    </h4>
                    <span className="text-[10px] text-[#6E7C75] bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                      选填
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">好友分组</label>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {Array.from(new Set([...customGroups, '未分组'])).map(grp => (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setEditPersonGroup(grp)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                            (editPersonGroup || selectedPerson.group || '未分组') === grp
                              ? 'bg-[#5B7B6D] text-white border-[#5B7B6D]'
                              : 'bg-[#FAF8F5] text-[#6E7C75] border-[#5B7B6D]/15 hover:border-[#5B7B6D]/40'
                          }`}
                        >
                          {grp}
                        </button>
                      ))}
                    </div>
                    <input
                      name="group"
                      value={editPersonGroup || selectedPerson.group || '未分组'}
                      onChange={(e) => setEditPersonGroup(e.target.value)}
                      placeholder="或输入自定义分组名称"
                      className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">
                        相识起始日期
                      </label>
                      <input
                        name="knownDate"
                        type="date"
                        defaultValue={selectedPerson.knownDate || '2021-09-01'}
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">
                        生日
                      </label>
                      <input
                        name="birthday"
                        defaultValue={selectedPerson.birthday !== '未填写' ? selectedPerson.birthday : ''}
                        placeholder="如：10月24日、1998-05-12"
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">认识地点</label>
                      <input
                        name="knowWhere"
                        defaultValue={selectedPerson.customFields?.['认识地点'] || ''}
                        placeholder="如：老校区林荫路、大一画室"
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">喜欢的颜色</label>
                      <input name="color" defaultValue={selectedPerson.color} placeholder="如：鼠尾草绿、暖杏粉" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">兴趣爱好</label>
                    <input name="hobbies" defaultValue={selectedPerson.hobbies !== '未填写' ? selectedPerson.hobbies : ''} placeholder="如：胶片摄影、烘焙甜品、骑行" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  </div>
                </div>

                {/* Section 3: 社交与联系方式 (选填) */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                    <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-[#5B7B6D] rounded-full inline-block"></span>
                      社交与联系方式
                    </h4>
                    <span className="text-[10px] text-[#6E7C75] bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                      选填
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">微信号</label>
                      <input
                        name="wechat"
                        defaultValue={selectedPerson.wechat || ''}
                        placeholder="如：wx_summer07"
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">QQ 号</label>
                      <input
                        name="qq"
                        defaultValue={selectedPerson.qq || ''}
                        placeholder="如：83920194"
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">手机 / 电话</label>
                    <input
                      name="phone"
                      defaultValue={selectedPerson.phone || ''}
                      placeholder="如：13812349201"
                      className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                    />
                  </div>
                </div>

                {/* Section 4: 生平寄语与概述 */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                    <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-[#8C6D52] rounded-full inline-block"></span>
                      生平寄语与概述
                    </h4>
                    <span className="text-[10px] text-[#6E7C75] bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                      选填
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">一句话人物总结</label>
                    <textarea name="bio" defaultValue={selectedPerson.bio} rows={2} placeholder="如：一起在晚自习后看过无数次晚霞的知心挚友" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsEditingPerson(false)} className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white text-[#6E7C75] font-medium">取消</button>
                  <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#5B7B6D] text-white font-bold hover:bg-[#3E564B] transition-all shadow-xs">保存更新</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Selected Artifact Detail Modal */}
        {selectedArtifact && (
          <div className="absolute inset-0 bg-[#2B332E]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#FAF8F5] w-full max-h-[90%] overflow-y-auto p-5 rounded-3xl border border-[#5B7B6D]/20 shadow-2xl space-y-4 relative">
              <div className="flex justify-between items-center border-b border-[#5B7B6D]/10 pb-3">
                <span className="text-xs font-bold text-[#E88765] flex items-center gap-1 font-sans">
                  <Calendar className="w-3 h-3" /> {selectedArtifact.date}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlayTts(`${selectedArtifact.name}。${selectedArtifact.story}`)}
                    className="px-2.5 py-1 bg-[#FDF0EB] text-[#E88765] rounded-full text-xs font-medium flex items-center gap-1 hover:bg-[#E88765] hover:text-white transition-all font-sans"
                  >
                    <Volume2 className="w-3 h-3" /> 听回忆
                  </button>
                  <button
                    onClick={() => {
                      requestDelete('artifacts', selectedArtifact.id, selectedArtifact.name);
                    }}
                    className="p-1.5 text-[#6E7C75]/50 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                    title="删除旧物"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedArtifact(null)} className="p-1 text-[#6E7C75] hover:text-[#2B332E]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="h-60 w-full rounded-2xl overflow-hidden bg-[#F2EFE9] border border-[#5B7B6D]/15 shadow-sm">
                <img src={selectedArtifact.image} alt={selectedArtifact.name} className="w-full h-full object-cover" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-[#2B332E] font-serif">{selectedArtifact.name}</h2>
                <div className="text-xs text-[#2B332E] leading-relaxed font-serif whitespace-pre-line p-3.5 bg-white rounded-xl border border-[#5B7B6D]/10 shadow-inner">
                  {selectedArtifact.story}
                </div>
              </div>

              <button
                onClick={() => setSelectedArtifact(null)}
                className="w-full py-2.5 bg-[#5B7B6D] text-white font-bold rounded-xl shadow-sm hover:bg-[#3E564B] transition-all text-xs font-sans"
              >
                关闭旧物展台
              </button>
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
                          <Sparkles className="w-3 h-3 text-[#E88765]" /> 封存信笺 · 展读模式
                        </span>
                        <span className="text-[10px] text-[#E88765] bg-[#FDF0EB] px-2 py-0.5 rounded-full font-medium">
                          ✦ 已化火漆 ✦
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
                        你可以静候约定之日自动开启，亦可现在由你亲手点触提前破蜡拆阅。
                      </p>
                    </div>

                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        disabled={isUnsealingLetter}
                        onClick={() => handleUnsealLetter(selectedLetter)}
                        className={`px-5 py-2.5 bg-gradient-to-r from-[#E88765] to-[#D97350] hover:from-[#D97350] hover:to-[#C66240] text-white text-xs font-bold rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95 ${
                          isUnsealingLetter ? 'opacity-75 cursor-wait' : 'hover:shadow-lg'
                        }`}
                      >
                        <Sparkles className={`w-4 h-4 ${isUnsealingLetter ? 'animate-spin' : ''}`} />
                        <span>{isUnsealingLetter ? '正在解化火漆封蜡...' : '亲手拆开火漆信封'}</span>
                      </button>
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

        {/* Story Edit Modal */}
        {editingStory && (
          <div className="absolute inset-0 bg-[#2B332E]/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className="bg-[#FAF8F5] w-full max-h-[90%] overflow-y-auto p-5 rounded-t-3xl sm:rounded-3xl border border-[#5B7B6D]/20 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-[#5B7B6D]/10 pb-3">
                <h3 className="font-bold text-[#2B332E] text-base flex items-center gap-2 font-serif">
                  <Edit3 className="w-4 h-4 text-[#5B7B6D]" /> 编辑故事篇章
                </h3>
                <button onClick={() => setEditingStory(null)} className="text-[#6E7C75] hover:text-[#2B332E]">
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
                  date: (fd.get('date') as string) || new Date().toISOString().slice(0, 10),
                  content: (fd.get('editStoryContent') as string)?.trim() || ''
                });
              }} className="space-y-3.5 text-xs font-sans">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">篇章卷次 / 序号：</label>
                    <input
                      name="chapter"
                      required
                      defaultValue={editingStory.chapter}
                      placeholder="例如: 第一章 · 初见"
                      className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">故事所属日期：</label>
                    <input
                      name="date"
                      type="date"
                      required
                      defaultValue={editingStory.date}
                      className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#6E7C75] block mb-1">篇章标题：</label>
                  <input
                    name="title"
                    required
                    defaultValue={editingStory.title}
                    placeholder="章节标题"
                    className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#5B7B6D]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] text-[#6E7C75]">篇章正文内容：</label>
                    <button
                      type="button"
                      onClick={() => handleAiPolishText('textarea[name="editStoryContent"]', (val) => {
                        const area = document.querySelector('textarea[name="editStoryContent"]') as HTMLTextAreaElement;
                        if (area) area.value = val;
                      })}
                      disabled={isAiPolishLoading}
                      className="text-[10px] text-[#E88765] hover:underline flex items-center gap-0.5"
                    >
                      <Wand2 className="w-3 h-3" /> {isAiPolishLoading ? '润色中...' : '✨ AI 润色正文'}
                    </button>
                  </div>
                  <textarea
                    name="editStoryContent"
                    required
                    rows={8}
                    defaultValue={editingStory.content}
                    placeholder="在此编辑正文故事..."
                    className="w-full p-3 rounded-xl border border-[#5B7B6D]/20 bg-white font-serif leading-relaxed focus:outline-none focus:border-[#5B7B6D]"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingStory(null)}
                    className="flex-1 py-3 bg-[#F2EFE9] text-[#6E7C75] font-semibold rounded-xl hover:bg-[#E8E4DC] transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#5B7B6D] text-white font-bold rounded-xl shadow-sm hover:bg-[#3E564B] transition-all active:scale-[0.99]"
                  >
                    保存篇章修改
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
                    deleteItem(confirmDialog.type, confirmDialog.id);
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

        {/* Dynamic Frosted Glass Bottom Navigation Bar: Floating Capsule with Safe Area Inset */}
        <div className="shrink-0 z-30 px-3 sm:px-4 pt-1 pb-[max(0.625rem,env(safe-area-inset-bottom))] select-none">
          <nav 
            id="dynamic-bottom-nav" 
            className="dynamic-glass-navbar relative rounded-[26px] sm:rounded-3xl px-1.5 py-1.5 flex justify-around items-center"
          >
            <NavItem id="home" label="首页" icon={Landmark} active={activeTab} onClick={() => setActiveTab('home')} />
            <NavItem id="timeline" label="拾光轴" icon={Clock} active={activeTab} onClick={() => setActiveTab('timeline')} />
            <NavItem id="people" label="拾人册" icon={Users} active={activeTab} onClick={() => { setSelectedPerson(null); setActiveTab('people'); }} />
            <NavItem id="stories" label="拾忆篇" icon={BookOpen} active={activeTab} onClick={() => { setReaderStory(null); setActiveTab('stories'); }} />
            <NavItem id="artifacts" label="拾物阁" icon={Package} active={activeTab} onClick={() => setActiveTab('artifacts')} />
          </nav>
        </div>

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
        scale: 1.015,
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
      }}
      style={{ willChange: 'opacity, transform' }}
      className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col items-center justify-between p-6 sm:p-8 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-[#FAF8F5] overflow-hidden select-none cursor-pointer transform-gpu"
      onClick={onDismiss}
    >
      {/* Background Ambient Fluid Glows (Hardware Accelerated) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Ambient Top Left Glow */}
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-35 transform-gpu transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, ${theme.primary} 0%, rgba(250, 248, 245, 0) 70%)`
          }}
        />
        {/* Ambient Bottom Right Glow */}
        <div
          className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-30 transform-gpu transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, ${theme.accent} 0%, rgba(250, 248, 245, 0) 70%)`
          }}
        />
        {/* Subtle Paper Texture */}
        <div className="absolute inset-0 paper-texture opacity-40" />
      </div>

      {/* Top Header: Pure Minimalist Glass Badge */}
      <div className="w-full flex items-center justify-center relative z-10 pt-1 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/70 border border-[#5B7B6D]/15 shadow-2xs"
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-ping"
            style={{ backgroundColor: theme.primary, animationDuration: '3s' }}
          />
          <span className="text-[10px] text-[#526058] tracking-[0.3em] font-serif uppercase pl-[0.3em]">
            MEMOIRE · 拾年
          </span>
        </motion.div>
      </div>

      {/* Center Hero: Floating Dynamic Frosted Glass Card (Zero-Reflow Flexbox with my-auto) */}
      <div className="flex flex-col items-center justify-center relative z-10 my-auto w-full max-w-sm px-3 shrink-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.6,
            delay: 0.08,
            ease: [0.22, 1, 0.36, 1]
          }}
          className="w-full bg-white/80 border border-white/90 shadow-xl rounded-[32px] p-7 sm:p-9 relative overflow-hidden flex flex-col items-center text-center transition-all transform-gpu"
        >
          {/* Top Lens Inner Glow */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent pointer-events-none rounded-t-[32px]" />

          {/* Chrono Index Label */}
          <div className="flex items-center gap-2.5 mb-5 relative z-10">
            <div className="w-6 h-[0.5px] bg-[#5B7B6D]/30" />
            <span className="text-[9px] sm:text-[10px] tracking-[0.45em] text-[#6E7C75] uppercase font-sans font-medium pl-[0.45em]">
              THE DECADE CHRONICLE
            </span>
            <div className="w-6 h-[0.5px] bg-[#5B7B6D]/30" />
          </div>

          {/* Main Title: 拾 年 */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-4 z-10"
          >
            <div
              className="absolute inset-0 blur-lg opacity-20 -z-10 scale-125"
              style={{ backgroundColor: theme.primary }}
            />

            <h1
              className="text-6xl sm:text-7xl font-bold font-serif text-[#2B332E] select-none drop-shadow-2xs tracking-[0.32em] pl-[0.32em]"
              style={{
                fontFamily: '"Noto Serif SC", "Ma Shan Zheng", Georgia, serif'
              }}
            >
              拾年
            </h1>
          </motion.div>

          {/* Minimalist Seal Ornament Line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
            className="flex items-center justify-center gap-2 mb-5 w-full relative z-10"
          >
            <div className="h-[0.5px] w-10 bg-gradient-to-r from-transparent to-[#5B7B6D]/35" />
            <div
              className="w-1.5 h-1.5 rotate-45 border"
              style={{ borderColor: theme.accent, backgroundColor: `${theme.accent}35` }}
            />
            <div className="h-[0.5px] w-10 bg-gradient-to-l from-transparent to-[#5B7B6D]/35" />
          </motion.div>

          {/* Poetic Subtitles */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-2 relative z-10"
          >
            <p
              className="text-base sm:text-lg font-bold font-serif tracking-[0.25em] pl-[0.25em] select-none"
              style={{ color: theme.primaryDark }}
            >
              岁华清照 · 拾年归处
            </p>

            <p className="text-[11px] sm:text-xs text-[#6E7C75] font-serif tracking-[0.2em] pl-[0.2em] opacity-90 leading-relaxed">
              拾起十载光阴 · 藏于温润心隅
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Footer: Hardware-Accelerated Progress Track */}
      <div className="w-full flex flex-col items-center gap-3 relative z-10 pb-1 shrink-0">
        <div className="w-36 h-1.5 bg-white/70 border border-[#5B7B6D]/20 rounded-full p-[1px] shadow-2xs overflow-hidden">
          <div
            className="h-full rounded-full splash-progress-bar shadow-xs"
            style={{
              backgroundColor: theme.primary
            }}
          />
        </div>

        <p className="text-[10px] text-[#6E7C75]/70 font-serif tracking-widest">
          轻触开启时光
        </p>

        {/* iOS Home Indicator Bar */}
        <div className="w-32 h-1 bg-black/15 rounded-full mt-0.5" />
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
    <button
      type="button"
      id={`nav-item-${id}`}
      onClick={onClick}
      className={`min-h-[46px] min-w-[52px] flex-1 max-w-[76px] flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-2xl transition-all duration-200 select-none touch-manipulation active:scale-95 ${
        isActive
          ? 'text-[#E88765] font-bold'
          : 'text-[#6E7C75] hover:text-[#2B332E] active:text-[#2B332E]'
      }`}
    >
      <div 
        className={`p-1.5 rounded-xl transition-all duration-200 ${
          isActive 
            ? 'bg-[#E88765]/15 text-[#E88765] shadow-2xs scale-105' 
            : 'text-current bg-transparent'
        }`}
      >
        <IconComp className="w-4 h-4" />
      </div>
      <span className={`text-[10px] tracking-wider font-serif whitespace-nowrap leading-none transition-colors duration-200 ${
        isActive ? 'text-[#E88765] font-bold' : 'text-[#6E7C75]'
      }`}>
        {label}
      </span>
    </button>
  );
}

function EntranceCard({
  title,
  subtitle,
  icon: IconComp,
  count,
  unit = '项记录',
  onClick
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  unit?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-sm cursor-pointer hover:border-[#E88765]/40 active:border-[#E88765] active:scale-[0.98] transition-all flex flex-col justify-between h-28 group select-none touch-manipulation"
    >
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-xl bg-[#F2EFE9] text-[#5B7B6D] group-hover:bg-[#FDF0EB] group-hover:text-[#E88765] transition-colors">
          <IconComp className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-bold text-[#E88765] font-sans">{count} {unit}</span>
      </div>
      <div>
        <h3 className="font-bold text-[#2B332E] text-sm font-serif group-hover:text-[#5B7B6D] transition-colors">{title}</h3>
        <p className="text-[10px] text-[#6E7C75] font-sans">{subtitle}</p>
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
      impressions: number;
      people: number;
      letters: number;
    }>;
    totalAll: number;
    totals: {
      timeline: number;
      stories: number;
      artifacts: number;
      people: number;
      impressions: number;
      letters: number;
    };
  };
  theme: HealingTheme;
}

function ChronoYearPickerModal({
  isOpen: _isOpen,
  onClose,
  selectedYear,
  onSelectYear,
  years,
  yearStats,
  theme
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
        className="absolute inset-0 bg-[#2B332E]/40"
      />

      {/* iOS Modal Sheet Card */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-lg bg-[#FAF8F5] rounded-t-[32px] sm:rounded-[28px] border border-[#5B7B6D]/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] z-10 font-sans transform-gpu"
        style={{
          boxShadow: '0 -10px 40px -10px rgba(43, 51, 46, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
          willChange: 'transform'
        }}
      >
        {/* iOS Grabber */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-black/20 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#5B7B6D]/10 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-2xl shadow-xs"
              style={{ backgroundColor: `${theme.primary}20`, color: theme.primaryDark }}
            >
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#2B332E] text-sm font-serif flex items-center gap-1.5">
                时光纪年 · 岁月回溯
              </h3>
              <p className="text-[10px] text-[#6E7C75] font-serif">
                默认全景时光 · 沉淀十载光阴
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-[#6E7C75] hover:text-[#2B332E] transition-all active:scale-90"
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
                ? 'bg-gradient-to-br from-white via-[#FAF8F5] to-[#F2EFE9] border-[#5B7B6D] shadow-md ring-2 ring-[#5B7B6D]/20'
                : 'bg-white/80 border-[#5B7B6D]/15 hover:border-[#5B7B6D]/40 hover:bg-white'
            }`}
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    selectedYear === 'all'
                      ? 'bg-[#5B7B6D] text-white shadow-sm'
                      : 'bg-[#F2EFE9] text-[#5B7B6D] group-hover:bg-[#E8E4DC]'
                  }`}
                >
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-[#2B332E] font-serif">
                      🌟 全景时光 · 浩瀚岁月
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D] font-medium">
                      默认全览
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6E7C75] mt-0.5 font-serif">
                    汇聚全部时光记忆（共 {yearStats.totalAll} 项时光档案）
                  </p>
                </div>
              </div>

              {selectedYear === 'all' ? (
                <div className="w-6 h-6 rounded-full bg-[#5B7B6D] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                </div>
              ) : (
                <span className="text-[11px] font-medium text-[#5B7B6D] opacity-0 group-hover:opacity-100 transition-opacity">
                  切换全览 →
                </span>
              )}
            </div>

            {/* Real-time Category Breakdown in Panorama Card */}
            <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-[#5B7B6D]/10 text-[10px] text-[#5B7B6D] font-sans">
              <span className="px-2 py-0.5 rounded-md bg-white border border-[#5B7B6D]/15 font-medium shadow-2xs">
                {yearStats.totals.timeline} 节点
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-[#5B7B6D]/15 font-medium shadow-2xs">
                {yearStats.totals.stories} 篇章
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-[#5B7B6D]/15 font-medium shadow-2xs">
                {yearStats.totals.artifacts} 旧物
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-[#5B7B6D]/15 font-medium shadow-2xs">
                {yearStats.totals.people} 人物
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-[#5B7B6D]/15 font-medium shadow-2xs">
                {yearStats.totals.impressions} 印象
              </span>
              {yearStats.totals.letters > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-white border border-[#5B7B6D]/15 font-medium shadow-2xs">
                  {yearStats.totals.letters} 胶囊
                </span>
              )}
            </div>

            {/* Micro subtle sheen bar */}
            {selectedYear === 'all' && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: theme.primary }}
              />
            )}
          </div>

          {/* Quick Filter Navigation Tabs & Search (Responsive mobile layout) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterMode('all_recorded')}
                className={`flex-1 sm:flex-initial whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  filterMode === 'all_recorded'
                    ? 'bg-white text-[#2B332E] shadow-2xs font-semibold'
                    : 'text-[#6E7C75] hover:text-[#2B332E]'
                }`}
              >
                全部年份 ({years.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('recent')}
                className={`flex-1 sm:flex-initial whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  filterMode === 'recent'
                    ? 'bg-white text-[#2B332E] shadow-2xs font-semibold'
                    : 'text-[#6E7C75] hover:text-[#2B332E]'
                }`}
              >
                近3年
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('custom')}
                className={`flex-1 sm:flex-initial whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  filterMode === 'custom'
                    ? 'bg-white text-[#2B332E] shadow-2xs font-semibold'
                    : 'text-[#6E7C75] hover:text-[#2B332E]'
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
                  className="w-full pl-7 pr-2.5 py-1.5 bg-white/80 border border-[#5B7B6D]/15 rounded-xl text-xs focus:outline-none focus:border-[#5B7B6D] transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-[#6E7C75] absolute left-2 top-2.5" />
              </div>
            )}
          </div>

          {/* Custom Year Direct Input Option */}
          {filterMode === 'custom' ? (
            <form
              onSubmit={handleCustomYearSubmit}
              className="p-4 bg-white rounded-2xl border border-[#5B7B6D]/20 shadow-xs space-y-3"
            >
              <div className="text-xs text-[#2B332E] font-medium font-serif">
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
                  className="flex-1 p-2.5 bg-[#FAF8F5] border border-[#5B7B6D]/20 rounded-xl text-xs focus:outline-none focus:border-[#E88765] font-mono"
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
              <p className="text-[10px] text-[#6E7C75]">
                提示：选择后可针对该特定年份进行记录检索或新增专属时光碎片。
              </p>
            </form>
          ) : (
            /* Year Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedYears.map((yr) => {
                const isCurrentSelected = selectedYear === yr;
                const stats = yearStats.statsMap[yr] || { total: 0, timeline: 0, stories: 0, artifacts: 0, impressions: 0, people: 0, letters: 0 };
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
                        ? 'bg-[#FDF0EB] border-[#E88765] shadow-sm ring-2 ring-[#E88765]/25'
                        : 'bg-white hover:bg-[#FAF8F5] border-[#5B7B6D]/15 hover:border-[#5B7B6D]/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-base font-bold font-mono tracking-tight ${
                          isCurrentSelected ? 'text-[#E88765]' : 'text-[#2B332E]'
                        }`}>
                          {yr}
                        </span>
                        <span className="text-xs text-[#6E7C75] font-serif">年</span>
                        {relativeLabel && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/5 text-[#6E7C75] font-sans">
                            {relativeLabel}
                          </span>
                        )}
                      </div>

                      {isCurrentSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#E88765] text-white flex items-center justify-center shadow-2xs">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold font-mono text-[#5B7B6D] bg-[#F2EFE9] px-2 py-0.5 rounded-full">
                          {stats.total} 项
                        </span>
                      )}
                    </div>

                    {/* Breakdown Tags */}
                    <div className="flex flex-wrap gap-1 mt-2 text-[9px] text-[#6E7C75] font-sans">
                      {stats.timeline > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#5B7B6D]/10">
                          {stats.timeline} 节点
                        </span>
                      )}
                      {stats.stories > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#5B7B6D]/10">
                          {stats.stories} 篇章
                        </span>
                      )}
                      {stats.artifacts > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#5B7B6D]/10">
                          {stats.artifacts} 旧物
                        </span>
                      )}
                      {stats.people > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#5B7B6D]/10">
                          {stats.people} 结识
                        </span>
                      )}
                      {stats.impressions > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#5B7B6D]/10">
                          {stats.impressions} 印象
                        </span>
                      )}
                      {stats.letters > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#5B7B6D]/10">
                          {stats.letters} 胶囊
                        </span>
                      )}
                    </div>

                    {/* Density Meter Bar */}
                    <div className="mt-2.5 w-full bg-black/5 h-1 rounded-full overflow-hidden">
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
                <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-dashed border-[#5B7B6D]/20 text-xs text-[#6E7C75] font-serif">
                  未找到与当前筛选匹配的年份
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-white/70 border-t border-[#5B7B6D]/10 flex items-center justify-between text-[11px] text-[#6E7C75]">
          <span className="font-serif">
            已选状态：
            <strong className="text-[#2B332E] font-medium ml-1">
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
  theme
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
        className="absolute inset-0 bg-[#2B332E]/40"
      />

      {/* iOS Modal Sheet Card */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-lg bg-[#FAF8F5] rounded-t-[32px] sm:rounded-[28px] border border-[#5B7B6D]/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] z-10 font-sans transform-gpu"
        style={{
          boxShadow: '0 -10px 40px -10px rgba(43, 51, 46, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
          willChange: 'transform'
        }}
      >
        {/* iOS Grabber */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-black/20 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#5B7B6D]/10 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-2xl shadow-xs"
              style={{ backgroundColor: `${theme.primary}20`, color: theme.primaryDark }}
            >
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#2B332E] text-sm font-serif flex items-center gap-1.5">
                好友分组 · 拾人图谱
              </h3>
              <p className="text-[10px] text-[#6E7C75] font-serif">
                沉淀相遇缘起
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-[#6E7C75] hover:text-[#2B332E] transition-all active:scale-90"
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
                ? 'bg-gradient-to-br from-white via-[#FAF8F5] to-[#F2EFE9] border-[#5B7B6D] shadow-md ring-2 ring-[#5B7B6D]/20'
                : 'bg-white/80 border-[#5B7B6D]/15 hover:border-[#5B7B6D]/40 hover:bg-white'
            }`}
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    selectedGroup === 'all'
                      ? 'bg-[#5B7B6D] text-white shadow-sm'
                      : 'bg-[#F2EFE9] text-[#5B7B6D] group-hover:bg-[#E8E4DC]'
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-[#2B332E] font-serif">
                      🌟 全部好友 · 拾人全览
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D] font-medium">
                      默认全览
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6E7C75] mt-0.5 font-serif">
                    汇聚全部相遇的同路人（共 {people.length} 位好友）
                  </p>
                </div>
              </div>

              {selectedGroup === 'all' ? (
                <div className="w-6 h-6 rounded-full bg-[#5B7B6D] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                </div>
              ) : (
                <span className="text-[11px] font-medium text-[#5B7B6D] opacity-0 group-hover:opacity-100 transition-opacity">
                  切换全览 →
                </span>
              )}
            </div>

            {/* Micro subtle sheen bar */}
            {selectedGroup === 'all' && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: theme.primary }}
              />
            )}
          </div>

          {/* Quick Filter Navigation Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterMode('all_groups')}
                className={`flex-1 sm:flex-initial whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  filterMode === 'all_groups'
                    ? 'bg-white text-[#2B332E] shadow-2xs font-semibold'
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
                    ? 'bg-white text-[#2B332E] shadow-2xs font-semibold'
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
                  className="w-full pl-7 pr-2.5 py-1.5 bg-white/80 border border-[#5B7B6D]/15 rounded-xl text-xs focus:outline-none focus:border-[#5B7B6D] transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-[#6E7C75] absolute left-2 top-2.5" />
              </div>
            )}
          </div>

          {/* Create Group Tab View */}
          {filterMode === 'create_group' ? (
            <div className="p-4 bg-white rounded-2xl border border-[#5B7B6D]/20 shadow-xs space-y-3.5">
              <div className="text-xs text-[#2B332E] font-medium font-serif flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-[#5B7B6D]" /> 自定义新建好友分组：
              </div>
              <form onSubmit={handleCreateSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={newGroupNameInput}
                  onChange={(e) => setNewGroupNameInput(e.target.value)}
                  placeholder="例如: 高中密友、摄影伙伴、工作搭子"
                  className="flex-1 p-2.5 bg-[#FAF8F5] border border-[#5B7B6D]/20 rounded-xl text-xs focus:outline-none focus:border-[#E88765]"
                />
                <button
                  type="submit"
                  disabled={!newGroupNameInput.trim()}
                  className="px-4 py-2.5 bg-[#5B7B6D] text-white rounded-xl text-xs font-bold active:bg-[#3E564B] active:scale-95 transition-all disabled:opacity-40 select-none touch-manipulation min-h-[44px]"
                >
                  创建并筛选
                </button>
              </form>

              <div>
                <span className="text-[10px] text-[#6E7C75] block mb-1.5">推荐快捷灵感：</span>
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
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#5B7B6D]/15 text-[#6E7C75] hover:border-[#5B7B6D] hover:text-[#2B332E] transition-all"
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
                        ? 'bg-[#FDF0EB] border-[#E88765] shadow-sm ring-2 ring-[#E88765]/25'
                        : 'bg-white hover:bg-[#FAF8F5] border-[#5B7B6D]/15 hover:border-[#5B7B6D]/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${
                            isCurrentSelected
                              ? 'bg-[#E88765] text-white'
                              : 'bg-[#FAF8F5] text-[#5B7B6D] border border-[#5B7B6D]/15'
                          }`}
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-sm font-bold font-serif ${
                          isCurrentSelected ? 'text-[#E88765]' : 'text-[#2B332E]'
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
                            className="p-1 text-[#6E7C75]/40 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all opacity-60 hover:opacity-100"
                            title={`删除「${grpName}」分组`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isCurrentSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#E88765] text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold font-mono text-[#5B7B6D] bg-[#F2EFE9] px-2 py-0.5 rounded-full">
                            {count} 人
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Member Avatars Overlapping Stack & Names Preview */}
                    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[#5B7B6D]/10">
                      <div className="flex items-center">
                        {members.slice(0, 3).map((m) => (
                          <img
                            key={m.id}
                            src={m.avatar}
                            alt={m.name}
                            className="w-5 h-5 rounded-full object-cover border-2 border-white shadow-2xs -ml-1.5 first:ml-0"
                          />
                        ))}
                        {members.length > 3 && (
                          <span className="w-5 h-5 rounded-full bg-[#F2EFE9] border border-white text-[9px] font-bold text-[#6E7C75] flex items-center justify-center -ml-1.5">
                            +{members.length - 3}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-[#6E7C75] truncate max-w-[150px] font-serif">
                        {members.length > 0
                          ? members.map(m => m.name).join('、')
                          : '暂无成员归类'}
                      </div>
                    </div>

                    {/* Density Meter Bar */}
                    <div className="mt-2.5 w-full bg-black/5 h-1 rounded-full overflow-hidden">
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

              {displayedGroups.length === 0 && (
                <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-dashed border-[#5B7B6D]/20 text-xs text-[#6E7C75] font-serif">
                  未找到与搜索匹配的分组
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-white/70 border-t border-[#5B7B6D]/10 flex items-center justify-between text-[11px] text-[#6E7C75]">
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
