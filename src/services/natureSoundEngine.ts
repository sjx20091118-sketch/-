// 纯原生 Web Audio 实时程序化自然白噪音合成引擎 (零网络依赖，无限循环，零版权纠纷)
class NatureSoundEngine {
  private ctx: AudioContext | null = null;
  private currentSource: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private activeNoiseType: string | null = null;
  private lfoNode: OscillatorNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public stop() {
    try {
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
      }
      setTimeout(() => {
        try {
          if (this.currentSource) {
            (this.currentSource as any).stop?.();
            this.currentSource.disconnect();
            this.currentSource = null;
          }
          if (this.lfoNode) {
            this.lfoNode.stop();
            this.lfoNode.disconnect();
            this.lfoNode = null;
          }
          this.activeNoiseType = null;
        } catch {}
      }, 320);
    } catch {}
  }

  // 1. 檐下雨声 (Rain)
  public playRain(volume = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    this.stop();

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // 棕色噪声 + 雨点瞬态
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.45, this.ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    this.currentSource = noise;
    this.gainNode = gain;
    this.activeNoiseType = 'rain';
  }

  // 2. 竹林清风 (Breeze)
  public playBreeze(volume = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    this.stop();

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    // LFO 模拟微风起伏
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.lfoNode = lfo;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.4, this.ctx.currentTime + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    this.currentSource = noise;
    this.gainNode = gain;
    this.activeNoiseType = 'breeze';
  }

  // 3. 山溪泉鸣 (Stream)
  public playStream(volume = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    this.stop();

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.35, this.ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    this.currentSource = noise;
    this.gainNode = gain;
    this.activeNoiseType = 'stream';
  }

  // 4. 静夜炉火 (Fireplace)
  public playFireplace(volume = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    this.stop();

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // 偶发木柴噼啪脉冲
      const crackle = Math.random() < 0.003 ? (Math.random() * 2 - 1) * 2.5 : 0;
      data[i] = (Math.random() * 2 - 1) * 0.15 + crackle;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.38, this.ctx.currentTime + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    this.currentSource = noise;
    this.gainNode = gain;
    this.activeNoiseType = 'fireplace';
  }

  // 5. 空灵禅钵 (Meditation Bowl)
  public playBowl(volume = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    this.stop();

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(432, this.ctx.currentTime); // 432Hz 颂钵基频
    osc2.frequency.setValueAtTime(432 * 2.76, this.ctx.currentTime); // 谐波泛音

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.25, this.ctx.currentTime + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();

    this.currentSource = osc1;
    this.gainNode = gain;
    this.activeNoiseType = 'bowl';
  }

  public setVolume(volume: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume * 0.4)), this.ctx.currentTime);
    }
  }

  public playNoiseByType(type: string, volume = 0.5) {
    switch (type) {
      case 'rain':
        this.playRain(volume);
        break;
      case 'breeze':
        this.playBreeze(volume);
        break;
      case 'stream':
        this.playStream(volume);
        break;
      case 'fireplace':
        this.playFireplace(volume);
        break;
      case 'bowl':
        this.playBowl(volume);
        break;
      default:
        this.playRain(volume);
        break;
    }
  }

  public getActiveNoiseType() {
    return this.activeNoiseType;
  }
}

export const natureSounds = new NatureSoundEngine();
