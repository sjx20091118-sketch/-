import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Ticket,
  Image as ImageIcon,
  Palette
} from 'lucide-react';
import { TimelineItem, Artifact, Story, Person } from '../types';
import { isIndexedDbMedia, resolveMediaUrl } from '../services/indexedDbMedia';
import { buildApiUrl } from '../services/apiConfig';

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

// 生成离线雅致肖像印章，仅作为人物网络故障时的100%兜底
function generateStylizedAvatarDataUrl(name: string, bg = '#5B7B6D', fg = '#FAF8F5'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createLinearGradient(0, 0, 300, 300);
  grad.addColorStop(0, '#4E6B5F');
  grad.addColorStop(1, '#2B3B34');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 300, 300);

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

  const char = (name || '友').trim().slice(0, 1);
  ctx.fillStyle = fg;
  ctx.font = 'bold 120px "Songti SC", "SimSun", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, 150, 155);

  return canvas.toDataURL('image/png');
}

// 针对外链、Base64 与 IndexedDB (idb://) 的多轨安全加载器（防跨域污染保障）
async function loadCardImage(src: string, fallbackName = '友'): Promise<HTMLImageElement | null> {
  if (!src) return null;
  let trimmed = src.trim();
  if (!trimmed) return null;

  // 0. 解析 idb:// 本地二进制媒体
  if (isIndexedDbMedia(trimmed)) {
    try {
      trimmed = await resolveMediaUrl(trimmed);
    } catch (e) {
      console.warn('Failed to resolve idb media for card:', e);
    }
  }

  // 1. Data URLs or blob URLs: load directly without CORS restrictions
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = trimmed;
    });
  }

  // 2. Fetch as Blob and convert to pure data URL via FileReader (100% clean, never taints canvas)
  try {
    const dataUrlImg = await new Promise<HTMLImageElement | null>(async (resolve) => {
      try {
        const resp = await fetch(trimmed, { mode: 'cors' });
        if (resp.ok) {
          const blob = await resp.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = dataUrl;
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
          return;
        }
      } catch {}
      resolve(null);
    });
    if (dataUrlImg) return dataUrlImg;
  } catch {}

  // 3. Fallback via server CORS image proxy and convert to clean Data URL
  try {
    const proxyUrl = buildApiUrl(`/api/image/proxy?url=${encodeURIComponent(trimmed)}`);
    const proxyImg = await new Promise<HTMLImageElement | null>(async (resolve) => {
      try {
        const resp = await fetch(proxyUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = dataUrl;
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
          return;
        }
      } catch {}
      resolve(null);
    });
    if (proxyImg) return proxyImg;
  } catch {}

  // 4. Direct with crossOrigin = 'anonymous'
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

  // 5. 无法解析或网络阻断时返回 null，绝不误造虚假头像或绿色底板
  return null;
}

