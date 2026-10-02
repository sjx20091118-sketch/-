import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';

interface PoeticPrologueModalProps {
  isOpen: boolean;
  onClose: () => void;
  isReplay?: boolean;
  isFirstLogin?: boolean;
  currentTheme?: HealingTheme;
  isDarkMode?: boolean;
}

interface Stanza {
  lines: string[];
  isCenterClimax?: boolean;
}

interface ProloguePage {
  id: string;
  stanzas: Stanza[];
}

// 4 页诗意分卷：单页容量适度舒展，正文左对齐，末尾宏章居中
const PROLOGUE_PAGES: ProloguePage[] = [
  {
    id: 'page-1',
    stanzas: [
      {
        lines: [
          '人世如长河，忽然而已。',
          '我们总以为，来日方长。'
        ]
      },
      {
        lines: [
          '于是那些一起走过的路，',
          '那些说过的话，见过的人，',
          '那些再普通不过的清晨与黄昏，',
          '都来不及好好记下。'
        ]
      }
    ]
  },
  {
    id: 'page-2',
    stanzas: [
      {
        lines: [
          '直到有一天，',
          '我们忽然发现，有些人已经走远，',
          '有些地方再也没有去过，',
          '有些故事，也只剩下模糊的轮廓。'
        ]
      },
      {
        lines: [
          '才明白，',
          '时间最容易带走的，',
          '不是那些轰轰烈烈的往事，',
          '而是那些曾以为不会忘记的寻常。'
        ]
      }
    ]
  },
  {
    id: 'page-3',
    stanzas: [
      {
        lines: [
          '所以，才有了「拾年」。',
          '留下照片，留下故事，',
          '留下一个名字，一件旧物，',
          '也留下那些本以为不必记录的时刻。'
        ]
      },
      {
        lines: [
          '不是为了留住时间。',
          '我们留不住时间。',
          '只是想在很多年以后，',
          '当我们已经走过很远的路，',
          '还能回到这里。'
        ]
      }
    ]
  },
  {
    id: 'page-4',
    stanzas: [
      {
        lines: [
          '看看曾经走过的地方，',
          '想起曾经遇见的人，',
          '也重新看见那个',
          '认真生活过的自己。'
        ]
      },
      {
        lines: [
          '然后明白：',
          '有些过去并没有消失。',
          '它只是被时间安静地收好，',
          '等我们再次回头。'
        ]
      },
      {
        lines: [
          '岁华清照，拾年归处。',
          '落笔即是长卷，开篇便是重逢。'
        ],
        isCenterClimax: true
      }
    ]
  }
];

interface StardustParticle {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  currentAlpha: number;
  speedY: number;
  speedX: number;
  twinklePhase: number;
  twinkleSpeed: number;
  layer: 1 | 2 | 3;
}

