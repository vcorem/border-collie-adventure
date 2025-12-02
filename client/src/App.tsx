import { useEffect, useState, useCallback } from "react";
import "@fontsource/inter";
import { GameCanvas } from "./components/game/GameCanvas";
import { GameUI } from "./components/game/GameUI";
import { SoundManager } from "./components/game/SoundManager";
import { TouchControls } from "./components/game/TouchControls";

function App() {
  const [touchControls, setTouchControls] = useState({ left: false, right: false, jump: false });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    document.addEventListener("contextmenu", handleContextMenu);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const handleControlChange = useCallback((controls: { left: boolean; right: boolean; jump: boolean }) => {
    setTouchControls(controls);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a1a2e",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "800px",
          height: isMobile ? "auto" : "600px",
          maxWidth: "100%",
          maxHeight: isMobile ? "60vh" : "100%",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          flexShrink: 0,
        }}
      >
        <GameCanvas touchControls={touchControls} />
        <GameUI />
      </div>
      
      {isMobile && (
        <div style={{ width: "100%", maxWidth: "800px", marginTop: "8px" }}>
          <TouchControls onControlChange={handleControlChange} />
        </div>
      )}
      
      <SoundManager />
    </div>
  );
}

export default App;
