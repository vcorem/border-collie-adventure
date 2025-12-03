import { useEffect, useCallback } from "react";
import { useAudio } from "@/lib/stores/useAudio";

export function SoundManager() {
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();

  const initAudio = useCallback(() => {
    const basePath = window.location.origin;
    
    const bgMusic = new Audio(`${basePath}/sounds/background.mp3`);
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    bgMusic.preload = "auto";
    bgMusic.load();
    setBackgroundMusic(bgMusic);

    const hit = new Audio(`${basePath}/sounds/hit.mp3`);
    hit.volume = 0.5;
    hit.preload = "auto";
    hit.load();
    setHitSound(hit);

    const success = new Audio(`${basePath}/sounds/success.mp3`);
    success.volume = 0.5;
    success.preload = "auto";
    success.load();
    setSuccessSound(success);

    return bgMusic;
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  useEffect(() => {
    const bgMusic = initAudio();

    const unlockAudio = () => {
      const silentPlay = bgMusic.play();
      if (silentPlay) {
        silentPlay.then(() => {
          bgMusic.pause();
          bgMusic.currentTime = 0;
        }).catch(() => {});
      }
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };

    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });

    return () => {
      bgMusic.pause();
      bgMusic.src = "";
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
  }, [initAudio]);

  return null;
}
