import React, { useEffect, useRef } from 'react';
import { GameInfo } from '../types/game';

interface LivePreviewProps {
  game: GameInfo;
  isHovered: boolean;
  className?: string;
}

export const InteractiveLivePreview: React.FC<LivePreviewProps> = ({ game, isHovered, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = Math.random() * 100;

    const render = () => {
      t += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Base cyber background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0d101d');
      bgGrad.addColorStop(1, '#08090f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle 3D grid perspective floor
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const horizonY = height * 0.45;

      // Draw perspective vanishing lines
      const vanishingX = width / 2;
      for (let x = -width * 0.5; x <= width * 1.5; x += 32) {
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw horizontal depth rungs
      for (let y = horizonY; y < height; y += (height - y) * 0.25 + 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // If hand-crafted scene exists in window.Scenes, render it scaled to preview viewport
      const sceneFn = window.Scenes?.S?.[game.gameNumber];
      if (sceneFn) {
        ctx.save();
        ctx.scale(width / 300, height / 128);
        try {
          sceneFn(ctx, t + game.gameNumber * 1.7, game.accentColor);
        } catch {}
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      // Fallback: Game-specific procedural animated 2.5D visual
      switch (game.previewType) {
        case 'pong': {
          // 3D perspective table tennis
          const ballX = width * 0.5 + Math.sin(t * 2) * (width * 0.35);
          const ballZ = (Math.cos(t * 2) + 1) * 0.5;
          const ballY = horizonY + 20 + ballZ * (height - horizonY - 40);
          const radius = 4 + ballZ * 8;

          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath();
          ctx.ellipse(ballX, ballY + radius, radius * 1.2, radius * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Left paddle
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(16, horizonY + 10 + Math.sin(t * 1.5) * 30, 6, 40);

          // Right paddle
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(width - 22, horizonY + 15 + Math.cos(t * 1.8) * 30, 6, 40);

          // Glowing 3D Ball
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = '#38BDF8';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(ballX, ballY, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }

        case 'flappy': {
          // 3D perspective cyber pipe dodger
          const birdY = height * 0.5 + Math.sin(t * 3) * 25;
          const birdX = width * 0.35;

          // Animated Pipes
          for (let i = 0; i < 3; i++) {
            const pipeX = ((width + 100 - ((t * 80 + i * 120) % (width + 120))) + width) % (width + 120) - 20;
            const gapY = height * 0.5 + Math.sin(i * 2 + 1) * 20;

            // Top pipe with 3D bevel
            ctx.fillStyle = '#10B981';
            ctx.fillRect(pipeX, 0, 24, gapY - 32);
            ctx.fillStyle = '#059669';
            ctx.fillRect(pipeX + 18, 0, 6, gapY - 32);

            // Bottom pipe
            ctx.fillStyle = '#10B981';
            ctx.fillRect(pipeX, gapY + 32, 24, height - (gapY + 32));
            ctx.fillStyle = '#059669';
            ctx.fillRect(pipeX + 18, gapY + 32, 6, height - (gapY + 32));
          }

          // Flappy Bird (Sphere with glowing wing & beak)
          ctx.fillStyle = '#FACC15';
          ctx.shadowColor = '#FACC15';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(birdX, birdY, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Eye & Beak
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(birdX + 4, birdY - 3, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(birdX + 5, birdY - 3, 1.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#F97316';
          ctx.beginPath();
          ctx.moveTo(birdX + 8, birdY);
          ctx.lineTo(birdX + 14, birdY + 3);
          ctx.lineTo(birdX + 8, birdY + 6);
          ctx.fill();
          break;
        }

        case 'snake': {
          // Isometric 3D Snake
          const cx = width / 2;
          const cy = height / 2;
          const points = 7;
          for (let i = points; i >= 0; i--) {
            const angle = t * 1.5 - i * 0.35;
            const radius = 35 + Math.sin(t + i) * 10;
            const sx = cx + Math.cos(angle) * radius;
            const sy = cy + Math.sin(angle) * (radius * 0.55);

            // 3D Isometric Cube block
            ctx.fillStyle = i === 0 ? '#4ADE80' : 'rgba(74, 222, 128, 0.7)';
            ctx.beginPath();
            ctx.arc(sx, sy, 7 - i * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Glowing food gem
          const foodX = cx + Math.sin(t * 0.8) * 45;
          const foodY = cy + Math.cos(t * 0.8) * 25;
          ctx.fillStyle = '#EF4444';
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 12;
          ctx.fillRect(foodX - 4, foodY - 4, 8, 8);
          ctx.shadowBlur = 0;
          break;
        }

        case 'invaders': {
          // 3D Angled Space Invaders
          const marchOffsetX = Math.sin(t * 2) * 25;
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 6; col++) {
              const ix = 40 + col * 34 + marchOffsetX;
              const iy = 24 + row * 24;
              ctx.fillStyle = row === 0 ? '#F43F5E' : row === 1 ? '#06B6D4' : '#10B981';
              ctx.shadowColor = ctx.fillStyle;
              ctx.shadowBlur = 6;
              // Pixel-style alien icon
              ctx.fillRect(ix, iy, 14, 10);
              ctx.fillStyle = '#08090E';
              ctx.fillRect(ix + 2, iy + 2, 3, 3);
              ctx.fillRect(ix + 9, iy + 2, 3, 3);
            }
          }
          ctx.shadowBlur = 0;

          // Defender tank at bottom
          const tankX = width * 0.5 + Math.sin(t * 2.5) * 40;
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(tankX - 12, height - 20, 24, 8);
          ctx.fillRect(tankX - 3, height - 26, 6, 6);

          // Laser blast
          const laserY = height - 28 - ((t * 180) % (height - 30));
          ctx.fillStyle = '#FACC15';
          ctx.fillRect(tankX - 1.5, laserY, 3, 10);
          break;
        }

        case 'asteroids': {
          // 3D Wireframe Asteroid rotation
          const cx = width / 2;
          const cy = height / 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 0.6);

          // Ship
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.lineTo(10, 14);
          ctx.lineTo(0, 8);
          ctx.lineTo(-10, 14);
          ctx.closePath();
          ctx.stroke();

          // Thrust flame
          if (Math.sin(t * 10) > 0) {
            ctx.strokeStyle = '#F97316';
            ctx.beginPath();
            ctx.moveTo(-5, 11);
            ctx.lineTo(0, 18);
            ctx.lineTo(5, 11);
            ctx.stroke();
          }

          ctx.restore();

          // Tumbling 3D Asteroid
          const astX = cx + Math.cos(t * 0.4) * 60;
          const astY = cy + Math.sin(t * 0.4) * 40;
          ctx.save();
          ctx.translate(astX, astY);
          ctx.rotate(t * 1.2);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const verts = 7;
          for (let v = 0; v < verts; v++) {
            const a = (v / verts) * Math.PI * 2;
            const rad = 14 + (v % 2 === 0 ? 5 : -4);
            const vx = Math.cos(a) * rad;
            const vy = Math.sin(a) * rad;
            if (v === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
          break;
        }

        case 'tetris': {
          // Isometric 3D blocks falling
          const cx = width / 2;
          const cy = height * 0.65;

          // Draw stacked foundation blocks with 3D top and right faces
          const drawIsoCube = (x: number, y: number, color: string) => {
            const sz = 12;
            // Top face
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x, y - sz);
            ctx.lineTo(x + sz * 1.2, y - sz * 0.5);
            ctx.lineTo(x, y);
            ctx.lineTo(x - sz * 1.2, y - sz * 0.5);
            ctx.closePath();
            ctx.fill();

            // Left face (darker)
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.moveTo(x - sz * 1.2, y - sz * 0.5);
            ctx.lineTo(x, y);
            ctx.lineTo(x, y + sz);
            ctx.lineTo(x - sz * 1.2, y + sz * 0.5);
            ctx.closePath();
            ctx.fill();

            // Right face (medium dark)
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + sz * 1.2, y - sz * 0.5);
            ctx.lineTo(x + sz * 1.2, y + sz * 0.5);
            ctx.lineTo(x, y + sz);
            ctx.closePath();
            ctx.fill();
          };

          drawIsoCube(cx - 24, cy, '#38BDF8');
          drawIsoCube(cx, cy, '#FACC15');
          drawIsoCube(cx + 24, cy, '#A855F7');
          drawIsoCube(cx - 12, cy - 14, '#10B981');
          drawIsoCube(cx + 12, cy - 14, '#F97316');

          // Falling piece
          const dropY = ((t * 40) % (cy - 30)) + 20;
          drawIsoCube(cx, dropY, '#EF4444');
          drawIsoCube(cx + 14, dropY - 7, '#EF4444');
          break;
        }

        default: {
          // Generic 2.5D dynamic particle field & emblem
          const cx = width / 2;
          const cy = height / 2;

          // Orbital rings
          ctx.strokeStyle = game.accentColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 50, 20, t * 0.5, 0, Math.PI * 2);
          ctx.stroke();

          // Central glowing crystal
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 0.8);
          ctx.fillStyle = game.accentColor;
          ctx.shadowColor = game.accentColor;
          ctx.shadowBlur = 14;
          ctx.fillRect(-12, -12, 24, 24);
          ctx.shadowBlur = 0;
          ctx.restore();

          // Floating dust motes
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          for (let p = 0; p < 8; p++) {
            const px = (cx + Math.cos(t + p * 1.3) * 65 + width) % width;
            const py = (cy + Math.sin(t * 1.2 + p * 0.9) * 45 + height) % height;
            ctx.fillRect(px, py, 2, 2);
          }
          break;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [game.previewType, game.accentColor, isHovered]);

  return (
    <div className={`relative overflow-hidden w-full h-full bg-[#090A10] ${className}`}>
      <canvas
        ref={canvasRef}
        width={320}
        height={180}
        className="w-full h-full object-cover block"
      />
    </div>
  );
};
