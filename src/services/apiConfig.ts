import { Capacitor } from '@capacitor/core';

const SERVER_URL_KEY = 'shinian_api_server_url';
// Active Cloud Run backend URL for deployed Capacitor APK builds and web preview (Public Accessible Shared URL)
export const DEFAULT_CLOUD_API_URL = 'https://ais-pre-cq7pozdu24b5b7weqvtffs-80463223160.asia-northeast1.run.app';

export function isNativeMobilePlatform(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window !== 'undefined') {
    if ((window as any).Capacitor?.isNative) return true;
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') return true;
  }
  return false;
}

/**
 * Returns the saved custom Cloudflare Worker / Server URL configured by user
 */
export function getSavedApiServerUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SERVER_URL_KEY);
      if (saved && saved.trim()) {
        return saved.trim().replace(/\/+$/, '');
      }
    }
    return DEFAULT_CLOUD_API_URL;
  } catch {
    return DEFAULT_CLOUD_API_URL;
  }
}

/**
 * Returns the effective API Base URL.
 * - In local dev/web preview on Vite server: strictly returns empty string "" (relative path /api/...)
 * - In standalone mobile/Capacitor APK: returns configured custom server URL, local LAN origin, or default Cloud API URL
 */
export function getApiBaseUrl(): string {
  try {
    const isNative = isNativeMobilePlatform();

    // 在普通浏览器 / AI Studio 预览环境（http: 或 https:）下：
    // 使用纯净同源相对路径 ""，杜绝跨域预检与 Failed to fetch
    if (!isNative && typeof window !== 'undefined') {
      return '';
    }

    // 在原生移动端独立容器 (Capacitor) 内读取外部基址
    const custom = localStorage.getItem(SERVER_URL_KEY);
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }

    // 移动端自适应探测：如果当前通过内网 IP 或域名加载，优先采用该 origin
    if (typeof window !== 'undefined' && window.location.origin) {
      const proto = window.location.protocol;
      if ((proto === 'http:' || proto === 'https:') && !window.location.origin.includes('localhost')) {
        return window.location.origin;
      }
    }

    return DEFAULT_CLOUD_API_URL;
  } catch {
    return DEFAULT_CLOUD_API_URL;
  }
}

export function setApiBaseUrl(url: string) {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(SERVER_URL_KEY);
    } else {
      localStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
    }
  } catch (e) {
    console.warn('Failed to save API server URL:', e);
  }
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return cleanPath;
  return `${base}${cleanPath}`;
}

/**
 * Client-Side Direct Gemini API Call (Supports offline/standalone APK with user's key)
 */
export async function callClientGeminiDirect({
  apiKey,
  prompt,
  systemInstruction,
  messages = [],
}: {
  apiKey: string;
  prompt: string;
  systemInstruction?: string;
  messages?: Array<{ role: 'user' | 'model'; text: string }>;
}): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('未配置 Gemini API Key');
  }

  const contents: any[] = [];
  
  // Format prior history
  for (const m of messages) {
    contents.push({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    });
  }

  // Append current prompt
  if (prompt && (!messages.length || messages[messages.length - 1].text !== prompt)) {
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(cleanKey)}`;

  const bodyPayload: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    }
  };

  if (systemInstruction) {
    bodyPayload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gemini API 请求异常 (${res.status})`);
  }

  const resData = await res.json();
  const replyText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!replyText) {
    throw new Error('未能从 Gemini 获取回复内容');
  }

  return replyText;
}

/**
 * Client-Side Direct DeepSeek API Call (Supports offline/standalone APK with user's key)
 */
export async function callClientDeepSeekDirect({
  apiKey,
  messages,
  systemPrompt,
}: {
  apiKey: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('未配置 DeepSeek API Key');
  }

  const formattedMessages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }
  formattedMessages.push(...messages);

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `DeepSeek API 请求异常 (${res.status})`);
  }

  const resData = await res.json();
  const replyText = resData.choices?.[0]?.message?.content;
  if (!replyText) {
    throw new Error('未能从 DeepSeek 获取回复内容');
  }

  return replyText;
}

/**
 * Diagnostic helper to test latency and connectivity to Google Firestore & cloud API server
 */
export async function testApiConnection(overrideUrl?: string): Promise<{ success: boolean; latencyMs: number; message: string; host: string }> {
  const start = performance.now();

  // 1. If explicit override URL provided, test that endpoint
  if (overrideUrl !== undefined && overrideUrl.trim() !== '') {
    const targetHost = overrideUrl.trim().replace(/\/+$/, '');
    try {
      const testUrl = `${targetHost}/api/health`;
      const res = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        return { success: true, latencyMs, message: `通信正常 · 官方云端网关 (延迟: ${latencyMs}ms)`, host: targetHost };
      }
    } catch (err: any) {
      // Continue to Firestore check
    }
  }

  // 2. Direct Google Firebase Firestore connectivity test (Universal for Android APK & Web)
  try {
    const { testConnection } = await import('../firebase');
    const isFirestoreOk = await testConnection();
    const latencyMs = Math.max(16, Math.round(performance.now() - start));
    if (isFirestoreOk) {
      return {
        success: true,
        latencyMs,
        message: `云端直连正常 · 谷歌 Firestore 数据库同步 (${latencyMs}ms)`,
        host: 'Google Cloud Firestore'
      };
    }
  } catch (fsErr) {
    console.warn('Firestore diagnostic error:', fsErr);
  }

  // 3. Fallback to API health endpoint if available
  const targetHost = getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
  try {
    const testUrl = targetHost ? `${targetHost}/api/health` : '/api/health';
    const res = await fetch(testUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    const latencyMs = Math.round(performance.now() - start);
    if (res.ok) {
      return { success: true, latencyMs, message: `通信正常 · 服务端同步 (延迟: ${latencyMs}ms)`, host: targetHost || '本地服务' };
    }
  } catch (err: any) {}

  const latencyMs = Math.round(performance.now() - start);
  return { 
    success: false, 
    latencyMs, 
    message: '云端通信待就绪，请检查网络或重新测试', 
    host: targetHost || '云端网关' 
  };
}
