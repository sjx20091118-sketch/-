import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Volume2, 
  Trash2, 
  Clock, 
  Plus, 
  Filter, 
  CalendarRange, 
  RotateCcw,
  Sparkles,
  Quote,
  Share2
} from 'lucide-react';
import { TimelineItem } from '../types';
import { isVideoMedia } from '../utils/mediaStorage';
import { TimelineVideoCard } from './TimelineVideoCard';
import { TiltCard } from './TiltCard';

interface ChronoGalleryTimelineProps {
  items: TimelineItem[];
  selectedYear: string;
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
  return '隆冬';
}

function formatDateMeta(dateStr?: string): { year: string; monthDay: string; season: string } {
  if (!dateStr) return { year: '', monthDay: '', season: '' };
  const parts = dateStr.split('-');
  const year = parts[0] || '';
  const monthDay = parts.length >= 3 ? `${parts[1]}.${parts[2]}` : dateStr;
  const season = getSeasonName(dateStr);
  return { year, monthDay, season };
}

export const ChronoGalleryTimeline: React.FC<ChronoGalleryTimelineProps> = ({
  items,
  selectedYear,
  onSelectYear,
  onOpenAdd,
  onPlayTts,
  onDelete,
  onOpenYearPicker,
  onShare,
}) => {
  // 筛选并按日期降序排列
  const filteredAndSortedItems = useMemo(() => {
    const list = items.filter(
      (item) => selectedYear === 'all' || getYearFromDate(item.date) === selectedYear
    );
    return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [items, selectedYear]);

  // 按年份分层编目
  const groupedByYear = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    filteredAndSortedItems.forEach((item) => {
      const yr = getYearFromDate(item.date);
      const arr = map.get(yr) || [];
      arr.push(item);
      map.set(yr, arr);
    });
    return Array.from(map.entries());
  }, [filteredAndSortedItems]);

  return (
    <div className="space-y-6">
      {/* 顶部标题与行动区：克制呼吸感 */}
      <div className="flex justify-between items-center pb-1">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#17201B] tracking-wider flex items-center gap-2">
            <span>拾光轴</span>
            <span className="text-xs font-sans font-normal text-[#6E7C75] hidden xs:inline">
              · 空间时光长廊
            </span>
          </h2>
          <p className="text-[11px] text-[#6E7C75] font-serif mt-0.5">
            以光为尺，刻录人间烟火与岁华温存
          </p>
        </div>

        <button
          onClick={onOpenAdd}
          className="flex items-center gap-1 text-xs px-3.5 py-1.5 bg-[#5B7B6D] hover:bg-[#3E564B] text-white rounded-full shadow-xs hover:shadow-sm font-serif font-medium active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> 记录新时光
        </button>
      </div>

      {/* 年份筛选状态指示条（Apple 极简磨砂胶囊） */}
      {selectedYear !== 'all' && (
        <div className="p-3 bg-white/80 backdrop-blur-xs rounded-2xl border border-[#5B7B6D]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#5B7B6D] font-sans shadow-2xs">
          <div className="flex items-center gap-2 font-medium">
            <Filter className="w-3.5 h-3.5 text-[#E88765] shrink-0" />
            <span>
              已定格【<strong className="font-serif font-bold text-[#E88765] text-sm">{selectedYear} 年</strong>】岁月画卷
              <span className="opacity-75 font-normal ml-1">
                （共 {filteredAndSortedItems.length} 篇记忆）
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={onOpenYearPicker}
              className="text-[11px] font-medium text-[#5B7B6D] bg-[#FAF8F5] hover:bg-white px-2.5 py-1 rounded-xl border border-[#5B7B6D]/20 flex items-center gap-1 shadow-2xs transition-all active:scale-95"
            >
              <CalendarRange className="w-3 h-3 text-[#E88765]" /> 切换年份
            </button>
            <button
              onClick={() => onSelectYear('all')}
              className="text-[11px] font-bold text-[#E88765] hover:underline flex items-center gap-1 px-1.5 py-1"
            >
              <RotateCcw className="w-3 h-3" /> 全景时光
            </button>
          </div>
        </div>
      )}

      {/* 空状态：优雅装帧留白 */}
      {filteredAndSortedItems.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-xs p-10 rounded-3xl border border-dashed border-[#5B7B6D]/25 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF8F5] border border-[#5B7B6D]/15 flex items-center justify-center text-[#5B7B6D]">
            <Clock className="w-5 h-5 opacity-70" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-serif font-bold text-[#2B332E]">
              {selectedYear === 'all' ? '拾光册尚待开启' : `暂无 ${selectedYear} 年的记忆纪事`}
            </h3>
            <p className="text-xs text-[#6E7C75] font-serif max-w-sm mx-auto">
              每一抹走过的足迹与微光，都值得在此被郑重收藏。
            </p>
          </div>
          <div className="flex justify-center gap-2.5 pt-2">
            {selectedYear !== 'all' && (
              <button
                onClick={() => onSelectYear('all')}
                className="text-xs px-3.5 py-1.5 bg-[#FAF8F5] text-[#5B7B6D] rounded-full border border-[#5B7B6D]/20 hover:bg-[#E8E4DC] font-medium transition-colors"
              >
                查看全景时光
              </button>
            )}
            <button
              onClick={onOpenAdd}
              className="text-xs px-4 py-1.5 bg-[#5B7B6D] text-white rounded-full hover:bg-[#3E564B] font-serif shadow-xs transition-colors"
            >
              录入第一段记忆
            </button>
          </div>
        </div>
      ) : (
        /* 时光长廊主体：年份纵深分层 */
        <div className="space-y-12">
          {groupedByYear.map(([year, yearItems]) => (
            <div key={year} className="relative">
              {/* 空间水墨年份底纹（Monumental Year Watermark） */}
              <div 
                aria-hidden="true"
                className="absolute right-0 sm:right-4 -top-8 sm:-top-10 select-none pointer-events-none font-serif font-extrabold tracking-tight text-[68px] sm:text-[92px] leading-none text-[#2B332E]/[0.045]"
              >
                {year}
              </div>

              {/* 年份界标与光流导线（Light Spill Spine） */}
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-[#5B7B6D]/20 shadow-2xs backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-[#E88765] animate-pulse" />
                  <span className="font-serif font-bold text-sm text-[#17201B] tracking-wide">
                    {year} 年纪
                  </span>
                  <span className="text-[10px] text-[#6E7C75] font-sans font-medium pl-1 border-l border-[#5B7B6D]/15">
                    {yearItems.length} 篇光影
                  </span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#5B7B6D]/20 via-[#5B7B6D]/10 to-transparent" />
              </div>

              {/* 轴线上的卡片序列与流动光脉冲 */}
              <div className="relative pl-3 sm:pl-4 space-y-7 before:absolute before:left-[15px] sm:before:left-[19px] before:top-3 before:bottom-3 before:w-[1.5px] before:rounded-full before:bg-gradient-to-b before:from-[#5B7B6D]/25 before:via-[#5B7B6D]/45 before:to-[#5B7B6D]/20 overflow-hidden">
                {/* 轴线光流呼吸粒子 (Spine Light Pulse) */}
                <motion.div
                  className="absolute left-[14px] sm:left-[18px] w-[3px] h-36 rounded-full bg-gradient-to-b from-transparent via-[#E88765] to-transparent pointer-events-none z-0 opacity-80"
                  animate={{ y: ['-100%', '800%'] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                />

                {yearItems.map((item, idx) => {
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
                      className="relative pl-6 sm:pl-9 group"
                    >
                      {/* 触感呼吸时间节点（Tactile Concentric Node with Spring） */}
                      <div className="absolute -left-[18px] sm:-left-[22px] top-6 z-10 flex items-center justify-center">
                        <motion.div
                          whileHover={{ scale: 1.35 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                          className="w-5 h-5 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-xs cursor-pointer border border-[#5B7B6D]/20"
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-[#5B7B6D] group-hover:bg-[#E88765] transition-colors duration-300 shadow-2xs" />
                        </motion.div>
                      </div>

                      {/* 策展级卡片排版：根据是否有影像自适应，并赋予 3D 拟物视角与镜面光泽 */}
                      {hasMedia ? (
                        /* 画报大开本模式（Grand Memoir Canvas + 3D Tilt） */
                        <TiltCard
                          maxTilt={3}
                          glareOpacity={0.16}
                          className="rounded-3xl shadow-[0_4px_24px_-4px_rgba(43,51,46,0.06)] hover:shadow-[0_16px_36px_-6px_rgba(43,51,46,0.12)] border border-[#2B332E]/[0.08] hover:border-[#5B7B6D]/35 transition-all duration-300"
                        >
                          <article className="bg-white/95 backdrop-blur-xs p-5 sm:p-6">
                            {/* 顶部标目条：日期与经纬坐标 */}
                            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#2B332E]/[0.05]">
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-base sm:text-lg text-[#17201B] tracking-tight">
                                  {meta.monthDay}
                                </span>
                                {meta.season && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D] text-[11px] font-sans font-medium">
                                    {meta.season}
                                  </span>
                                )}
                                {item.location && (
                                  <span className="hidden xs:flex items-center gap-1 text-xs text-[#6E7C75] font-serif ml-1">
                                    <MapPin className="w-3 h-3 text-[#E88765] shrink-0" />
                                    <span className="truncate max-w-[130px] sm:max-w-[200px]">{item.location}</span>
                                  </span>
                                )}
                              </div>

                              {/* 操作锚点与分类徽印 */}
                              <div className="flex items-center gap-1.5">
                                {item.tag && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#2B332E]/[0.06] text-[#5B7B6D] text-[10px] font-medium font-serif">
                                    {item.tag}
                                  </span>
                                )}
                                {/* 分享回忆卡片按钮 */}
                                <button
                                  type="button"
                                  onClick={() => onShare(item)}
                                  title="生成艺术卡片分享（拍立得 / 电影票）"
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF8F5] hover:bg-[#5B7B6D]/10 text-[#5B7B6D] text-[11px] font-serif transition-colors border border-[#5B7B6D]/15 active:scale-95"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-[#E88765]" />
                                  <span className="hidden xs:inline">分享</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onPlayTts(`${item.title}。${item.content}`)}
                                  title="AI 朗诵时光故事"
                                  className="p-1.5 rounded-xl text-[#6E7C75]/60 hover:text-[#5B7B6D] hover:bg-[#FAF8F5] transition-colors"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDelete(item)}
                                  title="删除此节点"
                                  className="p-1.5 rounded-xl text-[#6E7C75]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* 记忆主标题与温润正文 */}
                            <h3 className="text-base sm:text-lg font-serif font-bold text-[#17201B] tracking-tight leading-snug mb-2 group-hover:text-[#5B7B6D] transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-[#2B332E]/90 leading-[1.8] font-serif whitespace-pre-line mb-4">
                              {item.content}
                            </p>

                            {/* 暗房装裱相片 / 视频舷窗 */}
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
                              <div className="relative rounded-2xl overflow-hidden border border-[#2B332E]/[0.08] shadow-xs group/img bg-[#F2EFE9]/40">
                                <div className="aspect-16/9 sm:aspect-21/9 max-h-[280px] overflow-hidden">
                                  <img
                                    src={item.image}
                                    alt={item.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover/img:scale-103 transition-transform duration-500 ease-out"
                                  />
                                </div>
                                {/* 胶片角标时光暗纹 */}
                                <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded-md bg-black/45 backdrop-blur-xs text-[10px] font-mono tracking-wider text-white/90 select-none">
                                  MEMOIR · {item.date}
                                </div>
                              </div>
                            ) : null}
                          </article>
                        </TiltCard>
                      ) : (
                        /* 文墨信札模式（Literary Letter Slip + 3D Tilt） */
                        <TiltCard
                          maxTilt={3}
                          glareOpacity={0.14}
                          className="rounded-3xl shadow-[0_3px_16px_-4px_rgba(43,51,46,0.04)] hover:shadow-[0_12px_28px_-6px_rgba(43,51,46,0.1)] border border-[#5B7B6D]/18 hover:border-[#5B7B6D]/35 transition-all duration-300"
                        >
                          <article className="relative bg-[#FAF8F5]/95 backdrop-blur-xs p-5 sm:p-6 hover:bg-white transition-colors">
                            {/* 装饰性轻柔书卷水印 */}
                            <Quote className="absolute right-4 top-4 w-8 h-8 text-[#5B7B6D]/[0.08] pointer-events-none" />

                            {/* 顶部元数据 */}
                            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#5B7B6D]/10">
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-sm sm:text-base text-[#17201B]">
                                  {meta.monthDay}
                                </span>
                                {meta.season && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D] text-[10px] font-sans font-medium">
                                    {meta.season}
                                  </span>
                                )}
                                {item.location && (
                                  <span className="hidden xs:flex items-center gap-1 text-xs text-[#6E7C75] font-serif">
                                    <MapPin className="w-3 h-3 text-[#E88765]" />
                                    <span>{item.location}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                {item.tag && (
                                  <span className="px-2 py-0.5 rounded-full bg-white text-[#5B7B6D] text-[10px] font-medium border border-[#5B7B6D]/15 font-serif">
                                    {item.tag}
                                  </span>
                                )}
                                {/* 分享回忆卡片按钮 */}
                                <button
                                  type="button"
                                  onClick={() => onShare(item)}
                                  title="生成艺术卡片分享（拍立得 / 电影票）"
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-[#5B7B6D]/10 text-[#5B7B6D] text-[11px] font-serif transition-colors border border-[#5B7B6D]/15 active:scale-95"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-[#E88765]" />
                                  <span className="hidden xs:inline">分享</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onPlayTts(`${item.title}。${item.content}`)}
                                  title="AI 朗诵时光"
                                  className="p-1.5 rounded-xl text-[#6E7C75]/60 hover:text-[#5B7B6D] hover:bg-white transition-colors"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDelete(item)}
                                  title="删除节点"
                                  className="p-1.5 rounded-xl text-[#6E7C75]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <h3 className="text-base sm:text-lg font-serif font-bold text-[#17201B] mb-2 leading-snug">
                              {item.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-[#2B332E]/90 leading-[1.8] font-serif whitespace-pre-line">
                              {item.content}
                            </p>
                          </article>
                        </TiltCard>
                      )}
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
