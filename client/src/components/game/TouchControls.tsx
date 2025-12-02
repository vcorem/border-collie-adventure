import { useEffect, useRef } from "react";
import { usePlatformer } from "@/lib/stores/usePlatformer";

interface TouchControlsProps {
  onControlChange: (controls: { left: boolean; right: boolean; jump: boolean }) => void;
  isLandscape?: boolean;
}

export function TouchControls({ onControlChange, isLandscape = false }: TouchControlsProps) {
  const { phase } = usePlatformer();
  const controlsRef = useRef({ left: false, right: false, jump: false });

  const updateControls = (key: "left" | "right" | "jump", value: boolean) => {
    controlsRef.current[key] = value;
    onControlChange({ ...controlsRef.current });
  };

  const handleTouchStart = (key: "left" | "right" | "jump") => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    updateControls(key, true);
  };

  const handleTouchEnd = (key: "left" | "right" | "jump") => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    updateControls(key, false);
  };

  useEffect(() => {
    if (phase !== "playing") {
      controlsRef.current = { left: false, right: false, jump: false };
      onControlChange({ left: false, right: false, jump: false });
    }
  }, [phase, onControlChange]);

  if (phase !== "playing") return null;

  if (isLandscape) {
    return (
      <div className="h-full flex flex-col justify-between items-center py-4 px-2 bg-gradient-to-l from-gray-900 to-gray-800 select-none touch-none rounded-lg">
        <button
          onTouchStart={handleTouchStart("jump")}
          onTouchEnd={handleTouchEnd("jump")}
          onMouseDown={handleTouchStart("jump")}
          onMouseUp={handleTouchEnd("jump")}
          onMouseLeave={handleTouchEnd("jump")}
          className="w-16 h-16 bg-green-600 hover:bg-green-500 active:bg-green-400 rounded-full flex flex-col items-center justify-center text-white shadow-lg border-4 border-green-400 active:scale-95 transition-transform"
        >
          <span className="text-xl">⬆</span>
          <span className="text-[10px] font-bold">JUMP</span>
        </button>
        
        <div className="flex flex-col items-center gap-1">
          <button
            onTouchStart={handleTouchStart("left")}
            onTouchEnd={handleTouchEnd("left")}
            onMouseDown={handleTouchStart("left")}
            onMouseUp={handleTouchEnd("left")}
            onMouseLeave={handleTouchEnd("left")}
            className="w-14 h-14 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl flex items-center justify-center text-2xl text-white shadow-lg border-2 border-gray-600 active:scale-95 transition-transform"
          >
            ◀
          </button>
          <button
            onTouchStart={handleTouchStart("right")}
            onTouchEnd={handleTouchEnd("right")}
            onMouseDown={handleTouchStart("right")}
            onMouseUp={handleTouchEnd("right")}
            onMouseLeave={handleTouchEnd("right")}
            className="w-14 h-14 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl flex items-center justify-center text-2xl text-white shadow-lg border-2 border-gray-600 active:scale-95 transition-transform"
          >
            ▶
          </button>
          <span className="text-gray-400 text-[10px]">MOVE</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex justify-between items-center px-4 py-3 bg-gradient-to-t from-gray-900 to-gray-800 select-none touch-none rounded-lg">
      <div className="flex flex-col items-center gap-1">
        <div className="flex gap-2">
          <button
            onTouchStart={handleTouchStart("left")}
            onTouchEnd={handleTouchEnd("left")}
            onMouseDown={handleTouchStart("left")}
            onMouseUp={handleTouchEnd("left")}
            onMouseLeave={handleTouchEnd("left")}
            className="w-14 h-14 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl flex items-center justify-center text-2xl text-white shadow-lg border-2 border-gray-600 active:scale-95 transition-transform"
          >
            ◀
          </button>
          <button
            onTouchStart={handleTouchStart("right")}
            onTouchEnd={handleTouchEnd("right")}
            onMouseDown={handleTouchStart("right")}
            onMouseUp={handleTouchEnd("right")}
            onMouseLeave={handleTouchEnd("right")}
            className="w-14 h-14 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl flex items-center justify-center text-2xl text-white shadow-lg border-2 border-gray-600 active:scale-95 transition-transform"
          >
            ▶
          </button>
        </div>
        <span className="text-gray-400 text-[10px]">MOVE</span>
      </div>

      <button
        onTouchStart={handleTouchStart("jump")}
        onTouchEnd={handleTouchEnd("jump")}
        onMouseDown={handleTouchStart("jump")}
        onMouseUp={handleTouchEnd("jump")}
        onMouseLeave={handleTouchEnd("jump")}
        className="w-16 h-16 bg-green-600 hover:bg-green-500 active:bg-green-400 rounded-full flex flex-col items-center justify-center text-white shadow-lg border-4 border-green-400 active:scale-95 transition-transform"
      >
        <span className="text-xl">⬆</span>
        <span className="text-[10px] font-bold">JUMP</span>
      </button>
    </div>
  );
}
