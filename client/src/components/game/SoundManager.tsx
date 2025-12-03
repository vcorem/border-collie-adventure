import { useEffect, useRef } from "react";
import { useAudio } from "@/lib/stores/useAudio";

export function SoundManager() {
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();
  const audioInitialized = useRef(false);
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

    const unlockAudio = async () => {
      if (audioUnlocked.current) return;
      
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioContext = new AudioContextClass();
          
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
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          try {
            await bgMusic.play();
            bgMusic.pause();
            bgMusic.currentTime = 0;
            audioUnlocked.current = true;
            console.log("Audio unlocked successfully");
          } catch (playError) {
            console.log("Audio play test failed, will retry on next gesture");
          }
        }
      } catch (e) {
        console.log("Audio context error:", e);
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
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  return null;
}
