import React, { useState } from 'react';
import { RotateCcw, Settings, Upload } from 'lucide-react';
import { AppPreferences, DEFAULT_PREFERENCES } from '../services/preferencesService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const fieldClass = 'min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function SettingsPage({ preferences, onPreferencesChange, onExport, onImport, onResetProgress }: {
  preferences: AppPreferences;
  onPreferencesChange: (preferences: AppPreferences) => void;
  onExport: () => void;
  onImport: (raw: string) => boolean;
  onResetProgress: () => void;
}) {
  const [message, setMessage] = useState('');
  const update = (patch: Partial<AppPreferences>) => onPreferencesChange({ ...preferences, ...patch });
  const updateDisplay = (key: keyof AppPreferences['displayModes'], checked: boolean) => update({ displayModes: { ...preferences.displayModes, [key]: checked } });
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const accepted = onImport(await file.text());
    setMessage(accepted ? 'Save imported.' : 'That file is not a valid Apex Arcade save.');
    event.target.value = '';
  };

  return <main className="mx-auto min-h-[70vh] w-full max-w-4xl space-y-7 px-4 py-10 sm:px-6 lg:px-8" data-settings-page>
    <header><Settings className="h-8 w-8 text-accent" /><p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-accent">Preferences</p><h1 className="mt-2 text-4xl font-black text-fg">Settings</h1><p className="mt-2 text-fg-muted">Supported game settings inherit these defaults until you change them for a specific game.</p></header>
    <Card className="space-y-6 p-5 sm:p-7">
      <h2 className="text-lg font-bold text-fg">Appearance and access</h2>
      <label className="grid gap-2 text-sm font-medium text-fg sm:grid-cols-[1fr_16rem] sm:items-center">Theme<select className={fieldClass} value={preferences.theme} onChange={(event) => update({ theme: event.target.value as AppPreferences['theme'] })}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <label className="grid gap-2 text-sm font-medium text-fg sm:grid-cols-[1fr_16rem] sm:items-center">Colour-blind palette<select className={fieldClass} value={preferences.colourBlindPalette} onChange={(event) => update({ colourBlindPalette: event.target.value as AppPreferences['colourBlindPalette'] })}><option value="off">Off</option><option value="protan">Protan</option><option value="deutan">Deutan</option><option value="tritan">Tritan</option></select></label>
      <label className="flex min-h-11 items-center justify-between gap-4 text-sm font-medium text-fg">Reduce motion<input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => update({ reducedMotion: event.target.checked })} className="h-5 w-5 accent-cyan-500" /></label>
      <label className="grid gap-2 text-sm font-medium text-fg sm:grid-cols-[1fr_16rem] sm:items-center">Default particle level<select className={fieldClass} value={preferences.particleLevel} onChange={(event) => update({ particleLevel: event.target.value as AppPreferences['particleLevel'] })}><option value="lite">Lite</option><option value="standard">Standard</option><option value="ultra">Ultra</option></select></label>
    </Card>
    <Card className="space-y-6 p-5 sm:p-7">
      <h2 className="text-lg font-bold text-fg">Sound and display</h2>
      {(['musicVolume', 'sfxVolume'] as const).map((key) => <label key={key} className="block text-sm font-medium text-fg"><span className="mb-2 flex justify-between"><span>{key === 'musicVolume' ? 'Default music volume' : 'Default sound effects volume'}</span><span>{Math.round(preferences[key] * 100)}%</span></span><input className="w-full accent-cyan-500" type="range" min="0" max="1" step="0.05" value={preferences[key]} onChange={(event) => update({ [key]: Number(event.target.value) })} /></label>)}
      {([['crt', 'CRT effect'], ['pixelPerfect', 'Pixel-perfect scaling'], ['ambientGlow', 'Ambient glow']] as const).map(([key, title]) => <label key={key} className="flex min-h-11 items-center justify-between gap-4 text-sm font-medium text-fg">{title}<input type="checkbox" checked={preferences.displayModes[key]} onChange={(event) => updateDisplay(key, event.target.checked)} className="h-5 w-5 accent-cyan-500" /></label>)}
    </Card>
    <Card className="space-y-4 p-5 sm:p-7"><h2 className="text-lg font-bold text-fg">Your data</h2><p className="text-sm text-fg-muted">Export a local save, or import a save file from this device.</p><div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={onExport}>Export save</Button><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-sm font-semibold text-fg focus-within:ring-2 focus-within:ring-accent"><Upload className="h-4 w-4" />Import save<input type="file" accept="application/json,.json" onChange={handleImport} className="sr-only" /></label></div>{message && <p role="status" className="text-sm text-fg-muted">{message}</p>}<div className="border-t border-line pt-4"><p className="mb-3 text-sm text-fg-muted">Reset removes this device’s saved profile and game progress.</p><Button variant="secondary" onClick={() => { if (window.confirm('Reset all saved Apex Arcade progress on this device?')) onResetProgress(); }}><RotateCcw className="mr-2 h-4 w-4" />Reset progress</Button></div><Button variant="ghost" onClick={() => onPreferencesChange(DEFAULT_PREFERENCES)}>Reset preferences</Button></Card>
  </main>;
}
