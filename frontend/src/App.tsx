import { useTelemetry } from './hooks/useTelemetry';
import TelemetryHUD from './components/TelemetryHUD';
import Scene3D from './components/Scene3D';

export default function App() {
    const { droneState, connected } = useTelemetry('ws://localhost:8000/ws/telemetry');

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>

            {/* title */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', color: 'white', fontFamily: 'monospace', zIndex: 999 }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>DRONE-SIM</div>
                <div style={{ color: '#888', fontSize: '14px' }}>Autonomous Flight Simulator</div>
            </div>

            {/* 3D scene */}
            <Scene3D state={droneState} />

            {/* telemetry HUD */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 999 }}>
                <TelemetryHUD state={droneState} connected={connected} />
            </div>

        </div>
    );
}