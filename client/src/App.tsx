import { useEffect, useState, useCallback } from "react";
import "@fontsource/inter";
import { GameCanvas } from "./components/game/GameCanvas";
import { GameUI } from "./components/game/GameUI";
import { SoundManager } from "./components/game/SoundManager";
import { TouchControls } from "./components/game/TouchControls";
import { usePlatformer } from "./lib/stores/usePlatformer";

function App() {
  const [touchControls, setTouchControls] = useState({ left: false, right: false, jump: false });
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const phase = usePlatformer((state) => state.phase);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 900;
      setIsMobile(isTouchDevice || isSmallScreen);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    document.addEventListener("contextmenu", handleContextMenu);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const handleControlChange = useCallback((controls: { left: boolean; right: boolean; jump: boolean }) => {
    setTouchControls(controls);
  }, []);

  const showTouchControls = isMobile && phase === "playing";

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        flexDirection: isLandscape ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a1a2e",
        position: "fixed",
        top: 0,
        left: 0,
        overflow: "hidden",
        padding: isMobile ? "4px" : "0",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          width: isLandscape 
            ? (showTouchControls ? "calc(100vw - 180px)" : "100vw")
            : "100%",
          height: isLandscape 
            ? "100%" 
            : (showTouchControls ? "calc(100dvh - 140px)" : "100%"),
          maxWidth: isLandscape ? "none" : "800px",
          maxHeight: isLandscape ? "100%" : (showTouchControls ? "none" : "600px"),
          borderRadius: isMobile ? "8px" : "12px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          flexShrink: 1,
          flexGrow: 1,
          display: "flex",
          aspectRatio: phase === "menu" ? "auto" : "800 / 600",
        }}
      >
        <GameCanvas touchControls={touchControls} />
        <GameUI />
      </div>
      
      {showTouchControls && (
        <div style={{ 
          width: isLandscape ? "170px" : "100%",
          height: isLandscape ? "100%" : "130px",
          maxWidth: isLandscape ? "170px" : "800px",
          flexShrink: 0,
          marginLeft: isLandscape ? "8px" : "0",
          marginTop: isLandscape ? "0" : "4px",
        }}>
          <TouchControls onControlChange={handleControlChange} isLandscape={isLandscape} />
        </div>
      )}
      
      <SoundManager />
    </div>
  );
}

export default App;
