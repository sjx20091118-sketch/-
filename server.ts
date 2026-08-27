import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

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
    throw new Error('未配置 DeepSeek API Key，请在设置中填入你的专属密钥');
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
    throw new Error(`DeepSeek 服务响应异常 (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) throw new Error('DeepSeek 未返回有效文本');
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
      return res.status(400).json({ error: '缺少有效的对话内容' });
    }

    // Build memory context summaries compactly
    let memorySummary = '暂无加载的档案数据';
    if (memoryData) {
      try {
        const timelineCount = memoryData.timeline?.length || 0;
        const peopleList = (memoryData.people || []).map((p: any) => `${p.name}(${p.relationship || '朋友'}, ${p.bio || ''})`).join('; ');
        const storyTitles = (memoryData.stories || []).map((s: any) => s.title).join('、');
        const artifactNames = (memoryData.artifacts || []).map((a: any) => a.name).join('、');

        memorySummary = `【记忆概览】包含 ${timelineCount} 个时光节点。
【重要人物】${peopleList || '无'}
【故事篇章】${storyTitles || '无'}
【旧物宝藏】${artifactNames || '无'}`;
      } catch {
        memorySummary = '档案已加载';
      }
    }

    const systemPrompt = `你是一个名叫“拾年”的私人记忆陪伴助手。
你的性格特点：温和、细腻、沉静，充满人文关怀与治愈感。
请基于用户在《拾年》档案中的真实回忆内容回答提问，帮助用户梳理过去时光的成长脉络、珍贵瞬间与故人故事。语言风格温润优雅，不生硬。

${memorySummary}`;

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
        engineUsed: 'DeepSeek-V3',
      });
    }

    // Gemini Route
    const ai = getGeminiClient(customApiKey);
    const userPrompt = prompt || (messages.length > 0 ? messages[messages.length - 1].text : '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const reply = response.text || '岁华悠悠，若有所思。请问你还想聊聊过去的哪段时光？';
    return res.json({
      reply,
      engineUsed: 'Gemini 3.7 Flash',
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
      '你是一位文采斐然且情感细腻的记忆故事润色师。将用户的简短随笔或草稿润色成富有画面感、温情细腻的记忆文字（约120-180字），保留原意，增强文学美感。只输出润色后的正文，不要带有任何额外的解释或标记。';

    if (engine === 'deepseek' || (customApiKey && customApiKey.startsWith('sk-'))) {
      const reply = await callDeepSeekAPI({
        apiKey: customApiKey,
        messages: [{ role: 'user', content: `请润色这段记忆随笔：\n${text}` }],
        systemPrompt,
      });
      return res.json({ polished: reply.trim(), engineUsed: 'DeepSeek' });
    }

    const ai = getGeminiClient(customApiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `请润色这段记忆随笔：\n${text}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const polished = response.text?.trim() || text;
    return res.json({ polished, engineUsed: 'Gemini 3.7 Flash' });
  } catch (err: any) {
    console.error('Error in /api/ai/polish:', err);
    return res.status(500).json({
      error: err.message || '润色服务繁忙',
    });
  }
});

// 3. AI Vision: Photo & Artifact Analyzer
app.post('/api/ai/vision', async (req, res) => {
  try {
    const { base64Data, mimeType = 'image/jpeg', customApiKey = '' } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: '缺少图片数据' });
    }

    const ai = getGeminiClient(customApiKey);
    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data,
      },
    };

    const textPart = {
      text: '分析这张照片/老物件/纪念票据，提取其蕴含的时光记忆要素，严格以 JSON 格式输出：\n{\n  "title": "简短温暖的标题",\n  "date": "推测日期(YYYY-MM-DD格式)",\n  "location": "推测地点",\n  "tag": "核心标签如青春/旅程/旧物/校园",\n  "story": "150字左右温情生动的细节描述"\n}',
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
      error: err.message || '图像分析遇到波动',
    });
  }
});

// 4. AI TTS: Microsoft Edge Neural High-Fidelity Speech Generation (Free, Unlimited, Emotive)
app.post('/api/ai/tts', async (req, res) => {
  try {
    const { text, voice = 'zh-CN-XiaoxiaoNeural' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: '缺少朗读文本' });
    }

    // Clean input text for natural, emotive speech flow
    const cleanText = text
      .replace(/[#*`_~\[\]()<>{}]/g, '')
      .replace(/[\r\n]+/g, '，')
      .replace(/\s+/g, ' ')
      .trim();

    // Map voice IDs to Microsoft Edge Neural voices with tuned rate & pitch
    let neuralVoice = 'zh-CN-XiaoxiaoNeural';
    let prosodyRate = '-3%';
    let prosodyPitch = '0Hz';

    if (voice === 'Zephyr' || voice === 'zh-CN-XiaoyiNeural') {
      neuralVoice = 'zh-CN-XiaoyiNeural';
      prosodyRate = '-2%';
      prosodyPitch = '+1Hz';
    } else if (voice === 'zh-CN-XiaoyouNeural') {
      neuralVoice = 'zh-CN-XiaoyouNeural';
      prosodyRate = '+2%';
      prosodyPitch = '+2Hz';
    } else if (voice === 'Puck' || voice === 'zh-CN-YunxiNeural') {
      neuralVoice = 'zh-CN-YunxiNeural';
      prosodyRate = '+0%';
      prosodyPitch = '0Hz';
    } else if (voice === 'Fenrir' || voice === 'zh-CN-YunjianNeural') {
      neuralVoice = 'zh-CN-YunjianNeural';
      prosodyRate = '-5%';
      prosodyPitch = '-1Hz';
    } else if (voice === 'zh-CN-YunyangNeural') {
      neuralVoice = 'zh-CN-YunyangNeural';
      prosodyRate = '-2%';
      prosodyPitch = '-1Hz';
    } else {
      // Default: 素问 (Xiaoxiao)
      neuralVoice = 'zh-CN-XiaoxiaoNeural';
      prosodyRate = '-3%';
      prosodyPitch = '0Hz';
    }

    // Generate high-fidelity MP3 using Microsoft Edge Neural TTS
    const tts = new MsEdgeTTS();
    await tts.setMetadata(neuralVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(cleanText, {
      rate: prosodyRate,
      pitch: prosodyPitch,
    });

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => {
        tts.close();
        resolve();
      });
      audioStream.on('error', (err) => {
        tts.close();
        reject(err);
      });
    });

    const audioBuffer = Buffer.concat(chunks);
    const audioBase64 = audioBuffer.toString('base64');

    return res.json({
      audioBase64,
      mimeType: 'audio/mp3',
      voiceUsed: neuralVoice,
      engine: 'Microsoft Edge Neural TTS',
    });
  } catch (err: any) {
    console.error('Error in /api/ai/tts:', err);
    return res.status(500).json({
      error: err.message || '微软神经语音引擎暂时繁忙，请重试',
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

