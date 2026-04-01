import { useEffect, useRef } from 'react';
import type { DroneState } from '../types/drone';

interface Props {
    state: DroneState;
}

// Same PRNG as UrbanEnvironment.tsx and C++ WorldCollision
function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

interface MinimapBuilding {
    x: number;
    z: number;
    w: number;
    d: number;
}

// Pre-generate building footprints (matches UrbanEnvironment.tsx exactly)
function generateBuildingFootprints(): MinimapBuilding[] {
    const rand = seededRandom(42);
    const buildings: MinimapBuilding[] = [];
    const blockSize = 60;
    const roadWidth = 18;
    const gridRange = 4;

    for (let bx = -gridRange; bx < gridRange; bx++) {
        for (let bz = -gridRange; bz < gridRange; bz++) {
            const blockCenterX = bx * (blockSize + roadWidth);
            const blockCenterZ = bz * (blockSize + roadWidth);
            const numBuildings = 1 + Math.floor(rand() * 3);
            for (let i = 0; i < numBuildings; i++) {
                const w = 12 + rand() * 28;
                const d = 12 + rand() * 28;
                rand(); // h
                const offsetX = (rand() - 0.5) * (blockSize - w) * 0.8;
                const offsetZ = (rand() - 0.5) * (blockSize - d) * 0.8;
                buildings.push({
                    x: blockCenterX + offsetX,
                    z: blockCenterZ + offsetZ,
                    w, d,
                });
                rand(); // building color
                rand(); // window color
            }
        }
    }
    return buildings;
}

const BUILDINGS = generateBuildingFootprints();
const MAP_SIZE = 160; // px
const VIEW_RADIUS = 250; // meters around drone to show

export default function Minimap({ state }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scale = MAP_SIZE / (VIEW_RADIUS * 2);
        const cx = MAP_SIZE / 2;
        const cy = MAP_SIZE / 2;

        // Clear
        ctx.fillStyle = '#1a1e28';
        ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

        // Draw buildings relative to drone
        ctx.fillStyle = '#3a4050';
        for (const b of BUILDINGS) {
            const relX = (b.x - state.x) * scale + cx;
            const relZ = (b.z - state.y) * scale + cy; // drone Y = Three.js Z
            const w = b.w * scale;
            const d = b.d * scale;

            // Skip if off-screen
            if (relX + w / 2 < 0 || relX - w / 2 > MAP_SIZE) continue;
            if (relZ + d / 2 < 0 || relZ - d / 2 > MAP_SIZE) continue;

            ctx.fillRect(relX - w / 2, relZ - d / 2, w, d);
        }

        // Draw compass directions
        ctx.fillStyle = '#556';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('N', cx, 12);
        ctx.fillText('S', cx, MAP_SIZE - 4);
        ctx.fillText('W', 8, cy + 4);
        ctx.fillText('E', MAP_SIZE - 8, cy + 4);

        // Draw heading line
        const heading = Math.atan2(state.vy, state.vx);
        const lineLen = 14;
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(heading) * lineLen, cy + Math.sin(heading) * lineLen);
        ctx.stroke();

        // Draw drone dot
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
    }, [state.x, state.y, state.vx, state.vy]);

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
