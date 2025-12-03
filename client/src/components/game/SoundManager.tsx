import { useEffect, useRef } from "react";
import { useAudio } from "@/lib/stores/useAudio";

export function SoundManager() {
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();
  const audioInitialized = useRef(false);

  useEffect(() => {
    if (audioInitialized.current) return;
    audioInitialized.current = true;

    const bgMusic = new Audio("/sounds/background.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    bgMusic.preload = "auto";
    setBackgroundMusic(bgMusic);

    const hit = new Audio("/sounds/hit.mp3");
    hit.volume = 0.5;
    hit.preload = "auto";
    setHitSound(hit);

    const success = new Audio("/sounds/success.mp3");
    success.volume = 0.5;
    success.preload = "auto";
    setSuccessSound(success);

    const unlockAudio = () => {
      bgMusic.load();
      hit.load();
      success.load();
      
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };

    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('click', unlockAudio);

    return () => {
      bgMusic.pause();
      bgMusic.src = "";
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  return null;
}
