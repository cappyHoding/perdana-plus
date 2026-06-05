let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function drumrollStart(): () => void {
  const ctx = getCtx();
  let stopped = false;
  let intensity = 0;
  const startTime = ctx.currentTime;

  function burst() {
    if (stopped) return;
    const elapsed = ctx.currentTime - startTime;
    intensity = Math.min(1, elapsed / 3);

    const bufSize = ctx.sampleRate * 0.02;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (0.3 + intensity * 0.7);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200 + intensity * 800;

    const gain = ctx.createGain();
    gain.gain.value = 0.15 + intensity * 0.25;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    const interval = Math.max(14, 28 - intensity * 14);
    setTimeout(burst, interval);
  }

  burst();
  return () => { stopped = true; };
}

export function lockSound(): void {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Cymbal crash: highpass noise > 2000 Hz
  const bufSize = ctx.sampleRate * 0.4;
  const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = buffer;

  const hipass = ctx.createBiquadFilter();
  hipass.type = 'highpass';
  hipass.frequency.value = 2000;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.6, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  noiseSrc.connect(hipass);
  hipass.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSrc.start(now);

  // Low boom: sine 140Hz → 50Hz
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);

  const boomGain = ctx.createGain();
  boomGain.gain.setValueAtTime(0.8, now);
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(boomGain);
  boomGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}

export function fanfare(): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const startT = now + i * 0.12;
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(0.4, startT + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startT);
    osc.stop(startT + 0.55);
  });
}
