import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, Delete, KeyRound, ShieldCheck, X, Sparkles, Check } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';

interface LockScreenProps {
  isLocked: boolean;
  lockPin: string;
  onUnlock: () => void;
  onChangePin: (newPin: string) => void;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
}

// 东方天干地支与农历节气推算辅助
function getEasternDateString(date: Date = new Date()): {
  solarDate: string;
  weekday: string;
  lunarYear: string;
  timeStr: string;
} {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekday = weekdays[date.getDay()];

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // 干支纪年估算 (2026年为丙午年)
  const year = date.getFullYear();
  const heavenlyStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const stem = heavenlyStems[(year - 4) % 10] || '丙';
  const branch = earthlyBranches[(year - 4) % 12] || '午';
  const lunarYear = `${stem}${branch}年`;

  return {
    solarDate: `${month}月${day}日`,
    weekday,
    lunarYear,
    timeStr
  };
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isLocked,
  lockPin,
  onUnlock,
  onChangePin,
  currentTheme,
  isDarkMode,
  showToast
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);
  const [oldPinInput, setOldPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // 实时走字时钟
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const easternDate = useMemo(() => getEasternDateString(currentTime), [currentTime]);

  const targetLength = lockPin.length || 4;

  const handleInputDigit = useCallback((digit: string) => {
    if (pinInput.length >= targetLength) return;
    sound.playWaterDrop(750 + pinInput.length * 40);

    const nextPin = pinInput + digit;
    setPinInput(nextPin);

    if (nextPin.length === targetLength) {
      if (nextPin === lockPin) {
        // 解锁成功
        sound.playSealStamp();
        setTimeout(() => {
          onUnlock();
          setPinInput('');
          showToast('已解锁私人时光空间');
        }, 180);
      } else {
        // 密码错误：柔和错误震颤
        setTimeout(() => {
          sound.playPaperRustle();
          setIsShaking(true);
          showToast('空间口令错误，请重试');
          setTimeout(() => {
            setIsShaking(false);
            setPinInput('');
          }, 450);
        }, 120);
      }
    }
  }, [pinInput, targetLength, lockPin, onUnlock, showToast]);

  const handleDeleteDigit = useCallback(() => {
    if (pinInput.length > 0) {
      sound.playWaterDrop(620);
      setPinInput(prev => prev.slice(0, -1));
    }
  }, [pinInput]);

  // 键盘物理输入适配
  useEffect(() => {
    if (!isLocked || isChangingPin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleInputDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteDigit();
      } else if (e.key === 'Escape') {
        setPinInput('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, isChangingPin, handleInputDigit, handleDeleteDigit]);

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] z-[99999] overflow-hidden select-none flex flex-col justify-between py-8 px-6 sm:px-12 font-sans">
      {/* 动态雅致背景底色与主题径向流光 */}
      <div
        className="absolute inset-0 transition-colors duration-700 pointer-events-none -z-20"
        style={{
          background: isDarkMode
            ? `radial-gradient(ellipse at 50% 25%, rgba(${currentTheme.primaryRgb || '91,123,109'}, 0.28) 0%, #0F1412 100%)`
            : `radial-gradient(ellipse at 50% 20%, rgba(${currentTheme.primaryRgb || '91,123,109'}, 0.16) 0%, #FAF8F5 100%)`
        }}
      />
      <div className="absolute inset-0 paper-texture opacity-30 pointer-events-none -z-10" />

      {/* 顶部：东方意境日期与苹果大字居中时钟 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center pt-2 sm:pt-6 space-y-1 sm:space-y-2 z-10"
      >
        {/* 日期与农历干支 */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-serif text-[#6E7C75] dark:text-[#A7B4AD] tracking-wider">
          <span>{easternDate.solarDate}</span>
          <span>{easternDate.weekday}</span>
          <span className="opacity-40">·</span>
          <span>{easternDate.lunarYear}</span>
        </div>

        {/* 苹果锁屏大字居中时钟 */}
        <div
          className="text-6xl sm:text-7xl md:text-8xl font-serif font-bold tracking-tight text-[#2B332E] dark:text-[#FAF8F5] leading-none drop-shadow-2xs tabular-nums"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {easternDate.timeStr}
        </div>

        {/* 空间锁标与标题 */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-[#5B7B6D] dark:text-[#E88765] font-serif font-medium">
          <Lock className="w-3.5 h-3.5" />
          <span>《拾年》私人时光档案</span>
        </div>
      </motion.div>

      {/* 中部：四位密码指示槽与错误震动 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col items-center justify-center space-y-4 my-auto z-10"
      >
        <motion.div
          animate={isShaking ? { x: [-12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-4 sm:gap-5"
        >
          {Array.from({ length: targetLength }).map((_, idx) => {
            const isFilled = idx < pinInput.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'scale-110 shadow-sm'
                    : 'scale-100 border'
                }`}
                style={{
                  backgroundColor: isFilled
                    ? isDarkMode
                      ? currentTheme.accent || '#E88765'
                      : currentTheme.primary || '#5B7B6D'
                    : 'transparent',
                  borderColor: isFilled
                    ? 'transparent'
                    : isDarkMode
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(91, 123, 109, 0.35)',
                  boxShadow: isFilled
                    ? isDarkMode
                      ? `0 0 12px ${currentTheme.accent || '#E88765'}80`
                      : `0 0 10px ${currentTheme.primary || '#5B7B6D'}50`
                    : 'none'
                }}
              />
            );
          })}
        </motion.div>

        <p className="text-[11px] font-serif text-[#6E7C75] dark:text-[#A7B4AD] tracking-widest">
          请输入私人空间口令
        </p>
      </motion.div>

      {/* 底部：苹果液体毛玻璃晶体数字九宫格按键 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-[320px] mx-auto z-10 pb-4"
      >
        <div className="grid grid-cols-3 gap-y-3.5 gap-x-6 sm:gap-y-4 sm:gap-x-7 justify-items-center">
          {/* 1 到 9 数字按键 */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleInputDigit(String(num))}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex flex-col items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 select-none backdrop-blur-xl border border-white/60 dark:border-white/15 bg-white/70 dark:bg-white/[0.08] shadow-2xs hover:shadow-md hover:bg-white/90 dark:hover:bg-white/[0.14] group"
              style={{
                boxShadow: isDarkMode
                  ? '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                  : '0 4px 14px rgba(91, 123, 109, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
              }}
            >
              <span className="text-2xl sm:text-3xl font-serif font-semibold text-[#2B332E] dark:text-[#FAF8F5] group-active:text-[#5B7B6D] dark:group-active:text-[#E88765]">
                {num}
              </span>
            </button>
          ))}

          {/* 左下角：修改口令按钮 */}
          <button
            type="button"
            onClick={() => {
              sound.playWaterDrop(820);
              setIsChangingPin(true);
            }}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-xs font-serif text-[#6E7C75] hover:text-[#2B332E] dark:text-[#A7B4AD] dark:hover:text-white transition-all cursor-pointer active:scale-95"
            title="修改口令"
          >
            <KeyRound className="w-5 h-5 opacity-75" />
          </button>

          {/* 0 数字按键 */}
          <button
            type="button"
            onClick={() => handleInputDigit('0')}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex flex-col items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 select-none backdrop-blur-xl border border-white/60 dark:border-white/15 bg-white/70 dark:bg-white/[0.08] shadow-2xs hover:shadow-md hover:bg-white/90 dark:hover:bg-white/[0.14] group"
            style={{
              boxShadow: isDarkMode
                ? '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                : '0 4px 14px rgba(91, 123, 109, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
            }}
          >
            <span className="text-2xl sm:text-3xl font-serif font-semibold text-[#2B332E] dark:text-[#FAF8F5] group-active:text-[#5B7B6D] dark:group-active:text-[#E88765]">
              0
            </span>
          </button>

          {/* 右下角：退格删除按钮 */}
          <button
            type="button"
            onClick={handleDeleteDigit}
            disabled={pinInput.length === 0}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-xs font-serif text-[#6E7C75] hover:text-[#2B332E] dark:text-[#A7B4AD] dark:hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
            title="回退删除"
          >
            <Delete className="w-5 h-5 opacity-80" />
          </button>
        </div>
      </motion.div>

      {/* 修改密码弹窗 */}
      <AnimatePresence>
        {isChangingPin && (
          <div className="fixed inset-0 bg-[#2B332E]/80 backdrop-blur-md z-[100000] flex items-center justify-center p-4 font-sans select-none">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="bg-[#FAF8F5] dark:bg-[#1A221E] w-full max-w-sm p-6 rounded-3xl border border-[#5B7B6D]/30 dark:border-white/15 shadow-2xl space-y-5 paper-texture text-[#2B332E] dark:text-[#FAF8F5]"
            >
              <div className="flex justify-between items-center border-b border-[#5B7B6D]/15 dark:border-white/10 pb-3">
                <h3 className="font-bold text-sm flex items-center gap-2 font-serif text-[#2B332E] dark:text-[#FAF8F5]">
                  <ShieldCheck className="w-4 h-4 text-[#E88765]" />
                  <span>修改私人空间口令</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPin(false);
                    setOldPinInput('');
                    setNewPinInput('');
                  }}
                  className="p-1 rounded-full text-[#6E7C75] hover:text-[#2B332E] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs font-serif">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#6E7C75] dark:text-[#A7B4AD] block">
                    原口令 <span className="text-[#5B7B6D] dark:text-[#E88765] font-sans font-normal">(默认: 1234)</span>
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    value={oldPinInput}
                    onChange={(e) => setOldPinInput(e.target.value)}
                    placeholder="请输入当前生效口令 (默认 1234)..."
                    className="w-full bg-white dark:bg-white/[0.06] border border-[#5B7B6D]/20 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none focus:border-[#5B7B6D] tracking-widest font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#6E7C75] dark:text-[#A7B4AD] block">
                    新口令 <span className="text-[#6E7C75] dark:text-[#A7B4AD]/70 font-sans font-normal">(建议 4 位数字)</span>
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="请输入全新空间口令..."
                    className="w-full bg-white dark:bg-white/[0.06] border border-[#5B7B6D]/20 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none focus:border-[#5B7B6D] tracking-widest font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#6E7C75] dark:text-[#A7B4AD] block">
                    再次输入新口令 <span className="text-[#6E7C75] dark:text-[#A7B4AD]/70 font-sans font-normal">(确认一致)</span>
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="请再次输入新口令以确认..."
                    className="w-full bg-white dark:bg-white/[0.06] border border-[#5B7B6D]/20 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-[#2B332E] dark:text-[#FAF8F5] focus:outline-none focus:border-[#5B7B6D] tracking-widest font-sans"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPin(false);
                    setOldPinInput('');
                    setNewPinInput('');
                    setConfirmPinInput('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-serif text-[#6E7C75] dark:text-[#A7B4AD] hover:bg-black/5 cursor-pointer transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (oldPinInput !== lockPin) {
                      showToast('原口令验证不正确');
                      return;
                    }
                    if (!newPinInput.trim()) {
                      showToast('新口令不能为空');
                      return;
                    }
                    if (newPinInput.length < 4) {
                      showToast('新口令长度建议至少4位');
                      return;
                    }
                    if (newPinInput !== confirmPinInput) {
                      showToast('两次输入的新口令不一致，请核对');
                      return;
                    }
                    onChangePin(newPinInput.trim());
                    setIsChangingPin(false);
                    setOldPinInput('');
                    setNewPinInput('');
                    setConfirmPinInput('');
                    showToast('空间口令已成功重置');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#5B7B6D] hover:bg-[#4A6458] text-white text-xs font-serif font-medium shadow-xs transition-colors cursor-pointer active:scale-95"
                >
                  确认修改
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