// 统一绘制高质量无变形自适应 Bento 单格图片
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 12
) {
  ctx.save();
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();

  const scale = Math.max(w / img.width, h / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = x + (w - drawW) / 2;
  const drawY = y + (h - drawH) / 2;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
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

  // 规范化来源数据，全面聚合单图、多图、视频抽帧封面
  const itemData = React.useMemo(() => {
    if (!activeSource) return null;
    if ('type' in activeSource) {
      if (activeSource.type === 'timeline') {
        const d = activeSource.data;
        const rawList: string[] = [];
        if (d.image) rawList.push(d.image);
        if (d.videoPoster) rawList.push(d.videoPoster);
        const uniqueImages = Array.from(new Set(rawList.filter(Boolean)));
        return {
          id: d.id,
          title: d.title,
          subhead: d.date ? `${d.date} ${d.location ? `· ${d.location}` : ''}` : '岁月长廊',
          date: d.date,
          content: d.content,
          image: uniqueImages[0] || '',
          images: uniqueImages,
          categoryBadge: d.tag || '岁华记忆',
          sourceType: '时光轴'
        };
      }
      if (activeSource.type === 'artifact') {
        const d = activeSource.data;
        const rawList: string[] = [];
        // 优先加入所有相册照片
        if (Array.isArray(d.images) && d.images.length > 0) {
          rawList.push(...d.images);
        } else if (d.image) {
          rawList.push(d.image);
        }
        // 加入视频抽帧封面作为排版元素
        if (d.videoPoster) rawList.push(d.videoPoster);
        if (Array.isArray(d.videos)) {
          d.videos.forEach((v: any) => {
            if (v?.poster) rawList.push(v.poster);
          });
        }
        const uniqueImages = Array.from(new Set(rawList.filter(Boolean)));

        return {
          id: d.id,
          title: d.name,
          subhead: d.date ? `珍藏于 ${d.date}` : '信物馆藏',
          date: d.date,
          content: d.story,
          image: uniqueImages[0] || '',
          images: uniqueImages,
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
          images: [],
          categoryBadge: d.chapter || '时光长篇',
          sourceType: '诗意篇'
        };
      }
      if (activeSource.type === 'person') {
        const d = activeSource.data;
        const rawList: string[] = [];
        const isAvatarImage = d.avatar && (
          d.avatar.startsWith('http') ||
          d.avatar.startsWith('data:') ||
          d.avatar.startsWith('blob:') ||
          d.avatar.startsWith('idb:')
        );
        if (isAvatarImage) rawList.push(d.avatar);
        if (Array.isArray(d.photos) && d.photos.length > 0) {
          rawList.push(...d.photos);
        }
        const uniqueImages = Array.from(new Set(rawList.filter(Boolean)));
        const charName = d.name ? d.name.slice(0, 1) : '友';

        return {
          id: d.id,
          title: d.name,
          subhead: `${d.relationship || '故人'} · ${d.birthday ? `生辰 ${d.birthday}` : ''}`,
          date: d.knownDate || d.birthday || '岁华结缘',
          content: d.bio || (d.impressions && d.impressions.length > 0 ? d.impressions.map(i => i.text).join('\n') : '愿时光清浅，故人不散。'),
          image: uniqueImages[0] || '',
          images: uniqueImages,
          avatarSymbol: !isAvatarImage && d.avatar ? d.avatar : charName,
          categoryBadge: d.group || d.relationship || '岁月知己',
          sourceType: '拾人册'
        };
      }
    }

    // Direct TimelineItem fallback
    const t = activeSource as TimelineItem;
    const rawList: string[] = [];
    if (t.image) rawList.push(t.image);
    if (t.videoPoster) rawList.push(t.videoPoster);
    const uniqueImages = Array.from(new Set(rawList.filter(Boolean)));

    return {
      id: t.id,
      title: t.title,
      subhead: t.date ? `${t.date} ${t.location ? `· ${t.location}` : ''}` : '岁华纪事',
      date: t.date,
      content: t.content,
      image: uniqueImages[0] || '',
      images: uniqueImages,
      categoryBadge: t.tag || '光影印记',
      sourceType: '时光轴'
    };
  }, [activeSource]);

  // 获取纸张色系配置
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

  // 高保真绘制 Canvas 卡片画幅（苹果相册 Bento 自适应拼图）
  const drawCardToCanvas = useCallback(
    async (canvas: HTMLCanvasElement) => {
      if (!itemData) return;

      const colors = getTintColors(tint);
      const isPolaroid = style === 'polaroid';

      // 900x1200 移动端黄金纵向画幅比例
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

      // 加载并解析最多 4 张高保真图片或视频抽帧
      const imagesToLoad = (itemData.images && itemData.images.length > 0)
        ? itemData.images.slice(0, 4)
        : (itemData.image ? [itemData.image] : []);

      const loadedImages: HTMLImageElement[] = [];
      for (const imgUrl of imagesToLoad) {
        try {
          const loaded = await loadCardImage(imgUrl, itemData.title);
          if (loaded) loadedImages.push(loaded);
        } catch {}
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
          ctx.moveTo(marginX, topY + 95);
          ctx.lineTo(width - marginX, topY + 95);
          ctx.stroke();

          // 正文多行排版
          ctx.fillStyle = colors.text;
          ctx.font = '24px "Songti SC", "SimSun", serif';
          const maxTextW = width - marginX * 2;
          const storyLines = (itemData.content || '').split('\n');

          let textY = topY + 145;
          const lineHeight = 44;

          for (const rawParagraph of storyLines) {
            const paragraph = rawParagraph.trim();
            if (!paragraph) {
              textY += 20;
              continue;
            }

            let curLine = '　　';
            for (let i = 0; i < paragraph.length; i++) {
              const char = paragraph[i];
              if (ctx.measureText(curLine + char).width > maxTextW) {
                ctx.fillText(curLine, marginX, textY);
                curLine = char;
                textY += lineHeight;
                if (textY > height - 160) break;
              } else {
                curLine += char;
              }
            }
            if (curLine.trim()) {
              ctx.fillText(curLine, marginX, textY);
              textY += lineHeight;
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
          // 标准带图/多图 Bento 拍立得画幅
          const frameX = 56;
          const frameY = 56;
          const frameW = width - 112;
          const frameH = 700;

          if (loadedImages.length > 0) {
            // --- 苹果相册 Bento 自适应拼贴画格算法 ---
            const gap = 8;
            if (loadedImages.length === 1) {
              // 1 张图片：全幅大赏 (Hero Bleed)
              drawCoverImage(ctx, loadedImages[0], frameX, frameY, frameW, frameH, 14);
            } else if (loadedImages.length === 2) {
              // 2 张图片：对称双栏 (50/50 Split)
              const colW = (frameW - gap) / 2;
              drawCoverImage(ctx, loadedImages[0], frameX, frameY, colW, frameH, 14);
              drawCoverImage(ctx, loadedImages[1], frameX + colW + gap, frameY, colW, frameH, 14);
            } else if (loadedImages.length === 3) {
              // 3 张图片：左主图 60% + 右双叠 40% (Apple Hero Bento)
              const leftW = Math.round(frameW * 0.6) - gap / 2;
              const rightW = frameW - leftW - gap;
              const rightH = (frameH - gap) / 2;
              drawCoverImage(ctx, loadedImages[0], frameX, frameY, leftW, frameH, 14);
              drawCoverImage(ctx, loadedImages[1], frameX + leftW + gap, frameY, rightW, rightH, 14);
              drawCoverImage(ctx, loadedImages[2], frameX + leftW + gap, frameY + rightH + gap, rightW, rightH, 14);
            } else {
              // 4 张及以上图片：2x2 经典宫格 Bento
              const cellW = (frameW - gap) / 2;
              const cellH = (frameH - gap) / 2;
              drawCoverImage(ctx, loadedImages[0], frameX, frameY, cellW, cellH, 14);
              drawCoverImage(ctx, loadedImages[1], frameX + cellW + gap, frameY, cellW, cellH, 14);
              drawCoverImage(ctx, loadedImages[2], frameX, frameY + cellH + gap, cellW, cellH, 14);
              drawCoverImage(ctx, loadedImages[3], frameX + cellW + gap, frameY + cellH + gap, cellW, cellH, 14);
            }
          } else {
            // 无图时的雅致画幅
            ctx.fillStyle = colors.bg;
            ctx.fillRect(frameX, frameY, frameW, frameH);

            if (itemData.sourceType === '拾人册') {
              const avatarCenterY = frameY + frameH / 2 - 30;
              const avatarRadius = 100;

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

              ctx.fillStyle = colors.text;
              ctx.font = '88px "Songti SC", "SimSun", "Segoe UI Emoji", serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(itemData.avatarSymbol || '友', width / 2, avatarCenterY + 4);

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
              ctx.fillText('静默信物，无需胶片亦承载岁月', width / 2, frameY + frameH / 2 + 25);
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
            const char = cleanContent[i];
            if (ctx.measureText(curLine + char).width > maxLineWidth) {
              ctx.fillText(curLine, frameX, lineY);
              curLine = char;
              lineY += 40;
              if (lineY > height - 100) break;
            } else {
              curLine += char;
            }
          }
          if (curLine) {
            ctx.fillText(curLine, frameX, lineY);
          }

          // Bottom Seal
          const sealX = width - 170;
          const sealY = height - 165;
          ctx.save();
          ctx.strokeStyle = '#B3382C';
          ctx.lineWidth = 3;
          ctx.strokeRect(sealX, sealY, 90, 90);
          ctx.fillStyle = 'rgba(179, 56, 44, 0.08)';
          ctx.fillRect(sealX, sealY, 90, 90);
          ctx.fillStyle = '#B3382C';
          ctx.font = 'bold 20px "Songti SC", "SimSun", serif';
          ctx.textAlign = 'center';
          ctx.fillText('拾光', sealX + 45, sealY + 38);
          ctx.fillText('藏珍', sealX + 45, sealY + 70);
          ctx.restore();

          // 底部极简品牌标签
          ctx.fillStyle = colors.subText;
          ctx.font = '18px "Cinzel", "Songti SC", serif';
          ctx.textAlign = 'left';
          ctx.fillText(`拾年 · ${itemData.date || '岁月长河'}`, frameX, height - 70);
        }

      } else {
        // ==================== 2. 复古电影票根样式 (TICKET STUB) ====================
        const pad = 50;
        const stubW = 240;
        const mainW = width - pad * 2 - stubW;

        // 齿孔撕裂线
        const cutX = pad + stubW;
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.moveTo(cutX, 20);
        ctx.lineTo(cutX, height - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // 上下半圆缺口
        ctx.fillStyle = colors.bg;
        ctx.beginPath();
        ctx.arc(cutX, 16, 26, 0, Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cutX, height - 16, 26, Math.PI, Math.PI * 2);
        ctx.fill();

        // 存根侧 (Stub Side)
        ctx.save();
        ctx.translate(pad + 120, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = colors.accent;
        ctx.font = 'bold 36px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHINIAN TICKET', 0, -40);
        ctx.font = '22px "Songti SC", serif';
        ctx.fillText(`岁月凭证 · ${itemData.categoryBadge}`, 0, 10);
        ctx.fillStyle = colors.subText;
        ctx.font = '20px "Cinzel", monospace';
        ctx.fillText(`NO. ${itemData.id.slice(-8).toUpperCase()}`, 0, 50);
        ctx.restore();

        // 主券侧 (Main Side)
        const mainX = cutX + 50;
        const mainY = 90;

        ctx.fillStyle = colors.text;
        ctx.font = 'bold 44px "Songti SC", "SimSun", serif';
        ctx.textAlign = 'left';
        ctx.fillText(`《${itemData.title}》`, mainX, mainY);

        ctx.fillStyle = colors.accent;
        ctx.font = 'bold 20px "Cinzel", "Songti SC", serif';
        ctx.fillText(`ADMIT ONE · ${itemData.sourceType.toUpperCase()} · 时光放映`, mainX, mainY + 45);

        // 照片画幅 Bento 拼贴
        const mediaY = mainY + 80;
        const photoH = 460;
        const availableW = width - mainX - pad;

        if (loadedImages.length > 0) {
          const gap = 6;
          if (loadedImages.length === 1) {
            drawCoverImage(ctx, loadedImages[0], mainX, mediaY, availableW, photoH, 12);
          } else if (loadedImages.length === 2) {
            const colW = (availableW - gap) / 2;
            drawCoverImage(ctx, loadedImages[0], mainX, mediaY, colW, photoH, 12);
            drawCoverImage(ctx, loadedImages[1], mainX + colW + gap, mediaY, colW, photoH, 12);
          } else if (loadedImages.length === 3) {
            const leftW = Math.round(availableW * 0.6) - gap / 2;
            const rightW = availableW - leftW - gap;
            const rightH = (photoH - gap) / 2;
            drawCoverImage(ctx, loadedImages[0], mainX, mediaY, leftW, photoH, 12);
            drawCoverImage(ctx, loadedImages[1], mainX + leftW + gap, mediaY, rightW, rightH, 12);
            drawCoverImage(ctx, loadedImages[2], mainX + leftW + gap, mediaY + rightH + gap, rightW, rightH, 12);
          } else {
            // 4 张及以上图片：2x2 经典宫格 Bento
            const cellW = (availableW - gap) / 2;
            const cellH = (photoH - gap) / 2;
            drawCoverImage(ctx, loadedImages[0], mainX, mediaY, cellW, cellH, 12);
            drawCoverImage(ctx, loadedImages[1], mainX + cellW + gap, mediaY, cellW, cellH, 12);
            drawCoverImage(ctx, loadedImages[2], mainX, mediaY + cellH + gap, cellW, cellH, 12);
            drawCoverImage(ctx, loadedImages[3], mainX + cellW + gap, mediaY + cellH + gap, cellW, cellH, 12);
          }
        } else {
          ctx.fillStyle = colors.bg;
          ctx.fillRect(mainX, mediaY, availableW, photoH);
          ctx.fillStyle = colors.accent;
          ctx.font = 'bold 26px "Cinzel", serif';
          ctx.textAlign = 'center';
          ctx.fillText(`SHINIAN · ${itemData.sourceType}`, mainX + availableW / 2, mediaY + photoH / 2);
          ctx.textAlign = 'left';
        }

        // 详细文字叙事
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
          if (ctx.measureText(wrap + c).width > availableW) {
            ctx.fillText(wrap, mainX, py);
            wrap = c;
            py += 36;
            if (py > height - 120) break;
          } else {
            wrap += c;
          }
        }
        if (wrap) {
          ctx.fillText(wrap, mainX, py);
        }

        // 底部序列条码风格装饰
        ctx.fillStyle = colors.subText;
        ctx.font = '16px "Cinzel", monospace';
        ctx.fillText(`DATE: ${itemData.date || '2026'} · SEAT: V-01 · SCREEN: MEMOIR`, mainX, height - 70);
      }
    },
    [itemData, tint, style]
  );

  useEffect(() => {
    if (isOpen && previewCanvasRef.current && itemData) {
      drawCardToCanvas(previewCanvasRef.current);
    }
  }, [isOpen, itemData, style, tint, drawCardToCanvas]);

  // 一键直接存入手机相册与文件落盘（彻底消除二级弹窗，支持安卓原生 MediaStore 桥接）
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

        // 0. 安卓封装 APK 原生桥接优先通道（直接通过原生 MediaStore 写入手机图库）
        const win = window as any;
        const nativeBridge = win.AndroidBridge || win.Android || win.JSBridge;
        if (nativeBridge && (typeof nativeBridge.saveImageToGallery === 'function' || typeof nativeBridge.saveImage === 'function')) {
          try {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              if (typeof nativeBridge.saveImageToGallery === 'function') {
                nativeBridge.saveImageToGallery(base64, fileName);
              } else if (typeof nativeBridge.saveImage === 'function') {
                nativeBridge.saveImage(base64, fileName);
              }
              onShowToast?.('卡片已保存至手机系统相册');
              setIsGenerating(false);
            };
            reader.readAsDataURL(blob);
            return;
          } catch (bridgeErr) {
            console.warn('原生相册桥接异常，切换回 Web 通道', bridgeErr);
          }
        }

        // 1. 移动端优先调用系统级相册管道（系统直接写入相册并唤醒 MediaScanner）
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

        // 2. 默认落盘直接保存
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md">
      {/* 模态框本体 */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-[#FAF8F5] dark:bg-[#141E18] border border-[#2B332E]/15 dark:border-white/15 font-sans"
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2B332E]/10 dark:border-white/10 bg-white/70 dark:bg-[#18251E] backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5B7B6D]/15 dark:bg-[#203026] flex items-center justify-center text-[#5B7B6D] dark:text-[#A7D1BF]">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-[#2B332E] dark:text-[#FAF8F5]">
                回忆卡片工坊
              </h3>
              <p className="text-[10px] text-[#6E7C75] dark:text-[#8E9F97] font-serif">
                将《{itemData.title}》定制为复古东方文艺明信片
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#6E7C75] dark:text-[#A7B4AD] hover:text-[#2B332E] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 控制区：样式切换与纸张色系 */}
        <div className="px-6 py-3 bg-[#FAF8F5] dark:bg-[#16221C] border-b border-[#2B332E]/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* 卡片版式 */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1C2A22] p-1 rounded-xl border border-[#2B332E]/10 dark:border-white/10">
            <button
              onClick={() => setStyle('polaroid')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                style === 'polaroid'
                  ? 'bg-[#5B7B6D] text-white font-bold shadow-xs'
                  : 'text-[#6E7C75] dark:text-[#A7B4AD] hover:text-[#2B332E] dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> 经典拍立得
            </button>
            <button
              onClick={() => setStyle('ticket')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                style === 'ticket'
                  ? 'bg-[#5B7B6D] text-white font-bold shadow-xs'
                  : 'text-[#6E7C75] dark:text-[#A7B4AD] hover:text-[#2B332E] dark:hover:text-white'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" /> 复古电影票根
            </button>
          </div>

          {/* 相纸色调 */}
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[#6E7C75] dark:text-[#8E9F97]" />
            <span className="text-[#6E7C75] dark:text-[#8E9F97]">纸张底色：</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setTint('ivory')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer transition-all ${
                  tint === 'ivory'
                    ? 'border-[#5B7B6D] bg-[#5B7B6D]/10 dark:bg-[#5B7B6D]/25 text-[#5B7B6D] dark:text-[#A7D1BF] font-bold'
                    : 'border-transparent bg-white dark:bg-[#1C2A22] text-[#6E7C75] dark:text-[#A7B4AD]'
                }`}
              >
                象牙白
              </button>
              <button
                onClick={() => setTint('sepia')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer transition-all ${
                  tint === 'sepia'
                    ? 'border-[#A06B4A] bg-[#A06B4A]/10 dark:bg-[#A06B4A]/25 text-[#A06B4A] dark:text-[#FFAF94] font-bold'
                    : 'border-transparent bg-[#FAF5EE] dark:bg-[#2A231C] text-[#7A6B60] dark:text-[#C5B5A7]'
                }`}
              >
                复古暖褐
              </button>
              <button
                onClick={() => setTint('sage')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer transition-all ${
                  tint === 'sage'
                    ? 'border-[#4C6E5F] bg-[#4C6E5F]/10 dark:bg-[#4C6E5F]/25 text-[#4C6E5F] dark:text-[#9ECBB8] font-bold'
                    : 'border-transparent bg-[#F3F7F4] dark:bg-[#1A2820] text-[#5A7569] dark:text-[#9ECBB8]'
                }`}
              >
                松针微青
              </button>
            </div>
          </div>
        </div>

        {/* 视效预览区 (Live Canvas Card Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center bg-[#E5DFD5]/40 dark:bg-black/40 min-h-[360px]">
          <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 max-w-full flex items-center justify-center">
            <canvas
              ref={previewCanvasRef}
              className="max-h-[56vh] w-auto max-w-full object-contain rounded-xl"
            />
          </div>
        </div>

        {/* 底部操作行动栏：一键直存按键，彻底取消二级弹窗，无多余文字冗余 */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#2B332E]/10 dark:border-white/10 bg-white/80 dark:bg-[#18251E] backdrop-blur-md">
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
