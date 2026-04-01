import { useState, useEffect } from 'react';
import type { KeyState } from '../hooks/useFlightControls';

interface Props {
    keysRef: React.RefObject<KeyState>;
    throttleRef: React.RefObject<number>;
    isFixedWing: boolean;
}

const keyStyle = (active: boolean): React.CSSProperties => ({
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${active ? '#00ff88' : '#444'}`,
    background: active ? 'rgba(0,255,136,0.2)' : 'rgba(0,0,0,0.5)',
    color: active ? '#00ff88' : '#888',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    transition: 'all 0.05s',
});

export default function FlightControls({ keysRef, throttleRef, isFixedWing }: Props) {
    const [, forceUpdate] = useState(0);

    // Re-render at 15Hz to show key state
    useEffect(() => {
        const interval = setInterval(() => forceUpdate(n => n + 1), 1000 / 15);
        return () => clearInterval(interval);
    }, []);

    const keys = keysRef.current;
    const throttle = throttleRef.current;

    return (
        <div style={{
            background: 'rgba(0,0,0,0.75)',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '12px',
            borderRadius: '8px',
            width: '200px',
        }}>
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>
                FLIGHT CONTROLS ({isFixedWing ? 'FIXED-WING' : 'ROTORCRAFT'})
            </div>

            {/* Key grid */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '3px' }}>
                    {!isFixedWing && <div style={{ width: '36px' }} />}
                    <div style={keyStyle(keys.w)}>W</div>
                    {!isFixedWing && <div style={{ width: '36px' }} />}
                </div>
                <div style={{ display: 'flex', gap: '3px' }}>
                    <div style={keyStyle(keys.a)}>A</div>
                    <div style={keyStyle(keys.s)}>S</div>
                    <div style={keyStyle(keys.d)}>D</div>
                </div>
                {!isFixedWing && (
                    <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                        <div style={keyStyle(keys.q)}>Q</div>
                        <div style={{ width: '36px' }} />
                        <div style={keyStyle(keys.e)}>E</div>
                    </div>
                )}
            </div>

            {/* Key labels */}
            <div style={{ color: '#666', fontSize: '10px', marginBottom: '10px', lineHeight: '1.4' }}>
                {isFixedWing ? (
                    <>W/S: Pitch | A/D: Yaw</>
                ) : (
                    <>W/S: Pitch | A/D: Roll | Q/E: Yaw</>
                )}
            </div>

            {/* Throttle bar */}
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>
                THROTTLE {(throttle * 100).toFixed(0)}%
            </div>
            <div style={{
                width: '100%', height: '12px',
                background: '#222', borderRadius: '3px',
                border: '1px solid #444',
                overflow: 'hidden',
                marginBottom: '6px',
            }}>
                <div style={{
                    width: `${throttle * 100}%`,
                    height: '100%',
                    background: throttle > 0.8 ? '#ff4444' : '#00ff88',
                    transition: 'width 0.05s',
                }} />
            </div>
            <div style={{ display: 'flex', gap: '3px' }}>
                <div style={keyStyle(keys.space)}>SPC</div>
                <div style={keyStyle(keys.shift)}>SHF</div>
                <div style={{ color: '#666', fontSize: '10px', alignSelf: 'center', marginLeft: '4px' }}>
                    Throttle +/-
                </div>
            </div>
        </div>
    );
}
