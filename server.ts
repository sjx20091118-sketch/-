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

// Literary polisher fallback
function synthesizeTextPolish(rawText: string): string {
  const clean = (rawText || '').trim();
  if (!clean) return '岁月沉香，往昔如歌。那一抹温存的光影，在静默中悄然定格。';
  return `那是一段浸润在暖阳里的珍贵时光：${clean}。清风拂过枝头，掠起旧日泛黄的衣角与细碎的欢笑，时光不曾走远，只是将那些真切的温度，悄然镌刻成了心底永恒的诗行。`;
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

// 2. AI Polish Text (Story/Timeline Polishing)
app.post('/api/ai/polish', async (req, res) => {
  const { text, engine = 'gemini', customApiKey = '' } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: '缺少待润色的文本内容' });
  }

  const systemPrompt =
    '你是一位文采斐然且情感细腻的记忆故事润色师。将用户的简短随笔或草稿润色成富有画面感、温情细腻的记忆文字（约120-180字），保留原意，增强文学美感。只输出润色后的正文，不要带有任何额外的解释或标记。';

  if (engine === 'deepseek' || (customApiKey && customApiKey.startsWith('sk-'))) {
    try {
      const reply = await callDeepSeekAPI({
        apiKey: customApiKey,
        messages: [{ role: 'user', content: `请润色这段记忆随笔：\n${text}` }],
        systemPrompt,
      });
      return res.json({ polished: reply.trim(), engineUsed: 'DeepSeek' });
    } catch (e) {
      return res.json({ polished: synthesizeTextPolish(text), engineUsed: '文墨润色' });
    }
  }

  try {
    const ai = getGeminiClient(customApiKey);
    const result = await generateGeminiContentWithFallback(ai, `请润色这段记忆随笔：\n${text}`, systemPrompt);
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
                  return res.json({ id: fallbackRid, url: fbData.url });
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

