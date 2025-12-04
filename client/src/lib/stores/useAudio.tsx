import { create } from "zustand";

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

function createAudioPool(src: string, size: number): HTMLAudioElement[] {
  const pool: HTMLAudioElement[] = [];
  for (let i = 0; i < size; i++) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.load();
    pool.push(audio);
  }
  return pool;
}

function playFromPool(pool: HTMLAudioElement[], volume: number): void {
  if (!audioUnlocked) return;
  
  for (const audio of pool) {
    if (audio.paused || audio.ended) {
      audio.volume = volume;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
  }
  
  if (pool.length > 0) {
    const audio = pool[0];
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

export const useAudio = create<AudioState>((set, get) => ({
  isMuted: false,
  isUnlocked: false,
  backgroundAudio: null,
  
  initAudio: () => {
    console.log("Audio init: Creating audio pools");
    
    hitPool = createAudioPool("/sounds/hit.mp3", 3);
    successPool = createAudioPool("/sounds/success.mp3", 2);
    
    const bgAudio = new Audio("/sounds/background.mp3");
    bgAudio.loop = true;
    bgAudio.volume = 0.3;
    bgAudio.preload = "auto";
    bgAudio.load();
    
    set({ backgroundAudio: bgAudio });
    console.log("Audio init complete");
  },
  
  unlockAudio: () => {
    if (audioUnlocked) return;
    
    console.log("Unlocking audio...");
    
    const { backgroundAudio } = get();
    
    const unlockAll = async () => {
      const allAudio = [...hitPool, ...successPool];
      if (backgroundAudio) allAudio.push(backgroundAudio);
      
      for (const audio of allAudio) {
        try {
          audio.muted = true;
          audio.volume = 0;
          await audio.play();
          audio.pause();
          audio.muted = false;
          audio.currentTime = 0;
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Restore volumes
      for (const audio of hitPool) audio.volume = 0.5;
      for (const audio of successPool) audio.volume = 0.7;
      if (backgroundAudio) backgroundAudio.volume = 0.3;
      
      audioUnlocked = true;
      set({ isUnlocked: true });
      console.log("Audio unlocked successfully");
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
    if (isMuted || !audioUnlocked) return;
    
    playFromPool(hitPool, 0.5);
  },
  
  playSuccess: () => {
    const { isMuted } = get();
    if (isMuted || !audioUnlocked) return;
    
    playFromPool(successPool, 0.7);
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
      backgroundAudio.play().then(() => {
        console.log("Background music started");
      }).catch((e) => {
        console.log("Background music failed, retrying...", e);
        setTimeout(() => get().playBackgroundMusic(), 500);
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
