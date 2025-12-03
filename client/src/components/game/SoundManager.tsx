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
      
      const playTest = bgMusic.play();
      if (playTest) {
        playTest.then(() => {
          bgMusic.pause();
          bgMusic.currentTime = 0;
          console.log("Audio unlocked");
        }).catch(() => {
          console.log("Audio unlock pending");
        });
      }
    };

    document.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      bgMusic.pause();
      bgMusic.src = "";
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  return null;
}
