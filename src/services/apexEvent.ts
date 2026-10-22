import type { ApexEventMessage } from '../types/game';

const legacyEvents = new Set(['session_start', 'score', 'level_complete', 'achievement', 'session_end']);
const v2Events = new Set([...legacyEvents, 'mode_start', 'result', 'cosmetic_equip']);
const ID_KEYS = ['gameId', 'mode', 'achievementId'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampNumber(value: unknown, max: number, integer = false): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isInteger(value))) return null;
  return Math.min(max, Math.max(0, value));
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64;
}

export function normalizeApexEvent(value: unknown): ApexEventMessage | null {
  if (!isRecord(value) || value.type !== 'APEX_EVENT') return null;
  const version = value.v;
  if (version !== undefined && version !== 2) return null;
  if (!validId(value.gameId) || typeof value.eventType !== 'string') return null;
  const allowed = version === 2 ? v2Events : legacyEvents;
  if (!allowed.has(value.eventType)) return null;

  const normalized: ApexEventMessage = {
    type: 'APEX_EVENT',
    ...(version === 2 ? { v: 2 } : {}),
    gameId: value.gameId,
    eventType: value.eventType as ApexEventMessage['eventType'],
  };

  for (const key of ID_KEYS) {
    if (value[key] !== undefined) {
      if (!validId(value[key])) return null;
      if (key !== 'gameId') normalized[key] = value[key];
    }
  }

  if (value.difficulty !== undefined) {
    if (value.difficulty !== 'easy' && value.difficulty !== 'normal' && value.difficulty !== 'hard') return null;
    normalized.difficulty = value.difficulty;
  }
  if (value.seed !== undefined) {
    if (typeof value.seed !== 'number' || !Number.isSafeInteger(value.seed) || value.seed < 0) return null;
    normalized.seed = value.seed;
  }
  if (value.score !== undefined) {
    const score = clampNumber(value.score, 1e9);
    if (score === null) return null;
    normalized.score = score;
  }
  if (value.level !== undefined) {
    const level = clampNumber(value.level, 100_000, true);
    if (level === null) return null;
    normalized.level = level;
  }
  if (value.durationSec !== undefined) {
    const duration = clampNumber(value.durationSec, 86_400);
    if (duration === null) return null;
    normalized.durationSec = duration;
  }
  if (value.timestamp !== undefined) {
    if (typeof value.timestamp !== 'number' || !Number.isFinite(value.timestamp)) return null;
    normalized.timestamp = value.timestamp;
  }
  if (value.cosmetic !== undefined) {
    if (!isRecord(value.cosmetic) || !validId(value.cosmetic.slot) || !validId(value.cosmetic.id)) return null;
    normalized.cosmetic = { slot: value.cosmetic.slot, id: value.cosmetic.id };
  }
  if (value.result !== undefined) {
    if (!isRecord(value.result) || typeof value.result.win !== 'boolean') return null;
    const result: NonNullable<ApexEventMessage['result']> = { win: value.result.win };
    for (const key of ['score', 'best'] as const) {
      if (value.result[key] !== undefined) {
        const score = clampNumber(value.result[key], 1e9);
        if (score === null) return null;
        result[key] = score;
      }
    }
    if (value.result.stats !== undefined) {
      if (!isRecord(value.result.stats)) return null;
      result.stats = value.result.stats;
    }
    normalized.result = result;
  }
  return normalized;
}

export function createApexEventRateLimiter(limit = 20, windowMs = 1000): (now: number) => boolean {
  let windowStart = 0;
  let count = 0;
  return (now) => {
    if (!Number.isFinite(now)) return false;
    if (now - windowStart >= windowMs || now < windowStart) {
      windowStart = now;
      count = 0;
    }
    if (count >= limit) return false;
    count += 1;
    return true;
  };
}
