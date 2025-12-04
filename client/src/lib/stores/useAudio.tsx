import { create } from "zustand";

// Detect if running on Android WebView (Capacitor app)
const isAndroid = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('android') && (ua.includes('wv') || (window as any).Capacitor);
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
  isAndroidDevice: boolean;
  activeMusicPath: 'none' | 'webaudio' | 'html';
  
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
  isAndroidDevice: false,
  activeMusicPath: 'none',
  
  initAudio: async () => {
    const { audioContext } = get();
    if (audioContext) return;
    
    const androidDevice = isAndroid();
    console.log("Audio init - Android device:", androidDevice);
    set({ isAndroidDevice: androidDevice });
    
    // Create HTMLAudioElements for all platforms (primary for Android, fallback for web)
    const bgAudio = createAudioElement("/sounds/background.mp3", true, 0.3);
    const successAudioEl = createAudioElement("/sounds/success.mp3", false, 0.7);
    const hitAudioEl = createAudioElement("/sounds/hit.mp3", false, 0.5);
    set({ backgroundAudio: bgAudio, successAudio: successAudioEl, hitAudio: hitAudioEl });
    
    // Only create Web Audio API for non-Android (or skip entirely on Android)
    if (!androidDevice) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        // Use 44100 sample rate to match common audio file rates
        const ctx = new AudioContextClass({ sampleRate: 44100 });
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
    } else {
      console.log("Android detected - using HTMLAudioElement exclusively");
    }
  },
  
  unlockAudio: async () => {
    const { isUnlocked, backgroundAudio, successAudio, hitAudio, audioContext, isAndroidDevice } = get();
    if (isUnlocked) return;
    
    console.log("Unlocking audio...");
    
    // Resume AudioContext if exists (non-Android)
    if (audioContext && audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch (e) {}
    }
    
    // Unlock all HTML audio elements with muted play/pause
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
    console.log("Audio unlocked, isAndroid:", isAndroidDevice);
  },
  
  toggleMute: () => {
    const { isMuted, backgroundSource, backgroundAudio, activeMusicPath } = get();
    const newMutedState = !isMuted;
    set({ isMuted: newMutedState });
    
    if (newMutedState) {
      // Stop all music
      if (backgroundSource) {
        try { backgroundSource.stop(); } catch (e) {}
        set({ backgroundSource: null });
      }
      if (backgroundAudio) {
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
      }
      set({ activeMusicPath: 'none' });
    }
  },
  
  playHit: () => {
    const { audioContext, hitBuffer, hitAudio, isMuted, isAndroidDevice } = get();
    if (isMuted) return;
    
    // On Android, use HTMLAudioElement
    if (isAndroidDevice && hitAudio) {
      try {
        hitAudio.currentTime = 0;
        hitAudio.play().catch(() => {});
        console.log("Hit via HTMLAudio (Android)");
        return;
      } catch (e) {}
    }
    
    // On web, try Web Audio API first with synthesized beep (more reliable)
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
        return;
      } catch (e) {}
    }
    
    // Fallback to HTMLAudio
    if (hitAudio) {
      hitAudio.currentTime = 0;
      hitAudio.play().catch(() => {});
    }
  },
  
  playSuccess: () => {
    const { audioContext, successBuffer, successAudio, isMuted, isAndroidDevice } = get();
    if (isMuted) return;
    
    console.log("playSuccess - isAndroid:", isAndroidDevice);
    
    // On Android, use HTMLAudioElement exclusively
    if (isAndroidDevice && successAudio) {
      try {
        successAudio.currentTime = 0;
        successAudio.play().then(() => {
          console.log("Success via HTMLAudio (Android)");
        }).catch((e) => {
          console.log("Success HTMLAudio failed:", e);
        });
        return;
      } catch (e) {}
    }
    
    // On web, use Web Audio API
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
        console.log("Success via WebAudio");
        return;
      } catch (e) {}
    }
    
    // Fallback
    if (successAudio) {
      successAudio.currentTime = 0;
      successAudio.play().catch(() => {});
    }
  },
  
  playBackgroundMusic: () => {
    const state = get();
    const { audioContext, backgroundBuffer, backgroundSource, backgroundAudio, isMuted, isUnlocked, isAndroidDevice, activeMusicPath } = state;
    
    console.log("playBackgroundMusic - isAndroid:", isAndroidDevice, "activePath:", activeMusicPath);
    
    if (isMuted) return;
    
    if (!isUnlocked) {
      setTimeout(() => get().playBackgroundMusic(), 300);
      return;
    }
    
    // Stop any existing music first to prevent double playback
    if (backgroundSource) {
      try { backgroundSource.stop(); } catch (e) {}
      set({ backgroundSource: null });
    }
    if (backgroundAudio && activeMusicPath === 'html') {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
    }
    
    // On Android, use ONLY HTMLAudioElement (no Web Audio)
    if (isAndroidDevice) {
      if (backgroundAudio) {
        backgroundAudio.currentTime = 0;
        backgroundAudio.play().then(() => {
          console.log("Background music via HTMLAudio (Android) - EXCLUSIVE");
          set({ activeMusicPath: 'html' });
        }).catch((e) => {
          console.log("Background HTMLAudio failed:", e);
          // Retry once
          setTimeout(() => {
            if (!get().isMuted && backgroundAudio) {
              backgroundAudio.play().catch(() => {});
              set({ activeMusicPath: 'html' });
            }
          }, 500);
        });
      }
      return;
    }
    
    // On web, use Web Audio API
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
        
        set({ backgroundSource: source, activeMusicPath: 'webaudio' });
        console.log("Background music via WebAudio");
        return;
      } catch (e) {}
    }
    
    // Fallback for web if Web Audio fails
    if (backgroundAudio) {
      backgroundAudio.currentTime = 0;
      backgroundAudio.play().then(() => {
        set({ activeMusicPath: 'html' });
      }).catch(() => {});
    }
  },
  
  stopBackgroundMusic: () => {
    const { backgroundSource, backgroundAudio, activeMusicPath } = get();
    
    if (backgroundSource) {
      try { backgroundSource.stop(); } catch (e) {}
      set({ backgroundSource: null });
    }
    if (backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
    }
    set({ activeMusicPath: 'none' });
  }
}));
