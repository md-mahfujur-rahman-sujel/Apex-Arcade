export type MotionDurationToken = 'fast' | 'base' | 'slow';

const tokenVariables: Record<MotionDurationToken, string> = {
  fast: '--apex-motion-fast',
  base: '--apex-motion-base',
  slow: '--apex-motion-slow',
};

const fallbackDurationsMs: Record<MotionDurationToken, number> = {
  fast: 120,
  base: 220,
  slow: 420,
};

export function getMotionDurationSeconds(token: MotionDurationToken): number {
  if (typeof window === 'undefined') return fallbackDurationsMs[token] / 1000;
  const value = getComputedStyle(document.documentElement).getPropertyValue(tokenVariables[token]).trim();
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallbackDurationsMs[token] / 1000;
  return value.endsWith('ms') ? parsed / 1000 : parsed;
}

export const motionEase = [0.2, 0, 0, 1] as const;
