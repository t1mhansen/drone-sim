import { useMemo } from 'react';

// Seeded PRNG for deterministic city layout
function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

interface Building {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    color: string;
}

interface Vehicle {
    x: number;
    z: number;
}

const BUILDING_COLORS = [
    '#4a4a4a', '#555555', '#3d3d3d', '#484848', '#525252',
    '#5a5a5a', '#454545', '#4f4f4f', '#585858', '#404040',
];

export default function UrbanEnvironment() {
    const { buildings, vehicles } = useMemo(() => {
        const rand = seededRandom(42);
        const buildings: Building[] = [];
        const vehicles: Vehicle[] = [];

        // City grid: blocks along roads
        const blockSize = 60;
        const roadWidth = 16;
        const gridRange = 4; // -4 to +4 blocks = 8x8 city

        for (let bx = -gridRange; bx < gridRange; bx++) {
            for (let bz = -gridRange; bz < gridRange; bz++) {
                const blockCenterX = bx * (blockSize + roadWidth);
                const blockCenterZ = bz * (blockSize + roadWidth);

                // 1-4 buildings per block
                const numBuildings = 1 + Math.floor(rand() * 4);
                for (let i = 0; i < numBuildings; i++) {
                    const w = 10 + rand() * 25;
                    const d = 10 + rand() * 25;
                    const h = 10 + rand() * 70;
                    const offsetX = (rand() - 0.5) * (blockSize - w);
                    const offsetZ = (rand() - 0.5) * (blockSize - d);

                    buildings.push({
                        x: blockCenterX + offsetX,
                        z: blockCenterZ + offsetZ,
                        w, d, h,
                        color: BUILDING_COLORS[Math.floor(rand() * BUILDING_COLORS.length)],
                    });
                }
            }
        }

        // Scatter vehicles on roads
        for (let i = 0; i < 20; i++) {
            const onVerticalRoad = rand() > 0.5;
            const blockIdx = Math.floor(rand() * gridRange * 2) - gridRange;
            const along = (rand() - 0.5) * gridRange * 2 * (blockSize + roadWidth);

            if (onVerticalRoad) {
                vehicles.push({
                    x: blockIdx * (blockSize + roadWidth) + blockSize / 2 + rand() * roadWidth * 0.5,
                    z: along,
                });
            } else {
                vehicles.push({
                    x: along,
                    z: blockIdx * (blockSize + roadWidth) + blockSize / 2 + rand() * roadWidth * 0.5,
                });
            }
        }

        return { buildings, vehicles };
    }, []);

    return (
        <>
            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
                <planeGeometry args={[2000, 2000]} />
                <meshStandardMaterial color="#2a2a2a" />
            </mesh>

            {/* Road grid lines (lighter ground strips) */}
            {Array.from({ length: 9 }, (_, i) => {
                const pos = (i - 4) * 76 + 38;
                return (
                    <group key={`road-${i}`}>
                        {/* Horizontal road */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, pos]}>
                            <planeGeometry args={[2000, 16]} />
                            <meshStandardMaterial color="#333333" />
                        </mesh>
                        {/* Vertical road */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pos, 0, 0]}>
                            <planeGeometry args={[16, 2000]} />
                            <meshStandardMaterial color="#333333" />
                        </mesh>
                    </group>
                );
            })}

            {/* Buildings */}
            {buildings.map((b, i) => (
                <mesh key={`b-${i}`} position={[b.x, b.h / 2, b.z]}>
                    <boxGeometry args={[b.w, b.h, b.d]} />
                    <meshStandardMaterial color={b.color} />
                </mesh>
            ))}

            {/* Vehicle targets (red boxes) */}
            {vehicles.map((v, i) => (
                <mesh key={`v-${i}`} position={[v.x, 0.75, v.z]}>
                    <boxGeometry args={[4, 1.5, 2]} />
                    <meshStandardMaterial color="#8b2020" />
                </mesh>
            ))}
        </>
    );
}
