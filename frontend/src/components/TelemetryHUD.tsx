import type { DroneState } from '../types/drone';
import type { ConnectionStatus } from '../hooks/useTelemetry';
import { colors, panel, sectionLabel } from '../ui/theme';

interface Props {
    state: DroneState;
    status: ConnectionStatus;
    cameraMode: string;
}

const statusConfig: Record<ConnectionStatus, { color: string; label: string }> = {
    connected: { color: colors.green, label: 'CONNECTED' },
    reconnecting: { color: colors.amber, label: 'RECONNECTING...' },
    disconnected: { color: colors.red, label: 'DISCONNECTED' },
};

function healthColor(health: number): string {
    return health > 60 ? colors.green : health > 30 ? colors.amber : colors.red;
}

export default function TelemetryHUD({ state, status, cameraMode }: Props) {
    const { color, label } = statusConfig[status];

    const speedMs = Math.sqrt(state.vx * state.vx + state.vy * state.vy + state.vz * state.vz);
    const speedKmh = speedMs * 3.6;
    const heading = ((Math.atan2(state.vy, state.vx) * 180 / Math.PI) + 360) % 360;
    const verticalSpeed = state.vz;
    const health = Math.max(0, Math.min(100, state.health));

    return (
        <div style={panel(colors.green, { fontSize: '14px', width: '220px' })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                <span style={{ color }}>{label}</span>
                <span style={{ color: colors.dim, fontSize: '11px', marginLeft: 'auto' }}>
                    CAM: {cameraMode.toUpperCase()}
                </span>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <div style={{ ...sectionLabel, display: 'flex', justifyContent: 'space-between' }}>
                    <span>INTEGRITY</span>
                    <span style={{ color: healthColor(health) }}>{health.toFixed(0)}%</span>
                </div>
                <div style={{ height: '8px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${health}%`, height: '100%', background: healthColor(health), transition: 'width 0.15s linear' }} />
                </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <div style={sectionLabel}>SPEED</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{speedMs.toFixed(1)} m/s</div>
                <div style={{ color: colors.label }}>{speedKmh.toFixed(0)} km/h</div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                <div>
                    <div style={sectionLabel}>HEADING</div>
                    <div>{heading.toFixed(0)}&deg;</div>
                </div>
                <div>
                    <div style={sectionLabel}>V/S</div>
                    <div style={{ color: verticalSpeed > 0.5 ? colors.green : verticalSpeed < -0.5 ? colors.red : colors.label }}>
                        {verticalSpeed > 0 ? '+' : ''}{verticalSpeed.toFixed(1)} m/s
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
                <div style={sectionLabel}>POSITION (m)</div>
                <div>X: {state.x.toFixed(1)} | Y: {state.y.toFixed(1)}</div>
            </div>

            <div style={{ borderTop: '1px solid #1a4a2a', paddingTop: '8px', marginTop: '8px' }}>
                <div style={sectionLabel}>ALTITUDE</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{state.z.toFixed(1)}m</div>
            </div>
        </div>
    );
}
