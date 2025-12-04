import { create } from "zustand";
import { Capacitor } from "@capacitor/core";

interface AudioState {
  isMuted: boolean;
  isUnlocked: boolean;
  backgroundAudio: HTMLAudioElement | null;
  
  initAudio: () => void;
  unlockAudio: () => void;
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
}

let hitPool: HTMLAudioElement[] = [];
let successPool: HTMLAudioElement[] = [];
let audioUnlocked = false;
let unlockAttempts = 0;

function getAudioPath(filename: string): string {
  const isAndroid = Capacitor.getPlatform() === "android";
  const base = isAndroid ? "https://localhost" : "";
  const path = `${base}/sounds/${filename}`;
  console.log(`Audio path for ${filename}: ${path} (platform: ${Capacitor.getPlatform()})`);
  return path;
}

function createAudioElement(filename: string): HTMLAudioElement {
  const audio = new Audio();
  const path = getAudioPath(filename);
  audio.src = path;
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  
  audio.addEventListener("canplaythrough", () => {
    console.log(`Audio ready: ${filename}`);
  });
  
  audio.addEventListener("error", (e) => {
    console.error(`Audio error for ${filename} (src: ${audio.src}):`, audio.error?.message || e);
  });
  
  audio.load();
  return audio;
}

function createAudioPool(filename: string, size: number): HTMLAudioElement[] {
  const pool: HTMLAudioElement[] = [];
  for (let i = 0; i < size; i++) {
    pool.push(createAudioElement(filename));
  }
  return pool;
}

function playFromPool(pool: HTMLAudioElement[], volume: number, name: string): void {
  if (!audioUnlocked) {
    console.log(`Cannot play ${name}: audio not unlocked`);
    return;
  }
  
  for (const audio of pool) {
    if (audio.paused || audio.ended) {
      audio.volume = volume;
      audio.currentTime = 0;
      audio.play().then(() => {
        console.log(`Playing ${name}`);
      }).catch((e) => {
        console.error(`Failed to play ${name} (src: ${audio.src}):`, e);
      });
      return;
    }
  }
  
  if (pool.length > 0) {
    const audio = pool[0];
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch((e) => {
      console.error(`Failed to play ${name}:`, e);
    });
  }
}

export const useAudio = create<AudioState>((set, get) => ({
  isMuted: false,
  isUnlocked: false,
  backgroundAudio: null,
  
  initAudio: () => {
    console.log("Audio init - Platform:", Capacitor.getPlatform());
    
    hitPool = createAudioPool("hit.mp3", 3);
    successPool = createAudioPool("success.mp3", 2);
    
    const bgAudio = createAudioElement("background.mp3");
    bgAudio.loop = true;
    bgAudio.volume = 0.3;
    
    set({ backgroundAudio: bgAudio });
    console.log("Audio init complete");
  },
  
  unlockAudio: () => {
    if (audioUnlocked) return;
    
    unlockAttempts++;
    console.log(`Unlocking audio (attempt ${unlockAttempts})...`);
    
    const { backgroundAudio } = get();
    
    const unlockElement = async (audio: HTMLAudioElement, name: string): Promise<boolean> => {
      try {
        const originalVolume = audio.volume;
        audio.muted = true;
        audio.volume = 0;
        
        await audio.play();
        audio.pause();
        
        audio.muted = false;
        audio.volume = originalVolume;
        audio.currentTime = 0;
        
        console.log(`Unlocked: ${name}`);
        return true;
      } catch (e) {
        console.error(`Failed to unlock ${name} (src: ${audio.src}):`, e);
        return false;
      }
    };
    
    const unlockAll = async () => {
      let successCount = 0;
      
      for (let i = 0; i < hitPool.length; i++) {
        if (await unlockElement(hitPool[i], `hit-${i}`)) successCount++;
      }
      
      for (let i = 0; i < successPool.length; i++) {
        if (await unlockElement(successPool[i], `success-${i}`)) successCount++;
      }
      
      if (backgroundAudio) {
        if (await unlockElement(backgroundAudio, "background")) successCount++;
      }
      
      if (successCount > 0) {
        audioUnlocked = true;
        set({ isUnlocked: true });
        console.log(`Audio unlocked! (${successCount} elements)`);
      } else {
        console.log("No audio elements could be unlocked - will retry on next interaction");
      }
    };
    
    unlockAll();
  },
  
  toggleMute: () => {
    const { isMuted, backgroundAudio } = get();
    const newMuted = !isMuted;
    set({ isMuted: newMuted });
    
    if (newMuted && backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
    }
  },
  
  playHit: () => {
    const { isMuted } = get();
    if (isMuted) return;
    playFromPool(hitPool, 0.5, "hit");
  },
  
  playSuccess: () => {
    const { isMuted } = get();
    if (isMuted) return;
    playFromPool(successPool, 0.7, "success");
  },
  
  playBackgroundMusic: () => {
    const { isMuted, backgroundAudio } = get();
    
    if (isMuted) return;
    
    if (!audioUnlocked) {
      console.log("Background music waiting for unlock...");
      setTimeout(() => get().playBackgroundMusic(), 500);
      return;
    }
    
    if (backgroundAudio) {
      backgroundAudio.currentTime = 0;
      backgroundAudio.volume = 0.3;
      backgroundAudio.play().then(() => {
        console.log("Background music started");
      }).catch((e) => {
        console.error("Background music failed:", e);
        setTimeout(() => get().playBackgroundMusic(), 1000);
      });
    }
  },
  
  stopBackgroundMusic: () => {
    const { backgroundAudio } = get();
    if (backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
    }
  }
}));
