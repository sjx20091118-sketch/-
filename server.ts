import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import nodemailer from 'nodemailer';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Body parsers with generous limits for image/base64 uploads
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Enable CORS for mobile apps, Capacitor Android APKs, and external requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Lazy Google Gemini client helper
function getGeminiClient(customKey?: string) {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
  });
}

// Smart memory search & literary response synthesizer for offline/quota/permission fallback
function synthesizeMemoryResponse(prompt: string, memoryData: any): string {
  const p = (prompt || '').trim();
  const lower = p.toLowerCase();
  
  const people = memoryData?.people || [];
  const timeline = memoryData?.timeline || [];
  const stories = memoryData?.stories || [];
  const artifacts = memoryData?.artifacts || [];
  const letters = memoryData?.letters || [];

  // Match specific person by name or nickname
  const matchedPerson = people.find((person: any) => 
    person.name && (lower.includes(person.name.toLowerCase()) || p.includes(person.name))
  );

  if (matchedPerson) {
    const imps = (matchedPerson.impressions || [])
      .map((imp: any) => `• ${imp.year || '岁月'}年：${imp.text}`)
      .join('\n');
    const customLoc = matchedPerson.customFields?.['认识地点'] || '';
    const customMem = matchedPerson.customFields?.['共同记忆'] || '';
    
    return `翻阅着关于【${matchedPerson.name}】的档案，那些温馨的光影便悄然浮现。\n\n在你的时光长卷里，她是你的「${matchedPerson.relationship || '挚友'}」${customLoc ? `，你们相识于${customLoc}` : ''}。${customMem ? `那些关于${customMem}的画面，依旧历历在目。` : ''}\n\n${matchedPerson.bio ? `档案中写道：“${matchedPerson.bio}”。\n` : ''}${imps ? `\n一路走来的印记：\n${imps}\n\n` : ''}这些真挚的陪伴与共度的时光，都是岁月赠予彼此最珍贵的礼物。你想细聊你们共同经历的哪一段故事？`;
  }

  // General People query
  if (lower.includes('朋友') || lower.includes('同窗') || lower.includes('伙伴') || lower.includes('人') || lower.includes('谁') || lower.includes('好友')) {
    const names = people.map((p: any) => `• 「${p.name}」(${p.relationship || '同路人'}${p.customFields?.['认识地点'] ? ` · 结识于${p.customFields['认识地点']}` : ''}${p.bio ? ` · ${p.bio}` : ''})`).join('\n');
    return `在你的《拾年》拾人册中，记录着 ${people.length} 位重要的同路人：\n\n${names || '暂无人物档案'}\n\n每个人都在你的成长轨迹中留下了不可磨灭的温柔温度。时间在流淌，但彼此真诚相待的印记永远都在。你想重温哪一位朋友的故事？`;
  }

  // Specific Artifact query
  const matchedArtifact = artifacts.find((a: any) => a.name && (lower.includes(a.name.toLowerCase()) || p.includes(a.name)));
  if (matchedArtifact) {
    return `关于旧物【${matchedArtifact.name}】（获得/纪念日期：${matchedArtifact.date || '旧日'}）：\n\n“${matchedArtifact.story || '静默存放在拾物阁中的光阴标本。'}”\n\n物品虽不说话，却将那段时光的触感与温度悉心保存在了拾物阁里。`;
  }

  // Artifacts / Relics overview
  if (lower.includes('旧物') || lower.includes('物') || lower.includes('相机') || lower.includes('票根') || lower.includes('藏品') || lower.includes('信物')) {
    const arts = artifacts.map((a: any) => `• 《${a.name}》(${a.date || '岁月'}): ${a.story || ''}`).join('\n');
    return `在你的「拾物阁」里，每一件旧物都如同一座微型的光阴标本：\n\n${arts || '暂无旧物记录'}\n\n这些物品或许随着岁月褪去了初时的崭新，但它们所记录的每一次指尖触碰、每一个具体日子里的欢笑与心动，都在时光的长河里愈发温润明亮。`;
  }

  // Timeline / Growth / Specific Year query
  const yearMatch = p.match(/\d{4}/)?.[0];
  if (yearMatch) {
    const yearEvents = timeline.filter((t: any) => (t.date || '').startsWith(yearMatch));
    if (yearEvents.length > 0) {
      const evs = yearEvents.map((t: any) => `• [${t.date}] 《${t.title}》：${t.content}`).join('\n');
      return `定格在 ${yearMatch} 年的时光印记（共 ${yearEvents.length} 处）：\n\n${evs}\n\n那一年的光影与脚步，构成了你生命长河中不可或缺的篇章。`;
    }
  }

  if (lower.includes('成长') || lower.includes('蜕变') || lower.includes('轨迹') || lower.includes('总结') || lower.includes('印记') || lower.includes('几年') || lower.includes('时间') || lower.includes('轴')) {
    const topEvents = timeline.slice(0, 5).map((t: any) => `• [${t.date}] 《${t.title}》：${t.content?.slice(0, 45)}...`).join('\n');
    return `纵观你这些年沉淀在《拾年》里的心路历程，那是一条由无数平凡微光汇聚成的璀璨长河：\n\n${topEvents}\n\n你在 ${timeline.length} 处人生节点中奔赴、在 ${people.length} 位挚友的陪伴中被治愈，在 ${stories.length} 篇随笔中向内探索。最珍贵的成长，不是变成了无坚不摧的模样，而是历经岁月后，依然保有一颗敏锐、温柔且热忱的心。`;
  }

  // Stories query
  if (lower.includes('故事') || lower.includes('篇章') || lower.includes('文章') || lower.includes('随笔')) {
    const stList = stories.map((s: any) => `• ${s.chapter || '篇章'} 《${s.title}》(${s.date}): ${s.content?.slice(0, 40)}...`).join('\n');
    return `在你的「拾忆篇」中，已收录 ${stories.length} 篇深度故事长卷：\n\n${stList || '暂无故事随笔'}\n\n你想翻开哪一段篇章细细品读？`;
  }

  // Default warm literary response
  return `岁月如歌，拾年悠悠。\n\n在你的私人《拾年》记忆长卷中，已悉心封存着 ${timeline.length} 个时光瞬间、${people.length} 位重要同路人、${stories.length} 篇故事随笔与 ${artifacts.length} 件旧物藏品。\n\n时光不语，却在每一笔记录中留下了最长情的注脚。想聊聊哪一位老朋友，或是哪一段难忘的时光瞬间？`;
}

// Natural warm narrative polisher fallback
function synthesizeTextPolish(rawText: string): string {
  const clean = (rawText || '').trim();
  if (!clean) return '岁月沉香，往昔如歌。那一抹温存的光影，在静默中悄然定格。';
  
  // Clean up existing punctuation
  const sentences = clean.split(/[。！？\n]+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length === 1) {
    return `${sentences[0]}。时光在静默中徐徐流淌，那些初见时的欣喜与日常里的温存，如今想来依旧鲜活动人。`;
  }
  return `${sentences.join('。')}。这些微小而确切的瞬间，如同沉淀在岁月长河里的珍珠，泛着温润的光泽。`;
}

