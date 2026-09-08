// 🎵 Kawaii Vending Machine Audio Engine (Web Audio API Synthesizer)
// Menghasilkan musik ceria, imut & jingle gashapon/vending machine langsung di speaker laptop/HP tanpa file eksternal

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtxClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (_e) {
    return null;
  }
}

/**
 * 🎡 1. Musik Imut Ketika Mesin Vending / Motor Berputar (Cute Kawaii Music Box)
 * Memainkan nada melodi ceria ala gacha arcade Jepang (C5 -> E5 -> G5 -> A5 -> C6 -> E6 dsb)
 */
export function playCuteVendingSpinningMusic(durationMs: number = 3200): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  const now = ctx.currentTime;
  let isCancelled = false;
  const activeOscillators: OscillatorNode[] = [];

  // Melody notes in Hz (Cute cheerful upbeat progression)
  // C5, E5, G5, A5, C6, G5, E5, D5, E5, G5, A5, C6, D6, E6, G6
  const melody = [
    { note: 523.25, dur: 0.14, time: 0.00 }, // C5
    { note: 659.25, dur: 0.14, time: 0.15 }, // E5
    { note: 783.99, dur: 0.14, time: 0.30 }, // G5
    { note: 880.00, dur: 0.18, time: 0.45 }, // A5
    { note: 1046.50, dur: 0.22, time: 0.65 }, // C6
    { note: 783.99, dur: 0.14, time: 0.90 }, // G5
    { note: 880.00, dur: 0.14, time: 1.05 }, // A5
    { note: 1046.50, dur: 0.16, time: 1.20 }, // C6
    { note: 1174.66, dur: 0.18, time: 1.38 }, // D6
    { note: 1318.51, dur: 0.24, time: 1.58 }, // E6
    // Loop 2
    { note: 1046.50, dur: 0.14, time: 1.85 }, // C6
    { note: 880.00, dur: 0.14, time: 2.00 }, // A5
    { note: 783.99, dur: 0.14, time: 2.15 }, // G5
    { note: 659.25, dur: 0.14, time: 2.30 }, // E5
    { note: 783.99, dur: 0.16, time: 2.45 }, // G5
    { note: 1046.50, dur: 0.20, time: 2.62 }, // C6
    { note: 1318.51, dur: 0.22, time: 2.84 }, // E6
    { note: 1567.98, dur: 0.35, time: 3.08 }, // G6 (Sweet High Climax)
  ];

  // Cute Bass Rhythm (Bouncy triangle waves)
  const bassNotes = [
    { note: 261.63, time: 0.00 }, // C4
    { note: 329.63, time: 0.30 }, // E4
    { note: 392.00, time: 0.60 }, // G4
    { note: 440.00, time: 0.90 }, // A4
    { note: 261.63, time: 1.20 }, // C4
    { note: 392.00, time: 1.50 }, // G4
    { note: 329.63, time: 1.85 }, // E4
    { note: 392.00, time: 2.15 }, // G4
    { note: 261.63, time: 2.45 }, // C4
    { note: 523.25, time: 2.80 }, // C5
  ];

  // 1. Play melody chime
  melody.forEach(item => {
    if (item.time * 1000 > durationMs) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Sweet Marimba / Music Box wave
    osc.type = 'sine';
    osc.frequency.setValueAtTime(item.note, now + item.time);

    // Cute envelope (sharp attack, smooth decay)
    gain.gain.setValueAtTime(0.001, now + item.time);
    gain.gain.linearRampToValueAtTime(0.22, now + item.time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + item.time + item.dur + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + item.time);
    osc.stop(now + item.time + item.dur + 0.1);
    activeOscillators.push(osc);
  });

  // 2. Play cute bass pulses
  bassNotes.forEach(item => {
    if (item.time * 1000 > durationMs) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(item.note, now + item.time);

    gain.gain.setValueAtTime(0.001, now + item.time);
    gain.gain.linearRampToValueAtTime(0.15, now + item.time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + item.time + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + item.time);
    osc.stop(now + item.time + 0.25);
    activeOscillators.push(osc);
  });

  // 3. Cute Whirring/Spinning Gear Chimes (Mechanical Kawaii clicks)
  for (let t = 0; t < durationMs / 1000; t += 0.12) {
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();

    clickOsc.type = 'sine';
    // Rising sweep representing gear turning
    clickOsc.frequency.setValueAtTime(800 + (t * 200), now + t);
    clickOsc.frequency.exponentialRampToValueAtTime(1400, now + t + 0.04);

    clickGain.gain.setValueAtTime(0.035, now + t);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.045);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);

    clickOsc.start(now + t);
    clickOsc.stop(now + t + 0.05);
    activeOscillators.push(clickOsc);
  }

  // Return cancel function
  return () => {
    if (isCancelled) return;
    isCancelled = true;
    activeOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (_e) {}
    });
  };
}

/**
 * 🎉 2. Jingle Sukses Ceria (Ketika Barang/Blind Bag Berhasil Keluar)
 * Jingle kemenangan manis dengan arpeggio gemerlap (Sparkling Fanfare)
 */
export function playCuteVendingSuccessJingle(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Sparkling Success Chords: C5 -> G5 -> C6 -> E6 -> G6 -> C7 Fanfare!
  const sparkles = [
    { freq: 523.25, time: 0.00, dur: 0.16, vol: 0.20 }, // C5
    { freq: 659.25, time: 0.08, dur: 0.16, vol: 0.22 }, // E5
    { freq: 783.99, time: 0.16, dur: 0.18, vol: 0.24 }, // G5
    { freq: 1046.50, time: 0.24, dur: 0.22, vol: 0.26 }, // C6
    { freq: 1318.51, time: 0.32, dur: 0.25, vol: 0.28 }, // E6
    { freq: 1567.98, time: 0.40, dur: 0.30, vol: 0.30 }, // G6
    { freq: 2093.00, time: 0.48, dur: 0.65, vol: 0.35 }, // C7 (Grand Sparkle!)
  ];

  sparkles.forEach(s => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(s.freq, now + s.time);

    gain.gain.setValueAtTime(0.001, now + s.time);
    gain.gain.linearRampToValueAtTime(s.vol, now + s.time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + s.time + s.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + s.time);
    osc.stop(now + s.time + s.dur + 0.05);
  });

  // Soft victory chord background
  const chordFrequencies = [523.25, 659.25, 783.99, 1046.50];
  chordFrequencies.forEach(freq => {
    const chordOsc = ctx.createOscillator();
    const chordGain = ctx.createGain();

    chordOsc.type = 'triangle';
    chordOsc.frequency.setValueAtTime(freq, now + 0.48);

    chordGain.gain.setValueAtTime(0.001, now + 0.48);
    chordGain.gain.linearRampToValueAtTime(0.12, now + 0.52);
    chordGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    chordOsc.connect(chordGain);
    chordGain.connect(ctx.destination);

    chordOsc.start(now + 0.48);
    chordOsc.stop(now + 1.3);
  });
}

/**
 * 🌟 3. Mainkan Rangkaian Penuh: Musik Berputar -> Jingle Sukses Berhasil
 */
export function playCuteVendingFullExperience(
  spinDurationMs: number = 2800,
  onComplete?: () => void
): () => void {
  const stopSpinning = playCuteVendingSpinningMusic(spinDurationMs);

  const timer = setTimeout(() => {
    playCuteVendingSuccessJingle();
    if (onComplete) onComplete();
  }, spinDurationMs);

  return () => {
    stopSpinning();
    clearTimeout(timer);
  };
}
