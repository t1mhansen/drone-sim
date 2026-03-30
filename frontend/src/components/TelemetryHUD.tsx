import type { DroneState } from '../types/drone';
interface Props {
    state: DroneState;
    connected: boolean;
}

export default function TelemetryHUD({ state, connected }: Props) {
    return (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-green-400 font-mono text-sm p-4 rounded-lg w-64">

            {/* connection status */}
            <div className="flex items-center gap-2 mb-3">
    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-500'}`} />
    <span>{connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
    </div>

    {/* position */}
    <div className="mb-2">
    <div className="text-gray-400 text-xs mb-1">POSITION (m)</div>
        <div>X: {state.x.toFixed(2)}</div>
    <div>Y: {state.y.toFixed(2)}</div>
    <div>Z: {state.z.toFixed(2)}</div>
    </div>

    {/* velocity */}
    <div className="mb-2">
    <div className="text-gray-400 text-xs mb-1">VELOCITY (m/s)</div>
        <div>VX: {state.vx.toFixed(2)}</div>
    <div>VY: {state.vy.toFixed(2)}</div>
    <div>VZ: {state.vz.toFixed(2)}</div>
    </div>

    {/* altitude highlight */}
    <div className="border-t border-green-800 pt-2 mt-2">
    <div className="text-gray-400 text-xs mb-1">ALTITUDE</div>
        <div className="text-xl font-bold">{state.z.toFixed(1)}m</div>
    </div>

    </div>
);
}