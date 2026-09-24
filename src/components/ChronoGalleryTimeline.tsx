import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  MapPin,
  Compass,
  Plus,
  Volume2,
  Trash2,
  Share2,
  Quote
} from 'lucide-react';
import { TimelineItem } from '../types';
import { isVideoMedia } from '../utils/mediaStorage';
import { TimelineVideoCard } from './TimelineVideoCard';
import { TiltCard } from './TiltCard';

interface ChronoGalleryTimelineProps {
  items: TimelineItem[];
  selectedYear: string;
  themeColor?: string;
  onSelectYear: (year: string) => void;
  onOpenAdd: () => void;
  onPlayTts: (text: string) => void;
  onDelete: (item: TimelineItem) => void;
  onOpenYearPicker: () => void;
  onShare: (item: TimelineItem) => void;
}

function getYearFromDate(dateStr?: string): string {
  if (!dateStr) return '未知';
  const match = dateStr.match(/^(\d{4})/);
  return match ? match[1] : '未知';
}

function getSeasonName(dateStr?: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/-(\d{2})-/);
  if (!match) return '';
  const month = parseInt(match[1], 10);
  if (month >= 3 && month <= 5) return '初春';
  if (month >= 6 && month <= 8) return '盛夏';
  if (month >= 9 && month <= 11) return '深秋';
  return '凛冬';
}

function formatDateMeta(dateStr?: string) {
  if (!dateStr) return { monthDay: '某日', season: '' };
  const parts = dateStr.split('-');
  const monthDay = parts.length >= 3 ? `${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日` : dateStr;
  return {
    monthDay,
    season: getSeasonName(dateStr),
  };
}

