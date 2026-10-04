import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Scissors, ClipboardPaste, Check, CheckCheck } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../types';

interface CustomTextSelectionBarProps {
  theme?: HealingTheme;
  isDarkMode?: boolean;
  onToast?: (message: string) => void;
}

interface HandlePosition {
  x: number;
  y: number;
  height: number;
}

interface SelectionState {
  text: string;
  x: number;
  y: number;
  placement: 'top' | 'bottom';
  isEditable: boolean;
  targetElement: HTMLElement | null;
  startHandle: HandlePosition | null;
  endHandle: HandlePosition | null;
}

export const CustomTextSelectionBar: React.FC<CustomTextSelectionBarProps> = ({
  theme,
  isDarkMode = false,
  onToast
}) => {
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [pastedSuccess, setPastedSuccess] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const isInteractingWithBarRef = useRef(false);

  const primaryColor = theme?.primary || '#5B7B6D';
  const primaryDark = theme?.primaryDark || '#3D544A';

  const notify = useCallback((msg: string) => {
    if (onToast) {
      onToast(msg);
    }
  }, [onToast]);

  // 安全获取输入框选区（过滤不支持 selectionStart 的输入类型如 email/number/date，杜绝 DOMException）
  const getSafeInputSelection = (el: HTMLElement | null): { start: number; end: number; text: string } => {
    if (!el) return { start: 0, end: 0, text: '' };
    try {
      if (el instanceof HTMLInputElement) {
        const unsupportedTypes = ['number', 'email', 'date', 'time', 'datetime-local', 'month', 'week', 'checkbox', 'radio', 'file', 'button', 'submit', 'image', 'reset', 'range', 'color', 'password'];
        if (unsupportedTypes.includes(el.type)) {
          return { start: 0, end: 0, text: '' };
        }
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const text = end > start ? (el.value || '').substring(start, end) : '';
        return { start, end, text };
      }
      if (el instanceof HTMLTextAreaElement) {
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const text = end > start ? (el.value || '').substring(start, end) : '';
        return { start, end, text };
      }
    } catch {
      return { start: 0, end: 0, text: '' };
    }
    return { start: 0, end: 0, text: '' };
  };

  const updateSelection = useCallback(() => {
    try {
      if (isInteractingWithBarRef.current) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      // 密码输入框不展示选区条与游标以保障隐私安全
      if (activeEl instanceof HTMLInputElement && activeEl.type === 'password') {
        setSelectionState(null);
        return;
      }

      let selectedText = '';
      let clientRect: DOMRect | null = null;
      let targetEl: HTMLElement | null = activeEl;
      let computedCenterX = 0;
      let computedBottomY = 0;
      let computedTopY = 0;
      let startHandle: HandlePosition | null = null;
      let endHandle: HandlePosition | null = null;

      if (isInput && (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement)) {
        const { start, end, text } = getSafeInputSelection(activeEl);
        if (end > start && text) {
          selectedText = text;
          clientRect = activeEl.getBoundingClientRect();
          computedCenterX = clientRect.left + clientRect.width / 2;
          computedBottomY = clientRect.bottom;
          computedTopY = clientRect.top;

          // 计算输入框内的起点与终点大致位置
          startHandle = {
            x: Math.max(clientRect.left + 4, clientRect.left + 8),
            y: clientRect.top + 4,
            height: Math.min(24, clientRect.height - 8)
          };
          endHandle = {
            x: Math.min(clientRect.right - 4, clientRect.left + Math.min(clientRect.width - 8, 16 + selectedText.length * 8)),
            y: clientRect.top + 4,
            height: Math.min(24, clientRect.height - 8)
          };
        }
      } else {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
          selectedText = selection.toString();
          const range = selection.getRangeAt(0);
          clientRect = range.getBoundingClientRect();
          targetEl = (selection.anchorNode?.parentElement as HTMLElement) || activeEl;

          // 获取多行选区的精准起点和终点 Rects
          const rects = range.getClientRects();
          if (rects && rects.length > 0) {
            const firstRect = rects[0];
            const lastRect = rects[rects.length - 1];

            startHandle = {
              x: firstRect.left,
              y: firstRect.top,
              height: firstRect.height || 18
            };
            endHandle = {
              x: lastRect.right,
              y: lastRect.top,
              height: lastRect.height || 18
            };
          } else if (clientRect) {
            startHandle = {
              x: clientRect.left,
              y: clientRect.top,
              height: clientRect.height || 18
            };
            endHandle = {
              x: clientRect.right,
              y: clientRect.top,
              height: clientRect.height || 18
            };
          }

          // 全选区水平几何中心对齐，垂直紧扣选区底边
          computedCenterX = clientRect.left + clientRect.width / 2;
          computedBottomY = clientRect.bottom;
          computedTopY = clientRect.top;
        }
      }

      const trimmed = selectedText.trim();
      if (!trimmed || !clientRect || (clientRect.width === 0 && clientRect.height === 0)) {
        setSelectionState(null);
        return;
      }

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // 水平居中紧凑对齐，留出安全边距防止溢出屏幕两侧
      const clampedX = Math.max(90, Math.min(screenWidth - 90, computedCenterX));

      // 严格紧扣在选中文本正下方（底部空间小于 40px 时向上紧扣翻转）
      const bottomSpace = screenHeight - computedBottomY;
      const placement: 'top' | 'bottom' = bottomSpace > 42 ? 'bottom' : 'top';
      const targetY = placement === 'bottom' ? computedBottomY + 4 : computedTopY - 4;

      setSelectionState({
        text: selectedText,
        x: clampedX,
        y: targetY,
        placement,
        isEditable: !!isInput,
        targetElement: targetEl,
        startHandle,
        endHandle
      });
    } catch {
      setSelectionState(null);
    }
  }, []);

  const selectionStateRef = useRef<SelectionState | null>(null);
  useEffect(() => {
    selectionStateRef.current = selectionState;
  }, [selectionState]);

  const clearSelectionImmediate = useCallback(() => {
    if (selectionStateRef.current !== null) {
      setSelectionState(null);
    }
  }, []);

  useEffect(() => {
    let timeoutId: any = null;

    const handleSelectionChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSelection, 60);
    };

    const handlePointerUp = () => {
      isInteractingWithBarRef.current = false;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSelection, 60);
    };

    const handleScroll = (e: Event) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        clearSelectionImmediate();
      }
    };

    const handleMouseDownOutside = (e: MouseEvent | TouchEvent) => {
      if (barRef.current && barRef.current.contains(e.target as Node)) {
        return;
      }
      isInteractingWithBarRef.current = false;
      clearSelectionImmediate();
    };

    const handleGlobalPointerRelease = () => {
      isInteractingWithBarRef.current = false;
    };

    // 核心防光标跳尾拦截：一旦检测到任何按键输入或输入法打字，零延迟同步销毁选区浮层，绝对不干扰原生光标插入点
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略纯修饰键
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      clearTimeout(timeoutId);
      clearSelectionImmediate();
    };

    const handleCompositionStart = () => {
      clearTimeout(timeoutId);
      clearSelectionImmediate();
    };

    const handleBeforeInput = () => {
      clearTimeout(timeoutId);
      clearSelectionImmediate();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('select', handleSelectionChange, true);
    document.addEventListener('focusin', handleSelectionChange, true);
    document.addEventListener('mouseup', handlePointerUp, true);
    document.addEventListener('touchend', handlePointerUp, true);
    window.addEventListener('mouseup', handleGlobalPointerRelease, true);
    window.addEventListener('touchend', handleGlobalPointerRelease, true);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    document.addEventListener('mousedown', handleMouseDownOutside, true);
    document.addEventListener('touchstart', handleMouseDownOutside, { capture: true, passive: true });
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('compositionstart', handleCompositionStart, true);
    document.addEventListener('beforeinput', handleBeforeInput, true);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('select', handleSelectionChange, true);
      document.removeEventListener('focusin', handleSelectionChange, true);
      document.removeEventListener('mouseup', handlePointerUp, true);
      document.removeEventListener('touchend', handlePointerUp, true);
      window.removeEventListener('mouseup', handleGlobalPointerRelease, true);
      window.removeEventListener('touchend', handleGlobalPointerRelease, true);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('mousedown', handleMouseDownOutside, true);
      document.removeEventListener('touchstart', handleMouseDownOutside, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('compositionstart', handleCompositionStart, true);
      document.removeEventListener('beforeinput', handleBeforeInput, true);
    };
  }, [updateSelection, clearSelectionImmediate]);

  // 复制 (Copy)
  const handleCopy = async () => {
    if (!selectionState) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(selectionState.text);
      } else {
        document.execCommand('copy');
      }
      sound.playWaterDrop(960);
      setCopiedSuccess(true);
      notify('已复制');
      isInteractingWithBarRef.current = false;
      setTimeout(() => {
        setCopiedSuccess(false);
        setSelectionState(null);
        isInteractingWithBarRef.current = false;
      }, 500);
    } catch (err) {
      document.execCommand('copy');
      sound.playWaterDrop(720);
      notify('已复制');
      isInteractingWithBarRef.current = false;
      setSelectionState(null);
    }
  };

  // 剪切 (Cut)
  const handleCut = async () => {
    if (!selectionState || !selectionState.isEditable) return;
    const activeEl = document.activeElement as HTMLElement | null;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(selectionState.text);
      }

      if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
        const { start, end } = getSafeInputSelection(activeEl);
        const original = activeEl.value;
        const nextVal = original.substring(0, start) + original.substring(end);
        
        const nativeSetter = Object.getOwnPropertyDescriptor(
          activeEl instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(activeEl, nextVal);
        } else {
          activeEl.value = nextVal;
        }

        try {
          activeEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
        } catch {
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        activeEl.dispatchEvent(new Event('change', { bubbles: true }));
        try {
          activeEl.setSelectionRange(start, start);
        } catch {}
      } else if (activeEl?.isContentEditable) {
        document.execCommand('delete');
      }

      sound.playWaterDrop(840);
      notify('已剪切 ✂️');
      isInteractingWithBarRef.current = false;
      setSelectionState(null);
    } catch (err) {
      document.execCommand('cut');
      notify('已剪切 ✂️');
      isInteractingWithBarRef.current = false;
      setSelectionState(null);
    }
  };

  // 粘贴 (Paste)
  const handlePaste = async () => {
    if (!selectionState || !selectionState.isEditable) return;
    const activeEl = document.activeElement as HTMLElement | null;

    try {
      let pasteText = '';
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        try {
          pasteText = await navigator.clipboard.readText();
        } catch (e) {
          console.warn('Direct clipboard read failed or permission denied', e);
        }
      }

      if (!pasteText) {
        try {
          const ok = document.execCommand('paste');
          if (ok) {
            isInteractingWithBarRef.current = false;
            setSelectionState(null);
            return;
          }
        } catch {
          // ignore
        }
        notify('请长按或使用快捷键粘贴 📋');
        isInteractingWithBarRef.current = false;
        setSelectionState(null);
        return;
      }

      if (pasteText && (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement)) {
        const { start, end } = getSafeInputSelection(activeEl);
        const original = activeEl.value;
        const nextVal = original.substring(0, start) + pasteText + original.substring(end);

        const nativeSetter = Object.getOwnPropertyDescriptor(
          activeEl instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(activeEl, nextVal);
        } else {
          activeEl.value = nextVal;
        }

        try {
          activeEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: pasteText, inputType: 'insertFromPaste' }));
        } catch {
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        activeEl.dispatchEvent(new Event('change', { bubbles: true }));

        const newCursor = start + pasteText.length;
        try {
          activeEl.setSelectionRange(newCursor, newCursor);
        } catch {}
        sound.playWaterDrop(880);
        setPastedSuccess(true);
        notify(`已粘贴 ${pasteText.length > 30 ? pasteText.length + ' 字' : ''} 📋`);
        isInteractingWithBarRef.current = false;
        setTimeout(() => {
          setPastedSuccess(false);
          setSelectionState(null);
        }, 500);
      } else if (activeEl?.isContentEditable) {
        document.execCommand('insertText', false, pasteText);
        isInteractingWithBarRef.current = false;
        setSelectionState(null);
      } else {
        document.execCommand('paste');
        isInteractingWithBarRef.current = false;
        setSelectionState(null);
      }
    } catch (err) {
      document.execCommand('paste');
      isInteractingWithBarRef.current = false;
      setSelectionState(null);
    }
  };

  // 全选 (Select All)
  const handleSelectAll = () => {
    isInteractingWithBarRef.current = false;
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
      activeEl.select();
      sound.playWaterDrop(620);
    } else if (selectionState?.targetElement) {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(selectionState.targetElement);
        selection.removeAllRanges();
        selection.addRange(range);
        sound.playWaterDrop(620);
      }
    } else {
      document.execCommand('selectAll');
    }
    setTimeout(updateSelection, 40);
  };

  if (!selectionState) return null;

  const content = (
    <div className="pointer-events-none select-none">
      {/* 1. 专属东方水墨水滴起始游标 (Start Teardrop Handle) */}
      {selectionState.startHandle && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionState.startHandle.x}px`,
            top: `${selectionState.startHandle.y}px`,
            zIndex: 9999998,
            pointerEvents: 'none'
          }}
          className="transition-transform duration-75"
        >
          {/* 垂直对齐竖线 */}
          <div
            className="w-[2px] rounded-full absolute -top-0.5 -left-[1px] shadow-xs pointer-events-none"
            style={{
              height: `${selectionState.startHandle.height + 2}px`,
              backgroundColor: primaryColor
            }}
          />
          {/* 左侧水滴下标 */}
          <div
            className="w-3.5 h-3.5 rounded-full rounded-tr-none rotate-45 absolute -bottom-3 -left-[6px] shadow-[0_2px_8px_rgba(0,0,0,0.22)] border border-white/60 dark:border-white/30 transition-transform active:scale-125"
            style={{
              backgroundColor: primaryColor
            }}
          />
        </div>
      )}

      {/* 2. 专属东方水墨水滴结束游标 (End Teardrop Handle) */}
      {selectionState.endHandle && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionState.endHandle.x}px`,
            top: `${selectionState.endHandle.y}px`,
            zIndex: 9999998,
            pointerEvents: 'none'
          }}
          className="transition-transform duration-75"
        >
          {/* 垂直对齐竖线 */}
          <div
            className="w-[2px] rounded-full absolute -top-0.5 -left-[1px] shadow-xs pointer-events-none"
            style={{
              height: `${selectionState.endHandle.height + 2}px`,
              backgroundColor: primaryColor
            }}
          />
          {/* 右侧水滴下标 */}
          <div
            className="w-3.5 h-3.5 rounded-full rounded-tl-none -rotate-45 absolute -bottom-3 -left-[6px] shadow-[0_2px_8px_rgba(0,0,0,0.22)] border border-white/60 dark:border-white/30 transition-transform active:scale-125"
            style={{
              backgroundColor: primaryColor
            }}
          />
        </div>
      )}

      {/* 3. 悬浮四合一操作栏 (Floating Action Menu Bar) */}
      <AnimatePresence>
        <motion.div
          ref={barRef}
          initial={{ opacity: 0, scale: 0.94, y: selectionState.placement === 'bottom' ? -2 : 2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.08 } }}
          transition={{ type: 'spring', damping: 30, stiffness: 480 }}
          style={{
            position: 'fixed',
            left: `${selectionState.x}px`,
            top: `${selectionState.y}px`,
            transform: `translate(-50%, ${selectionState.placement === 'top' ? '-100%' : '0%'})`,
            zIndex: 9999999,
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            isInteractingWithBarRef.current = true;
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            isInteractingWithBarRef.current = true;
          }}
          onTouchEnd={() => {
            setTimeout(() => {
              isInteractingWithBarRef.current = false;
            }, 150);
          }}
          className="select-none inline-flex flex-row items-center gap-0.5 px-1.5 py-0.5 h-7.5 rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.18)] border border-[rgba(var(--primary-rgb,91,123,109),0.35)] backdrop-blur-xl bg-[#FAF8F5]/96 dark:bg-[#18221D]/96 text-[#2B332E] dark:text-[#FAF8F5] transition-all whitespace-nowrap leading-none"
        >
          {/* 复制 (Copy) */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex flex-row items-center gap-1 px-2 py-1 rounded-full text-[11px] font-serif font-medium hover:bg-[rgba(var(--primary-rgb,91,123,109),0.14)] active:scale-95 transition-all cursor-pointer text-slate-800 dark:text-slate-100 whitespace-nowrap"
            title="复制"
          >
            {copiedSuccess ? (
              <Check className="w-3 h-3 text-[var(--theme-primary)] shrink-0 animate-bounce" />
            ) : (
              <Copy className="w-3 h-3 text-[var(--theme-primary)] shrink-0" />
            )}
            <span className="whitespace-nowrap">{copiedSuccess ? '已复制' : '复制'}</span>
          </button>

          {/* 剪切 (Cut - 可编辑时展示) */}
          {selectionState.isEditable && (
            <>
              <div className="w-px h-2.5 bg-stone-300 dark:bg-stone-700 mx-0.5 shrink-0 opacity-60" />
              <button
                type="button"
                onClick={handleCut}
                className="flex flex-row items-center gap-1 px-2 py-1 rounded-full text-[11px] font-serif font-medium hover:bg-[rgba(var(--primary-rgb,91,123,109),0.14)] active:scale-95 transition-all cursor-pointer text-slate-800 dark:text-slate-100 whitespace-nowrap"
                title="剪切"
              >
                <Scissors className="w-3 h-3 text-[var(--theme-primary)] shrink-0" />
                <span className="whitespace-nowrap">剪切</span>
              </button>
            </>
          )}

          {/* 粘贴 (Paste - 可编辑时展示) */}
          {selectionState.isEditable && (
            <>
              <div className="w-px h-2.5 bg-stone-300 dark:bg-stone-700 mx-0.5 shrink-0 opacity-60" />
              <button
                type="button"
                onClick={handlePaste}
                className="flex flex-row items-center gap-1 px-2 py-1 rounded-full text-[11px] font-serif font-medium hover:bg-[rgba(var(--primary-rgb,91,123,109),0.14)] active:scale-95 transition-all cursor-pointer text-slate-800 dark:text-slate-100 whitespace-nowrap"
                title="粘贴"
              >
                {pastedSuccess ? (
                  <Check className="w-3 h-3 text-[var(--theme-primary)] shrink-0 animate-bounce" />
                ) : (
                  <ClipboardPaste className="w-3 h-3 text-[var(--theme-primary)] shrink-0" />
                )}
                <span className="whitespace-nowrap">{pastedSuccess ? '已粘贴' : '粘贴'}</span>
              </button>
            </>
          )}

          {/* 全选 (Select All) */}
          <div className="w-px h-2.5 bg-stone-300 dark:bg-stone-700 mx-0.5 shrink-0 opacity-60" />
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex flex-row items-center gap-1 px-2 py-1 rounded-full text-[11px] font-serif font-medium hover:bg-[rgba(var(--primary-rgb,91,123,109),0.14)] active:scale-95 transition-all cursor-pointer text-slate-800 dark:text-slate-100 whitespace-nowrap"
            title="全选"
          >
            <CheckCheck className="w-3 h-3 text-[var(--theme-primary)] shrink-0" />
            <span className="whitespace-nowrap">全选</span>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
