// Bells for the BING / BONG / BELL / DING / DONG / TING / RING racks,
// synthesised with Web Audio so the easter egg costs no assets. A bell is a fundamental plus inharmonic
// partials, each an exponential decay — the ratios below are what separate a
// struck bell from a plain beep.
type Voice = {
  freq: number;
  gain: number;
  decay: number;
  delay?: number;
  attack?: number; // seconds to full level; a struck bell's default is near-instant
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

// A struck bar or tube rings much sparser and higher than a cast bell (the
// free-bar series), which is what reads as "chime".
const CHIME: typeof PARTIALS = [
  [1, 1],
  [2.76, 0.45],
  [5.4, 0.2],
  [8.93, 0.08],
];

const strike = (
  base: number,
  decay: number,
  level = 1,
  { partials = PARTIALS, delay = 0 } = {},
): Voice[] =>
  partials.map(([ratio, gain]) => ({
    freq: base * ratio,
    gain: gain * level,
    // Higher partials die first, which is what makes the tail sweeten.
    decay: decay / Math.max(1, ratio * 0.8),
    delay,
  }));

export const BELLS: Record<
  "bing" | "bong" | "bell" | "ding" | "dong" | "ting" | "ring",
  Voice[]
> = {
  // A low church-ish bell, one strike, long tail.
  bong: strike(392, 2.6),
  // BONG's partner, a fifth up.
  bing: strike(587.3, 1.9),
  // A handbell, struck once. The slightly sharp twin beats against the strike:
  // the warble of a real, imperfectly round bell.
  bell: [...strike(659.3, 1.9, 0.7), ...strike(659.3 * 1.006, 1.9, 0.35)],
  // A bright little counter bell.
  ding: strike(1318.5, 0.9, 0.8),
  // A tiny one, an octave over DING: a fork on a glass.
  ting: strike(2637, 0.55, 0.7),
  // The other half of the doorbell: the same bell a major third down, and a
  // touch longer, as the second note always is.
  dong: strike(1046.5, 1.2, 0.8),
  // One tubular chime, left to ring.
  ring: strike(880, 2.6, 0.8, { partials: CHIME }),
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
    osc.frequency.value = v.freq;
    // exponentialRamp can't touch zero, hence the near-silent endpoints.
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(
      v.gain * MASTER,
      t + (v.attack ?? 0.006),
    );
    env.gain.exponentialRampToValueAtTime(0.0001, t + v.decay);
    osc.connect(env).connect(ac.destination);
    osc.start(t);
    osc.stop(t + v.decay + 0.05);
  }
}

// GONG: the one sound that isn't synthesised — a tam-tam's shimmer is too
// much for a handful of oscillators — so it's a sample, fetched on the first
// cast and kept.
const GONG_URL = "/sounds/gong.mp3";
let gong: Promise<AudioBuffer> | null = null;

export function gongSound() {
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return;
  const ac = (ctx ??= new AC());
  if (ac.state === "suspended") void ac.resume();
  gong ??= fetch(GONG_URL)
    .then((r) => r.arrayBuffer())
    .then((b) => ac.decodeAudioData(b));
  gong
    .then((buf) => {
      const src = ac.createBufferSource();
      src.buffer = buf;
      const env = ac.createGain();
      env.gain.value = MASTER * 2;
      src.connect(env).connect(ac.destination);
      src.start();
    })
    .catch(() => {
      // No file, or one the browser can't decode: the next cast tries again.
      gong = null;
    });
}

// SING / SONG: seven "la"s up the arpeggio and back (1 3 5 8 5 3 1), or
// SONG's mirror of it, down from the top. Each la is a sawtooth
// pushed through two formant filters (an open "ah"), with a quick slide up
// into the note the way a voice lands on one, and a little vibrato once it's
// there.
const LA_MS = 190;
const UP = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25];
const DOWN = [1046.5, 783.99, 659.25, 523.25, 659.25, 783.99, 1046.5];

