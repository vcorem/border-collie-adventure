import { create } from "zustand";
import { Capacitor } from "@capacitor/core";
import { NativeAudio } from "@capacitor-community/native-audio";

const isNativeApp = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

interface AudioState {
  audioContext: AudioContext | null;
  backgroundBuffer: AudioBuffer | null;
  hitBuffer: AudioBuffer | null;
  successBuffer: AudioBuffer | null;
  backgroundSource: AudioBufferSourceNode | null;
  
  backgroundAudio: HTMLAudioElement | null;
  successAudio: HTMLAudioElement | null;
  hitAudio: HTMLAudioElement | null;
  
  isMuted: boolean;
  isUnlocked: boolean;
  isNative: boolean;
  nativeLoaded: boolean;
  
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
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    
    return new Promise((resolve) => {
      context.decodeAudioData(
        arrayBuffer,
        (buffer) => resolve(buffer),
        () => resolve(null)
      );
    });
  } catch (e) {
    return null;
  }
}

function createAudioElement(url: string, loop: boolean, volume: number): HTMLAudioElement {
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
  hitAudio: null,
  
  isMuted: false,
  isUnlocked: false,
  isNative: false,
  nativeLoaded: false,
  
  initAudio: async () => {
    const native = isNativeApp();
    console.log("Audio init - Native platform:", native);
    set({ isNative: native });
    
    // Always create HTMLAudioElement fallbacks
    const bgAudio = createAudioElement("/sounds/background.mp3", true, 0.3);
    const successAudioEl = createAudioElement("/sounds/success.mp3", false, 0.7);
    const hitAudioEl = createAudioElement("/sounds/hit.mp3", false, 0.5);
    set({ backgroundAudio: bgAudio, successAudio: successAudioEl, hitAudio: hitAudioEl });
    
    if (native) {
      try {
        console.log("Loading native audio assets...");
        
        await NativeAudio.preload({
          assetId: "background",
          assetPath: "sounds/background.mp3",
          audioChannelNum: 1,
          isUrl: false,
        });
        console.log("Background audio preloaded (native)");
        
        await NativeAudio.preload({
          assetId: "hit",
          assetPath: "sounds/hit.mp3",
          audioChannelNum: 1,
          isUrl: false,
        });
        console.log("Hit audio preloaded (native)");
        
        await NativeAudio.preload({
          assetId: "success",
          assetPath: "sounds/success.mp3",
          audioChannelNum: 1,
          isUrl: false,
        });
        console.log("Success audio preloaded (native)");
        
        set({ nativeLoaded: true });
        console.log("Native audio loaded successfully");
      } catch (e) {
        console.error("Native audio init error - falling back to HTML audio:", e);
        set({ nativeLoaded: false });
      }
    }
    
    // Also create Web Audio context as fallback
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
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
      
      console.log("Web Audio buffers loaded:", { bg: !!bgBuffer, hit: !!hitBuffer, success: !!successBuffer });
    }
  },
  
  unlockAudio: async () => {
    const { isUnlocked, audioContext, backgroundAudio, successAudio, hitAudio } = get();
    if (isUnlocked) return;
    
    console.log("Unlocking audio...");
    
    // Resume AudioContext
    if (audioContext && audioContext.state === "suspended") {
      try {
        await audioContext.resume();
        console.log("AudioContext resumed");
      } catch (e) {
        console.error("AudioContext resume error:", e);
      }
    }
    
    // Unlock HTML audio elements
    const unlockElement = async (audio: HTMLAudioElement | null) => {
      if (!audio) return;
      try {
        audio.muted = true;
        await audio.play();
        audio.pause();
        audio.muted = false;
        audio.currentTime = 0;
      } catch (e) {}
    };
    
    await Promise.all([
      unlockElement(backgroundAudio),
      unlockElement(successAudio),
      unlockElement(hitAudio),
    ]);
    
    set({ isUnlocked: true });
    console.log("Audio unlocked");
  },
  
  toggleMute: () => {
    const { isMuted, backgroundSource, backgroundAudio, isNative, nativeLoaded } = get();
    const newMutedState = !isMuted;
    set({ isMuted: newMutedState });
    
    if (newMutedState) {
      if (isNative && nativeLoaded) {
        try {
          NativeAudio.stop({ assetId: "background" }).catch(() => {});
        } catch (e) {}
      }
      if (backgroundSource) {
        try { backgroundSource.stop(); } catch (e) {}
        set({ backgroundSource: null });
      }
      if (backgroundAudio) {
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
      }
    }
  },
  
  playHit: () => {
    const { audioContext, hitAudio, isMuted, isNative, nativeLoaded } = get();
    if (isMuted) return;
    
    console.log("playHit - native:", isNative, "loaded:", nativeLoaded);
    
    // Try native audio first
    if (isNative && nativeLoaded) {
      try {
        NativeAudio.play({ assetId: "hit" }).then(() => {
          console.log("Hit played via NativeAudio");
        }).catch((e) => {
          console.error("NativeAudio hit error, falling back:", e);
          // Fall through to fallback
          if (hitAudio) {
            hitAudio.currentTime = 0;
            hitAudio.play().catch(() => {});
          }
        });
        return;
      } catch (e) {
        console.error("Hit sound error:", e);
      }
    }
    
    // Fallback: synthesized beep via Web Audio
    if (audioContext) {
      try {
        if (audioContext.state === "suspended") {
          audioContext.resume();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(55, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        console.log("Hit played via Web Audio (synthesized)");
        return;
      } catch (e) {}
    }
    
    // Last fallback: HTML audio
    if (hitAudio) {
      hitAudio.currentTime = 0;
      hitAudio.play().catch(() => {});
    }
  },
  
  playSuccess: () => {
    const { audioContext, successBuffer, successAudio, isMuted, isNative, nativeLoaded } = get();
    if (isMuted) return;
    
    console.log("playSuccess - native:", isNative, "loaded:", nativeLoaded);
    
    // Try native audio first
    if (isNative && nativeLoaded) {
      try {
        NativeAudio.play({ assetId: "success" }).then(() => {
          console.log("Success played via NativeAudio");
        }).catch((e) => {
          console.error("NativeAudio success error, falling back:", e);
          if (successAudio) {
            successAudio.currentTime = 0;
            successAudio.play().catch(() => {});
          }
        });
        return;
      } catch (e) {}
    }
    
    // Fallback: Web Audio API
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
        console.log("Success played via Web Audio");
        return;
      } catch (e) {}
    }
    
    // Last fallback: HTML audio
    if (successAudio) {
      successAudio.currentTime = 0;
      successAudio.play().catch(() => {});
    }
  },
  
  playBackgroundMusic: () => {
    const state = get();
    const { audioContext, backgroundBuffer, backgroundSource, backgroundAudio, isMuted, isUnlocked, isNative, nativeLoaded } = state;
    
    console.log("playBackgroundMusic - native:", isNative, "loaded:", nativeLoaded, "unlocked:", isUnlocked);
    
    if (isMuted) return;
    
    if (!isUnlocked) {
      setTimeout(() => get().playBackgroundMusic(), 300);
      return;
    }
    
    // Stop any existing playback first
    if (backgroundSource) {
      try { backgroundSource.stop(); } catch (e) {}
      set({ backgroundSource: null });
    }
    if (backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
    }
    
    // Try native audio first
    if (isNative && nativeLoaded) {
      try {
        NativeAudio.stop({ assetId: "background" }).catch(() => {});
        NativeAudio.setVolume({ assetId: "background", volume: 0.3 }).catch(() => {});
        NativeAudio.loop({ assetId: "background" }).then(() => {
          console.log("Background music looping via NativeAudio");
        }).catch((e) => {
          console.error("NativeAudio background error, falling back:", e);
          // Fall back to HTML audio
          if (backgroundAudio) {
            backgroundAudio.currentTime = 0;
            backgroundAudio.play().catch(() => {});
          }
        });
        return;
      } catch (e) {
        console.error("Background music error:", e);
      }
    }
    
    // Fallback: Web Audio API
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
        console.log("Background music started via Web Audio");
        return;
      } catch (e) {}
    }
    
    // Last fallback: HTML audio
    if (backgroundAudio) {
      backgroundAudio.currentTime = 0;
      backgroundAudio.play().then(() => {
        console.log("Background music started via HTMLAudio");
      }).catch(() => {});
    }
  },
  
  stopBackgroundMusic: () => {
    const { backgroundSource, backgroundAudio, isNative, nativeLoaded } = get();
    
    if (isNative && nativeLoaded) {
      try {
        NativeAudio.stop({ assetId: "background" }).catch(() => {});
      } catch (e) {}
    }
    
    if (backgroundSource) {
      try { backgroundSource.stop(); } catch (e) {}
      set({ backgroundSource: null });
    }
    
    if (backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
    }
  }
}));
