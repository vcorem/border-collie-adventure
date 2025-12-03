import { useEffect, useRef } from "react";
import { useAudio } from "@/lib/stores/useAudio";

export function SoundManager() {
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();
  const audioInitialized = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlocked = useRef(false);

  useEffect(() => {
    if (audioInitialized.current) return;
    audioInitialized.current = true;

    const bgMusic = new Audio();
    bgMusic.src = "/sounds/background.mp3";
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    bgMusic.preload = "auto";
    setBackgroundMusic(bgMusic);

    const hit = new Audio();
    hit.src = "/sounds/hit.mp3";
    hit.volume = 0.5;
    hit.preload = "auto";
    setHitSound(hit);

    const success = new Audio();
    success.src = "/sounds/success.mp3";
    success.volume = 0.5;
    success.preload = "auto";
    setSuccessSound(success);

    const getAudioContext = () => {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      }
      return audioContextRef.current;
    };

    const unlockAudio = async () => {
      if (audioUnlocked.current) return;
      
      try {
        const audioContext = getAudioContext();
        if (!audioContext) return;
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        
        bgMusic.load();
        hit.load();
        success.load();
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const playPromise = bgMusic.play();
        if (playPromise) {
          await playPromise;
          bgMusic.pause();
          bgMusic.currentTime = 0;
          audioUnlocked.current = true;
          
          document.removeEventListener('touchstart', gestureHandler);
          document.removeEventListener('touchend', gestureHandler);
          document.removeEventListener('click', gestureHandler);
          document.removeEventListener('pointerdown', gestureHandler);
          console.log("Audio unlocked");
        }
      } catch (e) {
        console.log("Audio unlock attempt, will retry");
      }
    };

    const gestureHandler = () => {
      unlockAudio();
    };

    document.addEventListener('touchstart', gestureHandler, { passive: true });
    document.addEventListener('touchend', gestureHandler, { passive: true });
    document.addEventListener('click', gestureHandler);
    document.addEventListener('pointerdown', gestureHandler);

    return () => {
      bgMusic.pause();
      bgMusic.src = "";
      document.removeEventListener('touchstart', gestureHandler);
      document.removeEventListener('touchend', gestureHandler);
      document.removeEventListener('click', gestureHandler);
      document.removeEventListener('pointerdown', gestureHandler);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  return null;
}
