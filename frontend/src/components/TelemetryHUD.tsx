import type { DroneState } from '../types/drone';
import type { ConnectionStatus } from '../hooks/useTelemetry';

interface Props {
    state: DroneState;
    status: ConnectionStatus;
}

const statusConfig = {
    connected: { color: '#00ff88', label: 'CONNECTED' },
    reconnecting: { color: '#ffaa00', label: 'RECONNECTING...' },
    disconnected: { color: '#ef4444', label: 'DISCONNECTED' },
};

export default function TelemetryHUD({ state, status }: Props) {
    const { color, label } = statusConfig[status];

    return (
        <div style={{
            background: 'rgba(0,0,0,0.75)',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: '14px',
            padding: '16px',
            borderRadius: '8px',
            width: '220px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                <span style={{ color }}>{label}</span>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>POSITION (m)</div>
                <div>X: {state.x.toFixed(2)}</div>
                <div>Y: {state.y.toFixed(2)}</div>
                <div>Z: {state.z.toFixed(2)}</div>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>VELOCITY (m/s)</div>
                <div>VX: {state.vx.toFixed(2)}</div>
                <div>VY: {state.vy.toFixed(2)}</div>
                <div>VZ: {state.vz.toFixed(2)}</div>
            </div>

            <div style={{ borderTop: '1px solid #1a4a2a', paddingTop: '8px', marginTop: '8px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>ALTITUDE</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{state.z.toFixed(1)}m</div>
            </div>
        </div>
    );
}
