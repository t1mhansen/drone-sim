import { useState, useCallback, useEffect } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { useFlightControls } from './hooks/useFlightControls';
import { WS_TELEMETRY_URL } from './config';
import TelemetryHUD from './components/TelemetryHUD';
import Scene3D from './components/Scene3D';
import FlightControls from './components/FlightControls';
import FaultInjection from './components/FaultInjection';
import DroneSelector from './components/DroneSelector';
import type { DroneProfile } from './types/drone';

type CameraMode = 'chase' | 'fpv' | 'orbit';
const CAMERA_MODES: CameraMode[] = ['chase', 'fpv', 'orbit'];

export default function App() {
    const { droneState, status, sendInput } = useTelemetry(WS_TELEMETRY_URL);
    const [droneProfile, setDroneProfile] = useState<DroneProfile | null>(null);
    const [cameraMode, setCameraMode] = useState<CameraMode>('chase');

    const isFixedWing = droneProfile?.type === 'fixed_wing';
    const { keysRef, throttleRef } = useFlightControls({ sendInput, isFixedWing });

    const handleDroneChanged = useCallback((_id: string, profile: DroneProfile) => {
        setDroneProfile(profile);
    }, []);

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
            <Scene3D state={droneState} droneProfile={droneProfile} cameraMode={cameraMode} />

            {/* telemetry HUD */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 999 }}>
                <TelemetryHUD state={droneState} status={status} cameraMode={cameraMode} />
            </div>

            {/* drone selector */}
            <div style={{ position: 'absolute', top: '80px', left: '16px', zIndex: 999 }}>
                <DroneSelector onDroneChanged={handleDroneChanged} />
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
                <FaultInjection />
            </div>

        </div>
    );
}
