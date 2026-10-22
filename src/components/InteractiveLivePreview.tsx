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

      // Keep previews on the same restrained dark canvas used by the hand-built scenes.
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0b0d16');
      bgGrad.addColorStop(1, '#08090f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // If hand-crafted scene exists in window.Scenes, render it scaled to preview viewport
      const sceneFn = window.Scenes?.S?.[game.gameNumber];
      if (sceneFn) {
        ctx.save();
        if (game.gameNumber === 5) {
          const sceneScale = Math.min(width / 300, height / 128);
          ctx.translate((width - 300 * sceneScale) / 2, (height - 128 * sceneScale) / 2);
          ctx.scale(sceneScale, sceneScale);
        } else {
          ctx.scale(width / 300, height / 128);
        }
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
          const bx = width * (0.12 + .76 * (Math.sin(t * 1.2) + 1) / 2);
          const by = height * (0.15 + .7 * (Math.sin(t * .83) + 1) / 2);
          ctx.fillStyle = 'rgba(255,255,255,.2)';
          for (let y = 8; y < height; y += 18) ctx.fillRect(width / 2 - 1, y, 2, 8);
          const paddle = (x: number, y: number) => { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 2, y + 2, 7, 38); ctx.fillStyle = game.accentColor; ctx.fillRect(x, y, 7, 38); ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.fillRect(x + 2, y + 4, 1.5, 29); };
          paddle(18, Math.max(8, Math.min(height - 46, by - 19 + Math.sin(t) * 6)));
          paddle(width - 25, Math.max(8, Math.min(height - 46, by - 19 + Math.cos(t * .9) * 6)));
          for (let i = 5; i > 0; i--) { ctx.globalAlpha = .07 * (6 - i); ctx.fillStyle = game.accentColor; ctx.beginPath(); ctx.arc(bx - i * 4, by - i * 2, 3, 0, Math.PI * 2); ctx.fill(); }
          ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
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
          const left = 42, top = 26, right = width - 42, bottom = height - 26;
          const perimeter = 2 * ((right - left) + (bottom - top));
          const pointAt = (d: number): [number, number] => { d = (d % perimeter + perimeter) % perimeter; if (d < right - left) return [left + d, top]; d -= right - left; if (d < bottom - top) return [right, top + d]; d -= bottom - top; if (d < right - left) return [right - d, bottom]; d -= right - left; return [left, bottom - d]; };
          ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.2; ctx.strokeRect(left, top, right - left, bottom - top); ctx.setLineDash([]);
          const head = (t * 75) % perimeter;
          const food = pointAt(perimeter * .69);
          ctx.fillStyle = 'rgba(248,113,113,.18)'; ctx.beginPath(); ctx.arc(food[0], food[1], 11, 0, Math.PI * 2); ctx.fill();
          ctx.font = '16px "Segoe UI Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🍎', food[0], food[1]);
          for (let i = 10; i >= 0; i--) { const [sx, sy] = pointAt(head - i * 8); ctx.globalAlpha = .55 + .45 * (1 - i / 11); ctx.fillStyle = i ? game.accentColor : '#d9f99d'; ctx.beginPath(); ctx.arc(sx, sy, i ? 5 : 6, 0, Math.PI * 2); ctx.fill(); }
          ctx.globalAlpha = 1;
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
          // Large neon playfield with a falling piece and animated double-line clear.
          const cols = 10;
          const rows = 7;
          const cell = Math.min(width * 0.064, height * 0.135);
          const boardW = cols * cell;
          const boardH = rows * cell;
          const bx = (width - boardW) / 2;
          const by = (height - boardH) / 2;
          const phase = t % 7;
          const smooth = (value: number) => {
            const v = Math.max(0, Math.min(1, value));
            return v * v * (3 - 2 * v);
          };
          const colors = ['#22D3EE', '#FACC15', '#C084FC', '#4ADE80', '#F87171', '#60A5FA'];
          const block = (x: number, y: number, color: string, alpha = 1) => {
            if (y < -1 || y >= rows) return;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.fillRect(bx + x * cell + 1, by + y * cell + 1, cell - 2, cell - 2);
            ctx.fillStyle = 'rgba(255,255,255,.28)';
            ctx.fillRect(bx + x * cell + 2, by + y * cell + 2, cell - 4, Math.max(2, cell * .12));
            ctx.globalAlpha = 1;
          };

          ctx.save();
          ctx.shadowColor = '#8B5CF6';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = 'rgba(167,139,250,.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(bx - 5, by - 5, boardW + 10, boardH + 10);
          ctx.restore();
          ctx.fillStyle = 'rgba(4,7,16,.88)';
          ctx.fillRect(bx, by, boardW, boardH);
          ctx.strokeStyle = 'rgba(148,163,184,.18)';
          ctx.lineWidth = 1;
          for (let x = 0; x <= cols; x++) {
            ctx.beginPath(); ctx.moveTo(bx + x * cell, by); ctx.lineTo(bx + x * cell, by + boardH); ctx.stroke();
          }
          for (let y = 0; y <= rows; y++) {
            ctx.beginPath(); ctx.moveTo(bx, by + y * cell); ctx.lineTo(bx + boardW, by + y * cell); ctx.stroke();
          }

          const upperCells = [0, 1, 2, 7, 8, 9];
          const lowerCells = [0, 1, 2, 3, 6, 7, 8, 9];
          const cleared = phase >= 4.05;
          if (!cleared) {
            upperCells.forEach((x, i) => block(x, 4, colors[(i + 2) % colors.length]));
            for (let y = 5; y <= 6; y++) lowerCells.forEach((x, i) => block(x, y, colors[(i + y) % colors.length]));
          } else {
            const settle = smooth((phase - 4.05) / .48);
            upperCells.forEach((x, i) => block(x, 4 + settle * 2, colors[(i + 2) % colors.length]));
          }

          if (phase < 4.05) {
            const fallingY = -1.5 + smooth(phase / 3.35) * 5.5;
            for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) block(4 + x, 5 + y, '#FACC15', .16);
            for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) block(4 + x, fallingY + y, '#FACC15');
          } else if (phase < 4.52) {
            const flash = .28 + .72 * (Math.floor(phase * 20) % 2);
            for (let y = 5; y <= 6; y++) for (let x = 0; x < cols; x++) block(x, y, '#FFFFFF', flash);
          } else {
            const fallingY = -1.3 + smooth((phase - 4.52) / 2.05) * 3.6;
            [[1, 0], [0, 1], [1, 1], [2, 1]].forEach(([x, y]) => block(2 + x, fallingY + y, '#22D3EE'));
          }
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
    <div className={`relative overflow-hidden w-full h-full bg-stage ${className}`}>
      <canvas
        ref={canvasRef}
        width={320}
        height={180}
        className="w-full h-full object-cover block"
      />
    </div>
  );
};
