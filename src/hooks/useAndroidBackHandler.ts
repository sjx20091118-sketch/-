import { useEffect, useRef, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Person, Story, Artifact, Letter } from '../types';

export interface BackHandlerState {
  datePickerOpen: boolean;
  closeDatePicker: () => void;

  confirmDialog: any;
  closeConfirmDialog: () => void;

  selectedArtifactImagePreview?: string;
  closeArtifactImagePreview?: () => void;

  isShareModalOpen?: boolean;
  closeShareModal?: () => void;

  sealingRitualData?: any;
  closeSealingRitual?: () => void;

  editingImpression: any;
  closeEditingImpression: () => void;

  movingPerson: Person | null;
  closeMovingPerson: () => void;

  isAddingGroup: boolean;
  closeAddingGroup: () => void;

  isChangingPin: boolean;
  closeChangingPin: () => void;

  importPreview: any;
  closeImportPreview: () => void;

  isEditingPerson: boolean;
  closeEditingPerson: () => void;

  editingStory: Story | null;
  closeEditingStory: () => void;

  editingArtifact?: Artifact | null;
  closeEditingArtifact?: () => void;

  activeModal: string | null;
  closeActiveModal: () => void;

  readerStory: Story | null;
  closeReaderStory: () => void;

  selectedArtifact: Artifact | null;
  closeSelectedArtifact: () => void;

  selectedLetter: Letter | null;
  closeSelectedLetter: () => void;

  selectedPerson: Person | null;
  closeSelectedPerson: () => void;

  isVoicePickerModalOpen: boolean;
  closeVoicePickerModal: () => void;

  isGroupPickerOpen: boolean;
  closeGroupPicker: () => void;

  isThemePickerOpen: boolean;
  closeThemePicker: () => void;

  isTopNavMenuOpen?: boolean;
  closeTopNavMenu?: () => void;
  topNavSubView?: string;
  setTopNavSubView?: (view: any) => void;

  isFullscreenClockOpen?: boolean;
  closeFullscreenClock?: () => void;

  isYearPickerOpen: boolean;
  closeYearPicker: () => void;

  activeTab: string;
  setActiveTab: (tab: any) => void;

  showToast: (msg: string, duration?: number) => void;
}

type BackHandlerFn = () => boolean;

interface RegisteredHandler {
  id: string;
  priority: number;
  handle: BackHandlerFn;
}

const customHandlers: RegisteredHandler[] = [];

/**
 * 注册动态物理返回拦截器（用于子组件弹窗逐层拦截，如专属相册大图预览、多选模式等）
 */
export function registerBackHandler(id: string, priority: number, handle: BackHandlerFn) {
  const existing = customHandlers.findIndex(h => h.id === id);
  if (existing >= 0) {
    customHandlers[existing] = { id, priority, handle };
  } else {
    customHandlers.push({ id, priority, handle });
  }
  customHandlers.sort((a, b) => b.priority - a.priority);

  return () => {
    const idx = customHandlers.findIndex(h => h.id === id);
    if (idx >= 0) customHandlers.splice(idx, 1);
  };
}

/**
 * React Hook：简易声明式挂载子组件物理返回监听
 * @param id 唯一标识符
 * @param priority 优先级数值（越大越先拦截：L4大图预览=100，L3子卡片弹窗=80，L2主体详情=50）
 * @param active 是否处于激活状态
 * @param onBack 拦截触发回调
 */
export function useBackHandler(id: string, priority: number, active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active) return;
    return registerBackHandler(id, priority, () => {
      onBackRef.current();
      return true;
    });
  }, [id, priority, active]);
}