interface WaveSprayParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export const PoeticPrologueModal: React.FC<PoeticPrologueModalProps> = ({
  isOpen,
  onClose,
  isReplay = false,
  isFirstLogin = false,
  currentTheme,
  isDarkMode = false
}) => {
  // 分页状态
  const [currentPageIdx, setCurrentPageIdx] = useState<number>(0);
  const [pageCharCount, setPageCharCount] = useState<number>(0);
  const [isTextClearing, setIsTextClearing] = useState<boolean>(false);
  const [isAllPagesComplete, setIsAllPagesComplete] = useState<boolean>(false);

  // 海浪消融与滑动解锁状态
  const [isExitingWave, setIsExitingWave] = useState<boolean>(false);
  const [waveProgress, setWaveProgress] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  // 苹果毛玻璃滑动胶囊 (Slide-to-Unlock)
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef<number>(0);
  const initialDragXRef = useRef<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<StardustParticle[]>([]);
  const waveSpraysRef = useRef<WaveSprayParticle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const waveStartTimeRef = useRef<number | null>(null);

  // 调色板核心颜色解析
  const primary = currentTheme?.primary || '#5B7B6D';
  const primaryDark = currentTheme?.primaryDark || '#3E564B';
  const accent = currentTheme?.accent || '#4EBA86';
  const primaryRgb = currentTheme?.primaryRgb || '91, 123, 109';
  const primaryDarkRgb = currentTheme?.primaryDarkRgb || '62, 86, 75';
  const accentRgb = currentTheme?.accentRgb || '78, 186, 134';

  const safePageIdx = Math.max(0, Math.min(PROLOGUE_PAGES.length - 1, currentPageIdx));
  const currentPage = PROLOGUE_PAGES[safePageIdx] || PROLOGUE_PAGES[0];

  // 计算当前页的总字数
  const totalCharsInPage = useMemo(() => {
    if (!currentPage?.stanzas) return 0;
    return currentPage.stanzas.reduce((acc, s) => {
      return acc + s.lines.reduce((lAcc, l) => lAcc + Array.from(l).length, 0);
    }, 0);
  }, [currentPage]);

  // 重置整个模态框
  useEffect(() => {
    if (isOpen) {
      setCurrentPageIdx(0);
      setPageCharCount(0);
      setIsTextClearing(false);
      setIsAllPagesComplete(false);
      setIsExitingWave(false);
      setWaveProgress(0);
      setIsUnlocked(false);
      setDragX(0);
      setIsDragging(false);
      waveStartTimeRef.current = null;
      waveSpraysRef.current = [];
      sound.playWaterDrop(640);
    }
  }, [isOpen]);

  // ================= 严格单线程时间驱动打字机：精准 1 秒 6 字 (166ms/字) =================
  useEffect(() => {
    if (!isOpen || isExitingWave || isTextClearing || isAllPagesComplete) return;

    // 每一跳严格为 166ms (精准 1秒6字)
    const interval = setInterval(() => {
      setPageCharCount((prev) => {
        const next = prev + 1;

        if (next >= totalCharsInPage) {
          clearInterval(interval);

          // 当前页打完，判断是否还有下一页
          if (currentPageIdx < PROLOGUE_PAGES.length - 1) {
            // 停留 1.5 秒让用户从容品读完当前页
            setTimeout(() => {
              // 触发卡片内文字平滑淡出清空（卡片本身绝对静止固定高度）
              setIsTextClearing(true);
              sound.playWaterDrop(720);

              setTimeout(() => {
                setCurrentPageIdx((p) => Math.min(PROLOGUE_PAGES.length - 1, p + 1));
                setPageCharCount(0);
                setIsTextClearing(false);
              }, 350);
            }, 1500);
          } else {
            // 最后一页（第4页）全部打完：触发全部完成标志，唤出滑动胶囊
            setIsAllPagesComplete(true);
          }

          return totalCharsInPage;
        }

        return next;
      });
    }, 166);

    return () => clearInterval(interval);
  }, [isOpen, currentPageIdx, totalCharsInPage, isExitingWave, isTextClearing, isAllPagesComplete]);

  // 触发从左下角到右上角的海浪潮汐消融
  const triggerWaveExit = useCallback(() => {
    if (isUnlocked || isExitingWave) return;

    setIsUnlocked(true);
    setIsExitingWave(true);
    waveStartTimeRef.current = Date.now();
    sound.playSealStamp();
    sound.playWaterDrop(920);

    try {
      localStorage.setItem('shinian_prologue_v1_seen', 'true');
    } catch {}

    setTimeout(() => {
      onClose();
    }, 950);
  }, [isUnlocked, isExitingWave, onClose]);

  // Canvas 物理引擎：四层景深星尘 + 主题色星云 + 左下角向右上角流体海浪消融
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };
    window.addEventListener('resize', handleResize);

    const initParticles = () => {
      const particles: StardustParticle[] = [];
      const countL1 = Math.min(Math.floor((width * height) / 9500), 100);
      for (let i = 0; i < countL1; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 0.8 + 0.35,
          baseAlpha: Math.random() * 0.35 + 0.15,
          currentAlpha: 0,
          speedY: -(Math.random() * 0.08 + 0.02),
          speedX: (Math.random() - 0.5) * 0.04,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.02 + 0.01,
          layer: 1
        });
      }

      const countL2 = Math.min(Math.floor((width * height) / 18000), 45);
      for (let i = 0; i < countL2; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.4 + 0.7,
          baseAlpha: Math.random() * 0.55 + 0.25,
          currentAlpha: 0,
          speedY: -(Math.random() * 0.15 + 0.05),
          speedX: (Math.random() - 0.5) * 0.08,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.035 + 0.018,
          layer: 2
        });
      }

      particlesRef.current = particles;
    };

    initParticles();

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const time = Date.now() * 0.001;

      // 1. 深度适配当前调色板的背景渐变底色
      if (isDarkMode) {
        const bgGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.35,
          0,
          width * 0.5,
          height * 0.5,
          Math.max(width, height) * 0.85
        );
        bgGrad.addColorStop(0, `rgba(${primaryRgb}, 0.24)`);
        bgGrad.addColorStop(0.5, '#0B1411');
        bgGrad.addColorStop(1, '#050807');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      } else {
        const bgGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.25,
          0,
          width * 0.5,
          height * 0.6,
          Math.max(width, height) * 0.8
        );
        bgGrad.addColorStop(0, '#FFFFFF');
        bgGrad.addColorStop(0.35, `rgba(${primaryRgb}, 0.1)`);
        bgGrad.addColorStop(0.75, '#F5F7F5');
        bgGrad.addColorStop(1, '#EAEFEA');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. 主题色流体星云呼吸光斑
      const nebulaX = width * (0.5 + Math.sin(time * 0.16) * 0.08);
      const nebulaY = height * (0.42 + Math.cos(time * 0.12) * 0.06);
      const nebulaGrad = ctx.createRadialGradient(
        nebulaX,
        nebulaY,
        0,
        nebulaX,
        nebulaY,
        Math.max(width, height) * 0.65
      );
      nebulaGrad.addColorStop(0, `rgba(${primaryRgb}, ${isDarkMode ? 0.28 : 0.14})`);
      nebulaGrad.addColorStop(0.55, `rgba(${primaryRgb}, ${isDarkMode ? 0.08 : 0.03})`);
      nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. 渲染四层景深星尘微粒
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y < -15) {
          p.y = height + 15;
          p.x = Math.random() * width;
        }
        if (p.x < -15) p.x = width + 15;
        if (p.x > width + 15) p.x = -15;

        const wave = Math.sin(time * 2.2 + p.twinklePhase);
        p.currentAlpha = Math.max(0.06, p.baseAlpha + wave * 0.3);

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        if (isDarkMode) {
          ctx.fillStyle = p.layer === 2
            ? `rgba(${accentRgb}, ${p.currentAlpha})`
            : `rgba(240, 245, 242, ${p.currentAlpha * 0.8})`;
          if (p.layer === 2) {
            ctx.shadowColor = `rgba(${accentRgb}, 0.6)`;
            ctx.shadowBlur = 5;
          }
        } else {
          ctx.fillStyle = `rgba(${primaryRgb}, ${p.currentAlpha * 0.65})`;
        }

        ctx.fill();
        ctx.restore();
      }

      // 4. 左下角向右上角席卷的三层流体水墨海浪潮汐消融特效
      if (waveStartTimeRef.current) {
        const elapsed = Date.now() - waveStartTimeRef.current;
        const duration = 900;
        const progress = Math.min(elapsed / duration, 1);
        setWaveProgress(progress);

        const easeProg = 1 - Math.pow(1 - progress, 3);
        const maxDiagonal = Math.hypot(width, height) * 1.35;
        const waveFrontDist = maxDiagonal * easeProg;

        const angle = Math.atan2(height, width);

        const waveLayers = [
          {
            offset: -120,
            amplitude: 45,
            freq: 0.008,
            color: isDarkMode
              ? `rgba(${primaryRgb}, 0.55)`
              : `rgba(${primaryRgb}, 0.38)`,
            crestColor: 'rgba(255, 255, 255, 0.65)',
            lineWidth: 2.5
          },
          {
            offset: -50,
            amplitude: 60,
            freq: 0.006,
            color: isDarkMode
              ? 'rgba(15, 28, 23, 0.85)'
              : 'rgba(230, 238, 234, 0.85)',
            crestColor: isDarkMode ? accent : primary,
            lineWidth: 3.5
          },
          {
            offset: 30,
            amplitude: 75,
            freq: 0.005,
            color: isDarkMode
              ? 'rgba(7, 12, 10, 0.98)'
              : '#FAFCFA',
            crestColor: 'rgba(255, 255, 255, 0.95)',
            lineWidth: 4.5
          }
        ];

        waveLayers.forEach((layer, lIdx) => {
          const dist = waveFrontDist + layer.offset;
          if (dist < -100) return;

          ctx.save();
          ctx.beginPath();

          const numSteps = 70;
          const spanLength = Math.hypot(width, height) * 1.6;

          ctx.moveTo(-100, height + 100);

          for (let s = 0; s <= numSteps; s++) {
            const u = (s / numSteps - 0.5) * spanLength;
            const waveHeight = Math.sin(u * layer.freq + time * 6 + lIdx * 1.5) * layer.amplitude
              + Math.cos(u * layer.freq * 2.1 + time * 4) * (layer.amplitude * 0.3);

            const midX = 0 + Math.cos(angle) * (dist + waveHeight) - Math.sin(angle) * u;
            const midY = height - Math.sin(angle) * (dist + waveHeight) - Math.cos(angle) * u;

            if (s === 0) {
              ctx.lineTo(midX, midY);
            } else {
              ctx.lineTo(midX, midY);
            }

            if (lIdx === 1 && Math.random() < 0.22 && progress < 0.85) {
              waveSpraysRef.current.push({
                x: midX + (Math.random() - 0.5) * 15,
                y: midY + (Math.random() - 0.5) * 15,
                vx: Math.cos(angle) * (Math.random() * 3 + 2) + (Math.random() - 0.5) * 2,
                vy: -Math.sin(angle) * (Math.random() * 3 + 2) + (Math.random() - 0.5) * 2,
                radius: Math.random() * 2.5 + 1.2,
                alpha: 0.9,
                color: Math.random() > 0.6 ? accent : '#FFFFFF'
              });
            }
          }

          ctx.lineTo(width + 100, -100);
          ctx.lineTo(-100, -100);
          ctx.closePath();

          ctx.fillStyle = layer.color;
          ctx.fill();

          ctx.strokeStyle = layer.crestColor;
          ctx.lineWidth = layer.lineWidth;
          ctx.shadowColor = layer.crestColor;
          ctx.shadowBlur = 12;
          ctx.stroke();

          ctx.restore();
        });

        const sprays = waveSpraysRef.current;
        for (let i = sprays.length - 1; i >= 0; i--) {
          const sp = sprays[i];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.alpha *= 0.93;
          sp.radius *= 0.98;

          ctx.save();
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = sp.alpha;
          ctx.shadowColor = sp.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();

          if (sp.alpha < 0.02 || sp.radius < 0.3) {
            sprays.splice(i, 1);
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isOpen, isDarkMode, currentTheme, primary, primaryRgb, accent, accentRgb]);

  // 滑动胶囊拖拽事件处理
  const getMaxDragDistance = useCallback(() => {
    if (!sliderTrackRef.current) return 240;
    const trackWidth = sliderTrackRef.current.clientWidth;
    const thumbWidth = 46;
    return Math.max(80, trackWidth - thumbWidth - 10);
  }, []);

  const handleDragStart = (clientX: number) => {
    if (isUnlocked || isExitingWave) return;
    setIsDragging(true);
    dragStartXRef.current = clientX;
    initialDragXRef.current = dragX;
  };

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || isUnlocked || isExitingWave) return;
    const delta = clientX - dragStartXRef.current;
    const maxDist = getMaxDragDistance();
    const newX = Math.max(0, Math.min(maxDist, initialDragXRef.current + delta));

    requestAnimationFrame(() => {
      setDragX(newX);
      if (newX >= maxDist * 0.78) {
        setDragX(maxDist);
        setIsDragging(false);
        triggerWaveExit();
      }
    });
  }, [isDragging, isUnlocked, isExitingWave, getMaxDragDistance, triggerWaveExit]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging || isUnlocked || isExitingWave) return;
    setIsDragging(false);
    const maxDist = getMaxDragDistance();
    if (dragX < maxDist * 0.78) {
      setDragX(0);
    }
  }, [isDragging, isUnlocked, isExitingWave, dragX, getMaxDragDistance]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };
    const onMouseUp = () => {
      handleDragEnd();
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (!isOpen) return null;

  const maxDrag = getMaxDragDistance();
  const dragProgress = maxDrag > 0 ? Math.min(1, Math.max(0, dragX / maxDrag)) : 0;

  // 渲染当前页字符计数累计
  let pageCharCounter = 0;

  return (
    <AnimatePresence>
      <motion.div
        key="poetic-prologue-scroll-screen"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isExitingWave ? Math.max(0, 1 - waveProgress * 1.4) : 1,
          scale: isExitingWave ? 1 + waveProgress * 0.05 : 1,
          filter: isExitingWave ? `blur(${waveProgress * 14}px)` : 'blur(0px)'
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed inset-0 z-[10000] w-screen h-screen flex flex-col justify-between items-center px-4 pt-4 sm:pt-7 pb-6 sm:pb-8 select-none overflow-hidden transition-colors duration-500 ${
          isDarkMode ? 'text-white' : 'text-[#213028]'
        }`}
      >
        {/* 背景 Canvas 调色板自适应 + 星海粒子 + 流体海浪消融引擎 */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* ================= 1. 顶部微光控制栏（纯粹极简，仅在非首次登录时保留右上方返回按键） ================= */}
        <div className="relative z-30 w-full max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto flex items-center justify-end px-2 shrink-0 h-10">
          {!isFirstLogin && (
            <button
              onClick={() => {
                sound.playWaterDrop(840);
                triggerWaveExit();
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-serif flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer backdrop-blur-xl border border-white/30 dark:border-white/15 hover:bg-white/40 dark:hover:bg-white/15"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
                color: isDarkMode ? '#FAF8F5' : '#223028',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}
              title="关闭长卷返回"
            >
              <span className="text-[11px] tracking-wider">返回空间</span>
              <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
            </button>
          )}
        </div>

        {/* ================= 2. 中央核心：宏大悬浮毛玻璃大舱 (严格锁定固定高度，永不跳动) ================= */}
        <div
          className="relative z-10 w-[92vw] max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto rounded-3xl p-7 sm:p-10 md:p-12 transition-colors duration-500 h-[460px] sm:h-[490px] md:h-[520px] flex flex-col justify-start items-start shrink-0 overflow-hidden"
          style={{
            backgroundColor: isDarkMode
              ? `rgba(0, 0, 0, 0.45)`
              : `rgba(255, 255, 255, 0.78)`,
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: isDarkMode
              ? `1px solid rgba(${primaryRgb}, 0.22)`
              : `1px solid rgba(${primaryRgb}, 0.18)`,
            boxShadow: isDarkMode
              ? `0 24px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(${primaryRgb}, 0.12)`
              : `0 20px 60px rgba(${primaryDarkRgb}, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.8)`
          }}
        >
          {/* 卡片内部文字层（翻页时平滑淡出淡入，卡片容器本身绝对固定静止） */}
          <div
            className="w-full flex flex-col space-y-4 sm:space-y-5 md:space-y-6 transition-opacity duration-350"
            style={{ opacity: isTextClearing ? 0 : 1 }}
          >
            {(currentPage?.stanzas || []).map((stanza, sIdx) => {
              const isCenter = stanza.isCenterClimax;

              return (
                <div
                  key={`stanza-${currentPageIdx}-${sIdx}`}
                  className={`w-full flex flex-col ${
                    isCenter
                      ? 'items-center text-center pt-3 sm:pt-4 border-t border-current/10 space-y-2 sm:space-y-3'
                      : 'items-start text-left space-y-2 sm:space-y-2.5'
                  }`}
                >
                  {stanza.lines.map((line, lIdx) => {
                    const lineChars = Array.from(line);
                    const lineStartIndex = pageCharCounter;
                    const lineEndIndex = pageCharCounter + lineChars.length;
                    pageCharCounter += lineChars.length;

                    // 判定当前行可见字数
                    const visibleCharCountInLine = Math.max(
                      0,
                      Math.min(lineChars.length, pageCharCount - lineStartIndex)
                    );
                    const visibleText = lineChars.slice(0, visibleCharCountInLine).join('');

                    // 光标判定
                    const isCursorOnThisLine =
                      !isAllPagesComplete &&
                      pageCharCount >= lineStartIndex &&
                      pageCharCount < lineEndIndex;

                    return (
                      <div
                        key={`line-${currentPageIdx}-${sIdx}-${lIdx}`}
                        className={`w-full flex ${isCenter ? 'justify-center' : 'justify-start'} min-h-[1.7em] overflow-visible`}
                      >
                        <p
                          className={`font-serif tracking-[0.2em] sm:tracking-[0.28em] pl-[0.2em] sm:pl-[0.28em] leading-relaxed select-none transition-all duration-300 ${
                            isCenter
                              ? isDarkMode
                                ? 'text-base sm:text-lg md:text-xl font-medium text-[#F4EDE2]'
                                : 'text-base sm:text-lg md:text-xl font-bold'
                              : isDarkMode
                              ? 'text-[14px] sm:text-[16px] md:text-[17px] text-[#DDE3EA]/90'
                              : 'text-[14px] sm:text-[16px] md:text-[17px] text-[#2E4037]'
                          }`}
                          style={{
                            fontFamily: '"Noto Serif SC", "Songti SC", "SimSun", Georgia, serif',
                            color: isCenter
                              ? isDarkMode
                                ? '#F4EDE2'
                                : primaryDark
                              : undefined,
                            textShadow: isCenter && isDarkMode
                              ? `0 0 16px rgba(${accentRgb}, 0.45)`
                              : undefined
                          }}
                        >
                          {visibleText}

                          {/* 自适应跟随光标 (自动随当前字跃进与换行) */}
                          {isCursorOnThisLine && (
                            <span className="inline-flex items-center ml-0.5 relative -top-[1px] align-middle">
                              <span
                                className="inline-block w-[2.5px] h-[1.15em] rounded-full animate-pulse transition-opacity"
                                style={{
                                  backgroundColor: isDarkMode ? accent : primaryDark,
                                  boxShadow: `0 0 10px ${isDarkMode ? accent : primary}`
                                }}
                              />
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* 前三幕专属：卡片右下角落款签名（非打字、打字开始时伴随过场动画平滑渐显） */}
          {currentPageIdx < 3 && (
            <motion.div
              key={`author-signature-${currentPageIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{
                opacity: isTextClearing ? 0 : pageCharCount > 0 ? 0.72 : 0,
                y: isTextClearing ? 4 : 0
              }}
              transition={{
                duration: 0.85,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="absolute bottom-5 sm:bottom-7 right-7 sm:right-10 pointer-events-none select-none flex items-center"
            >
              <span
                className="text-xs sm:text-[13px] font-serif tracking-[0.22em] pl-[0.22em] italic"
                style={{
                  fontFamily: '"Noto Serif SC", "Songti SC", "SimSun", Georgia, serif',
                  color: isDarkMode ? '#BCC8C0' : primaryDark
                }}
              >
                —— 「拾年」作者
              </span>
            </motion.div>
          )}
        </div>

        {/* ================= 3. 底部滑动胶囊 (文字全部打完后方才渐显升腾出现) ================= */}
        <div className="relative z-20 w-full max-w-[340px] sm:max-w-[400px] mx-auto pb-safe shrink-0 min-h-[58px] flex flex-col items-center justify-end">
          <AnimatePresence>
            {isAllPagesComplete && !isExitingWave && (
              <motion.div
                key="slide-unlock-capsule"
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Apple Glass 磨砂滑动胶囊轨道 */}
                <div
                  ref={sliderTrackRef}
                  className="relative w-full h-14 rounded-full backdrop-blur-2xl overflow-hidden flex items-center p-1.5 select-none touch-none transition-all duration-500"
                  style={{
                    backgroundColor: isDarkMode
                      ? `rgba(${primaryRgb}, 0.12)`
                      : `rgba(255, 255, 255, 0.72)`,
                    border: isDarkMode
                      ? `1px solid rgba(${primaryRgb}, 0.32)`
                      : `1px solid rgba(${primaryRgb}, 0.24)`,
                    boxShadow: isDarkMode
                      ? `0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 0 20px rgba(${primaryRgb}, 0.15)`
                      : `0 8px 28px rgba(43, 51, 46, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.9), 0 0 16px rgba(${primaryRgb}, 0.1)`
                  }}
                  onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                  onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                  onTouchEnd={handleDragEnd}
                  onMouseDown={(e) => handleDragStart(e.clientX)}
                >
                  {/* 拖动尾随温暖流光 */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-75 pointer-events-none"
                    style={{
                      width: `${dragX + 46}px`,
                      background: isDarkMode
                        ? `linear-gradient(90deg, rgba(${primaryRgb}, 0.45) 0%, rgba(${accentRgb}, 0.28) 100%)`
                        : `linear-gradient(90deg, rgba(${primaryRgb}, 0.3) 0%, rgba(${accentRgb}, 0.2) 100%)`
                    }}
                  />

                  {/* 居中流光扫字 (Slide to Unlock Shimmer - 点击或滑动均可直接开篇) */}
                  <div
                    className="absolute inset-0 flex items-center justify-center cursor-pointer transition-opacity duration-150 pl-6 sm:pl-8 z-0"
                    style={{ opacity: Math.max(0, 1 - dragProgress * 1.5) }}
                    onClick={() => triggerWaveExit()}
                  >
                    <span
                      className="text-xs sm:text-[13px] font-serif tracking-[0.3em] select-none text-transparent bg-clip-text animate-pulse"
                      style={{
                        fontFamily: '"Noto Serif SC", serif',
                        backgroundImage: isDarkMode
                          ? `linear-gradient(90deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(255, 255, 255, 0.45) 100%)`
                          : `linear-gradient(90deg, rgba(${primaryDarkRgb}, 0.55) 0%, rgba(${primaryDarkRgb}, 0.98) 50%, rgba(${primaryDarkRgb}, 0.55) 100%)`
                      }}
                    >
                      滑动启封拾年 · 步入长卷
                    </span>
                  </div>

                  {/* 苹果高光毛玻璃滑钮 (Thumb Button) */}
                  <div
                    className={`relative w-11 h-11 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 z-10 transition-transform duration-75 ${
                      isDragging ? 'scale-105' : 'scale-100'
                    }`}
                    style={{
                      transform: `translateX(${dragX}px)`,
                      transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      background: isDarkMode
                        ? `linear-gradient(135deg, #FFFFFF 0%, #F3F6F4 100%)`
                        : `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
                      border: isDarkMode
                        ? `1px solid rgba(255, 255, 255, 0.85)`
                        : `1px solid rgba(255, 255, 255, 0.35)`,
                      boxShadow: isDarkMode
                        ? `0 4px 16px rgba(0, 0, 0, 0.35), 0 0 16px rgba(${accentRgb}, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.9)`
                        : `0 4px 16px rgba(${primaryDarkRgb}, 0.38), inset 0 1px 1.5px rgba(255, 255, 255, 0.5)`
                    }}
                  >
                    <ChevronRight
                      className="w-5 h-5 transition-transform group-hover:translate-x-0.5"
                      style={{
                        color: isDarkMode ? primaryDark : '#FFFFFF'
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
