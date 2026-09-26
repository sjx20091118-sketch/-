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
  isDarkMode?: boolean;
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
  isDarkMode = false
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
        <div className={`p-10 text-center rounded-3xl border border-dashed space-y-3 transition-colors ${
          isDarkMode
            ? 'bg-[#161D19]/80 border-white/15 text-[#FAF8F5]'
            : 'bg-white/80 border-[#5B7B6D]/20 shadow-2xs'
        }`}>
          <div className="w-12 h-12 mx-auto rounded-full bg-[#5B7B6D]/15 flex items-center justify-center text-[#5B7B6D] border border-[#5B7B6D]/20 shadow-2xs">
            <Compass className="w-6 h-6" style={{ color: activeSpineColor }} />
          </div>
          <h3 className={`font-serif font-bold text-base ${isDarkMode ? 'text-[#FAF8F5]' : 'text-[#17201B]'}`}>
            {selectedYear !== 'all' ? `「${selectedYear} 年暂无档案记录」` : '暂无时光驻点'}
          </h3>
          <p className={`text-xs font-serif max-w-sm mx-auto ${isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'}`}>
            {selectedYear !== 'all' ? '岁序常易，此年暂未留存瞬间' : '记忆在等候你的落笔，点击右上角定格当下的欢喜与沉静'}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={onOpenAdd}
              className="px-4 py-2 rounded-xl text-white text-xs font-serif shadow-xs transition-all active:scale-95"
              style={{ backgroundColor: activeSpineColor }}
            >
              {selectedYear !== 'all' ? `＋ 记录 ${selectedYear} 年首个瞬间` : '定格这一刻'}
            </button>
          </div>
        </div>
      ) : (
        /* 时光长廊主体：年份纵深分层与宏阔水墨诗意过渡 */
        <div className="space-y-8 sm:space-y-10">
          {groupedByYear.map(([year, yearItems]) => (
            <div key={year} className="relative">
              {/* 年份界标与水墨大字底纹 */}
              <div className="flex items-center justify-between gap-3 my-4 sm:my-5 relative z-10">
                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xs backdrop-blur-xs transition-colors ${
                  isDarkMode
                    ? 'bg-[#18201C]/95 border-white/15 text-[#FAF8F5]'
                    : 'bg-white/95 border-[#5B7B6D]/20 text-[#17201B]'
                }`}>
                  <span 
                    className="w-2 h-2 rounded-full animate-pulse" 
                    style={{ backgroundColor: activeSpineColor }}
                  />
                  <span className={`font-serif font-bold text-sm sm:text-base tracking-wide ${isDarkMode ? 'text-[#FAF8F5]' : 'text-[#17201B]'}`}>
                    {year} 年纪
                  </span>
                  <span className={`text-[11px] font-sans font-medium pl-1.5 border-l ${
                    isDarkMode ? 'text-[#A0B0A7] border-white/15' : 'text-[#6E7C75] border-[#5B7B6D]/15'
                  }`}>
                    {yearItems.length} 篇光影
                  </span>
                </div>
                <div className={`h-[1px] flex-1 bg-gradient-to-r ${
                  isDarkMode
                    ? 'from-white/20 via-white/10 to-transparent'
                    : 'from-[#5B7B6D]/30 via-[#5B7B6D]/10 to-transparent'
                }`} />
                {/* 水墨年份底纹 */}
                <div 
                  aria-hidden="true"
                  className={`select-none pointer-events-none font-serif font-extrabold tracking-tighter text-5xl sm:text-6xl md:text-7xl leading-none shrink-0 translate-y-0.5 ${
                    isDarkMode ? 'text-white/[0.08]' : 'text-[#2B332E]/[0.08]'
                  }`}
                >
                  {year}
                </div>
              </div>

              {/* 轴线容器 */}
              <div className="relative pl-7 sm:pl-9 space-y-7">
                {/* 贯穿时间导轨线条 */}
                <div 
                  className={`absolute left-[13px] sm:left-[17px] top-4 bottom-4 w-[2px] rounded-full pointer-events-none overflow-hidden ${
                    isDarkMode ? 'bg-white/15' : 'bg-[#5B7B6D]/30'
                  }`}
                >
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
                  const isExplicitPhoto = item.mediaType === 'image' || item.id === 't-102' || item.title?.includes('单车道') || item.title?.includes('蝉鸣') || item.title?.includes('放学');
                  const isVideo = !isExplicitPhoto && (item.mediaType === 'video' || Boolean(item.video) || Boolean(item.image && isVideoMedia(item.image)));
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
                      {/* 时间节点 */}
                      <div className="absolute -left-[27px] sm:-left-[31px] top-6 z-10 flex items-center justify-center">
                        <motion.div
                          whileHover={{ scale: 1.3 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center shadow-xs cursor-pointer border ${
                            isDarkMode
                              ? 'bg-[#18201C] border-white/20'
                              : 'bg-[#FAF8F5] border-[#5B7B6D]/30'
                          }`}
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

                      {/* 拍立得式回忆卡片结构 */}
                      <TiltCard
                        maxTilt={2.5}
                        glareOpacity={0.12}
                        className={`rounded-3xl border transition-all duration-300 backdrop-blur-xs overflow-hidden ${
                          isDarkMode
                            ? 'bg-[#151D19]/90 border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-white/25 text-[#FAF8F5]'
                            : 'bg-white/95 border-[#2B332E]/[0.08] hover:border-[#5B7B6D]/35 shadow-[0_4px_22px_-4px_rgba(43,51,46,0.06)] text-[#2B332E]'
                        }`}
                      >
                        <article className="p-4 sm:p-6 flex flex-col justify-between">
                          {/* 影像画幅 */}
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
                                <div className={`relative rounded-2xl overflow-hidden border shadow-xs group/img ${
                                  isDarkMode ? 'bg-[#1C2621] border-white/10' : 'bg-[#F2EFE9] border-[#2B332E]/[0.08]'
                                }`}>
                                  <div className="aspect-16/9 sm:aspect-21/9 max-h-[290px] overflow-hidden">
                                    <img
                                      src={item.image}
                                      alt={item.title}
                                      loading="lazy"
                                      className="w-full h-full object-cover group-hover/img:scale-102 transition-transform duration-500 ease-out"
                                    />
                                  </div>
                                  <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono tracking-wider text-white select-none">
                                    MEMOIR · {item.date}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}

                          {/* 纯净日期标题与正文 */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`font-serif font-bold text-base sm:text-lg tracking-tight ${
                                isDarkMode ? 'text-[#FAF8F5]' : 'text-[#17201B]'
                              }`}>
                                {meta.monthDay}
                              </span>
                              {meta.season && (
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-sans font-medium ${
                                  isDarkMode
                                    ? 'bg-white/10 text-[#FAF8F5]'
                                    : 'bg-[#5B7B6D]/10 text-[#5B7B6D]'
                                }`}>
                                  {meta.season}
                                </span>
                              )}
                            </div>

                            {/* 记忆标题 */}
                            <h3 className={`text-base sm:text-lg font-serif font-bold tracking-tight leading-snug transition-colors ${
                              isDarkMode ? 'text-[#FAF8F5] group-hover:text-amber-200' : 'text-[#17201B] group-hover:text-[#5B7B6D]'
                            }`}>
                              {item.title}
                            </h3>

                            {/* 正文 */}
                            <p className={`text-xs sm:text-sm leading-[1.8] font-serif whitespace-pre-line ${
                              isDarkMode ? 'text-[#C2CDC7]' : 'text-[#2B332E]/90'
                            }`}>
                              {item.content}
                            </p>
                          </div>

                          {/* 下部分：操作栏沉底 */}
                          <div className={`mt-5 pt-3.5 border-t flex flex-wrap items-center justify-between gap-2.5 ${
                            isDarkMode ? 'border-white/10' : 'border-[#2B332E]/[0.06]'
                          }`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {item.location && (
                                <div className={`flex items-center gap-1 text-xs font-serif truncate max-w-[160px] sm:max-w-[240px] ${
                                  isDarkMode ? 'text-[#A0B0A7]' : 'text-[#6E7C75]'
                                }`}>
                                  <MapPin className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
                                  <span className="truncate">{item.location}</span>
                                </div>
                              )}
                              {item.tag && (
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium font-serif shrink-0 border ${
                                  isDarkMode
                                    ? 'bg-white/10 border-white/15 text-[#C2CDC7]'
                                    : 'bg-[#FAF8F5] border-[#2B332E]/[0.08] text-[#5B7B6D]'
                                }`}>
                                  {item.tag}
                                </span>
                              )}
                            </div>

                            {/* 右下角：朗诵、删除、分享 */}
                            <div className="flex items-center gap-1.5 ml-auto shrink-0">
                              <button
                                type="button"
                                onClick={() => onPlayTts(`${item.title}。${item.content}`)}
                                title="朗诵时光心事"
                                className={`p-1.5 rounded-xl transition-colors active:scale-90 ${
                                  isDarkMode
                                    ? 'text-[#A0B0A7] hover:text-[#FAF8F5] hover:bg-white/10'
                                    : 'text-[#6E7C75]/70 hover:text-[#5B7B6D] hover:bg-[#FAF8F5]'
                                }`}
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onDelete(item)}
                                title="抹去此瞬间"
                                className={`p-1.5 rounded-xl transition-colors active:scale-90 ${
                                  isDarkMode
                                    ? 'text-[#A0B0A7]/50 hover:text-red-400 hover:bg-red-500/10'
                                    : 'text-[#6E7C75]/40 hover:text-red-500 hover:bg-red-50'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onShare(item)}
                                title="生成岁月艺术卡片分享"
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-serif font-medium transition-all border active:scale-95 shadow-2xs ${
                                  isDarkMode
                                    ? 'bg-[#1E2823] hover:bg-[#25322C] border-white/15 text-[#FAF8F5]'
                                    : 'bg-[#FAF8F5] hover:bg-[#5B7B6D]/10 border-[#5B7B6D]/20 text-[#5B7B6D]'
                                }`}
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
