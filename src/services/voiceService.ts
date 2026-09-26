/**
 * 级联情感语音引擎 (火山/剪映情感声线驱动 + 离线系统级原生兜底)
 * 支持知性抒情女声、阳光清润男声、沉稳深情质感男声与温存夜读女声
 */

import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { TTSAudioEngine } from '../utils/audioUnlocker';

export interface EasternVoiceOption {
  id: string;
  name: string;        // 雅称 (如: 温婉墨香)
  gender: '女声' | '男声';
  speed: number;       // 语速基准
  pitch: number;       // 音调基准
  neuralVoice: string; // 神经高保真音色代号
  previewQuote: string;
}

export const EASTERN_VOICES: EasternVoiceOption[] = [
  {
    id: 'wenwan',
    name: '温婉墨香',
    gender: '女声',
    speed: 0.95,
    pitch: 1.05,
    neuralVoice: 'zh-CN-XiaoxiaoNeural',
    previewQuote: '庭前花开花落，岁序常易，唯有相知历久弥坚。'
  },
  {
    id: 'qinglang',
    name: '清朗松韵',
    gender: '男声',
    speed: 0.98,
    pitch: 0.96,
    neuralVoice: 'zh-CN-YunxiNeural',
    previewQuote: '少年负壮气，奋烈自有时。回首当年，风华正茂。'
  },
  {
    id: 'jingshui',
    name: '静水流深',
    gender: '男声',
    speed: 0.92,
    pitch: 0.85,
    neuralVoice: 'zh-CN-YunjianNeural',
    previewQuote: '一物经年，不言沧桑；时光所至，皆为注脚。'
  },
  {
    id: 'xiaofeng',
    name: '晓风拂柳',
    gender: '女声',
    speed: 0.93,
    pitch: 1.15,
    neuralVoice: 'zh-CN-XiaoyiNeural',
    previewQuote: '展信舒颜，愿千里明月，映你眉眼安然。'
  }
];

export interface SpeechPlayCallbacks {
  onStart?: (voiceName: string, schemeName: string) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

let activeStreamAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let isCurrentlySpeaking = false;

/**
 * 彻底停止所有正在发声的语音通道
 */
export async function stopAllSpeech(): Promise<void> {
  isCurrentlySpeaking = false;

  // 1. 停止在线音频流
  if (activeStreamAudio) {
    try {
      activeStreamAudio.pause();
      activeStreamAudio.currentTime = 0;
      activeStreamAudio.src = '';
    } catch (e) {}
    activeStreamAudio = null;
  }

  // 2. 停止 Web Speech
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    activeUtterance = null;
  }

  // 3. 停止 Capacitor 原生 TTS
  try {
    await TextToSpeech.stop();
  } catch (e) {}

  TTSAudioEngine.stop();
}

/**
 * 将长文本智能切分成句子，便于分段缓冲
 */
function splitTextIntoSentences(text: string): string[] {
  const clean = text.replace(/[\r\n\t]+/g, ' ').trim();
  const sentences = clean.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) || [clean];
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if ((current + s).length > 80) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.filter(c => c.length > 0);
}

/**
 * 方案 A：通过内置高保真神经多情感语音服务合成音频
 */
async function playNeuralTTS(
  text: string,
  voice: EasternVoiceOption,
  callbacks?: SpeechPlayCallbacks
): Promise<boolean> {
  try {
    const response = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: voice.neuralVoice
      })
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (!data.audioBase64) return false;

    return new Promise((resolve) => {
      const audioUrl = `data:audio/mp3;base64,${data.audioBase64}`;
      const audio = new Audio(audioUrl);
      activeStreamAudio = audio;

      audio.oncanplay = () => {
        callbacks?.onStart?.(voice.name, '情感语音');
        audio.play().catch(() => resolve(false));
      };

      audio.onended = () => {
        callbacks?.onEnd?.();
        isCurrentlySpeaking = false;
        resolve(true);
      };

      audio.onerror = () => {
        resolve(false);
      };

      audio.load();
    });
  } catch (err) {
    return false;
  }
}

/**
 * 方案 B：公网高保真音频流作为第二重保障
 */
