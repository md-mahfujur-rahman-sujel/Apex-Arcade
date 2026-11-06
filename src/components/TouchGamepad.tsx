import React, { useEffect, useRef } from 'react';
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

const FACE_BUTTONS: FaceButton[] = ['A', 'B', 'X', 'Y'];
const CURSOR_STEPS: Record<Direction, [number, number]> = {
  up: [0, -0.055],
  down: [0, 0.055],
  left: [-0.055, 0],
  right: [0.055, 0],
};
const FACE_SPOTS: Record<FaceButton, string> = {
  Y: 'col-start-2 row-start-1',
  X: 'col-start-1 row-start-2',
  B: 'col-start-3 row-start-2',
  A: 'col-start-2 row-start-3',
};
const KEY_LABELS: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: 'Enter',
  Backspace: 'Erase',
  Shift: 'Shift',
};
const STICK_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};
// Deflection below this fraction of full travel reads as centred, so a resting
// thumb never leaks a direction into the game.
const STICK_DEADZONE = 0.35;

export const TouchGamepad: React.FC<TouchGamepadProps> = ({ gameId, gameTitle, controls, onKey, onPointer, onCursorMove, onPause }) => {
  const heldKeysRef = useRef(new Set<string>());
  const pointerHeldRef = useRef(false);
  const repeatTimersRef = useRef(new Map<Direction, number>());
  const callbacksRef = useRef({ onKey, onPointer });
  callbacksRef.current = { onKey, onPointer };

  const capRef = useRef<HTMLSpanElement>(null);
  const stickRef = useRef<{ cx: number; cy: number; travel: number } | null>(null);
  const stickDirRef = useRef<Direction | null>(null);
  const magnitudeRef = useRef(1);

  const actions = controls.actions || [];
  const actionButtons = actions.map((action, index) => ({ ...action, button: action.button || FACE_BUTTONS[index] }));
  const directions = controls.directions || {};
  const showStick = Boolean(controls.pointerCursor) || Object.values(directions).some(Boolean);

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

  const stopCursorRepeat = (direction: Direction) => {
    const timer = repeatTimersRef.current.get(direction);
    if (timer !== undefined) window.clearInterval(timer);
    repeatTimersRef.current.delete(direction);
  };

  const moveCursor = (direction: Direction) => {
    const [dx, dy] = CURSOR_STEPS[direction];
    const scale = Math.min(1, Math.max(0.4, magnitudeRef.current));
    onCursorMove(dx * window.innerWidth * scale, dy * window.innerHeight * scale);
  };

  const pressDirection = (direction: Direction) => {
    keyDown(directions[direction]);
    if (controls.pointerCursor) {
      moveCursor(direction);
      if (!repeatTimersRef.current.has(direction)) {
        repeatTimersRef.current.set(direction, window.setInterval(() => moveCursor(direction), 75));
      }
    }
  };

  const releaseDirection = (direction: Direction) => {
    stopCursorRepeat(direction);
    keyUp(directions[direction]);
  };

  const setStickDirection = (direction: Direction | null) => {
    if (stickDirRef.current === direction) return;
    if (stickDirRef.current) releaseDirection(stickDirRef.current);
    stickDirRef.current = direction;
    if (direction) pressDirection(direction);
  };

  const stickMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const stick = stickRef.current;
    if (!stick) return;
    let dx = event.clientX - stick.cx;
    let dy = event.clientY - stick.cy;
    const len = Math.hypot(dx, dy);
    if (len > stick.travel) {
      dx = (dx / len) * stick.travel;
      dy = (dy / len) * stick.travel;
    }
    if (capRef.current) capRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    const norm = Math.min(1, len / stick.travel);
    magnitudeRef.current = norm;
    if (norm < STICK_DEADZONE) {
      setStickDirection(null);
      return;
    }
    setStickDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const stickDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!showStick) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    stickRef.current = { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, travel: rect.width * 0.24 };
    event.currentTarget.dataset.active = 'true';
    stickMove(event);
  };

  const stickUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!stickRef.current) return;
    stickRef.current = null;
    magnitudeRef.current = 1;
    event.currentTarget.dataset.active = 'false';
    if (capRef.current) capRef.current.style.transform = 'translate(0px, 0px)';
    setStickDirection(null);
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

  useEffect(() => () => {
    repeatTimersRef.current.forEach((timer) => window.clearInterval(timer));
    repeatTimersRef.current.clear();
    heldKeysRef.current.forEach((key) => callbacksRef.current.onKey(key, 'up'));
    heldKeysRef.current.clear();
    if (pointerHeldRef.current) callbacksRef.current.onPointer('up');
  }, []);

  const actionsByButton = new Map(actionButtons.map((action) => [action.button, action]));
  const faceSlots = FACE_BUTTONS.map((button) => ({ button, action: actionsByButton.get(button), spot: FACE_SPOTS[button] }));
  const stickLabel = controls.pointerCursor
    ? 'Analog stick — drag to move the pointer'
    : `Analog stick — drag to move (${Object.values(directions).filter(Boolean).map((k) => KEY_LABELS[k] || k).join(', ') || 'not mapped'})`;

  return (
    <div
      data-touch-controller
      data-touch-layout={gameId}
      aria-label={`${gameTitle} touch controls`}
      className="pointer-events-none relative z-30 mt-auto flex w-full justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="apex-pad pointer-events-auto">
        <button
          type="button"
          data-touch-stick="true"
          data-touch-cursor={controls.pointerCursor ? 'true' : 'false'}
          data-touch-dirs={Object.entries(directions).filter(([, key]) => key).map(([dir]) => dir).join(',')}
          aria-label={stickLabel}
          title={stickLabel}
          disabled={!showStick}
          className="apex-stick"
          onPointerDown={stickDown}
          onPointerMove={stickMove}
          onPointerUp={stickUp}
          onPointerCancel={stickUp}
          onLostPointerCapture={stickUp}
          onKeyDown={(event) => {
            const direction = STICK_KEYS[event.key];
            if (!direction || !showStick) return;
            event.preventDefault();
            magnitudeRef.current = 1;
            pressDirection(direction);
          }}
          onKeyUp={(event) => {
            const direction = STICK_KEYS[event.key];
            if (direction) releaseDirection(direction);
          }}
        >
          <span className="apex-stick-cap" ref={capRef} aria-hidden="true">
            <span className="apex-stick-ring" />
          </span>
        </button>

        <section aria-label="Console controls" className="apex-pad-center">
          <span className="apex-pad-brand" aria-hidden="true">APEX·ARCADE</span>
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <span className="apex-pad-led" />
            <span className="apex-pad-print">POWER</span>
          </span>
          <button
            type="button"
            data-touch-pause="true"
            aria-label="START — pause the game"
            title="Pause game"
            className="apex-pad-start"
            onClick={onPause}
          >
            <span className="apex-pad-print" aria-hidden="true">START</span>
            <span className="apex-pad-pill" aria-hidden="true" />
          </button>
        </section>

        <section aria-label={`${gameTitle} actions`} className="apex-pad-faceplate">
          {faceSlots.map(({ button, action, spot }) => (
            <button
              key={button}
              type="button"
              data-touch-action={button}
              data-touch-key={action?.key || ''}
              data-touch-pointer={action?.pointer ? 'true' : 'false'}
              aria-label={action ? `${action.label}${action.key ? ` (${KEY_LABELS[action.key] || action.key})` : ''}${action.pointer ? ' (tap or drag)' : ''}` : `${button} unused`}
              title={action?.label || `${button} unused`}
              disabled={!action}
              className={`apex-pad-face apex-pad-${button.toLowerCase()} ${spot}`}
              onPointerDown={(event) => {
                if (!action) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                pressAction(action);
              }}
              onPointerUp={() => action && releaseAction(action)}
              onPointerCancel={() => action && releaseAction(action)}
              onLostPointerCapture={() => action && releaseAction(action)}
              onKeyDown={(event) => {
                if (!action || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                pressAction(action);
              }}
              onKeyUp={() => action && releaseAction(action)}
            >
              <span className="apex-pad-letter" aria-hidden="true">{button}</span>
              {action && <span className="apex-pad-keyword" aria-hidden="true">{action.label}</span>}
            </button>
          ))}
        </section>
      </div>
    </div>
  );
};
