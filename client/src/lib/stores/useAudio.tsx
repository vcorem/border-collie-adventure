import { create } from "zustand";

interface AudioState {
  audioContext: AudioContext | null;
  backgroundBuffer: AudioBuffer | null;
  hitBuffer: AudioBuffer | null;
  successBuffer: AudioBuffer | null;
  backgroundSource: AudioBufferSourceNode | null;
  isMuted: boolean;
  isUnlocked: boolean;
  
  initAudio: () => Promise<void>;
  unlockAudio: () => Promise<void>;
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
}

async function loadAudioBuffer(context: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    console.log(`Loaded audio: ${url}`);
    return audioBuffer;
  } catch (e) {
    console.error(`Failed to load audio ${url}:`, e);
    return null;
  }
}

export const useAudio = create<AudioState>((set, get) => ({
  audioContext: null,
  backgroundBuffer: null,
  hitBuffer: null,
  successBuffer: null,
  backgroundSource: null,
  isMuted: false,
  isUnlocked: false,
  
  initAudio: async () => {
    const { audioContext } = get();
    if (audioContext) return;
    
    console.log("Creating AudioContext...");
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    set({ audioContext: ctx });
    
    const [bgBuffer, hitBuffer, successBuffer] = await Promise.all([
      loadAudioBuffer(ctx, "/sounds/background.mp3"),
      loadAudioBuffer(ctx, "/sounds/hit.mp3"),
      loadAudioBuffer(ctx, "/sounds/success.mp3"),
    ]);
    
    set({ 
      backgroundBuffer: bgBuffer,
      hitBuffer: hitBuffer,
      successBuffer: successBuffer,
    });
    
    console.log("Audio buffers loaded successfully");
  },
  
  unlockAudio: async () => {
    const { audioContext, isUnlocked } = get();
    if (isUnlocked) return;
    
    console.log("Unlocking audio...");
    
    let ctx = audioContext;
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      set({ audioContext: ctx });
    }
    
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
        console.log("AudioContext resumed");
      } catch (e) {
        console.error("Failed to resume AudioContext:", e);
      }
    }
    
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    console.log("Audio unlocked with silent buffer");
    set({ isUnlocked: true });
    
    const { backgroundBuffer, hitBuffer, successBuffer } = get();
    if (!backgroundBuffer || !hitBuffer || !successBuffer) {
      console.log("Loading audio buffers after unlock...");
      const [bgBuffer, hBuffer, sBuffer] = await Promise.all([
        loadAudioBuffer(ctx, "/sounds/background.mp3"),
        loadAudioBuffer(ctx, "/sounds/hit.mp3"),
        loadAudioBuffer(ctx, "/sounds/success.mp3"),
      ]);
      
      set({ 
        backgroundBuffer: bgBuffer,
        hitBuffer: hBuffer,
        successBuffer: sBuffer,
      });
    }
  },
  
  toggleMute: () => {
    const { isMuted, backgroundSource, audioContext } = get();
    const newMutedState = !isMuted;
    set({ isMuted: newMutedState });
    
    if (newMutedState && backgroundSource) {
      try {
        backgroundSource.stop();
        set({ backgroundSource: null });
      } catch (e) {}
    }
  },
  
  playHit: () => {
    const { audioContext, isMuted } = get();
    console.log("playHit called", { hasContext: !!audioContext, isMuted });
    
    if (!audioContext || isMuted) {
      console.log("Cannot play hit sound - missing requirements");
      return;
    }
    
    try {
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(55, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      console.log("Hit sound played (synthesized) via Web Audio API");
    } catch (e) {
      console.error("Hit sound error:", e);
    }
  },
  
  playSuccess: () => {
    const { audioContext, successBuffer, isMuted } = get();
    
    if (!audioContext || !successBuffer || isMuted) return;
    
    try {
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.7;
      gainNode.connect(audioContext.destination);
      
      const source = audioContext.createBufferSource();
      source.buffer = successBuffer;
      source.connect(gainNode);
      source.start(0);
      console.log("Success sound played");
    } catch (e) {
      console.error("Success sound error:", e);
    }
  },
  
  playBackgroundMusic: () => {
    const state = get();
    const { audioContext, backgroundBuffer, backgroundSource, isMuted } = state;
    console.log("playBackgroundMusic called", { hasContext: !!audioContext, hasBuffer: !!backgroundBuffer, isMuted });
    
    if (isMuted) {
      console.log("Audio is muted, not playing");
      return;
    }
    
    if (!audioContext || !backgroundBuffer) {
      console.log("Background music not ready, will retry in 500ms");
      setTimeout(() => {
        const retryState = get();
        if (!retryState.isMuted && retryState.audioContext && retryState.backgroundBuffer && !retryState.backgroundSource) {
          get().playBackgroundMusic();
        }
      }, 500);
      return;
    }
    
    if (backgroundSource) {
      try {
        backgroundSource.stop();
      } catch (e) {}
    }
    
    try {
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.3;
      gainNode.connect(audioContext.destination);
      
      const source = audioContext.createBufferSource();
      source.buffer = backgroundBuffer;
      source.loop = true;
      source.connect(gainNode);
      source.start(0);
      
      set({ backgroundSource: source });
      console.log("Background music started via Web Audio API");
    } catch (e) {
      console.error("Background music error:", e);
    }
  },
  
  stopBackgroundMusic: () => {
    const { backgroundSource } = get();
    if (backgroundSource) {
      try {
        backgroundSource.stop();
      } catch (e) {}
      set({ backgroundSource: null });
    }
  }
}));
