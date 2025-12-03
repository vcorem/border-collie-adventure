import { useEffect, useRef } from "react";
import { useAudio } from "@/lib/stores/useAudio";

export function SoundManager() {
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();
  const audioInitialized = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (audioInitialized.current) return;
    audioInitialized.current = true;

    const createAudio = (src: string) => {
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = src;
      return audio;
    };

    const bgMusic = createAudio("./sounds/background.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    setBackgroundMusic(bgMusic);

    const hit = createAudio("./sounds/hit.mp3");
    hit.volume = 0.5;
    setHitSound(hit);

    const success = createAudio("./sounds/success.mp3");
    success.volume = 0.5;
    setSuccessSound(success);

    const unlockAudio = async () => {
      try {
        if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioContextRef.current = new AudioContextClass();
          }
        }
        
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        bgMusic.load();
        hit.load();
        success.load();

        const playPromise = bgMusic.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            bgMusic.pause();
            bgMusic.currentTime = 0;
            console.log("Audio unlocked successfully");
          }).catch((e) => {
            console.log("Audio unlock failed:", e.message);
          });
        }
      } catch (e) {
        console.log("Audio context error:", e);
      }

      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('touchend', unlockAudio, { passive: true });
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    return () => {
      bgMusic.pause();
      bgMusic.src = "";
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  return null;
}
