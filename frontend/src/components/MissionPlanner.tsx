import { useState } from 'react';
import type { Waypoint, Obstacle, Mission } from '../types/mission';

interface Props {
    onMissionPlanned: (path: [number, number, number][]) => void;
}

export default function MissionPlanner({ onMissionPlanned }: Props) {
    const [waypoints, setWaypoints] = useState<Waypoint[]>([
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 10, y: 10, z: 10 }
    ]);
    const [obstacles, setObstacles] = useState<Obstacle[]>([
        { id: 1, x: 5, y: 5, z: 5 }
    ]);
    const [algorithm, setAlgorithm] = useState<'astar' | 'rrtstar'>('astar');
    const [result, setResult] = useState<Mission | null>(null);
    const [loading, setLoading] = useState(false);

    const launch = async () => {
        if (waypoints.length < 2) return;
        setLoading(true);

        const start = [waypoints[0].x, waypoints[0].y, waypoints[0].z];
        const goal = [waypoints[waypoints.length - 1].x, waypoints[waypoints.length - 1].y, waypoints[waypoints.length - 1].z];
        const obs = obstacles.map(o => [o.x, o.y, o.z]);

        try {
            const response = await fetch(`http://localhost:8000/plan/${algorithm}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start, goal, obstacles: obs })
            });
            const data: Mission = await response.json();
            setResult(data);
            onMissionPlanned(data.path);
        } catch (e) {
            console.error('Mission planning failed', e);
        }
        setLoading(false);
    };

    return (
        <div style={{
            background: 'rgba(0,0,0,0.75)',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '16px',
            borderRadius: '8px',
            width: '220px'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>MISSION PLANNER</div>

            {/* algorithm selector */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>ALGORITHM</div>
                <select
                    value={algorithm}
                    onChange={e => setAlgorithm(e.target.value as 'astar' | 'rrtstar')}
                    style={{ background: '#111', color: '#00ff88', border: '1px solid #1a4a2a', padding: '4px', width: '100%', fontFamily: 'monospace' }}
                >
                    <option value="astar">A*</option>
                    <option value="rrtstar">RRT*</option>
                </select>
            </div>

            {/* waypoints */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>WAYPOINTS</div>
                {waypoints.map((wp, i) => (
                    <div key={wp.id} style={{ marginBottom: '4px', color: '#aaa' }}>
                        {i === 0 ? 'START' : 'GOAL'}: ({wp.x}, {wp.y}, {wp.z})
                    </div>
                ))}
            </div>

            {/* obstacles */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>OBSTACLES ({obstacles.length})</div>
                {obstacles.map(o => (
                    <div key={o.id} style={{ color: '#aaa', marginBottom: '2px' }}>
                        ({o.x}, {o.y}, {o.z})
                    </div>
                ))}
            </div>

            {/* launch button */}
            <button
                onClick={launch}
                disabled={loading}
                style={{
                    width: '100%',
                    padding: '8px',
                    background: loading ? '#333' : '#00ff88',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
            >
                {loading ? 'PLANNING...' : 'LAUNCH MISSION'}
            </button>

            {/* result */}
            {result && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #1a4a2a', paddingTop: '8px' }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>RESULT</div>
                    <div>Path: {result.path_length} steps</div>
                    <div>Time: {result.compute_time_ms}ms</div>
                </div>
            )}
        </div>
    );
}