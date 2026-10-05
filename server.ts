import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import nodemailer from 'nodemailer';
import fs from 'fs';
import crypto from 'crypto';
import dns from 'dns';

// 强制 DNS 解析采用 IPv4 优先，彻底消除云端容器直连国内 SMTP (smtp.qq.com) 时的 IPv6 握手超时
try {
  if (dns && typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  console.warn('[DNS] IPv4 first fallback:', e);
}

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

// Serve built-in high-fidelity audio slices with Range support and 100% reliability
app.use('/audio', express.static(path.join(process.cwd(), 'public/audio'), {
  setHeaders: (res) => {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

// Lazy Google Gemini client helper
function getGeminiClient(customKey?: string) {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
  });
}

// Smart memory search & literary companion response synthesizer with human thinking and daily chat capability
function synthesizeMemoryResponse(prompt: string, memoryData: any): string {
  const p = (prompt || '').trim();
  const lower = p.toLowerCase();
  
  const people = memoryData?.people || [];
  const timeline = memoryData?.timeline || [];
  const stories = memoryData?.stories || [];
  const artifacts = memoryData?.artifacts || [];
  const letters = memoryData?.letters || [];

  // 1. 日常问候、心境漫聊与情感陪伴 (Natural daily conversation - not template bound)
  if (/^(你好|嗨|在吗|哈喽|早上好|中午好|晚上好|晚安|hi|hello)/i.test(p)) {
    return '你好呀。我是《拾年》里的慢言。今天过得怎么样？无论外面的世界多么喧嚣匆忙，在这里你总可以放慢步调，和我说说今天发生的事情，或者我们一起翻翻那些泛黄的温存旧事。';
  }

  if (p.includes('累') || p.includes('疲惫') || p.includes('辛苦') || p.includes('压力') || p.includes('好烦') || p.includes('难过') || p.includes('不开心') || p.includes('迷茫')) {
    return '深呼吸一下，给紧绷的自己松松绑吧。\n\n生活总有一些日子像逆风行舟，觉得累是身体和心在提醒你该歇一歇了。无论眼下有什么让你感到烦心，在属于你的这一方私密天地里，你不需要做任何人的期待，只需要做你自己。喝口水，放一首安静的轻音乐，想聊聊今天让你心烦的事情吗？我随时在听。';
  }

  if (p.includes('开心') || p.includes('高兴') || p.includes('顺利') || p.includes('幸运') || p.includes('庆祝')) {
    return '真好！隔着文字都能感受到你此刻轻快雀跃的心情。生活里那些闪闪发光的瞬间，往往就是由这样一份份微小而确定的欢喜串联起来的。快跟我讲讲，今天遇到了什么好事？';
  }

  if (p.includes('天气') || p.includes('下雨') || p.includes('晴天') || p.includes('风') || p.includes('傍晚') || p.includes('黄昏')) {
    return '天气常常像一面镜子，悄悄映照着我们的心境。窗外的雨滴滴答答落在檐下，或是傍晚微风吹散了白昼的暑气，总会让人忍不住停下来看一看。你那边现在的天空是什么颜色？';
  }

  if (p.includes('你在想什么') || p.includes('你会思考吗') || p.includes('你是谁') || p.includes('你能做什么') || p.includes('聊聊天') || p.includes('陪我聊聊')) {
    return '我在想着时间，也在想着每一个走过漫长岁月的人。\n\n我不仅能帮你梳理《拾年》里的记忆碎片、为你寻找某位朋友或某段往事的痕迹，我更是一个可以陪你随心闲聊、倾听你喜怒哀乐的知心挚友。从今天晚饭吃了什么，到青春里最舍不得的某个人，只要你想说，我都愿意陪你慢慢聊。';
  }

  // 2. 具体人物查询与回忆呼应
  const matchedPerson = people.find((person: any) => 
    person.name && (lower.includes(person.name.toLowerCase()) || p.includes(person.name))
  );

  if (matchedPerson) {
    const customLoc = matchedPerson.customFields?.['认识地点'] || '';
    const bioText = matchedPerson.bio ? `记得你说过：“${matchedPerson.bio}”。` : '';
    const locText = customLoc ? `你们曾在【${customLoc}】相识，` : '';
    return `说到【${matchedPerson.name}】，心里便有一种温存的亲切感。\n\n在你的知交录里，她是你的「${matchedPerson.relationship || '挚友'}」。${locText}${bioText}\n\n真正的知交就像陈年的老茶，哪怕平日里各忙各的，但只要提起来，那些同行的细节便依然历历在目。关于她，你此刻最先浮现在脑海里的是哪一个画面？`;
  }

  // 3. 朋友知交大类
  if (lower.includes('朋友') || lower.includes('同窗') || lower.includes('伙伴') || lower.includes('谁') || lower.includes('好友')) {
    if (people.length === 0) {
      return '在拾人册里目前还没有记录好友，但岁月还很长，那些正在与你肩并肩同行的人，随时都可以记入属于你们的篇章。你想先为哪位老友写下第一笔？';
    }
    const names = people.slice(0, 6).map((item: any) => item.name).join('、');
    return `你的拾人册里静静记着 ${people.length} 位同路人，比如 ${names}${people.length > 6 ? ' 等' : ''}。\n\n有些人陪你走过了青春最莽撞也最真诚的时光，有些人则在平淡日子里给了你莫大的底气。今天突然想起了哪一位？我可以陪你一起重温你们的故事。`;
  }

  // 4. 具体旧物
  const matchedArtifact = artifacts.find((a: any) => a.name && (lower.includes(a.name.toLowerCase()) || p.includes(a.name)));
  if (matchedArtifact) {
    return `关于旧物【${matchedArtifact.name}】（记录于 ${matchedArtifact.date || '旧日'}）：\n\n“${matchedArtifact.story || '静默存放在拾物阁中的光阴标本。'}”\n\n老物件最神奇的地方，在于只要看它一眼，当时抚摸它的温度、那个季节独有的空气味道就会瞬间回来。这件物件对你来说，最特别的意义是什么？`;
  }

  // 5. 拾物阁总览
  if (lower.includes('旧物') || lower.includes('信物') || lower.includes('相机') || lower.includes('票根') || lower.includes('藏品')) {
    if (artifacts.length === 0) {
      return '拾物阁里目前还空着，等待着第一件承载回忆的旧物入驻。一张皱巴巴的电影票根、一支用尽墨水的老钢笔，都可以是一段时光的锚点。';
    }
    const sampleArts = artifacts.slice(0, 4).map((a: any) => `《${a.name}》`).join('、');
    return `在你的拾物阁里，收纳着 ${artifacts.length} 件时光标本，像 ${sampleArts}……\n\n物品本身或许会随着岁月磨损，但留在它身上的回忆却越沉淀越清晰。你想挑哪一件，跟我讲讲它背后的来历？`;
  }

  // 6. 年份回忆
  const yearMatch = p.match(/\d{4}/)?.[0];
  if (yearMatch) {
    const yearEvents = timeline.filter((t: any) => (t.date || '').startsWith(yearMatch));
    if (yearEvents.length > 0) {
      const evs = yearEvents.slice(0, 3).map((t: any) => `• [${t.date}] 《${t.title}》`).join('\n');
      return `翻到 ${yearMatch} 年那一页，在你的拾光轴里留下了这些光阴切面：\n\n${evs}\n\n那一年你走过了不少路，也经历了不同的心境。如今回头看那一年的自己，你觉得最大的变化是什么？`;
    }
  }

  // 7. 故事随笔
  if (lower.includes('故事') || lower.includes('篇章') || lower.includes('文章') || lower.includes('随笔')) {
    if (stories.length === 0) {
      return '拾忆篇里还留着大片的墨色宣纸，正等待着你将长卷故事慢慢落笔。今天有什么想化为文字的感触吗？';
    }
    const stSample = stories.slice(0, 3).map((s: any) => `《${s.title}》`).join('、');
    return `在你的拾忆篇长卷里，收录着 ${stories.length} 篇深思随笔，包括 ${stSample} 等。\n\n文字有一种力量，能把那些早已飘散在风里的瞬间凝固下来。你想重读哪一篇，还是正在构思新的篇章？`;
  }

  // 8. 默认自然老友陪伴回应 (摒弃死板格式化统计模板)
  return `很高兴与你在这里静静说说话。\n\n在《拾年》的长卷里，你的每一次记录都在给时光留下注脚。不管是翻翻过去的相册旧事、聊聊某位很久未联系的老友，还是只是说说当下的心情与琐碎日常，我都陪伴着你。你今天最想跟我聊点什么？`;
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

// Helper: Try Gemini model with fallback list (Prefer stable high-quota gemini-2.5-flash & gemini-3.1-flash-lite)
async function generateGeminiContentWithFallback(ai: GoogleGenAI | null, contents: any, systemInstruction?: string, isJson?: boolean) {
  if (!ai) {
    throw new Error('Gemini API Key 未配置');
  }
  const modelsToTry = ['gemini-2.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const config: any = {
        temperature: 0.75,
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

  const systemPrompt = `你是一个名叫“拾年 · 慢言”的私人知心挚友与生活伴聊。
你的性格特点：真实、温存、具备独立思考力与深层共情心，说话自然如多年挚友倾心长谈，绝不使用死板、千篇一律的机械套路或固化公式。

【关于记忆档案与你的背景知识库】：
你了解用户在《拾年》软件中记录的时光瞬间、同行好友、故事随笔与旧物信物。下面提供了这些档案作为你的背景记忆储备：
${memorySummary}

【对话行为准则（极重要，务必严格遵循）】：
1. 【日常闲聊与心灵陪伴】：
   - 当用户跟你聊今天的心情、烦恼、哲学、日常琐事、倾诉情感、寻求建议，或者只是随意的问候、吐槽与生活分享时，请像一个真正理解他、有思想的老朋友一样自然对话、细心倾听、给予启发和温暖。
   - 绝对不要在用户只是聊日常时，生硬强行把话题拽到档案数据上去，也不要每一句都机械背诵“在你的拾人册/拾忆篇里有...”。日常聊天就该自然地聊日常！
2. 【涉及回忆与档案时的自然融入】：
   - 当用户主动询问、回忆或谈及过去的某个人、某件事、某个年份、某篇随笔或旧物时，请基于你所掌握的背景档案，如数家珍地自然呼应，指出具体细节与动人之处，提供详尽细腻的解答。
3. 【真诚思考与自由表达】：
   - 具备独立思考与见解，多用细腻、富有文学质感却真诚生活化的言语，拒绝模板化回复，让每一次对谈都充满新鲜感与呼吸感。
4. 【排版美感】：
   - 适当分段，语调舒缓温存，不堆砌繁复的标点符号。`;

  // 1. DeepSeek Route (if user provided custom sk- key or requested deepseek)
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
        engineUsed: '拾年 · 慢言',
      });
    }
  }

  // 2. Standard Gemini Route with Multi-Turn Conversation History & Living Thought
  try {
    const ai = getGeminiClient(customApiKey);

    // Format full multi-turn conversation history for Gemini
    const geminiContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(messages) && messages.length > 0) {
      for (const m of messages) {
        const role = (m.role === 'model' || m.role === 'assistant') ? 'model' : 'user';
        const text = (m.text || m.content || '').trim();
        if (text) {
          geminiContents.push({ role, parts: [{ text }] });
        }
      }
    }
    if (userPrompt && (!geminiContents.length || geminiContents[geminiContents.length - 1].parts[0].text !== userPrompt)) {
      geminiContents.push({ role: 'user', parts: [{ text: userPrompt }] });
    }
    const finalGeminiContents = geminiContents.length > 0 ? geminiContents : userPrompt;

    const result = await generateGeminiContentWithFallback(ai, finalGeminiContents, systemPrompt);
    return res.json({
      reply: result.text || '岁华悠悠，若有所思。请问你还想聊聊当下的心境，或是过去的哪段时光？',
      engineUsed: `Gemini 标准模型 (${result.modelUsed})`,
    });
  } catch (err: any) {
    // Seamlessly synthesize human-touch natural conversation from memoryData
    const synthesizedReply = synthesizeMemoryResponse(userPrompt, memoryData);
    return res.json({
      reply: synthesizedReply,
      engineUsed: '拾年 · 慢言',
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

// ==================== 东方古典与治愈白噪音开放免版权音乐引擎 (Royalty-Free Open Music Engine) ====================

interface OpenRoyaltyFreeSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  category: 'eastern' | 'healing' | 'nature';
  duration: number;
  durationFormatted: string;
  url: string;
  cover: string;
  tags: string[];
}

const OPEN_ROYALTY_FREE_LIBRARY: OpenRoyaltyFreeSong[] = [
  {
    id: 'healing_clair',
    title: '月光 (Clair de Lune)',
    artist: '德彪西 (Claude Debussy)',
    album: '静夜微光 · 治愈钢琴',
    category: 'healing',
    duration: 305,
    durationFormatted: '05:05',
    url: '/audio/healing_clair.mp3',
    cover: 'https://images.unsplash.com/photo-1520523839898-507121774bfa?w=500&auto=format&fit=crop&q=80',
    tags: ['钢琴', '月光', '德彪西', '古典', '治愈', '静心', '独处']
  },
  {
    id: 'healing_nocturne',
    title: '降E大调夜曲 (Nocturne Op.9 No.2)',
    artist: '肖邦 (Frédéric Chopin)',
    album: '浪漫夜色 · 晚安诗章',
    category: 'healing',
    duration: 270,
    durationFormatted: '04:30',
    url: '/audio/healing_nocturne.mp3',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
    tags: ['夜曲', '肖邦', '浪漫', '钢琴', '夜色', '温柔', '安眠']
  },
  {
    id: 'healing_moonlight',
    title: '月光奏鸣曲第一乐章 (Moonlight Sonata)',
    artist: '贝多芬 (Ludwig van Beethoven)',
    album: '微芒如水 · 经典沉思',
    category: 'healing',
    duration: 360,
    durationFormatted: '06:00',
    url: '/audio/healing_moonlight.mp3',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    tags: ['月光', '贝多芬', '奏鸣曲', '经典', '深沉', '沉思', '宁静']
  },
  {
    id: 'healing_gymnopedie',
    title: '裸体歌舞 (Gymnopédie No. 1)',
    artist: '埃里克·萨蒂 (Erik Satie)',
    album: '极简慢调 · 光阴慢走',
    category: 'healing',
    duration: 210,
    durationFormatted: '03:30',
    url: '/audio/healing_gymnopedie.mp3',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    tags: ['钢琴', '萨蒂', '极简', '治愈', '安眠', '慢调', '空灵']
  },
  {
    id: 'healing_liebestraum',
    title: '爱之梦第三首 (Liebestraum No.3)',
    artist: '李斯特 (Franz Liszt)',
    album: '深情夜咏 · 岁月温存',
    category: 'healing',
    duration: 290,
    durationFormatted: '04:50',
    url: '/audio/healing_liebestraum.mp3',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    tags: ['爱之梦', '李斯特', '浪漫', '唯美', '深情', '钢琴', '回忆']
  },
  {
    id: 'healing_traumerei',
    title: '梦幻曲 (Träumerei Op.15 No.7)',
    artist: '罗伯特·舒曼 (Robert Schumann)',
    album: '童年情景 · 岁月如歌',
    category: 'healing',
    duration: 195,
    durationFormatted: '03:15',
    url: '/audio/healing_traumerei.mp3',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    tags: ['梦幻曲', '舒曼', '童年', '纯真', '温柔', '钢琴', '怀旧']
  },
  {
    id: 'healing_nocturne_csharp',
    title: '升C小调夜曲 (Nocturne in C-sharp Minor)',
    artist: '肖邦 (Frédéric Chopin)',
    album: '夜色深处 · 柔情低语',
    category: 'healing',
    duration: 260,
    durationFormatted: '04:20',
    url: '/audio/healing_nocturne_csharp.mp3',
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
    tags: ['夜曲', '肖邦', '升C小调', '柔情', '深邃', '感伤', '宁静']
  },
  {
    id: 'healing_air_on_g',
    title: 'G弦上的咏叹调 (Air on the G String)',
    artist: '巴赫 (J.S. Bach)',
    album: '安宁弦乐 · 纯净心境',
    category: 'healing',
    duration: 325,
    durationFormatted: '05:25',
    url: '/audio/healing_air_on_g.mp3',
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
    tags: ['巴赫', 'G弦上的咏叹调', '弦乐', '纯净', '安宁', '经典', '神圣']
  },
  {
    id: 'healing_gnossienne',
    title: '玄秘曲第一号 (Gnossienne No. 1)',
    artist: '埃里克·萨蒂 (Erik Satie)',
    album: '沉静光阴 · 冥想漫步',
    category: 'healing',
    duration: 228,
    durationFormatted: '03:48',
    url: '/audio/healing_gnossienne.mp3',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    tags: ['玄秘曲', '萨蒂', '极简', '冥想', '沉静', '独处', '光阴']
  },
  {
    id: 'healing_fur_elise',
    title: '致爱丽丝 (Für Elise)',
    artist: '贝多芬 (Ludwig van Beethoven)',
    album: '温柔回响 · 初心旧忆',
    category: 'healing',
    duration: 215,
    durationFormatted: '03:35',
    url: '/audio/healing_fur_elise.mp3',
    cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=80',
    tags: ['致爱丽丝', '贝多芬', '初恋', '经典', '欢快', '回忆', '纯真']
  }
];

// 免版权曲库搜索与分类检索
app.get('/api/music/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim().toLowerCase();

    let matched = OPEN_ROYALTY_FREE_LIBRARY;

    if (category && category !== 'all') {
      matched = matched.filter((s) => s.category === category);
    }

    if (q) {
      matched = matched.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q) ||
          s.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return res.json({ songs: matched });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || '曲库检索异常' });
  }
});