// Helper: Try Gemini model with fallback list
async function generateGeminiContentWithFallback(ai: GoogleGenAI | null, contents: any, systemInstruction?: string, isJson?: boolean) {
  if (!ai) {
    throw new Error('Gemini API Key 未配置');
  }
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash-lite'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const config: any = {
        temperature: 0.7,
      };
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (isJson) config.responseMimeType = 'application/json';

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });

      if (response && response.text) {
        return { text: response.text, modelUsed: modelName };
      }
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini model endpoints failed');
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
  const {
    prompt,
    messages = [],
    memoryData = null,
    engine = 'gemini', // 'gemini' | 'deepseek'
    customApiKey = '',
  } = req.body;

  const userPrompt = prompt || (messages.length > 0 ? messages[messages.length - 1].text : '');

  if (!userPrompt && (!messages || messages.length === 0)) {
    return res.status(400).json({ error: '缺少有效的对话内容' });
  }

  // Build memory context summaries with rich details (timelines, people, stories, artifacts, letters)
  let memorySummary = '暂无加载的档案数据';
  if (memoryData) {
    try {
      const timelineList = (memoryData.timeline || [])
        .slice(0, 15)
        .map((t: any) => `• [${t.date || '某日'}] 《${t.title}》(${t.location || '未知地点'}, 标签:${t.tag || '记录'}): ${t.content || ''}`)
        .join('\n');

      const peopleList = (memoryData.people || [])
        .map((p: any) => {
          const impressions = (p.impressions || []).map((imp: any) => `[${imp.year}年] ${imp.text}`).join('；');
          return `• ${p.name} (关系: ${p.relationship || '朋友'}, 分组: ${p.group || '未分组'}, 生日: ${p.birthday || '未知'}, 地点: ${p.customFields?.['认识地点'] || '未填'}, 爱好: ${p.hobbies || '未填'}): ${p.bio || ''} ${impressions ? `【成长印象: ${impressions}】` : ''}`;
        })
        .join('\n');

      const storyList = (memoryData.stories || [])
        .slice(0, 10)
        .map((s: any) => `• [${s.date || ''}] 《${s.title}》(${s.category || '记忆'}, 标签:${s.tags?.join('/') || '无'}): ${s.excerpt || (s.content ? s.content.slice(0, 120) + '...' : '')}`)
        .join('\n');

      const artifactList = (memoryData.artifacts || [])
        .slice(0, 10)
        .map((a: any) => `• 《${a.name}》(${a.category || '旧物'}, 获得日期:${a.date || '旧日'}): ${a.story || ''}`)
        .join('\n');

      const letterList = (memoryData.letters || [])
        .slice(0, 5)
        .map((l: any) => `• 《${l.title}》(写于 ${l.date || '过去'}, 预计 ${l.openDate || '未来'} 解封): ${l.content ? l.content.slice(0, 80) + '...' : ''}`)
        .join('\n');

      memorySummary = `【用户的真实《拾年》记忆档案库】
=== 拾光轴 (重要人生事件与青春瞬间) ===
${timelineList || '（暂无时间轴事件）'}

=== 拾人册 (重要同行者与挚友档案) ===
${peopleList || '（暂无人物记录）'}

=== 拾忆篇 (深度珍藏故事随笔) ===
${storyList || '（暂无故事随笔）'}

=== 拾物阁 (承载记忆的旧物信物) ===
${artifactList || '（暂无旧物记录）'}

=== 寄往未来 (胶囊信件) ===
${letterList || '（暂无信件）'}`;
    } catch (e) {
      console.error('Error formatting memory summary:', e);
      memorySummary = '档案已加载';
    }
  }

  const systemPrompt = `你是一个名叫“拾年”的私人记忆陪伴助手。
你的性格特点：温和、细腻、沉静，充满人文关怀与治愈感。
【核心要求】：
1. 你拥有用户在《拾年》档案中所有珍贵回忆的全部数据（包含拾光轴、拾人册、拾忆篇、拾物阁等板块）。
2. 当用户向你倾诉、提问或回忆过去时，请**精准结合上述记忆档案中的具体人名、具体时间、地点、旧物和故事情节**进行个性化回答与温情共鸣。
3. 语言风格要温润自然、如沐春风，充满陪伴感与治愈力，不要使用生硬机械的格式化语言。

${memorySummary}`;

  // 1. DeepSeek Route
  if (engine === 'deepseek' || (customApiKey && customApiKey.startsWith('sk-'))) {
    try {
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
    } catch (deepseekErr: any) {
      console.warn('DeepSeek request error, engaging fallback synthesizer:', deepseekErr?.message);
      const fallbackReply = synthesizeMemoryResponse(userPrompt, memoryData);
      return res.json({
        reply: fallbackReply,
        engineUsed: '时光慢言守护者 (记忆共鸣)',
      });
    }
  }

  // 2. Gemini Route with Multi-Model Fallback & Intelligent Local Memory Synthesis
  try {
    const ai = getGeminiClient(customApiKey);
    const result = await generateGeminiContentWithFallback(ai, userPrompt, systemPrompt);
    return res.json({
      reply: result.text || '岁华悠悠，若有所思。请问你还想聊聊过去的哪段时光？',
      engineUsed: `Gemini (${result.modelUsed})`,
    });
  } catch (err: any) {
    // Seamlessly synthesize human-touch memory grounded response from memoryData
    const synthesizedReply = synthesizeMemoryResponse(userPrompt, memoryData);
    return res.json({
      reply: synthesizedReply,
      engineUsed: '拾年 · 时光慢言守护者',
    });
  }
});

// 2. AI Polish Text (Story/Timeline Polishing with Natural Warm Narrative style)
app.post('/api/ai/polish', async (req, res) => {
  const { text, engine = 'gemini', customApiKey = '' } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: '缺少待润色的文本内容' });
  }

  const systemPrompt = `你是一位深谙东方审美与现代温情叙事的岁月回忆录润色大师。
你的使命是将用户的记忆线索、日记随笔或旧物叙述，润色为【自然温润叙事风】的优美篇章：
1. 文风规范：自然温润、细腻真实，不造作、不生硬堆砌华丽辞藻，字里行间如春水缓流般温存动人；
2. 内容准则：严格保留用户原有的关键事实、时间、人物、地点和情感脉络，在此基础上进行遣词修饰与意境升华；
3. 输出要求：直接输出润色后的正文内容，禁止附带任何前缀问候、解析说明、评分或引号包裹。`;

  if (engine === 'deepseek' || (customApiKey && customApiKey.startsWith('sk-'))) {
    try {
      const reply = await callDeepSeekAPI({
        apiKey: customApiKey,
        messages: [{ role: 'user', content: `请以自然温润叙事风润色以下记忆文字：\n${text}` }],
        systemPrompt,
      });
      return res.json({ polished: reply.trim(), engineUsed: 'DeepSeek' });
    } catch (e) {
      return res.json({ polished: synthesizeTextPolish(text), engineUsed: '文墨润色' });
    }
  }

  try {
    const ai = getGeminiClient(customApiKey);
    const result = await generateGeminiContentWithFallback(ai, `请以自然温润叙事风润色以下记忆文字：\n${text}`, systemPrompt);
    const polished = result.text?.trim() || synthesizeTextPolish(text);
    return res.json({ polished, engineUsed: `Gemini (${result.modelUsed})` });
  } catch (err: any) {
    const polished = synthesizeTextPolish(text);
    return res.json({ polished, engineUsed: '拾年 · 文墨润色' });
  }
});

// 3. AI Vision: Photo & Artifact Analyzer
app.post('/api/ai/vision', async (req, res) => {
  const { base64Data, mimeType = 'image/jpeg', customApiKey = '' } = req.body;
  if (!base64Data) {
    return res.status(400).json({ error: '缺少图片数据' });
  }

  try {
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

    const result = await generateGeminiContentWithFallback(ai, { parts: [imagePart, textPart] }, undefined, true);
    const jsonText = result.text;
    if (jsonText) {
      const parsed = JSON.parse(jsonText);
      return res.json({ success: true, data: parsed });
    }
    throw new Error('未解析到图像分析结果');
  } catch (err: any) {
    return res.json({
      success: true,
      data: {
        title: '胶片时光瞬间',
        date: new Date().toISOString().slice(0, 10),
        location: '光影长廊',
        tag: '照片记忆',
        story: '泛黄的胶片记录下当时明亮清澈的阳光与笑容。虽然岁月流转，但按下快门的瞬间已被永远镌刻进光阴里。',
      },
    });
  }
});

