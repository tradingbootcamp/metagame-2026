// Bells for the BELL / DING / RING racks, synthesised with Web Audio so the
// easter egg costs no assets. A bell is a fundamental plus inharmonic
// partials, each an exponential decay — the ratios below are what separate a
// struck bell from a plain beep.
type Voice = {
  freq: number;
  gain: number;
  decay: number;
  delay?: number;
  type?: OscillatorType;
};

// Ratios and relative levels of a struck bell's partials (hum, prime, tierce,
// quint, nominal — roughly).
const PARTIALS: [ratio: number, gain: number][] = [
  [0.5, 0.35],
  [1, 1],
  [1.19, 0.4],
  [1.56, 0.3],
  [2, 0.45],
  [2.66, 0.18],
  [3.37, 0.1],
];

const strike = (base: number, decay: number, level = 1): Voice[] =>
  PARTIALS.map(([ratio, gain]) => ({
    freq: base * ratio,
    gain: gain * level,
    // Higher partials die first, which is what makes the tail sweeten.
    decay: decay / Math.max(1, ratio * 0.8),
  }));

export const BELLS: Record<"bell" | "ding" | "ring", Voice[]> = {
  // A low church-ish bell, one strike, long tail.
  bell: strike(392, 2.6),
  // A bright little counter bell.
  ding: strike(1318.5, 0.9, 0.8),
  // US telephone ring: 440 + 480 Hz, two bursts.
  ring: [0, 0.42].flatMap((delay) =>
    [440, 480].map((freq) => ({
      freq,
      gain: 0.5,
      decay: 0.34,
      delay,
      type: "triangle" as const,
    })),
  ),
};

let ctx: AudioContext | null = null;

// Master level — these fire unprompted on someone else's page, so keep quiet.
const MASTER = 0.12;

export function ringBell(which: keyof typeof BELLS) {
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return;
  const ac = (ctx ??= new AC());
  // Safari starts suspended; the click that spelled the word unlocks it.
  if (ac.state === "suspended") void ac.resume();
  const t0 = ac.currentTime + 0.02;
  for (const v of BELLS[which]) {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    const t = t0 + (v.delay ?? 0);
    osc.type = v.type ?? "sine";
    osc.frequency.value = v.freq;
    // exponentialRamp can't touch zero, hence the near-silent endpoints.
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(v.gain * MASTER, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + v.decay);
    osc.connect(env).connect(ac.destination);
    osc.start(t);
    osc.stop(t + v.decay + 0.05);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