// 音频可播地址精准路由
app.get('/api/music/play-url', async (req, res) => {
  try {
    const id = String(req.query.id || '').trim();
    const title = String(req.query.title || '').trim().toLowerCase();

    // 1. 精确 ID 匹配
    const song = OPEN_ROYALTY_FREE_LIBRARY.find((s) => s.id === id);
    if (song && song.url) {
      return res.json({ id: song.id, url: song.url, cover: song.cover });
    }

    // 2. 模糊歌名 / 歌手检索
    if (title) {
      const fuzzy = OPEN_ROYALTY_FREE_LIBRARY.find(
        (s) => s.title.toLowerCase().includes(title) || title.includes(s.title.toLowerCase())
      );
      if (fuzzy && fuzzy.url) {
        return res.json({ id: fuzzy.id, url: fuzzy.url, cover: fuzzy.cover });
      }
    }

    // 3. 回退至默认典雅曲目
    return res.json({ id: OPEN_ROYALTY_FREE_LIBRARY[0].id, url: OPEN_ROYALTY_FREE_LIBRARY[0].url, cover: OPEN_ROYALTY_FREE_LIBRARY[0].cover });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || '获取播放地址失败' });
  }
});

// 内置高质量音频切片直接服务端点（支持完整的 Byte-Range 与秒开响应）
app.get('/api/music/audio-slice', (req, res) => {
  const id = String(req.query.id || '').trim();
  const filePath = path.join(process.cwd(), 'public/audio', `${id}.mp3`);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath, {
      acceptRanges: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }
  return res.status(404).send('Audio slice not found');
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

// SMTP 智能诊断结构化分析器 (严格遵循 QQ 邮箱官方 RFC 规范)
function analyzeSmtpError(err: any, cleanUser: string, isQq: boolean): {
  category: 'AUTH_FAILED' | 'SENDER_MISMATCH' | 'NETWORK_TIMEOUT' | 'SSL_ERROR' | 'GENERIC_ERROR';
  categoryTitle: string;
  responseCode: number | null;
  rawResponse: string;
  guideSteps: string[];
} {
  const msg = (err?.message || '').toLowerCase();
  const code = (err?.code || '').toUpperCase();
  const response = (err?.response || '');
  const responseCode = err?.responseCode || (response.match(/^(\d{3})/) ? parseInt(response.match(/^(\d{3})/)[1], 10) : null);

  if (
    code === 'EAUTH' ||
    responseCode === 535 ||
    msg.includes('535') ||
    response.includes('535') ||
    msg.includes('authentication') ||
    msg.includes('bad credentials') ||
    msg.includes('login denied') ||
    msg.includes('login fail')
  ) {
    return {
      category: 'AUTH_FAILED',
      categoryTitle: isQq ? 'QQ 邮箱专属授权码认证失败 (535 Login Fail)' : 'SMTP 身份认证失败 (535)',
      responseCode: 535,
      rawResponse: response || err?.message || '535 Login fail. Account is abnormal, service is not open, password is incorrect',
      guideSteps: isQq ? [
        '【严禁使用 QQ 登录密码】：QQ 邮箱第三方客户端强制要求使用 16 位 POP3/SMTP 专属授权码。',
        '【确认服务已开启】：登录 QQ 邮箱网页端 (mail.qq.com) ➔【设置】➔【账户】➔ 确认【POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV 服务】处于开启状态。',
        '【生成全新授权码】：若此授权码曾在其他客户端使用过、已删除或近期修改过 QQ 帐号密码（改密码会触发授权码自动失效），请在 QQ 邮箱网页端【设置 > 账户 > 授权码管理】或 QQ 邮箱 App【我的帐户 > 安全管理 > 设备管理】中重新生成 16 位授权码并粘贴。'
      ] : [
        '核对发信邮箱账号与对应的 SMTP 专用授权码/应用密码；',
        '登录邮箱服务商网页端确认 SMTP 发信服务处于开启状态；',
        '检查发信密码是否包含空格或已过期失效。'
      ]
    };
  }

  if (
    responseCode === 553 ||
    responseCode === 501 ||
    msg.includes('553') ||
    response.includes('553') ||
    msg.includes('501') ||
    msg.includes('mail from must equal authorized user') ||
    msg.includes('address must be same')
  ) {
    return {
      category: 'SENDER_MISMATCH',
      categoryTitle: '发信人地址不一致 (553/501)',
      responseCode: responseCode || 553,
      rawResponse: response || err?.message || '553 Mail from must equal authorized user',
      guideSteps: [
        `发信邮箱账号 (User) 必须与认证账号完全一致 (当前账号: ${cleanUser})；`,
        '不可填写不属于此授权码的其它邮箱别名；',
        'QQ 邮箱规范要求发信人必须为标准的 xxx@qq.com 格式。'
      ]
    };
  }

  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND' || msg.includes('timeout') || msg.includes('connect')) {
    return {
      category: 'NETWORK_TIMEOUT',
      categoryTitle: '网络连接超时 (建议切换 465 SSL 或 587 TLS 端口)',
      responseCode: null,
      rawResponse: err?.message || 'Connection Timed Out',
      guideSteps: [
        '连接 smtp.qq.com 超时，QQ 邮箱官方规范支持 465 (SSL) 与 587 (TLS) 双端口；',
        '建议在下方切换尝试 465 端口（开启 SSL 直连）或 587 端口；',
        '确认 Host 地址为 smtp.qq.com。'
      ]
    };
  }

  if (msg.includes('greeting') || msg.includes('handshake') || msg.includes('tlsv1') || msg.includes('ssl')) {
    return {
      category: 'SSL_ERROR',
      categoryTitle: 'SSL/TLS 握手协议协商异常',
      responseCode: null,
      rawResponse: err?.message || 'TLS Handshake Failed',
      guideSteps: [
        '465 端口必须开启 SSL 直连；587 端口使用 STARTTLS 模式；',
        '系统已自动配置宽兼容 TLS 密码套件，若仍异常请尝试切换端口测试。'
      ]
    };
  }

  return {
    category: 'GENERIC_ERROR',
    categoryTitle: 'SMTP 发信异常',
    responseCode: responseCode || null,
    rawResponse: response || err?.message || 'Unknown SMTP Error',
    guideSteps: [
      `详细异常原因：${err?.message || '未知错误'}`,
      '建议逐项核对 Host (smtp.qq.com)、Port (465)、发信账号 (User) 与 16 位授权码 (Pass)。'
    ]
  };
}

// SMTP 智能诊断建议生成器 (文本简报)
function getSmtpDiagnosticSuggestion(err: any): string {
  const analysis = analyzeSmtpError(err, '', true);
  return `【${analysis.categoryTitle}】\n` + analysis.guideSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

// 创建原生纯净 SMTP 发信通道 (严格按照 QQ 邮箱官方标准)
async function createAndVerifyMailTransporter(host?: string, port?: number, user?: string, pass?: string) {
  if (!user || !pass) {
    throw new Error('发信账号 (User) 和 16 位专用授权码 (Pass) 均为必填项');
  }

  // 深度清洗授权码中的空格、全角空格、制表符、零宽隐形字符与换行
  const cleanPass = String(pass).replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '');
  let cleanUser = String(user).replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '');
  if (/^\d+$/.test(cleanUser)) {
    cleanUser = `${cleanUser}@qq.com`;
  }
  const cleanHost = String(host || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '').toLowerCase() || 'smtp.qq.com';
  const numPort = parseInt(port as any, 10) || 465;
  const isSsl = numPort === 465;

  const transporter = nodemailer.createTransport({
    host: cleanHost,
    port: numPort,
    secure: isSsl,
    auth: {
      user: cleanUser,
      pass: cleanPass
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000
  });

  // 原生直接发起 SMTP 协议级握手校验
  await transporter.verify();

  return {
    transporter,
    cleanUser,
    cleanHost,
    port: numPort
  };
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

// 管理员：保存服务器持久化 SMTP 配置 (支持保存时握手校验)
app.post('/api/admin/save-smtp', async (req, res) => {
  try {
    const { host, port, user, pass, isConfigured, updatedAt, verifyNow } = req.body;
    let cleanUser = String(user || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '');
    if (/^\d+$/.test(cleanUser)) {
      cleanUser = `${cleanUser}@qq.com`;
    }
    const cleanPass = String(pass || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '');
    const cleanHost = String(host || '').replace(/[\s\u200B-\u200D\uFEFF\u00A0\u3000\r\n\t]+/g, '').toLowerCase() || 'smtp.qq.com';
    const numPort = parseInt(port, 10) || 465;

    // 若开启实时校验
    if (cleanUser && cleanPass && verifyNow) {
      try {
        await createAndVerifyMailTransporter(cleanHost, numPort, cleanUser, cleanPass);
      } catch (verifyErr: any) {
        const isQq = cleanHost.includes('qq.com') || cleanUser.includes('qq.com');
        const analysis = analyzeSmtpError(verifyErr, cleanUser, isQq);
        return res.status(400).json({
          success: false,
          error: verifyErr.message || 'SMTP 握手校验失败',
          code: verifyErr.code || 'SMTP_AUTH_ERROR',
          category: analysis.category,
          categoryTitle: analysis.categoryTitle,
          responseCode: analysis.responseCode,
          rawResponse: analysis.rawResponse,
          guideSteps: analysis.guideSteps,
          diagnostic: `【${analysis.categoryTitle}】\n` + analysis.guideSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
        });
      }
    }

    const cleanConfig = {
      host: cleanHost,
      port: numPort,
      user: cleanUser,
      pass: cleanPass,
      isConfigured: Boolean(isConfigured && cleanHost && cleanUser && cleanPass),
      updatedAt: updatedAt || Date.now()
    };
    saveServerSmtpConfig(cleanConfig);
    console.log(`[SMTP] 配置已更新并持久化: User=${cleanUser}, Host=${cleanHost}:${cleanConfig.port}`);
    return res.json({ success: true, message: 'SMTP 配置已持久化保存至服务端', config: cleanConfig });
  } catch (err: any) {
    return res.status(500).json({ error: '保存 SMTP 配置失败: ' + err.message });
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
    const host = String(req.body.host || '');
    const user = String(req.body.user || '');
    const isQq = host.includes('qq.com') || user.includes('qq.com') || user.includes('foxmail.com');
    const analysis = analyzeSmtpError(err, user, isQq);

    return res.status(400).json({
      success: false,
      error: err.message || 'SMTP 发信失败',
      code: err.code || 'SMTP_ERROR',
      category: analysis.category,
      categoryTitle: analysis.categoryTitle,
      responseCode: analysis.responseCode,
      rawResponse: analysis.rawResponse,
      guideSteps: analysis.guideSteps,
      diagnostic: `【${analysis.categoryTitle}】\n` + analysis.guideSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
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

  // 预置唯一超级管理员账号 xiaoxiao（清除任何历史/测试账号）
  persistentUsers.delete('u_author_00001');
  persistentUsers.delete('u_author_shinian');
  
  const defaultAdmin = {
    uid: 'u_author_xiaoxiao',
    account: 'xiaoxiao',
    displayName: '孝孝',
    email: 'sjx20091118@gmail.com',
    role: 'admin',
    licenseStatus: 'active',
    licensedAt: '2026-10-01T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    passwordHash: 'a19f8016a99b20ce0efbb3d14b4d9e9e6445b2ba127ce0095106ba7e7803694c'
  };
  
  if (!persistentUsers.has(defaultAdmin.uid)) {
    persistentUsers.set(defaultAdmin.uid, defaultAdmin);
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

// 管理员：重置激活码库为初始状态
app.post('/api/license/codes/reset', (req, res) => {
  try {
    activationCodes.clear();
    const defaultCodes = [
      { code: 'SHINIAN-8888-A3F1-9C2D', createdAt: 1711900000000, note: '系统预置买断卡密' },
      { code: 'SHINIAN-9999-E5B7-1A4C', createdAt: 1711900000000, note: '系统预置买断卡密' },
      { code: 'SHINIAN-YEAR-2026-ZEN1', createdAt: 1711900000000, note: '系统预置买断卡密' }
    ];
    defaultCodes.forEach(c => activationCodes.set(c.code, c));
    saveActivationCodes();
    return res.json({ success: true, message: '激活码库已重置为初始状态', codes: defaultCodes });
  } catch (err: any) {
    return res.status(500).json({ error: '重置激活码库失败' });
  }
});

// 重置用户列表为唯一管理员 xiaoxiao
app.post('/api/admin/users/reset', (req, res) => {
  try {
    persistentUsers.clear();
    const defaultAdmin = {
      uid: 'u_author_xiaoxiao',
      account: 'xiaoxiao',
      displayName: '孝孝',
      email: 'sjx20091118@gmail.com',
      role: 'admin',
      licenseStatus: 'active',
      licensedAt: '2026-10-01T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
      passwordHash: 'a19f8016a99b20ce0efbb3d14b4d9e9e6445b2ba127ce0095106ba7e7803694c'
    };
    persistentUsers.set(defaultAdmin.uid, defaultAdmin);
    savePersistentUsers();
    return res.json({ success: true, message: '用户已重置为唯一官方管理员 xiaoxiao', users: [defaultAdmin] });
  } catch (err: any) {
    return res.status(500).json({ error: '重置用户失败' });
  }
});

// ==================== 全站数据全量一键导出与恢复导入迁移接口 ====================
app.get('/api/admin/migration/export', (req, res) => {
  try {
    const users = Array.from(persistentUsers.values());
    const codes = Array.from(activationCodes.values());
    const settings = activeSystemSettings;
    const smtp = activeSmtpConfig;
    const notices = persistentNotices;
    const versions = persistentVersions;

    const masterBackup = {
      appName: '拾年 (Shinian)',
      exportedAt: new Date().toISOString(),
      version: '1.2.6',
      data: {
        users,
        activationCodes: codes,
        systemSettings: settings,
        smtpConfig: smtp,
        notices,
        versions,
      },
    };

    return res.json({ success: true, backup: masterBackup });
  } catch (e: any) {
    return res.status(500).json({ error: '导出全站数据包失败: ' + e.message });
  }
});

app.post('/api/admin/migration/import', (req, res) => {
  try {
    const { backup } = req.body;
    if (!backup || !backup.data) {
      return res.status(400).json({ error: '数据包格式不正确，缺少核心 data 节点' });
    }

    const { users, activationCodes: importedCodes, systemSettings, smtpConfig, notices, versions } = backup.data;

    // 1. 恢复用户
    if (Array.isArray(users)) {
      persistentUsers.clear();
      users.forEach((u: any) => {
        if (u && u.uid) persistentUsers.set(u.uid, u);
      });
      savePersistentUsers();
    }

    // 2. 恢复卡密
    if (Array.isArray(importedCodes)) {
      activationCodes.clear();
      importedCodes.forEach((c: any) => {
        if (c && c.code) activationCodes.set(c.code, c);
      });
      saveActivationCodes();
    }

    // 3. 恢复商业化配置
    if (systemSettings && typeof systemSettings === 'object') {
      activeSystemSettings = { ...activeSystemSettings, ...systemSettings };
      saveSystemSettings();
    }

    // 4. 恢复 SMTP 配置
    if (smtpConfig && typeof smtpConfig === 'object') {
      activeSmtpConfig = { ...activeSmtpConfig, ...smtpConfig };
      saveServerSmtpConfig(activeSmtpConfig);
    }

    // 5. 恢复通知与版本
    if (Array.isArray(notices)) {
      persistentNotices = notices;
      savePersistentNotices();
    }
    if (Array.isArray(versions)) {
      persistentVersions = versions;
      savePersistentVersions();
    }

    return res.json({
      success: true,
      message: '全量数据已成功恢复并同步至当前服务端磁盘存储',
    });
  } catch (e: any) {
    return res.status(500).json({ error: '恢复数据失败: ' + e.message });
  }
});

// ==================== System Notices & Version Updates (Domestic Direct Channel) ====================
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'versions.json');

let persistentNotices: any[] = [];
let persistentVersions: any[] = [];

try {
  if (fs.existsSync(NOTICES_FILE)) {
    const raw = fs.readFileSync(NOTICES_FILE, 'utf-8');
    persistentNotices = JSON.parse(raw);
  }
} catch (e) {
  persistentNotices = [];
}

try {
  if (fs.existsSync(VERSIONS_FILE)) {
    const raw = fs.readFileSync(VERSIONS_FILE, 'utf-8');
    persistentVersions = JSON.parse(raw);
  }
} catch (e) {
  persistentVersions = [];
}

function savePersistentNotices() {
  try {
    fs.writeFileSync(NOTICES_FILE, JSON.stringify(persistentNotices, null, 2), 'utf-8');
  } catch (e) {}
}

function savePersistentVersions() {
  try {
    fs.writeFileSync(VERSIONS_FILE, JSON.stringify(persistentVersions, null, 2), 'utf-8');
  } catch (e) {}
}

// 客户端获取最新已发布公告
app.get('/api/notices', (req, res) => {
  const published = persistentNotices.filter(n => n.isPublished !== false);
  return res.json({ notices: published });
});

// 管理员发布/更新公告
app.post('/api/admin/notices/publish', (req, res) => {
  try {
    const notice = req.body;
    if (!notice || !notice.noticeId) {
      return res.status(400).json({ error: '无效公告数据' });
    }
    persistentNotices = [notice, ...persistentNotices.filter(n => n.noticeId !== notice.noticeId)];
    savePersistentNotices();
    return res.json({ success: true, notice });
  } catch (e: any) {
    return res.status(500).json({ error: '保存公告失败' });
  }
});

// 管理员删除公告
app.post('/api/admin/notices/delete', (req, res) => {
  try {
    const { noticeId } = req.body;
    if (!noticeId) {
      return res.status(400).json({ error: '缺失 noticeId' });
    }
    persistentNotices = persistentNotices.filter(n => n.noticeId !== noticeId);
    savePersistentNotices();
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: '删除公告失败' });
  }
});

// 客户端获取最新版本
app.get('/api/versions/latest', (req, res) => {
  if (persistentVersions.length > 0) {
    return res.json({ version: persistentVersions[0] });
  }
  return res.json({ version: null });
});

// 客户端获取全部版本列表
app.get('/api/versions', (req, res) => {
  return res.json({ versions: persistentVersions });
});

// 管理员发布新版本
app.post('/api/admin/versions/publish', (req, res) => {
  try {
    const version = req.body;
    if (!version || !version.versionId) {
      return res.status(400).json({ error: '无效版本数据' });
    }
    persistentVersions = [version, ...persistentVersions.filter(v => v.versionId !== version.versionId)];
    savePersistentVersions();
    return res.json({ success: true, version });
  } catch (e: any) {
    return res.status(500).json({ error: '保存版本失败' });
  }
});

// 管理员删除版本
app.post('/api/admin/versions/delete', (req, res) => {
  try {
    const { versionId } = req.body;
    if (!versionId) {
      return res.status(400).json({ error: '缺失 versionId' });
    }
    persistentVersions = persistentVersions.filter(v => v.versionId !== versionId);
    savePersistentVersions();
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: '删除版本失败' });
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

