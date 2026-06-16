import { useState, useEffect, useRef, useCallback } from 'react';
import type { DroneState, FlightInput, WorldEvent, SceneEffect } from '../types/drone';
import { getSimClient } from '../sim';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

const defaultState: DroneState = {
    x: 0, y: 0, z: 0,
    qx: 0, qy: 0, qz: 0, qw: 1,
    vx: 0, vy: 0, vz: 0,
    ax: 0, ay: 0, az: 0,
    health: 100,
};

interface Options {
    // Fired for every destruction event (audio cues, HUD reactions, etc.).
    onEvent?: (event: WorldEvent) => void;
}

// Subscribes to the active SimClient (remote backend or in-browser WASM) and
// exposes drone state, destroyed-building set, and a queue of explosion effects.
export function useTelemetry({ onEvent }: Options = {}) {
    const [droneState, setDroneState] = useState<DroneState>(defaultState);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [destroyedBuildings, setDestroyedBuildings] = useState<Set<number>>(new Set());

    const effectsRef = useRef<SceneEffect[]>([]);
    const effectIdRef = useRef(0);
    const onEventRef = useRef(onEvent);
    useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

    const drainEffects = useCallback((): SceneEffect[] => {
        if (effectsRef.current.length === 0) return [];
        const drained = effectsRef.current;
        effectsRef.current = [];
        return drained;
    }, []);

    useEffect(() => {
        const client = getSimClient();
        client.start({
            onStatus: setStatus,
            onState: setDroneState,
            onEvent: (evt: WorldEvent) => {
                if (evt.event === 'building_destroyed') {
                    setDestroyedBuildings(prev => {
                        const next = new Set(prev);
                        next.add(evt.index);
                        return next;
                    });
                    effectsRef.current.push({ id: effectIdRef.current++, kind: 'building', x: evt.x, y: evt.y, z: evt.z });
                } else if (evt.event === 'drone_destroyed') {
                    effectsRef.current.push({ id: effectIdRef.current++, kind: 'drone', x: evt.x, y: evt.y, z: evt.z });
                } else if (evt.event === 'world_reset') {
                    setDestroyedBuildings(new Set());
                }
                onEventRef.current?.(evt);
            },
        });
        return () => client.stop();
    }, []);

    const sendInput = useCallback((input: FlightInput) => {
        getSimClient().sendFlightInput(input);
    }, []);

    return {
        droneState,
        status,
        connected: status === 'connected',
        sendInput,
        destroyedBuildings,
        drainEffects,
    };
}