export function useAndroidBackHandler(state: BackHandlerState) {
  const lastBackPressTimeRef = useRef<number>(0);
  const isHandlingActionRef = useRef<boolean>(false);
  const stateRef = useRef<BackHandlerState>(state);

  // Keep stateRef fresh across renders without re-subscribing Capacitor listeners
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleBackEvent = useCallback((): boolean => {
    const now = Date.now();
    // Prevent event collision & rapid burst bounce (debounce by 260ms)
    if (isHandlingActionRef.current || now - lastBackPressTimeRef.current < 260) {
      return true;
    }
    isHandlingActionRef.current = true;
    setTimeout(() => {
      isHandlingActionRef.current = false;
    }, 280);

    // 0. 执行挂载的高优先级动态子组件拦截器（如相册大图、多选模式、拣选弹窗）
    for (const item of [...customHandlers]) {
      try {
        if (item.handle()) {
          return true;
        }
      } catch (err) {
        console.warn('Error executing custom back handler:', err);
      }
    }

    const s = stateRef.current;

    // ==========================================
    // Level 4: 最深层大图预览与关键确认浮层 (Priority 100)
    // ==========================================

    // 1. 信物大图灯箱预览
    if (s.selectedArtifactImagePreview && s.closeArtifactImagePreview) {
      s.closeArtifactImagePreview();
      return true;
    }

    // 2. 分享画报弹窗
    if (s.isShareModalOpen && s.closeShareModal) {
      s.closeShareModal();
      return true;
    }

    // 3. 全局日期选择器
    if (s.datePickerOpen) {
      s.closeDatePicker();
      return true;
    }

    // 4. 确认对话框
    if (s.confirmDialog) {
      s.closeConfirmDialog();
      return true;
    }

    // 5. 封存仪式全屏动效
    if (s.sealingRitualData && s.closeSealingRitual) {
      s.closeSealingRitual();
      return true;
    }

    // 6. 印记编辑弹窗
    if (s.editingImpression) {
      s.closeEditingImpression();
      return true;
    }

    // ==========================================
    // Level 3: 三级子功能面板与专属子卡片弹窗 (Priority 80)
    // ==========================================

    // 7. 旧物大卡片详情 (无论是从拾物阁还是从人物信物陈列柜打开，返回仅关闭信物详情，保留人物卡片)
    if (s.selectedArtifact) {
      s.closeSelectedArtifact();
      return true;
    }

    // 8. 时光私信未来信笺展读卡片
    if (s.selectedLetter) {
      s.closeSelectedLetter();
      return true;
    }

    // 9. 人物编辑模式 (退出编辑，保留在人物卡片中)
    if (s.isEditingPerson) {
      s.closeEditingPerson();
      return true;
    }

    // 10. 移动人物分组弹窗
    if (s.movingPerson) {
      s.closeMovingPerson();
      return true;
    }

    // 11. 新增分组抽屉
    if (s.isAddingGroup) {
      s.closeAddingGroup();
      return true;
    }

    // 12. 修改口令弹窗
    if (s.isChangingPin) {
      s.closeChangingPin();
      return true;
    }

    // 13. 备份恢复预览弹窗
    if (s.importPreview) {
      s.closeImportPreview();
      return true;
    }

    // 14. 故事编辑弹窗
    if (s.editingStory) {
      s.closeEditingStory();
      return true;
    }

    // 15. 旧物编辑弹窗
    if (s.editingArtifact && s.closeEditingArtifact) {
      s.closeEditingArtifact();
      return true;
    }

    // 16. 通用主业务弹窗 (添加时光、全局搜索、数据统计、设置抽屉等)
    if (s.activeModal) {
      s.closeActiveModal();
      return true;
    }

    // 17. 故事全屏沉浸阅读器
    if (s.readerStory) {
      s.closeReaderStory();
      return true;
    }

    // 18. 顶栏子页面 (如从音色选择返回主设置)
    if (s.isTopNavMenuOpen && s.topNavSubView && s.topNavSubView !== 'main' && s.setTopNavSubView) {
      s.setTopNavSubView('main');
      return true;
    }

    // 19. 顶栏主设置抽屉
    if (s.isTopNavMenuOpen && s.closeTopNavMenu) {
      s.closeTopNavMenu();
      return true;
    }

    // 20. 独立朗读者音色面板
    if (s.isVoicePickerModalOpen) {
      s.closeVoicePickerModal();
      return true;
    }

    // 21. 全屏沉浸翻页时钟
    if (s.isFullscreenClockOpen && s.closeFullscreenClock) {
      s.closeFullscreenClock();
      return true;
    }

    // 22. 分组/主题/年份选择浮层
    if (s.isGroupPickerOpen) {
      s.closeGroupPicker();
      return true;
    }
    if (s.isThemePickerOpen) {
      s.closeThemePicker();
      return true;
    }
    if (s.isYearPickerOpen) {
      s.closeYearPicker();
      return true;
    }

    // ==========================================
    // Level 2: 二级核心档案与主体卡片 (Priority 50)
    // ==========================================

    // 23. 人物主卡片手账 (退出回到实名册人物列表)
    if (s.selectedPerson) {
      s.closeSelectedPerson();
      return true;
    }

    // ==========================================
    // Level 1: 一级主选项卡与退出应用 (Priority 10)
    // ==========================================

    // 24. 二级主选项卡 -> 返回首页 (时光长廊)
    if (s.activeTab !== 'home') {
      s.setActiveTab('home');
      return true;
    }

    // 25. 位于首页时双击物理返回键退出
    if (now - lastBackPressTimeRef.current < 2000) {
      try {
        CapApp.exitApp();
      } catch (err) {
        console.warn('Capacitor App.exitApp not supported in browser environment');
      }
      return false;
    } else {
      lastBackPressTimeRef.current = now;
      s.showToast('再按一次返回键退出「拾年」', 1800);
      return true;
    }
  }, []);

  useEffect(() => {
    let capListenerHandle: any = null;

    // 1. Capacitor Native Android Back Button Interception
    if (Capacitor.isNativePlatform() || (window as any).Capacitor?.isNative) {
      CapApp.addListener('backButton', () => {
        handleBackEvent();
      }).then(handle => {
        capListenerHandle = handle;
      }).catch(err => {
        console.warn('Error attaching Capacitor backButton listener:', err);
      });
    }

    // 2. Cordova / Legacy WebView document backbutton event
    const onDocumentBackButton = (e: Event) => {
      e.preventDefault();
      handleBackEvent();
    };
    document.addEventListener('backbutton', onDocumentBackButton, false);

    // 3. Web browser popstate fallback for web preview
    const onPopState = (e: PopStateEvent) => {
      if (!Capacitor.isNativePlatform()) {
        handleBackEvent();
      }
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      if (capListenerHandle && typeof capListenerHandle.remove === 'function') {
        capListenerHandle.remove();
      }
      document.removeEventListener('backbutton', onDocumentBackButton, false);
      window.removeEventListener('popstate', onPopState);
    };
  }, [handleBackEvent]);
}
