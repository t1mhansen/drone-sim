import { useState } from 'react';
import { API_BASE_URL } from '../config';

interface Props {
    onRotorKilled?: (index: number) => void;
    onReset?: () => void;
}

export default function FaultInjection({ onRotorKilled, onReset }: Props) {
    const [status, setStatus] = useState<string>('');

    const killRotor = async (index: number) => {
        try {
            await fetch(`${API_BASE_URL}/fault/kill_rotor/${index}`, {
                method: 'POST'
            });
            setStatus(`Rotor ${index} killed`);
            onRotorKilled?.(index);
        } catch (e) {
            setStatus('Error connecting to server');
        }
    };

    const reset = async () => {
        try {
            await fetch(`${API_BASE_URL}/fault/reset`, {
                method: 'POST'
            });
            setStatus('Rotors reset to hover');
            onReset?.();
        } catch (e) {
            setStatus('Error connecting to server');
        }
    };

    return (
        <div style={{
            background: 'rgba(0,0,0,0.75)',
            color: '#ff4444',
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '16px',
            borderRadius: '8px',
            width: '220px'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
                FAULT INJECTION
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>KILL ROTOR</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    {[0, 1, 2, 3].map(i => (
                        <button
                            key={i}
                            onClick={() => killRotor(i)}
                            style={{
                                padding: '6px',
                                background: '#3a0000',
                                color: '#ff4444',
                                border: '1px solid #ff4444',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            ROTOR {i}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={reset}
                style={{
                    width: '100%',
                    padding: '8px',
                    background: '#003a00',
                    color: '#00ff88',
                    border: '1px solid #00ff88',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginBottom: '8px'
                }}
            >
                RESET ALL ROTORS
            </button>

            {status && (
                <div style={{ color: '#aaa', fontSize: '11px', marginTop: '4px' }}>
                    {status}
                </div>
            )}
        </div>
    );
}