export function singSound(dir: "up" | "down") {
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return;
  const ac = (ctx ??= new AC());
  if (ac.state === "suspended") void ac.resume();
  const notes = dir === "up" ? UP : DOWN;
  const t0 = ac.currentTime + 0.02;
  // The vowel is the same for every note, so one set of formants serves all
  // seven: a soft, round "ah", with a low-pass over the lot so nothing rasps.
  const out = ac.createGain();
  out.gain.value = MASTER * 0.7;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  lp.Q.value = 0.5;
  lp.connect(out).connect(ac.destination);
  const formants: BiquadFilterNode[] = [];
  for (const [f, q, g] of [
    [750, 2.5, 1],
    [1150, 3, 0.5],
    [2500, 4, 0.12],
  ]) {
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f;
    bp.Q.value = q;
    const gn = ac.createGain();
    gn.gain.value = g;
    bp.connect(gn).connect(lp);
    formants.push(bp);
  }
  notes.forEach((freq, i) => {
    const t = t0 + (i * LA_MS) / 1000;
    const last = i === notes.length - 1;
    // Each la overlaps the next a little: legato, not a row of pokes.
    const dur = (last ? 0.6 : LA_MS / 1000) + 0.07;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.06);
    env.gain.setValueAtTime(1, t + dur - 0.09);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    formants.forEach((bp) => env.connect(bp));
    const vib = ac.createOscillator();
    vib.frequency.value = 5;
    const depth = ac.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(freq * 0.008, t + 0.15);
    vib.connect(depth);
    // Mostly triangle, a whisper of sawtooth for the vowel to bite on.
    for (const [type, gain] of [
      ["triangle", 1],
      ["sawtooth", 0.18],
    ] as const) {
      const osc = ac.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq * 0.965, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
      depth.connect(osc.frequency);
      const g = ac.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(env);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
    vib.start(t);
    vib.stop(t + dur + 0.02);
  });
}

// COIN: two square-wave notes, B5 then a held E6 — the shape of every
// platformer pickup.
export function coinSound() {
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return;
  const ac = (ctx ??= new AC());
  if (ac.state === "suspended") void ac.resume();
  const t = ac.currentTime + 0.02;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(987.8, t);
  osc.frequency.setValueAtTime(1318.5, t + 0.08);
  // Square waves carry far more energy than the bells' sines.
  env.gain.setValueAtTime(MASTER * 0.35, t);
  env.gain.setValueAtTime(MASTER * 0.35, t + 0.08);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  osc.connect(env).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.6);
}

// BASS: five seconds of sub-bass, wubba wubba. Two detuned saws and a sine
// an octave under, through a low-pass whose cutoff an LFO swings open and
// shut — the wobble is the filter, not the pitch — and the LFO winds up as it
// goes, so the wubs come faster toward the end.
const BASS_S = 5;

export function bassSound() {
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return;
  const ac = (ctx ??= new AC());
  if (ac.state === "suspended") void ac.resume();
  const t = ac.currentTime + 0.02;
  const end = t + BASS_S;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 400;
  lp.Q.value = 9;
  const wob = ac.createOscillator();
  wob.frequency.setValueAtTime(1.5, t);
  wob.frequency.linearRampToValueAtTime(3, t + 2.5);
  wob.frequency.linearRampToValueAtTime(7, end);
  const depth = ac.createGain();
  depth.gain.value = 330;
  wob.connect(depth).connect(lp.frequency);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(MASTER * 0.9, t + 0.08);
  env.gain.setValueAtTime(MASTER * 0.9, end - 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  lp.connect(env).connect(ac.destination);
  const oscs = [
    [55, "sawtooth", 0.5, 6],
    [55, "sawtooth", 0.5, -6],
    [27.5, "sine", 1, 0],
  ] as const;
  for (const [freq, type, gain, detune] of oscs) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = ac.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(lp);
    osc.start(t);
    osc.stop(end + 0.05);
  }
  wob.start(t);
  wob.stop(end + 0.05);
}

// TONE: a North American dial tone, 350 + 440 Hz, for five minutes or until
// the returned function is called.
const TONE_S = 300;

export function dialTone(): (fade?: number) => void {
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return () => {};
  const ac = (ctx ??= new AC());
  if (ac.state === "suspended") void ac.resume();
  const t = ac.currentTime + 0.02;
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(MASTER * 0.6, t + 0.03);
  env.gain.setValueAtTime(MASTER * 0.6, t + TONE_S - 0.05);
  env.gain.exponentialRampToValueAtTime(0.0001, t + TONE_S);
  env.connect(ac.destination);
  const oscs = [350, 440].map((freq) => {
    const osc = ac.createOscillator();
    osc.frequency.value = freq;
    osc.connect(env);
    osc.start(t);
    osc.stop(t + TONE_S + 0.05);
    return osc;
  });
  // STOP cuts it (a short fade, so there's no click); a rack that's left the
  // page lets it trail off after it.
  return (fade = 0.06) => {
    const now = ac.currentTime;
    env.gain.cancelScheduledValues(now);
    env.gain.setValueAtTime(env.gain.value, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + fade);
    oscs.forEach((osc) => osc.stop(now + fade + 0.02));
  };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
