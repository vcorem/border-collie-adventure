import { create } from "zustand";
import { NativeAudio } from "@capacitor-community/native-audio";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  isMuted: boolean;
  isNative: boolean;
  
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setIsNative: (isNative: boolean) => void;
  
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
  isNative: false,
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setIsNative: (isNative) => set({ isNative }),
  
  toggleMute: async () => {
    const { isMuted, isNative, backgroundMusic } = get();
    const newMutedState = !isMuted;
    set({ isMuted: newMutedState });
    
    if (isNative) {
      try {
        if (newMutedState) {
          await NativeAudio.stop({ assetId: 'background' });
        }
      } catch (e) {}
    } else if (backgroundMusic) {
      if (newMutedState) {
        backgroundMusic.pause();
      }
    }
  },
  
  playHit: async () => {
    const { hitSound, isMuted, isNative } = get();
    if (isMuted) return;
    
    if (isNative) {
      try {
        await NativeAudio.play({ assetId: 'hit' });
      } catch (e) {}
    } else if (hitSound) {
      try {
        const soundClone = hitSound.cloneNode() as HTMLAudioElement;
        soundClone.volume = 0.3;
        soundClone.play().catch(() => {});
      } catch (e) {}
    }
  },
  
  playSuccess: async () => {
    const { successSound, isMuted, isNative } = get();
    if (isMuted) return;
    
    if (isNative) {
      try {
        await NativeAudio.play({ assetId: 'success' });
      } catch (e) {}
    } else if (successSound) {
      try {
        successSound.currentTime = 0;
        successSound.play().catch(() => {});
      } catch (e) {}
    }
  },
  
  playBackgroundMusic: async () => {
    const { backgroundMusic, isMuted, isNative } = get();
    if (isMuted) return;
    
    if (isNative) {
      try {
        await NativeAudio.loop({ assetId: 'background' });
      } catch (e) {}
    } else if (backgroundMusic) {
      try {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(() => {});
      } catch (e) {}
    }
  },
  
  stopBackgroundMusic: async () => {
    const { backgroundMusic, isNative } = get();
    
    if (isNative) {
      try {
        await NativeAudio.stop({ assetId: 'background' });
      } catch (e) {}
    } else if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
  }
}));
