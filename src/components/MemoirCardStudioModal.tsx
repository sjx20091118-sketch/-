import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Ticket,
  Image as ImageIcon,
  Palette,
  Camera
} from 'lucide-react';
import { TimelineItem, Artifact, Story, Person } from '../types';

export type UniversalShareSource =
  | { type: 'timeline'; data: TimelineItem }
  | { type: 'artifact'; data: Artifact }
  | { type: 'story'; data: Story }
  | { type: 'person'; data: Person };

interface MemoirCardStudioModalProps {
  source?: UniversalShareSource | TimelineItem | null;
  item?: TimelineItem | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

type CardStyle = 'polaroid' | 'ticket';
type PaperTint = 'ivory' | 'sepia' | 'sage';

// 生成离线雅致肖像印章，作为网络故障时的100%兜底
function generateStylizedAvatarDataUrl(name: string, bg = '#5B7B6D', fg = '#FAF8F5'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 柔和复古渐变底色
  const grad = ctx.createLinearGradient(0, 0, 300, 300);
  grad.addColorStop(0, '#4E6B5F');
  grad.addColorStop(1, '#2B3B34');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 300, 300);

  // 双层同心圆古风纹饰
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(150, 150, 130, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(150, 150, 120, 0, Math.PI * 2);
  ctx.stroke();

  // 单字雅致印迹
  const char = (name || '友').trim().slice(0, 1);
  ctx.fillStyle = fg;
  ctx.font = 'bold 120px "Songti SC", "SimSun", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, 150, 155);

  return canvas.toDataURL('image/png');
}

// 针对外链（特别是作者初始数据图片 URL）的多轨安全加载器
async function loadCardImage(src: string, fallbackName = '友'): Promise<HTMLImageElement | null> {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;

  // 1. Data URLs or blob URLs: load directly without CORS restrictions
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = trimmed;
    });
  }

  // 2. HTTP/HTTPS URLs: try direct with crossOrigin = 'anonymous' first
  try {
    const directImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(null), 2500);
      img.onload = () => {
        clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = trimmed;
    });
    if (directImg) return directImg;
  } catch {}

  // 3. Try fetching as Blob (helps in modern WebViews / PWA where image tag fails crossOrigin)
  try {
    const blobImg = await new Promise<HTMLImageElement | null>(async (resolve) => {
      try {
        const resp = await fetch(trimmed, { mode: 'cors' });
        if (resp.ok) {
          const blob = await resp.blob();
          const objUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(objUrl);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objUrl);
            resolve(null);
          };
          img.src = objUrl;
          return;
        }
      } catch {}
      resolve(null);
    });
    if (blobImg) return blobImg;
  } catch {}

  // 4. Fallback via server CORS image proxy
  try {
    const proxyUrl = `/api/image/proxy?url=${encodeURIComponent(trimmed)}`;
    const proxyImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(null), 3500);
      img.onload = () => {
        clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = proxyUrl;
    });
    if (proxyImg) return proxyImg;
  } catch {}

  // 5. 极端离线/跨域彻底阻断时的艺术化国风印记兜底
  try {
    const fallbackDataUrl = generateStylizedAvatarDataUrl(fallbackName);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = fallbackDataUrl;
    });
  } catch {}

  return null;
}

