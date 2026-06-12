/**
 * useInput.ts
 * -----------
 * Keyboard input system (Phase 1).
 *
 * Returns a *ref* (never state — input changes every frame and must not cause
 * React re-renders). Systems read `inputRef.current` inside `useFrame`.
 *
 * Bindings:
 *  - WASD + Arrow Keys ......... movement
 *  - Shift ..................... sprint
 *  - Ctrl or C ................. crouch (hold)
 *  - E ......................... interact   (used from Phase 6)
 *  - F ......................... flashlight (used from Phase 6)
 *  - B ......................... hold breath (used from Phase 4)
 *
 * Escape is deliberately NOT tracked here: pause / pointer-lock release is
 * handled by the browser's native pointer-lock Escape behaviour and the
 * PlayerCamera lock/unlock events (see PlayerCamera.tsx / App.tsx).
 */

import { useEffect, useRef } from 'react';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  crouch: boolean;
  interact: boolean;
  flashlight: boolean;
  holdBreath: boolean;
}

const createInitialState = (): InputState => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false,
  interact: false,
  flashlight: false,
  holdBreath: false,
});

/** Maps KeyboardEvent.code → InputState field. */
const KEY_BINDINGS: Record<string, keyof InputState> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  ControlLeft: 'crouch',
  ControlRight: 'crouch',
  KeyC: 'crouch',
  KeyE: 'interact',
  KeyF: 'flashlight',
  KeyB: 'holdBreath',
};

export function useInput() {
  const inputRef = useRef<InputState>(createInitialState());

  useEffect(() => {
    const input = inputRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      const action = KEY_BINDINGS[e.code];
      if (!action) return;
      // Prevent browser shortcuts (Ctrl+S, arrow scrolling, ...) while playing.
      e.preventDefault();
      input[action] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const action = KEY_BINDINGS[e.code];
      if (!action) return;
      input[action] = false;
    };

    /** If the tab/window loses focus mid-keypress, release everything. */
    const onBlur = () => {
      Object.assign(input, createInitialState());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return inputRef;
}
