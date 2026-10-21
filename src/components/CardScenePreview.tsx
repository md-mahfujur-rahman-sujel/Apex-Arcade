import React, { useEffect, useRef } from 'react';
import { GameInfo } from '../types/game';

interface CardScenePreviewProps {
  game: GameInfo;
  isHovered?: boolean;
}

declare global {
  interface Window {
    Scenes?: {
      mount: () => void;
      S?: Record<string | number, (ctx: CanvasRenderingContext2D, time: number, accentColor: string) => void>;
    };
  }
}

export const CardScenePreview: React.FC<CardScenePreviewProps> = ({ game, isHovered = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 300;
    const H = 128;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    let isVisible = true;
    let animId: number;
    let lastRenderTime = 0;
    const startTime = performance.now();

    // IntersectionObserver ensures only cards currently in view render
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry?.isIntersecting ?? true;
        if (isVisible && !animId) {
          animId = requestAnimationFrame(render);
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(canvas);

    const render = (now: number) => {
      // Pause animation if off-screen, or if a game theater modal is open
      const modalOpen = !!document.getElementById('playable-theater-modal');
      if (!isVisible || modalOpen) {
        animId = 0;
        return;
      }

      // Throttle preview cards to ~30-40fps to save memory and CPU
      if (now - lastRenderTime >= 24) {
        lastRenderTime = now;
        const elapsed = (now - startTime) / 1000;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        const sceneFn = window.Scenes?.S?.[game.gameNumber];
        if (sceneFn) {
          ctx.save();
          try {
            sceneFn(ctx, elapsed + game.gameNumber * 1.7, game.accentColor);
          } catch {
            // Broken scene must never crash card
          }
          ctx.restore();
        } else {
          ctx.save();
          const grad = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 120);
          grad.addColorStop(0, `${game.accentColor}33`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      if (animId) cancelAnimationFrame(animId);
    };
  }, [game.gameNumber, game.accentColor]);

  return (
    <div className="relative w-full h-[132px] overflow-hidden bg-[#0A0D18]">
      {/* 3D Depth Isometric Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 30%, ${game.accentColor}25 0%, transparent 70%),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 20px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 20px)
          `,
          transform: 'perspective(280px) rotateX(48deg) scale(1.3) translateY(-10px)',
          transformOrigin: 'bottom center',
        }}
      />

      {/* Animated Card Scene Canvas from user's card-scenes.js */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isHovered ? 'opacity-100 scale-105' : 'opacity-85'
        }`}
      />

      {/* Floating Outline Sequence Number */}
      <span
        className="absolute right-3 top-1 font-mono text-5xl font-black select-none pointer-events-none opacity-25"
        style={{
          WebkitTextStroke: `1.5px ${game.accentColor}`,
          color: 'transparent',
        }}
      >
        {String(game.gameNumber).padStart(2, '0')}
      </span>

      {/* Stylized Floating Icon Badge */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
        <span className="text-base leading-none select-none drop-shadow">{game.icon}</span>
        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-300">
          {game.category}
        </span>
      </div>

      {/* Year badge */}
      <div className="absolute left-3 bottom-2.5 z-10 font-mono text-[11px] font-semibold text-slate-400/90 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: game.accentColor }} />
        <span>{game.year}</span>
      </div>
    </div>
  );
};