export const MemoirCardStudioModal: React.FC<MemoirCardStudioModalProps> = ({
  source,
  item,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [style, setStyle] = useState<CardStyle>('polaroid');
  const [tint, setTint] = useState<PaperTint>('ivory');
  const [isGenerating, setIsGenerating] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeSource = source || item;

  // Normalize source data into uniform shape
  const itemData = React.useMemo(() => {
    if (!activeSource) return null;
    if ('type' in activeSource) {
      if (activeSource.type === 'timeline') {
        const d = activeSource.data;
        return {
          id: d.id,
          title: d.title,
          subhead: d.date ? `${d.date} ${d.location ? `· ${d.location}` : ''}` : '岁月长廊',
          date: d.date,
          content: d.content,
          image: d.image || '',
          categoryBadge: d.tag || '岁华记忆',
          sourceType: '时光轴'
        };
      }
      if (activeSource.type === 'artifact') {
        const d = activeSource.data;
        return {
          id: d.id,
          title: d.name,
          subhead: d.date ? `珍藏于 ${d.date}` : '信物馆藏',
          date: d.date,
          content: d.story,
          image: d.image || '',
          categoryBadge: '拾物藏宝',
          sourceType: '拾物阁'
        };
      }
      if (activeSource.type === 'story') {
        const d = activeSource.data;
        return {
          id: d.id,
          title: d.title,
          subhead: `${d.chapter} · ${d.date || '岁序流转'}`,
          date: d.date,
          content: d.content,
          image: '',
          categoryBadge: d.chapter || '时光长篇',
          sourceType: '诗意篇'
        };
      }
      if (activeSource.type === 'person') {
        const d = activeSource.data;
        const isAvatarImage = d.avatar && (d.avatar.startsWith('http') || d.avatar.startsWith('data:') || d.avatar.startsWith('blob:'));
        const resolvedImage = isAvatarImage ? d.avatar : ((d.photos && d.photos.length > 0) ? d.photos[0] : '');
        const charName = d.name ? d.name.slice(0, 1) : '友';

        return {
          id: d.id,
          title: d.name,
          subhead: `${d.relationship || '故人'} · ${d.birthday ? `生辰 ${d.birthday}` : ''}`,
          date: d.knownDate || d.birthday || '岁华结缘',
          content: d.bio || (d.impressions && d.impressions.length > 0 ? d.impressions.map(i => i.text).join('\n') : '愿时光清浅，故人不散。'),
          image: resolvedImage || '',
          avatarSymbol: !isAvatarImage && d.avatar ? d.avatar : charName,
          categoryBadge: d.group || d.relationship || '岁月知己',
          sourceType: '拾人册'
        };
      }
    }

    // Direct TimelineItem fallback
    const t = activeSource as TimelineItem;
    return {
      id: t.id,
      title: t.title,
      subhead: t.date ? `${t.date} ${t.location ? `· ${t.location}` : ''}` : '岁华纪事',
      date: t.date,
      content: t.content,
      image: t.image || '',
      categoryBadge: t.tag || '光影印记',
      sourceType: '时光轴'
    };
  }, [activeSource]);

  // Helper to get tint colors
  const getTintColors = (t: PaperTint) => {
    switch (t) {
      case 'sepia':
        return {
          bg: '#F5EFE6',
          cardBg: '#FAF5EE',
          border: '#D9C8B4',
          text: '#2C221E',
          accent: '#A06B4A',
          subText: '#7A6B60',
        };
      case 'sage':
        return {
          bg: '#EAF0EC',
          cardBg: '#F3F7F4',
          border: '#CAD8CF',
          text: '#192620',
          accent: '#4C6E5F',
          subText: '#5A7569',
        };
      case 'ivory':
      default:
        return {
          bg: '#FAF8F5',
          cardBg: '#FFFFFF',
          border: '#E8E3DC',
          text: '#1A211D',
          accent: '#5B7B6D',
          subText: '#66756E',
        };
    }
  };

  // Draw high-resolution canvas card
  const drawCardToCanvas = useCallback(
    async (canvas: HTMLCanvasElement) => {
      if (!itemData) return;

      const colors = getTintColors(tint);
      const isPolaroid = style === 'polaroid';

      // Dimensions: 900x1200 mobile friendly ratio
      const width = 900;
      const height = 1200;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Background Paper
      ctx.fillStyle = colors.cardBg;
      ctx.fillRect(0, 0, width, height);

      // Subtle paper border
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // Load photo if available with server-side proxy fallback & offline fallback
      let imgObj: HTMLImageElement | null = null;
      if (itemData.image) {
        try {
          imgObj = await loadCardImage(itemData.image, itemData.title);
        } catch {
          imgObj = null;
        }
      }

      if (isPolaroid) {
        // ==================== 1. 拍立得样式 (POLAROID) ====================
        const isPoetryArticle = itemData.sourceType === '诗意篇';

        if (isPoetryArticle) {
          // 纯文章篇章专属雅致长篇排版：整篇以文墨卷轴舒展展开
          const marginX = 70;
          const topY = 80;

          // 章节小标
          ctx.fillStyle = colors.accent;
          ctx.font = 'bold 22px "Cinzel", "Songti SC", serif';
          ctx.textAlign = 'left';
          ctx.fillText(`MEMOIR ESSAY · ${itemData.categoryBadge}`, marginX, topY);

          // 文章主标题
          ctx.fillStyle = colors.text;
          ctx.font = 'bold 44px "Songti SC", "SimSun", serif';
          ctx.fillText(`《${itemData.title}》`, marginX - 10, topY + 60);

          // 雅致装饰细线
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(marginX, topY + 90);
          ctx.lineTo(width - marginX, topY + 90);
          ctx.stroke();

          // 正文多段落长卷铺陈
          ctx.fillStyle = colors.text;
          ctx.font = '24px "Songti SC", "SimSun", serif';
          const paragraphs = (itemData.content || '').split('\n').filter(p => p.trim());
          let textY = topY + 140;

          for (const para of paragraphs) {
            const indentPara = '  ' + para.trim();
            let curLine = '';
            for (let i = 0; i < indentPara.length; i++) {
              const testLine = curLine + indentPara[i];
              if (ctx.measureText(testLine).width > width - marginX * 2) {
                ctx.fillText(curLine, marginX, textY);
                curLine = indentPara[i];
                textY += 40;
                if (textY > height - 160) break;
              } else {
                curLine = testLine;
              }
            }
            if (curLine && textY <= height - 160) {
              ctx.fillText(curLine, marginX, textY);
              textY += 42;
            }
            if (textY > height - 160) break;
          }

          // Cinnabar Seal (诗心红印)
          const sealX = width - 170;
          const sealY = height - 150;
          ctx.save();
          ctx.strokeStyle = '#B3382C';
          ctx.lineWidth = 3;
          ctx.strokeRect(sealX, sealY, 90, 90);
          ctx.fillStyle = 'rgba(179, 56, 44, 0.08)';
          ctx.fillRect(sealX, sealY, 90, 90);
          ctx.fillStyle = '#B3382C';
          ctx.font = 'bold 20px "Songti SC", "SimSun", serif';
          ctx.textAlign = 'center';
          ctx.fillText('风骨', sealX + 45, sealY + 38);
          ctx.fillText('诗心', sealX + 45, sealY + 70);
          ctx.restore();

          // 底部题记
          ctx.fillStyle = colors.subText;
          ctx.font = '18px "Cinzel", "Songti SC", serif';
          ctx.textAlign = 'left';
          ctx.fillText(`SHINIAN · 篇章存墨于此 · ${itemData.date || ''}`, marginX, height - 70);

        } else {
          // 标准带图/影像拍立得画幅
          const frameX = 56;
          const frameY = 56;
          const frameW = width - 112;
          const frameH = 700;

          if (imgObj) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(frameX, frameY, frameW, frameH);
            ctx.clip();

            const scale = Math.max(frameW / imgObj.width, frameH / imgObj.height);
            const drawW = imgObj.width * scale;
            const drawH = imgObj.height * scale;
            const drawX = frameX + (frameW - drawW) / 2;
            const drawY = frameY + (frameH - drawH) / 2;

            ctx.drawImage(imgObj, drawX, drawY, drawW, drawH);
            ctx.restore();
          } else {
            ctx.fillStyle = colors.bg;
            ctx.fillRect(frameX, frameY, frameW, frameH);

            if (itemData.sourceType === '拾人册') {
              // 专属人物册：以精美大头像勋章为中心视觉
              const avatarCenterY = frameY + frameH / 2 - 30;
              const avatarRadius = 100;

              // 外层光晕与双重同心圆边框
              ctx.save();
              ctx.fillStyle = colors.cardBg;
              ctx.beginPath();
              ctx.arc(width / 2, avatarCenterY, avatarRadius + 14, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = colors.accent;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(width / 2, avatarCenterY, avatarRadius, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = colors.border;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(width / 2, avatarCenterY, avatarRadius + 8, 0, Math.PI * 2);
              ctx.stroke();

              // 头像 Emoji 或字标
              ctx.fillStyle = colors.text;
              ctx.font = '88px "Songti SC", "SimSun", "Segoe UI Emoji", serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(itemData.avatarSymbol || '友', width / 2, avatarCenterY + 4);

              // 人物身份微章
              ctx.fillStyle = colors.accent;
              ctx.font = 'bold 26px "Cinzel", "Songti SC", serif';
              ctx.fillText(`知交肖像 · ${itemData.title}`, width / 2, avatarCenterY + avatarRadius + 60);

              ctx.fillStyle = colors.subText;
              ctx.font = '20px "Songti SC", "SimSun", serif';
              ctx.fillText(itemData.subhead || '岁华相伴 · 记忆长青', width / 2, avatarCenterY + avatarRadius + 100);
              ctx.restore();
            } else {
              ctx.fillStyle = colors.accent;
              ctx.font = 'bold 36px "Cinzel", "Songti SC", "SimSun", serif';
              ctx.textAlign = 'center';
              ctx.fillText(`SHINIAN · ${itemData.sourceType}`, width / 2, frameY + frameH / 2 - 40);

              ctx.fillStyle = colors.subText;
              ctx.font = '22px "Songti SC", "SimSun", serif';
              ctx.fillText('这一抹心事，无需胶片亦已永恒', width / 2, frameY + frameH / 2 + 25);
            }
          }

          // Inner photo border
          ctx.strokeStyle = 'rgba(0,0,0,0.06)';
          ctx.lineWidth = 1;
          ctx.strokeRect(frameX, frameY, frameW, frameH);

          // Date & Tag Subhead
          const dateY = frameY + frameH + 60;
          ctx.fillStyle = colors.accent;
          ctx.font = 'bold 24px "Cinzel", "Songti SC", "SimSun", serif';
          ctx.textAlign = 'left';
          ctx.fillText(itemData.subhead || '时光印记', frameX, dateY);

          // Badge in right corner
          if (itemData.categoryBadge) {
            ctx.textAlign = 'right';
            ctx.font = '20px "Songti SC", "SimSun", serif';
            ctx.fillStyle = colors.subText;
            ctx.fillText(`[ ${itemData.categoryBadge} ]`, width - frameX, dateY);
            ctx.textAlign = 'left';
          }

          // Title
          const titleY = dateY + 62;
          ctx.fillStyle = colors.text;
          ctx.font = 'bold 44px "Songti SC", "SimSun", serif';
          ctx.fillText(`「${itemData.title}」`, frameX - 10, titleY);

          // Excerpt text
          const contentY = titleY + 52;
          ctx.fillStyle = colors.subText;
          ctx.font = '24px "Songti SC", "SimSun", serif';
          const cleanContent = (itemData.content || '').slice(0, 110) + ((itemData.content?.length || 0) > 110 ? '...' : '');

          let curLine = '';
          let lineY = contentY;
          const maxLineWidth = frameW - 200;

          for (let i = 0; i < cleanContent.length; i++) {
            const testLine = curLine + cleanContent[i];
            if (ctx.measureText(testLine).width > maxLineWidth) {
              ctx.fillText(curLine, frameX, lineY);
              curLine = cleanContent[i];
              lineY += 38;
              if (lineY > height - 120) break;
            } else {
              curLine = testLine;
            }
          }
          if (curLine && lineY <= height - 120) {
            ctx.fillText(curLine, frameX, lineY);
          }

          // Cinnabar Seal (底角红印)
          const sealX = width - frameX - 110;
          const sealY = height - 170;
          ctx.save();
          ctx.strokeStyle = '#B3382C';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(sealX, sealY, 80, 80);
          ctx.fillStyle = 'rgba(179, 56, 44, 0.08)';
          ctx.fillRect(sealX, sealY, 80, 80);
          ctx.fillStyle = '#B3382C';
          ctx.font = 'bold 18px "Songti SC", "SimSun", serif';
          ctx.textAlign = 'center';
          ctx.fillText('拾年', sealX + 40, sealY + 34);
          ctx.fillText('藏珍', sealX + 40, sealY + 62);
          ctx.restore();

          // Bottom Watermark
          ctx.fillStyle = colors.subText;
          ctx.font = '18px "Cinzel", serif';
          ctx.textAlign = 'left';
          ctx.fillText(`SHINIAN · ${itemData.date || '岁月长卷'}`, frameX, height - 60);
        }

      } else {
        // ==================== 2. 复古电影票根样式 (TICKET) ====================
        const stubHeight = 280;
        const splitY = stubHeight;

        // Top Stub (存根区)
        ctx.save();
        ctx.fillStyle = colors.bg;
        ctx.fillRect(20, 20, width - 40, stubHeight - 20);

        // Perforated line with notch holes
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.moveTo(30, splitY);
        ctx.lineTo(width - 30, splitY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Left & Right circular tear notches
        ctx.fillStyle = '#17201B';
        ctx.beginPath();
        ctx.arc(0, splitY, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(width, splitY, 24, 0, Math.PI * 2);
        ctx.fill();

        // Stub Content
        ctx.fillStyle = colors.accent;
        ctx.font = 'bold 22px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.fillText(`MEMOIR TICKET · ${itemData.sourceType.toUpperCase()}`, width / 2, 70);

        ctx.fillStyle = colors.text;
        ctx.font = 'bold 36px "Songti SC", "SimSun", serif';
        ctx.fillText(`《${itemData.title}》`, width / 2, 125);

        ctx.fillStyle = colors.subText;
        ctx.font = '20px "Songti SC", "SimSun", serif';
        
        let stubSeat = '席位: 岁华长廊';
        if (itemData.sourceType === '拾物阁') stubSeat = '库位: 拾物珍宝阁';
        else if (itemData.sourceType === '诗意篇') stubSeat = '卷席: 文墨诗香台';
        else if (itemData.sourceType === '拾人册') stubSeat = '展位: 知音肖像馆';
        
        ctx.fillText(`日期: ${itemData.date || '岁序未央'}   场次: NO.${itemData.date?.replace(/-/g, '') || '0101'}   ${stubSeat}`, width / 2, 180);

        // Barcode
        const barStartX = width / 2 - 140;
        const barY = 210;
        const barH = 40;
        ctx.fillStyle = colors.text;
        for (let bx = 0; bx < 280; bx += 6) {
          const barW = (bx % 3 === 0) ? 3 : (bx % 2 === 0 ? 2 : 1);
          ctx.fillRect(barStartX + bx, barY, barW, barH);
        }
        ctx.restore();

        // Bottom Main Ticket (主券放映区)
        const mainY = splitY + 40;
        const mainW = width - 120;
        const mainX = 60;

        ctx.fillStyle = colors.accent;
        ctx.font = 'bold 22px "Cinzel", "Songti SC", serif';
        ctx.textAlign = 'left';
        
        let admitHeader = 'ADMIT ONE · SHINIAN ARCHIVES · 时光放映厅';
        if (itemData.sourceType === '拾物阁') admitHeader = 'HERITAGE ACCESS · SHINIAN CURATION · 拾物典藏展';
        else if (itemData.sourceType === '诗意篇') admitHeader = 'POETIC ESSENCE · SHINIAN LITERATURE · 诗意篇章台';
        else if (itemData.sourceType === '拾人册') admitHeader = 'MEMORIAL PORTRAIT · SHINIAN PORTRAITS · 知友肖像馆';
        
        ctx.fillText(admitHeader, mainX, mainY);

        // Photo thumbnail if exists
        const mediaY = mainY + 30;
        if (imgObj) {
          const photoH = 380;
          ctx.save();
          ctx.beginPath();
          ctx.rect(mainX, mediaY, mainW, photoH);
          ctx.clip();
          const scale = Math.max(mainW / imgObj.width, photoH / imgObj.height);
          const dw = imgObj.width * scale;
          const dh = imgObj.height * scale;
          ctx.drawImage(imgObj, mainX + (mainW - dw) / 2, mediaY + (photoH - dh) / 2, dw, dh);
          ctx.restore();

          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1;
          ctx.strokeRect(mainX, mediaY, mainW, photoH);

          // Details below photo
          const descY = mediaY + photoH + 50;
          ctx.fillStyle = colors.accent;
          ctx.font = 'bold 24px "Songti SC", serif';
          ctx.fillText(`纪实：${itemData.subhead}`, mainX, descY);

          ctx.fillStyle = colors.subText;
          ctx.font = '22px "Songti SC", "SimSun", serif';
          const snippet = (itemData.content || '').slice(0, 160) + ((itemData.content?.length || 0) > 160 ? '...' : '');

          let wrap = '';
          let py = descY + 45;
          for (const c of snippet) {
            if (ctx.measureText(wrap + c).width > mainW) {
              ctx.fillText(wrap, mainX, py);
              wrap = c;
              py += 36;
              if (py > height - 120) break;
            } else {
              wrap += c;
            }
          }
          if (wrap) ctx.fillText(wrap, mainX, py);

        } else if (itemData.sourceType === '拾人册') {
          // 拾人册票根：展示专属头像勋章与人物档案
          const photoH = 260;
          ctx.fillStyle = colors.bg;
          ctx.fillRect(mainX, mediaY, mainW, photoH);
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1;
          ctx.strokeRect(mainX, mediaY, mainW, photoH);

          const avCenterY = mediaY + photoH / 2 - 15;
          ctx.save();
          ctx.fillStyle = colors.cardBg;
          ctx.beginPath();
          ctx.arc(width / 2, avCenterY, 65, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = colors.text;
          ctx.font = '54px "Songti SC", "SimSun", "Segoe UI Emoji", serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(itemData.avatarSymbol || '友', width / 2, avCenterY + 2);

          ctx.fillStyle = colors.accent;
          ctx.font = 'bold 22px "Songti SC", serif';
          ctx.fillText(`知交：${itemData.title}`, width / 2, avCenterY + 65);
          ctx.restore();

          // Details below photo
          const descY = mediaY + photoH + 45;
          ctx.fillStyle = colors.accent;
          ctx.font = 'bold 24px "Songti SC", serif';
          ctx.fillText(`结缘：${itemData.subhead}`, mainX, descY);

          ctx.fillStyle = colors.subText;
          ctx.font = '22px "Songti SC", "SimSun", serif';
          const snippet = (itemData.content || '').slice(0, 160) + ((itemData.content?.length || 0) > 160 ? '...' : '');

          let wrap = '';
          let py = descY + 42;
          for (const c of snippet) {
            if (ctx.measureText(wrap + c).width > mainW) {
              ctx.fillText(wrap, mainX, py);
              wrap = c;
              py += 36;
              if (py > height - 120) break;
            } else {
              wrap += c;
            }
          }
          if (wrap) ctx.fillText(wrap, mainX, py);

        } else {
          // Pure text layout for story / letters
          const textY = mediaY + 40;
          ctx.fillStyle = colors.text;
          ctx.font = 'bold 44px "Songti SC", "SimSun", serif';
          ctx.fillText(`「${itemData.title}」`, mainX, textY);

          ctx.fillStyle = colors.accent;
          ctx.font = '24px "Songti SC", serif';
          ctx.fillText(`岁序印迹：${itemData.subhead}`, mainX, textY + 50);

          ctx.fillStyle = colors.subText;
          ctx.font = '24px "Songti SC", "SimSun", serif';
          const fullSnippet = itemData.content || '';
          let wrap = '';
          let py = textY + 110;
          for (const c of fullSnippet) {
            if (ctx.measureText(wrap + c).width > mainW) {
              ctx.fillText(wrap, mainX, py);
              wrap = c;
              py += 40;
              if (py > height - 160) break;
            } else {
              wrap += c;
            }
          }
          if (wrap) ctx.fillText(wrap, mainX, py);
        }

        // Bottom Watermark
        ctx.fillStyle = colors.accent;
        ctx.font = 'bold 18px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHINIAN · 拾 年 珍 藏 纪 事', width / 2, height - 50);
      }
    },
    [itemData, style, tint]
  );

  // Render preview on change
  useEffect(() => {
    if (isOpen && previewCanvasRef.current && itemData) {
      drawCardToCanvas(previewCanvasRef.current);
    }
  }, [isOpen, itemData, style, tint, drawCardToCanvas]);

  // 一键直接存入手机相册与文件落盘（彻底消除二级弹窗）
  const handleDownload = async () => {
    if (!itemData) return;
    setIsGenerating(true);

    try {
      const canvas = document.createElement('canvas');
      await drawCardToCanvas(canvas);

      const fileName = `拾年回忆_${itemData.title}_${style}.png`;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          const dataUrl = canvas.toDataURL('image/png', 0.95);
          const link = document.createElement('a');
          link.download = fileName;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          onShowToast?.('卡片已成功保存至手机相册');
          setIsGenerating(false);
          return;
        }

        const file = new File([blob], fileName, { type: 'image/png' });
        const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        // 移动端优先调用系统级相册管道（系统直接写入相册并唤醒 MediaScanner）
        if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `拾年回忆 · ${itemData.title}`,
              text: `保存《${itemData.title}》至手机相册`,
              files: [file],
            });
            onShowToast?.('卡片已成功保存至手机相册');
            setIsGenerating(false);
            return;
          } catch (e: any) {
            // 用户取消系统面板，继续执行文件下载落盘
          }
        }

        // 默认落盘直接保存
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
        onShowToast?.('卡片已成功保存至手机相册');
        setIsGenerating(false);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to export card image:', err);
      onShowToast?.('卡片保存失败，请重试');
      setIsGenerating(false);
    }
  };

  if (!isOpen || !itemData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-md">
      {/* 模态框本体 */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-2xl bg-[#FAF8F5] rounded-3xl border border-[#2B332E]/15 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] z-10"
      >
        {/* 顶部标题栏：东方极简留白与苹果人机工程 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2B332E]/10 bg-white/60 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#5B7B6D]" />
            <h3 className="font-serif font-bold text-base text-[#17201B]">
              回忆卡片工坊
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#6E7C75] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 核心控制工具条 */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#2B332E]/[0.03] border-b border-[#2B332E]/10 text-xs font-serif">
          {/* 版式形态切换 */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-[#2B332E]/10 shadow-2xs">
            <button
              onClick={() => setStyle('polaroid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                style === 'polaroid'
                  ? 'bg-[#5B7B6D] text-white font-bold shadow-xs'
                  : 'text-[#6E7C75] hover:text-[#17201B]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> 经典拍立得
            </button>
            <button
              onClick={() => setStyle('ticket')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                style === 'ticket'
                  ? 'bg-[#5B7B6D] text-white font-bold shadow-xs'
                  : 'text-[#6E7C75] hover:text-[#17201B]'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" /> 复古电影票根
            </button>
          </div>

          {/* 相纸色调 */}
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[#6E7C75]" />
            <span className="text-[#6E7C75]">纸张底色：</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setTint('ivory')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer ${
                  tint === 'ivory'
                    ? 'border-[#5B7B6D] bg-[#5B7B6D]/10 text-[#5B7B6D] font-bold'
                    : 'border-transparent bg-white text-[#6E7C75]'
                }`}
              >
                象牙白
              </button>
              <button
                onClick={() => setTint('sepia')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer ${
                  tint === 'sepia'
                    ? 'border-[#A06B4A] bg-[#A06B4A]/10 text-[#A06B4A] font-bold'
                    : 'border-transparent bg-[#FAF5EE] text-[#7A6B60]'
                }`}
              >
                复古暖褐
              </button>
              <button
                onClick={() => setTint('sage')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer ${
                  tint === 'sage'
                    ? 'border-[#4C6E5F] bg-[#4C6E5F]/10 text-[#4C6E5F] font-bold'
                    : 'border-transparent bg-[#F3F7F4] text-[#5A7569]'
                }`}
              >
                松针微青
              </button>
            </div>
          </div>
        </div>

        {/* 视效预览区 (Live Canvas Card Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center bg-[#E5DFD5]/40 min-h-[360px]">
          <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-black/10 max-w-full flex items-center justify-center">
            <canvas
              ref={previewCanvasRef}
              className="max-h-[56vh] w-auto max-w-full object-contain rounded-xl"
            />
          </div>
        </div>

        {/* 底部操作行动栏：内嵌东方意境美学提示语与一键直存按键，彻底取消二级弹窗 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#2B332E]/10 bg-white/80 backdrop-blur-md">
          <p className="text-[11px] text-[#6E7C75] font-serif text-center sm:text-left tracking-wide">
            长按画幅直接储存
          </p>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#5B7B6D] hover:bg-[#3E564B] text-white text-xs font-serif font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isGenerating ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            保存卡片到手机相册
          </button>
        </div>
      </motion.div>
    </div>
  );
};