async function playSchemeB(
  text: string,
  voice: EasternVoiceOption,
  callbacks?: SpeechPlayCallbacks
): Promise<boolean> {
  const sentences = splitTextIntoSentences(text);
  if (sentences.length === 0) return false;

  return new Promise((resolve) => {
    let currentIndex = 0;
    let didStart = false;

    const timeoutId = setTimeout(() => {
      if (!didStart) {
        if (activeStreamAudio) {
          activeStreamAudio.pause();
          activeStreamAudio.src = '';
        }
        resolve(false);
      }
    }, 2800);

    const playNextSentence = () => {
      if (!isCurrentlySpeaking) {
        clearTimeout(timeoutId);
        resolve(true);
        return;
      }

      if (currentIndex >= sentences.length) {
        clearTimeout(timeoutId);
        callbacks?.onEnd?.();
        isCurrentlySpeaking = false;
        resolve(true);
        return;
      }

      const sentence = sentences[currentIndex];
      const per = voice.gender === '男声' ? 1 : 0;
      const spd = Math.round(voice.speed * 5);
      const streamUrl = `https://tts.baidu.com/text2audio?lan=zh&ie=UTF-8&spd=${spd}&per=${per}&text=${encodeURIComponent(sentence)}`;

      const audio = new Audio();
      activeStreamAudio = audio;
      audio.crossOrigin = 'anonymous';

      audio.oncanplay = () => {
        if (!didStart) {
          didStart = true;
          clearTimeout(timeoutId);
          callbacks?.onStart?.(voice.name, '自然语音');
        }
        audio.play().catch(() => {
          clearTimeout(timeoutId);
          resolve(false);
        });
      };

      audio.onended = () => {
        currentIndex++;
        playNextSentence();
      };

      audio.onerror = () => {
        if (!didStart) {
          clearTimeout(timeoutId);
          resolve(false);
        } else {
          currentIndex++;
          playNextSentence();
        }
      };

      audio.src = streamUrl;
      audio.load();
    };

    playNextSentence();
  });
}

/**
 * 方案 I 核心：Android 原生系统级 TTS / Web Speech 底层硬件合成（具有强男女声音调与语速差异）
 */
async function playSchemeI(
  text: string,
  voice: EasternVoiceOption,
  callbacks?: SpeechPlayCallbacks
): Promise<void> {
  callbacks?.onStart?.(voice.name, '原生朗读');

  // 1. 优先尝试 Capacitor 原生安卓语音桥接
  try {
    await TextToSpeech.speak({
      text,
      lang: 'zh-CN',
      rate: voice.speed,
      pitch: voice.pitch,
      volume: 1.0,
      category: 'ambient',
    });
    callbacks?.onEnd?.();
    isCurrentlySpeaking = false;
    return;
  } catch (nativeErr) {
    console.log('[Native TTS fallback to Web Speech]:', nativeErr);
  }

  // 2. 兜底降级至标准 Web Speech API（严密调校男女音高与语速差异）
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = voice.speed;
      utterance.pitch = voice.pitch;

      const voices = window.speechSynthesis.getVoices();
      const zhVoices = voices.filter(v => v.lang.includes('zh') || v.lang.includes('cmn'));
      if (zhVoices.length > 0) {
        if (voice.gender === '男声') {
          const maleVoice = zhVoices.find(v => v.name.includes('Male') || v.name.includes('男') || v.name.includes('Kangkang') || v.name.includes('Yunxi') || v.name.includes('Yunjian'));
          if (maleVoice) utterance.voice = maleVoice;
        } else {
          const femaleVoice = zhVoices.find(v => v.name.includes('Female') || v.name.includes('女') || v.name.includes('Xiaoxiao') || v.name.includes('Yaoyao') || v.name.includes('Huihui'));
          if (femaleVoice) utterance.voice = femaleVoice;
        }
      }

      activeUtterance = utterance;

      utterance.onend = () => {
        callbacks?.onEnd?.();
        isCurrentlySpeaking = false;
      };

      utterance.onerror = (e) => {
        console.warn('Web Speech synthesis error:', e);
        callbacks?.onEnd?.();
        isCurrentlySpeaking = false;
      };

      window.speechSynthesis.speak(utterance);
    } catch (speechErr) {
      console.error('All Speech engines failed:', speechErr);
      callbacks?.onError?.(speechErr);
      isCurrentlySpeaking = false;
    }
  } else {
    callbacks?.onEnd?.();
    isCurrentlySpeaking = false;
  }
}

/**
 * 级联语音统一入口：高保真情感引擎优先 -> 失败或离线自动降级原生朗诵
 */
export async function speakTextCascade(
  text: string,
  voiceId?: string,
  callbacks?: SpeechPlayCallbacks
): Promise<void> {
  TTSAudioEngine.unlockAndPrime();
  await stopAllSpeech();

  if (!text || !text.trim()) return;

  isCurrentlySpeaking = true;
  const targetVoice = EASTERN_VOICES.find(v => v.id === voiceId) || EASTERN_VOICES[0];

  // 1. 优先调用火山/剪映情感声线高保真通道
  try {
    const successNeural = await playNeuralTTS(text.trim(), targetVoice, callbacks);
    if (successNeural) return;
  } catch (err) {
    console.warn('[Neural TTS failed, attempting fallback]:', err);
  }

  // 2. 尝试在线音频流
  try {
    const successB = await playSchemeB(text.trim(), targetVoice, callbacks);
    if (successB) return;
  } catch (err) {
    console.warn('[Stream TTS failed, attempting Native fallback]:', err);
  }

  // 3. 离线/原生底层系统兜底
  if (isCurrentlySpeaking) {
    await playSchemeI(text.trim(), targetVoice, callbacks);
  }
}
