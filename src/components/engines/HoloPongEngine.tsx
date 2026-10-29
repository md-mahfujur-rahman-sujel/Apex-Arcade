import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface HoloPongEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

export const HoloPongEngine: React.FC<HoloPongEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [rally, setRally] = useState(0);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');

  const pScoreRef = useRef(0);
  const aiScoreRef = useRef(0);
  const rallyRef = useRef(0);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');
  stateRef.current = gameState;

  // Mutable table state
  const paddleHeight = 70;
  const paddleWidth = 10;

  const playerRef = useRef({
    y: 200,
    targetY: 200,
  });

  const aiSpeed = difficulty === 'easy' ? 2.8 : difficulty === 'hard' ? 4.9 : 3.8;
  const aiRef = useRef({
    y: 200,
    speed: aiSpeed,
  });
  aiRef.current.speed = aiSpeed;

  const ballRef = useRef({
    x: 320,
    y: 240,
    vx: 5,
    vy: 2.5,
    radius: 7,
    trail: [] as { x: number; y: number; alpha: number }[],
  });

  const resetBall = (towardsPlayer: boolean) => {
    ballRef.current.x = 320;
    ballRef.current.y = 240;
    const speed = difficulty === 'easy' ? 4.0 : difficulty === 'hard' ? 5.8 : 4.8;
    const angle = (Math.random() - 0.5) * 0.8;
    ballRef.current.vx = (towardsPlayer ? -1 : 1) * speed * Math.cos(angle);
    ballRef.current.vy = speed * Math.sin(angle);
    ballRef.current.trail = [];
  };

  const startGame = useCallback(() => {
    pScoreRef.current = 0;
    aiScoreRef.current = 0;
    rallyRef.current = 0;
    setPlayerScore(0);
    setAiScore(0);
    setRally(0);
    resetBall(true);
    setGameState('PLAYING');
    stateRef.current = 'PLAYING';
    audio.playPongBeep(true);
  }, []);

  // Mouse & Touch Controls
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const scale = 480 / rect.height;
    playerRef.current.targetY = mouseY * scale - paddleHeight / 2;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const touchY = e.touches[0].clientY - rect.top;
      const scale = 480 / rect.height;
      playerRef.current.targetY = touchY * scale - paddleHeight / 2;
    }
  };

  // Keyboard controls
  useEffect(() => {
    const keysDown = new Set<string>();

    const handleDown = (e: KeyboardEvent) => {
      if (isPaused) return;
      keysDown.add(e.code);
      if (e.code === 'Space' && stateRef.current !== 'PLAYING') {
        startGame();
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };

    const interval = setInterval(() => {
      if (isPaused) return;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) {
        playerRef.current.targetY = Math.max(10, playerRef.current.targetY - 8);
      }
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) {
        playerRef.current.targetY = Math.min(480 - paddleHeight - 10, playerRef.current.targetY + 8);
      }
    }, 16);

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [isPaused, startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      if (isPaused) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      // UPDATE
      if (stateRef.current === 'PLAYING') {
        const p = playerRef.current;
        p.y += (p.targetY - p.y) * 0.25;
        p.y = Math.max(12, Math.min(height - paddleHeight - 12, p.y));

        const ball = ballRef.current;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Trail
        ball.trail.push({ x: ball.x, y: ball.y, alpha: 1.0 });
        if (ball.trail.length > 8) ball.trail.shift();
        ball.trail.forEach((t) => (t.alpha -= 0.1));

        // AI tracking
        const ai = aiRef.current;
        const targetAiY = ball.y - paddleHeight / 2;
        if (ball.vx > 0) {
          ai.y += Math.sign(targetAiY - ai.y) * Math.min(ai.speed, Math.abs(targetAiY - ai.y));
        }
        ai.y = Math.max(12, Math.min(height - paddleHeight - 12, ai.y));

        // Top / Bottom wall bounce
        if (ball.y - ball.radius <= 12) {
          ball.y = 12 + ball.radius;
          ball.vy = Math.abs(ball.vy);
          audio.playPongBeep(false);
        } else if (ball.y + ball.radius >= height - 12) {
          ball.y = height - 12 - ball.radius;
          ball.vy = -Math.abs(ball.vy);
          audio.playPongBeep(false);
        }

        // Player Paddle Collision (Left)
        const playerX = 28;
        if (
          ball.x - ball.radius <= playerX + paddleWidth &&
          ball.x + ball.radius >= playerX &&
          ball.y >= p.y &&
          ball.y <= p.y + paddleHeight
        ) {
          ball.x = playerX + paddleWidth + ball.radius;
          const hitPos = (ball.y - (p.y + paddleHeight / 2)) / (paddleHeight / 2);
          const speed = Math.min(11, Math.hypot(ball.vx, ball.vy) * 1.05);
          ball.vx = Math.abs(Math.cos(hitPos * 0.75)) * speed;
          ball.vy = Math.sin(hitPos * 0.75) * speed;
          rallyRef.current++;
          setRally(rallyRef.current);
          audio.playPongBeep(true);
        }

        // AI Paddle Collision (Right)
        const aiX = width - 28 - paddleWidth;
        if (
          ball.x + ball.radius >= aiX &&
          ball.x - ball.radius <= aiX + paddleWidth &&
          ball.y >= ai.y &&
          ball.y <= ai.y + paddleHeight
        ) {
          ball.x = aiX - ball.radius;
          const hitPos = (ball.y - (ai.y + paddleHeight / 2)) / (paddleHeight / 2);
          const speed = Math.min(11, Math.hypot(ball.vx, ball.vy) * 1.05);
          ball.vx = -Math.abs(Math.cos(hitPos * 0.75)) * speed;
          ball.vy = Math.sin(hitPos * 0.75) * speed;
          rallyRef.current++;
          setRally(rallyRef.current);
          audio.playPongBeep(false);
        }

        // Score conditions
        if (ball.x < -10) {
          // AI scores
          aiScoreRef.current++;
          setAiScore(aiScoreRef.current);
          audio.playHit();
          if (aiScoreRef.current >= 7) {
            stateRef.current = 'GAMEOVER';
            setGameState('GAMEOVER');
            onGameOver(pScoreRef.current * 100 + rallyRef.current * 10);
          } else {
            resetBall(false);
          }
        } else if (ball.x > width + 10) {
          // Player scores
          pScoreRef.current++;
          setPlayerScore(pScoreRef.current);
          onScoreUpdate(pScoreRef.current * 100 + rallyRef.current * 10);
          audio.playScore();
          if (pScoreRef.current >= 7) {
            stateRef.current = 'GAMEOVER';
            setGameState('GAMEOVER');
            onGameOver(pScoreRef.current * 100 + rallyRef.current * 10);
          } else {
            resetBall(true);
          }
        }
      }

      // RENDER
      ctx.clearRect(0, 0, width, height);

      // 3D Angled Holographic Arena Table
      const arenaGrad = ctx.createLinearGradient(0, 0, width, height);
      arenaGrad.addColorStop(0, '#040711');
      arenaGrad.addColorStop(0.5, '#0B132B');
      arenaGrad.addColorStop(1, '#050814');
      ctx.fillStyle = arenaGrad;
      ctx.fillRect(0, 0, width, height);

      // Perspective Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 12);
        ctx.lineTo(x, height - 12);
        ctx.stroke();
      }
      for (let y = 12; y < height - 12; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Neon Table Outer Boundary
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      // Center court net line
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(width / 2, 12);
      ctx.lineTo(width / 2, height - 12);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center holographic circle
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2);
      ctx.stroke();

      // Render Player Paddle (Left, Cyan with 3D bevel)
      const p = playerRef.current;
      const pGrad = ctx.createLinearGradient(28, 0, 38, 0);
      pGrad.addColorStop(0, '#0284C7');
      pGrad.addColorStop(0.5, '#38BDF8');
      pGrad.addColorStop(1, '#BAE6FD');
      ctx.fillStyle = pGrad;
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 12;
      ctx.fillRect(28, p.y, paddleWidth, paddleHeight);
      ctx.shadowBlur = 0;

      // Render AI Paddle (Right, Crimson with 3D bevel)
      const ai = aiRef.current;
      const aiX = width - 28 - paddleWidth;
      const aiGrad = ctx.createLinearGradient(aiX, 0, aiX + paddleWidth, 0);
      aiGrad.addColorStop(0, '#991B1B');
      aiGrad.addColorStop(0.5, '#EF4444');
      aiGrad.addColorStop(1, '#FECACA');
      ctx.fillStyle = aiGrad;
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 12;
      ctx.fillRect(aiX, ai.y, paddleWidth, paddleHeight);
      ctx.shadowBlur = 0;

      // Render 3D Ball & Motion Trail
      const ball = ballRef.current;
      ball.trail.forEach((t) => {
        if (t.alpha > 0) {
          ctx.fillStyle = `rgba(56, 189, 248, ${t.alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Ball Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(ball.x + 3, ball.y + 6, ball.radius * 1.1, ball.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball 3D Sphere with radial gradient
      const bGrad = ctx.createRadialGradient(
        ball.x - 2,
        ball.y - 2,
        1,
        ball.x,
        ball.y,
        ball.radius
      );
      bGrad.addColorStop(0, '#FFFFFF');
      bGrad.addColorStop(0.4, '#E0F2FE');
      bGrad.addColorStop(1, '#0284C7');
      ctx.fillStyle = bGrad;
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, onGameOver, onScoreUpdate]);

  return (
    <div
      className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full h-full block cursor-ns-resize"
      />

      {/* Score HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-cyan-400">PLAYER</span>
          <span className="text-2xl font-mono font-bold text-white tabular-nums">{playerScore}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Rally</span>
          <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">{rally}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono font-bold text-red-400 tabular-nums">{aiScore}</span>
          <span className="text-xs font-semibold text-red-400">AI CORE</span>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Holo-Pong 3D</div>
          <p className="text-sm text-slate-300 mb-5">Move mouse or touch vertically to control paddle</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            START MATCH (FIRST TO 7)
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-1 tracking-tight">
            {playerScore >= 7 ? 'Victory!' : 'AI Opponent Wins'}
          </div>
          <div className="text-sm text-slate-300 mb-4">
            Final Match Score: <span className="font-mono text-cyan-300">{playerScore} - {aiScore}</span> (Max Rally: {rally})
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Rematch
          </button>
        </div>
      )}
    </div>
  );
};
