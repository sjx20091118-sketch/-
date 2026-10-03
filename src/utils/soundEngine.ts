// 纯 Web Audio 物理声学引擎，无需加载外部音频文件，零体积，高保真
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // 惰性加载，等待用户第一次交互后启动
    const savedMute = localStorage.getItem('shinian_sound_muted');
    this.isMuted = savedMute === 'true';
  }

  private initCtx() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // 忽略音频受阻错误
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('shinian_sound_muted', String(this.isMuted));
    if (!this.isMuted) {
      this.playWaterDrop();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // 1. 细腻棉麻纸张微摩擦沙沙声（翻页/卡片滑入）
  public playPaperRustle() {
    if (this.isMuted) return;
    setTimeout(() => {
      try {
        this.initCtx();
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 0.08; // 80ms 极细腻短声
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          // 白粉噪声衰减
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // 带通滤波让声音像细腻纸张摩擦
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
        filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
      } catch {
        // 忽略音频受阻错误
      }
    }, 0);
  }

  // 2. 清脆水滴轻鸣（选项卡切换、微触感，软起软落无杂音）
  public playWaterDrop(freq = 840) {
    if (this.isMuted) return;
    setTimeout(() => {
      try {
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.06);

        // 6ms 平滑渐入与柔和指数衰减，彻底杜绝瞬态直流脉冲咔嗒声
        gain.gain.setValueAtTime(0.00001, now);
        gain.gain.linearRampToValueAtTime(0.035, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.085);
      } catch {
        // 忽略
      }
    }, 0);
  }

  // 3. 火漆封蜡/金属印章咬合沉稳声（纯净无毛刺）
  public playSealStamp() {
    if (this.isMuted) return;
    setTimeout(() => {
      try {
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // 低频冲击（印章下压，柔和正弦）
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.16);

        gain.gain.setValueAtTime(0.00001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
      } catch {
        // 忽略
      }
    }, 0);
  }

  // 4. 极温润的东方竹节/微触感轻叩（按键点击软接触，彻底消除刺耳咔嗒声）
  public playHapticClick(pitch = 760) {
    if (this.isMuted) return;
    setTimeout(() => {
      try {
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // 保持温润纯正的木石微鸣，不进行大幅度剧烈变频
        osc.frequency.setValueAtTime(pitch, now);
        osc.frequency.exponentialRampToValueAtTime(pitch * 0.92, now + 0.035);

        // 5ms 柔和上升沿，温润阻尼衰退，完全无刺耳破音
        gain.gain.setValueAtTime(0.00001, now);
        gain.gain.linearRampToValueAtTime(0.025, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.035);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.038);
      } catch {
        // 忽略
      }
    }, 0);
  }

  // 5. 禅意空灵清磬钟鸣（归档完成、成功提示，零破音）
  public playZenBell(freq = 528) {
    if (this.isMuted) return;
    setTimeout(() => {
      try {
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.99, now + 0.7);

        // 柔和起振，绝不从非零阶跃突发
        gain.gain.setValueAtTime(0.00001, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.72);
      } catch {
        // 忽略
      }
    }, 0);
  }
}

export const sound = new SoundEngine();
