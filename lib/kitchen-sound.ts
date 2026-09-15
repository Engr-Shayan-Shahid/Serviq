/** Simple kitchen alert beep via Web Audio API (no audio file required). */
export function playKitchenAlert() {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();

    const beep = (start: number, frequency: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    };

    const now = ctx.currentTime;
    beep(now, 880, 0.12);
    beep(now + 0.16, 1175, 0.16);

    window.setTimeout(() => {
      void ctx.close();
    }, 600);
  } catch {
    // Autoplay / unsupported — ignore
  }
}

/** Softer two-tone chime for waiter "order ready" alerts. */
export function playWaiterAlert() {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();

    const tone = (start: number, frequency: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    };

    const now = ctx.currentTime;
    tone(now, 523.25, 0.22);
    tone(now + 0.2, 659.25, 0.28);

    window.setTimeout(() => {
      void ctx.close();
    }, 700);
  } catch {
    // Autoplay / unsupported — ignore
  }
}
