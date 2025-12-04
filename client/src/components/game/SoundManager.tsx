import { useEffect, useRef } from "react";
import { useAudio } from "@/lib/stores/useAudio";

export function SoundManager() {
  const setBackgroundMusic = useAudio((state) => state.setBackgroundMusic);
  const setHitSound = useAudio((state) => state.setHitSound);
  const setSuccessSound = useAudio((state) => state.setSuccessSound);
  const audioInitialized = useRef(false);

  useEffect(() => {
    if (audioInitialized.current) return;
    audioInitialized.current = true;

    console.log("SoundManager: Initializing audio...");

    const bgMusic = new Audio("/sounds/background.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    bgMusic.preload = "auto";
    
    bgMusic.addEventListener('canplaythrough', () => {
      console.log("SoundManager: Background music ready to play");
    });
    
    bgMusic.addEventListener('error', (e) => {
      console.error("SoundManager: Background music error", e);
    });

    const hit = new Audio("/sounds/hit.mp3");
    hit.volume = 0.5;
    hit.preload = "auto";

    const success = new Audio("/sounds/success.mp3");
    success.volume = 0.5;
    success.preload = "auto";

    setBackgroundMusic(bgMusic);
    setHitSound(hit);
    setSuccessSound(success);
    
    console.log("SoundManager: Audio elements created and stored");

    bgMusic.load();
    hit.load();
    success.load();

    return () => {
      bgMusic.pause();
      bgMusic.src = "";
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  return null;
}