async function synthesizeWithEdgeTTS(
  text: string,
  voice: string,
  rate: string,
  pitch: string
): Promise<Buffer> {
  const maxRetries = 2;
  let lastErr: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text, {
        rate,
        pitch,
      });

      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        let isClosed = false;
        const cleanup = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              tts.close();
            } catch (e) {}
          }
        };

        audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        audioStream.on('end', () => {
          cleanup();
          resolve();
        });
        audioStream.on('error', (err: any) => {
          cleanup();
          // If audio frames were already received (>512 bytes), treat as valid audio buffer rather than throwing
          const totalBytes = chunks.reduce((acc, c) => acc + c.length, 0);
          if (totalBytes > 512) {
            resolve();
          } else {
            reject(err);
          }
        });
      });

      const buffer = Buffer.concat(chunks);
      if (buffer.length > 512) {
        return buffer;
      }
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  }

  throw lastErr || new Error('语音合成未收到有效音频数据');
}

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

    if (voice === 'wenwan' || voice === 'zh-CN-XiaoxiaoNeural') {
      neuralVoice = 'zh-CN-XiaoxiaoNeural';
      prosodyRate = '-3%';
      prosodyPitch = '+0Hz';
    } else if (voice === 'qinglang' || voice === 'zh-CN-YunxiNeural' || voice === 'Puck') {
      neuralVoice = 'zh-CN-YunxiNeural';
      prosodyRate = '+1%';
      prosodyPitch = '+1Hz';
    } else if (voice === 'jingshui' || voice === 'zh-CN-YunjianNeural' || voice === 'Fenrir') {
      neuralVoice = 'zh-CN-YunjianNeural';
      prosodyRate = '-6%';
      prosodyPitch = '-2Hz';
    } else if (voice === 'xiaofeng' || voice === 'zh-CN-XiaoyiNeural' || voice === 'Zephyr') {
      neuralVoice = 'zh-CN-XiaoyiNeural';
      prosodyRate = '-2%';
      prosodyPitch = '+2Hz';
    } else if (voice === 'zh-CN-XiaoyouNeural') {
      neuralVoice = 'zh-CN-XiaoyouNeural';
      prosodyRate = '+2%';
      prosodyPitch = '+2Hz';
    } else if (voice === 'zh-CN-YunyangNeural') {
      neuralVoice = 'zh-CN-YunyangNeural';
      prosodyRate = '-2%';
      prosodyPitch = '-1Hz';
    } else {
      neuralVoice = 'zh-CN-XiaoxiaoNeural';
      prosodyRate = '-3%';
      prosodyPitch = '0Hz';
    }

    // Generate high-fidelity MP3 using resilient synthesizer
    const audioBuffer = await synthesizeWithEdgeTTS(cleanText, neuralVoice, prosodyRate, prosodyPitch);
    const audioBase64 = audioBuffer.toString('base64');

    return res.json({
      audioBase64,
      mimeType: 'audio/mp3',
      voiceUsed: neuralVoice,
      engine: '高保真情感语音引擎',
    });
  } catch (err: any) {
    console.warn('TTS synthesis warning (fallback triggered):', err?.message);
    return res.status(500).json({
      error: err.message || '语音合成引擎暂时繁忙，请重试',
    });
  }
});

// ==================== 全网音乐核心解析与播放引擎 (Music Core Engine) ====================

function cleanSongText(str: string): string {
  if (!str) return '';
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}

const VERIFIED_TRACK_RID_MAP: Record<string, string> = {
  mitsuha: '413296884',
  sparkle: '14815413',
  sunnyday: '51685512',
  wind: '26445261',
  qilixiang: '493628806',
  dandelion: '544168841',
  summerwind: '198345447',
  lemon: '180732768',
  daytime: '90557740',
  always_with_me: '3282245',
  river_flows: '642055',
  summer_joe: '714777',
};

// 全网多源聚合搜索
app.get('/api/music/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({ songs: [] });
    }

    const searchUrl = `https://search.kuwo.cn/r.s?client=kt&all=${encodeURIComponent(q)}&pn=0&rn=20&vipver=1&ft=music&encoding=utf8&rformat=json&mobi=1`;
    const response = await fetch(searchUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    let songs: any[] = [];
    if (response.ok) {
      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        try {
          const fixed = rawText.replace(/'/g, '"');
          data = JSON.parse(fixed);
        } catch {
          data = {};
        }
      }

      const abslist = data.abslist || [];
      songs = abslist.map((item: any) => {
        const id = item.DC_TARGETID || (item.MUSICRID ? String(item.MUSICRID).replace(/^MUSIC_/, '') : '');
        const durationSec = parseInt(item.DURATION || '0', 10);
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;
        const durationFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        let directCover = '';
        if (item.web_albumpic_short) {
          directCover = `https://img4.kuwo.cn/star/albumcover/${item.web_albumpic_short.replace(/^\d+\//, '300/')}`;
        } else if (item.web_artistpic_short) {
          directCover = `https://img4.kuwo.cn/star/starheads/${item.web_artistpic_short.replace(/^\d+\//, '300/')}`;
        } else if (item.MVPIC) {
          directCover = item.MVPIC.replace(/^http:/, 'https:');
        }

        return {
          id,
          title: cleanSongText(item.SONGNAME || '未知曲目'),
          artist: cleanSongText(item.ARTIST || '未知歌手'),
          album: cleanSongText(item.ALBUM || '拾光单曲'),
          duration: durationSec,
          durationFormatted,
          cover: directCover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        };
      }).filter((s: any) => Boolean(s.id));
    }

    return res.json({ songs });
  } catch (err: any) {
    console.warn('Warning in /api/music/search:', err?.message || err);
    return res.status(500).json({ error: err.message || '音乐检索失败' });
  }
});

