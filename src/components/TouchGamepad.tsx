import React, { useEffect, useRef, useState } from 'react';
import { TouchControlsConfig } from '../types/game';

type Direction = 'up' | 'down' | 'left' | 'right';
type FaceButton = 'A' | 'B' | 'X' | 'Y';

interface TouchGamepadProps {
  gameId: string;
  gameTitle: string;
  controls: TouchControlsConfig;
  onKey: (key: string, action: 'down' | 'up') => void;
  onPointer: (action: 'down' | 'up') => void;
  onCursorMove: (dx: number, dy: number) => void;
  onPause: () => void;
}

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];
const FACE_BUTTONS: FaceButton[] = ['A', 'B', 'X', 'Y'];
const BUTTON_COLORS: Record<FaceButton, string> = {
  A: 'bg-rose-500 text-white shadow-[inset_0_2px_2px_#ffffff55,0_3px_0_#7f1d1d]',
  B: 'bg-amber-400 text-slate-950 shadow-[inset_0_2px_2px_#ffffff99,0_3px_0_#92400e]',
  X: 'bg-sky-400 text-slate-950 shadow-[inset_0_2px_2px_#ffffff99,0_3px_0_#075985]',
  Y: 'bg-emerald-400 text-slate-950 shadow-[inset_0_2px_2px_#ffffff99,0_3px_0_#065f46]',
};

interface StickProps {
  label: string;
  onMove: (dx: number, dy: number) => void;
  onDirections?: (directions: Direction[]) => void;
}

