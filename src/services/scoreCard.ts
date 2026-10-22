import { GameInfo } from '../types/game';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

export function createScoreCard(game: GameInfo, score: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Canvas is unavailable'));

  const background = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, '#08090e');
  background.addColorStop(0.58, '#11182a');
  background.addColorStop(1, '#20133a');
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow = context.createRadialGradient(980, 120, 12, 980, 120, 480);
  glow.addColorStop(0, `${game.accentColor}66`);
  glow.addColorStop(1, `${game.accentColor}00`);
  context.fillStyle = glow;
  context.fillRect(560, 0, 640, 520);

  context.strokeStyle = `${game.accentColor}88`;
  context.lineWidth = 3;
  context.strokeRect(36, 36, CARD_WIDTH - 72, CARD_HEIGHT - 72);

  context.fillStyle = '#a5f3fc';
  context.font = '700 24px system-ui, sans-serif';
  context.letterSpacing = '6px';
  context.fillText('APEX ARCADE  /  SCORE REPORT', 82, 112);

  context.fillStyle = '#ffffff';
  context.font = '800 72px system-ui, sans-serif';
  context.letterSpacing = '0px';
  context.fillText(game.title, 82, 222, 1020);

  context.fillStyle = game.accentColor;
  context.font = '800 128px system-ui, sans-serif';
  context.fillText(Math.max(0, Math.floor(score)).toLocaleString(), 82, 410, 900);

  context.fillStyle = '#94a3b8';
  context.font = '600 28px system-ui, sans-serif';
  context.fillText(`GAME ${String(game.gameNumber).padStart(2, '0')}  ·  ${game.genre.toUpperCase()}`, 86, 472);

  context.fillStyle = '#e2e8f0';
  context.font = '600 24px system-ui, sans-serif';
  context.fillText('Can you beat my score?', 82, 550);
  context.fillStyle = '#67e8f9';
  context.textAlign = 'right';
  context.fillText('PLAY APEX ARCADE', CARD_WIDTH - 82, 550);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not render score card')), 'image/png');
  });
}

export async function shareOrDownloadScoreCard(game: GameInfo, score: number): Promise<'shared' | 'downloaded'> {
  const blob = await createScoreCard(game, score);
  const filename = `apex-arcade-${game.id}-score.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    const shareUrl = new URL(window.location.href);
    shareUrl.hash = `game=${encodeURIComponent(game.id)}`;
    await navigator.share({ title: `${game.title} score`, text: `I scored ${Math.floor(score).toLocaleString()} in ${game.title}. Can you beat it?`, url: shareUrl.toString(), files: [file] });
    return 'shared';
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return 'downloaded';
}
