import { Capacitor } from '@capacitor/core';

const SERVER_URL_KEY = 'shinian_api_server_url';
// Default Cloud Run backend URL for deployed Capacitor APK builds
export const DEFAULT_CLOUD_API_URL = 'https://ais-pre-cq7pozdu24b5b7weqvtffs-80463223160.asia-northeast1.run.app';

/**
 * Returns the effective API Base URL.
 * - In local dev/web preview on Vite server: returns empty string "" (relative path /api/...)
 * - In standalone mobile/Capacitor APK: returns configured custom server URL or cloud server URL
 */
export function getApiBaseUrl(): string {
  try {
    const custom = localStorage.getItem(SERVER_URL_KEY);
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }

    // Check if running in Capacitor native app or static WebView file/capacitor origin
    const isCapacitor = Capacitor.isNativePlatform() || 
      (typeof window !== 'undefined' && (
        (window as any).Capacitor?.isNative ||
        window.location.protocol === 'capacitor:' ||
        window.location.protocol === 'file:' ||
        (window.location.hostname === 'localhost' && window.location.port === '')
      ));

    if (isCapacitor) {
      return DEFAULT_CLOUD_API_URL;
    }

    return '';
  } catch {
    return '';
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
