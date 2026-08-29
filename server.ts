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

  // Match specific person
  const matchedPerson = people.find((person: any) => 
    person.name && (lower.includes(person.name.toLowerCase()) || p.includes(person.name))
  );

  if (matchedPerson) {
    const imps = (matchedPerson.impressions || [])
      .map((imp: any) => `【${imp.year || '时光切片'}】${imp.text}`)
      .join('\n');
    const customLoc = matchedPerson.customFields?.['认识地点'] || '';
    const customMem = matchedPerson.customFields?.['共同记忆'] || '';
    
    return `翻阅着关于 ${matchedPerson.name} 的泛黄档案，时光仿佛又轻轻荡漾开来。\n\n在你的记忆深处，她是你的「${matchedPerson.relationship || '挚友'}」${customLoc ? `，你们初识于${customLoc}` : ''}。${customMem ? `那些关于${customMem}的画面，依旧历历在目。` : ''}\n\n${imps ? `那些年你们共同镌刻的印记：\n${imps}\n\n` : ''}${matchedPerson.bio ? `正如档案里所写的：“${matchedPerson.bio}”。` : ''}无论时光如何流转，那些一起度过的青春与成长，都是岁月赠予你们最珍贵的礼物。`;
  }

  // General People query
  if (lower.includes('朋友') || lower.includes('同窗') || lower.includes('伙伴') || lower.includes('人') || lower.includes('知夏') || lower.includes('江川') || lower.includes('沈砚')) {
    const names = people.map((p: any) => `「${p.name}」(${p.relationship || '朋友'}${p.customFields?.['认识地点'] ? ` · 结识于${p.customFields['认识地点']}` : ''})`).join('、');
    return `在你的《拾年》拾人册中，静静安放着 ${people.length} 位重要同行者的温暖档案：\n${names || '江川、许知夏、沈砚'}。\n\n从高一教室窗边的半块橡皮、午间广播站递过来的蜂蜜柠檬水，到晚自习课桌下的解题草稿，每个人都在你的成长轨迹中留下了不可磨灭的温柔温度。时间在走，但彼此真诚相待的印记永远都在。`;
  }

  // Summer / Seasonal query
  if (lower.includes('夏') || lower.includes('夏天') || lower.includes('当年') || lower.includes('往事') || lower.includes('旧事')) {
    const summerEvents = timeline.filter((t: any) => (t.date || '').includes('-06-') || (t.date || '').includes('-07-') || (t.date || '').includes('-08-') || (t.content || '').includes('夏') || (t.title || '').includes('夏'));
    const eventHighlight = summerEvents.length > 0 ? summerEvents.map((e: any) => `• ${e.date || ''} 《${e.title}》：${e.content || ''}`).join('\n') : '';
    
    return `翻开那年夏天的日记，满纸都是香樟树叶缝隙漏下的金黄光影与滚烫蝉鸣。\n\n${eventHighlight ? `记忆档案里关于夏天的瞬间：\n${eventHighlight}\n\n` : ''}晚风吹过操场看台，操场水花溅起校服衣角，那是无忧无虑且充满热望的年纪。哪怕多年之后回望，那阵夏日晚风依然能吹醒心底最纯粹的感动。`;
  }

  // Rain / Rainy day query
  if (lower.includes('雨') || lower.includes('雨天') || lower.includes('晚自习') || lower.includes('安静')) {
    const rainyStories = stories.filter((s: any) => (s.content || '').includes('雨') || (s.title || '').includes('雨') || (s.tags || []).includes('雨'));
    const storySnippet = rainyStories.length > 0 ? rainyStories.map((s: any) => `《${s.title}》：“${s.content?.slice(0, 100)}...”`).join('\n') : '';
    
    return `下雨的日子，总是最适合写下心事的时刻。\n\n窗外雨声淅淅沥沥，空气里弥漫着湿润的泥土与青草气息。${storySnippet ? `你在雨天写下的篇章：\n${storySnippet}\n\n` : ''}两个人撑一把透明伞一路踩着操场水花冲向小卖部，或是晚自习窗前静听雨打芭蕉。那些因雨水而变得缓慢的时光，早已化作你心底最静谧安详的港湾。`;
  }

  // Artifacts / Relics query
  if (lower.includes('旧物') || lower.includes('物') || lower.includes('相机') || lower.includes('票根') || lower.includes('藏品') || lower.includes('信物')) {
    const arts = artifacts.map((a: any) => `• 《${a.name}》(${a.category || '纪念物'}): ${a.story || ''}`).join('\n');
    return `在你的「拾物阁」里，每一件旧物都如同一座微型的光阴标本：\n\n${arts || '旧胶片相机、磨损的钢笔、毕业旅行票根'}\n\n这些物品或许随着岁月褪去了初时的崭新，但它们所记录的每一次指尖触碰、每一个具体日子里的欢笑与心动，都在时光的长河里愈发温润明亮。`;
  }

  // Growth / Summary query
  if (lower.includes('成长') || lower.includes('蜕变') || lower.includes('轨迹') || lower.includes('总结') || lower.includes('印记') || lower.includes('几年')) {
    const topEvents = timeline.slice(0, 4).map((t: any) => `《${t.title}》(${t.date})`).join('、');
    return `纵观你这些年沉淀在《拾年》里的心路历程，那是一条由无数平凡微光汇聚成的璀璨长河：\n\n从最初在 ${topEvents || '各个重要时光节点'} 中的青涩摸索，到如今能从容面对生活的每一次起伏。你在 ${timeline.length} 处人生节点中奔赴、在 ${people.length} 位挚友的陪伴中被治愈，在 ${stories.length} 篇随笔中向内探索。\n\n最珍贵的成长，不是变成了无坚不摧的模样，而是历经岁月后，依然保有一颗敏锐、温柔且热忱的心。`;
  }

  // Default warm literary response
  return `岁华悠悠，若有所思。\n\n在你的《拾年》私人档案中，已悉心封存着 ${timeline.length} 个时光瞬间、${people.length} 位重要同路人、${stories.length} 篇故事随笔与 ${artifacts.length} 件旧物藏品。\n\n时光不语，却在每一笔记录中留下了最长情的注脚。想听听哪一位老朋友的故事，或是翻翻某一年的夏天？只要你轻轻唤起，我随时在这里陪你重温。`;
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
  const modelsToTry = ['gemini-3.7-flash', 'gemini-flash-latest'];
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

