import { useState, useEffect, useCallback } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export interface KeyboardStatus {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}

export function useKeyboardStatus(): KeyboardStatus {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    let showListenerHandle: any = null;
    let hideListenerHandle: any = null;

    // 1. Native Capacitor Keyboard Plugin Listener
    if (Capacitor.isNativePlatform() || (window as any).Capacitor?.isNative) {
      Keyboard.addListener('keyboardWillShow', (info) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(info.keyboardHeight || 0);
      }).then(handle => {
        showListenerHandle = handle;
      }).catch(() => {});

      Keyboard.addListener('keyboardWillHide', () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }).then(handle => {
        hideListenerHandle = handle;
      }).catch(() => {});
    }

    // 2. Web Visual Viewport Resize Fallback
    const onViewportResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        // If viewport height shrinks by more than 160px, a virtual keyboard is active
        const isShrunk = heightDiff > 160;
        setIsKeyboardVisible(isShrunk);
        setKeyboardHeight(isShrunk ? heightDiff : 0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onViewportResize);
      window.visualViewport.addEventListener('scroll', onViewportResize);
    }

    // 3. Global focusin scroll-into-view helper for inputs/textareas to prevent obscuring
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setTimeout(() => {
          try {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (err) {}
        }, 320);
      }
    };

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      if (showListenerHandle && typeof showListenerHandle.remove === 'function') {
        showListenerHandle.remove();
      }
      if (hideListenerHandle && typeof hideListenerHandle.remove === 'function') {
        hideListenerHandle.remove();
      }
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', onViewportResize);
        window.visualViewport.removeEventListener('scroll', onViewportResize);
      }
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
}
