import { useState, useEffect, useRef, useCallback } from 'react';
import type { DroneState } from '../types/drone';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

const defaultState: DroneState = {
    x: 0, y: 0, z: 0,
    qx: 0, qy: 0, qz: 0, qw: 1,
    vx: 0, vy: 0, vz: 0,
    ax: 0, ay: 0, az: 0,
};

export function useTelemetry(url: string) {
    const [droneState, setDroneState] = useState<DroneState>(defaultState);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const wsRef = useRef<WebSocket | null>(null);
    const attemptRef = useRef(0);
    const disposedRef = useRef(false);

    const connect = useCallback(() => {
        if (disposedRef.current) return;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            attemptRef.current = 0;
            setStatus('connected');
        };

        ws.onmessage = (event) => {
            const data: DroneState = JSON.parse(event.data);
            setDroneState(data);
        };

        ws.onclose = () => {
            if (disposedRef.current) return;
            setStatus('reconnecting');
            const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 10000);
            attemptRef.current++;
            setTimeout(connect, delay);
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [url]);

    useEffect(() => {
        disposedRef.current = false;
        connect();

        return () => {
            disposedRef.current = true;
            if (wsRef.current) {
                wsRef.current.close();
            }
            setStatus('disconnected');
        };
    }, [connect]);

    return { droneState, status, connected: status === 'connected' };
}
