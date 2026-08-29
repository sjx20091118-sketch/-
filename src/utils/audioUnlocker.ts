/**
 * AudioUnlocker & TTS Playback Engine
 * 
 * Solves WebView Autoplay Policy & Asynchronous Gesture Token Expiration:
 * 1. Synchronously primes / unlocks audio hardware & AudioContext within the user gesture tick (0ms).
 * 2. Manages a singleton HTMLAudioElement with pre-loaded media tokens.
 * 3. Supports instant swapping of Blob URLs / streaming audio buffers without dropping the trusted gesture state.
 */

// Ultra-short silent WAV base64 (0.05s) for warming up mobile audio hardware
const SILENT_AUDIO_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

class TTSAudioEngine {
  private static sharedAudio: HTMLAudioElement | null = null;
  private static audioContext: AudioContext | null = null;
  private static isPrimed: boolean = false;
  private static currentPlayingUrl: string | null = null;

  /**
   * MUST be called synchronously inside user gesture handler (e.g. onClick)
   * Primes both HTMLAudioElement and AudioContext in 0ms before any await/fetch!
   */
  public static unlockAndPrime() {
    try {
      // 1. Prime / Resume Web Audio Context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioContext) {
          this.audioContext = new AudioCtx();
        }
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
      }

      // 2. Prime Shared HTMLAudioElement
      if (!this.sharedAudio) {
        this.sharedAudio = new Audio();
        this.sharedAudio.setAttribute('playsinline', 'true');
        this.sharedAudio.setAttribute('webkit-playsinline', 'true');
      }

      // Only prime with silent dummy if not currently playing meaningful audio
      if (!this.currentPlayingUrl || this.sharedAudio.paused) {
        this.sharedAudio.src = SILENT_AUDIO_DATA_URI;
        const playPromise = this.sharedAudio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.isPrimed = true;
            })
            .catch(() => {
              // Benign: priming may fail on initial non-interactive load
            });
        }
      }
    } catch (e) {
      console.warn('TTSAudioEngine unlockAndPrime notice:', e);
    }
  }

  /**
   * Seamlessly play the synthesized audio stream/url through the primed audio pipeline
   */
  public static async playAudio(
    audioUrl: string,
    onEnded?: () => void,
    onError?: (err: any) => void
  ): Promise<void> {
    if (!this.sharedAudio) {
      this.sharedAudio = new Audio();
      this.sharedAudio.setAttribute('playsinline', 'true');
      this.sharedAudio.setAttribute('webkit-playsinline', 'true');
    }

    const audio = this.sharedAudio;
    this.currentPlayingUrl = audioUrl;

    // Reset previous listeners
    audio.onended = null;
    audio.onerror = null;

    audio.src = audioUrl;
    audio.currentTime = 0;

    audio.onended = () => {
      this.currentPlayingUrl = null;
      if (onEnded) onEnded();
    };

    audio.onerror = (e) => {
      this.currentPlayingUrl = null;
      if (onError) onError(e);
    };

    try {
      await audio.play();
    } catch (err) {
      console.warn('TTSAudioEngine playAudio caught error:', err);
      // Try fallback reload
      try {
        audio.load();
        await audio.play();
      } catch (retryErr) {
        this.currentPlayingUrl = null;
        if (onError) onError(retryErr);
        throw retryErr;
      }
    }
  }

  /**
   * Stop current audio playback
   */
  public static stop() {
    if (this.sharedAudio) {
      try {
        this.sharedAudio.pause();
        this.sharedAudio.currentTime = 0;
        this.sharedAudio.src = SILENT_AUDIO_DATA_URI;
      } catch (e) {}
    }
    this.currentPlayingUrl = null;
  }

  /**
   * Check if currently playing
   */
  public static isPlaying(): boolean {
    return !!(this.sharedAudio && !this.sharedAudio.paused && this.currentPlayingUrl && this.currentPlayingUrl !== SILENT_AUDIO_DATA_URI);
  }

  /**
   * Get shared audio element instance (for React bindings)
   */
  public static getAudioElement(): HTMLAudioElement | null {
    return this.sharedAudio;
  }
}

export default TTSAudioEngine;
