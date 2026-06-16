import { useState } from 'react';
import { getSimClient } from '../sim';
import { colors, MONO, panel, sectionLabel } from '../ui/theme';
import type { DroneProfile } from '../types/drone';

interface Props {
    droneProfile: DroneProfile | null;
    onRotorKilled?: (index: number) => void;
    onReset?: () => void;
}

const buttonBase: React.CSSProperties = {
    padding: '6px',
    background: '#3a0000',
    color: colors.red,
    border: `1px solid ${colors.red}`,
    borderRadius: '4px',
    fontFamily: MONO,
    cursor: 'pointer',
    fontSize: '12px',
};

export default function FaultInjection({ droneProfile, onRotorKilled, onReset }: Props) {
    const [status, setStatus] = useState('');

    const isFixedWing = droneProfile?.type === 'fixed_wing';
    const numRotors = droneProfile?.physics.num_rotors ?? 4;
    const noun = isFixedWing ? 'engine' : 'rotor';

    const killRotor = async (index: number) => {
        try {
            await getSimClient().killRotor(index);
            setStatus(`${noun[0].toUpperCase()}${noun.slice(1)} ${index} killed`);
            onRotorKilled?.(index);
        } catch {
            setStatus('Error connecting to server');
        }
    };

    const reset = async () => {
        try {
            await getSimClient().reset();
            setStatus('Reset to hover');
            onReset?.();
        } catch {
            setStatus('Error connecting to server');
        }
    };

    return (
        <div style={panel(colors.red, { width: '220px' })}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
                FAULT INJECTION
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div style={{ ...sectionLabel, marginBottom: '8px' }}>KILL {noun.toUpperCase()}</div>
                {isFixedWing ? (
                    <button onClick={() => killRotor(0)} style={{ ...buttonBase, width: '100%' }}>
                        KILL ENGINE
                    </button>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        {Array.from({ length: numRotors }, (_, i) => (
                            <button key={i} onClick={() => killRotor(i)} style={buttonBase}>
                                ROTOR {i}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={reset}
                style={{
                    width: '100%',
                    padding: '8px',
                    background: '#003a00',
                    color: colors.green,
                    border: `1px solid ${colors.green}`,
                    borderRadius: '4px',
                    fontFamily: MONO,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginBottom: '8px',
                }}
            >
                RESET
            </button>

            {status && (
                <div style={{ color: '#aaa', fontSize: '11px', marginTop: '4px' }}>
                    {status}
                </div>
            )}
        </div>
    );
}
