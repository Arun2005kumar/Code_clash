// Audio synthesis utility using Web Audio API
// Fast, lightweight, zero-external-assets sound system for CODE CLASH

let audioCtx: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let activeTimeouts: NodeJS.Timeout[] = [];
let soundEnabled: boolean = true;

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) {
    stopAllAudio();
  }
  return soundEnabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Hard stop all currently active sounds, timeouts, and oscillators immediately.
 * Ensures sound never continues after component unmount or entering Round 2 questions.
 */
export function stopAllAudio(): void {
  // Clear any scheduled audio events
  activeTimeouts.forEach((t) => clearTimeout(t));
  activeTimeouts = [];

  // Stop any active oscillators
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // already stopped
    }
  });
  activeOscillators = [];
}

// Subtle click / tap sound for navigation
export function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

// Bidding Gavel Thump (Auction bid placed!)
export function playGavelSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

// Coin Clink sound (Bidding Coins Deducted/Won)
export function playCoinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(987.77, now); // B5
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1318.51, now); // E6

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.25);
  osc2.stop(now + 0.25);

  const t = setTimeout(() => {
    if (!ctx) return;
    const now2 = ctx.currentTime;
    const osc2b = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2b.type = 'sine';
    osc2b.frequency.setValueAtTime(1567.98, now2); // G6
    gain2.gain.setValueAtTime(0.12, now2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.14);
    osc2b.connect(gain2);
    gain2.connect(ctx.destination);
    osc2b.start(now2);
    osc2b.stop(now2 + 0.14);
  }, 110);
  activeTimeouts.push(t);
}

// Correct Answer Chime (+10 Points!)
export function playCorrectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0.2, now + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.35);
  });
}

// Wrong Answer Buzzer (-10 Points!)
export function playWrongSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';

  osc1.frequency.setValueAtTime(140, now);
  osc2.frequency.setValueAtTime(147, now); // minor second

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.35);
  osc2.stop(now + 0.35);
}

// Tick sound for countdown
export function playTickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.03);
}

/**
 * Level-up / Round Unlocked Fanfare
 * Strict maximum duration of 1.5 seconds. Never loops.
 */
export function playLevelUpSound() {
  stopAllAudio();
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.09);

    gain.gain.setValueAtTime(0.18, now + idx * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.09);
    osc.stop(now + idx * 0.09 + 0.4);
    activeOscillators.push(osc);
  });
}

/**
 * Round 2 Transition Sound (PART 8 & 9)
 * Plays for MAXIMUM 10 SECONDS.
 * Automatically force-stops at 10 seconds.
 * Returns a cancel function so callers can stop it sooner when entering questions.
 */
export function playRound2TransitionSound(maxDurationSec: number = 10): () => void {
  stopAllAudio();
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.15, now);
  masterGain.connect(ctx.destination);

  // Synthesize an ambient futuristic riser that safely resolves
  const chord = [220, 329.63, 440, 554.37];
  const localOscs: OscillatorNode[] = [];

  chord.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + Math.min(maxDurationSec, 8));

    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.08, now);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + maxDurationSec);

    osc.connect(noteGain);
    noteGain.connect(masterGain);

    osc.start(now);
    osc.stop(now + maxDurationSec);
    localOscs.push(osc);
    activeOscillators.push(osc);
  });

  // Force stop after exactly maxDurationSec (max 10s)
  const stopTimeout = setTimeout(() => {
    stopAllAudio();
  }, maxDurationSec * 1000);
  activeTimeouts.push(stopTimeout);

  return () => {
    clearTimeout(stopTimeout);
    try {
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.disconnect();
    } catch {}
    localOscs.forEach((o) => {
      try {
        o.stop();
        o.disconnect();
      } catch {}
    });
  };
}
