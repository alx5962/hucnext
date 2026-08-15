import compiler from "./compiler";
import { Song, PatternCell } from "shared/lib/uge/types";
import { pceNote2Freq } from "shared/lib/music/constants";

type StepType = "single" | "frame" | "run";
type Emu = number | undefined;

type AudioCaptureListener = (
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
) => void;

export type EmulatorController = {
  init: (romData: Uint8Array) => void;
  writeMem: (addr: number, data: number) => void;
  readMem: (addr: number) => number;
  step: (stepType: StepType) => boolean | undefined;
  updateRom: (romData: Uint8Array) => boolean;
  setChannel: (channel: number, muted: boolean) => boolean;
  resetAudio: () => void;
  getAudioClock: () => {
    currentTime: number;
    scheduledTime: number;
    bufferDuration: number;
  };
  playTone: (
    frequency: number,
    duration: number,
    startTime?: number,
    volume?: number,
  ) => void;
  setAudioCapture: (listener: AudioCaptureListener) => void;
  removeAudioCapture: () => void;
  isAvailable: () => boolean;
  setSongForPlayback?: (song: Song | null) => void;
};

const audioBufferSize = 1024;

let audioCtx: AudioContext;
let masterGain: GainNode;

const ensureAudioContext = () => {
  if (typeof audioCtx === "undefined" && typeof window !== "undefined") {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

// PC Engine Bandlimited DC-centered 32-sample Wave Tables
const pceDutyWaves: Float32Array[] = [
  // 12.5% Pulse
  new Float32Array([0, 0.375, 0.75, 0.9375, 0.75, 0.375, 0, -0.25, -0.5, -0.6875, -0.8125, -0.8125, -0.875, -0.875, -0.8125, -0.6875, -0.5625, -0.4375, -0.3125, -0.1875, -0.125, -0.0625, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  // 25% Pulse (Acoustic Piano)
  new Float32Array([0, 0.3125, 0.625, 0.8125, 0.9375, 0.9375, 0.875, 0.75, 0.5, 0.1875, -0.125, -0.375, -0.5625, -0.6875, -0.8125, -0.875, -0.875, -0.8125, -0.6875, -0.5625, -0.4375, -0.3125, -0.1875, -0.125, -0.0625, 0, 0, 0, 0, 0, 0, 0]),
  // 50% Pulse (Flute / Square)
  new Float32Array([0, 0.25, 0.5, 0.75, 0.9375, 0.9375, 0.9375, 0.9375, 0.9375, 0.9375, 0.9375, 0.75, 0.5, 0.25, 0, -0.375, -0.625, -0.8125, -0.9375, -1.0, -1.0, -1.0, -1.0, -1.0, -0.9375, -0.8125, -0.625, -0.375, -0.25, -0.125, -0.0625, 0]),
  // 75% Pulse (Warm String)
  new Float32Array([0, 0.125, 0.375, 0.625, 0.8125, 0.9375, 0.9375, 0.9375, 0.9375, 0.9375, 0.9375, 0.8125, 0.625, 0.375, 0.125, 0, -0.25, -0.4375, -0.625, -0.8125, -0.875, -0.9375, -1.0, -1.0, -0.9375, -0.875, -0.75, -0.5625, -0.375, -0.25, -0.125, 0]),
];

export const createEmulator = (): EmulatorController => {
  let audioTime = 0;
  let audioCaptureListener: AudioCaptureListener | undefined;
  const activeSources = new Set<AudioBufferSourceNode>();

  const fallbackMem = new Uint8Array(65536);
  let activeSong: Song | null = null;

  // PC Engine HuC6280 PSG Channel State
  const chMuted = [false, false, false, false, false, false];
  const chActive = [false, false, false, false, false, false];
  const chPhase = [0, 0, 0, 0, 0, 0];
  const chFreq = [0, 0, 0, 0, 0, 0];
  const chVol = [0, 0, 0, 0, 0, 0];
  const chEnvVal = [0, 0, 0, 0, 0, 0];
  const chEnvDir = [0, 0, 0, 0, 0, 0];
  const chEnvStep = [0, 0, 0, 0, 0, 0];
  const chEnvTimer = [0, 0, 0, 0, 0, 0];
  const chIsNoise = [false, false, false, false, false, false];
  const chWave = [
    new Float32Array(pceDutyWaves[1]),
    new Float32Array(pceDutyWaves[1]),
    new Float32Array(pceDutyWaves[2]),
    new Float32Array(pceDutyWaves[2]),
    new Float32Array(32),
    new Float32Array(32),
  ];

  let noiseLfsr = 0x7fff;

  const isAvailable = () => true;
  const getRamAddr = (sym: string) => compiler.getRamSymbols().indexOf(sym);

  const playBuffer = (buffer: AudioBuffer, time: number) => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(masterGain);
    source.start(time);

    activeSources.add(source);
    source.onended = () => {
      activeSources.delete(source);
      source.disconnect();
    };
  };

  const stopAllAudio = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    for (const source of activeSources) {
      try {
        source.stop(ctx.currentTime);
      } catch {}
      source.disconnect();
    }
    activeSources.clear();
  };

  const resetAudio = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    stopAllAudio();
    masterGain?.gain.cancelScheduledValues(ctx.currentTime);
    audioTime = ctx.currentTime;
    for (let c = 0; c < 6; c++) {
      chActive[c] = false;
      chVol[c] = 0;
    }
  };

  const playTone = (
    frequency: number,
    duration: number,
    startTime?: number,
    volume = 0.18,
  ) => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const time = Math.max(startTime ?? ctx.currentTime, ctx.currentTime);
    const sampleRate = ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, numSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const wave = pceDutyWaves[1]; // Piano 25% pulse
    let phase = 0;
    const phaseStep = (frequency * 32) / sampleRate;

    for (let i = 0; i < numSamples; i++) {
      const progress = i / numSamples;
      const env = volume * Math.max(0, 1 - progress);
      const s = wave[Math.floor(phase) % 32] * env;
      left[i] = s;
      right[i] = s;
      phase += phaseStep;
    }

    playBuffer(buffer, time);
  };

  const triggerChannelNote = (
    track: number,
    note: number,
    instIndex: number,
  ) => {
    const pceCh = track < 3 ? track : 4;
    chActive[pceCh] = true;
    chIsNoise[pceCh] = track === 3;

    if (note < 72 && pceNote2Freq[note]) {
      let period = pceNote2Freq[note];
      if (track === 2) {
        if (note >= 12 && pceNote2Freq[note - 12]) {
          period = pceNote2Freq[note - 12];
        } else {
          period = pceNote2Freq[note] * 2;
        }
      }
      chFreq[pceCh] = 3580000 / (32 * period);
    } else {
      chFreq[pceCh] = 440;
    }

    if (track === 0 || track === 1) {
      let dutyIdx = 1;
      let initVol = 15;
      let envDir = 0;
      let envStep = 5;
      if (activeSong && instIndex > 0 && activeSong.dutyInstruments[instIndex - 1]) {
        const inst = activeSong.dutyInstruments[instIndex - 1];
        dutyIdx = inst.dutyCycle ?? 1;
        initVol = inst.initialVolume ?? 15;
        envDir = inst.volumeSweepChange > 0 ? 1 : 0;
        envStep = inst.volumeSweepChange !== 0 ? Math.abs(inst.volumeSweepChange) : 0;
      }
      chWave[pceCh].set(pceDutyWaves[dutyIdx % 4]);
      chEnvVal[pceCh] = initVol;
      chEnvDir[pceCh] = envDir;
      chEnvStep[pceCh] = envStep;
      chEnvTimer[pceCh] = 0;
      chVol[pceCh] = ((initVol * 2 + 1) / 31) * 0.18;
    } else if (track === 2) {
      let waveIdx = 0;
      let initVol = 15;
      if (activeSong && instIndex > 0 && activeSong.waveInstruments[instIndex - 1]) {
        const inst = activeSong.waveInstruments[instIndex - 1];
        waveIdx = inst.waveIndex ?? 0;
        initVol = (inst.volume ?? 0) * 5;
      }
      if (activeSong && activeSong.waves[waveIdx]) {
        const wData = activeSong.waves[waveIdx];
        for (let i = 0; i < 32; i++) {
          chWave[pceCh][i] = ((wData[i] ?? 8) - 8) / 8;
        }
      }
      chVol[pceCh] = (Math.max(1, initVol) / 31) * 0.18;
    } else if (track === 3) {
      let initVol = 15;
      let envDir = 0;
      let envStep = 5;
      if (activeSong && instIndex > 0 && activeSong.noiseInstruments[instIndex - 1]) {
        const inst = activeSong.noiseInstruments[instIndex - 1];
        initVol = inst.initialVolume ?? 15;
        envDir = inst.volumeSweepChange > 0 ? 1 : 0;
        envStep = inst.volumeSweepChange !== 0 ? Math.abs(inst.volumeSweepChange) : 0;
      }
      chEnvVal[pceCh] = initVol;
      chEnvDir[pceCh] = envDir;
      chEnvStep[pceCh] = envStep;
      chEnvTimer[pceCh] = 0;
      chVol[pceCh] = ((initVol * 2 + 1) / 31) * 0.15;
    }
  };

  const synthesizeFrameAudio = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const sampleRate = ctx.sampleRate;
    const frameSamples = Math.floor(sampleRate / 60);
    const left = new Float32Array(frameSamples);
    const right = new Float32Array(frameSamples);

    for (let c = 0; c < 6; c++) {
      if (!chActive[c] || chMuted[c] || chVol[c] <= 0) continue;

      if (chIsNoise[c]) {
        for (let s = 0; s < frameSamples; s++) {
          const bit = ((noiseLfsr >> 0) ^ (noiseLfsr >> 1)) & 1;
          noiseLfsr = (noiseLfsr >> 1) | (bit << 14);
          const sample = (bit ? 1 : -1) * chVol[c];
          left[s] += sample;
          right[s] += sample;
        }
      } else {
        const wave = chWave[c];
        let phase = chPhase[c];
        const phaseStep = (chFreq[c] * 32) / sampleRate;
        const vol = chVol[c];

        for (let s = 0; s < frameSamples; s++) {
          const sample = wave[Math.floor(phase) % 32] * vol;
          left[s] += sample;
          right[s] += sample;
          phase += phaseStep;
        }
        chPhase[c] = phase % 32;
      }
    }

    if (audioCaptureListener) {
      audioCaptureListener(left, right, sampleRate);
    } else {
      const buffer = ctx.createBuffer(2, frameSamples, sampleRate);
      buffer.getChannelData(0).set(left);
      buffer.getChannelData(1).set(right);
      playBuffer(buffer, Math.max(audioTime, ctx.currentTime));
    }
    audioTime = Math.max(audioTime, ctx.currentTime) + frameSamples / sampleRate;
  };

  const updateEnvelopes = () => {
    for (let c = 0; c < 6; c++) {
      if (!chActive[c] || chEnvStep[c] === 0) continue;
      chEnvTimer[c]++;
      if (chEnvTimer[c] >= chEnvStep[c] * 4) {
        chEnvTimer[c] = 0;
        if (chEnvDir[c] === 0) {
          if (chEnvVal[c] > 0) chEnvVal[c]--;
        } else {
          if (chEnvVal[c] < 15) chEnvVal[c]++;
        }
        chVol[c] = ((chEnvVal[c] * 2 + 1) / 31) * 0.18;
        if (chEnvVal[c] === 0) {
          chActive[c] = false;
        }
      }
    }
  };

  const step = (stepType: StepType) => {
    const isPausedAddr = getRamAddr("is_player_paused");
    const isPaused = isPausedAddr >= 0 ? fallbackMem[isPausedAddr] === 1 : fallbackMem[0] === 1;

    if (!isPaused) {
      const rowAddr = getRamAddr("row");
      const seqAddr = getRamAddr("current_order");
      const tickAddr = getRamAddr("tick");
      const tprAddr = getRamAddr("ticks_per_row");
      const orderCntAddr = getRamAddr("order_cnt");

      const rAddr = rowAddr >= 0 ? rowAddr : 1;
      const sAddr = seqAddr >= 0 ? seqAddr : 2;
      const tAddr = tickAddr >= 0 ? tickAddr : 3;

      const ticksPerRow = tprAddr >= 0 && fallbackMem[tprAddr] > 0 ? fallbackMem[tprAddr] : 6;
      const orderCnt = orderCntAddr >= 0 && fallbackMem[orderCntAddr] > 0 ? fallbackMem[orderCntAddr] : 2;

      let curTick = fallbackMem[tAddr];
      let curRow = fallbackMem[rAddr];
      let curSeq = fallbackMem[sAddr];

      if (curTick === 0 && activeSong) {
        const seqIndex = Math.floor(curSeq / 2);
        const channelsCount = Math.min(4, activeSong.sequence[seqIndex]?.channels.length || 0);
        for (let track = 0; track < channelsCount; track++) {
          const patternIdx = activeSong.sequence[seqIndex]?.channels[track];
          const cell: PatternCell | undefined = patternIdx !== undefined ? activeSong.patterns[patternIdx]?.[curRow] : undefined;
          if (cell && cell.note !== null && cell.note !== 255) {
            triggerChannelNote(track, cell.note, cell.instrument ?? 0);
          }
        }
      }

      synthesizeFrameAudio();
      updateEnvelopes();

      curTick++;
      if (curTick >= ticksPerRow) {
        curTick = 0;
        curRow++;
        if (curRow >= 64) {
          curRow = 0;
          curSeq = (curSeq + 2) % Math.max(2, orderCnt);
        }
      }

      fallbackMem[tAddr] = curTick;
      fallbackMem[rAddr] = curRow;
      fallbackMem[sAddr] = curSeq;
    }
    return true;
  };

  const readMem = (addr: number) => {
    const safeAddr = addr >= 0 ? addr & 0xffff : 0;
    return fallbackMem[safeAddr];
  };

  const writeMem = (addr: number, data: number) => {
    const safeAddr = addr >= 0 ? addr & 0xffff : 0;
    fallbackMem[safeAddr] = data & 0xff;

    const doResumeAddr = getRamAddr("do_resume_player");
    const isPausedAddr = getRamAddr("is_player_paused");
    if (addr === doResumeAddr && data === 1) {
      if (isPausedAddr >= 0) fallbackMem[isPausedAddr] = 0;
      fallbackMem[0] = 0;
      fallbackMem[safeAddr] = 0;
    }
    if ((isPausedAddr >= 0 && addr === isPausedAddr && data === 1) || (addr === 0xff0f && (data & 0b00001000))) {
      if (isPausedAddr >= 0) fallbackMem[isPausedAddr] = 1;
      fallbackMem[0] = 1;
      resetAudio();
    }
  };

  const init = (_romData: Uint8Array) => {
    fallbackMem.fill(0);
    const isPausedAddr = getRamAddr("is_player_paused");
    if (isPausedAddr >= 0) fallbackMem[isPausedAddr] = 1;
    fallbackMem[0] = 1;
    resetAudio();
  };

  const updateRom = (_romData: Uint8Array) => {
    return true;
  };

  return {
    init,
    writeMem,
    readMem,
    step,
    updateRom,
    setChannel: (channel: number, muted: boolean) => {
      if (channel >= 0 && channel < 6) {
        chMuted[channel] = muted;
      }
      return muted;
    },
    resetAudio,
    getAudioClock: () => {
      const ctx = ensureAudioContext();
      return {
        currentTime: ctx?.currentTime ?? 0,
        scheduledTime: audioTime,
        bufferDuration: audioBufferSize / (ctx?.sampleRate ?? 44100),
      };
    },
    playTone,
    setAudioCapture: (listener: AudioCaptureListener) => {
      audioCaptureListener = listener;
    },
    removeAudioCapture: () => {
      audioCaptureListener = undefined;
    },
    isAvailable,
    setSongForPlayback: (song: Song | null) => {
      activeSong = song;
    },
  };
};

const emulator = createEmulator();

export default emulator;
