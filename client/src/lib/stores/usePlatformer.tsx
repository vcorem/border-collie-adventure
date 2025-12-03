import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type GamePhase = "menu" | "playing" | "paused" | "gameOver" | "victory" | "levelComplete";

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  isMoving?: boolean;
  moveSpeed?: number;
  moveRangeX?: number;
  moveRangeY?: number;
  startX?: number;
  startY?: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  patrolLeft: number;
  patrolRight: number;
  isDefeated: boolean;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  isOnGround: boolean;
  facingRight: boolean;
  isJumping: boolean;
  walkFrame: number;
}

export interface Collectible {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  type: "bone" | "treat";
}

export interface Hazard {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "spike";
}

interface LevelData {
  platforms: Platform[];
  enemies: Enemy[];
  collectibles: Collectible[];
  hazards: Hazard[];
  levelWidth: number;
}

interface PlatformerState {
  phase: GamePhase;
  score: number;
  lives: number;
  currentLevel: number;
  totalLevels: number;
  player: Player;
  platforms: Platform[];
  enemies: Enemy[];
  collectibles: Collectible[];
  hazards: Hazard[];
  levelWidth: number;
  levelHeight: number;
  cameraX: number;
  continueFromLastLevel: boolean;
  lastReachedLevel: number;

  setPhase: (phase: GamePhase) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  gameOver: () => void;
  levelComplete: () => void;
  nextLevel: () => void;
  restartGame: () => void;
  
  updatePlayer: (updates: Partial<Player>) => void;
  setPlayer: (player: Player) => void;
  addScore: (points: number) => void;
  loseLife: () => void;
  setCameraX: (x: number) => void;
  
  defeatEnemy: (enemyId: number) => void;
  collectItem: (itemId: number) => void;
  updatePlatforms: (platforms: Platform[]) => void;
  
  initLevel: () => void;
  toggleContinueFromLastLevel: () => void;
}

const INITIAL_PLAYER: Player = {
  x: 100,
  y: 300,
  width: 40,
  height: 50,
  velocityX: 0,
  velocityY: 0,
  isOnGround: false,
  facingRight: true,
  isJumping: false,
  walkFrame: 0,
};

interface LevelConfig {
  levelWidth: number;
  groundSegments: number;
  gapChance: number;
  floatingPlatforms: number;
  movingPlatformChance: number;
  enemyCount: number;
  enemySpeed: number;
  collectibleCount: number;
  hazardCount: number;
}

