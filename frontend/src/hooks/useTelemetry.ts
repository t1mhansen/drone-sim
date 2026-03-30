import { useState, useEffect } from 'react';
import type { DroneState } from '../types/drone';

// default state - drone at origin, level, not moving
const defaultState: DroneState = {
    x: 0, y: 0, z: 0,
    qx: 0, qy: 0, qz: 0, qw: 1,
    vx: 0, vy: 0, vz: 0,
    ax: 0, ay: 0, az: 0,
};

export function useTelemetry(url: string) {
    // current drone state
    const [droneState, setDroneState] = useState<DroneState>(defaultState);
    // connection status
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // open WebSocket connection to FastAPI
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('Telemetry connected');
            setConnected(true);
        };

        ws.onmessage = (event) => {
            // parse incoming JSON and update drone state
            const data: DroneState = JSON.parse(event.data);
            setDroneState(data);
        };

        ws.onclose = () => {
            console.log('Telemetry disconnected');
            setConnected(false);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        // cleanup - close WebSocket when component unmounts
        return () => ws.close();
    }, [url]);

    return { droneState, connected };
}