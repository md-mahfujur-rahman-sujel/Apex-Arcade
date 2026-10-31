import React, { useEffect, useRef, useState } from 'react';
import { GameInfo } from '../types/game';

interface CardScenePreviewProps {
  game: GameInfo;
  isHovered?: boolean;
  captureFrames?: boolean;
  onCapture?: (dataUrl: string) => void;
  containerClassName?: string;
}

let cardScenesPromise: Promise<void> | undefined;

export function loadCardScenes(): Promise<void> {
  if (window.Scenes) return Promise.resolve();
  if (!cardScenesPromise) {
    cardScenesPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${import.meta.env.BASE_URL}assets/kits/card-scenes.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        cardScenesPromise = undefined;
        reject(new Error('Card scene previews could not be loaded'));
      };
      document.head.appendChild(script);
    });
  }
  return cardScenesPromise;
}

declare global {
  interface Window {
    Scenes?: {
      mount: () => void;
      S?: Record<string | number, (ctx: CanvasRenderingContext2D, time: number, accentColor: string) => void>;
    };
  }
}

export const CardScenePreview: React.FC<CardScenePreviewProps> = ({ game, isHovered = false, captureFrames = false, onCapture, containerClassName }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sceneScriptLoaded, setSceneScriptLoaded] = useState(() => !!window.Scenes);

  useEffect(() => {
    let active = true;
    const load = () => {
      loadCardScenes().then(() => {
        if (active) setSceneScriptLoaded(true);
      }).catch(() => {
        // The canvas keeps its gradient fallback when the optional preview script is unavailable.
      });
    };
    const canvas = canvasRef.current;
    if (!canvas || !('IntersectionObserver' in window)) {
      load();
      return () => { active = false; };
    }
    const loaderObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loaderObserver.disconnect();
        load();
      }
    }, { rootMargin: '200px' });
    loaderObserver.observe(canvas);
    return () => {
      active = false;
      loaderObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!sceneScriptLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 300;
    const H = 128;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(isCoarsePointer ? 1 : 1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    let isVisible = true;
    let animId = 0;
    let lastRenderTime = 0;
    const startTime = performance.now();
    const capturedFrames = new Set<number>();

    // IntersectionObserver ensures only cards currently in view render
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry?.isIntersecting ?? true;
        if (isVisible) start();
      },
      { rootMargin: '100px' }
    );
    observer.observe(canvas);

    const render = (now: number) => {
      // Pause animation if off-screen, or if a game theater modal is open
      animId = 0;
      // Off-screen or hidden tab: stop; the observer / visibilitychange listener restarts the loop.
      if (!isVisible || document.hidden) return;
      // While a game theater is open keep an idle loop alive so previews resume by themselves when it closes.
      if (document.getElementById('playable-theater-modal')) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Throttle preview cards to ~30-40fps to save memory and CPU
      if (now - lastRenderTime >= 24) {
        lastRenderTime = now;
        const elapsed = (now - startTime) / 1000;
        // Full state reset each frame so a scene that threw mid-draw can never leave a stale clip/alpha/transform behind.
        (ctx as CanvasRenderingContext2D & { reset?: () => void }).reset?.();
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
        if (captureFrames && onCapture) {
          [0, 1, 2].forEach((frameIndex) => {
            if (!capturedFrames.has(frameIndex) && elapsed >= frameIndex * 1.25) {
              capturedFrames.add(frameIndex);
              try { onCapture(canvas.toDataURL('image/png')); } catch { /* Capture is optional; scene preview remains usable. */ }
            }
          });
        }
      }

      if (!prefersReducedMotion) animId = requestAnimationFrame(render);
    };

    function start() {
      if (!animId) animId = requestAnimationFrame(render);
    }
    const onVisibility = () => {
      if (!document.hidden && isVisible) start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    start();

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (animId) cancelAnimationFrame(animId);
      animId = 0;
    };
  }, [game.gameNumber, game.accentColor, captureFrames, onCapture, sceneScriptLoaded]);

  return (
    <div data-card-scene className={`relative w-full h-[132px] overflow-hidden bg-stage ${containerClassName || ''}`}>
      {/* 3D Depth Isometric Grid Background */}
      <div
        data-card-scene-grid
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
        data-card-scene-canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full ${game.gameNumber === 5 ? 'object-contain' : 'object-cover'} transition-opacity duration-[var(--apex-motion-fast)] ${
          isHovered ? 'opacity-100 scale-105' : 'opacity-85'
        }`}
      />

      {/* Floating Outline Sequence Number */}
      <span
        data-card-scene-number
        className="absolute right-3 top-1 font-mono text-5xl font-black select-none pointer-events-none opacity-25"
        style={{
          WebkitTextStroke: `1.5px ${game.accentColor}`,
          color: 'transparent',
        }}
      >
        {String(game.gameNumber).padStart(2, '0')}
      </span>

      {/* Stylized Floating Icon Badge */}
      <div data-card-scene-category className="absolute left-3 top-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
        <span className="text-base leading-none select-none drop-shadow">{game.icon}</span>
        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-white/85">
          {game.category}
        </span>
      </div>

      {/* Year badge */}
      <div data-card-scene-year className="absolute left-3 bottom-2.5 z-10 font-mono text-[11px] font-semibold text-slate-400/90 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: game.accentColor }} />
        <span>{game.year}</span>
      </div>
    </div>
  );
};
