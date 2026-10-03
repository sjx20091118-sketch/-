import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Scissors, ClipboardPaste, CheckCheck, Check } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { HealingTheme } from '../types';

interface CustomTextSelectionBarProps {
  theme?: HealingTheme;
  isDarkMode?: boolean;
  onToast?: (message: string) => void;
}

interface SelectionState {
  text: string;
  x: number;
  y: number;
  placement: 'top' | 'bottom';
  isEditable: boolean;
  targetElement: HTMLElement | null;
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

  const notify = useCallback((msg: string) => {
    if (onToast) {
      onToast(msg);
    }
  }, [onToast]);

  const updateSelection = useCallback(() => {
    try {
      if (isInteractingWithBarRef.current) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      // 密码输入框不展示选区条以保障隐私安全
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

      if (isInput && (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement)) {
        const start = activeEl.selectionStart ?? 0;
        const end = activeEl.selectionEnd ?? 0;
        if (end > start) {
          selectedText = activeEl.value.substring(start, end);
          clientRect = activeEl.getBoundingClientRect();
          computedCenterX = clientRect.left + clientRect.width / 2;
          computedBottomY = clientRect.bottom;
          computedTopY = clientRect.top;
        }
      } else {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
          selectedText = selection.toString();
          const range = selection.getRangeAt(0);
          clientRect = range.getBoundingClientRect();
          targetEl = (selection.anchorNode?.parentElement as HTMLElement) || activeEl;

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

      // 密码输入框不展示选区条以保障隐私安全
      if (activeEl instanceof HTMLInputElement && activeEl.type === 'password') {
        setSelectionState(null);
        return;
      }

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // 水平居中紧凑对齐，留出安全边距防止溢出屏幕两侧
      const clampedX = Math.max(80, Math.min(screenWidth - 80, computedCenterX));

      // 严格紧扣在选中文本正下方（底部空间小于 36px 时向上紧扣翻转）
      const bottomSpace = screenHeight - computedBottomY;
      const placement: 'top' | 'bottom' = bottomSpace > 36 ? 'bottom' : 'top';
      const targetY = placement === 'bottom' ? computedBottomY + 1 : computedTopY - 1;

      setSelectionState({
        text: selectedText,
        x: clampedX,
        y: targetY,
        placement,
        isEditable: !!isInput,
        targetElement: targetEl
      });
    } catch {
      setSelectionState(null);
    }
  }, []);

  useEffect(() => {
    let timeoutId: any = null;
    const handleSelectionChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSelection, 40);
    };

    const handlePointerUp = () => {
      isInteractingWithBarRef.current = false;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSelection, 50);
    };

    const handleScroll = (e: Event) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setSelectionState(null);
      }
    };

    const handleMouseDownOutside = (e: MouseEvent | TouchEvent) => {
      if (barRef.current && barRef.current.contains(e.target as Node)) {
        return;
      }
      isInteractingWithBarRef.current = false;
      setTimeout(updateSelection, 80);
    };

    const handleGlobalPointerRelease = () => {
      isInteractingWithBarRef.current = false;
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchend', handlePointerUp);
    window.addEventListener('mouseup', handleGlobalPointerRelease);
    window.addEventListener('touchend', handleGlobalPointerRelease);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    document.addEventListener('mousedown', handleMouseDownOutside);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('mouseup', handleGlobalPointerRelease);
      window.removeEventListener('touchend', handleGlobalPointerRelease);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('mousedown', handleMouseDownOutside);
    };
  }, [updateSelection]);

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
        const start = activeEl.selectionStart ?? 0;
        const end = activeEl.selectionEnd ?? 0;
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
        activeEl.setSelectionRange(start, start);
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
        const start = activeEl.selectionStart ?? 0;
        const end = activeEl.selectionEnd ?? 0;
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
        activeEl.setSelectionRange(newCursor, newCursor);
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
        className="select-none inline-flex flex-row items-center gap-0.5 px-1.5 py-0.5 h-7 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.16)] border border-[rgba(var(--primary-rgb,91,123,109),0.35)] backdrop-blur-xl bg-[#FAF8F5]/96 dark:bg-[#18221D]/96 text-[#2B332E] dark:text-[#FAF8F5] transition-all whitespace-nowrap leading-none"
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

      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
