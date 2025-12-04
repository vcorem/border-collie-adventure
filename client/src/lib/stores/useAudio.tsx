import { create } from "zustand";

interface AudioState {
  audioContext: AudioContext | null;
  isMuted: boolean;
  isUnlocked: boolean;
  
  // Background music state
  bgOscillators: OscillatorNode[];
  bgGains: GainNode[];
  bgInterval: ReturnType<typeof setInterval> | null;
  
  initAudio: () => Promise<void>;
  unlockAudio: () => Promise<void>;
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  audioContext: null,
  isMuted: false,
  isUnlocked: false,
  bgOscillators: [],
  bgGains: [],
  bgInterval: null,
  
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
    console.log("AudioContext created, state:", ctx.state);
  },
  
  unlockAudio: async () => {
    const { isUnlocked } = get();
    if (isUnlocked) return;
    
    console.log("Unlocking audio...");
    
    let ctx = get().audioContext;
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
    
    // Play a silent tone to fully unlock
    if (ctx) {
      try {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.001;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
        console.log("Silent unlock tone played");
      } catch (e) {
        console.error("Silent unlock error:", e);
      }
    }
    
    set({ isUnlocked: true });
    console.log("Audio unlock complete");
  },
  
  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;
    set({ isMuted: newMutedState });
    
    if (newMutedState) {
      get().stopBackgroundMusic();
    }
  },
  
  // Death/hit sound - synthesized beep (falling pitch)
  playHit: () => {
    const { audioContext, isMuted } = get();
    console.log("playHit called", { hasContext: !!audioContext, isMuted });
    
    if (isMuted) return;
    
    let ctx = audioContext;
    if (!ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        ctx = new AudioContextClass();
        set({ audioContext: ctx });
      }
    }
    
    if (!ctx) return;
    
    try {
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(220, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
      
      console.log("Hit sound played (synthesized)");
    } catch (e) {
      console.error("Hit sound error:", e);
    }
  },
  
  // Success jingle - happy ascending notes (C5-E5-G5-C6)
  playSuccess: () => {
    const { audioContext, isMuted } = get();
    console.log("playSuccess called", { hasContext: !!audioContext, isMuted });
    
    if (isMuted) return;
    
    let ctx = audioContext;
    if (!ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        ctx = new AudioContextClass();
        set({ audioContext: ctx });
      }
    }
    
    if (!ctx) return;
    
    try {
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const now = ctx.currentTime;
      const notes = [
        { freq: 523, start: 0, duration: 0.12 },      // C5
        { freq: 659, start: 0.12, duration: 0.12 },   // E5
        { freq: 784, start: 0.24, duration: 0.16 },   // G5
        { freq: 1047, start: 0.36, duration: 0.2 },   // C6 (sparkle)
      ];
      
      notes.forEach(note => {
        const osc = ctx!.createOscillator();
        const gain = ctx!.createGain();
        
        osc.type = note.start === 0.36 ? "sine" : "square";
        osc.frequency.value = note.freq;
        
        gain.gain.setValueAtTime(0, now + note.start);
        gain.gain.linearRampToValueAtTime(0.4, now + note.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);
        
        osc.connect(gain);
        gain.connect(ctx!.destination);
        
        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration + 0.05);
      });
      
      console.log("Success jingle played (synthesized)");
    } catch (e) {
      console.error("Success sound error:", e);
    }
  },
  
  // Background music - looping simple melody with bass
  playBackgroundMusic: () => {
    const state = get();
    const { audioContext, isMuted, isUnlocked, bgInterval } = state;
    console.log("playBackgroundMusic called", { hasContext: !!audioContext, isMuted, isUnlocked });
    
    if (isMuted) {
      console.log("Audio is muted");
      return;
    }
    
    if (!isUnlocked) {
      console.log("Audio not unlocked yet, retrying in 300ms");
      setTimeout(() => get().playBackgroundMusic(), 300);
      return;
    }
    
    // Stop any existing music
    if (bgInterval) {
      get().stopBackgroundMusic();
    }
    
    let ctx = audioContext;
    if (!ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        ctx = new AudioContextClass();
        set({ audioContext: ctx });
      }
    }
    
    if (!ctx) return;
    
    try {
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      // Melody notes (simple happy tune)
      const melodyNotes = [196, 220, 262, 294, 262, 220, 196, 220]; // G3, A3, C4, D4...
      const bassNotes = [98, 110, 131, 110]; // G2, A2, C3, A2
      
      let melodyIndex = 0;
      let bassIndex = 0;
      let beatCount = 0;
      
      // Create persistent oscillators and gains
      const melodyOsc = ctx.createOscillator();
      const melodyGain = ctx.createGain();
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      
      melodyOsc.type = "square";
      melodyOsc.frequency.value = melodyNotes[0];
      melodyGain.gain.value = 0.08;
      
      bassOsc.type = "triangle";
      bassOsc.frequency.value = bassNotes[0];
      bassGain.gain.value = 0.1;
      
      melodyOsc.connect(melodyGain);
      melodyGain.connect(ctx.destination);
      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      
      melodyOsc.start();
      bassOsc.start();
      
      // Step through notes
      const interval = setInterval(() => {
        const currentCtx = get().audioContext;
        if (!currentCtx || get().isMuted) {
          get().stopBackgroundMusic();
          return;
        }
        
        beatCount++;
        
        // Change melody every beat
        melodyIndex = (melodyIndex + 1) % melodyNotes.length;
        melodyOsc.frequency.setValueAtTime(melodyNotes[melodyIndex], currentCtx.currentTime);
        
        // Change bass every 2 beats
        if (beatCount % 2 === 0) {
          bassIndex = (bassIndex + 1) % bassNotes.length;
          bassOsc.frequency.setValueAtTime(bassNotes[bassIndex], currentCtx.currentTime);
        }
        
        // Add slight volume envelope for rhythm
        melodyGain.gain.setValueAtTime(0.1, currentCtx.currentTime);
        melodyGain.gain.linearRampToValueAtTime(0.06, currentCtx.currentTime + 0.15);
      }, 250); // 240 BPM, quarter note = 250ms
      
      set({ 
        bgOscillators: [melodyOsc, bassOsc], 
        bgGains: [melodyGain, bassGain],
        bgInterval: interval 
      });
      
      console.log("Background music started (synthesized)");
    } catch (e) {
      console.error("Background music error:", e);
    }
  },
  
  stopBackgroundMusic: () => {
    const { bgOscillators, bgInterval } = get();
    
    if (bgInterval) {
      clearInterval(bgInterval);
    }
    
    bgOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    
    set({ bgOscillators: [], bgGains: [], bgInterval: null });
    console.log("Background music stopped");
  }
}));
