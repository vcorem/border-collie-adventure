import { create } from "zustand";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  isMuted: boolean;
  
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  isMuted: false,
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  
  toggleMute: () => {
    const { isMuted, backgroundMusic } = get();
    const newMutedState = !isMuted;
    set({ isMuted: newMutedState });
    
    if (backgroundMusic) {
      if (newMutedState) {
        backgroundMusic.pause();
      }
    }
  },
  
  playHit: () => {
    const { hitSound, isMuted } = get();
    console.log("playHit called", { hasSound: !!hitSound, isMuted });
    if (hitSound && !isMuted) {
      try {
        hitSound.currentTime = 0;
        hitSound.volume = 1.0;
        hitSound.play().then(() => {
          console.log("Hit sound played");
        }).catch((e) => {
          console.log("Hit sound error:", e.message);
        });
      } catch (e) {}
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (successSound && !isMuted) {
      try {
        successSound.currentTime = 0;
        successSound.play().catch(() => {});
      } catch (e) {}
    }
  },
  
  playBackgroundMusic: () => {
    const { backgroundMusic } = get();
    console.log("playBackgroundMusic called", { hasMusic: !!backgroundMusic });
    if (backgroundMusic) {
      try {
        backgroundMusic.currentTime = 0;
        const playPromise = backgroundMusic.play();
        if (playPromise) {
          playPromise.then(() => {
            console.log("Background music started successfully");
          }).catch((err) => {
            console.error("Background music play error:", err.message);
          });
        }
      } catch (e) {
        console.error("Background music exception:", e);
      }
    }
  },
  
  stopBackgroundMusic: () => {
    const { backgroundMusic } = get();
    if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
  }
}));