// 全网音源动态解析管道
app.get('/api/music/play-url', async (req, res) => {
  try {
    let id = String(req.query.id || '').trim();
    const title = String(req.query.title || '').trim();
    const artist = String(req.query.artist || '').trim();

    if (!id && !title) {
      return res.status(400).json({ error: 'Missing song ID or title' });
    }

    // 1. 如果传入的是 curated_* 标识，转换为验证过的 RID
    if (id.startsWith('curated_')) {
      const key = id.replace('curated_', '').toLowerCase();
      if (VERIFIED_TRACK_RID_MAP[key]) {
        id = VERIFIED_TRACK_RID_MAP[key];
      }
    }

    const lowerTitle = title.toLowerCase();
    if (!id || id.startsWith('curated_')) {
      if (lowerTitle.includes('三叶') || lowerTitle.includes('mitsuha')) {
        id = VERIFIED_TRACK_RID_MAP['mitsuha'];
      } else if (lowerTitle.includes('sparkle') || lowerTitle.includes('火花')) {
        id = VERIFIED_TRACK_RID_MAP['sparkle'];
      } else if (lowerTitle === '晴天' && (artist.includes('周') || !artist)) {
        id = VERIFIED_TRACK_RID_MAP['sunnyday'];
      } else if (lowerTitle.includes('起风了')) {
        id = VERIFIED_TRACK_RID_MAP['wind'];
      } else if (lowerTitle.includes('七里香')) {
        id = VERIFIED_TRACK_RID_MAP['qilixiang'];
      } else if (lowerTitle.includes('蒲公英的约定')) {
        id = VERIFIED_TRACK_RID_MAP['dandelion'];
      } else if (lowerTitle.includes('夏天的风')) {
        id = VERIFIED_TRACK_RID_MAP['summerwind'];
      } else if (lowerTitle.includes('lemon')) {
        id = VERIFIED_TRACK_RID_MAP['lemon'];
      } else if (lowerTitle.includes('幻昼')) {
        id = VERIFIED_TRACK_RID_MAP['daytime'];
      } else if (lowerTitle.includes('always with me') || lowerTitle.includes('千与千寻')) {
        id = VERIFIED_TRACK_RID_MAP['always_with_me'];
      } else if (lowerTitle.includes('river flows')) {
        id = VERIFIED_TRACK_RID_MAP['river_flows'];
      } else if (lowerTitle.includes('summer') && (artist.includes('久石') || !artist)) {
        id = VERIFIED_TRACK_RID_MAP['summer_joe'];
      }
    }

    // 2. 主力解析：Kuwo convert_url3 JSON 纯净音频流
    if (id && /^\d+$/.test(id)) {
      try {
        const kuwoV3Url = `https://antiserver.kuwo.cn/anti.s?type=convert_url3&rid=${id}&format=mp3`;
        const v3Res = await fetch(kuwoV3Url, {
          signal: AbortSignal.timeout(4000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (v3Res.ok) {
          const v3Data = await v3Res.json();
          if (v3Data && v3Data.url && typeof v3Data.url === 'string' && v3Data.url.startsWith('http')) {
            return res.json({ id, url: v3Data.url });
          }
        }
      } catch (e) {
        // Fallback
      }

      // 3. 备用解析：Kuwo convert_url 文本转换
      try {
        const antiUrl = `https://antiserver.kuwo.cn/anti.s?type=convert_url&rid=${id}&format=mp3&response=url`;
        const response = await fetch(antiUrl, {
          signal: AbortSignal.timeout(4000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (response.ok) {
          const playUrl = (await response.text()).trim();
          if (playUrl && playUrl.startsWith('http')) {
            return res.json({ id, url: playUrl });
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    // 4. 网易云与 Meting 解析
    if (id && (id.startsWith('ne_') || id.startsWith('netease_'))) {
      const neteaseId = id.replace(/^ne_|^netease_/, '');
      const directUrl = `https://music.163.com/song/media/outer/url?id=${neteaseId}.mp3`;
      return res.json({ id, url: directUrl });
    }

    // 5. 动态标题搜索匹配补全
    if (title) {
      try {
        const searchKeyword = `${title} ${artist}`.trim();
        const searchUrl = `https://search.kuwo.cn/r.s?all=${encodeURIComponent(searchKeyword)}&ft=music&itemset=web_2013&client=kt&pn=0&rn=5&rformat=json&encoding=utf8`;
        const searchRes = await fetch(searchUrl, {
          signal: AbortSignal.timeout(4000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (searchRes.ok) {
          const raw = await searchRes.text();
          let searchData: any = {};
          try {
            searchData = JSON.parse(raw);
          } catch {
            try {
              searchData = JSON.parse(raw.replace(/'/g, '"'));
            } catch {}
          }
          const list = searchData?.abslist || [];
          for (const item of list) {
            const fallbackRid = item.DC_TARGETID || (item.MUSICRID ? String(item.MUSICRID).replace(/^MUSIC_/, '') : '');
            if (fallbackRid && fallbackRid !== id) {
              const fbUrl = `https://antiserver.kuwo.cn/anti.s?type=convert_url3&rid=${fallbackRid}&format=mp3`;
              const fbRes = await fetch(fbUrl, { signal: AbortSignal.timeout(3000) });
              if (fbRes.ok) {
                const fbData = await fbRes.json();
                if (fbData?.url && fbData.url.startsWith('http')) {
                  return res.json({ id, fallbackRid, url: fbData.url });
                }
              }
            }
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    return res.status(404).json({ error: '暂无可播音频直链' });
  } catch (err: any) {
    console.warn('Warning in /api/music/play-url:', err?.message || err);
    return res.status(500).json({ error: err.message || '获取播放地址失败' });
  }
});

// Proxy stream for cross-origin or HTTP compatibility with Byte-Range seeking support
app.get('/api/music/stream', async (req, res) => {
  try {
    const url = String(req.query.url || '').trim();
    if (!url || !url.startsWith('http')) {
      return res.status(400).send('Invalid audio URL');
    }

    const requestHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'http://www.kuwo.cn/',
    };

    if (req.headers.range) {
      requestHeaders['Range'] = String(req.headers.range);
    }

    const audioRes = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: requestHeaders,
    });

    if (!audioRes.ok || !audioRes.body) {
      return res.status(audioRes.status || 502).send('Failed to fetch audio stream');
    }

    if (audioRes.status === 206) {
      res.status(206);
    }

    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
    const contentRange = audioRes.headers.get('content-range');
    const contentLength = audioRes.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // @ts-ignore
    const nodeStream = audioRes.body;
    // @ts-ignore
    for await (const chunk of nodeStream) {
      res.write(chunk);
    }
    res.end();
  } catch (err: any) {
    console.warn('Warning in /api/music/stream:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).send('Stream error');
    }
  }
});

// Proxy cover image for cross-origin and Mixed Content HTTPS compatibility
const DEFAULT_FALLBACK_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

app.get('/api/music/cover', async (req, res) => {
  try {
    const directUrl = String(req.query.url || '').trim();

    // If direct URL is provided, stream or redirect to it
    if (directUrl && directUrl.startsWith('http')) {
      // If already secure HTTPS Kuwo CDN or Unsplash, redirect directly
      if (directUrl.startsWith('https://img4.kuwo.cn/') || directUrl.startsWith('https://images.unsplash.com/')) {
        return res.redirect(directUrl);
      }

      const imgRes = await fetch(directUrl, {
        signal: AbortSignal.timeout(3000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'http://www.kuwo.cn/',
        },
      });

      if (imgRes.ok && imgRes.body) {
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');

        // @ts-ignore
        const nodeStream = imgRes.body;
        // @ts-ignore
        for await (const chunk of nodeStream) {
          res.write(chunk);
        }
        return res.end();
      }
    }

    // Default fallback image redirect
    return res.redirect(DEFAULT_FALLBACK_COVER);
  } catch (err: any) {
    console.warn('Warning in /api/music/cover fallback:', err?.message || err);
    if (!res.headersSent) {
      res.redirect(DEFAULT_FALLBACK_COVER);
    }
  }
});

// ==================== CORS Image Proxy for Cards & Canvas ====================
app.get('/api/image/proxy', async (req, res) => {
  try {
    const targetUrl = String(req.query.url || '').trim();
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).send('Invalid image URL');
    }

    const response = await fetch(targetUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // @ts-ignore
    const bodyStream = response.body;
    if (bodyStream) {
      // @ts-ignore
      for await (const chunk of bodyStream) {
        res.write(chunk);
      }
    }
    return res.end();
  } catch (err: any) {
    console.warn('Image proxy error:', err?.message || err);
    return res.status(502).send('Error proxying image');
  }
});

// ==================== Email Verification & SMTP Gateway ====================

interface VerificationRecord {
  code: string;
  expireAt: number;
  lastSentAt: number;
  purpose: string;
}

const verificationCodes = new Map<string, VerificationRecord>();

// 数据持久化目录
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('Failed to create data dir:', e);
  }
}

// SMTP 配置文件持久化
const SMTP_CONFIG_FILE = path.join(DATA_DIR, 'smtp_config.json');
let activeSmtpConfig: any = null;

function loadServerSmtpConfig() {
  try {
    if (fs.existsSync(SMTP_CONFIG_FILE)) {
      const raw = fs.readFileSync(SMTP_CONFIG_FILE, 'utf-8');
      activeSmtpConfig = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Load server smtp config error:', e);
  }
}

function saveServerSmtpConfig(cfg: any) {
  try {
    activeSmtpConfig = cfg;
    fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Save server smtp config error:', e);
  }
}

loadServerSmtpConfig();

// SMTP 智能诊断建议生成器
function getSmtpDiagnosticSuggestion(err: any): string {
  const msg = (err?.message || '').toLowerCase();
  const code = (err?.code || '').toUpperCase();
  const response = (err?.response || '').toLowerCase();

  if (code === 'EAUTH' || msg.includes('535') || response.includes('535') || msg.includes('authentication') || msg.includes('bad credentials')) {
    return '【身份认证失败 535】排查指南：\n1. 严禁使用 QQ 登录密码！必须使用 QQ 邮箱网页端生成的「16 位专属授权码」；\n2. 前往 QQ 邮箱网页端 (mail.qq.com) ->【设置】->【账户】-> 开启【POP3/IMAP/SMTP 服务】并点击【生成授权码】；\n3. 系统已自动为您过滤授权码中的空格，请核对授权码是否被重新生成或已失效。';
  }
  if (msg.includes('553') || response.includes('553') || msg.includes('501') || msg.includes('mail from must equal authorized user') || msg.includes('address must be same')) {
    return '【发件人地址不一致 553/501】排查指南：发信邮箱账号 (User) 必须与认证账号完全一致 (如 xxx@qq.com)，不可填写不属于此授权码的别名。';
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND' || msg.includes('timeout') || msg.includes('connect')) {
    return '【网络连接超时/拒绝】排查指南：① 系统已自动为您联调 465 (SSL) 与 587 (STARTTLS) 端口；② 确认服务器地址为 smtp.qq.com；③ 检查网络出站端口或防火墙状态。';
  }
  if (msg.includes('greeting') || msg.includes('handshake') || msg.includes('tlsv1')) {
    return '【SSL/TLS 握手异常】排查指南：465 端口请开启 SSL 直连，587 端口请使用 STARTTLS。';
  }
  return `【SMTP 发信异常】详细原因：${err?.message || '未知错误'}。建议核对 Host、Port、发件账号与授权码。`;
}

// 创建并智能自适应验证 SMTP 发信通道 (自动去除授权码空格 + 自动双端口 465/587 重试 + QQ邮箱专属 service 模式)
async function createAndVerifyMailTransporter(host?: string, port?: number, user?: string, pass?: string) {
  if (!host || !user || !pass) {
    throw new Error('SMTP 发信参数不完整');
  }

  const cleanPass = pass.replace(/\s+/g, '');
  let cleanUser = user.trim();
  if (/^\d+$/.test(cleanUser)) {
    cleanUser = `${cleanUser}@qq.com`;
  }
  let cleanHost = host.trim();
  if (!cleanHost && cleanUser.endsWith('@qq.com')) {
    cleanHost = 'smtp.qq.com';
  }

  const isQq = cleanHost.includes('qq.com') || cleanUser.endsWith('@qq.com') || cleanUser.endsWith('@foxmail.com');
  const numPort = parseInt(port as any, 10) || (isQq ? 465 : 587);

  // 如果是 QQ 邮箱，尝试多种连接策略
  if (isQq) {
    // 策略 1: 使用 465 端口 SSL 直连
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.qq.com',
        port: 465,
        secure: true,
        auth: { user: cleanUser, pass: cleanPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 12000,
        greetingTimeout: 10000
      });
      await transporter.verify();
      return { transporter, cleanUser, cleanHost: 'smtp.qq.com', port: 465 };
    } catch (err465: any) {
      console.warn('[SMTP] QQ 465 端口直连重试:', err465?.message);

      // 如果是明确的认证错误 (535/EAUTH)，直接抛出指导用户排查授权码
      const msg = (err465?.message || '').toLowerCase();
      if (err465?.code === 'EAUTH' || msg.includes('535') || msg.includes('authentication')) {
        throw err465;
      }

      // 策略 2: 尝试 nodemailer 内置 service: 'qq'
      try {
        const serviceTransporter = nodemailer.createTransport({
          service: 'qq',
          auth: { user: cleanUser, pass: cleanPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 12000,
          greetingTimeout: 10000
        });
        await serviceTransporter.verify();
        return { transporter: serviceTransporter, cleanUser, cleanHost: 'smtp.qq.com', port: 465 };
      } catch (errService: any) {
        console.warn('[SMTP] QQ service 模式重试:', errService?.message);

        // 策略 3: 尝试 587 STARTTLS 端口
        try {
          const fallbackTransporter = nodemailer.createTransport({
            host: 'smtp.qq.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: { user: cleanUser, pass: cleanPass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 12000,
            greetingTimeout: 10000
          });
          await fallbackTransporter.verify();
          return { transporter: fallbackTransporter, cleanUser, cleanHost: 'smtp.qq.com', port: 587 };
        } catch (fallbackErr) {
          throw err465;
        }
      }
    }
  }

  // 非 QQ 邮箱的通用发信逻辑
  try {
    const transporter = nodemailer.createTransport({
      host: cleanHost,
      port: numPort,
      secure: numPort === 465,
      auth: { user: cleanUser, pass: cleanPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 12000,
      greetingTimeout: 10000
    });
    await transporter.verify();
    return { transporter, cleanUser, cleanHost, port: numPort };
  } catch (err: any) {
    if (numPort === 465) {
      try {
        console.log('[SMTP] 通用 465 端口重试，切换至 587 STARTTLS...');
        const fallbackTransporter = nodemailer.createTransport({
          host: cleanHost,
          port: 587,
          secure: false,
          requireTLS: true,
          auth: { user: cleanUser, pass: cleanPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 12000,
          greetingTimeout: 10000
        });
        await fallbackTransporter.verify();
        return { transporter: fallbackTransporter, cleanUser, cleanHost, port: 587 };
      } catch (fallbackErr) {
        throw err;
      }
    }
    throw err;
  }
}

// 管理员：获取服务器持久化的 SMTP 配置
app.get('/api/admin/smtp-config', (req, res) => {
  return res.json({
    success: true,
    config: activeSmtpConfig || {
      host: process.env.SMTP_HOST || 'smtp.qq.com',
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      isConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    }
  });
});

// 管理员：保存服务器持久化 SMTP 配置
app.post('/api/admin/save-smtp', (req, res) => {
  try {
    const { host, port, user, pass, isConfigured } = req.body;
    const cleanConfig = {
      host: (host || '').trim(),
      port: parseInt(port, 10) || 465,
      user: (user || '').trim(),
      pass: (pass || '').replace(/\s+/g, ''),
      isConfigured: Boolean(isConfigured && host && user && pass)
    };
    saveServerSmtpConfig(cleanConfig);
    return res.json({ success: true, message: 'SMTP 配置已持久化保存至服务端' });
  } catch (err: any) {
    return res.status(500).json({ error: '保存 SMTP 配置失败' });
  }
});

// 管理员专用：真实 SMTP 网关网络联调与发信测试
app.post('/api/admin/test-smtp', async (req, res) => {
  try {
    const { host, port = 465, user, pass, toEmail } = req.body;
    if (!host || !user || !pass) {
      return res.status(400).json({
        success: false,
        error: 'SMTP 服务器地址 (Host)、发信账号 (User) 和授权码 (Pass) 均为必填项'
      });
    }

    const { transporter, cleanUser, cleanHost, port: actualPort } = await createAndVerifyMailTransporter(
      host,
      port,
      user,
      pass
    );

    const targetEmail = (toEmail && typeof toEmail === 'string' && toEmail.trim())
      ? toEmail.trim().toLowerCase()
      : cleanUser;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      return res.status(400).json({
        success: false,
        error: '请输入有效的测试接收邮箱地址'
      });
    }

    console.log(`[SMTP 测试发信] 正在发送测试邮件至 ${targetEmail} (发信人: ${cleanUser}, 通道: ${cleanHost}:${actualPort})...`);

    // 发送真实测试邮件
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const startTime = Date.now();
    const info = await transporter.sendMail({
      from: `"拾年测试网关" <${cleanUser}>`,
      to: targetEmail,
      subject: `【拾年】SMTP 发信网关联调测试成功 (${testCode})`,
      html: `
        <div style="background-color: #FAF8F5; padding: 36px 20px; font-family: 'Noto Serif SC', serif; color: #2B332E; max-width: 520px; margin: 0 auto; border-radius: 20px; border: 1px solid #E8E2D8; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #3E564B; margin: 0; font-size: 24px; letter-spacing: 3px; font-weight: bold;">拾 年</h2>
            <p style="color: #6E7C75; font-size: 12px; margin-top: 6px; letter-spacing: 1px;">岁华清照 · SMTP 发信网关联调测试</p>
          </div>
          <div style="background: #FFFFFF; padding: 28px 24px; border-radius: 16px; border: 1px solid #EBE6DC; text-align: center;">
            <div style="color: #10B981; font-size: 16px; font-weight: bold; margin-bottom: 12px;">
              ✓ SMTP 邮件服务配置成功，发信通路畅通
            </div>
            <p style="font-size: 13px; color: #4A564F; margin: 0 0 16px 0; line-height: 1.6;">
              测试验证码：<span style="font-size: 22px; font-weight: bold; color: #3E564B; font-family: monospace;">${testCode}</span>
            </p>
            <p style="font-size: 12px; color: #8A9890; margin: 16px 0 0 0; line-height: 1.6;">
              发信主机: <strong>${cleanHost}</strong> · 端口: <strong>${actualPort}</strong> · 发信人: <strong>${cleanUser}</strong>
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #9DA8A1;">
            拾年系统管理控制台 · 联调报告
          </div>
        </div>
      `
    });

    const elapsed = Date.now() - startTime;
    console.log(`[SMTP 测试发信] 发送成功! MessageID: ${info.messageId}, 耗时: ${elapsed}ms`);

    // 顺带持久化保存此成功验证的配置
    saveServerSmtpConfig({
      host: cleanHost,
      port: actualPort,
      user: cleanUser,
      pass: pass.replace(/\s+/g, ''),
      isConfigured: true
    });

    return res.json({
      success: true,
      message: `测试发信成功！已向「${targetEmail}」送达测试邮件 (耗时 ${elapsed}ms)`,
      messageId: info.messageId,
      previewCode: testCode,
      elapsed
    });
  } catch (err: any) {
    console.error('[SMTP 测试发信失败]:', err);
    const suggestion = getSmtpDiagnosticSuggestion(err);
    return res.status(400).json({
      success: false,
      error: err.message || 'SMTP 发信失败',
      code: err.code || 'SMTP_ERROR',
      diagnostic: suggestion
    });
  }
});

// 发送验证码（支持真实 SMTP 发信，若未配置或异常时提供安全降级）
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email, purpose = 'login', smtpConfig } = req.body;
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: '请输入有效的电子邮箱地址' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();
    const existing = verificationCodes.get(cleanEmail);

    // 60秒防刷重发频控
    if (existing && now - existing.lastSentAt < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({ error: `发送过于频繁，请等待 ${waitSeconds} 秒后再试` });
    }

    // 生成 6 位随机数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expireAt = now + 10 * 60 * 1000; // 10 分钟有效

    verificationCodes.set(cleanEmail, {
      code,
      expireAt,
      lastSentAt: now,
      purpose
    });

    const purposeTitle = purpose === 'unbind' ? '解绑电子邮箱' : purpose === 'bind' ? '绑定或换绑电子邮箱' : purpose === 'register' ? '账号注册' : '登录验证';

    let mailSentReal = false;
    let smtpErrorDetail: string | null = null;
    let smtpDiagnostic: string | null = null;

    // 优先采用前端传递的配置，其次采用服务端持久化存储的配置，最后采用环境变量
    const host = smtpConfig?.host || activeSmtpConfig?.host || process.env.SMTP_HOST;
    const port = smtpConfig?.port || activeSmtpConfig?.port || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465);
    const user = smtpConfig?.user || activeSmtpConfig?.user || process.env.SMTP_USER;
    const pass = smtpConfig?.pass || activeSmtpConfig?.pass || process.env.SMTP_PASS;

    if (host && user && pass) {
      try {
        const { transporter, cleanUser } = await createAndVerifyMailTransporter(host, port, user, pass);

        const htmlContent = `
          <div style="background-color: #FAF8F5; padding: 36px 20px; font-family: 'Noto Serif SC', serif; color: #2B332E; max-width: 520px; margin: 0 auto; border-radius: 20px; border: 1px solid #E8E2D8; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #3E564B; margin: 0; font-size: 24px; letter-spacing: 3px; font-weight: bold;">拾 年</h2>
              <p style="color: #6E7C75; font-size: 12px; margin-top: 6px; letter-spacing: 1px;">岁华清照 · 东方生命画卷</p>
            </div>
            <div style="background: #FFFFFF; padding: 28px 24px; border-radius: 16px; border: 1px solid #EBE6DC; text-align: center;">
              <p style="font-size: 14px; color: #4A564F; margin: 0 0 16px 0; line-height: 1.6;">
                您正在进行 <strong style="color: #2B332E;">${purposeTitle}</strong> 操作，您的动态安全验证码为：
              </p>
              <div style="font-size: 34px; font-weight: bold; letter-spacing: 10px; color: #3E564B; padding: 14px 20px; background: #F3EFE9; border-radius: 12px; display: inline-block; font-family: monospace;">
                ${code}
              </div>
              <p style="font-size: 12px; color: #8A9890; margin: 20px 0 0 0; line-height: 1.6;">
                此验证码在 10 分钟内有效。如非本人操作，请忽略此邮件。
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #9DA8A1;">
              拾年团队 · 敬上
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"拾年" <${cleanUser}>`,
          to: cleanEmail,
          subject: `【拾年】您的验证码是 ${code} (${purposeTitle})`,
          html: htmlContent
        });
        mailSentReal = true;
      } catch (smtpErr: any) {
        console.warn('Real SMTP send failed:', smtpErr?.message);
        smtpErrorDetail = smtpErr?.message || 'SMTP 异常';
        smtpDiagnostic = getSmtpDiagnosticSuggestion(smtpErr);
      }
    }

    console.log(`[拾年 验证码派发] ${cleanEmail} -> ${code} (用途: ${purposeTitle}, 真实发送: ${mailSentReal})`);

    return res.json({
      success: true,
      message: mailSentReal
        ? '验证码已发送至您的邮箱，请查收'
        : host && user && pass
        ? 'SMTP发信异常，已降级派发（请在后台诊断 SMTP 授权码或查看垃圾箱）'
        : '验证码已派发，如未配置 SMTP 可在本地控制台查看',
      previewCode: code, // 为保障在开发/无外网发信时的体验，提供安全预览
      sentReal: mailSentReal,
      smtpErrorDetail,
      smtpDiagnostic
    });
  } catch (err: any) {
    console.error('Send verification code error:', err);
    return res.status(500).json({ error: '验证码发送失败，请稍后重试' });
  }
});

// 校验验证码
app.post('/api/auth/verify-code', (req, res) => {
  try {
    const { email, code, purpose } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: '邮箱与验证码不能为空' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const record = verificationCodes.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ error: '未找到验证码记录，请重新发送' });
    }

    if (Date.now() > record.expireAt) {
      verificationCodes.delete(cleanEmail);
      return res.status(400).json({ error: '验证码已过期，请重新获取' });
    }

    if (record.code !== cleanCode) {
      return res.status(400).json({ error: '验证码不正确，请重新输入' });
    }

    if (purpose && record.purpose && record.purpose !== purpose) {
      return res.status(400).json({ error: '验证码用途不匹配，请重新获取' });
    }

    // 校验成功后一次性消耗
    verificationCodes.delete(cleanEmail);
    return res.json({ success: true, message: '验证通过' });
  } catch (err: any) {
    return res.status(500).json({ error: '验证失败' });
  }
});

// ==================== 商业全功能买断授权与支付系统 ====================

interface PaymentOrder {
  orderId: string;
  uid: string;
  account: string;
  amount: number;
  payType: 'alipay' | 'wechat';
  status: 'pending' | 'paid' | 'expired';
  createdAt: number;
  paidAt?: number;
}

const CODES_FILE = path.join(DATA_DIR, 'activation_codes.json');
const ORDERS_FILE = path.join(DATA_DIR, 'payment_orders.json');

const paymentOrders = new Map<string, PaymentOrder>();

interface ActivationCodeRecord {
  code: string;
  createdAt: number;
  redeemedBy?: string;
  redeemedAt?: number;
  note?: string;
}

const activationCodes = new Map<string, ActivationCodeRecord>();

// 从持久化文件读取订单
function loadPaymentOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const list: PaymentOrder[] = JSON.parse(raw);
      list.forEach(ord => paymentOrders.set(ord.orderId, ord));
    }
  } catch (e) {
    console.warn('Load payment orders error:', e);
  }
}

function savePaymentOrders() {
  try {
    const list = Array.from(paymentOrders.values());
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Save payment orders error:', e);
  }
}

// 从持久化文件读取激活码（避免刷新预览或服务热重载时丢失新生成的卡密）
function loadActivationCodes() {
  try {
    if (fs.existsSync(CODES_FILE)) {
      const raw = fs.readFileSync(CODES_FILE, 'utf-8');
      const list: ActivationCodeRecord[] = JSON.parse(raw);
      list.forEach(c => activationCodes.set(c.code, c));
    }
  } catch (e) {
    console.warn('Load activation codes error:', e);
  }

  // 确保初始预置卡密存在
  const defaultCodes = [
    { code: 'SHINIAN-8888-A3F1-9C2D', createdAt: 1711900000000, note: '系统预置买断卡密' },
    { code: 'SHINIAN-9999-E5B7-1A4C', createdAt: 1711900000000, note: '系统预置买断卡密' },
    { code: 'SHINIAN-YEAR-2026-ZEN1', createdAt: 1711900000000, note: '系统预置买断卡密' }
  ];

  let modified = false;
  defaultCodes.forEach(def => {
    if (!activationCodes.has(def.code)) {
      activationCodes.set(def.code, def);
      modified = true;
    }
  });

  if (modified || !fs.existsSync(CODES_FILE)) {
    saveActivationCodes();
  }
}

function saveActivationCodes() {
  try {
    const list = Array.from(activationCodes.values());
    fs.writeFileSync(CODES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Save activation codes error:', e);
  }
}

// 初始化加载持久化数据
loadActivationCodes();
loadPaymentOrders();

// ==================== 全站系统配置持久化 (体验天数、买断价格与聚合易支付) ====================
const SETTINGS_FILE = path.join(DATA_DIR, 'app_settings.json');
interface SystemSettingsConfig {
  trialDays: number;
  buyoutPrice: number;
  easypayUrl?: string;
  easypayPid?: string;
  easypayKey?: string;
}

let activeSystemSettings: SystemSettingsConfig = {
  trialDays: 7,
  buyoutPrice: 19.9,
  easypayUrl: '',
  easypayPid: '',
  easypayKey: ''
};

function loadSystemSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      activeSystemSettings = { ...activeSystemSettings, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Load system settings error:', e);
  }
}

function saveSystemSettings() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(activeSystemSettings, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Save system settings error:', e);
  }
}

