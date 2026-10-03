import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldCheck,
  QrCode,
  Key,
  RefreshCw,
  Check,
  Lock,
  ExternalLink
} from 'lucide-react';
import {
  DomesticUser,
  activateLicenseWithCode,
  createLicensePaymentOrder,
  checkLicensePaymentOrder,
  getEffectiveBuyoutPrice
} from '../services/cloudSyncService';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../App';

interface CheckoutLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DomesticUser | null;
  onUserUpdated: (user: DomesticUser) => void;
  currentTheme: HealingTheme;
  isDarkMode: boolean;
  showToast: (msg: string) => void;
  triggerReason?: string;
}

export const CheckoutLicenseModal: React.FC<CheckoutLicenseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  currentTheme,
  isDarkMode,
  showToast,
  triggerReason
}) => {
  const [activeTab, setActiveTab] = useState<'pay' | 'code'>('pay');
  const [payType, setPayType] = useState<'wechat' | 'alipay'>('wechat');
  const [amount, setAmount] = useState<number>(getEffectiveBuyoutPrice());
  const [orderInfo, setOrderInfo] = useState<{
    orderId: string;
    qrData: string;
    amount: number;
    expireSeconds: number;
    payUrl?: string;
    isEasyPayConfigured?: boolean;
  } | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCheckingOrder, setIsCheckingOrder] = useState(false);
  const [isActivatingCode, setIsActivatingCode] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const pollTimerRef = useRef<any>(null);

  // 动态同步最新买断价格
  useEffect(() => {
    if (isOpen) {
      setAmount(getEffectiveBuyoutPrice());
    }
  }, [isOpen]);

  // 初始化或切换支付通道时生成订单
  useEffect(() => {
    if (!isOpen || !currentUser || activeTab !== 'pay') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    let isMounted = true;
    const initOrder = async () => {
      try {
        setIsCreatingOrder(true);
        const order = await createLicensePaymentOrder(currentUser, payType, amount);
        if (!isMounted) return;
        setOrderInfo(order);

        // 轮询检查支付状态（每 3 秒一次）
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(async () => {
          const isPaid = await checkLicensePaymentOrder(order.orderId);
          if (isPaid && isMounted) {
            clearInterval(pollTimerRef.current);
            handlePaymentCompleted(order.orderId);
          }
        }, 3000);
      } catch (err: any) {
        showToast(err.message || '生成支付订单失败');
      } finally {
        if (isMounted) setIsCreatingOrder(false);
      }
    };

    initOrder();

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, payType, activeTab, amount]);

  const handlePaymentCompleted = (orderId: string) => {
    sound.playSealStamp();
    sound.playZenBell(520);
    showToast('恭喜！《拾年》终身买断已成功激活');
    setTimeout(() => {
      if (currentUser) {
        onUserUpdated({
          ...currentUser,
          licenseStatus: 'active',
          licensedAt: new Date().toISOString(),
          licenseKey: orderId
        });
      }
      onClose();
    }, 1200);
  };

  // 手动查询支付状态（严谨核验，杜绝未付款白嫖漏洞）
  const handleCheckPaymentStatus = async () => {
    if (!orderInfo) return;
    try {
      setIsCheckingOrder(true);
      sound.playWaterDrop(840);
      const isPaid = await checkLicensePaymentOrder(orderInfo.orderId);
      if (isPaid) {
        handlePaymentCompleted(orderInfo.orderId);
      } else {
        sound.playWaterDrop(600);
        showToast('尚未检测到支付到账，请完成扫码或使用官方卡密激活');
      }
    } catch {
      showToast('查询支付状态失败，请稍后重试');
    } finally {
      setIsCheckingOrder(false);
    }
  };

  const handleRedeemCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    const fd = new FormData(e.currentTarget);
    const cleanCode = (((fd.get('code') as string) || inputCode).trim()).toUpperCase();
    if (!cleanCode) {
      showToast('请输入 16 位激活卡密');
      return;
    }

    try {
      setIsActivatingCode(true);
      sound.playWaterDrop(880);
      const updatedUser = await activateLicenseWithCode(cleanCode, currentUser);
      onUserUpdated(updatedUser);
      sound.playSealStamp();
      sound.playZenBell(540);
      showToast('卡密核销成功！已终身解锁');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      showToast(err.message || '卡密无效或已被使用');
    } finally {
      setIsActivatingCode(false);
    }
  };

  // 权益对比矩阵清单 (简洁、明确、去AI杂质、纯正东方雅致与苹果极简)
  const comparisonItems = [
    {
      title: '时光瞬间定格',
      trial: '试用期内可用',
      buyout: '永久无限定格'
    },
    {
      title: '同行人物档案',
      trial: '仅供浏览',
      buyout: '自由建档归整'
    },
    {
      title: '岁华随笔画卷',
      trial: '仅供浏览',
      buyout: '自由排版创作'
    },
    {
      title: '旧物信物典藏',
      trial: '仅查看信物',
      buyout: '全量封存寄信'
    },
    {
      title: '完整数据导出',
      trial: '不可导出',
      buyout: '一键完整备份'
    },
    {
      title: '终身免费升级',
      trial: '基础更新',
      buyout: '永久免费演进'
    }
  ];

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10001] flex items-center justify-center p-3.5 sm:p-6 overflow-hidden select-none">
        {/* 背景遮罩：电影级沉浸深度高斯模糊 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-2xl cursor-pointer z-0"
        />

        {/* 核心居中超大苹果胶囊浮层 (苹果液态透明胶囊 + 东方留白美学 + 底部晕染透色) */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl max-h-[90vh] rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl z-10 border border-white/60 dark:border-white/12 apple-liquid-glass flex flex-col my-auto paper-texture"
          style={{
            backgroundColor: isDarkMode ? 'rgba(18, 24, 21, 0.95)' : 'rgba(253, 251, 247, 0.96)',
            color: isDarkMode ? '#FAF8F5' : '#223028'
          }}
        >
          {/* 内部双色光晕流动背景 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div
              className="absolute -top-20 -left-20 w-64 h-64 rounded-full smooth-radial-glow opacity-25"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${currentTheme.primary} 0%, transparent 70%)`
              }}
            />
            <div
              className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full smooth-radial-glow opacity-20"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${currentTheme.accent} 0%, transparent 70%)`
              }}
            />
            <div className="absolute inset-0 ambient-glow-dither opacity-50" />
          </div>

          {/* 1. 顶部极简雅致标题栏 (去除冗杂赘述) */}
          <div className="relative z-10 px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
            <div>
              <h3
                className="text-lg sm:text-xl font-serif font-bold tracking-widest leading-tight"
                style={{ color: isDarkMode ? '#FAF8F5' : '#2B332E' }}
              >
                拾年 · 岁华令
              </h3>
              <p className="text-xs font-serif opacity-60 tracking-wider mt-1 text-stone-600 dark:text-stone-300">
                {triggerReason || '解开岁月束缚 · 永久定格一生长卷'}
              </p>
            </div>

            <button
              onClick={() => {
                sound.playHapticClick(800);
                onClose();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer shrink-0 border border-transparent hover:border-black/5 dark:hover:border-white/10"
            >
              <X size={16} />
            </button>
          </div>

          {/* 2. 中间滚动内容区域 */}
          <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-6 py-2 space-y-4">
            {/* 权益对比矩阵卡片 (精简干练，东方意境留白) */}
            <div className="rounded-2xl border border-black/8 dark:border-white/10 overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
              {/* 表头 */}
              <div className="grid grid-cols-12 px-3.5 py-2.5 text-xs font-serif font-bold border-b border-black/5 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.03]">
                <div className="col-span-5 text-stone-600 dark:text-stone-300">功能权益</div>
                <div className="col-span-3 text-center text-stone-400 dark:text-stone-500 flex items-center justify-center gap-1">
                  <Lock size={11} />
                  <span>普通体验</span>
                </div>
                <div
                  className="col-span-4 text-right flex items-center justify-end gap-1 font-bold"
                  style={{ color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark }}
                >
                  <Check size={12} />
                  <span>终身买断</span>
                </div>
              </div>

              {/* 逐行对比 */}
              <div className="divide-y divide-black/5 dark:divide-white/6 text-xs">
                {comparisonItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 px-3.5 py-2.5 items-center hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors">
                    <div className="col-span-5 font-serif text-stone-800 dark:text-stone-200 tracking-wide font-medium">
                      {item.title}
                    </div>
                    <div className="col-span-3 text-center font-serif text-stone-400 dark:text-stone-500 text-[11px]">
                      {item.trial}
                    </div>
                    <div
                      className="col-span-4 text-right font-serif font-bold flex items-center justify-end gap-1 text-[11px]"
                      style={{ color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark }}
                    >
                      <Check size={12} className="shrink-0" />
                      <span>{item.buyout}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 选项卡：在线扫码 vs 卡密激活 */}
            <div className="p-1 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/8 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  sound.playWaterDrop(840);
                  setActiveTab('pay');
                }}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-serif font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'pay'
                    ? 'bg-white dark:bg-white/15 text-[#2B332E] dark:text-[#FAF8F5] shadow-xs font-bold'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <QrCode size={13} style={{ color: currentTheme.primary }} />
                <span>在线扫码</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playWaterDrop(840);
                  setActiveTab('code');
                }}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-serif font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'code'
                    ? 'bg-white dark:bg-white/15 text-[#2B332E] dark:text-[#FAF8F5] shadow-xs font-bold'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Key size={13} style={{ color: currentTheme.primary }} />
                <span>卡密激活</span>
              </button>
            </div>

            {/* TAB 1: 扫码支付 (内嵌原生收银卡片) */}
            {activeTab === 'pay' ? (
              <div className="space-y-3.5">
                {/* 支付方式选择 */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playWaterDrop(800);
                      setPayType('wechat');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-serif font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      payType === 'wechat'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'border-black/6 dark:border-white/8 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span>微信支付</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playWaterDrop(800);
                      setPayType('alipay');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-serif font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      payType === 'alipay'
                        ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold'
                        : 'border-black/6 dark:border-white/8 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span>支付宝</span>
                  </button>
                </div>

                {/* 价格与内嵌原生二维码收银卡片 */}
                <div
                  className="p-4 rounded-2xl border flex flex-col items-center justify-center text-center space-y-3 apple-liquid-glass"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                  }}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-serif opacity-60">终身买断</span>
                    <span
                      className="text-2xl font-mono font-bold tracking-tight tabular-nums"
                      style={{ color: isDarkMode ? currentTheme.primary : currentTheme.primaryDark }}
                    >
                      ¥{amount}
                    </span>
                  </div>

                  {/* 二维码展示台 */}
                  <div className="p-3 bg-[#FCFBF8] dark:bg-[#1A221E] rounded-2xl shadow-xs border border-black/8 dark:border-white/10">
                    {isCreatingOrder ? (
                      <div className="w-36 h-36 flex flex-col items-center justify-center gap-2 text-neutral-400">
                        <RefreshCw className="w-5 h-5 animate-spin text-neutral-500" />
                        <span className="text-xs font-serif opacity-75">生成收银码...</span>
                      </div>
                    ) : (
                      <div className="w-36 h-36 flex flex-col items-center justify-between p-2 rounded-xl bg-white dark:bg-[#151D19] border border-stone-200 dark:border-white/5 relative">
                        {/* 四角定位方块 */}
                        <div className="w-full flex justify-between">
                          <div className="w-4 h-4 border-2 border-stone-800 dark:border-stone-300 rounded-xs p-0.5">
                            <div className="w-full h-full bg-stone-800 dark:border-stone-300 rounded-2xs" />
                          </div>
                          <div className="w-4 h-4 border-2 border-stone-800 dark:border-stone-300 rounded-xs p-0.5">
                            <div className="w-full h-full bg-stone-800 dark:border-stone-300 rounded-2xs" />
                          </div>
                        </div>

                        {/* 中心提示 */}
                        <div className="flex flex-col items-center justify-center my-auto">
                          <span className="text-[11px] font-serif tracking-widest font-bold opacity-80">
                            {payType === 'wechat' ? '微信扫码' : '支付宝扫码'}
                          </span>
                        </div>

                        <div className="w-full flex justify-between items-end">
                          <div className="w-4 h-4 border-2 border-stone-800 dark:border-stone-300 rounded-xs p-0.5">
                            <div className="w-full h-full bg-stone-800 dark:border-stone-300 rounded-2xs" />
                          </div>
                          <div className="text-[9px] font-mono opacity-40 font-bold">
                            {orderInfo?.orderId.slice(-6) || '888888'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] font-serif opacity-60">
                    扫码完成自动开启
                  </p>

                  {/* 清晰醒目的支付操作按钮 */}
                  <div className="pt-1 w-full max-w-sm space-y-2">
                    {orderInfo?.isEasyPayConfigured && orderInfo.payUrl ? (
                      <>
                        <a
                          href={orderInfo.payUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 px-4 rounded-xl text-white font-serif font-bold text-xs tracking-wider shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:opacity-95"
                          style={{ backgroundColor: currentTheme.primary }}
                        >
                          <ExternalLink size={13} />
                          <span>新窗口直达收银台 (¥{amount})</span>
                        </a>

                        <button
                          type="button"
                          disabled={isCheckingOrder}
                          onClick={handleCheckPaymentStatus}
                          className="w-full py-2 px-3 rounded-xl border border-black/8 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-serif opacity-75 hover:opacity-100 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isCheckingOrder ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck size={13} />
                          )}
                          <span>{isCheckingOrder ? '正在查询支付结果...' : '已完成支付，查询激活'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isCheckingOrder}
                        onClick={handleCheckPaymentStatus}
                        className="w-full py-2.5 px-4 rounded-xl text-white font-serif font-bold text-xs tracking-wider shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:opacity-95 disabled:opacity-50"
                        style={{ backgroundColor: currentTheme.primary }}
                      >
                        {isCheckingOrder ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck size={14} />
                        )}
                        <span>{isCheckingOrder ? '正在查询支付结果...' : '已完成支付，查询激活'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: 卡密兑换 */
              <form onSubmit={handleRedeemCode} className="space-y-3.5">
                <div className="p-4 rounded-2xl border border-black/8 dark:border-white/10 space-y-3 bg-black/[0.015] dark:bg-white/[0.015]">
                  <div className="space-y-2">
                    <label className="text-xs font-serif font-bold tracking-wider block opacity-80 text-center">
                      输入 16 位官方买断卡密
                    </label>
                    <input
                      name="code"
                      type="text"
                      defaultValue=""
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder="SHINIAN-XXXX-XXXX-XXXX"
                      required
                      className="w-full min-h-[46px] px-4 rounded-xl border text-sm font-mono tracking-widest outline-none transition-all apple-liquid-glass text-center font-bold"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                      }}
                    />
                    <p className="text-[11px] font-serif opacity-50 text-center">
                      可在管理后台或发卡渠道获取卡密
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isActivatingCode}
                      className="w-full min-h-[44px] rounded-xl text-white font-serif font-bold text-xs tracking-wider shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:opacity-95 disabled:opacity-40"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      {isActivatingCode ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>正在核销卡密...</span>
                        </>
                      ) : (
                        <span>立即核销激活</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
