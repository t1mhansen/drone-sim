import { useTelemetry } from './hooks/useTelemetry';
import TelemetryHUD from './components/TelemetryHUD';

export default function App() {
    const { droneState, connected } = useTelemetry('ws://localhost:8000/ws/telemetry');

    return (
        <div className="w-screen h-screen bg-gray-900 relative">

            {/* title */}
            <div className="absolute top-4 left-4 text-white font-mono">
                <div className="text-xl font-bold">DRONE-SIM</div>
                <div className="text-gray-400 text-sm">Autonomous Flight Simulator</div>
            </div>

            {/* placeholder for 3D scene */}
            <div className="w-full h-full flex items-center justify-center text-gray-600 font-mono">
                3D Scene Coming Soon
            </div>

            {/* telemetry HUD overlay */}
            <TelemetryHUD state={droneState} connected={connected} />

        </div>
    );
}