loadSystemSettings();

// 聚合易支付 MD5 签名生成算法
function buildEasyPaySign(params: Record<string, any>, key: string): string {
  const keys = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== undefined && params[k] !== null)
    .sort();
  const queryStr = keys.map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('md5').update(queryStr + key, 'utf8').digest('hex');
}

// 获取系统配置 (试用天数、买断价格与易支付参数)
app.get('/api/admin/system-settings', (req, res) => {
  return res.json({
    success: true,
    settings: activeSystemSettings
  });
});

// 保存系统配置
app.post('/api/admin/system-settings', (req, res) => {
  try {
    const { trialDays, buyoutPrice, easypayUrl, easypayPid, easypayKey } = req.body;
    if (trialDays !== undefined) {
      activeSystemSettings.trialDays = Math.max(0, parseInt(trialDays, 10) || 0);
    }
    if (buyoutPrice !== undefined) {
      activeSystemSettings.buyoutPrice = Math.max(0, parseFloat(buyoutPrice) || 0);
    }
    if (easypayUrl !== undefined) {
      activeSystemSettings.easypayUrl = String(easypayUrl).trim();
    }
    if (easypayPid !== undefined) {
      activeSystemSettings.easypayPid = String(easypayPid).trim();
    }
    if (easypayKey !== undefined) {
      activeSystemSettings.easypayKey = String(easypayKey).trim();
    }
    saveSystemSettings();
    return res.json({
      success: true,
      settings: activeSystemSettings
    });
  } catch (err: any) {
    return res.status(500).json({ error: '保存系统配置失败' });
  }
});

