import { usePlatformer } from "@/lib/stores/usePlatformer";
import { useAudio } from "@/lib/stores/useAudio";

export function GameUI() {
  const { phase, score, lives, currentLevel, totalLevels, startGame, restartGame, resumeGame, pauseGame, nextLevel } = usePlatformer();
  const { isMuted, toggleMute, backgroundMusic } = useAudio();

  const handleToggleMute = () => {
    toggleMute();
    if (backgroundMusic) {
      if (!isMuted) {
        backgroundMusic.pause();
      } else {
        backgroundMusic.play().catch(() => {});
      }
    }
  };

  const handleStartGame = () => {
    startGame();
    if (backgroundMusic && !isMuted) {
      backgroundMusic.currentTime = 0;
      backgroundMusic.play().catch(() => {});
    }
  };

  const handleRestartGame = () => {
    restartGame();
    if (backgroundMusic && !isMuted) {
      backgroundMusic.currentTime = 0;
      backgroundMusic.play().catch(() => {});
    }
  };

  const handleNextLevel = () => {
    nextLevel();
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {phase === "playing" && (
        <div 
          className="absolute left-2 right-2 flex justify-between items-start pointer-events-auto"
          style={{ 
            top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)'
          }}
        >
          <div className="bg-black/80 rounded-lg px-3 py-1.5 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-yellow-300">
                Level {currentLevel}/{totalLevels}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 text-lg">★</span>
                <span className="text-base font-bold">{score}</span>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${i < lives ? "text-red-500" : "text-gray-600"}`}
                  >
                    ♥
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleToggleMute}
              className="bg-black/80 hover:bg-black/90 rounded-lg px-2.5 py-1.5 text-white transition-colors shadow-lg text-lg"
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
            <button
              onClick={pauseGame}
              className="bg-black/80 hover:bg-black/90 rounded-lg px-2.5 py-1.5 text-white transition-colors shadow-lg text-lg"
            >
              ⏸️
            </button>
          </div>
        </div>
      )}

      {phase === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto overflow-auto p-2">
          <div className="bg-gradient-to-b from-blue-900/95 to-blue-950/95 rounded-2xl p-4 sm:p-6 text-center shadow-2xl border-4 border-yellow-400 w-full max-w-sm mx-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 drop-shadow-lg">
              🐕 Border Collie
            </h1>
            <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 mb-3 drop-shadow-lg">
              Adventure
            </h2>
            
            <div className="mb-3 p-2 bg-black/30 rounded-lg text-center text-white">
              <p className="text-yellow-300 font-bold text-sm sm:text-base">{totalLevels} Levels to Complete!</p>
            </div>
            
            <div className="mb-4 p-3 bg-black/30 rounded-lg text-left text-white text-xs sm:text-sm">
              <p className="font-bold mb-2 text-yellow-300">How to Play:</p>
              <ul className="space-y-0.5">
                <li>⬅️ ➡️ Move left/right</li>
                <li>⬆️ Jump</li>
                <li>🦴 Bones +50 | ⭐ Treats +25</li>
                <li>🐾 Jump on bulldogs!</li>
                <li>⚠️ Avoid spikes and gaps!</li>
              </ul>
            </div>
            
            <button
              onClick={handleStartGame}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 active:from-green-600 active:to-green-700 text-white font-bold py-5 px-8 rounded-xl text-xl sm:text-2xl shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 touch-manipulation mb-3"
            >
              TAP TO START
            </button>
            
            <button
              onClick={handleToggleMute}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 active:from-gray-700 active:to-gray-800 text-white font-bold py-3 px-6 rounded-xl text-base shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 touch-manipulation"
            >
              {isMuted ? "🔇 Sound OFF" : "🔊 Sound ON"}
            </button>
            
            <p className="text-white/60 text-xs mt-3">
              Collect all items & defeat bulldogs to complete levels!
            </p>
          </div>
        </div>
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/50">
          <div className="bg-gradient-to-b from-gray-800/95 to-gray-900/95 rounded-2xl p-8 text-center shadow-2xl border-4 border-white/30 max-w-sm mx-4">
            <h2 className="text-3xl font-bold text-white mb-2">⏸️ Paused</h2>
            <p className="text-gray-400 mb-6">Level {currentLevel}/{totalLevels}</p>
            
            <div className="space-y-3">
              <button
                onClick={resumeGame}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-3 px-6 rounded-xl text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Resume
              </button>
              
              <button
                onClick={handleRestartGame}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Restart Game
              </button>
              
              <button
                onClick={handleToggleMute}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-3 px-6 rounded-xl text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                {isMuted ? "🔇 Unmute Sound" : "🔊 Mute Sound"}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "levelComplete" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/40">
          <div className="bg-gradient-to-b from-green-600/95 to-green-800/95 rounded-2xl p-8 text-center shadow-2xl border-4 border-green-300 max-w-sm mx-4">
            <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              🎉 Level Complete! 🎉
            </h2>
            <p className="text-green-100 text-lg mb-4">
              Level {currentLevel} cleared!
            </p>
            
            <div className="bg-black/30 rounded-lg p-4 mb-6">
              <p className="text-white/80 text-sm">Current Score</p>
              <p className="text-3xl font-bold text-yellow-400">{score}</p>
              <p className="text-white/60 text-sm mt-2">Lives remaining: {lives}</p>
            </div>
            
            <button
              onClick={handleNextLevel}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Next Level →
            </button>
          </div>
        </div>
      )}

      {phase === "gameOver" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/60">
          <div className="bg-gradient-to-b from-red-900/95 to-red-950/95 rounded-2xl p-8 text-center shadow-2xl border-4 border-red-400 max-w-sm mx-4">
            <h2 className="text-4xl font-bold text-white mb-2">Game Over</h2>
            <p className="text-red-300 text-lg mb-4">The bulldogs got you!</p>
            
            <div className="bg-black/30 rounded-lg p-4 mb-6">
              <p className="text-white/80 text-sm">Final Score</p>
              <p className="text-3xl font-bold text-yellow-400">{score}</p>
              <p className="text-white/60 text-sm mt-2">Reached Level {currentLevel}</p>
            </div>
            
            <button
              onClick={handleRestartGame}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {phase === "victory" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/40">
          <div className="bg-gradient-to-b from-yellow-500/95 to-orange-600/95 rounded-2xl p-8 text-center shadow-2xl border-4 border-yellow-300 max-w-sm mx-4">
            <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              🏆 Victory! 🏆
            </h2>
            <p className="text-yellow-100 text-lg mb-4">
              You completed all {totalLevels} levels!
            </p>
            
            <div className="bg-black/30 rounded-lg p-4 mb-6">
              <p className="text-white/80 text-sm">Final Score</p>
              <p className="text-4xl font-bold text-white">{score}</p>
              <p className="text-white/60 text-sm mt-2">Lives remaining: {lives}</p>
            </div>
            
            <button
              onClick={handleRestartGame}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="absolute bottom-4 left-4 bg-black/50 rounded-lg px-3 py-1 text-white/70 text-xs">
          Arrow Keys / WASD to move • Space to jump • Collect all items & defeat bulldogs!
        </div>
      )}
    </div>
  );
}
