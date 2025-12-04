import { create } from "zustand";
import { Capacitor } from "@capacitor/core";
import { NativeAudio } from "@capacitor-community/native-audio";

const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

interface AudioState {
  audioContext: AudioContext | null;
  backgroundBuffer: AudioBuffer | null;
  hitBuffer: AudioBuffer | null;
  successBuffer: AudioBuffer | null;
  backgroundSource: AudioBufferSourceNode | null;
  
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

export const useAudio = create<AudioState>((set, get) => ({
  audioContext: null,
  backgroundBuffer: null,
  hitBuffer: null,
  successBuffer: null,
  backgroundSource: null,
  
  isMuted: false,
  isUnlocked: false,
  isNative: false,
  nativeLoaded: false,
  
  initAudio: async () => {
    const native = isNativeApp();
    console.log("Audio init - Native platform:", native);
    set({ isNative: native });
    
    if (native) {
      try {
        console.log("Loading native audio assets...");
        
        await NativeAudio.preload({
          assetId: "background",
          assetPath: "sounds/background.mp3",
          audioChannelNum: 1,
          isUrl: false,
        });
        console.log("Background audio preloaded");
        
        await NativeAudio.preload({
          assetId: "hit",
          assetPath: "sounds/hit.mp3",
          audioChannelNum: 1,
          isUrl: false,
        });
        console.log("Hit audio preloaded");
        
        await NativeAudio.preload({
          assetId: "success",
          assetPath: "sounds/success.mp3",
          audioChannelNum: 1,
          isUrl: false,
        });
        console.log("Success audio preloaded");
        
        set({ nativeLoaded: true, isUnlocked: true });
        console.log("Native audio loaded successfully");
      } catch (e) {
        console.error("Native audio init error:", e);
      }
    } else {
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
    }
  },
  
  unlockAudio: async () => {
    const { isUnlocked, audioContext, isNative } = get();
    if (isUnlocked) return;
    
    console.log("Unlocking audio...");
    
    if (isNative) {
      set({ isUnlocked: true });
      return;
    }
    
    if (audioContext && audioContext.state === "suspended") {
      try {
        await audioContext.resume();
        console.log("AudioContext resumed");
      } catch (e) {
        console.error("AudioContext resume error:", e);
      }
    }
    
    set({ isUnlocked: true });
  },
  
  toggleMute: () => {
    const { isMuted, backgroundSource, isNative } = get();
    const newMutedState = !isMuted;
    set({ isMuted: newMutedState });
    
    if (newMutedState) {
      if (isNative) {
        try {
          NativeAudio.stop({ assetId: "background" }).catch(() => {});
        } catch (e) {}
      } else if (backgroundSource) {
        try { backgroundSource.stop(); } catch (e) {}
        set({ backgroundSource: null });
      }
    }
  },
  
  playHit: () => {
    const { audioContext, isMuted, isNative, nativeLoaded } = get();
    if (isMuted) return;
    
    console.log("playHit - native:", isNative, "loaded:", nativeLoaded);
    
    if (isNative && nativeLoaded) {
      try {
        NativeAudio.play({ assetId: "hit" }).then(() => {
          console.log("Hit played via NativeAudio");
        }).catch((e) => {
          console.error("NativeAudio hit error:", e);
        });
      } catch (e) {
        console.error("Hit sound error:", e);
      }
      return;
    }
    
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
      } catch (e) {
        console.error("Web Audio hit error:", e);
      }
    }
  },
  
  playSuccess: () => {
    const { audioContext, successBuffer, isMuted, isNative, nativeLoaded } = get();
    if (isMuted) return;
    
    console.log("playSuccess - native:", isNative, "loaded:", nativeLoaded);
    
    if (isNative && nativeLoaded) {
      try {
        NativeAudio.play({ assetId: "success" }).then(() => {
          console.log("Success played via NativeAudio");
        }).catch((e) => {
          console.error("NativeAudio success error:", e);
        });
      } catch (e) {
        console.error("Success sound error:", e);
      }
      return;
    }
    
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
      } catch (e) {
        console.error("Web Audio success error:", e);
      }
    }
  },
  
  playBackgroundMusic: () => {
    const state = get();
    const { audioContext, backgroundBuffer, backgroundSource, isMuted, isUnlocked, isNative, nativeLoaded } = state;
    
    console.log("playBackgroundMusic - native:", isNative, "loaded:", nativeLoaded, "unlocked:", isUnlocked);
    
    if (isMuted) return;
    
    if (!isUnlocked) {
      setTimeout(() => get().playBackgroundMusic(), 300);
      return;
    }
    
    if (isNative && nativeLoaded) {
      try {
        NativeAudio.stop({ assetId: "background" }).catch(() => {});
        
        NativeAudio.setVolume({ assetId: "background", volume: 0.3 }).catch(() => {});
        
        NativeAudio.loop({ assetId: "background" }).then(() => {
          console.log("Background music looping via NativeAudio");
        }).catch((e) => {
          console.error("NativeAudio background error:", e);
        });
      } catch (e) {
        console.error("Background music error:", e);
      }
      return;
    }
    
    if (backgroundSource) {
      try { backgroundSource.stop(); } catch (e) {}
      set({ backgroundSource: null });
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
        console.log("Background music started via Web Audio");
      } catch (e) {
        console.error("Web Audio background error:", e);
      }
    }
  },
  
  stopBackgroundMusic: () => {
    const { backgroundSource, isNative } = get();
    
    if (isNative) {
      try {
        NativeAudio.stop({ assetId: "background" }).catch(() => {});
      } catch (e) {}
    }
    
    if (backgroundSource) {
      try { backgroundSource.stop(); } catch (e) {}
      set({ backgroundSource: null });
    }
  }
}));