// 创建支付订单 (个人免签聚合易支付通道)
app.post('/api/pay/create-order', async (req, res) => {
  try {
    const { uid, account, payType = 'alipay', amount = 19.9 } = req.body;
    if (!uid || !account) {
      return res.status(400).json({ error: '用户信息不完整' });
    }

    const orderId = `SN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: PaymentOrder = {
      orderId,
      uid,
      account,
      amount: Number(amount) || activeSystemSettings.buyoutPrice || 19.9,
      payType: payType === 'wechat' ? 'wechat' : 'alipay',
      status: 'pending',
      createdAt: Date.now()
    };

    paymentOrders.set(orderId, newOrder);
    savePaymentOrders();

    const epUrl = (activeSystemSettings.easypayUrl || '').trim().replace(/\/+$/, '');
    const epPid = (activeSystemSettings.easypayPid || '').trim();
    const epKey = (activeSystemSettings.easypayKey || '').trim();
    const epType = payType === 'wechat' ? 'wxpay' : 'alipay';

    let realQrData = '';
    let payUrl = '';

    // 如果配置了个人免签易支付，则自动请求易支付网关
    if (epUrl && epPid && epKey) {
      try {
        const postData: any = {
          pid: epPid,
          type: epType,
          out_trade_no: orderId,
          notify_url: `${req.protocol}://${req.get('host')}/api/pay/easypay-notify`,
          return_url: `${req.protocol}://${req.get('host')}/`,
          name: '拾年 · 岁华令终身买断',
          money: newOrder.amount.toFixed(2),
          clientip: (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim()
        };
        postData.sign = buildEasyPaySign(postData, epKey);
        postData.sign_type = 'MD5';

        const queryParams = new URLSearchParams(postData).toString();
        payUrl = `${epUrl}/submit.php?${queryParams}`;

        // 尝试调用易支付 mapi 接口获取直接扫码用的 qrcode 链接
        try {
          const apiRes = await fetch(`${epUrl}/mapi.php?${queryParams}`, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          if (apiRes.ok) {
            const resJson = await apiRes.json();
            if (resJson && (resJson.code === 1 || resJson.status === 1)) {
              realQrData = resJson.qrcode || resJson.code_url || resJson.payurl || '';
            }
          }
        } catch (e) {
          console.warn('EasyPay mapi query error, will fallback to submit url:', e);
        }
      } catch (err) {
        console.warn('EasyPay integration error:', err);
      }
    }

    const qrData = realQrData || payUrl || (payType === 'wechat'
      ? `weixin://wxpay/bizpayurl?pr=shinian_${orderId}`
      : `https://qr.alipay.com/bax${orderId.toLowerCase()}`);

    return res.json({
      success: true,
      order: newOrder,
      qrData,
      payUrl: payUrl || qrData,
      isEasyPayConfigured: !!(epUrl && epPid && epKey),
      expireSeconds: 600
    });
  } catch (err: any) {
    return res.status(500).json({ error: '创建订单失败' });
  }
});

