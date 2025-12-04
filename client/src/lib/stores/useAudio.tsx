import { create } from "zustand";

interface AudioState {
  audioContext: AudioContext | null;
  backgroundBuffer: AudioBuffer | null;
  hitBuffer: AudioBuffer | null;
  successBuffer: AudioBuffer | null;
  backgroundSource: AudioBufferSourceNode | null;
  
  backgroundAudio: HTMLAudioElement | null;
  successAudio: HTMLAudioElement | null;
  
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
    console.log(`Loading audio from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log(`Fetched ${url}, size: ${arrayBuffer.byteLength} bytes`);
    
    return new Promise((resolve) => {
      context.decodeAudioData(
        arrayBuffer,
        (buffer) => {
          console.log(`Decoded audio: ${url}, duration: ${buffer.duration}s`);
          resolve(buffer);
        },
        (error) => {
          console.error(`Failed to decode ${url}:`, error);
          resolve(null);
        }
      );
    });
  } catch (e) {
    console.error(`Failed to load audio ${url}:`, e);
    return null;
  }
}

function createFallbackAudio(url: string, loop: boolean, volume: number): HTMLAudioElement {
  const audio = new Audio(url);
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = "auto";
  audio.load();
  return audio;
}

export const useAudio = create<AudioState>((set, get) => ({
  audioContext: null,
  backgroundBuffer: null,
  hitBuffer: null,
  successBuffer: null,
  backgroundSource: null,
  
  backgroundAudio: null,
  successAudio: null,
  
  isMuted: false,
  isUnlocked: false,
  
  initAudio: async () => {
    const { audioContext } = get();
    if (audioContext) return;
    
    console.log("Creating AudioContext...");
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.error("AudioContext not supported");
      return;
    }
    
    const ctx = new AudioContextClass();
    set({ audioContext: ctx });
    
    const bgAudio = createFallbackAudio("/sounds/background.mp3", true, 0.3);
    const successAudioEl = createFallbackAudio("/sounds/success.mp3", false, 0.7);
    set({ backgroundAudio: bgAudio, successAudio: successAudioEl });
    
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
    
    console.log("Audio init complete", {
      hasBgBuffer: !!bgBuffer,
      hasHitBuffer: !!hitBuffer,
      hasSuccessBuffer: !!successBuffer,
    });
  },
  
  unlockAudio: async () => {
    const { audioContext, isUnlocked, backgroundAudio, successAudio } = get();
    if (isUnlocked) return;
    
    console.log("Unlocking audio...");
    
    let ctx = audioContext;
    if (!ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        ctx = new AudioContextClass();
        set({ audioContext: ctx });
      }
    }
    
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
        console.log("AudioContext resumed, state:", ctx.state);
      } catch (e) {
        console.error("Failed to resume AudioContext:", e);
      }
    }
    
    if (ctx) {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        console.log("Silent buffer played for unlock");
      } catch (e) {
        console.error("Silent buffer error:", e);
      }
    }
    
    if (backgroundAudio) {
      try {
        backgroundAudio.muted = true;
        await backgroundAudio.play();
        backgroundAudio.pause();
        backgroundAudio.muted = false;
        backgroundAudio.currentTime = 0;
        console.log("Background audio element unlocked");
      } catch (e) {
        console.log("Background audio unlock attempt:", e);
      }
    }
    
    if (successAudio) {
      try {
        successAudio.muted = true;
        await successAudio.play();
        successAudio.pause();
        successAudio.muted = false;
        successAudio.currentTime = 0;
        console.log("Success audio element unlocked");
      } catch (e) {
        console.log("Success audio unlock attempt:", e);
      }
    }
    
    set({ isUnlocked: true });
    console.log("Audio unlock complete");
    
    const { backgroundBuffer, hitBuffer, successBuffer } = get();
    if (!backgroundBuffer || !successBuffer) {
      console.log("Re-attempting to load audio buffers...");
      if (ctx) {
        const [bgBuffer, hBuffer, sBuffer] = await Promise.all([
          backgroundBuffer ? Promise.resolve(backgroundBuffer) : loadAudioBuffer(ctx, "/sounds/background.mp3"),
          hitBuffer ? Promise.resolve(hitBuffer) : loadAudioBuffer(ctx, "/sounds/hit.mp3"),
          successBuffer ? Promise.resolve(successBuffer) : loadAudioBuffer(ctx, "/sounds/success.mp3"),
        ]);
        
        set({ 
          backgroundBuffer: bgBuffer,
          hitBuffer: hBuffer,
          successBuffer: sBuffer,
        });
        console.log("Re-loaded buffers:", { hasBg: !!bgBuffer, hasHit: !!hBuffer, hasSuccess: !!sBuffer });
      }
    }
  },
  
  toggleMute: () => {
    const { isMuted, backgroundSource, backgroundAudio } = get();
    const newMutedState = !isMuted;
    set({ isMuted: newMutedState });
    
    if (newMutedState) {
      if (backgroundSource) {
        try {
          backgroundSource.stop();
          set({ backgroundSource: null });
        } catch (e) {}
      }
      if (backgroundAudio) {
        backgroundAudio.pause();
      }
    }
  },
  
  playHit: () => {
    const { audioContext, isMuted } = get();
    console.log("playHit called", { hasContext: !!audioContext, isMuted });
    
    if (isMuted) return;
    
    if (!audioContext) {
      console.log("No AudioContext for hit sound");
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
      
      console.log("Hit sound played (synthesized)");
    } catch (e) {
      console.error("Hit sound error:", e);
    }
  },
  
  playSuccess: () => {
    const { audioContext, successBuffer, successAudio, isMuted } = get();
    console.log("playSuccess called", { hasContext: !!audioContext, hasBuffer: !!successBuffer, hasAudio: !!successAudio, isMuted });
    
    if (isMuted) return;
    
    if (audioContext && successBuffer) {
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
        console.log("Success sound played via Web Audio API");
        return;
      } catch (e) {
        console.error("Web Audio success error:", e);
      }
    }
    
    if (successAudio) {
      try {
        successAudio.currentTime = 0;
        successAudio.play().then(() => {
          console.log("Success sound played via HTMLAudioElement");
        }).catch((e) => {
          console.error("HTMLAudioElement success error:", e);
        });
      } catch (e) {
        console.error("Success audio fallback error:", e);
      }
    }
  },
  
  playBackgroundMusic: () => {
    const state = get();
    const { audioContext, backgroundBuffer, backgroundSource, backgroundAudio, isMuted, isUnlocked } = state;
    console.log("playBackgroundMusic called", { 
      hasContext: !!audioContext, 
      hasBuffer: !!backgroundBuffer, 
      hasAudio: !!backgroundAudio,
      isMuted,
      isUnlocked 
    });
    
    if (isMuted) {
      console.log("Audio is muted");
      return;
    }
    
    if (!isUnlocked) {
      console.log("Audio not unlocked yet, retrying in 300ms");
      setTimeout(() => get().playBackgroundMusic(), 300);
      return;
    }
    
    if (backgroundSource) {
      try {
        backgroundSource.stop();
        set({ backgroundSource: null });
      } catch (e) {}
    }
    
    if (audioContext && backgroundBuffer) {
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
        return;
      } catch (e) {
        console.error("Web Audio background error:", e);
      }
    }
    
    if (backgroundAudio) {
      console.log("Falling back to HTMLAudioElement for background music");
      try {
        backgroundAudio.currentTime = 0;
        backgroundAudio.play().then(() => {
          console.log("Background music started via HTMLAudioElement");
        }).catch((e) => {
          console.error("HTMLAudioElement background error:", e);
          setTimeout(() => {
            if (!get().isMuted && backgroundAudio) {
              backgroundAudio.play().catch(() => {});
            }
          }, 500);
        });
      } catch (e) {
        console.error("Background audio fallback error:", e);
      }
    } else {
      console.log("No background audio available, retrying in 500ms");
      setTimeout(() => get().playBackgroundMusic(), 500);
    }
  },
  
  stopBackgroundMusic: () => {
    const { backgroundSource, backgroundAudio } = get();
    if (backgroundSource) {
      try {
        backgroundSource.stop();
      } catch (e) {}
      set({ backgroundSource: null });
    }
    if (backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
    }
  }
}));
