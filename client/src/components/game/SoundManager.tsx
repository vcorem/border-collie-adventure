import { useEffect, useRef } from "react";
import { useAudio } from "@/lib/stores/useAudio";

export function SoundManager() {
  const initAudio = useAudio((state) => state.initAudio);
  const unlockAudio = useAudio((state) => state.unlockAudio);
  const audioInitialized = useRef(false);

  useEffect(() => {
    if (audioInitialized.current) return;
    audioInitialized.current = true;

    console.log("SoundManager: Initializing Web Audio API...");
    initAudio();

    const handleInteraction = () => {
      console.log("SoundManager: User interaction detected, unlocking audio...");
      unlockAudio();
    };

    document.addEventListener("touchstart", handleInteraction, { once: false, passive: true });
    document.addEventListener("touchend", handleInteraction, { once: false, passive: true });
    document.addEventListener("click", handleInteraction, { once: false });
    document.addEventListener("keydown", handleInteraction, { once: false });

    return () => {
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("touchend", handleInteraction);
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, [initAudio, unlockAudio]);

  return null;
}