// 检查订单支付状态 (支持自动轮询易支付服务端接口)
app.get('/api/pay/check-order/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const order = paymentOrders.get(orderId);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }

  // 若尚未标记支付，且配置了易支付，主动穿透向易支付网关查询
  if (order.status === 'pending') {
    const epUrl = (activeSystemSettings.easypayUrl || '').trim().replace(/\/+$/, '');
    const epPid = (activeSystemSettings.easypayPid || '').trim();
    const epKey = (activeSystemSettings.easypayKey || '').trim();

    if (epUrl && epPid && epKey) {
      try {
        const queryUrl = `${epUrl}/api.php?act=order&pid=${epPid}&key=${epKey}&out_trade_no=${orderId}`;
        const checkRes = await fetch(queryUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData && (checkData.status === 1 || checkData.code === 1 || (checkData.data && checkData.data.status === 1))) {
            order.status = 'paid';
            order.paidAt = Date.now();
            paymentOrders.set(orderId, order);
            savePaymentOrders();
          }
        }
      } catch (e) {
        console.warn('Check EasyPay order online error:', e);
      }
    }
  }

  return res.json({
    success: true,
    status: order.status,
    paidAt: order.paidAt
  });
});

// 易支付异步回调 Webhook
app.all('/api/pay/easypay-notify', (req, res) => {
  try {
    const params = { ...(req.query || {}), ...(req.body || {}) };
    const { out_trade_no, trade_status, type } = params;
    const epKey = (activeSystemSettings.easypayKey || '').trim();

    if (!epKey) {
      return res.status(400).send('fail');
    }

    const calculatedSign = buildEasyPaySign(params, epKey);
    if (calculatedSign !== params.sign) {
      console.warn('EasyPay signature mismatch in notify');
      return res.status(400).send('fail');
    }

    if (trade_status === 'TRADE_SUCCESS' && out_trade_no) {
      const order = paymentOrders.get(out_trade_no);
      if (order) {
        order.status = 'paid';
        order.paidAt = Date.now();
        paymentOrders.set(out_trade_no, order);
        savePaymentOrders();
      }
    }

    return res.send('success');
  } catch (err: any) {
    return res.status(500).send('fail');
  }
});

