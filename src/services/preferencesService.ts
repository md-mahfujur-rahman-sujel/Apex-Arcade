export type ThemePreference = 'system' | 'light' | 'dark';
export type ColourBlindPalette = 'off' | 'protan' | 'deutan' | 'tritan';
export type ParticleLevel = 'lite' | 'standard' | 'ultra';

export interface AppPreferences {
  theme: ThemePreference;
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  colourBlindPalette: ColourBlindPalette;
  particleLevel: ParticleLevel;
  displayModes: { crt: boolean; pixelPerfect: boolean; ambientGlow: boolean };
}

const STORAGE_KEY = 'apex:preferences:v1';
export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'system', musicVolume: 0.8, sfxVolume: 0.8, reducedMotion: false,
  colourBlindPalette: 'off', particleLevel: 'standard',
  displayModes: { crt: false, pixelPerfect: false, ambientGlow: false },
};

function normalizePreferences(value: Partial<AppPreferences> | null): AppPreferences {
  const displayModes = value?.displayModes;
  const palette: ColourBlindPalette = ['off', 'protan', 'deutan', 'tritan'].includes(String(value?.colourBlindPalette))
    ? value!.colourBlindPalette as ColourBlindPalette : 'off';
  const particles: ParticleLevel = ['lite', 'standard', 'ultra'].includes(String(value?.particleLevel))
    ? value!.particleLevel as ParticleLevel : 'standard';
  return {
    ...DEFAULT_PREFERENCES,
    ...value,
    theme: value?.theme === 'light' || value?.theme === 'dark' ? value.theme : 'system',
    musicVolume: typeof value?.musicVolume === 'number' ? Math.max(0, Math.min(1, value.musicVolume)) : DEFAULT_PREFERENCES.musicVolume,
    sfxVolume: typeof value?.sfxVolume === 'number' ? Math.max(0, Math.min(1, value.sfxVolume)) : DEFAULT_PREFERENCES.sfxVolume,
    reducedMotion: value?.reducedMotion === true,
    colourBlindPalette: palette,
    particleLevel: particles,
    displayModes: {
      crt: displayModes?.crt === true,
      pixelPerfect: displayModes?.pixelPerfect === true,
      ambientGlow: displayModes?.ambientGlow === true,
    },
  };
}

export function getAppPreferences(): AppPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizePreferences(JSON.parse(raw) as Partial<AppPreferences>);
    const legacyTheme = window.localStorage.getItem('apex-arcade-theme');
    return normalizePreferences({ theme: legacyTheme as ThemePreference });
  } catch { return DEFAULT_PREFERENCES; }
}

export function saveAppPreferences(value: AppPreferences): AppPreferences {
  const normalized = normalizePreferences(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.localStorage.setItem('apex-arcade-theme', normalized.theme);
  } catch { /* Apply preferences for this session when storage is unavailable. */ }
  window.dispatchEvent(new CustomEvent('apex:preferences-changed', { detail: normalized }));
  return normalized;
}