const getLevelConfig = (level: number): LevelConfig => {
  const baseWidth = 1800 + level * 100;
  const difficulty = Math.min(level / 30, 1);
  
  return {
    levelWidth: Math.min(baseWidth, 5000),
    groundSegments: 4 + Math.floor(level / 5),
    gapChance: 0.1 + difficulty * 0.25,
    floatingPlatforms: 6 + Math.floor(level / 2),
    movingPlatformChance: Math.min(0.1 + level * 0.03, 0.5),
    enemyCount: 3 + Math.floor(level / 2),
    enemySpeed: 1.5 + difficulty * 2.5,
    collectibleCount: 5 + Math.floor(level / 3),
    hazardCount: Math.floor(level / 2),
  };
};

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateLevel = (level: number): LevelData => {
  const config = getLevelConfig(level);
  const platforms: Platform[] = [];
  const enemies: Enemy[] = [];
  const collectibles: Collectible[] = [];
  const hazards: Hazard[] = [];
  
  let seed = level * 12345;
  const random = () => {
    seed++;
    return seededRandom(seed);
  };
  
  let groundX = 0;
  const groundY = 550;
  const minSegmentWidth = 150;
  const maxSegmentWidth = 400;
  const gapWidth = 80;
  
  platforms.push({ x: 0, y: groundY, width: 300, height: 50 });
  groundX = 300;
  
  for (let i = 0; i < config.groundSegments; i++) {
    if (random() < config.gapChance && groundX > 400) {
      groundX += gapWidth;
    }
    
    const width = minSegmentWidth + Math.floor(random() * (maxSegmentWidth - minSegmentWidth));
    platforms.push({ x: groundX, y: groundY, width, height: 50 });
    groundX += width;
  }
  
  platforms.push({ x: groundX, y: groundY, width: 400, height: 50 });
  const actualLevelWidth = groundX + 400;
  
  const MAX_JUMP_HEIGHT = 100;
  const BASE_Y = groundY - 50;
  
  const floatingYLevels = [
    BASE_Y - 80,
    BASE_Y - 60,
    BASE_Y - 100,
    BASE_Y - 70,
    BASE_Y - 90,
  ];
  
  const platformZones: { x: number; y: number; width: number }[] = [];
  
  for (let i = 0; i < config.floatingPlatforms; i++) {
    const x = 150 + (i * (actualLevelWidth - 300) / config.floatingPlatforms) + random() * 50;
    const baseY = floatingYLevels[i % floatingYLevels.length];
    const y = baseY + (random() - 0.5) * 20;
    const width = 100 + Math.floor(random() * 60);
    
    const isMoving = random() < config.movingPlatformChance;
    
    if (isMoving) {
      platforms.push({
        x,
        y,
        width,
        height: 20,
        isMoving: true,
        moveSpeed: 0.8 + random() * 1,
        moveRangeX: 40 + random() * 40,
        moveRangeY: 0,
        startX: x,
        startY: y,
      });
    } else {
      platforms.push({ x, y, width, height: 20 });
    }
    
    platformZones.push({ x, y, width });
    
    if (i > 0 && i % 3 === 0 && level > 5) {
      const stepX = x - 80 - random() * 40;
      const stepY = y + 50 + random() * 30;
      platforms.push({ x: stepX, y: stepY, width: 80, height: 20 });
    }
  }
  
  const groundPlatforms = platforms.filter(p => p.y === groundY && p.width > 100);
  for (let i = 0; i < config.enemyCount && groundPlatforms.length > 0; i++) {
    const platIndex = i % groundPlatforms.length;
    const plat = groundPlatforms[platIndex];
    
    const patrolWidth = Math.min(plat.width - 60, 200);
    const patrolStart = plat.x + 30;
    const enemyX = patrolStart + patrolWidth / 2;
    
    const direction = random() > 0.5 ? 1 : -1;
    const speed = config.enemySpeed * (0.8 + random() * 0.4);
    
    enemies.push({
      id: i + 1,
      x: enemyX,
      y: groundY - 40,
      width: 45,
      height: 40,
      velocityX: speed * direction,
      patrolLeft: patrolStart,
      patrolRight: patrolStart + patrolWidth,
      isDefeated: false,
    });
  }
  
  let collectibleId = 1;
  for (let i = 0; i < config.collectibleCount; i++) {
    const x = 200 + (i * (actualLevelWidth - 400) / config.collectibleCount) + random() * 80;
    const y = 280 + random() * 200;
    const type = random() > 0.4 ? "bone" : "treat";
    
    collectibles.push({
      id: collectibleId++,
      x,
      y,
      width: 25,
      height: 25,
      collected: false,
      type: type as "bone" | "treat",
    });
  }
  
  let hazardId = 1;
  for (let i = 0; i < config.hazardCount; i++) {
    const groundPlat = groundPlatforms[i % groundPlatforms.length];
    if (!groundPlat) continue;
    
    const x = groundPlat.x + 50 + random() * (groundPlat.width - 100);
    
    hazards.push({
      id: hazardId++,
      x,
      y: groundY - 20,
      width: 40 + random() * 30,
      height: 20,
      type: "spike",
    });
  }
  
  return {
    platforms,
    enemies,
    collectibles,
    hazards,
    levelWidth: actualLevelWidth,
  };
};

const getLevelData = (level: number): LevelData => {
  return generateLevel(level);
};