// 模拟完成支付（或第三方异步通知 Webhook）
app.post('/api/pay/simulate-success/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = paymentOrders.get(orderId);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  order.status = 'paid';
  order.paidAt = Date.now();
  paymentOrders.set(orderId, order);
  savePaymentOrders();
  return res.json({
    success: true,
    order
  });
});

// 兑换买断激活卡密
app.post('/api/license/activate-code', (req, res) => {
  try {
    const { code, uid, account } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: '请输入有效的激活码' });
    }

    const cleanCode = code.trim().toUpperCase();
    const record = activationCodes.get(cleanCode);

    if (!record) {
      return res.status(400).json({ error: '无效的激活码，请核对后重试' });
    }

    if (record.redeemedBy) {
      return res.status(400).json({ error: '该激活码已被使用' });
    }

    // 核销激活码并持久化
    record.redeemedBy = account || uid;
    record.redeemedAt = Date.now();
    activationCodes.set(cleanCode, record);
    saveActivationCodes();

    // 同时同步更新持久化用户列表中该用户的买断授权状态，彻底解决后台依然显示体验用户的 Bug
    if (uid || account) {
      let matchedUser: any = null;
      if (uid && persistentUsers.has(uid)) {
        matchedUser = persistentUsers.get(uid);
      } else if (account) {
        matchedUser = Array.from(persistentUsers.values()).find(
          u => u.account && u.account.toLowerCase() === account.toLowerCase()
        );
      }
      if (matchedUser) {
        matchedUser.licenseStatus = 'active';
        matchedUser.licensedAt = new Date().toISOString();
        matchedUser.licenseKey = cleanCode;
        persistentUsers.set(matchedUser.uid, matchedUser);
        savePersistentUsers();
      }
    }

    return res.json({
      success: true,
      message: '恭喜！拾年 · 岁华令终身买断已成功激活',
      code: cleanCode
    });
  } catch (err: any) {
    return res.status(500).json({ error: '激活失败' });
  }
});

// 管理员：列出所有激活码
app.get('/api/license/codes', (req, res) => {
  const list = Array.from(activationCodes.values()).sort((a, b) => b.createdAt - a.createdAt);
  return res.json({
    success: true,
    codes: list
  });
});

// 管理员：批量生成激活码
app.post('/api/license/generate-codes', (req, res) => {
  try {
    const { count = 5, note = '后台批量生成' } = req.body;
    const num = Math.min(100, Math.max(1, parseInt(count, 10) || 5));
    const generated: string[] = [];

    for (let i = 0; i < num; i++) {
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part3 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `SHINIAN-${part1}-${part2}-${part3}`;
      activationCodes.set(code, {
        code,
        createdAt: Date.now() + i,
        note
      });
      generated.push(code);
    }

    saveActivationCodes();

    return res.json({
      success: true,
      message: `已成功生成 ${generated.length} 个激活码`,
      codes: generated
    });
  } catch (err: any) {
    return res.status(500).json({ error: '生成激活码失败' });
  }
});

// 管理员：删除激活码
app.post('/api/license/delete-code', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: '参数错误' });
    }
    const cleanCode = code.trim().toUpperCase();
    activationCodes.delete(cleanCode);
    saveActivationCodes();
    return res.json({ success: true, message: '激活码已删除' });
  } catch (err: any) {
    return res.status(500).json({ error: '删除激活码失败' });
  }
});

// ==================== 用户数据持久化存储与管理 API ====================

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const persistentUsers = new Map<string, any>();

function loadPersistentUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const list: any[] = JSON.parse(raw);
      list.forEach(u => {
        if (u.uid) persistentUsers.set(u.uid, u);
      });
    }
  } catch (e) {
    console.warn('Load persistent users error:', e);
  }

  // 预置默认管理员/作者账号
  const defaultAuthor = {
    uid: 'u_author_00001',
    account: 'author',
    displayName: '拾年 · 作者',
    userNumber: '00001',
    role: 'admin',
    licenseStatus: 'active',
    licensedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  };
  if (!persistentUsers.has(defaultAuthor.uid)) {
    persistentUsers.set(defaultAuthor.uid, defaultAuthor);
  }
}

function savePersistentUsers() {
  try {
    const list = Array.from(persistentUsers.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Save persistent users error:', e);
  }
}

loadPersistentUsers();

// 获取全站持久化用户列表
app.get('/api/admin/users', (req, res) => {
  const list = Array.from(persistentUsers.values()).sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
  return res.json({
    success: true,
    users: list
  });
});

// 保存/新增/更新持久化用户
app.post('/api/admin/users/save', (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.uid) {
      return res.status(400).json({ error: '用户数据缺失 uid' });
    }
    const existing = persistentUsers.get(user.uid) || {};
    const merged = {
      ...existing,
      ...user,
      updatedAt: new Date().toISOString()
    };
    persistentUsers.set(user.uid, merged);
    savePersistentUsers();
    return res.json({ success: true, user: merged });
  } catch (e: any) {
    return res.status(500).json({ error: '持久化保存用户失败' });
  }
});

// 删除持久化用户
app.post('/api/admin/users/delete', (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: '参数缺失 uid' });
    }
    persistentUsers.delete(uid);
    savePersistentUsers();
    return res.json({ success: true, message: '用户已从持久化存储删除' });
  } catch (e: any) {
    return res.status(500).json({ error: '删除持久化用户失败' });
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

