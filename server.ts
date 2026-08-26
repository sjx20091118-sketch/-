import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Body parsers with generous limits for image/base64 uploads
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Lazy Google Gemini client helper
function getGeminiClient(customKey?: string) {
  const key = customKey || process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: key || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// DeepSeek API helper
async function callDeepSeekAPI({
  apiKey,
  messages,
  systemPrompt,
}: {
  apiKey?: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}) {
  const key = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error('未配置 DeepSeek API Key。请在设置中填入你的专属 DeepSeek 密钥');
  }

  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }
  formattedMessages.push(...messages);

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.trim()}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: formattedMessages,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 响应异常 (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) throw new Error('DeepSeek API 未返回有效内容');
  return reply;
}

// ==================== API Routes ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. AI Chat & Memory Assistant Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const {
      prompt,
      messages = [],
      memoryData = null,
      engine = 'gemini', // 'gemini' | 'deepseek'
      customApiKey = '',
    } = req.body;

    if (!prompt && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: '缺少有效的对话输入' });
    }

    const systemPrompt = `你是一个名叫“拾年”的私人离线记忆陪伴AI助手。你知晓用户在《拾年》个人成长记忆档案中存储的所有真实记录。
你的性格特点：温和、细腻、沉静、具有人文关怀与情感共鸣。
请基于用户提供或关联的记忆档案数据回答用户的提问，帮助用户梳理过去时光的成长脉络、珍贵瞬间与故人故事。如果用户问到档案中具体的时间、人物或事件，请准确结合档案中的细节进行回顾。

【用户当前的记忆档案数据】
${memoryData ? JSON.stringify(memoryData, null, 2) : '暂无加载的离线数据'}`;

    // DeepSeek Route
    if (engine === 'deepseek' || (customApiKey && customApiKey.startsWith('sk-'))) {
      const historyList = (messages as Array<{ role: string; text?: string; content?: string }>).map((m) => ({
        role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text || m.content || '',
      }));

      if (prompt && (!historyList.length || historyList[historyList.length - 1].content !== prompt)) {
        historyList.push({ role: 'user', content: prompt });
      }

      const reply = await callDeepSeekAPI({
        apiKey: customApiKey,
        messages: historyList,
        systemPrompt,
      });

      return res.json({
        reply,
        engineUsed: 'deepseek-chat (DeepSeek-V3)',
      });
    }

    // Default Gemini Route (Runs on server, domestic users need NO VPN)
    const ai = getGeminiClient(customApiKey);
    const userPrompt = prompt || (messages.length > 0 ? messages[messages.length - 1].text : '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.75,
      },
    });

    const reply = response.text || '我刚刚沉思了一下，但未能找到恰当的言语。';
    return res.json({
      reply,
      engineUsed: 'gemini-3.7-flash (云端免翻墙直连)',
    });
  } catch (err: any) {
    console.error('Error in /api/ai/chat:', err);
    return res.status(500).json({
      error: err.message || 'AI 思考过程中遇到波动，请重试',
    });
  }
});

// 2. AI Polish Text (Story/Timeline Polishing)
app.post('/api/ai/polish', async (req, res) => {
  try {
    const { text, engine = 'gemini', customApiKey = '' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: '缺少待润色的文本内容' });
    }

    const systemPrompt =
      '你是一位极具文采与温情的记忆故事润色师。将用户的简短随笔或草稿润色成富有画面感、温情细腻的记忆文字（150字左右），保留原意，增强情感感染力。只输出润色后的正文，不要带有任何额外的开头或解释。';

    if (engine === 'deepseek' || (customApiKey && customApiKey.startsWith('sk-'))) {
      const reply = await callDeepSeekAPI({
        apiKey: customApiKey,
        messages: [{ role: 'user', content: `请帮我润色这段记忆随笔：\n${text}` }],
        systemPrompt,
      });
      return res.json({ polished: reply.trim(), engineUsed: 'deepseek' });
    }

    const ai = getGeminiClient(customApiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `请帮我润色这段记忆随笔：\n${text}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const polished = response.text?.trim() || text;
    return res.json({ polished, engineUsed: 'gemini-3.7-flash' });
  } catch (err: any) {
    console.error('Error in /api/ai/polish:', err);
    return res.status(500).json({
      error: err.message || '润色失败',
    });
  }
});

// 3. AI Vision: Photo & Artifact Analyzer
app.post('/api/ai/vision', async (req, res) => {
  try {
    const { base64Data, mimeType = 'image/jpeg', customApiKey = '' } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: '缺少图片 Base64 数据' });
    }

    const ai = getGeminiClient(customApiKey);
    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data,
      },
    };

    const textPart = {
      text: '分析这张照片/老旧物件/票据，提取其可能蕴含的记忆要素，严格以 JSON 格式输出：\n{\n  "title": "简短而温暖的名称",\n  "date": "YYYY-MM-DD格式推测日期",\n  "location": "推测地点",\n  "tag": "核心标签如青春/旅程/旧物/美食",\n  "story": "200字左右富有情感色彩的生动细节描述"\n}',
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text;
    if (jsonText) {
      const parsed = JSON.parse(jsonText);
      return res.json({ success: true, data: parsed });
    }

    throw new Error('未解析到图像分析结果');
  } catch (err: any) {
    console.error('Error in /api/ai/vision:', err);
    return res.status(500).json({
      error: err.message || '智能识图分析失败',
    });
  }
});

// 4. AI TTS: Speech Generation
app.post('/api/ai/tts', async (req, res) => {
  try {
    const { text, voice = 'Sulafat', customApiKey = '' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: '缺少朗读文本' });
    }

    const ai = getGeminiClient(customApiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `用温和、深情、平缓的语气为你朗诵这段记忆内容：\n\n${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Sulafat' },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const audioBase64 = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || 'audio/L16;rate=24000';

    if (audioBase64) {
      return res.json({ audioBase64, mimeType });
    }

    return res.status(500).json({ error: '未能生成语音音频' });
  } catch (err: any) {
    console.error('Error in /api/ai/tts:', err);
    return res.status(500).json({
      error: err.message || '语音生成失败',
    });
  }
});

// ==================== Vite Integration ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[拾年 Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
