import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import type { DroneProfile, DronesResponse } from '../types/drone';

interface Props {
    onDroneChanged: (droneId: string, profile: DroneProfile) => void;
}

export default function DroneSelector({ onDroneChanged }: Props) {
    const [drones, setDrones] = useState<Record<string, DroneProfile>>({});
    const [selected, setSelected] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE_URL}/drones`)
            .then(r => r.json())
            .then((data: DronesResponse) => {
                setDrones(data.drones);
                setSelected(data.current);
                if (data.drones[data.current]) {
                    onDroneChanged(data.current, data.drones[data.current]);
                }
            })
            .catch(() => {});
    }, []);

    const selectDrone = async (id: string) => {
        if (id === selected || loading) return;
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/drone/select/${id}`, { method: 'POST' });
            setSelected(id);
            onDroneChanged(id, drones[id]);
        } catch (e) {
            console.error('Failed to select drone', e);
        }
        setLoading(false);
    };

    const current = drones[selected];

    return (
        <div style={{
            background: 'rgba(0,0,0,0.75)',
            color: '#44aaff',
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '16px',
            borderRadius: '8px',
            width: '280px',
            maxHeight: expanded ? '500px' : 'auto',
            overflowY: expanded ? 'auto' : 'hidden',
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>DRONE SELECT</span>
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        background: 'none', border: 'none', color: '#44aaff',
                        fontFamily: 'monospace', cursor: 'pointer', fontSize: '12px'
                    }}
                >
                    {expanded ? 'COLLAPSE' : 'EXPAND'}
                </button>
            </div>

            {/* Drone buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                {Object.entries(drones).map(([id, drone]) => (
                    <button
                        key={id}
                        onClick={() => selectDrone(id)}
                        disabled={loading}
                        style={{
                            padding: '8px',
                            background: id === selected ? '#1a3a5a' : '#0a1a2a',
                            color: id === selected ? '#44aaff' : '#668899',
                            border: id === selected ? '1px solid #44aaff' : '1px solid #1a2a3a',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            textAlign: 'left',
                        }}
                    >
                        <div style={{ fontWeight: id === selected ? 'bold' : 'normal' }}>
                            {drone.name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#556677', marginTop: '2px' }}>
                            {drone.type === 'fixed_wing' ? 'FIXED WING' : 'ROTORCRAFT'} · {drone.specs.max_speed}
                        </div>
                    </button>
                ))}
            </div>

            {/* Current drone info */}
            {current && (
                <>
                    <div style={{ borderTop: '1px solid #1a3a5a', paddingTop: '8px' }}>
                        <div style={{ color: '#888', fontSize: '11px', marginBottom: '6px' }}>SPECS</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: '#aaa', fontSize: '11px' }}>
                            <div>Speed: {current.specs.max_speed}</div>
                            <div>Range: {current.specs.range}</div>
                            <div>Time: {current.specs.endurance}</div>
                            <div>Cost: {current.specs.cost}</div>
                            <div>Mass: {current.physics.mass} kg</div>
                            <div>Rotors: {current.physics.num_rotors}</div>
                        </div>
                    </div>

                    {expanded && (
                        <>
                            <div style={{ marginTop: '8px' }}>
                                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>DESCRIPTION</div>
                                <div style={{ color: '#aaa', fontSize: '11px', lineHeight: '1.4' }}>
                                    {current.description}
                                </div>
                            </div>

                            <div style={{ marginTop: '8px' }}>
                                <div style={{ color: '#00ff88', fontSize: '11px', marginBottom: '4px' }}>PROS</div>
                                {current.pros.map((p, i) => (
                                    <div key={i} style={{ color: '#aaa', fontSize: '11px', marginBottom: '2px' }}>
                                        + {p}
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '8px' }}>
                                <div style={{ color: '#ff4444', fontSize: '11px', marginBottom: '4px' }}>CONS</div>
                                {current.cons.map((c, i) => (
                                    <div key={i} style={{ color: '#aaa', fontSize: '11px', marginBottom: '2px' }}>
                                        - {c}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
