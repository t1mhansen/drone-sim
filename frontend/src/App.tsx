import { useState, useCallback, useEffect, useRef } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { useFlightControls } from './hooks/useFlightControls';
import { useAudioEngine } from './hooks/useAudioEngine';
import { WS_TELEMETRY_URL } from './config';
import TelemetryHUD from './components/TelemetryHUD';
import Scene3D from './components/Scene3D';
import FlightControls from './components/FlightControls';
import FaultInjection from './components/FaultInjection';
import DroneSelector from './components/DroneSelector';
import Minimap from './components/Minimap';
import type { DroneProfile } from './types/drone';

type CameraMode = 'chase' | 'fpv' | 'orbit';
const CAMERA_MODES: CameraMode[] = ['chase', 'fpv', 'orbit'];

export default function App() {
    const { droneState, status, sendInput } = useTelemetry(WS_TELEMETRY_URL);
    const [droneProfile, setDroneProfile] = useState<DroneProfile | null>(null);
    const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
    const [killedRotors, setKilledRotors] = useState<Set<number>>(new Set());
    const { updateEngineSound, playCollisionSound } = useAudioEngine();

    const isFixedWing = droneProfile?.type === 'fixed_wing';
    const { keysRef, throttleRef } = useFlightControls({ sendInput, isFixedWing });

    // Update engine sound with throttle at 15Hz
    const throttleForSound = useRef(0.5);
    useEffect(() => {
        const interval = setInterval(() => {
            throttleForSound.current = throttleRef.current;
            updateEngineSound(throttleForSound.current);
        }, 1000 / 15);
        return () => clearInterval(interval);
    }, [throttleRef, updateEngineSound]);

    const handleDroneChanged = useCallback((_id: string, profile: DroneProfile) => {
        setDroneProfile(profile);
        setKilledRotors(new Set());
    }, []);

    const handleRotorKilled = useCallback((index: number) => {
        setKilledRotors(prev => new Set(prev).add(index));
    }, []);

    const handleReset = useCallback(() => {
        setKilledRotors(new Set());
    }, []);

    const handleCollision = useCallback(() => {
        playCollisionSound();
    }, [playCollisionSound]);

    // C key to cycle camera
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'c') {
                setCameraMode(prev => {
                    const idx = CAMERA_MODES.indexOf(prev);
                    return CAMERA_MODES[(idx + 1) % CAMERA_MODES.length];
                });
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>

            {/* title */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', color: 'white', fontFamily: 'monospace', zIndex: 999 }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>DRONE-SIM</div>
                <div style={{ color: '#888', fontSize: '14px' }}>Military Flight Simulator</div>
            </div>

            {/* 3D scene */}
            <Scene3D
                state={droneState}
                droneProfile={droneProfile}
                cameraMode={cameraMode}
                killedRotors={killedRotors}
                onCollision={handleCollision}
            />

            {/* telemetry HUD */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 999 }}>
                <TelemetryHUD state={droneState} status={status} cameraMode={cameraMode} />
            </div>

            {/* drone selector */}
            <div style={{ position: 'absolute', top: '80px', left: '16px', zIndex: 999 }}>
                <DroneSelector onDroneChanged={handleDroneChanged} />
            </div>

            {/* minimap */}
            <div style={{ position: 'absolute', top: '16px', right: '252px', zIndex: 999 }}>
                <Minimap state={droneState} />
            </div>

            {/* flight controls HUD */}
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 999 }}>
                <FlightControls keysRef={keysRef} throttleRef={throttleRef} isFixedWing={isFixedWing} />
            </div>

            {/* camera mode hint */}
            <div style={{
                position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                color: '#666', fontFamily: 'monospace', fontSize: '12px', zIndex: 999,
            }}>
                Press C to cycle camera: {cameraMode.toUpperCase()}
            </div>

            {/* fault injection */}
            <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 999 }}>
                <FaultInjection onRotorKilled={handleRotorKilled} onReset={handleReset} />
            </div>

        </div>
    );
}
