import { useRef, useEffect, useCallback } from "react";
import { usePlatformer, type Player, type Platform, type Enemy, type Collectible, type Hazard } from "@/lib/stores/usePlatformer";
import { useAudio } from "@/lib/stores/useAudio";

const GRAVITY = 0.35;
const BASE_JUMP_FORCE = -10;
const MAX_JUMP_FORCE = -13;
const MOVE_SPEED = 2.5;
const MAX_FALL_SPEED = 9;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MOMENTUM_BUILD_RATE = 0.012;
const MAX_MOMENTUM = 1.0;

interface Keys {
  left: boolean;
  right: boolean;
  jump: boolean;
}

interface GameCanvasProps {
  touchControls?: { left: boolean; right: boolean; jump: boolean };
}

export function GameCanvas({ touchControls }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Keys>({ left: false, right: false, jump: false });
  const touchRef = useRef<Keys>({ left: false, right: false, jump: false });
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameLoopRef = useRef<(timestamp: number) => void>(() => {});
  const renderRef = useRef<() => void>(() => {});
  const platformTimeRef = useRef<number>(0);
  const borderCollieImageRef = useRef<HTMLImageElement | null>(null);
  const momentumRef = useRef<number>(0);
  const previousPlatformPositionsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const standingOnPlatformRef = useRef<number | null>(null);
  
  const { playHit, playSuccess } = useAudio();

  useEffect(() => {
    if (touchControls) {
      touchRef.current = touchControls;
    }
  }, [touchControls]);

  useEffect(() => {
    const img = new Image();
    img.src = "/attached_assets/Border-Collie-1_1764709132939.webp";
    img.onload = () => {
      borderCollieImageRef.current = img;
    };
  }, []);

  const checkCollision = useCallback((rect1: { x: number; y: number; width: number; height: number }, rect2: { x: number; y: number; width: number; height: number }) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }, []);

  const updateMovingPlatforms = useCallback((platforms: Platform[], time: number) => {
    return platforms.map((platform) => {
      if (!platform.isMoving) return platform;
      
      const startX = platform.startX ?? platform.x;
      const startY = platform.startY ?? platform.y;
      const speed = platform.moveSpeed ?? 1;
      
      let newX = platform.x;
      let newY = platform.y;
      
      if (platform.moveRangeX) {
        newX = startX + Math.sin(time * speed * 0.002) * platform.moveRangeX;
      }
      if (platform.moveRangeY) {
        newY = startY + Math.sin(time * speed * 0.002) * platform.moveRangeY;
      }
      
      return { ...platform, x: newX, y: newY };
    });
  }, []);

  const checkPlatformCollision = useCallback((newPlayer: Player, platforms: Platform[], prevPlayerY: number): { player: Player; standingOnIndex: number | null } => {
    let updatedPlayer = { ...newPlayer };
    let standingOnIndex: number | null = null;
    
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      if (checkCollision(updatedPlayer, platform)) {
        const playerBottom = updatedPlayer.y + updatedPlayer.height;
        const playerTop = updatedPlayer.y;
        const platformTop = platform.y;
        const platformBottom = platform.y + platform.height;
        
        const prevPlayerBottom = prevPlayerY + updatedPlayer.height;
        
        if (prevPlayerBottom <= platformTop + 5 && playerBottom > platformTop) {
          updatedPlayer.y = platformTop - updatedPlayer.height;
          updatedPlayer.velocityY = 0;
          updatedPlayer.isOnGround = true;
          updatedPlayer.isJumping = false;
          standingOnIndex = i;
        } else if (playerTop < platformBottom && prevPlayerY >= platformBottom) {
          updatedPlayer.y = platformBottom;
          updatedPlayer.velocityY = 0;
        } else if (updatedPlayer.velocityX > 0) {
          updatedPlayer.x = platform.x - updatedPlayer.width;
        } else if (updatedPlayer.velocityX < 0) {
          updatedPlayer.x = platform.x + platform.width;
        }
      }
    }
    
    return { player: updatedPlayer, standingOnIndex };
  }, [checkCollision]);

  const updateEnemies = useCallback((enemies: Enemy[]) => {
    return enemies.map((enemy) => {
      if (enemy.isDefeated) return enemy;
      
      let newX = enemy.x + enemy.velocityX;
      let newVelocityX = enemy.velocityX;
      
      if (newX <= enemy.patrolLeft) {
        newX = enemy.patrolLeft;
        newVelocityX = Math.abs(enemy.velocityX);
      } else if (newX + enemy.width >= enemy.patrolRight) {
        newX = enemy.patrolRight - enemy.width;
        newVelocityX = -Math.abs(enemy.velocityX);
      }
      
      return { ...enemy, x: newX, velocityX: newVelocityX };
    });
  }, []);

  const drawBorderCollie = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, facingRight: boolean, walkFrame: number) => {
    ctx.save();
    
    if (!facingRight) {
      ctx.translate(x + width / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-x - width / 2, 0);
    }
    
    const legOffset = Math.sin(walkFrame * 0.3) * 4;
    const bodyBob = Math.abs(Math.sin(walkFrame * 0.3)) * 2;
    
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(x - width * 0.15, y + height * 0.45);
    ctx.quadraticCurveTo(x - width * 0.4, y + height * 0.2, x - width * 0.35, y + height * 0.55);
    ctx.quadraticCurveTo(x - width * 0.25, y + height * 0.75, x - width * 0.05, y + height * 0.55);
    ctx.fill();
    
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.35, y + height * 0.5 - bodyBob, width * 0.45, height * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.35, y + height * 0.58 - bodyBob, width * 0.28, height * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.75, y + height * 0.28 - bodyBob, width * 0.22, height * 0.22, 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x + width * 0.68, y + height * 0.32 - bodyBob);
    ctx.lineTo(x + width * 0.78, y + height * 0.18 - bodyBob);
    ctx.lineTo(x + width * 0.88, y + height * 0.32 - bodyBob);
    ctx.quadraticCurveTo(x + width * 0.78, y + height * 0.45 - bodyBob, x + width * 0.68, y + height * 0.32 - bodyBob);
    ctx.fill();
    
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.78, y + height * 0.35 - bodyBob, width * 0.12, height * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.62, y + height * 0.12 - bodyBob, width * 0.08, height * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + width * 0.85, y + height * 0.1 - bodyBob, width * 0.08, height * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#3d2314";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.72, y + height * 0.26 - bodyBob, width * 0.035, height * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + width * 0.84, y + height * 0.26 - bodyBob, width * 0.035, height * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + width * 0.71, y + height * 0.25 - bodyBob, width * 0.012, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width * 0.83, y + height * 0.25 - bodyBob, width * 0.012, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.92, y + height * 0.38 - bodyBob, width * 0.06, height * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#FF6B8A";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.95, y + height * 0.42 - bodyBob, width * 0.04, height * 0.025, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + width * 0.08, y + height * 0.7 + legOffset, width * 0.1, height * 0.28);
    ctx.fillRect(x + width * 0.28, y + height * 0.7 - legOffset, width * 0.1, height * 0.28);
    ctx.fillRect(x + width * 0.48, y + height * 0.7 + legOffset * 0.8, width * 0.1, height * 0.28);
    ctx.fillRect(x + width * 0.62, y + height * 0.7 - legOffset * 0.8, width * 0.1, height * 0.28);
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + width * 0.08, y + height * 0.92, width * 0.1, height * 0.08);
    ctx.fillRect(x + width * 0.28, y + height * 0.92, width * 0.1, height * 0.08);
    ctx.fillRect(x + width * 0.48, y + height * 0.92, width * 0.1, height * 0.08);
    ctx.fillRect(x + width * 0.62, y + height * 0.92, width * 0.1, height * 0.08);
    
    ctx.restore();
  }, []);

  const drawBulldog = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, facingRight: boolean, isDefeated: boolean, walkFrame: number) => {
    if (isDefeated) return;
    
    ctx.save();
    
    if (!facingRight) {
      ctx.translate(x + width / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-x - width / 2, 0);
    }
    
    const legOffset = Math.sin(walkFrame * 0.4) * 2;
    
    ctx.fillStyle = "#8B7355";
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height * 0.55, width * 0.45, height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#A08060";
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height * 0.6, width * 0.25, height * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#8B7355";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.5, y + height * 0.2, width * 0.38, height * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#A08060";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.5, y + height * 0.32, width * 0.25, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#8B7355";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.15, y + height * 0.08, width * 0.1, height * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + width * 0.85, y + height * 0.08, width * 0.1, height * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#2d1810";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.35, y + height * 0.18, width * 0.06, height * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + width * 0.65, y + height * 0.18, width * 0.06, height * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.5, y + height * 0.28, width * 0.1, height * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = "#2d1810";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, y + height * 0.35);
    ctx.quadraticCurveTo(x + width * 0.5, y + height * 0.42, x + width * 0.7, y + height * 0.35);
    ctx.stroke();
    
    ctx.fillStyle = "#8B7355";
    ctx.fillRect(x + width * 0.1, y + height * 0.8 + legOffset, width * 0.18, height * 0.2);
    ctx.fillRect(x + width * 0.35, y + height * 0.8 - legOffset, width * 0.18, height * 0.2);
    ctx.fillRect(x + width * 0.5, y + height * 0.8 + legOffset, width * 0.18, height * 0.2);
    ctx.fillRect(x + width * 0.72, y + height * 0.8 - legOffset, width * 0.18, height * 0.2);
    
    ctx.restore();
  }, []);

  const drawCollectible = useCallback((ctx: CanvasRenderingContext2D, item: Collectible, time: number) => {
    if (item.collected) return;
    
    const { x, y, width, height, type } = item;
    const bounce = Math.sin(time * 0.005) * 3;
    const drawY = y + bounce;
    
    if (type === "bone") {
      ctx.fillStyle = "#F5F5DC";
      ctx.strokeStyle = "#D4C4A8";
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.ellipse(x + width * 0.15, drawY + height * 0.3, width * 0.15, height * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x + width * 0.15, drawY + height * 0.7, width * 0.15, height * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillRect(x + width * 0.1, drawY + height * 0.35, width * 0.8, height * 0.3);
      ctx.strokeRect(x + width * 0.1, drawY + height * 0.35, width * 0.8, height * 0.3);
      
      ctx.beginPath();
      ctx.ellipse(x + width * 0.85, drawY + height * 0.3, width * 0.15, height * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x + width * 0.85, drawY + height * 0.7, width * 0.15, height * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = "#FF6B35";
      ctx.beginPath();
      const centerX = x + width / 2;
      const centerY = drawY + height / 2;
      const spikes = 5;
      const outerRadius = width / 2;
      const innerRadius = width / 4;
      
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(centerX, centerY, width * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const drawHazard = useCallback((ctx: CanvasRenderingContext2D, hazard: Hazard) => {
    const { x, y, width, height } = hazard;
    
    ctx.fillStyle = "#555555";
    ctx.fillRect(x, y + height * 0.7, width, height * 0.3);
    
    ctx.fillStyle = "#888888";
    const spikeCount = Math.floor(width / 15);
    const spikeWidth = width / spikeCount;
    
    for (let i = 0; i < spikeCount; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * spikeWidth, y + height);
      ctx.lineTo(x + i * spikeWidth + spikeWidth / 2, y);
      ctx.lineTo(x + (i + 1) * spikeWidth, y + height);
      ctx.closePath();
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = usePlatformer.subscribe(
      (state) => state.phase,
      (phase, prevPhase) => {
        if (phase === "menu" || phase === "gameOver") {
          momentumRef.current = 0;
        }
        if (prevPhase !== "playing" && phase === "playing") {
          keysRef.current = { left: false, right: false, jump: false };
          touchRef.current = { left: false, right: false, jump: false };
          momentumRef.current = 0;
        }
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      const state = usePlatformer.getState();
      const { phase, levelWidth, setPlayer, setCameraX, defeatEnemy, collectItem, loseLife, levelComplete, updatePlatforms, isDying, updateDeathAnimation, finishDeath } = state;
      
      if (isDying) {
        const animationComplete = updateDeathAnimation();
        if (animationComplete) {
          finishDeath();
        }
        return;
      }
      
      if (phase !== "playing") {
        momentumRef.current = 0;
        return;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      platformTimeRef.current += deltaTime;
      
      if (deltaTime > 100) {
        return;
      }

      const keyboard = keysRef.current;
      const touch = touchRef.current;
      const keys = {
        left: keyboard.left || touch.left,
        right: keyboard.right || touch.right,
        jump: keyboard.jump || touch.jump,
      };
      const currentPlayer = state.player;
      const currentEnemies = state.enemies;
      const currentCollectibles = state.collectibles;
      const currentPlatforms = state.platforms;
      const currentHazards = state.hazards;
      
      const previousPositions = previousPlatformPositionsRef.current;
      currentPlatforms.forEach((platform, index) => {
        if (platform.isMoving) {
          previousPositions.set(index, { x: platform.x, y: platform.y });
        }
      });
      
      const updatedPlatforms = updateMovingPlatforms(currentPlatforms, platformTimeRef.current);
      updatePlatforms(updatedPlatforms);
      
      let newPlayer: Player = { ...currentPlayer };
      const prevPlayerY = currentPlayer.y;
      
      const lastStandingIndex = standingOnPlatformRef.current;
      if (lastStandingIndex !== null && updatedPlatforms[lastStandingIndex]?.isMoving) {
        const platform = updatedPlatforms[lastStandingIndex];
        const prevPos = previousPositions.get(lastStandingIndex);
        if (prevPos && platform) {
          const deltaX = platform.x - prevPos.x;
          const deltaY = platform.y - prevPos.y;
          newPlayer.x += deltaX;
          newPlayer.y += deltaY;
        }
      }
      
      const isMoving = keys.left || keys.right;
      
      // Only allow direction changes when on the ground - no mid-air control
      if (newPlayer.isOnGround) {
        newPlayer.velocityX = 0;
        
        if (keys.left) {
          newPlayer.velocityX = -MOVE_SPEED;
          newPlayer.facingRight = false;
          newPlayer.walkFrame = (newPlayer.walkFrame + 1) % 60;
        }
        if (keys.right) {
          newPlayer.velocityX = MOVE_SPEED;
          newPlayer.facingRight = true;
          newPlayer.walkFrame = (newPlayer.walkFrame + 1) % 60;
        }
        
        if (!keys.left && !keys.right) {
          newPlayer.walkFrame = 0;
          momentumRef.current = Math.max(0, momentumRef.current - 0.03);
        }
        
        if (isMoving) {
          momentumRef.current = Math.min(MAX_MOMENTUM, momentumRef.current + MOMENTUM_BUILD_RATE);
        }
      }
      // In mid-air: maintain horizontal velocity, no direction changes allowed
      
      if (keys.jump && newPlayer.isOnGround && !newPlayer.isJumping) {
        const momentum = momentumRef.current;
        const jumpForce = BASE_JUMP_FORCE + (MAX_JUMP_FORCE - BASE_JUMP_FORCE) * momentum;
        newPlayer.velocityY = jumpForce;
        newPlayer.isOnGround = false;
        newPlayer.isJumping = true;
      }
      
      if (!keys.jump) {
        newPlayer.isJumping = false;
      }
      
      newPlayer.velocityY += GRAVITY;
      if (newPlayer.velocityY > MAX_FALL_SPEED) {
        newPlayer.velocityY = MAX_FALL_SPEED;
      }
      
      newPlayer.x += newPlayer.velocityX;
      newPlayer.y += newPlayer.velocityY;
      
      if (newPlayer.x < 0) newPlayer.x = 0;
      if (newPlayer.x + newPlayer.width > levelWidth) {
        newPlayer.x = levelWidth - newPlayer.width;
      }
      
      newPlayer.isOnGround = false;
      const collisionResult = checkPlatformCollision(newPlayer, updatedPlatforms, prevPlayerY);
      newPlayer = collisionResult.player;
      standingOnPlatformRef.current = collisionResult.standingOnIndex;
      
      if (newPlayer.y > 650) {
        loseLife();
        playHit();
        return;
      }
      
      for (const hazard of currentHazards) {
        if (checkCollision(newPlayer, hazard)) {
          loseLife();
          playHit();
          return;
        }
      }
      
      const updatedEnemies = updateEnemies(currentEnemies);
      usePlatformer.setState({ enemies: updatedEnemies });
      
      let hitEnemy = false;
      for (const enemy of updatedEnemies) {
        if (enemy.isDefeated) continue;
        
        if (checkCollision(newPlayer, enemy)) {
          const playerBottom = newPlayer.y + newPlayer.height;
          const enemyTop = enemy.y;
          
          if (currentPlayer.velocityY > 0 && playerBottom - enemyTop < 20) {
            defeatEnemy(enemy.id);
            newPlayer.velocityY = BASE_JUMP_FORCE * 0.6;
            playSuccess();
          } else {
            hitEnemy = true;
            loseLife();
            playHit();
            break;
          }
        }
      }
      
      if (hitEnemy) return;
      
      for (const item of currentCollectibles) {
        if (!item.collected && checkCollision(newPlayer, item)) {
          collectItem(item.id);
          playSuccess();
        }
      }
      
      const freshState = usePlatformer.getState();
      const freshCollectibles = freshState.collectibles;
      const freshEnemies = freshState.enemies;
      
      const allCollected = freshCollectibles.every((c) => c.collected);
      const allDefeated = freshEnemies.every((e) => e.isDefeated);
      if (allCollected && allDefeated && newPlayer.x > levelWidth - 200) {
        levelComplete();
        return;
      }
      
      let newCameraX = newPlayer.x - CANVAS_WIDTH / 2 + newPlayer.width / 2;
      newCameraX = Math.max(0, Math.min(newCameraX, levelWidth - CANVAS_WIDTH));
      
      setPlayer(newPlayer);
      setCameraX(newCameraX);
    };
    
    gameLoopRef.current = gameLoop;
  }, [checkCollision, checkPlatformCollision, updateEnemies, updateMovingPlatforms, playHit, playSuccess]);

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const state = usePlatformer.getState();
      const currentPlayer = state.player;
      const currentPlatforms = state.platforms;
      const currentEnemies = state.enemies;
      const currentCollectibles = state.collectibles;
      const currentHazards = state.hazards;
      const currentCameraX = state.cameraX;
      const currentLevel = state.currentLevel;
      
      const bgColors = [
        { top: "#87CEEB", mid: "#98D8C8", bottom: "#7CB342" },
        { top: "#FFB347", mid: "#FFCC80", bottom: "#8B4513" },
        { top: "#9370DB", mid: "#DDA0DD", bottom: "#4B0082" },
      ];
      const levelBg = bgColors[(currentLevel - 1) % bgColors.length];
      
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, levelBg.top);
      gradient.addColorStop(0.6, levelBg.mid);
      gradient.addColorStop(1, levelBg.bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = currentLevel === 1 ? "#228B22" : currentLevel === 2 ? "#8B4513" : "#4B0082";
      for (let i = 0; i < 8; i++) {
        const hillX = (i * 350 - currentCameraX * 0.3) % (CANVAS_WIDTH + 400) - 200;
        ctx.beginPath();
        ctx.ellipse(hillX, CANVAS_HEIGHT - 20, 180, 80, 0, Math.PI, 0);
        ctx.fill();
      }
      
      ctx.save();
      ctx.translate(-currentCameraX, 0);
      
      for (const platform of currentPlatforms) {
        if (platform.height > 30) {
          ctx.fillStyle = "#4A2800";
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          ctx.fillStyle = "#228B22";
          ctx.fillRect(platform.x, platform.y, platform.width, 15);
          
          ctx.fillStyle = "#2E7D32";
          for (let i = 0; i < platform.width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(platform.x + i + 5, platform.y);
            ctx.lineTo(platform.x + i + 10, platform.y - 8);
            ctx.lineTo(platform.x + i + 15, platform.y);
            ctx.fill();
          }
        } else {
          if (platform.isMoving) {
            ctx.fillStyle = "#6B4423";
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.fillStyle = "#8B5A2B";
            ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, 4);
            ctx.strokeStyle = "#FFD700";
            ctx.lineWidth = 2;
            ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
          } else {
            ctx.fillStyle = "#8B4513";
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.fillStyle = "#A0522D";
            ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, 4);
          }
        }
      }
      
      for (const hazard of currentHazards) {
        drawHazard(ctx, hazard);
      }
      
      for (const item of currentCollectibles) {
        drawCollectible(ctx, item, platformTimeRef.current);
      }
      
      for (const enemy of currentEnemies) {
        drawBulldog(ctx, enemy.x, enemy.y, enemy.width, enemy.height, enemy.velocityX > 0, enemy.isDefeated, platformTimeRef.current * 0.1);
      }
      
      const { isDying, deathAnimationProgress } = state;
      if (isDying) {
        ctx.save();
        const centerX = currentPlayer.x + currentPlayer.width / 2;
        const centerY = currentPlayer.y + currentPlayer.height / 2;
        const fallOffset = deathAnimationProgress * 100;
        const rotation = deathAnimationProgress * Math.PI * 4;
        const scale = 1 - deathAnimationProgress * 0.3;
        const opacity = 1 - deathAnimationProgress * 0.5;
        
        ctx.globalAlpha = opacity;
        ctx.translate(centerX, centerY + fallOffset);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY - fallOffset);
        
        drawBorderCollie(ctx, currentPlayer.x, currentPlayer.y + fallOffset, currentPlayer.width, currentPlayer.height, currentPlayer.facingRight, currentPlayer.walkFrame);
        ctx.restore();
      } else {
        drawBorderCollie(ctx, currentPlayer.x, currentPlayer.y, currentPlayer.width, currentPlayer.height, currentPlayer.facingRight, currentPlayer.walkFrame);
      }
      
      ctx.restore();
    };
    
    renderRef.current = render;
  }, [drawBorderCollie, drawBulldog, drawCollectible, drawHazard]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        keysRef.current.left = true;
      }
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        keysRef.current.right = true;
      }
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        keysRef.current.jump = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        keysRef.current.left = false;
      }
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        keysRef.current.right = false;
      }
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        keysRef.current.jump = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    
    const animate = (timestamp: number) => {
      gameLoopRef.current(timestamp);
      renderRef.current();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        display: "block",
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
      }}
    />
  );
}