function ThumbStick({ label, onMove, onDirections }: StickProps) {
  const pointerRef = useRef<number | null>(null);
  const lastRef = useRef({ x: 0, y: 0 });
  const directionRef = useRef<Direction[]>([]);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = Math.max(1, rect.width * 0.34);
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(x, y);
    const scale = distance > radius ? radius / distance : 1;
    const next = { x: x * scale, y: y * scale };
    setKnob(next);

    const dx = event.clientX - lastRef.current.x;
    const dy = event.clientY - lastRef.current.y;
    lastRef.current = { x: event.clientX, y: event.clientY };
    if (Math.abs(dx) + Math.abs(dy) > 0) onMove(dx, dy);

    if (onDirections) {
      const normalizedX = next.x / radius;
      const normalizedY = next.y / radius;
      const directions: Direction[] = [];
      if (normalizedX < -0.38) directions.push('left');
      if (normalizedX > 0.38) directions.push('right');
      if (normalizedY < -0.38) directions.push('up');
      if (normalizedY > 0.38) directions.push('down');
      if (directions.join(',') !== directionRef.current.join(',')) {
        onDirections(directions);
        directionRef.current = directions;
      }
    }
  };

  const end = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    directionRef.current = [];
    setKnob({ x: 0, y: 0 });
    onDirections?.([]);
  };

  return (
    <button
      type="button"
      aria-label={label}
      className="relative grid h-14 w-14 shrink-0 touch-none place-items-center rounded-full border border-white/25 bg-black/35 shadow-[inset_0_4px_10px_#0009,0_2px_5px_#0008] outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:brightness-125"
      onPointerDown={(event) => {
        event.preventDefault();
        pointerRef.current = event.pointerId;
        lastRef.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={update}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <span className="absolute inset-1 rounded-full border border-white/10" />
      <span
        aria-hidden="true"
        className="relative h-8 w-8 rounded-full border border-white/30 bg-gradient-to-br from-slate-500 to-slate-900 shadow-[inset_0_2px_4px_#ffffff55,0_3px_5px_#000b]"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </button>
  );
}

export const TouchGamepad: React.FC<TouchGamepadProps> = ({ gameId, gameTitle, controls, onKey, onPointer, onCursorMove, onPause }) => {
  const heldKeysRef = useRef(new Set<string>());
  const pointerHeldRef = useRef(false);
  const callbacksRef = useRef({ onKey, onPointer });
  callbacksRef.current = { onKey, onPointer };
  const actions = controls.actions || [];
  const actionButtons = actions.map((action, index) => ({ ...action, button: action.button || FACE_BUTTONS[index] }));
  const directions = controls.directions || {};

  const keyDown = (key?: string) => {
    if (!key || heldKeysRef.current.has(key)) return;
    heldKeysRef.current.add(key);
    onKey(key, 'down');
  };
  const keyUp = (key?: string) => {
    if (!key || !heldKeysRef.current.has(key)) return;
    heldKeysRef.current.delete(key);
    onKey(key, 'up');
  };

  useEffect(() => () => {
    heldKeysRef.current.forEach((key) => callbacksRef.current.onKey(key, 'up'));
    heldKeysRef.current.clear();
    if (pointerHeldRef.current) callbacksRef.current.onPointer('up');
  }, []);

  const pressDirection = (direction: Direction) => {
    keyDown(directions[direction]);
    if (controls.pointerCursor) {
      const deltas: Record<Direction, [number, number]> = { up: [0, -0.06], down: [0, 0.06], left: [-0.06, 0], right: [0.06, 0] };
      const [dx, dy] = deltas[direction];
      onCursorMove(dx * window.innerWidth, dy * window.innerHeight);
    }
  };

  const syncStickDirections = (next: Direction[]) => {
    DIRECTIONS.forEach((direction) => {
      if (next.includes(direction)) keyDown(directions[direction] || `Arrow${direction[0].toUpperCase()}${direction.slice(1)}`);
      else keyUp(directions[direction] || `Arrow${direction[0].toUpperCase()}${direction.slice(1)}`);
    });
  };

  const pressAction = (action: (typeof actionButtons)[number]) => {
    keyDown(action.key);
    if (action.pointer && !pointerHeldRef.current) {
      pointerHeldRef.current = true;
      onPointer('down');
    }
  };
  const releaseAction = (action: (typeof actionButtons)[number]) => {
    keyUp(action.key);
    if (action.pointer && pointerHeldRef.current) {
      pointerHeldRef.current = false;
      onPointer('up');
    }
  };

  const touchButton = 'pointer-events-auto touch-none select-none rounded-full border border-white/35 font-black transition-transform active:translate-y-0.5 active:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

  return (
    <div
      data-touch-controller
      data-touch-layout={gameId}
      aria-label={`${gameTitle} touch controller`}
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-between px-1 py-2 sm:px-2"
    >
      <section aria-label="Left controller grip" className="pointer-events-auto flex h-[min(72%,390px)] w-[clamp(4.25rem,19vw,6.5rem)] flex-col items-center justify-around rounded-[2rem] border border-sky-200/50 bg-gradient-to-br from-sky-400 via-sky-600 to-blue-950 px-1.5 py-2 shadow-[inset_2px_0_4px_#ffffff55,inset_-4px_0_8px_#02061799,0_12px_28px_#000b] sm:w-24 sm:rounded-[2.8rem]">
        <ThumbStick label="Left thumbstick: movement" onMove={() => {}} onDirections={syncStickDirections} />
        <div className="grid grid-cols-3 grid-rows-3 gap-0.5 rounded-xl bg-slate-950/40 p-1 shadow-inner">
          {(['up', 'left', 'down', 'right'] as Direction[]).map((direction) => {
            const spots: Record<Direction, string> = { up: 'col-start-2 row-start-1', left: 'col-start-1 row-start-2', down: 'col-start-2 row-start-3', right: 'col-start-3 row-start-2' };
            const glyphs: Record<Direction, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
            const key = directions[direction];
            return <button key={direction} type="button" aria-label={`${direction} control${key ? ` (${key === ' ' ? 'Space' : key})` : ''}`} className={`${touchButton} ${spots[direction]} grid h-7 w-7 place-items-center bg-slate-800/90 text-[10px] text-white shadow-[inset_0_1px_2px_#ffffff44,0_3px_0_#020617] sm:h-8 sm:w-8`} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pressDirection(direction); }} onPointerUp={() => keyUp(key)} onPointerCancel={() => keyUp(key)}>{glyphs[direction]}</button>;
          })}
        </div>
        <div className="flex w-full justify-center gap-2">
          <button type="button" aria-label="Select minus" className="pointer-events-auto h-5 min-w-7 rounded-full border border-white/25 bg-slate-900/80 px-1 text-[8px] font-bold text-white" onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); keyDown('Escape'); }} onPointerUp={() => keyUp('Escape')} onPointerCancel={() => keyUp('Escape')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); keyDown('Escape'); } }} onKeyUp={() => keyUp('Escape')}>−</button>
          <button type="button" aria-label="Home pause" className="pointer-events-auto grid h-6 w-6 place-items-center rounded-full border border-white/30 bg-slate-900/80 text-[9px] font-black text-white" onClick={onPause}>⌂</button>
        </div>
      </section>

      <section aria-label="Right controller grip" className="pointer-events-auto flex h-[min(72%,390px)] w-[clamp(4.25rem,19vw,6.5rem)] flex-col items-center justify-around rounded-[2rem] border border-rose-200/50 bg-gradient-to-bl from-rose-400 via-red-600 to-rose-950 px-1.5 py-2 shadow-[inset_-2px_0_4px_#ffffff55,inset_4px_0_8px_#02061799,0_12px_28px_#000b] sm:w-24 sm:rounded-[2.8rem]">
        <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
          {actionButtons.map((action) => {
            const button = (action.button || 'A') as FaceButton;
            const spots: Record<FaceButton, string> = { Y: 'col-start-2 row-start-1', X: 'col-start-1 row-start-2', B: 'col-start-3 row-start-2', A: 'col-start-2 row-start-3' };
            const accessible = action.key ? `${action.label} (${action.key === ' ' ? 'Space' : action.key})` : `${action.label} (${button})`;
            return <button key={`${button}-${action.label}`} type="button" data-touch-action={button} data-touch-pointer={action.pointer ? 'true' : 'false'} aria-label={accessible} title={action.label} className={`${touchButton} ${spots[button]} grid h-8 w-8 place-items-center text-xs ${BUTTON_COLORS[button]}`} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pressAction(action); }} onPointerUp={() => releaseAction(action)} onPointerCancel={() => releaseAction(action)}>{button}</button>;
          })}
        </div>
        {controls.pointerCursor && <ThumbStick label="Right thumbstick: move on-screen pointer" onMove={onCursorMove} />}
        <div className="flex w-full justify-center gap-2">
          <button type="button" aria-label="Select minus" className="pointer-events-auto h-5 min-w-7 rounded-full border border-white/25 bg-slate-900/80 px-1 text-[8px] font-bold text-white" onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); keyDown('Escape'); }} onPointerUp={() => keyUp('Escape')} onPointerCancel={() => keyUp('Escape')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); keyDown('Escape'); } }} onKeyUp={() => keyUp('Escape')}>−</button>
          <button type="button" aria-label="Start pause" className="pointer-events-auto min-h-6 rounded-full border border-white/30 bg-slate-900/80 px-2 text-[8px] font-black uppercase text-white" onClick={onPause}>Start</button>
        </div>
      </section>
    </div>
  );
};
