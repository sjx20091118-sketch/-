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

  selectedPerson: Person | null;
  closeSelectedPerson: () => void;

  selectedArtifact: Artifact | null;
  closeSelectedArtifact: () => void;

  selectedLetter: Letter | null;
  closeSelectedLetter: () => void;

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

    const s = stateRef.current;

    // 1. Highest Priority: Global Image Lightbox Preview
    if (s.selectedArtifactImagePreview && s.closeArtifactImagePreview) {
      s.closeArtifactImagePreview();
      return true;
    }

    // 2. Universal Share Modal
    if (s.isShareModalOpen && s.closeShareModal) {
      s.closeShareModal();
      return true;
    }

    // 3. Global Themed Date Picker
    if (s.datePickerOpen) {
      s.closeDatePicker();
      return true;
    }

    // 4. Confirm Dialog
    if (s.confirmDialog) {
      s.closeConfirmDialog();
      return true;
    }

    // 5. Sealing Ritual Overlay
    if (s.sealingRitualData && s.closeSealingRitual) {
      s.closeSealingRitual();
      return true;
    }

    // 6. Impression item editing modal
    if (s.editingImpression) {
      s.closeEditingImpression();
      return true;
    }

    // 7. Move Person Group modal
    if (s.movingPerson) {
      s.closeMovingPerson();
      return true;
    }

    // 8. Add Custom Group Sheet
    if (s.isAddingGroup) {
      s.closeAddingGroup();
      return true;
    }

    // 9. Change Password PIN Modal
    if (s.isChangingPin) {
      s.closeChangingPin();
      return true;
    }

    // 10. Backup Import Preview Modal
    if (s.importPreview) {
      s.closeImportPreview();
      return true;
    }

    // 11. Person Edit Mode -> Back to Person View
    if (s.isEditingPerson) {
      s.closeEditingPerson();
      return true;
    }

    // 12. Story Edit Modal
    if (s.editingStory) {
      s.closeEditingStory();
      return true;
    }

    // 13. Artifact Edit Modal
    if (s.editingArtifact && s.closeEditingArtifact) {
      s.closeEditingArtifact();
      return true;
    }

    // 14. General Active Modals (Add Memory, Global Search, Stats, Settings, Vault, etc.)
    if (s.activeModal) {
      s.closeActiveModal();
      return true;
    }

    // 15. Full-screen Story Reader
    if (s.readerStory) {
      s.closeReaderStory();
      return true;
    }

    // 16. Person Detail Page -> Back to People List
    if (s.selectedPerson) {
      s.closeSelectedPerson();
      return true;
    }

    // 17. Artifact Detail Modal -> Back to Artifact List
    if (s.selectedArtifact) {
      s.closeSelectedArtifact();
      return true;
    }

    // 18. Letter Capsule Modal -> Back to Letter List
    if (s.selectedLetter) {
      s.closeSelectedLetter();
      return true;
    }

    // 19. Top Navigation Subviews -> Back to Main Nav Menu
    if (s.isTopNavMenuOpen && s.topNavSubView && s.topNavSubView !== 'main' && s.setTopNavSubView) {
      s.setTopNavSubView('main');
      return true;
    }

    // 20. Top Navigation Menu Open -> Close Top Nav
    if (s.isTopNavMenuOpen && s.closeTopNavMenu) {
      s.closeTopNavMenu();
      return true;
    }

    // 21. Bottom Drawer / Dropdown Pickers / Fullscreen Overlays
    if (s.isFullscreenClockOpen && s.closeFullscreenClock) {
      s.closeFullscreenClock();
      return true;
    }
    if (s.isVoicePickerModalOpen) {
      s.closeVoicePickerModal();
      return true;
    }
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

    // 22. Secondary Tabs -> Return to Root Home Tab ('home')
    if (s.activeTab !== 'home') {
      s.setActiveTab('home');
      return true;
    }

    // 23. At Root Home View with no active overlays: Double-tap within 2000ms to exit
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
      // If we are in native mode, Capacitor handles it. Otherwise handle smoothly on web.
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
