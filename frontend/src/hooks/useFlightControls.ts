import { useEffect, useRef, useCallback } from 'react';
import type { FlightInput } from '../types/drone';

interface FlightControlsOptions {
    sendInput: (input: FlightInput) => void;
    isFixedWing: boolean;
}

export interface KeyState {
    w: boolean;
    s: boolean;
    a: boolean;
    d: boolean;
    q: boolean;
    e: boolean;
    space: boolean;
    shift: boolean;
}

const defaultKeys: KeyState = {
    w: false, s: false, a: false, d: false,
    q: false, e: false, space: false, shift: false,
};

export function useFlightControls({ sendInput, isFixedWing }: FlightControlsOptions) {
    const keysRef = useRef<KeyState>({ ...defaultKeys });
    const throttleRef = useRef(0.0);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'w') keysRef.current.w = true;
        else if (key === 's') keysRef.current.s = true;
        else if (key === 'a') keysRef.current.a = true;
        else if (key === 'd') keysRef.current.d = true;
        else if (key === 'q') keysRef.current.q = true;
        else if (key === 'e') keysRef.current.e = true;
        else if (key === ' ') { keysRef.current.space = true; e.preventDefault(); }
        else if (key === 'shift') keysRef.current.shift = true;
    }, []);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'w') keysRef.current.w = false;
        else if (key === 's') keysRef.current.s = false;
        else if (key === 'a') keysRef.current.a = false;
        else if (key === 'd') keysRef.current.d = false;
        else if (key === 'q') keysRef.current.q = false;
        else if (key === 'e') keysRef.current.e = false;
        else if (key === ' ') keysRef.current.space = false;
        else if (key === 'shift') keysRef.current.shift = false;
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const interval = setInterval(() => {
            const keys = keysRef.current;

            // Throttle: cumulative, Space increases, Shift decreases
            if (keys.space) throttleRef.current = Math.min(1.0, throttleRef.current + 0.02);
            if (keys.shift) throttleRef.current = Math.max(0.0, throttleRef.current - 0.02);

            // Momentary axes
            let pitch = 0;
            let roll = 0;
            let yaw = 0;

            if (isFixedWing) {
                // Fixed-wing: W=pitch up, S=pitch down, A=yaw left, D=yaw right
                if (keys.w) pitch = 1.0;
                if (keys.s) pitch = -1.0;
                if (keys.a) yaw = -1.0;
                if (keys.d) yaw = 1.0;
            } else {
                // Rotorcraft: W=pitch forward, S=pitch back, A=roll left, D=roll right, Q=yaw left, E=yaw right
                if (keys.w) pitch = 1.0;
                if (keys.s) pitch = -1.0;
                if (keys.a) roll = -1.0;
                if (keys.d) roll = 1.0;
                if (keys.q) yaw = -1.0;
                if (keys.e) yaw = 1.0;
            }

            sendInput({
                throttle: throttleRef.current,
                pitch,
                roll,
                yaw,
            });
        }, 1000 / 30); // 30Hz

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            clearInterval(interval);
        };
    }, [handleKeyDown, handleKeyUp, sendInput, isFixedWing]);

    return { keysRef, throttleRef };
}
