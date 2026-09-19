import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Share2,
  Copy,
  Sparkles,
  Ticket,
  Image as ImageIcon,
  Check,
  Palette
} from 'lucide-react';
import { TimelineItem } from '../types';

interface MemoirCardStudioModalProps {
  item: TimelineItem | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

type CardStyle = 'polaroid' | 'ticket';
type PaperTint = 'ivory' | 'sepia' | 'sage';

export const MemoirCardStudioModal: React.FC<MemoirCardStudioModalProps> = ({
  item,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [style, setStyle] = useState<CardStyle>('polaroid');
  const [tint, setTint] = useState<PaperTint>('ivory');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
      if (!item) return;

      const colors = getTintColors(tint);
      const isPolaroid = style === 'polaroid';

      // 2x Retina resolution dimensions
      const width = isPolaroid ? 900 : 1200;
      const height = isPolaroid ? 1200 : 660;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Enable smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Background Paper
      ctx.fillStyle = colors.cardBg;
      ctx.fillRect(0, 0, width, height);

      // Subtle paper fiber border
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      // Load item photo if available
      let imgObj: HTMLImageElement | null = null;
      if (item.image) {
        try {
          imgObj = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = item.image!;
          });
        } catch {
          imgObj = null;
        }
      }

      if (isPolaroid) {
        // ========== 拍立得布局 (POLAROID) ==========
        const frameX = 56;
        const frameY = 56;
        const frameW = width - 112;
        const frameH = 720;

        // Photo Area
        if (imgObj) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(frameX, frameY, frameW, frameH);
          ctx.clip();

          // Calculate cover aspect ratio
          const scale = Math.max(frameW / imgObj.width, frameH / imgObj.height);
          const drawW = imgObj.width * scale;
          const drawH = imgObj.height * scale;
          const drawX = frameX + (frameW - drawW) / 2;
          const drawY = frameY + (frameH - drawH) / 2;

          ctx.drawImage(imgObj, drawX, drawY, drawW, drawH);

          // Subtle photo shadow & vignette
          const grad = ctx.createRadialGradient(
            frameX + frameW / 2,
            frameY + frameH / 2,
            frameW / 4,
            frameX + frameW / 2,
            frameY + frameH / 2,
            frameW * 0.8
          );
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,0.18)');
          ctx.fillStyle = grad;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          ctx.restore();
        } else {
          // No image: Literary parchment block
          ctx.fillStyle = colors.bg;
          ctx.fillRect(frameX, frameY, frameW, frameH);
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1;
          ctx.strokeRect(frameX + 20, frameY + 20, frameW - 40, frameH - 40);

          ctx.fillStyle = colors.accent;
          ctx.font = 'italic 34px "Songti SC", "SimSun", serif';
          ctx.textAlign = 'center';
          ctx.fillText('“ 岁华留白，思念无形 ”', width / 2, frameY + frameH / 2 - 20);

          ctx.fillStyle = colors.subText;
          ctx.font = '22px "Songti SC", "SimSun", serif';
          ctx.fillText('这一抹心事，无需胶片亦已永恒', width / 2, frameY + frameH / 2 + 30);
        }

        // Inner border of photo
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(frameX, frameY, frameW, frameH);

        // Date & Location Header
        const dateY = frameY + frameH + 60;
        ctx.fillStyle = colors.accent;
        ctx.font = 'bold 24px "Cinzel", "Songti SC", "SimSun", serif';
        ctx.textAlign = 'left';
        ctx.fillText(item.date || '时光印记', frameX, dateY);

        if (item.location) {
          ctx.font = '22px "Songti SC", "SimSun", serif';
          ctx.fillStyle = colors.subText;
          ctx.fillText(`·  ${item.location}`, frameX + 220, dateY);
        }

        // Memoir Title
        const titleY = dateY + 62;
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 44px "Songti SC", "SimSun", serif';
        ctx.fillText(`「${item.title}」`, frameX - 10, titleY);

        // Memoir Excerpt
        const contentY = titleY + 52;
        ctx.fillStyle = colors.subText;
        ctx.font = '24px "Songti SC", "SimSun", serif';
        const cleanContent = (item.content || '').slice(0, 100) + ((item.content?.length || 0) > 100 ? '...' : '');

        // Wrap text
        let curLine = '';
        let lineY = contentY;
        const maxLineWidth = frameW - 220;

        for (let i = 0; i < cleanContent.length; i++) {
          const testLine = curLine + cleanContent[i];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxLineWidth && i > 0) {
            ctx.fillText(curLine, frameX, lineY);
            curLine = cleanContent[i];
            lineY += 38;
            if (lineY > height - 90) break;
          } else {
            curLine = testLine;
          }
        }
        if (curLine) {
          ctx.fillText(curLine, frameX, lineY);
        }

        // Red Cinnabar Seal (朱砂印) in lower right
        const sealX = width - 180;
        const sealY = height - 160;
        ctx.save();
        ctx.strokeStyle = '#B3382C';
        ctx.lineWidth = 3;
        ctx.strokeRect(sealX, sealY, 110, 110);
        ctx.fillStyle = 'rgba(179, 56, 44, 0.08)';
        ctx.fillRect(sealX, sealY, 110, 110);

        ctx.fillStyle = '#B3382C';
        ctx.font = 'bold 22px "Songti SC", "SimSun", serif';
        ctx.textAlign = 'center';
        ctx.fillText('拾年', sealX + 55, sealY + 45);
        ctx.fillText('温存', sealX + 55, sealY + 80);
        ctx.restore();

      } else {
        // ========== 复古电影票根 (VINTAGE TICKET STUB) ==========
        const stubWidth = 320;
        const splitX = stubWidth;

        // Left Stub: 存根区
        ctx.save();
        ctx.fillStyle = colors.bg;
        ctx.fillRect(14, 14, splitX - 14, height - 28);

        // Perforated line with notch holes
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.moveTo(splitX, 30);
        ctx.lineTo(splitX, height - 30);
        ctx.stroke();
        ctx.setLineDash([]);

        // Top & Bottom circular tear notches
        ctx.fillStyle = '#17201B';
        ctx.beginPath();
        ctx.arc(splitX, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(splitX, height, 24, 0, Math.PI * 2);
        ctx.fill();

        // Left Stub Content
        ctx.fillStyle = colors.accent;
        ctx.font = 'bold 22px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.fillText('MEMOIR TICKET', splitX / 2, 70);

        ctx.fillStyle = colors.text;
        ctx.font = 'bold 32px "Songti SC", "SimSun", serif';
        ctx.fillText('拾年存根', splitX / 2, 120);

        ctx.fillStyle = colors.subText;
        ctx.font = '20px "Songti SC", "SimSun", serif';
        ctx.fillText(`日期: ${item.date || '岁华未央'}`, splitX / 2, 180);
        ctx.fillText(`场次: NO.${item.date?.replace(/-/g, '') || '0101'}`, splitX / 2, 220);
        ctx.fillText(`座席: 岁华长廊 01座`, splitX / 2, 260);

        // Simulated Barcode
        const barStartX = 50;
        const barY = height - 160;
        const barH = 70;
        ctx.fillStyle = colors.text;
        for (let bx = 0; bx < 220; bx += 7) {
          const barW = (bx % 3 === 0) ? 4 : (bx % 2 === 0 ? 2 : 1);
          ctx.fillRect(barStartX + bx, barY, barW, barH);
        }
        ctx.font = '16px monospace';
        ctx.fillText(`* ${item.id?.slice(0, 10).toUpperCase() || 'SHINIAN'} *`, splitX / 2, height - 60);
        ctx.restore();

        // Right Main Ticket: 主券展示区
        const mainX = splitX + 50;
        const mainW = width - mainX - 40;

        // Header banner
        ctx.fillStyle = colors.accent;
        ctx.font = 'bold 22px "Cinzel", "Songti SC", serif';
        ctx.textAlign = 'left';
        ctx.fillText('ADMIT ONE · SHINIAN ARCHIVES · 岁华放映厅', mainX, 70);

        // Memoir Title
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 44px "Songti SC", "SimSun", serif';
        ctx.fillText(`《${item.title}》`, mainX, 130);

        // Photo thumbnail if exists
        const mediaY = 160;
        if (imgObj) {
          const thumbW = 280;
          const thumbH = 380;
          ctx.save();
          ctx.beginPath();
          ctx.rect(mainX, mediaY, thumbW, thumbH);
          ctx.clip();
          const scale = Math.max(thumbW / imgObj.width, thumbH / imgObj.height);
          const dw = imgObj.width * scale;
          const dh = imgObj.height * scale;
          ctx.drawImage(imgObj, mainX + (thumbW - dw) / 2, mediaY + (thumbH - dh) / 2, dw, dh);
          ctx.restore();
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1;
          ctx.strokeRect(mainX, mediaY, thumbW, thumbH);

          // Text to the right of thumbnail
          const textX = mainX + thumbW + 40;
          const textMaxW = width - textX - 40;

          ctx.fillStyle = colors.accent;
          ctx.font = 'bold 22px "Songti SC", serif';
          ctx.fillText(`放映时间：${item.date}`, textX, mediaY + 40);
          if (item.location) {
            ctx.fillText(`地点坐标：${item.location}`, textX, mediaY + 80);
          }

          ctx.fillStyle = colors.subText;
          ctx.font = '22px "Songti SC", "SimSun", serif';
          const snippet = (item.content || '').slice(0, 120) + '...';
          let wrap = '';
          let py = mediaY + 140;
          for (let c of snippet) {
            if (ctx.measureText(wrap + c).width > textMaxW) {
              ctx.fillText(wrap, textX, py);
              wrap = c;
              py += 36;
              if (py > height - 100) break;
            } else {
              wrap += c;
            }
          }
          if (wrap) ctx.fillText(wrap, textX, py);
        } else {
          // Pure literary ticket
          ctx.fillStyle = colors.accent;
          ctx.font = '26px "Songti SC", "SimSun", serif';
          ctx.fillText(`放映纪实：${item.date} ${item.location ? `· ${item.location}` : ''}`, mainX, mediaY + 30);

          ctx.fillStyle = colors.text;
          ctx.font = '26px "Songti SC", "SimSun", serif';
          const fullSnippet = item.content || '';
          let wrap = '';
          let py = mediaY + 90;
          for (let c of fullSnippet) {
            if (ctx.measureText(wrap + c).width > mainW) {
              ctx.fillText(wrap, mainX, py);
              wrap = c;
              py += 42;
              if (py > height - 110) break;
            } else {
              wrap += c;
            }
          }
          if (wrap) ctx.fillText(wrap, mainX, py);
        }

        // Bottom right archival stamp
        const stampX = width - 200;
        const stampY = height - 130;
        ctx.save();
        ctx.strokeStyle = '#B3382C';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(stampX + 60, stampY + 40, 50, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#B3382C';
        ctx.font = 'bold 18px "Songti SC", "SimSun", serif';
        ctx.textAlign = 'center';
        ctx.fillText('拾年档案', stampX + 60, stampY + 34);
        ctx.fillText('永久珍藏', stampX + 60, stampY + 58);
        ctx.restore();
      }
    },
    [item, style, tint]
  );

  // Redraw when parameters change
  useEffect(() => {
    if (isOpen && previewCanvasRef.current && item) {
      drawCardToCanvas(previewCanvasRef.current);
    }
  }, [isOpen, item, style, tint, drawCardToCanvas]);

  // Export card image as PNG download
  const handleDownload = async () => {
    if (!previewCanvasRef.current || !item) return;
    setIsGenerating(true);
    try {
      const offscreen = document.createElement('canvas');
      await drawCardToCanvas(offscreen);

      offscreen.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `拾年回忆卡片_${item.title || '时光'}_${style === 'polaroid' ? '拍立得' : '电影票'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onShowToast?.('高清卡片已保存至本地相册');
      }, 'image/png');
    } catch (err) {
      console.error('Download error', err);
      onShowToast?.('卡片生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy literary caption
  const handleCopyCaption = () => {
    if (!item) return;
    const caption = `【拾年 · 岁华回忆】\n《${item.title}》\n📅 时光印记：${item.date || '往昔'}\n📍 空间坐标：${item.location || '记忆深处'}\n\n“${item.content || ''}”\n\n—— 录于我的专属数字回忆录《拾年》`;
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast?.('文学分享文案已复制至剪贴板');
  };

  // Web Share API for native social platforms (WeChat/QQ/System)
  const handleWebShare = async () => {
    if (!previewCanvasRef.current || !item) return;
    setIsGenerating(true);
    try {
      const offscreen = document.createElement('canvas');
      await drawCardToCanvas(offscreen);

      offscreen.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `shinian_card_${Date.now()}.png`, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `《拾年》· ${item.title}`,
            text: `“${item.content?.slice(0, 60) || ''}...”`,
            files: [file],
          });
          onShowToast?.('已唤起系统分享面板');
        } else if (navigator.share) {
          await navigator.share({
            title: `《拾年》· ${item.title}`,
            text: `【拾年 · 岁华回忆】《${item.title}》\n${item.content || ''}`,
          });
          onShowToast?.('已呼出分享');
        } else {
          // Fallback to copy caption
          handleCopyCaption();
        }
      }, 'image/png');
    } catch (err) {
      console.warn('Share error or canceled', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* 遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      {/* 模态框本体 */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-2xl bg-[#FAF8F5] rounded-3xl border border-[#2B332E]/15 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] z-10"
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2B332E]/10 bg-white/60 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5B7B6D]" />
            <h3 className="font-serif font-bold text-base text-[#17201B]">
              回忆卡片工坊 · 视觉艺术分享
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#6E7C75] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 核心控制工具条 */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#2B332E]/[0.03] border-b border-[#2B332E]/10 text-xs font-serif">
          {/* 版式选择：拍立得 vs 电影票 */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-[#2B332E]/10 shadow-2xs">
            <button
              onClick={() => setStyle('polaroid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                style === 'polaroid'
                  ? 'bg-[#5B7B6D] text-white font-bold shadow-xs'
                  : 'text-[#6E7C75] hover:text-[#17201B]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> 经典拍立得相纸
            </button>
            <button
              onClick={() => setStyle('ticket')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
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
                className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                  tint === 'ivory'
                    ? 'border-[#5B7B6D] bg-[#5B7B6D]/10 text-[#5B7B6D] font-bold'
                    : 'border-transparent bg-white text-[#6E7C75]'
                }`}
              >
                象牙白
              </button>
              <button
                onClick={() => setTint('sepia')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                  tint === 'sepia'
                    ? 'border-[#A06B4A] bg-[#A06B4A]/10 text-[#A06B4A] font-bold'
                    : 'border-transparent bg-[#FAF5EE] text-[#7A6B60]'
                }`}
              >
                复古暖褐
              </button>
              <button
                onClick={() => setTint('sage')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] ${
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
              className="max-h-[56vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>

        {/* 底部操作行动栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[#2B332E]/10 bg-white/80 backdrop-blur-md">
          <div className="text-xs text-[#6E7C75] font-serif hidden sm:block">
            已生成 2x 高清物理像素画布，可直接保存相册或分享微信好友
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* 复制配文 */}
            <button
              onClick={handleCopyCaption}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#2B332E]/15 text-[#17201B] hover:bg-black/5 text-xs font-serif transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制文案' : '复制朋友圈配文'}
            </button>

            {/* 呼出系统分享 */}
            <button
              onClick={handleWebShare}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#5B7B6D]/30 text-[#5B7B6D] hover:bg-[#5B7B6D]/10 text-xs font-serif font-bold transition-colors disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" /> 社交分享
            </button>

            {/* 保存图片 */}
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B7B6D] hover:bg-[#3E564B] text-white text-xs font-serif font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              保存高清卡片
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