export const usePlatformer = create<PlatformerState>()(
  subscribeWithSelector((set, get) => ({
    phase: "menu",
    score: 0,
    lives: 3,
    currentLevel: 1,
    totalLevels: 30,
    player: { ...INITIAL_PLAYER },
    platforms: [],
    enemies: [],
    collectibles: [],
    hazards: [],
    levelWidth: 2200,
    levelHeight: 600,
    cameraX: 0,
    continueFromLastLevel: false,
    lastReachedLevel: 1,

    setPhase: (phase) => set({ phase }),
    
    toggleContinueFromLastLevel: () => {
      set((state) => ({ continueFromLastLevel: !state.continueFromLastLevel }));
    },
    
    startGame: () => {
      const level = getLevelData(1);
      set({
        phase: "playing",
        score: 0,
        lives: 3,
        currentLevel: 1,
        lastReachedLevel: 1,
        player: { ...INITIAL_PLAYER },
        platforms: level.platforms,
        enemies: level.enemies,
        collectibles: level.collectibles,
        hazards: level.hazards,
        levelWidth: level.levelWidth,
        cameraX: 0,
      });
    },
    
    pauseGame: () => {
      const { phase } = get();
      if (phase === "playing") {
        set({ phase: "paused" });
      }
    },
    
    resumeGame: () => {
      const { phase } = get();
      if (phase === "paused") {
        set({ phase: "playing" });
      }
    },
    
    gameOver: () => set({ phase: "gameOver" }),
    
    levelComplete: () => {
      const { currentLevel, totalLevels } = get();
      if (currentLevel >= totalLevels) {
        set({ phase: "victory" });
      } else {
        set({ phase: "levelComplete" });
      }
    },
    
    nextLevel: () => {
      const { currentLevel, score, lives } = get();
      const nextLevelNum = currentLevel + 1;
      const level = getLevelData(nextLevelNum);
      set({
        phase: "playing",
        currentLevel: nextLevelNum,
        lastReachedLevel: nextLevelNum,
        player: { ...INITIAL_PLAYER },
        platforms: level.platforms,
        enemies: level.enemies,
        collectibles: level.collectibles,
        hazards: level.hazards,
        levelWidth: level.levelWidth,
        cameraX: 0,
        score: score,
        lives: lives,
      });
    },
    
    restartGame: () => {
      const { continueFromLastLevel, lastReachedLevel } = get();
      const startLevel = continueFromLastLevel ? lastReachedLevel : 1;
      const level = getLevelData(startLevel);
      set({
        phase: "playing",
        score: 0,
        lives: 3,
        currentLevel: startLevel,
        player: { ...INITIAL_PLAYER },
        platforms: level.platforms,
        enemies: level.enemies,
        collectibles: level.collectibles,
        hazards: level.hazards,
        levelWidth: level.levelWidth,
        cameraX: 0,
      });
    },
    
    updatePlayer: (updates) => {
      set((state) => ({
        player: { ...state.player, ...updates },
      }));
    },
    
    setPlayer: (player) => set({ player }),
    
    addScore: (points) => {
      set((state) => ({ score: state.score + points }));
    },
    
    loseLife: () => {
      const { lives, currentLevel } = get();
      if (lives <= 1) {
        set({ lives: 0, phase: "gameOver" });
      } else {
        const level = getLevelData(currentLevel);
        set((state) => ({
          lives: state.lives - 1,
          player: { ...INITIAL_PLAYER },
          platforms: level.platforms,
          enemies: level.enemies,
          collectibles: level.collectibles,
          hazards: level.hazards,
          cameraX: 0,
        }));
      }
    },
    
    setCameraX: (x) => set({ cameraX: x }),
    
    defeatEnemy: (enemyId) => {
      set((state) => ({
        enemies: state.enemies.map((e) =>
          e.id === enemyId ? { ...e, isDefeated: true } : e
        ),
        score: state.score + 100,
      }));
    },
    
    collectItem: (itemId) => {
      const { collectibles } = get();
      const item = collectibles.find((c) => c.id === itemId);
      if (item && !item.collected) {
        const points = item.type === "bone" ? 50 : 25;
        set((state) => ({
          collectibles: state.collectibles.map((c) =>
            c.id === itemId ? { ...c, collected: true } : c
          ),
          score: state.score + points,
        }));
      }
    },
    
    updatePlatforms: (platforms) => set({ platforms }),
    
    initLevel: () => {
      const { currentLevel } = get();
      const level = getLevelData(currentLevel);
      set({
        platforms: level.platforms,
        enemies: level.enemies,
        collectibles: level.collectibles,
        hazards: level.hazards,
        levelWidth: level.levelWidth,
      });
    },
  }))
);