export const ChronoGalleryTimeline: React.FC<ChronoGalleryTimelineProps> = ({
  items,
  selectedYear,
  themeColor,
  onSelectYear,
  onOpenAdd,
  onPlayTts,
  onDelete,
  onOpenYearPicker,
  onShare,
}) => {
  // 过滤并按年份降序聚类
  const groupedByYear = useMemo(() => {
    const filtered = selectedYear === 'all'
      ? items
      : items.filter(item => getYearFromDate(item.date) === selectedYear);

    const groups: Record<string, TimelineItem[]> = {};
    filtered.forEach(item => {
      const y = getYearFromDate(item.date);
      if (!groups[y]) groups[y] = [];
      groups[y].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [items, selectedYear]);

  // 动态光流主题色渐变 (Follow current active theme)
  const activeSpineColor = themeColor || 'var(--theme-primary, #5B7B6D)';

  return (
    <div className="space-y-4">
      {groupedByYear.length === 0 ? (
        /* 空状态 */
        <div className="p-12 text-center bg-white/70 rounded-3xl border border-dashed border-[#5B7B6D]/20 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#5B7B6D]/10 flex items-center justify-center text-[#5B7B6D]">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-base text-[#17201B]">该年份尚无时光驻点</h3>
          <p className="text-xs text-[#6E7C75] font-serif max-w-sm mx-auto">
            记忆在等候你的落笔，点击右上角定格当下的欢喜与沉静
          </p>
          <div className="pt-2 flex justify-center gap-2">
            {selectedYear !== 'all' && (
              <button
                onClick={() => onSelectYear('all')}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#2B332E]/15 text-xs text-[#5B7B6D] font-serif hover:bg-[#FAF8F5]"
              >
                回到全景时光
              </button>
            )}
            <button
              onClick={onOpenAdd}
              className="px-3.5 py-1.5 rounded-xl bg-[#5B7B6D] text-white text-xs font-serif hover:bg-[#3E564B]"
            >
              定格这一刻
            </button>
          </div>
        </div>
      ) : (
        /* 时光长廊主体：年份纵深分层与宏阔水墨诗意过渡 */
        <div className="space-y-8 sm:space-y-10">
          {groupedByYear.map(([year, yearItems]) => (
            <div key={year} className="relative">
              {/* 年份界标与水墨大字底纹：居于「定格瞬间」与下方「拍立得」正中，保留舒适呼吸间距，兼具大气磅礴的墨韵 */}
              <div className="flex items-center justify-between gap-3 my-4 sm:my-5 relative z-10">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#5B7B6D]/20 shadow-xs backdrop-blur-xs">
                  <span 
                    className="w-2 h-2 rounded-full animate-pulse" 
                    style={{ backgroundColor: activeSpineColor }}
                  />
                  <span className="font-serif font-bold text-sm sm:text-base text-[#17201B] tracking-wide">
                    {year} 年纪
                  </span>
                  <span className="text-[11px] text-[#6E7C75] font-sans font-medium pl-1.5 border-l border-[#5B7B6D]/15">
                    {yearItems.length} 篇光影
                  </span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#5B7B6D]/30 via-[#5B7B6D]/10 to-transparent" />
                {/* 宏阔大气质感水墨年份：保留原先大字号的书卷墨气与空间通透感，位置自然衔接不相贴 */}
                <div 
                  aria-hidden="true"
                  className="select-none pointer-events-none font-serif font-extrabold tracking-tighter text-5xl sm:text-6xl md:text-7xl leading-none text-[#2B332E]/[0.08] sm:text-[#2B332E]/[0.10] shrink-0 translate-y-0.5"
                >
                  {year}
                </div>
              </div>

              {/* 轴线容器：外层预留充足 pl-7/sm:pl-9 内边距，绝不裁剪左侧呼吸小圆点 */}
              <div className="relative pl-7 sm:pl-9 space-y-7">
                {/* 贯穿时间导轨线条 */}
                <div 
                  className="absolute left-[13px] sm:left-[17px] top-4 bottom-4 w-[2px] rounded-full bg-gradient-to-b from-[#5B7B6D]/30 via-[#5B7B6D]/45 to-[#5B7B6D]/15 pointer-events-none overflow-hidden"
                >
                  {/* 轴线光流滑行粒子 (Spine Light Pulse)，动态跟随主题色 */}
                  <motion.div
                    className="w-full h-44 rounded-full pointer-events-none opacity-90"
                    style={{
                      background: `linear-gradient(to bottom, transparent 0%, ${activeSpineColor} 50%, transparent 100%)`,
                      boxShadow: `0 0 12px ${activeSpineColor}`
                    }}
                    animate={{ y: ['-100%', '800%'] }}
                    transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
                  />
                </div>

                {yearItems.map((item) => {
                  const isVideo = Boolean(item.video || (item.image && isVideoMedia(item.image)));
                  const hasMedia = Boolean(item.image || item.video);
                  const meta = formatDateMeta(item.date);

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                      className="relative group"
                    >
                      {/* 触感呼吸时间节点：完整保留呼吸光晕，无裁剪无遮挡 */}
                      <div className="absolute -left-[27px] sm:-left-[31px] top-6 z-10 flex items-center justify-center">
                        <motion.div
                          whileHover={{ scale: 1.3 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                          className="w-6 h-6 rounded-full bg-[#FAF8F5] flex items-center justify-center shadow-xs cursor-pointer border border-[#5B7B6D]/30"
                          style={{
                            boxShadow: `0 0 8px ${activeSpineColor}33`
                          }}
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full shadow-2xs transition-colors duration-300"
                            style={{ backgroundColor: activeSpineColor }}
                          />
                        </motion.div>
                      </div>

                      {/* 拍立得式回忆卡片结构 (Polaroid Aesthetic Memoir Card) */}
                      <TiltCard
                        maxTilt={2.5}
                        glareOpacity={0.12}
                        className="rounded-3xl shadow-[0_4px_22px_-4px_rgba(43,51,46,0.06)] hover:shadow-[0_16px_36px_-6px_rgba(43,51,46,0.12)] border border-[#2B332E]/[0.08] hover:border-[#5B7B6D]/35 transition-all duration-300 bg-white/95 backdrop-blur-xs overflow-hidden"
                      >
                        <article className="p-4 sm:p-6 flex flex-col justify-between">
                          {/* 上部分：影像画幅（若有相片/视频）或文墨题跋 */}
                          {hasMedia && (
                            <div className="mb-4">
                              {isVideo ? (
                                <div className="rounded-2xl overflow-hidden border border-black/10 shadow-sm">
                                  <TimelineVideoCard
                                    videoUrl={item.video || item.image!}
                                    poster={item.videoPoster}
                                    title={item.title}
                                    date={item.date}
                                  />
                                </div>
                              ) : item.image ? (
                                <div className="relative rounded-2xl overflow-hidden border border-[#2B332E]/[0.08] shadow-xs group/img bg-[#F2EFE9]">
                                  <div className="aspect-16/9 sm:aspect-21/9 max-h-[290px] overflow-hidden">
                                    <img
                                      src={item.image}
                                      alt={item.title}
                                      loading="lazy"
                                      className="w-full h-full object-cover group-hover/img:scale-102 transition-transform duration-500 ease-out"
                                    />
                                  </div>
                                  {/* 胶片暗房角标 */}
                                  <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-xs text-[10px] font-mono tracking-wider text-white/90 select-none">
                                    MEMOIR · {item.date}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}

                          {/* 中部分：纯净日期标题与时光叙事正文 */}
                          <div className="space-y-2">
                            {/* 优雅日期与季节徽标：精简掉后方冗余的完整日期 */}
                            <div className="flex items-center gap-2">
                              <span className="font-serif font-bold text-base sm:text-lg text-[#17201B] tracking-tight">
                                {meta.monthDay}
                              </span>
                              {meta.season && (
                                <span className="px-2 py-0.5 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D] text-[11px] font-sans font-medium">
                                  {meta.season}
                                </span>
                              )}
                            </div>

                            {/* 记忆标题 */}
                            <h3 className="text-base sm:text-lg font-serif font-bold text-[#17201B] tracking-tight leading-snug group-hover:text-[#5B7B6D] transition-colors">
                              {item.title}
                            </h3>

                            {/* 正文回忆录 */}
                            <p className="text-xs sm:text-sm text-[#2B332E]/90 leading-[1.8] font-serif whitespace-pre-line">
                              {item.content}
                            </p>
                          </div>

                          {/* 下部分：操作栏优雅沉底（避免移动端文字与按钮堆叠） */}
                          <div className="mt-5 pt-3.5 border-t border-[#2B332E]/[0.06] flex flex-wrap items-center justify-between gap-2.5">
                            {/* 左下角：地点坐标与分类便签 */}
                            <div className="flex items-center gap-2 min-w-0">
                              {item.location && (
                                <div className="flex items-center gap-1 text-xs text-[#6E7C75] font-serif truncate max-w-[160px] sm:max-w-[240px]">
                                  <MapPin className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                                  <span className="truncate">{item.location}</span>
                                </div>
                              )}
                              {item.tag && (
                                <span className="px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#2B332E]/[0.08] text-[#5B7B6D] text-[10px] font-medium font-serif shrink-0">
                                  {item.tag}
                                </span>
                              )}
                            </div>

                            {/* 右下角：朗诵、删除、与醒目的分享回忆按钮 */}
                            <div className="flex items-center gap-1.5 ml-auto shrink-0">
                              {/* 朗读 */}
                              <button
                                type="button"
                                onClick={() => onPlayTts(`${item.title}。${item.content}`)}
                                title="朗诵时光心事"
                                className="p-1.5 rounded-xl text-[#6E7C75]/70 hover:text-[#5B7B6D] hover:bg-[#FAF8F5] transition-colors active:scale-90"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>

                              {/* 删除 */}
                              <button
                                type="button"
                                onClick={() => onDelete(item)}
                                title="抹去此瞬间"
                                className="p-1.5 rounded-xl text-[#6E7C75]/40 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {/* 艺术卡片分享 */}
                              <button
                                type="button"
                                onClick={() => onShare(item)}
                                title="生成岁月艺术卡片分享"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#5B7B6D]/10 text-[#5B7B6D] text-xs font-serif font-medium transition-all border border-[#5B7B6D]/20 active:scale-95 shadow-2xs"
                              >
                                <Share2 className="w-3.5 h-3.5 text-[#E88765]" />
                                <span>分享回忆</span>
                              </button>
                            </div>
                          </div>
                        </article>
                      </TiltCard>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
