/** Tiny procedural sound effects via Web Audio — no audio asset files needed. */

let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = localStorage.getItem("bloom-garden-sound") !== "on";
} catch {
  muted = true;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem("bloom-garden-sound", m ? "off" : "on");
  } catch {
    // ignore
  }
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  type?: OscillatorType;
  /** delay from now, seconds */
  at?: number;
  vol?: number;
  /** slide the frequency down to this value over the duration */
  slide?: number;
}

function tone(freq: number, dur: number, opts: ToneOpts = {}): void {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const { type = "sine", at = 0, vol = 0.16, slide } = opts;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  /** UI tap / selection */
  select(): void {
    tone(660, 0.07, { type: "triangle", vol: 0.09 });
  },
  /** planting a seed */
  plant(): void {
    tone(392, 0.1, { type: "triangle" });
    tone(523, 0.14, { at: 0.08, type: "triangle" });
  },
  /** watering splash */
  water(): void {
    tone(520, 0.16, { slide: 240, vol: 0.12 });
    tone(740, 0.1, { at: 0.1, slide: 330, vol: 0.09 });
  },
  /** harvest chime */
  harvest(): void {
    tone(523, 0.1, { type: "triangle" });
    tone(659, 0.1, { at: 0.09, type: "triangle" });
    tone(784, 0.22, { at: 0.18, type: "triangle" });
  },
  /** coin ding (rewards, claims) */
  coin(): void {
    tone(988, 0.09, { type: "square", vol: 0.06 });
    tone(1319, 0.16, { at: 0.07, type: "square", vol: 0.06 });
  },
  /** unlock row fanfare */
  unlock(): void {
    tone(392, 0.12, { type: "triangle" });
    tone(494, 0.12, { at: 0.1, type: "triangle" });
    tone(587, 0.22, { at: 0.2, type: "triangle" });
  },
  /** soft error buzz */
  error(): void {
    tone(170, 0.16, { type: "sawtooth", vol: 0.06, slide: 110 });
  },
};
