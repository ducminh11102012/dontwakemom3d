/**
 * audio.ts — procedural Web Audio engine (GDD §10). Zero audio assets:
 * every sound is synthesized (noise buffers, oscillators, envelopes).
 *
 * Positional model (GDD: stereo pan = direction, volume = distance,
 * muffling = walls): manual pan/gain computed from listener pose, plus a
 * lowpass filter per source driven by wall count.
 */

import { blockersBetween, runtime } from '../game/runtime';

const MAX_DIST = 18;

interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

interface PositionalLoop {
  x: number;
  z: number;
  baseGain: number;
  gain: GainNode;
  pan: StereoPannerNode;
  filter: BiquadFilterNode;
  follow?: 'mom';
  enabled: boolean;
}

function makeNoiseBuffer(ctx: AudioContext, seconds = 2, lowpassed = false): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (lowpassed) {
      last = last * 0.96 + white * 0.04;
      data[i] = last * 8;
    } else {
      data[i] = white;
    }
  }
  return buf;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseBuf!: AudioBuffer;
  private brownBuf!: AudioBuffer;
  private listener: Pose = { x: 12.5, y: 1.5, z: 11.8, yaw: 0 };

  private loops: PositionalLoop[] = [];
  private snoreTimer = 0;
  private snoreEnabled = false;
  private tickTimer = 0;
  private dripTimer = 0;
  private heartbeatTimer = 0;
  private stress = 0;
  private musicLevel = 0;
  private musicGains: GainNode[] = [];
  private started = false;

  get ready() {
    return this.ctx !== null && this.started;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(comp);
    this.noiseBuf = makeNoiseBuffer(ctx, 2, false);
    this.brownBuf = makeNoiseBuffer(ctx, 3, true);
  }

  startScene() {
    if (!this.ctx || this.started) return;
    this.started = true;
    // ambient beds (GDD §10 table)
    this.addLoopNoise(13.5, 1.2, 0.05, 220); // fridge body
    this.addHum(13.5, 1.2, 50, 0.055); // fridge hum
    this.addHum(13.5, 1.2, 100, 0.03);
    this.addLoopNoise(7.75, 6.5, 0.035, 480); // hallway fan + AC
    this.addCrickets(14.8, 11.5); // player room window
    this.addCrickets(0.2, 11.0); // living room window
    this.startMusic();
    this.snoreEnabled = true;
  }

  stopScene() {
    if (!this.ctx) return;
    this.started = false;
    this.snoreEnabled = false;
    for (const l of this.loops) {
      try {
        l.gain.disconnect();
      } catch {
        /* noop */
      }
    }
    this.loops = [];
    for (const g of this.musicGains) {
      try {
        g.disconnect();
      } catch {
        /* noop */
      }
    }
    this.musicGains = [];
  }

  // ── listener / per-frame ──────────────────────────────────────────────────

  setListener(x: number, y: number, z: number, yaw: number) {
    this.listener = { x, y, z, yaw };
  }

  setStress(v: number) {
    this.stress = v;
  }

  setSnoring(on: boolean) {
    this.snoreEnabled = on;
  }

  setMusicLevel(level: 0 | 1 | 2 | 3) {
    this.musicLevel = level;
  }

  update(dt: number) {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;

    // positional loops follow + respatialize
    for (const l of this.loops) {
      if (l.follow === 'mom') {
        l.x = runtime.momX;
        l.z = runtime.momZ;
      }
      const s = this.spatial(l.x, l.z);
      l.pan.pan.setTargetAtTime(s.pan, ctx.currentTime, 0.1);
      l.gain.gain.setTargetAtTime(l.enabled ? l.baseGain * s.gain : 0, ctx.currentTime, 0.15);
      l.filter.frequency.setTargetAtTime(s.filterFreq, ctx.currentTime, 0.15);
    }

    // snore (mom, only while truly asleep)
    this.snoreTimer -= dt;
    if (this.snoreEnabled && this.snoreTimer <= 0) {
      this.snoreTimer = 3.4 + Math.random() * 0.6;
      this.snore();
    }

    // clock tick (living room)
    this.tickTimer -= dt;
    if (this.tickTimer <= 0) {
      this.tickTimer = 1.0;
      this.click(4.5, 9.3, 1400, 0.06, 0.012);
    }

    // sink drip (bathroom)
    this.dripTimer -= dt;
    if (this.dripTimer <= 0) {
      this.dripTimer = 2.2 + Math.random() * 1.6;
      this.drip();
    }

    // heartbeat by stress (GDD §5 tiers)
    if (this.stress > 20) {
      this.heartbeatTimer -= dt;
      const rate = 0.9 + (this.stress / 100) * 1.1; // Hz
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = 1 / rate;
        const v = Math.min(1, (this.stress - 20) / 70);
        this.thump(0.05 + v * 0.22);
        setTimeout(() => this.thump(0.04 + v * 0.16), 150);
      }
    }

    // music layers
    const targets = [0, 0, 0];
    if (this.musicLevel >= 1) targets[0] = 0.05;
    if (this.musicLevel >= 2) targets[1] = 0.07;
    if (this.musicLevel >= 3) {
      targets[0] = 0.08;
      targets[1] = 0.1;
      targets[2] = 0.14;
    }
    this.musicGains.forEach((g, i) => {
      g.gain.setTargetAtTime(targets[i] ?? 0, ctx.currentTime, this.musicLevel === 0 ? 0.4 : 1.2);
    });
  }

  // ── spatialization ────────────────────────────────────────────────────────

  private spatial(x: number, z: number, srcLevel?: 0 | 1) {
    const dx = x - this.listener.x;
    const dz = z - this.listener.z;
    const dist = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, -dz) - this.listener.yaw; // relative bearing
    const pan = Math.max(-1, Math.min(1, Math.sin(angle)));
    const lvl: 0 | 1 = this.listener.y > 2.5 ? 1 : 0;
    const walls = blockersBetween(this.listener.x, this.listener.z, x, z, lvl, srcLevel ?? lvl);
    const wallMul = Math.pow(0.55, walls);
    const gain = Math.max(0, 1 - dist / MAX_DIST) ** 1.6 * wallMul;
    const filterFreq = walls === 0 ? 16000 : walls === 1 ? 2400 : walls === 2 ? 1000 : 550;
    return { pan, gain, filterFreq, dist, walls };
  }

  private chainPositional(x: number, z: number, baseGain: number, srcLevel?: 0 | 1) {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const s = this.spatial(x, z, srcLevel);
    const gain = ctx.createGain();
    gain.gain.value = baseGain * s.gain;
    const pan = ctx.createStereoPanner();
    pan.pan.value = s.pan;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = s.filterFreq;
    gain.connect(filter);
    filter.connect(pan);
    pan.connect(this.master);
    return { gain, pan, filter, spatialGain: s.gain };
  }

  // ── ambient loop builders ─────────────────────────────────────────────────

  private addLoopNoise(x: number, z: number, baseGain: number, lpFreq: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.brownBuf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lpFreq;
    const chain = this.chainPositional(x, z, baseGain);
    if (!chain) return;
    src.connect(lp);
    lp.connect(chain.gain);
    src.start();
    this.loops.push({ x, z, baseGain, gain: chain.gain, pan: chain.pan, filter: chain.filter, enabled: true });
  }

  private addHum(x: number, z: number, freq: number, baseGain: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const chain = this.chainPositional(x, z, baseGain);
    if (!chain) return;
    osc.connect(chain.gain);
    osc.start();
    this.loops.push({ x, z, baseGain, gain: chain.gain, pan: chain.pan, filter: chain.filter, enabled: true });
  }

  private addCrickets(x: number, z: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4200;
    bp.Q.value = 14;
    // chirp AM
    const am = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(am.gain);
    am.gain.value = 0.5;
    const chain = this.chainPositional(x, z, 0.05);
    if (!chain) return;
    src.connect(bp);
    bp.connect(am);
    am.connect(chain.gain);
    src.start();
    lfo.start();
    this.loops.push({ x, z, baseGain: 0.05, gain: chain.gain, pan: chain.pan, filter: chain.filter, enabled: true });
  }

  private startMusic() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    // Layer 1: low drone (D1 + minor second beat)
    const l1 = ctx.createGain();
    l1.gain.value = 0;
    l1.connect(this.master);
    for (const f of [36.7, 38.9]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 220;
      o.connect(lp);
      lp.connect(g);
      g.connect(l1);
      o.start();
    }
    // Layer 2: pulsing fifth
    const l2 = ctx.createGain();
    l2.gain.value = 0;
    l2.connect(this.master);
    {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 110;
      const tremolo = ctx.createGain();
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 2.2;
      const lg = ctx.createGain();
      lg.gain.value = 0.5;
      lfo.connect(lg);
      lg.connect(tremolo.gain);
      tremolo.gain.value = 0.5;
      o.connect(tremolo);
      tremolo.connect(l2);
      o.start();
      lfo.start();
    }
    // Layer 3: fast pulse + noise hits
    const l3 = ctx.createGain();
    l3.gain.value = 0;
    l3.connect(this.master);
    {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 73.4;
      const tremolo = ctx.createGain();
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 6.5;
      const lg = ctx.createGain();
      lg.gain.value = 0.5;
      lfo.connect(lg);
      lg.connect(tremolo.gain);
      tremolo.gain.value = 0.5;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      o.connect(lp);
      lp.connect(tremolo);
      tremolo.connect(l3);
      o.start();
      lfo.start();
    }
    this.musicGains = [l1, l2, l3];
  }

  // ── one-shots ─────────────────────────────────────────────────────────────

  private env(gain: GainNode, peak: number, attack: number, decay: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private click(x: number, z: number, freq: number, decay: number, vol: number) {
    const chain = this.chainPositional(x, z, 1);
    if (!chain || !this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    o.connect(g);
    g.connect(chain.gain);
    this.env(g, vol, 0.002, decay);
    o.start();
    o.stop(this.ctx.currentTime + decay + 0.05);
  }

  private drip() {
    const chain = this.chainPositional(7.0, 0.5, 1);
    if (!chain || !this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(1300, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.09);
    const g = this.ctx.createGain();
    o.connect(g);
    g.connect(chain.gain);
    this.env(g, 0.045, 0.003, 0.12);
    o.start();
    o.stop(t + 0.2);
  }

  private snore() {
    if (!this.ctx) return;
    const chain = this.chainPositional(runtime.momX, runtime.momZ, 1);
    if (!chain) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(280, ctx.currentTime);
    bp.frequency.linearRampToValueAtTime(160, ctx.currentTime + 1.1);
    bp.Q.value = 2.5;
    const g = ctx.createGain();
    src.connect(bp);
    bp.connect(g);
    g.connect(chain.gain);
    this.env(g, 0.5, 0.45, 0.8);
    src.start();
    src.stop(ctx.currentTime + 1.5);
  }

  /** player footstep — non-positional, surface-flavored */
  footstep(surface: 'carpet' | 'wood' | 'tile', loudness: number) {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    if (surface === 'carpet') {
      f.type = 'lowpass';
      f.frequency.value = 240;
      this.env(g, 0.06 * loudness + 0.015, 0.005, 0.09);
    } else if (surface === 'tile') {
      f.type = 'bandpass';
      f.frequency.value = 1700;
      f.Q.value = 2;
      this.env(g, 0.05 * loudness + 0.02, 0.002, 0.07);
    } else {
      // wood: thunk + occasional creak
      f.type = 'lowpass';
      f.frequency.value = 700;
      this.env(g, 0.08 * loudness + 0.02, 0.004, 0.12);
      if (Math.random() < 0.3 * loudness) this.woodCreakSmall();
    }
    src.start();
    src.stop(ctx.currentTime + 0.25);
  }

  private woodCreakSmall() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(300 + Math.random() * 150, t);
    o.frequency.linearRampToValueAtTime(180 + Math.random() * 80, t + 0.18);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 600;
    f.Q.value = 3;
    const g = ctx.createGain();
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    this.env(g, 0.025, 0.02, 0.2);
    o.start();
    o.stop(t + 0.3);
  }

  /** mom footstep / broom tap at her position */
  momStep(withBroomTap: boolean, hurried: boolean) {
    if (!this.ctx || !this.started) return;
    const chain = this.chainPositional(runtime.momX, runtime.momZ, 1, runtime.momLevel);
    if (!chain) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = hurried ? 900 : 500;
    const g = ctx.createGain();
    src.connect(f);
    f.connect(g);
    g.connect(chain.gain);
    this.env(g, hurried ? 0.32 : 0.18, 0.004, 0.12);
    src.start();
    src.stop(ctx.currentTime + 0.2);
    if (withBroomTap) {
      setTimeout(() => this.broomTap(), 60);
    }
  }

  broomTap() {
    if (!this.ctx || !this.started) return;
    const chain = this.chainPositional(runtime.momX, runtime.momZ, 1);
    if (!chain) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(1900, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.04);
    const g = ctx.createGain();
    o.connect(g);
    g.connect(chain.gain);
    this.env(g, 0.22, 0.001, 0.07);
    o.start();
    o.stop(t + 0.15);
  }

  doorCreak(x: number, z: number, level?: 0 | 1) {
    if (!this.ctx || !this.started) return;
    const chain = this.chainPositional(x, z, 1, level);
    if (!chain) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(160, t);
    o.frequency.linearRampToValueAtTime(420, t + 0.5);
    o.frequency.linearRampToValueAtTime(240, t + 0.9);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 500;
    f.Q.value = 4;
    const g = ctx.createGain();
    o.connect(f);
    f.connect(g);
    g.connect(chain.gain);
    this.env(g, 0.3, 0.08, 0.9);
    o.start();
    o.stop(t + 1.1);
  }

  searchRustle(x: number, z: number, duration: number, noisy: number) {
    if (!this.ctx || !this.started) return;
    const chain = this.chainPositional(x, z, 1);
    if (!chain) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200;
    f.Q.value = 0.8;
    const am = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 7;
    const lg = ctx.createGain();
    lg.gain.value = 0.5;
    lfo.connect(lg);
    lg.connect(am.gain);
    am.gain.value = 0.5;
    const g = ctx.createGain();
    src.connect(f);
    f.connect(am);
    am.connect(g);
    g.connect(chain.gain);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1 + noisy * 0.25, t + 0.1);
    g.gain.setValueAtTime(0.1 + noisy * 0.25, t + duration - 0.1);
    g.gain.linearRampToValueAtTime(0.0001, t + duration);
    src.start();
    src.stop(t + duration + 0.05);
    lfo.start();
    lfo.stop(t + duration + 0.05);
  }

  phoneBuzz() {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;
    for (let i = 0; i < 3; i++) {
      const t0 = ctx.currentTime + i * 0.55;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 180;
      const am = ctx.createGain();
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 28;
      const lg = ctx.createGain();
      lg.gain.value = 0.5;
      lfo.connect(lg);
      lg.connect(am.gain);
      am.gain.value = 0.5;
      const g = ctx.createGain();
      o.connect(am);
      am.connect(g);
      g.connect(this.master);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.35, t0 + 0.02);
      g.gain.setValueAtTime(0.35, t0 + 0.38);
      g.gain.linearRampToValueAtTime(0.0001, t0 + 0.42);
      o.start(t0);
      o.stop(t0 + 0.5);
      lfo.start(t0);
      lfo.stop(t0 + 0.5);
    }
  }

  exhale() {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, ctx.currentTime);
    f.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.8);
    f.Q.value = 1.2;
    const g = ctx.createGain();
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    this.env(g, 0.07, 0.15, 0.7);
    src.start();
    src.stop(ctx.currentTime + 1);
  }

  /** heavy unsuppressable breathing at 0 stamina — also call repeatedly */
  heavyBreath() {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(500, ctx.currentTime);
    f.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.4);
    f.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.9);
    f.Q.value = 1.0;
    const g = ctx.createGain();
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    this.env(g, 0.16, 0.2, 0.75);
    src.start();
    src.stop(ctx.currentTime + 1.1);
  }

  private thump(vol: number) {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(75, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const g = ctx.createGain();
    o.connect(g);
    g.connect(this.master);
    this.env(g, vol, 0.005, 0.16);
    o.start();
    o.stop(t + 0.3);
  }

  /** mom murmurs/voice — low filtered saw burble at her position */
  murmur(intensity = 0.5) {
    if (!this.ctx || !this.started) return;
    const chain = this.chainPositional(runtime.momX, runtime.momZ, 1);
    if (!chain) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = 0.8 + intensity * 0.8;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(170, t);
    // wobble like speech
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 6;
    const lg = ctx.createGain();
    lg.gain.value = 28;
    lfo.connect(lg);
    lg.connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    const g = ctx.createGain();
    o.connect(f);
    f.connect(g);
    g.connect(chain.gain);
    this.env(g, 0.05 + intensity * 0.1, 0.1, dur);
    o.start();
    o.stop(t + dur + 0.2);
    lfo.start();
    lfo.stop(t + dur + 0.2);
  }

  stinger() {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    for (const [freq, delay] of [
      [880, 0],
      [932, 0.02],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, t + delay);
      o.frequency.linearRampToValueAtTime(freq * 0.5, t + delay + 0.7);
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2400;
      o.connect(f);
      f.connect(g);
      g.connect(this.master);
      this.env(g, 0.12, 0.01, 0.8);
      o.start(t + delay);
      o.stop(t + delay + 1);
    }
  }

  uiBeep(freq = 700, vol = 0.05) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    o.connect(g);
    g.connect(this.master);
    this.env(g, vol, 0.005, 0.12);
    o.start();
    o.stop(ctx.currentTime + 0.2);
  }
}

export const audioEngine = new AudioEngine();
