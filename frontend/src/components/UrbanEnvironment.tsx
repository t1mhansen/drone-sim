import { useMemo } from 'react';
import * as THREE from 'three';

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
    windowColor: string;
}

interface Vehicle {
    x: number;
    z: number;
    rot: number;
    color: string;
}

const BUILDING_COLORS = [
    '#606878', '#586068', '#687078', '#505860', '#707880',
    '#5a6470', '#646e78', '#4e5660', '#6a7480', '#586270',
];

const WINDOW_COLORS = [
    '#aabb44', '#88aa33', '#99bb55', '#77aa22', '#bbcc66',
];

const VEHICLE_COLORS = [
    '#8b3030', '#6b4040', '#7b3535', '#5b2020', '#9b4545',
];

export default function UrbanEnvironment() {
    const { buildings, vehicles } = useMemo(() => {
        const rand = seededRandom(42);
        const buildings: Building[] = [];
        const vehicles: Vehicle[] = [];

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
                    const h = 12 + rand() * 65;
                    const offsetX = (rand() - 0.5) * (blockSize - w) * 0.8;
                    const offsetZ = (rand() - 0.5) * (blockSize - d) * 0.8;

                    buildings.push({
                        x: blockCenterX + offsetX,
                        z: blockCenterZ + offsetZ,
                        w, d, h,
                        color: BUILDING_COLORS[Math.floor(rand() * BUILDING_COLORS.length)],
                        windowColor: WINDOW_COLORS[Math.floor(rand() * WINDOW_COLORS.length)],
                    });
                }
            }
        }

        // Vehicles on roads
        for (let i = 0; i < 25; i++) {
            const onVerticalRoad = rand() > 0.5;
            const blockIdx = Math.floor(rand() * gridRange * 2) - gridRange;
            const along = (rand() - 0.5) * gridRange * 2 * (blockSize + roadWidth);
            const roadCenter = blockIdx * (blockSize + roadWidth) + blockSize / 2 + roadWidth / 2;
            const laneOffset = (rand() - 0.5) * 6;

            vehicles.push({
                x: onVerticalRoad ? roadCenter + laneOffset : along,
                z: onVerticalRoad ? along : roadCenter + laneOffset,
                rot: onVerticalRoad ? 0 : Math.PI / 2,
                color: VEHICLE_COLORS[Math.floor(rand() * VEHICLE_COLORS.length)],
            });
        }

        return { buildings, vehicles };
    }, []);

    return (
        <>
            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[2000, 2000]} />
                <meshStandardMaterial color="#3a4050" />
            </mesh>

            {/* Road grid */}
            {Array.from({ length: 9 }, (_, i) => {
                const pos = (i - 4) * 78 + 39;
                return (
                    <group key={`road-${i}`}>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, pos]}>
                            <planeGeometry args={[2000, 18]} />
                            <meshStandardMaterial color="#4a4e58" />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pos, 0.01, 0]}>
                            <planeGeometry args={[18, 2000]} />
                            <meshStandardMaterial color="#4a4e58" />
                        </mesh>
                        {/* Center lines */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, pos]}>
                            <planeGeometry args={[2000, 0.3]} />
                            <meshStandardMaterial color="#8a8a4a" />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pos, 0.02, 0]}>
                            <planeGeometry args={[0.3, 2000]} />
                            <meshStandardMaterial color="#8a8a4a" />
                        </mesh>
                    </group>
                );
            })}

            {/* Buildings with window emissive overlay */}
            {buildings.map((b, i) => (
                <group key={`b-${i}`} position={[b.x, b.h / 2, b.z]}>
                    {/* Main structure */}
                    <mesh>
                        <boxGeometry args={[b.w, b.h, b.d]} />
                        <meshStandardMaterial
                            color={b.color}
                            metalness={0.2}
                            roughness={0.7}
                        />
                    </mesh>
                    {/* Rooftop accent */}
                    <mesh position={[0, b.h / 2 + 0.2, 0]}>
                        <boxGeometry args={[b.w - 1, 0.4, b.d - 1]} />
                        <meshStandardMaterial color="#505560" metalness={0.4} roughness={0.5} />
                    </mesh>
                    {/* Window glow strips (front + back) */}
                    {Array.from({ length: Math.min(Math.floor(b.h / 5), 12) }, (_, j) => {
                        const wy = -b.h / 2 + 3 + j * (b.h - 4) / Math.max(Math.floor(b.h / 5), 1);
                        return (
                            <group key={`w-${j}`}>
                                <mesh position={[0, wy, b.d / 2 + 0.05]}>
                                    <planeGeometry args={[b.w * 0.8, 1.2]} />
                                    <meshStandardMaterial
                                        color={b.windowColor}
                                        emissive={b.windowColor}
                                        emissiveIntensity={0.4}
                                        transparent
                                        opacity={0.7}
                                        side={THREE.DoubleSide}
                                    />
                                </mesh>
                                <mesh position={[0, wy, -b.d / 2 - 0.05]}>
                                    <planeGeometry args={[b.w * 0.8, 1.2]} />
                                    <meshStandardMaterial
                                        color={b.windowColor}
                                        emissive={b.windowColor}
                                        emissiveIntensity={0.4}
                                        transparent
                                        opacity={0.7}
                                        side={THREE.DoubleSide}
                                    />
                                </mesh>
                            </group>
                        );
                    })}
                </group>
            ))}

            {/* Vehicles */}
            {vehicles.map((v, i) => (
                <group key={`v-${i}`} position={[v.x, 0.6, v.z]} rotation={[0, v.rot, 0]}>
                    {/* Body */}
                    <mesh>
                        <boxGeometry args={[2, 1.2, 4.5]} />
                        <meshStandardMaterial color={v.color} metalness={0.4} roughness={0.5} />
                    </mesh>
                    {/* Cabin */}
                    <mesh position={[0, 0.7, -0.3]}>
                        <boxGeometry args={[1.6, 0.8, 2]} />
                        <meshStandardMaterial color="#222233" metalness={0.8} roughness={0.2} />
                    </mesh>
                    {/* Headlights */}
                    <mesh position={[-0.6, 0, 2.3]}>
                        <sphereGeometry args={[0.15, 8, 8]} />
                        <meshStandardMaterial color="#ffee88" emissive="#ffee88" emissiveIntensity={0.5} />
                    </mesh>
                    <mesh position={[0.6, 0, 2.3]}>
                        <sphereGeometry args={[0.15, 8, 8]} />
                        <meshStandardMaterial color="#ffee88" emissive="#ffee88" emissiveIntensity={0.5} />
                    </mesh>
                </group>
            ))}
        </>
    );
}
