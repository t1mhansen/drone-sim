import type { DroneState } from '../types/drone';
import type { ConnectionStatus } from '../hooks/useTelemetry';

interface Props {
    state: DroneState;
    status: ConnectionStatus;
    cameraMode: string;
}

const statusConfig = {
    connected: { color: '#00ff88', label: 'CONNECTED' },
    reconnecting: { color: '#ffaa00', label: 'RECONNECTING...' },
    disconnected: { color: '#ef4444', label: 'DISCONNECTED' },
};

export default function TelemetryHUD({ state, status, cameraMode }: Props) {
    const { color, label } = statusConfig[status];

    const speedMs = Math.sqrt(state.vx * state.vx + state.vy * state.vy + state.vz * state.vz);
    const speedKmh = speedMs * 3.6;
    const heading = ((Math.atan2(state.vy, state.vx) * 180 / Math.PI) + 360) % 360;
    const verticalSpeed = state.vz;

    const health = Math.max(0, Math.min(100, state.health));
    const healthColor = health > 60 ? '#00ff88' : health > 30 ? '#ffaa00' : '#ff4444';

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
                <span style={{ color: '#666', fontSize: '11px', marginLeft: 'auto' }}>
                    CAM: {cameraMode.toUpperCase()}
                </span>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '11px', marginBottom: '4px' }}>
                    <span>INTEGRITY</span>
                    <span style={{ color: healthColor }}>{health.toFixed(0)}%</span>
                </div>
                <div style={{ height: '8px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${health}%`, height: '100%', background: healthColor, transition: 'width 0.15s linear' }} />
                </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>SPEED</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{speedMs.toFixed(1)} m/s</div>
                <div style={{ color: '#888' }}>{speedKmh.toFixed(0)} km/h</div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                <div>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>HEADING</div>
                    <div>{heading.toFixed(0)}&deg;</div>
                </div>
                <div>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>V/S</div>
                    <div style={{ color: verticalSpeed > 0.5 ? '#00ff88' : verticalSpeed < -0.5 ? '#ff4444' : '#888' }}>
                        {verticalSpeed > 0 ? '+' : ''}{verticalSpeed.toFixed(1)} m/s
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>POSITION (m)</div>
                <div>X: {state.x.toFixed(1)} | Y: {state.y.toFixed(1)}</div>
            </div>

            <div style={{ borderTop: '1px solid #1a4a2a', paddingTop: '8px', marginTop: '8px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>ALTITUDE</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{state.z.toFixed(1)}m</div>
            </div>
        </div>
    );
}
