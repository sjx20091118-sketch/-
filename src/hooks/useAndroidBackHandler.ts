import { useEffect, useRef, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Person, Story, Artifact, Letter } from '../types';

export interface BackHandlerState {
  datePickerOpen: boolean;
  closeDatePicker: () => void;

  confirmDialog: any;
  closeConfirmDialog: () => void;

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

    // 1. Highest Priority: Global Themed Date Picker
    if (s.datePickerOpen) {
      s.closeDatePicker();
      return true;
    }

    // 2. Confirm Dialog
    if (s.confirmDialog) {
      s.closeConfirmDialog();
      return true;
    }

    // 3. Impression item editing modal
    if (s.editingImpression) {
      s.closeEditingImpression();
      return true;
    }

    // 4. Move Person Group modal
    if (s.movingPerson) {
      s.closeMovingPerson();
      return true;
    }

    // 5. Add Custom Group Sheet
    if (s.isAddingGroup) {
      s.closeAddingGroup();
      return true;
    }

    // 6. Change Password PIN Modal
    if (s.isChangingPin) {
      s.closeChangingPin();
      return true;
    }

    // 7. Backup Import Preview Modal
    if (s.importPreview) {
      s.closeImportPreview();
      return true;
    }

    // 8. Person Edit Mode -> Back to Person View
    if (s.isEditingPerson) {
      s.closeEditingPerson();
      return true;
    }

    // 9. Story Edit Modal
    if (s.editingStory) {
      s.closeEditingStory();
      return true;
    }

    // 10. General Active Modals (Add Memory, Global Search, Stats, Settings, Vault, etc.)
    if (s.activeModal) {
      s.closeActiveModal();
      return true;
    }

    // 11. Full-screen Story Reader
    if (s.readerStory) {
      s.closeReaderStory();
      return true;
    }

    // 12. Person Detail Page -> Back to People List
    if (s.selectedPerson) {
      s.closeSelectedPerson();
      return true;
    }

    // 13. Artifact Detail Modal -> Back to Artifact List
    if (s.selectedArtifact) {
      s.closeSelectedArtifact();
      return true;
    }

    // 14. Letter Capsule Modal -> Back to Letter List
    if (s.selectedLetter) {
      s.closeSelectedLetter();
      return true;
    }

    // 15. Bottom Drawer / Dropdown Pickers
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

    // 16. Secondary Tabs -> Return to Root Home Tab ('home')
    if (s.activeTab !== 'home') {
      s.setActiveTab('home');
      return true;
    }

    // 17. At Root Home View with no active overlays: Double-tap within 2000ms to exit
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
