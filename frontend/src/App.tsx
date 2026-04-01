import { useState, useCallback } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { WS_TELEMETRY_URL } from './config';
import TelemetryHUD from './components/TelemetryHUD';
import Scene3D from './components/Scene3D';
import MissionPlanner from './components/MissionPlanner';
import FaultInjection from './components/FaultInjection';
import DroneSelector from './components/DroneSelector';
import type { DroneProfile } from './types/drone';

export default function App() {
    const { droneState, status } = useTelemetry(WS_TELEMETRY_URL);
    const [plannedPath, setPlannedPath] = useState<[number, number, number][]>([]);
    const [obstacles, setObstacles] = useState<[number, number, number][]>([]);
    const [droneProfile, setDroneProfile] = useState<DroneProfile | null>(null);

    const handleDroneChanged = useCallback((_id: string, profile: DroneProfile) => {
        setDroneProfile(profile);
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>

            {/* title */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', color: 'white', fontFamily: 'monospace', zIndex: 999 }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>DRONE-SIM</div>
                <div style={{ color: '#888', fontSize: '14px' }}>Autonomous Flight Simulator</div>
            </div>

            {/* 3D scene */}
            <Scene3D state={droneState} plannedPath={plannedPath} obstacles={obstacles} droneProfile={droneProfile} />

            {/* telemetry HUD */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 999 }}>
                <TelemetryHUD state={droneState} status={status} />
            </div>

            {/* drone selector */}
            <div style={{ position: 'absolute', top: '80px', left: '16px', zIndex: 999 }}>
                <DroneSelector onDroneChanged={handleDroneChanged} />
            </div>

            {/* mission planner */}
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 999 }}>
                <MissionPlanner onMissionPlanned={setPlannedPath} onObstaclesChanged={setObstacles} />
            </div>

            {/* fault injection */}
            <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 999 }}>
                <FaultInjection />
            </div>

        </div>
    );
}
