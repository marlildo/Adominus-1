/**
 * useAmbientAudio — Web Audio API procedural sound engine
 * Generates real ambient sounds (rain, ocean, fire, wind, etc.)
 * and meditation music (binaural beats, bowls, solfeggio) — zero API needed.
 */
import { useState, useRef, useCallback, useEffect } from "react";

export type AmbientState = "idle" | "loading" | "playing" | "error";
export type SoundId =
  | "rain" | "ocean" | "fire" | "wind" | "nature" | "stream" | "campfire" | "sky"
  | "music_energize" | "music_nature" | "music_relax" | "music_sleep" | "music_work" | "music_focus";

interface ActiveSound {
  id: SoundId;
  title: string;
  nodes: AudioNode[];
  gainNode: GainNode;
}

// ─── Brown noise buffer (warmer than white) ───────────────────────────────
function createNoiseBuffer(ctx: AudioContext, type: "white" | "brown" | "pink" = "white") {
  const bufSize = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === "brown") {
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    // pink noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufSize; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

function loopNoise(ctx: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

// ─── LFO helper ──────────────────────────────────────────────────────────
function createLFO(ctx: AudioContext, freq: number, min: number, max: number): OscillatorNode {
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = freq;
  // We'll use a WaveShaper or GainNode to scale — caller uses connect
  return lfo;
}

// ─── Sound Definitions ────────────────────────────────────────────────────
type SoundBuilder = (ctx: AudioContext, master: GainNode) => AudioNode[];

const SOUNDS: Record<SoundId, SoundBuilder> = {

  // ── RAIN ────────────────────────────────────────────────────────────────
  rain: (ctx, master) => {
    const buf = createNoiseBuffer(ctx, "white");
    const src = loopNoise(ctx, buf);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 1100;
    lpf.Q.value = 0.7;

    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 200;

    // LFO for gentle rain variation
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.08;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.15;
    lfo.connect(lfoGain);

    const modGain = ctx.createGain();
    modGain.gain.value = 0.92;
    lfoGain.connect(modGain.gain);

    src.connect(lpf);
    lpf.connect(hpf);
    hpf.connect(modGain);
    modGain.connect(master);
    src.start();
    lfo.start();
    return [src, lfo];
  },

  // ── OCEAN WAVES ─────────────────────────────────────────────────────────
  ocean: (ctx, master) => {
    const buf = createNoiseBuffer(ctx, "pink");
    const src = loopNoise(ctx, buf);

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 600;
    lpf.Q.value = 1.2;

    // Slow wave envelope
    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.0;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.08; // one wave every ~12 seconds
    lfo.connect(lfoGain);

    const offset = ctx.createConstantSource();
    offset.offset.value = 0.5;

    lfoGain.connect(waveGain.gain);
    offset.connect(waveGain.gain);

    src.connect(lpf);
    lpf.connect(waveGain);
    waveGain.connect(master);
    src.start();
    lfo.start();
    offset.start();
    return [src, lfo, offset];
  },

  // ── FIRE / LAREIRA ──────────────────────────────────────────────────────
  fire: (ctx, master) => {
    const buf = createNoiseBuffer(ctx, "brown");
    const src = loopNoise(ctx, buf);

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 700;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 350;
    bp.Q.value = 0.5;

    // Flickering
    const flickerGain = ctx.createGain();
    flickerGain.gain.value = 0.85;
    const lfoFlicker = ctx.createOscillator();
    lfoFlicker.type = "sawtooth";
    lfoFlicker.frequency.value = 0.7;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfoFlicker.connect(lfoGain);
    lfoGain.connect(flickerGain.gain);

    src.connect(lpf);
    lpf.connect(bp);
    bp.connect(flickerGain);
    flickerGain.connect(master);
    src.start();
    lfoFlicker.start();
    return [src, lfoFlicker];
  },

  // ── CAMPFIRE (fogueira — crackle variation) ──────────────────────────────
  campfire: (ctx, master) => {
    const buf = createNoiseBuffer(ctx, "brown");
    const src = loopNoise(ctx, buf);

    const bp1 = ctx.createBiquadFilter();
    bp1.type = "bandpass";
    bp1.frequency.value = 600;
    bp1.Q.value = 0.8;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 900;

    // Crackle via faster LFO
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.8;
    const lfo = ctx.createOscillator();
    lfo.type = "sawtooth";
    lfo.frequency.value = 2.3;
    const lg = ctx.createGain();
    lg.gain.value = 0.18;
    lfo.connect(lg);
    lg.connect(crackleGain.gain);

    src.connect(lpf);
    lpf.connect(bp1);
    bp1.connect(crackleGain);
    crackleGain.connect(master);
    src.start();
    lfo.start();
    return [src, lfo];
  },

  // ── WIND ────────────────────────────────────────────────────────────────
  wind: (ctx, master) => {
    const buf = createNoiseBuffer(ctx, "pink");
    const src = loopNoise(ctx, buf);

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 400;
    bp.Q.value = 2.5;

    // Gusting LFO
    const gustGain = ctx.createGain();
    gustGain.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.12;
    const lg = ctx.createGain();
    lg.gain.value = 0.35;
    lfo.connect(lg);
    lg.connect(gustGain.gain);

    const offset = ctx.createConstantSource();
    offset.offset.value = 0.5;
    offset.connect(gustGain.gain);

    src.connect(bp);
    bp.connect(gustGain);
    gustGain.connect(master);
    src.start();
    lfo.start();
    offset.start();
    return [src, lfo, offset];
  },

  // ── FARFALHAR DAS ÁRVORES ────────────────────────────────────────────────
  nature: (ctx, master) => {
    // Wind base
    const buf = createNoiseBuffer(ctx, "pink");
    const src = loopNoise(ctx, buf);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800;
    bp.Q.value = 3;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.4;

    // Bird-like chirps via oscillators
    const birdGain = ctx.createGain();
    birdGain.gain.value = 0.15;

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 2400;
    const env1 = ctx.createGain();
    env1.gain.value = 0;
    osc1.connect(env1);
    env1.connect(birdGain);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 3100;
    const env2 = ctx.createGain();
    env2.gain.value = 0;
    osc2.connect(env2);
    env2.connect(birdGain);

    // Schedule chirps
    const scheduleChirp = (env: GainNode, now: number, freq: number) => {
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(1, now + 0.05);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    };

    const chirpInterval = setInterval(() => {
      const now = ctx.currentTime;
      if (Math.random() > 0.5) scheduleChirp(env1, now, 2400);
      else scheduleChirp(env2, now, 3100);
    }, 1800 + Math.random() * 2200);

    src.connect(bp);
    bp.connect(windGain);
    windGain.connect(master);
    birdGain.connect(master);
    src.start();
    osc1.start();
    osc2.start();

    // Return a cleanup wrapper
    const stopWrapper = { stop: () => clearInterval(chirpInterval) } as unknown as AudioNode;
    return [src, osc1, osc2, stopWrapper];
  },

  // ── RIACHO (stream) ──────────────────────────────────────────────────────
  stream: (ctx, master) => {
    const buf = createNoiseBuffer(ctx, "white");
    const src = loopNoise(ctx, buf);

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 2400;

    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 600;

    // Babbling effect — fast LFO on filter freq
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 400;
    lfo.connect(lfoGain);
    lfoGain.connect(lpf.frequency);

    const streamGain = ctx.createGain();
    streamGain.gain.value = 0.6;

    src.connect(lpf);
    lpf.connect(hpf);
    hpf.connect(streamGain);
    streamGain.connect(master);
    src.start();
    lfo.start();
    return [src, lfo];
  },

  // ── SKY / NIDRA ──────────────────────────────────────────────────────────
  sky: (ctx, master) => {
    // Very subtle low rumble + high shimmer
    const buf = createNoiseBuffer(ctx, "brown");
    const src = loopNoise(ctx, buf);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 120;
    const skyGain = ctx.createGain();
    skyGain.gain.value = 0.3;

    // Shimmer
    const shimmerOsc = ctx.createOscillator();
    shimmerOsc.type = "sine";
    shimmerOsc.frequency.value = 8000;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.008;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.04;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.006;
    lfo.connect(lfoG);
    lfoG.connect(shimmerGain.gain);

    src.connect(lpf);
    lpf.connect(skyGain);
    skyGain.connect(master);
    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(master);
    src.start();
    shimmerOsc.start();
    lfo.start();
    return [src, shimmerOsc, lfo];
  },

  // ── MUSIC: ENERGIZE (Alpha 10Hz binaural + bright pads) ──────────────────
  music_energize: (ctx, master) => {
    // Binaural alpha beat: 10 Hz
    const base = 220;
    const oscL = ctx.createOscillator();
    oscL.frequency.value = base;
    oscL.type = "sine";
    const oscR = ctx.createOscillator();
    oscR.frequency.value = base + 10;
    oscR.type = "sine";

    const panL = ctx.createStereoPanner();
    panL.pan.value = -1;
    const panR = ctx.createStereoPanner();
    panR.pan.value = 1;

    const binauralGain = ctx.createGain();
    binauralGain.gain.value = 0.18;

    oscL.connect(panL); panL.connect(binauralGain);
    oscR.connect(panR); panR.connect(binauralGain);
    binauralGain.connect(master);

    // Pentatonic melody (D major pentatonic)
    const notes = [293.66, 329.63, 369.99, 440, 493.88, 587.33];
    const melody: OscillatorNode[] = [];
    const melodyGain = ctx.createGain();
    melodyGain.gain.value = 0.12;
    melodyGain.connect(master);

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const env = ctx.createGain();
      env.gain.value = 0;
      const startAt = ctx.currentTime + i * 0.5;
      env.gain.setValueAtTime(0, startAt);
      env.gain.linearRampToValueAtTime(0.4, startAt + 0.1);
      env.gain.exponentialRampToValueAtTime(0.001, startAt + 1.2);
      osc.connect(env);
      env.connect(melodyGain);
      osc.start(startAt);
      osc.stop(startAt + 1.5);
      melody.push(osc);
    });

    oscL.start(); oscR.start();
    return [oscL, oscR, ...melody];
  },

  // ── MUSIC: NATURE AWAKENING (Theta 6Hz + nature harmonics) ──────────────
  music_nature: (ctx, master) => {
    // Theta binaural 6 Hz
    const oscL = ctx.createOscillator();
    oscL.frequency.value = 200;
    oscL.type = "sine";
    const oscR = ctx.createOscillator();
    oscR.frequency.value = 206;
    oscR.type = "sine";

    const panL = ctx.createStereoPanner(); panL.pan.value = -1;
    const panR = ctx.createStereoPanner(); panR.pan.value = 1;
    const bg = ctx.createGain(); bg.gain.value = 0.15;
    oscL.connect(panL); panL.connect(bg);
    oscR.connect(panR); panR.connect(bg);
    bg.connect(master);

    // Nature harmonic pads — 432 Hz base (natural tuning)
    const pads = [432, 528, 639];
    const padNodes: OscillatorNode[] = pads.map(freq => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.04;
      osc.connect(g);
      g.connect(master);
      osc.start();
      return osc;
    });

    // Gentle wind under
    const nbuf = createNoiseBuffer(ctx, "pink");
    const nsrc = loopNoise(ctx, nbuf);
    const nbp = ctx.createBiquadFilter();
    nbp.type = "bandpass";
    nbp.frequency.value = 700;
    nbp.Q.value = 3;
    const ng = ctx.createGain(); ng.gain.value = 0.12;
    nsrc.connect(nbp); nbp.connect(ng); ng.connect(master);
    nsrc.start();

    oscL.start(); oscR.start();
    return [oscL, oscR, ...padNodes, nsrc];
  },

  // ── MUSIC: RELAX (Theta 5Hz deep + singing bowls) ────────────────────────
  music_relax: (ctx, master) => {
    // Theta 5 Hz binaural
    const oscL = ctx.createOscillator(); oscL.frequency.value = 180; oscL.type = "sine";
    const oscR = ctx.createOscillator(); oscR.frequency.value = 185; oscR.type = "sine";
    const panL = ctx.createStereoPanner(); panL.pan.value = -1;
    const panR = ctx.createStereoPanner(); panR.pan.value = 1;
    const bg = ctx.createGain(); bg.gain.value = 0.16;
    oscL.connect(panL); panL.connect(bg);
    oscR.connect(panR); panR.connect(bg);
    bg.connect(master);

    // Tibetan bowl overtones
    const bowlFreqs = [174, 285, 396, 528];
    const bowlNodes: OscillatorNode[] = bowlFreqs.map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain(); g.gain.value = 0;
      // Bell envelope
      const t = ctx.currentTime + i * 3;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + 8);
      osc.connect(g); g.connect(master);
      osc.start(); osc.stop(t + 9);
      return osc;
    });

    oscL.start(); oscR.start();
    return [oscL, oscR, ...bowlNodes];
  },

  // ── MUSIC: SLEEP (Delta 2Hz + deep drones) ──────────────────────────────
  music_sleep: (ctx, master) => {
    // Delta 2 Hz binaural
    const oscL = ctx.createOscillator(); oscL.frequency.value = 100; oscL.type = "sine";
    const oscR = ctx.createOscillator(); oscR.frequency.value = 102; oscR.type = "sine";
    const panL = ctx.createStereoPanner(); panL.pan.value = -1;
    const panR = ctx.createStereoPanner(); panR.pan.value = 1;
    const bg = ctx.createGain(); bg.gain.value = 0.18;
    oscL.connect(panL); panL.connect(bg);
    oscR.connect(panR); panR.connect(bg);
    bg.connect(master);

    // Deep drone pad
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 55; // low A
    const droneGain = ctx.createGain(); droneGain.gain.value = 0.09;
    drone.connect(droneGain); droneGain.connect(master);

    // Brown noise undertone
    const nbuf = createNoiseBuffer(ctx, "brown");
    const nsrc = loopNoise(ctx, nbuf);
    const nlpf = ctx.createBiquadFilter(); nlpf.type = "lowpass"; nlpf.frequency.value = 100;
    const ng = ctx.createGain(); ng.gain.value = 0.15;
    nsrc.connect(nlpf); nlpf.connect(ng); ng.connect(master);
    nsrc.start();

    // Very slow LFO on volume for breathing effect
    const breathLfo = ctx.createOscillator();
    breathLfo.type = "sine";
    breathLfo.frequency.value = 0.05; // one breath every 20s
    const breathGain = ctx.createGain(); breathGain.gain.value = 0.04;
    breathLfo.connect(breathGain); breathGain.connect(bg.gain);

    oscL.start(); oscR.start(); drone.start(); breathLfo.start();
    return [oscL, oscR, drone, nsrc, breathLfo];
  },

  // ── MUSIC: WORK CALM (Alpha 10Hz + subtle rhythm) ────────────────────────
  music_work: (ctx, master) => {
    // Alpha 10 Hz
    const oscL = ctx.createOscillator(); oscL.frequency.value = 210; oscL.type = "sine";
    const oscR = ctx.createOscillator(); oscR.frequency.value = 220; oscR.type = "sine";
    const panL = ctx.createStereoPanner(); panL.pan.value = -1;
    const panR = ctx.createStereoPanner(); panR.pan.value = 1;
    const bg = ctx.createGain(); bg.gain.value = 0.14;
    oscL.connect(panL); panL.connect(bg);
    oscR.connect(panR); panR.connect(bg);
    bg.connect(master);

    // Pink noise base
    const nbuf = createNoiseBuffer(ctx, "pink");
    const nsrc = loopNoise(ctx, nbuf);
    const nbp = ctx.createBiquadFilter(); nbp.type = "lowpass"; nbp.frequency.value = 400;
    const ng = ctx.createGain(); ng.gain.value = 0.1;
    nsrc.connect(nbp); nbp.connect(ng); ng.connect(master);
    nsrc.start();

    // 528 Hz solfeggio
    const solf = ctx.createOscillator(); solf.frequency.value = 528; solf.type = "sine";
    const sg = ctx.createGain(); sg.gain.value = 0.045;
    solf.connect(sg); sg.connect(master); solf.start();

    oscL.start(); oscR.start();
    return [oscL, oscR, nsrc, solf];
  },

  // ── MUSIC: FOCUS (Beta 18Hz + clean 396Hz) ───────────────────────────────
  music_focus: (ctx, master) => {
    // Beta 18 Hz binaural for concentration
    const oscL = ctx.createOscillator(); oscL.frequency.value = 240; oscL.type = "sine";
    const oscR = ctx.createOscillator(); oscR.frequency.value = 258; oscR.type = "sine";
    const panL = ctx.createStereoPanner(); panL.pan.value = -1;
    const panR = ctx.createStereoPanner(); panR.pan.value = 1;
    const bg = ctx.createGain(); bg.gain.value = 0.15;
    oscL.connect(panL); panL.connect(bg);
    oscR.connect(panR); panR.connect(bg);
    bg.connect(master);

    // 396 Hz liberation frequency
    const solf = ctx.createOscillator(); solf.frequency.value = 396; solf.type = "triangle";
    const sg = ctx.createGain(); sg.gain.value = 0.055;
    solf.connect(sg); sg.connect(master); solf.start();

    // Soft click rhythm (subtle pulse)
    const clickGain = ctx.createGain(); clickGain.gain.value = 0.06;
    clickGain.connect(master);
    const scheduleClicks = () => {
      const bpm = 60, interval = 60 / bpm;
      for (let i = 0; i < 60; i++) {
        const t = ctx.currentTime + i * interval;
        const osc = ctx.createOscillator();
        osc.frequency.value = 800;
        osc.type = "sine";
        const env = ctx.createGain(); env.gain.value = 0;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.5, t + 0.005);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(env); env.connect(clickGain);
        osc.start(t); osc.stop(t + 0.1);
      }
    };
    scheduleClicks();

    oscL.start(); oscR.start();
    return [oscL, oscR, solf];
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────
export function useAmbientAudio() {
  const [playingId, setPlayingId] = useState<SoundId | null>(null);
  const [state, setState] = useState<AmbientState>("idle");
  const [volume, setVolumeState] = useState(0.8);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const activeRef = useRef<ActiveSound | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const stopAll = useCallback(() => {
    if (activeRef.current) {
      try {
        // Fade out
        activeRef.current.gainNode.gain.setTargetAtTime(0, activeRef.current.gainNode.context.currentTime, 0.3);
        setTimeout(() => {
          activeRef.current?.nodes.forEach(n => {
            try {
              if ("stop" in n) (n as AudioBufferSourceNode | OscillatorNode).stop();
              if ("stop" in n && typeof (n as any).stop === "function" && !(n instanceof OscillatorNode) && !(n instanceof AudioBufferSourceNode)) {
                (n as any).stop(); // custom cleanup wrapper
              }
            } catch {}
          });
          activeRef.current = null;
        }, 500);
      } catch {}
    }
    setPlayingId(null);
    setState("idle");
  }, []);

  useEffect(() => () => {
    stopAll();
    ctxRef.current?.close();
  }, [stopAll]);

  const play = useCallback((id: SoundId) => {
    // Toggle off
    if (playingId === id) { stopAll(); return; }

    stopAll();
    setState("loading");

    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const master = ctx.createGain();
      master.gain.value = volumeRef.current;
      master.connect(ctx.destination);

      const builder = SOUNDS[id];
      if (!builder) throw new Error("Som não encontrado");

      const nodes = builder(ctx, master);
      activeRef.current = { id, title: id, nodes, gainNode: master };

      setPlayingId(id);
      setState("playing");
      setErrorMsg(null);
    } catch (e) {
      console.error("[AmbientAudio]", e);
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : "Erro ao gerar áudio");
      setPlayingId(null);
    }
  }, [playingId, stopAll]);

  const changeVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (activeRef.current) {
      activeRef.current.gainNode.gain.setTargetAtTime(v, activeRef.current.gainNode.context.currentTime, 0.1);
    }
  }, []);

  const stop = useCallback(() => stopAll(), [stopAll]);

  return { playingId, state, volume, errorMsg, play, stop, changeVolume };
}
