import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight, Check, X, RotateCcw } from 'lucide-react';
import { HealingTheme } from '../types';

export interface ThemedDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // "YYYY-MM-DD" or "MM月DD日" or empty
  onConfirm: (val: string) => void;
  title?: string;
  mode?: 'full' | 'month-day'; // full: YYYY-MM-DD, month-day: MM月DD日 / 生日模式
  theme?: HealingTheme;
}

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const ThemedDatePickerModal: React.FC<ThemedDatePickerModalProps> = ({
  isOpen,
  onClose,
  value,
  onConfirm,
  title = '选择日期',
  mode = 'full',
  theme
}) => {
  // Parse initial date
  const parseInitialDate = () => {
    const today = new Date();
    if (!value || value === '未填写') {
      return {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate()
      };
    }

    // Try full YYYY-MM-DD
    const matchFull = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (matchFull) {
      return {
        year: parseInt(matchFull[1], 10),
        month: parseInt(matchFull[2], 10),
        day: parseInt(matchFull[3], 10)
      };
    }

    // Try MM月DD日
    const matchMD = value.match(/^(\d{1,2})月(\d{1,2})日?$/);
    if (matchMD) {
      return {
        year: today.getFullYear(),
        month: parseInt(matchMD[1], 10),
        day: parseInt(matchMD[2], 10)
      };
    }

    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate()
    };
  };

  const initialParsed = parseInitialDate();
  const [viewYear, setViewYear] = useState<number>(initialParsed.year);
  const [viewMonth, setViewMonth] = useState<number>(initialParsed.month); // 1-12
  const [selectedDay, setSelectedDay] = useState<number>(initialParsed.day);
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const p = parseInitialDate();
      setViewYear(p.year);
      setViewMonth(p.month);
      setSelectedDay(p.day);
      setViewMode('day');
    }
  }, [isOpen, value]);

  // Days in current view month
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth, 0).getDate();
  }, [viewYear, viewMonth]);

  // Day of week for 1st of month (0 = Sun, 6 = Sat)
  const startWeekday = useMemo(() => {
    return new Date(viewYear, viewMonth - 1, 1).getDay();
  }, [viewYear, viewMonth]);

  // Adjust selected day if month change causes overflow
  React.useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth, selectedDay]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleConfirm = () => {
    const mm = viewMonth.toString().padStart(2, '0');
    const dd = selectedDay.toString().padStart(2, '0');
    if (mode === 'month-day') {
      onConfirm(`${mm}月${dd}日`);
    } else {
      onConfirm(`${viewYear}-${mm}-${dd}`);
    }
    onClose();
  };

  const handleSelectToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedDay(today.getDate());
    setViewMode('day');
  };

  // Generate Year range (From current+10 down to 1950)
  const yearsList = useMemo(() => {
    const currentY = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentY + 10; y >= 1940; y--) {
      list.push(y);
    }
    return list;
  }, []);

  const primaryColor = theme?.primary || '#5B7B6D';
  const accentColor = theme?.accent || '#E88765';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      {/* Dim backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#2B332E]/45 backdrop-blur-xs"
      />

      {/* Sheet / Modal Card */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 10 }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-sm bg-[#FAF8F5] rounded-3xl border border-[#5B7B6D]/20 shadow-2xl overflow-hidden flex flex-col font-sans z-10 paper-texture max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-white/90 border-b border-[#5B7B6D]/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-2xs"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#2B332E] font-serif">{title}</h3>
              <p className="text-[10px] text-[#6E7C75]">
                {mode === 'month-day' ? '月 · 日 (纪念日/生日)' : '年 · 月 · 日 (起始/纪念日期)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#6E7C75] hover:text-[#2B332E] hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Date Preview Banner */}
        <div className="px-4 py-2.5 bg-[#5B7B6D]/10 border-b border-[#5B7B6D]/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#5B7B6D] font-serif">
            <span className="text-[11px] text-[#6E7C75]">当前选定：</span>
            <strong className="font-bold text-sm text-[#2B332E] font-mono tracking-wide">
              {mode === 'month-day'
                ? `${viewMonth.toString().padStart(2, '0')}月${selectedDay.toString().padStart(2, '0')}日`
                : `${viewYear}-${viewMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`}
            </strong>
          </div>
          <button
            type="button"
            onClick={handleSelectToday}
            className="text-[11px] font-semibold hover:underline flex items-center gap-1 active:scale-95 transition-transform"
            style={{ color: accentColor }}
          >
            <RotateCcw className="w-3 h-3" /> 重置为今天
          </button>
        </div>

        {/* Calendar Body */}
        <div className="p-3.5 space-y-3">
          {/* Navigation Controls Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {mode === 'full' && (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'year' ? 'day' : 'year')}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center gap-1 active:scale-95 transition-all shadow-2xs ${
                    viewMode === 'year'
                      ? 'text-white border-transparent'
                      : 'bg-white text-[#2B332E] border-[#5B7B6D]/15 hover:border-[#5B7B6D]'
                  }`}
                  style={viewMode === 'year' ? { backgroundColor: primaryColor } : {}}
                >
                  <span>{viewYear} 年</span>
                  <span className="text-[9px] opacity-70">▼</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'month' ? 'day' : 'month')}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center gap-1 active:scale-95 transition-all shadow-2xs ${
                  viewMode === 'month'
                    ? 'text-white border-transparent'
                    : 'bg-white text-[#2B332E] border-[#5B7B6D]/15 hover:border-[#5B7B6D]'
                }`}
                style={viewMode === 'month' ? { backgroundColor: primaryColor } : {}}
              >
                <span>{MONTH_NAMES[viewMonth - 1]}</span>
                <span className="text-[9px] opacity-70">▼</span>
              </button>
            </div>

            {viewMode === 'day' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl bg-white border border-[#5B7B6D]/15 text-[#5B7B6D] hover:bg-[#FAF8F5] active:scale-95 transition-all shadow-2xs"
                  title="上个月"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl bg-white border border-[#5B7B6D]/15 text-[#5B7B6D] hover:bg-[#FAF8F5] active:scale-95 transition-all shadow-2xs"
                  title="下个月"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mode 1: Fast Year Grid Picker */}
          {viewMode === 'year' && (
            <div className="h-56 overflow-y-auto custom-scrollbar p-2 bg-white rounded-2xl border border-[#5B7B6D]/15 grid grid-cols-4 gap-1.5 text-center text-xs">
              {yearsList.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewYear(y);
                    setViewMode('day');
                  }}
                  className={`py-2 rounded-xl font-mono text-xs transition-all active:scale-95 ${
                    viewYear === y
                      ? 'text-white font-bold shadow-2xs'
                      : 'hover:bg-[#FAF8F5] text-[#2B332E]'
                  }`}
                  style={viewYear === y ? { backgroundColor: primaryColor } : {}}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Mode 2: Fast Month Grid Picker */}
          {viewMode === 'month' && (
            <div className="h-56 p-2.5 bg-white rounded-2xl border border-[#5B7B6D]/15 grid grid-cols-3 gap-2 text-center text-xs">
              {MONTH_NAMES.map((mName, idx) => {
                const mNum = idx + 1;
                const isCurrent = viewMonth === mNum;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setViewMonth(mNum);
                      setViewMode('day');
                    }}
                    className={`rounded-xl font-mono text-xs flex items-center justify-center transition-all active:scale-95 ${
                      isCurrent
                        ? 'text-white font-bold shadow-2xs'
                        : 'hover:bg-[#FAF8F5] text-[#2B332E] border border-stone-100'
                    }`}
                    style={isCurrent ? { backgroundColor: primaryColor } : {}}
                  >
                    {mName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Mode 3: Standard Month Calendar Days Grid */}
          {viewMode === 'day' && (
            <div className="bg-white p-3 rounded-2xl border border-[#5B7B6D]/15 shadow-2xs">
              {/* Weekday Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[#6E7C75] mb-2 font-serif">
                {WEEKDAYS.map((w, idx) => (
                  <div
                    key={w}
                    className={idx === 0 || idx === 6 ? 'font-semibold' : ''}
                    style={idx === 0 || idx === 6 ? { color: accentColor } : {}}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {/* Empty cells before month start */}
                {Array.from({ length: startWeekday }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-8" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isSelected = selectedDay === dayNum;
                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setSelectedDay(dayNum)}
                      className={`h-8 w-full rounded-xl flex items-center justify-center font-mono text-xs transition-all active:scale-95 ${
                        isSelected
                          ? 'text-white font-bold shadow-2xs'
                          : 'hover:bg-[#FAF8F5] text-[#2B332E]'
                      }`}
                      style={isSelected ? { backgroundColor: accentColor } : {}}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-white/90 border-t border-[#5B7B6D]/15 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#5B7B6D]/20 bg-white text-[#6E7C75] text-xs font-semibold hover:bg-stone-50 transition-all active:scale-95"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: primaryColor }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>确认选择</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
