import { useEffect, useRef } from 'react';
import type { DroneState } from '../types/drone';
import { generateCity } from '../world/worldGen';

interface Props {
    state: DroneState;
    destroyedBuildings: Set<number>;
}

// Shared with the 3D scene and the C++ engine — building index lines up across all.
const BUILDINGS = generateCity().buildings;
const MAP_SIZE = 160; // px
const VIEW_RADIUS = 250; // meters around drone to show

export default function Minimap({ state, destroyedBuildings }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scale = MAP_SIZE / (VIEW_RADIUS * 2);
        const cx = MAP_SIZE / 2;
        const cy = MAP_SIZE / 2;

        ctx.fillStyle = '#1a1e28';
        ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

        // Buildings relative to drone (intact grey, destroyed scorched red).
        for (let i = 0; i < BUILDINGS.length; i++) {
            const b = BUILDINGS[i];
            const relX = (b.x - state.x) * scale + cx;
            const relZ = (b.z - state.y) * scale + cy; // drone Y = Three.js Z
            const w = b.w * scale;
            const d = b.d * scale;

            if (relX + w / 2 < 0 || relX - w / 2 > MAP_SIZE) continue;
            if (relZ + d / 2 < 0 || relZ - d / 2 > MAP_SIZE) continue;

            ctx.fillStyle = destroyedBuildings.has(i) ? '#5a2820' : '#3a4050';
            ctx.fillRect(relX - w / 2, relZ - d / 2, w, d);
        }

        // Compass directions
        ctx.fillStyle = '#556';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('N', cx, 12);
        ctx.fillText('S', cx, MAP_SIZE - 4);
        ctx.fillText('W', 8, cy + 4);
        ctx.fillText('E', MAP_SIZE - 8, cy + 4);

        // Heading line
        const heading = Math.atan2(state.vy, state.vx);
        const lineLen = 14;
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(heading) * lineLen, cy + Math.sin(heading) * lineLen);
        ctx.stroke();

        // Drone dot
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = '#334';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, MAP_SIZE / 2 - 1, 0, Math.PI * 2);
        ctx.stroke();
    }, [state.x, state.y, state.vx, state.vy, destroyedBuildings]);

    return (
        <div style={{
            background: 'rgba(0,0,0,0.75)',
            borderRadius: '50%',
            overflow: 'hidden',
            width: MAP_SIZE,
            height: MAP_SIZE,
            border: '1px solid #334',
        }}>
            <canvas
                ref={canvasRef}
                width={MAP_SIZE}
                height={MAP_SIZE}
                style={{ display: 'block' }}
            />
        </div>
    );
}
