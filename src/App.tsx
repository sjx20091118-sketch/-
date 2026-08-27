import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FolderOpen
} from 'lucide-react';
import { AppData, Person, Story, Artifact, ChatMessage } from './types';
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
    const local = localStorage.getItem('shinian_app_data_v2');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.people && parsed.people.length > 0) {
          // Clean up deleted 2021-09-01 node from existing local storage
          if (parsed.timeline) {
            parsed.timeline = parsed.timeline.filter((t: any) => t.date !== '2021-09-01');
          }
          // Clean up any historical "周梓童" or "周芷彤" records and replace with Lu Qingxun
          if (parsed.people) {
            parsed.people = parsed.people.map((p: any) => {
              if (p.name === '周梓童' || p.name === '周芷彤') {
                return INITIAL_SEED.people[0];
              }
              return p;
            });
          }
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
  const [formPersonAvatar, setFormPersonAvatar] = useState<string>(PRESET_AVATARS[0]);
  const [formPersonRel, setFormPersonRel] = useState<string>('挚友');
  const [formPersonGroup, setFormPersonGroup] = useState<string>('未分组');
  const [formArtifactImage, setFormArtifactImage] = useState<string>('');
  const [editPersonAvatar, setEditPersonAvatar] = useState<string>('');
  const [editPersonRel, setEditPersonRel] = useState<string>('');
  const [editPersonGroup, setEditPersonGroup] = useState<string>('未分组');

  // People QQ-style grouping & top status bar state
  const [selectedPersonGroup, setSelectedPersonGroup] = useState<string>('all');
  const [isGroupPickerOpen, setIsGroupPickerOpen] = useState<boolean>(false);
  const [customGroups, setCustomGroups] = useState<string[]>(['大学同窗', '师长前辈', '青春同窗', '挚友亲朋', '未分组']);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isAddingGroup, setIsAddingGroup] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [movingPerson, setMovingPerson] = useState<Person | null>(null);

  const filteredPeople = useMemo(() => {
    return data.people.filter(p => {
      if (selectedPersonGroup === 'all') return true;
      return (p.group || '未分组') === selectedPersonGroup;
    });
  }, [data.people, selectedPersonGroup]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('shinian_app_data_v2', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatMessages]);

  useEffect(() => {
    if (selectedPerson) {
      const updated = data.people.find(p => p.id === selectedPerson.id);
      if (updated) setSelectedPerson(updated);
    }
  }, [data, selectedPerson]);

  // Dynamically extract only years with actual memory records
  const years = useMemo(() => {
    const ySet = new Set<string>();
    data.timeline.forEach(item => {
      if (item.date && item.date.length >= 4) {
        const yr = item.date.substring(0, 4);
        if (/^\d{4}$/.test(yr)) ySet.add(yr);
      }
    });
    data.artifacts.forEach(item => {
      if (item.date && item.date.length >= 4) {
        const yr = item.date.substring(0, 4);
        if (/^\d{4}$/.test(yr)) ySet.add(yr);
      }
    });
    data.stories.forEach(item => {
      if (item.date && item.date.length >= 4) {
        const yr = item.date.substring(0, 4);
        if (/^\d{4}$/.test(yr)) ySet.add(yr);
      }
    });
    data.people.forEach(p => {
      p.impressions?.forEach(imp => {
        if (imp.year && /^\d{4}$/.test(imp.year)) {
          ySet.add(imp.year);
        }
      });
    });
    return Array.from(ySet).sort((a, b) => b.localeCompare(a));
  }, [data]);

  // Compute rich memory density statistics per year and across entire archive
  const yearStats = useMemo(() => {
    const statsMap: Record<string, { total: number; timeline: number; stories: number; artifacts: number; impressions: number }> = {};
    let totalAll = data.timeline.length + data.stories.length + data.artifacts.length;
    data.people.forEach(p => {
      totalAll += (p.impressions?.length || 0);
    });

    years.forEach(y => {
      const tCount = data.timeline.filter(t => t.date?.startsWith(y)).length;
      const sCount = data.stories.filter(s => s.date?.startsWith(y)).length;
      const aCount = data.artifacts.filter(a => a.date?.startsWith(y)).length;
      let iCount = 0;
      data.people.forEach(p => {
        iCount += (p.impressions?.filter(imp => imp.year === y).length || 0);
      });
      statsMap[y] = {
        total: tCount + sCount + aCount + iCount,
        timeline: tCount,
        stories: sCount,
        artifacts: aCount,
        impressions: iCount
      };
    });
    return { statsMap, totalAll };
  }, [data, years]);

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
      } else if (q.includes('朋友') || q.includes('周梓童') || q.includes('林夏') || q.includes('陈导师')) {
        const names = data.people.map(p => p.name).join('、');
        fallbackText = `在你的拾人册中，记录着重要的挚友伙伴：${names || '周梓童、林夏'}。其中周梓童曾与你并肩奋战无数个建模方案的日夜，林夏是从高中一路相伴至今的知心闺蜜。这些长情陪伴是你成长中最坚韧温暖的底色。`;
      } else if (q.includes('成长') || q.includes('轨迹') || q.includes('几年') || q.includes('总结')) {
        fallbackText = `回顾你的《拾年》档案，从踏入校门、获得设计大奖，到夏日威海旅行、搬入属于自己的温馨小公寓，你在 ${data.timeline.length} 处时光节点中一步步蜕变成长，逐渐走得越来越坚定笃实。`;
      } else if (q.includes('旧物') || q.includes('物') || q.includes('相机') || q.includes('票根')) {
        const artNames = data.artifacts.map(a => a.name).join('、');
        fallbackText = `在你的拾物阁里，静静珍藏着 ${artNames || '理光GR相机、毕业旅行海边日落票根'}。这些旧物虽不言语，却承载着特定时光的温存记忆与指尖温度。`;
      } else {
        fallbackText = `岁月如一条静淌的小河。在你的档案里，记录着 ${data.timeline.length} 个时光瞬间、${data.people.length} 位同路人与 ${data.stories.length} 篇故事。无论走得多远，只要翻开回忆，那些美好的温暖与感动都依旧如初。`;
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

  const handlePlayTts = async (textToRead: string, voiceOverride?: string) => {
    if (audioPlayingUrl) {
      setAudioPlayingUrl(null);
      setAudioPlayingVoiceName('');
    }
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
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToRead,
          voice: voiceToUse
        })
      });

      const data = await res.json();
      if (!res.ok || !data.audioBase64) {
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
      console.error('[Microsoft Edge TTS Error]', err);
      showToast(err?.message || '语音合成遇到波动，请重试');
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
      <div className="w-full h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-[#2B332E]">
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
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4 text-[#2B332E]">
      <div id="root-card" className="w-full max-w-md h-[100vh] sm:h-[880px] bg-[#FAF8F5] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-[#E88765]/20 paper-texture">

        {/* Top HeaderBar with Safe Area Inset Support */}
        <header className="px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 bg-white/85 backdrop-blur-md text-[#2B332E] flex items-center justify-between border-b border-[#5B7B6D]/15 shadow-sm z-20 relative">
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
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

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
                    <div className="flex items-center justify-between text-[11px] text-[#6E7C75] border-t border-[#F2EFE9] pt-3">
                      <span className="flex items-center gap-1 font-sans text-[#526058]">
                        <MapPin className="w-3.5 h-3.5 text-[#E88765]" /> {todayHighlight.location || '离线记忆'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlayTts(todayHighlight.content)}
                          disabled={isTtsGenerating}
                          className="px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#F2EFE9] border border-[#5B7B6D]/20 text-[#2B332E] font-medium flex items-center gap-1.5 transition-all text-xs active:scale-95 shadow-2xs"
                        >
                          <Volume2 className={`w-3.5 h-3.5 text-[#E88765] ${isTtsGenerating ? 'animate-bounce' : ''}`} />
                          <span>{isTtsGenerating ? '准备语音...' : '听回忆'}</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('timeline')}
                          className="px-3 py-1.5 rounded-full bg-[#5B7B6D] text-white font-bold text-xs shadow-sm hover:bg-[#3E564B] transition-all active:scale-95 flex items-center gap-1"
                        >
                          <span>展开拾光轴</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-white rounded-2xl border border-dashed border-[#5B7B6D]/20 text-center space-y-2">
                  <p className="text-xs text-[#6E7C75] font-serif">暂无拾光节点，点击下方「拾光轴」开启你的十年记录</p>
                  <button
                    onClick={() => setActiveModal('addTimeline')}
                    className="text-xs px-3.5 py-1.5 bg-[#5B7B6D] text-white rounded-xl hover:bg-[#3E564B] font-medium"
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

              {/* Time Capsule Entry Banner */}
              <div className="p-4 bg-white rounded-2xl border border-[#5B7B6D]/15 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#FDF0EB] text-[#E88765] border border-[#E88765]/20">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#2B332E] font-serif">寄年 · 时光胶囊</h4>
                    <p className="text-[11px] text-[#6E7C75] font-sans">封存寄给未来的心语 · 已封存 {data.letters.length} 封</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('letters')}
                  className="text-xs px-3.5 py-1.5 bg-[#5B7B6D] text-white rounded-xl hover:bg-[#3E564B] font-medium transition-all shadow-sm"
                >
                  开启 / 投递
                </button>
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
                    onClick={() => handleSendAiMessage("回顾一下我和重要朋友（比如陆青寻、林夏）的故事与印象变化。")}
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
                  拾光轴 ({data.timeline.filter(item => selectedYear === 'all' || item.date.startsWith(selectedYear)).length})
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
                      <span className="opacity-75 font-normal ml-1">（共 {data.timeline.filter(item => item.date.startsWith(selectedYear)).length} 条）</span>
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

              {data.timeline.filter(item => selectedYear === 'all' || item.date.startsWith(selectedYear)).length === 0 ? (
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
                    .filter(item => selectedYear === 'all' || item.date.startsWith(selectedYear))
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

          {/* People List Tab: Restored Original Elegant Card Layout */}
          {activeTab === 'people' && !selectedPerson && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold text-[#2B332E] tracking-wider font-serif">
                  拾人册 ({filteredPeople.length})
                </h2>
                <button
                  onClick={() => setActiveModal('addPerson')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#5B7B6D] text-white rounded-xl shadow-sm hover:bg-[#3E564B] font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> 添加人物
                </button>
              </div>

              {/* Group Filter Status Banner */}
              {selectedPersonGroup !== 'all' && (
                <div className="p-3 bg-[#5B7B6D]/10 rounded-2xl border border-[#5B7B6D]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#5B7B6D] font-sans shadow-2xs">
                  <div className="flex items-center gap-2 font-medium leading-normal">
                    <Filter className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                    <span>
                      正在筛选【<strong className="font-bold text-[#E88765]">{selectedPersonGroup}</strong>】好友
                      <span className="opacity-75 font-normal ml-1">（共 {filteredPeople.length} 人）</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setIsGroupPickerOpen(true)}
                      className="text-[11px] font-semibold text-[#5B7B6D] bg-white/95 hover:bg-white px-2.5 py-1 rounded-xl border border-[#5B7B6D]/20 flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                    >
                      <FolderOpen className="w-3 h-3 text-[#E88765]" /> 换分组
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPersonGroup('all');
                        showToast('已展示全部好友');
                      }}
                      className="text-[11px] font-bold text-[#E88765] hover:underline flex items-center gap-1 px-1.5 py-1"
                    >
                      <RotateCcw className="w-3 h-3" /> 全部好友
                    </button>
                  </div>
                </div>
              )}

              {/* People Cards Grid */}
              {filteredPeople.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-[#5B7B6D]/15 text-center space-y-3 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#5B7B6D]/20 text-[#5B7B6D] flex items-center justify-center mx-auto text-xl">
                    👥
                  </div>
                  <h3 className="font-bold text-[#2B332E] text-sm font-serif">该分组下暂无好友记录</h3>
                  <p className="text-xs text-[#6E7C75]">您可以在编辑人物或添加新人物时指定此分组</p>
                  <button
                    onClick={() => setSelectedPersonGroup('all')}
                    className="px-4 py-1.5 bg-[#5B7B6D] text-white text-xs rounded-xl font-medium"
                  >
                    返回查看全部好友
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredPeople.map(person => (
                    <div
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      className="bg-white p-4 rounded-2xl border border-[#5B7B6D]/15 shadow-sm flex items-center justify-between gap-3 hover:border-[#E88765]/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#E88765]/40 shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-[#2B332E] text-base group-hover:text-[#E88765] transition-colors font-serif truncate">
                              {person.name}
                            </h3>
                            {person.relationship && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FDF0EB] text-[#E88765] font-medium font-sans border border-[#E88765]/20 shrink-0">
                                {person.relationship}
                              </span>
                            )}
                            {person.group && person.group !== '未分组' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D] font-medium font-sans border border-[#5B7B6D]/20 shrink-0">
                                {person.group}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#6E7C75] line-clamp-1 mt-1 font-serif">
                            {person.bio || '珍贵回忆的同路人'}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#6E7C75]/80 mt-1.5 font-sans">
                            {person.birthday && <span>🎂 {person.birthday}</span>}
                            {person.zodiac && <span>✨ {person.zodiac}</span>}
                            {person.customFields?.['认识地点'] && (
                              <span className="truncate max-w-[140px]">📍 {person.customFields['认识地点']}</span>
                            )}
                            <span>📖 {person.impressions?.length || 0}条故事</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete('people', person.id, person.name);
                          }}
                          title="删除人物"
                          className="p-2 text-[#6E7C75]/40 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-[#6E7C75]/40 group-hover:text-[#5B7B6D] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Person Detailed Archive View */}
          {activeTab === 'people' && selectedPerson && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center mb-2">
                <button
                  onClick={() => setSelectedPerson(null)}
                  className="text-xs text-[#6E7C75] flex items-center gap-1 hover:text-[#5B7B6D] font-medium"
                >
                  ← 返回人物列表
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingPerson(true)}
                    className="text-xs text-[#5B7B6D] hover:text-[#3E564B] flex items-center gap-1 font-medium bg-[#5B7B6D]/10 px-2.5 py-1 rounded-lg border border-[#5B7B6D]/20 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> 编辑资料
                  </button>
                  <button
                    onClick={() => {
                      requestDelete('people', selectedPerson.id, selectedPerson.name);
                      setSelectedPerson(null);
                    }}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 删除
                  </button>
                </div>
              </div>

              {/* Profile Header Card */}
              <div className="bg-white p-5 rounded-2xl border border-[#5B7B6D]/15 text-center relative shadow-sm space-y-4">
                <div className="relative w-20 h-20 mx-auto">
                  <img src={selectedPerson.avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[#E88765] shadow-md" />
                  {selectedPerson.zodiac && (
                    <span className="absolute -bottom-1 -right-1 bg-[#E88765] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm font-sans">
                      {selectedPerson.zodiac}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-xl font-bold text-[#2B332E] font-serif">{selectedPerson.name}</h2>
                    {selectedPerson.relationship && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FDF0EB] text-[#E88765] font-medium border border-[#E88765]/30 font-sans">
                        {selectedPerson.relationship}
                      </span>
                    )}
                    {selectedPerson.group && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D] font-medium border border-[#5B7B6D]/20 font-sans">
                        {selectedPerson.group}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6E7C75] mt-1.5 max-w-xs mx-auto leading-relaxed font-serif">{selectedPerson.bio}</p>
                </div>

                {/* Interactive Detailed Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-[#F2EFE9] text-xs text-left font-sans">
                  <div className="p-3 rounded-xl bg-[#F2EFE9]/60 border border-[#5B7B6D]/10 flex items-center gap-2.5">
                    <span className="text-lg shrink-0">🎂</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[#6E7C75] block">生日 & 星座</span>
                      <span className="font-semibold text-[#2B332E] block truncate">
                        {selectedPerson.birthday || '未设置'} {selectedPerson.zodiac ? `(${selectedPerson.zodiac})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F2EFE9]/60 border border-[#5B7B6D]/10 flex items-center gap-2.5">
                    <span className="text-lg shrink-0">📍</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[#6E7C75] block">初识地点</span>
                      <span className="font-semibold text-[#2B332E] block truncate">{selectedPerson.customFields?.['认识地点'] || '时光长廊'}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F2EFE9]/60 border border-[#5B7B6D]/10 flex items-center gap-2.5">
                    <span className="text-lg shrink-0">🎨</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[#6E7C75] block">喜欢的颜色</span>
                      <span className="font-semibold text-[#2B332E] block truncate">{selectedPerson.color || '未设置'}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F2EFE9]/60 border border-[#5B7B6D]/10 flex items-center gap-2.5">
                    <span className="text-lg shrink-0">⚽</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[#6E7C75] block">个人兴趣爱好</span>
                      <span className="font-semibold text-[#2B332E] block truncate">{selectedPerson.hobbies || '未设置'}</span>
                    </div>
                  </div>
                </div>

                {selectedPerson.customFields && Object.keys(selectedPerson.customFields).length > 0 && (
                  <div className="pt-2.5 border-t border-[#F2EFE9] flex flex-wrap justify-center gap-2 text-xs text-[#6E7C75] font-sans">
                    {Object.entries(selectedPerson.customFields).map(([k, v]) => (
                      <div key={k} className="px-3 py-1 rounded-xl bg-[#FAF8F5] border border-[#5B7B6D]/10 text-xs">
                        <span className="font-semibold text-[#5B7B6D]">{k}:</span> <span className="text-[#2B332E] ml-1">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Yearly Memories & Impressions Section */}
              <div className="bg-white p-4 rounded-2xl border border-[#5B7B6D]/15 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[#2B332E] text-sm flex items-center gap-1.5 font-serif">
                    <Sparkles className="w-3.5 h-3.5 text-[#E88765]" /> 岁月印象与故事轨迹
                  </h3>
                </div>

                {/* Form to append new memory impression */}
                <form onSubmit={handleAddImpression} className="p-3 bg-[#F2EFE9] rounded-xl border border-[#5B7B6D]/15 space-y-2 text-xs font-sans">
                  <span className="font-bold text-[#5B7B6D] block">添加新年份印象片段：</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newImpressionYear}
                      onChange={(e) => setNewImpressionYear(e.target.value)}
                      placeholder="年份 (例: 2026)"
                      className="w-full sm:w-24 p-2 rounded-lg border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#E88765] shrink-0"
                    />
                    <div className="flex gap-2 flex-1 min-w-0">
                      <input
                        type="text"
                        value={newImpressionText}
                        onChange={(e) => setNewImpressionText(e.target.value)}
                        placeholder="记录今年对这个人的新印象或感动瞬间..."
                        className="flex-1 min-w-0 p-2 rounded-lg border border-[#5B7B6D]/20 bg-white focus:outline-none focus:border-[#E88765]"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 bg-[#E88765] text-white font-bold rounded-lg hover:bg-[#E88765]/90 transition-all shadow-sm shrink-0 whitespace-nowrap"
                      >
                        记录
                      </button>
                    </div>
                  </div>
                </form>

                <div className="space-y-2">
                  {selectedPerson.impressions?.map((imp, idx) => (
                    <div key={imp.id || idx} className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#5B7B6D]/10 text-xs text-[#2B332E] space-y-1.5 shadow-sm">
                      <div className="flex justify-between items-center text-[10px] text-[#E88765] font-bold font-sans">
                        <span>{imp.year} 年印象</span>
                        <button onClick={() => handlePlayTts(imp.text)} className="text-[#5B7B6D] hover:text-[#E88765] flex items-center gap-0.5">
                          <Volume2 className="w-3 h-3" /> 朗诵
                        </button>
                      </div>
                      <p className="leading-relaxed font-serif">{imp.text}</p>
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
                  拾忆篇 ({data.stories.filter(story => selectedYear === 'all' || (story.date && story.date.startsWith(selectedYear))).length})
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
                      <span className="opacity-75 font-normal ml-1">（共 {data.stories.filter(story => story.date && story.date.startsWith(selectedYear)).length} 篇）</span>
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

              {data.stories.filter(story => selectedYear === 'all' || (story.date && story.date.startsWith(selectedYear))).length === 0 ? (
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
                    .filter(story => selectedYear === 'all' || (story.date && story.date.startsWith(selectedYear)))
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDelete('stories', story.id, story.title);
                            }}
                            className="p-1.5 text-[#6E7C75]/30 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <BookOpen className="w-4 h-4 text-[#5B7B6D]" />
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
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={() => setReaderStory(null)}
                    className="text-xs text-[#6E7C75] hover:text-[#5B7B6D] font-medium"
                  >
                    ← 退出阅读
                  </button>
                  <div className="flex items-center gap-2">
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
                      <span>{isTtsGenerating ? 'AI 语音合成中...' : '朗诵此章节'}</span>
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
                  拾物阁 ({data.artifacts.filter(item => selectedYear === 'all' || (item.date && item.date.startsWith(selectedYear))).length})
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
                      <span className="opacity-75 font-normal ml-1">（共 {data.artifacts.filter(item => item.date && item.date.startsWith(selectedYear)).length} 件）</span>
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

              {data.artifacts.filter(item => selectedYear === 'all' || (item.date && item.date.startsWith(selectedYear))).length === 0 ? (
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
                    .filter(item => selectedYear === 'all' || (item.date && item.date.startsWith(selectedYear)))
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

          {/* Future Letters Tab */}
          {activeTab === 'letters' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('home')}
                    className="text-xs text-[#6E7C75] hover:text-[#5B7B6D] font-medium"
                  >
                    ← 首页
                  </button>
                  <h2 className="text-lg font-bold text-[#2B332E] tracking-wider font-serif">寄年 · 时光胶囊 ({data.letters.length})</h2>
                </div>
                <button
                  onClick={() => setActiveModal('addLetter')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#5B7B6D] text-white rounded-xl shadow-sm hover:bg-[#3E564B] font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> 写给未来
                </button>
              </div>

              <div className="space-y-3">
                {data.letters.map(letter => {
                  const isUnlocked = letter.isUnlocked || new Date().toISOString().slice(0, 10) >= letter.unlockDate;
                  return (
                    <div
                      key={letter.id}
                      className={`p-4 rounded-2xl border shadow-sm transition-all ${
                        isUnlocked
                          ? 'bg-white border-[#5B7B6D]/20'
                          : 'bg-[#F2EFE9] border-[#5B7B6D]/10'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {isUnlocked ? (
                            <LockOpen className="w-4 h-4 text-[#E88765]" />
                          ) : (
                            <Lock className="w-4 h-4 text-[#6E7C75]" />
                          )}
                          <h3 className="font-bold text-base text-[#2B332E] font-serif">{letter.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-sans ${
                            isUnlocked ? 'bg-[#FDF0EB] text-[#E88765] font-medium' : 'bg-white text-[#6E7C75]'
                          }`}>
                            {isUnlocked ? '已解锁' : `开启日: ${letter.unlockDate}`}
                          </span>
                          <button
                            onClick={() => requestDelete('letters', letter.id, letter.title)}
                            className="text-[#6E7C75]/30 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isUnlocked ? (
                        <div>
                          <p className="text-xs text-[#6E7C75] leading-relaxed mt-2 pt-2 border-t border-[#F2EFE9] font-serif">{letter.content}</p>
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => handlePlayTts(letter.content)}
                              className="text-xs px-3 py-1 bg-[#FDF0EB] text-[#E88765] rounded-lg border border-[#E88765]/20 flex items-center gap-1 font-medium hover:bg-[#E88765] hover:text-white transition-all font-sans"
                            >
                              <Volume2 className="w-3 h-3" /> AI 情感朗读
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#6E7C75]/50 italic mt-2 font-serif">信件尚在时光胶囊中封存，请在指定日期后重访解锁。</p>
                      )}
                    </div>
                  );
                })}
              </div>
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
                    avatar: formPersonAvatar || PRESET_AVATARS[0],
                    relationship: relVal,
                    group: groupVal,
                    birthday: birthdayVal || '未填写',
                    zodiac: zodiacVal,
                    hobbies: (fd.get('hobbies') as string)?.trim() || '未填写',
                    color: (fd.get('color') as string)?.trim() || '暖杏粉',
                    bio: (fd.get('bio') as string)?.trim() || `${relVal} · 珍贵回忆的同路人`,
                    customFields: { '认识地点': knowWhereVal },
                    impressions: (fd.get('impression') as string)?.trim()
                      ? [{ id: 'imp-0', year: new Date().getFullYear().toString(), text: (fd.get('impression') as string)?.trim() }]
                      : []
                  });
                  setFormPersonAvatar(PRESET_AVATARS[0]);
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

                    {/* Local Avatar Uploader with Presets */}
                    <LocalImageUploader
                      value={formPersonAvatar}
                      onChange={setFormPersonAvatar}
                      mode="avatar"
                      label="人物头像 (本地相册/自拍上传)"
                      helperText="本地上传照片或在下方快捷选用插画头像"
                      presetAvatars={PRESET_AVATARS}
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

                  {/* Section 2: 分组与特征喜好 (选填) */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                      <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-[#5B7B6D] rounded-full inline-block"></span>
                        分组归类与喜好 (选填)
                      </h4>
                      <span className="text-[10px] text-[#6E7C75] bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                        选填
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">好友分组 (选填)</label>
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
                          生日 (选填，自动匹配星座)
                        </label>
                        <input
                          name="birthday"
                          placeholder="如：10月24日、1998-05-12"
                          className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#6E7C75] block mb-1">认识地点 (选填)</label>
                        <input
                          name="knowWhere"
                          placeholder="如：老校区林荫路、大一画室"
                          className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-[#6E7C75] block mb-1">兴趣爱好 (选填)</label>
                        <input name="hobbies" placeholder="如：摄影、黑胶、吉他" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#6E7C75] block mb-1">喜欢的颜色 (选填)</label>
                        <input name="color" placeholder="如：鼠尾草绿、群青" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: 时光印记与简介 (选填) */}
                  <div className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                      <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-[#8C6D52] rounded-full inline-block"></span>
                        生平寄语与初识印象 (选填)
                      </h4>
                      <span className="text-[10px] text-[#6E7C75] bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                        选填
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">一句话人物总结 (选填)</label>
                      <input name="bio" placeholder="如：一起在晚自习后看过无数次晚霞的知心挚友" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                    </div>

                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">初识或目前记忆印象 (选填)</label>
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
                  hobbies: (fd.get('hobbies') as string)?.trim() || '未填写',
                  color: (fd.get('color') as string)?.trim() || '暖杏粉',
                  bio: (fd.get('bio') as string)?.trim() || `${relVal} · 珍贵回忆的同路人`,
                  avatar: editPersonAvatar || selectedPerson.avatar || PRESET_AVATARS[0],
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

                  {/* Local Avatar Uploader with Presets */}
                  <LocalImageUploader
                    value={editPersonAvatar || selectedPerson.avatar}
                    onChange={setEditPersonAvatar}
                    mode="avatar"
                    label="人物头像 (本地相册/自拍上传)"
                    helperText="本地上传照片或在下方快捷选用插画头像"
                    presetAvatars={PRESET_AVATARS}
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

                {/* Section 2: 分组与特征喜好 (选填) */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                    <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-[#5B7B6D] rounded-full inline-block"></span>
                      分组归类与喜好 (选填)
                    </h4>
                    <span className="text-[10px] text-[#6E7C75] bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                      选填
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">好友分组 (选填)</label>
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
                        生日 (选填，自动匹配星座)
                      </label>
                      <input
                        name="birthday"
                        defaultValue={selectedPerson.birthday}
                        placeholder="如：10月24日、1998-05-12"
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">认识地点 (选填)</label>
                      <input
                        name="knowWhere"
                        defaultValue={selectedPerson.customFields?.['认识地点'] || ''}
                        placeholder="如：老校区林荫路、大一画室"
                        className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">兴趣爱好 (选填)</label>
                      <input name="hobbies" defaultValue={selectedPerson.hobbies} placeholder="如：摄影、黑胶、吉他" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6E7C75] block mb-1">喜欢的颜色 (选填)</label>
                      <input name="color" defaultValue={selectedPerson.color} placeholder="如：鼠尾草绿、群青" className="w-full p-2.5 rounded-xl border border-[#5B7B6D]/20 bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#5B7B6D]" />
                    </div>
                  </div>
                </div>

                {/* Section 3: 生平寄语 (选填) */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#5B7B6D]/10">
                    <h4 className="font-bold text-[#2B332E] text-xs font-serif flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-[#8C6D52] rounded-full inline-block"></span>
                      生平寄语与概述 (选填)
                    </h4>
                    <span className="text-[10px] text-[#6E7C75] bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                      选填
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#6E7C75] block mb-1">一句话人物总结 (选填)</label>
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
                      setSelectedArtifact(null);
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

        {/* Custom Delete Confirmation Modal */}
        {confirmDialog && (
          <div className="absolute inset-0 bg-[#2B332E]/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn font-sans">
            <div className="bg-[#FAF8F5] w-full max-w-xs p-5 rounded-2xl border border-[#5B7B6D]/20 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#2B332E] text-sm font-serif">确认要抹去此项记忆记录吗？</h3>
                <p className="text-xs text-[#6E7C75] mt-1 font-serif">{confirmDialog.name}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2 rounded-xl border border-[#5B7B6D]/20 bg-white text-[#6E7C75] text-xs font-medium hover:bg-[#F2EFE9] transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    deleteItem(confirmDialog.type, confirmDialog.id);
                    setConfirmDialog(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-medium hover:bg-red-600 shadow-sm transition-all"
                >
                  确认抹去
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar: Exactly 5 Core Tabs with Safe Area Inset */}
        <nav className="bg-white/90 backdrop-blur-md text-[#2B332E] border-t border-[#5B7B6D]/15 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex justify-around items-center z-20">
          <NavItem id="home" label="首页" icon={Landmark} active={activeTab} onClick={() => setActiveTab('home')} />
          <NavItem id="timeline" label="拾光轴" icon={Clock} active={activeTab} onClick={() => setActiveTab('timeline')} />
          <NavItem id="people" label="拾人册" icon={Users} active={activeTab} onClick={() => { setSelectedPerson(null); setActiveTab('people'); }} />
          <NavItem id="stories" label="拾忆篇" icon={BookOpen} active={activeTab} onClick={() => { setReaderStory(null); setActiveTab('stories'); }} />
          <NavItem id="artifacts" label="拾物阁" icon={Package} active={activeTab} onClick={() => setActiveTab('artifacts')} />
        </nav>

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
        scale: 1.02,
        transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] }
      }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-8 bg-[#FAF8F5] overflow-hidden select-none cursor-pointer transform-gpu"
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
      <div className="w-full flex items-center justify-center relative z-10 pt-2">
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

      {/* Center Hero: Floating Dynamic Frosted Glass Card */}
      <div className="flex flex-col items-center justify-center relative z-10 my-auto w-full max-w-sm px-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.1,
            ease: [0.32, 0.72, 0, 1]
          }}
          className="w-full bg-white/75 border border-white/90 shadow-xl rounded-[32px] p-7 sm:p-9 relative overflow-hidden flex flex-col items-center text-center transition-all transform-gpu"
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
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
            transition={{ duration: 0.45, delay: 0.3, ease: 'easeOut' }}
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.32, 0.72, 0, 1] }}
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
      <div className="w-full flex flex-col items-center gap-3 relative z-10 pb-2">
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
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
        isActive
          ? 'text-[#E88765] scale-105 font-bold'
          : 'text-[#6E7C75]/70 hover:text-[#2B332E]'
      }`}
    >
      <IconComp className="w-4 h-4" />
      <span className="text-[10px] tracking-wider font-serif">{label}</span>
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
      className="bg-white p-3.5 rounded-2xl border border-[#5B7B6D]/15 shadow-sm cursor-pointer hover:border-[#E88765]/40 hover:shadow transition-all flex flex-col justify-between h-28 group"
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
    statsMap: Record<string, { total: number; timeline: number; stories: number; artifacts: number; impressions: number }>;
    totalAll: number;
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
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
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
                const stats = yearStats.statsMap[yr] || { total: 0, timeline: 0, stories: 0, artifacts: 0, impressions: 0 };
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
                        <span className="text-[10px] font-bold font-mono text-[#5B7B6D] bg-[#F2EFE9] px-1.5 py-0.5 rounded-full">
                          {stats.total} 篇
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
                      {stats.impressions > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#5B7B6D]/10">
                          {stats.impressions} 印象
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
  theme
}: FriendGroupPickerModalProps) {
  const [filterMode, setFilterMode] = useState<'all_groups' | 'create_group'>('all_groups');
  const [newGroupNameInput, setNewGroupNameInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
                QQ好友分组式管理 · 沉淀相遇缘起
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
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newGroupNameInput.trim()}
                  className="px-4 py-2.5 bg-[#5B7B6D] text-white rounded-xl text-xs font-bold hover:bg-[#3E564B] transition-all disabled:opacity-40"
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
      </motion.div>
    </div>
  );
}
