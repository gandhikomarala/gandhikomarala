/**
 * Sound synthesis engine using Web Audio API
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  }

  playTone(freq, duration, type = "sine", gain = 0.15) {
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      g.gain.setValueAtTime(gain, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch(e) {}
  }

  playThrow() {
    this.init();
    this.playTone(320, 0.25, "triangle", 0.2);
  }

  playHit() {
    this.init();
    this.playTone(180, 0.15, "square", 0.25);
  }

  playShake() {
    this.init();
    this.playTone(440, 0.12, "sine", 0.2);
  }

  playCatchSuccess() {
    this.init();
    [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.35, "triangle", 0.25), idx * 120);
    });
  }

  playFlee() {
    this.init();
    [400, 320, 240, 160].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.25, "sawtooth", 0.2), idx * 80);
    });
  }

  playLevelUp() {
    this.init();
    [440, 554, 659, 880].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.4, "sine", 0.3), idx * 100);
    });
  }

  playPokestopSpin() {
    this.init();
    for (let i = 0; i < 6; i++) {
      setTimeout(() => this.playTone(600 + i * 80, 0.08, "triangle", 0.15), i * 60);
    }
  }

  playAttack() {
    this.init();
    this.playTone(280, 0.1, "sawtooth", 0.3);
  }

  playSuperEffective() {
    this.init();
    this.playTone(700, 0.25, "square", 0.3);
  }
}

const sfx = new SoundEngine();
