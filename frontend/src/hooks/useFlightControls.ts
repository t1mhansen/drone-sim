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

// Smoothing: ramp toward target at this rate per tick (30Hz ticks)
const RAMP_UP = 0.15;    // how fast axis reaches target (per 33ms tick)
const RAMP_DOWN = 0.20;  // how fast axis returns to zero
const THROTTLE_RATE = 0.015; // throttle change per tick

function approach(current: number, target: number, rate: number): number {
    if (current < target) return Math.min(current + rate, target);
    if (current > target) return Math.max(current - rate, target);
    return current;
}

export function useFlightControls({ sendInput, isFixedWing }: FlightControlsOptions) {
    const keysRef = useRef<KeyState>({ ...defaultKeys });
    const throttleRef = useRef(0.5); // 0.5 = hover
    const smoothPitch = useRef(0.0);
    const smoothRoll = useRef(0.0);
    const smoothYaw = useRef(0.0);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't capture if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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

            // Throttle: cumulative
            if (keys.space) throttleRef.current = Math.min(1.0, throttleRef.current + THROTTLE_RATE);
            if (keys.shift) throttleRef.current = Math.max(0.0, throttleRef.current - THROTTLE_RATE);

            // Compute target axes from keys
            let targetPitch = 0;
            let targetRoll = 0;
            let targetYaw = 0;

            if (isFixedWing) {
                if (keys.w) targetPitch = 1.0;
                if (keys.s) targetPitch = -1.0;
                if (keys.a) targetYaw = -1.0;
                if (keys.d) targetYaw = 1.0;
            } else {
                if (keys.w) targetPitch = 1.0;
                if (keys.s) targetPitch = -1.0;
                if (keys.a) targetRoll = -1.0;
                if (keys.d) targetRoll = 1.0;
                if (keys.q) targetYaw = -1.0;
                if (keys.e) targetYaw = 1.0;
            }

            // Smooth ramp toward targets
            const rampRate = (t: number, current: number) =>
                Math.abs(t) > Math.abs(current) ? RAMP_UP : RAMP_DOWN;

            smoothPitch.current = approach(smoothPitch.current, targetPitch, rampRate(targetPitch, smoothPitch.current));
            smoothRoll.current = approach(smoothRoll.current, targetRoll, rampRate(targetRoll, smoothRoll.current));
            smoothYaw.current = approach(smoothYaw.current, targetYaw, rampRate(targetYaw, smoothYaw.current));

            sendInput({
                throttle: throttleRef.current,
                pitch: smoothPitch.current,
                roll: smoothRoll.current,
                yaw: smoothYaw.current,
            });
        }, 1000 / 30);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            clearInterval(interval);
        };
    }, [handleKeyDown, handleKeyUp, sendInput, isFixedWing]);

    return { keysRef, throttleRef };
}
