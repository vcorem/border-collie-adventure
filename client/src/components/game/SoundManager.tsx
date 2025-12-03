import { useEffect, useRef } from "react";
import { useAudio } from "@/lib/stores/useAudio";
import { Capacitor } from "@capacitor/core";
import { NativeAudio } from "@capacitor-community/native-audio";

export function SoundManager() {
  const { setBackgroundMusic, setHitSound, setSuccessSound, setIsNative } = useAudio();
  const audioInitialized = useRef(false);

  useEffect(() => {
    if (audioInitialized.current) return;
    audioInitialized.current = true;

    const isNative = Capacitor.isNativePlatform();
    setIsNative(isNative);

    if (isNative) {
      const preloadNativeAudio = async () => {
        try {
          await NativeAudio.preload({
            assetId: 'background',
            assetPath: 'public/sounds/background.mp3',
            audioChannelNum: 1,
            isUrl: false,
          });
          
          await NativeAudio.preload({
            assetId: 'hit',
            assetPath: 'public/sounds/hit.mp3',
            audioChannelNum: 2,
            isUrl: false,
          });
          
          await NativeAudio.preload({
            assetId: 'success',
            assetPath: 'public/sounds/success.mp3',
            audioChannelNum: 3,
            isUrl: false,
          });
          
          await NativeAudio.setVolume({ assetId: 'background', volume: 0.3 });
          await NativeAudio.setVolume({ assetId: 'hit', volume: 0.5 });
          await NativeAudio.setVolume({ assetId: 'success', volume: 0.5 });
          
          console.log('Native audio preloaded successfully');
        } catch (e) {
          console.log('Native audio preload error:', e);
        }
      };
      
      preloadNativeAudio();
    } else {
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
        
        bgMusic.play().then(() => {
          bgMusic.pause();
          bgMusic.currentTime = 0;
        }).catch(() => {});
        
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('click', unlockAudio);
      };

      document.addEventListener('touchstart', unlockAudio, { passive: true });
      document.addEventListener('click', unlockAudio);
    }
  }, [setBackgroundMusic, setHitSound, setSuccessSound, setIsNative]);

  return null;
}
