# Android Native Packaging Adaptation & Feature Integration Plan (2026 Final)

A comprehensive frontend adaptation plan for "拾年" (Shinian) aligning with the latest Android Studio & Capacitor native deployment guide, expanding the physical back-button navigation hierarchy to cover all newly added secondary cards and modals, and dynamically securing the bottom navigation dock and vinyl music capsule against three-button navigation bars.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following technical directions were confirmed by the user and will govern the adaptation:

- **Confirmed Decision 1 (Step-by-Step Back Navigation)**: Expand the physical back-button handler (`useAndroidBackHandler`) into a 30+ level hierarchical stack so that newly added modals—including Admin Portal (灵台后台), Checkout & License Activation (收银台), Vintage Video Player (复古胶片放映机), Memoir Card Studio (卡片工坊), Oriental Notice Scroll (长卷公告), Profile Modal (个人中心), Poetic Prologue (卷首语), and Group Selectors—close gracefully step-by-step without popping straight to the home screen or exiting the app.
- **Confirmed Decision 2 (Dynamic Safe-Area Anti-Occlusion)**: Upgrade the bottom navigation dock and vinyl music player positioning with `max(var(--safe-area-bottom, 0px), env(safe-area-inset-bottom, 0px))` so that the native Android three-button navigation bar (48dp height) or gesture home pill never covers any buttons or controls.
- **Confirmed Decision 3 (Action Roadmap for Developer)**: Provide a clear, actionable checklist of the steps required on the developer's side in VS Code and Android Studio (Capacitor sync, styles.xml, AndroidManifest.xml, MainActivity.java).

---

## 1. Overview & Frontend Adaptation Scope

- **Bridge Verification**: `AndroidBridge.saveImageToGallery` and `AndroidBridge.saveZipToDownloads` are already integrated in `MemoirCardStudioModal.tsx` and `zipBackup.ts` with base64 sanitization and MediaStore compatibility.
- **Physical Back Button Stack Expansion**:
  - Incorporate all recently introduced views and modals into `useAndroidBackHandler.ts` and `App.tsx`:
    - Level 4: `selectedArtifactImagePreview`, `isShareModalOpen`, `formGroupPickerTarget`, `datePickerOpen`, `confirmDialog`, `sealingRitualData`, `editingImpression`.
    - Level 3: `isVintageVideoPlayerOpen`, `isCardStudioOpen`, `isAdminPortalOpen`, `isCheckoutModalOpen`, `isScrollNoticeOpen`, `isUpdateModalOpen`, `isMyProfileOpen`, `isFirstLoginPrologue`, `isPoeticPrologueOpen`, `selectedArtifact`, `selectedLetter`, `isEditingPerson`, `movingPerson`, `isAddingGroup`, `isChangingPin`, `importPreview`, `editingStory`, `editingArtifact`, `activeModal`, `readerStory`, `isAuthPortalOpen`.
    - Level 2: `selectedPerson` (close details, keep person list).
    - Level 1: `activeTab !== 'home'` -> return to home tab; double-click within 2s to exit app with toast prompt.
- **Three-Button Navigation Bar Lift & Insets**:
  - `src/App.tsx`: `#dynamic-bottom-nav` dynamic bottom offset `bottom-[calc(8px+max(var(--safe-area-bottom,0px),env(safe-area-inset-bottom,0px)))]`.
  - `src/components/VinylMusicPlayer.tsx`: Bottom capsule offset `bottom-[calc(4.5rem+max(var(--safe-area-bottom,0px),env(safe-area-inset-bottom,0px)))]`.
  - `src/components/AdminPortal.tsx`: Bottom bar offset adaptation.

---

## 2. Technical Architecture & Integration Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ANDROID NATIVE (MainActivity.java)                   │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Insets Forwarding:                                                  │
│    WindowInsetsListener ──► injects --safe-area-top & --safe-area-bottom│
│ 2. Native JSBridge Injection:                                          │
│    AndroidBridge.saveImageToGallery(base64, filename) ──► Pictures/    │
│    AndroidBridge.saveZipToDownloads(base64, filename) ──► Downloads/   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Web Interface Bridge
┌───────────────────────────────────▼────────────────────────────────────┐
│                    REACT FRONTEND (Vite / Capacitor)                   │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Hardware Back Interceptor (useAndroidBackHandler.ts)                 │
│    ├── Level 4: Lightbox / Form Group Pickers / Date Picker           │
│    ├── Level 3: Admin Portal / Video Player / Card Studio / Checkout   │
│    │            Notice Scroll / Profile Modal / Prologue / Editors     │
│    ├── Level 2: Person Detail Dossier                                  │
│    └── Level 1: Active Tab -> Home Tab -> 2s Double-Tap Exit App      │
│                                                                        │
│ 2. Anti-Occlusion Layout Math (src/App.tsx & VinylMusicPlayer.tsx)     │
│    └── calc(8px + max(var(--safe-area-bottom,0px), env(...)))          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Execution Plan

### A. Frontend Changes (Automated by AI Engine):
1. **`src/hooks/useAndroidBackHandler.ts`**:
   - Add state types and handlers for: `isAdminPortalOpen`, `closeAdminPortal`, `isCheckoutModalOpen`, `closeCheckoutModal`, `isScrollNoticeOpen`, `closeScrollNotice`, `isUpdateModalOpen`, `closeUpdateModal`, `isMyProfileOpen`, `closeMyProfile`, `isCardStudioOpen`, `closeCardStudio`, `isVintageVideoPlayerOpen`, `closeVintageVideoPlayer`, `isPoeticPrologueOpen`, `closePoeticPrologue`, `formGroupPickerTarget`, `closeFormGroupPicker`, `isAuthPortalOpen`, `closeAuthPortal`.
   - Update `handleBackEvent` priority sequence so that the topmost modal closes cleanly on physical back press.
2. **`src/App.tsx`**:
   - Pass all modal states and close handlers into `useAndroidBackHandler`.
   - Ensure `#dynamic-bottom-nav` uses `max(var(--safe-area-bottom,0px), env(safe-area-inset-bottom,0px))` for robust three-button bar avoidance.
3. **`src/components/VinylMusicPlayer.tsx`**:
   - Ensure bottom capsule uses `max(var(--safe-area-bottom,0px), env(safe-area-inset-bottom,0px))`.

### B. Developer Action Roadmap (For User in Android Studio & VS Code):
- Step-by-step copy-paste checklist for the user covering `npx cap sync android`, `styles.xml`, `AndroidManifest.xml`, and `MainActivity.java` with zero ambiguity.

---
