# Border Collie Adventure - 2D Platformer Game

## Overview
A Mario-style 2D platformer game featuring a border collie as the main character and bulldogs as enemies. The player navigates through multiple levels of platforms, collects bones and treats, defeats bulldogs by jumping on them, and reaches the end of each level to progress.

## Recent Changes
- December 2, 2025: Multi-level game implementation
  - Added 3 levels with increasing difficulty
  - Level progression system with "Level Complete" screen
  - Moving platforms with configurable movement patterns
  - Environmental hazards (spikes) that damage player
  - Walking animations for player and enemies
  - Background music integration with mute toggle
  - Level-specific background color themes
  - Bouncing animation for collectibles

## Project Architecture

### Frontend Structure
```
client/src/
├── components/
│   ├── game/
│   │   ├── GameCanvas.tsx    # Main game canvas with rendering and physics
│   │   ├── GameUI.tsx        # UI overlays (menu, pause, level complete, game over, victory)
│   │   └── SoundManager.tsx  # Audio initialization
│   └── ui/                   # Reusable UI components (shadcn/ui)
├── lib/
│   └── stores/
│       ├── usePlatformer.tsx # Main game state management with level system
│       ├── useAudio.tsx      # Audio state management with background music
│       └── useGame.tsx       # Generic game phase state
├── App.tsx                   # Main app component
└── main.tsx                  # Entry point
```

### Game State (usePlatformer.tsx)
- `phase`: menu | playing | paused | levelComplete | gameOver | victory
- `score`: Player's current score (persists across levels)
- `lives`: Remaining lives (starts at 3)
- `currentLevel`: Current level number (1-3)
- `totalLevels`: Total number of levels (3)
- `player`: Position, velocity, collision box, walkFrame for animation
- `platforms`: Static and moving level geometry
- `enemies`: Bulldog positions and patrol behavior
- `collectibles`: Bones and treats to collect
- `hazards`: Spike obstacles that damage player

### Controls
- Arrow Keys or WASD: Move left/right
- Space, W, or Up Arrow: Jump

### Game Mechanics
- Gravity-based physics
- Platform collision detection (static and moving platforms)
- Enemy patrol AI with variable speeds per level
- Defeat enemies by jumping on them (+100 points)
- Collect bones (+50 points) and treats (+25 points)
- 3 lives system
- Environmental hazards (spikes) damage player
- Moving platforms for added challenge
- Level completion: all items collected + all enemies defeated + reach end zone
- Victory when all 3 levels completed

### Level Design
- Level 1: Green meadow theme, basic platforms, slower enemies
- Level 2: Desert/autumn theme, more platforms, moving platforms, faster enemies
- Level 3: Night/purple theme, complex layout, many hazards, fastest enemies

## User Preferences
- None documented yet

## Development Notes
- Uses HTML5 Canvas for 2D rendering
- Game loop runs at 60fps via requestAnimationFrame
- Camera follows player with horizontal scrolling
- Audio files located in client/public/sounds/
- Walking animation uses frame counter that animates leg positions
- Moving platforms use sine wave motion for smooth movement
