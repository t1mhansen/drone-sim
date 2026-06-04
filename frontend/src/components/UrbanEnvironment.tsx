import { useMemo } from 'react';
import * as THREE from 'three';
import { generateCity, WORLD, type Building } from '../world/worldGen';

interface Props {
    destroyedBuildings: Set<number>;
}

// Collapsed building: a scorched footprint with a few angular debris chunks.
function Rubble({ b, index }: { b: Building; index: number }) {
    const chunks = useMemo(() => {
        // Deterministic scatter seeded by building index so it's stable per building.
        let s = (index + 1) * 2654435761 % 2147483647;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
        const n = 5 + Math.floor(rand() * 4);
        return Array.from({ length: n }, () => ({
            x: (rand() - 0.5) * b.w * 0.8,
            z: (rand() - 0.5) * b.d * 0.8,
            s: 1.5 + rand() * 4,
            ry: rand() * Math.PI,
            tilt: (rand() - 0.5) * 0.5,
        }));
    }, [b.w, b.d, index]);

    return (
        <group position={[b.x, 0, b.z]}>
            {/* Scorched ground patch */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
                <planeGeometry args={[b.w * 1.05, b.d * 1.05]} />
                <meshStandardMaterial color="#1c1814" roughness={1} />
            </mesh>
            {/* Debris chunks */}
            {chunks.map((c, i) => (
                <mesh key={i} position={[c.x, c.s / 2, c.z]} rotation={[c.tilt, c.ry, c.tilt]}>
                    <boxGeometry args={[c.s, c.s * 0.7, c.s]} />
                    <meshStandardMaterial color="#3a3530" metalness={0.2} roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
}

function IntactBuilding({ b }: { b: Building }) {
    return (
        <group position={[b.x, b.h / 2, b.z]}>
            {/* Main structure */}
            <mesh>
                <boxGeometry args={[b.w, b.h, b.d]} />
                <meshStandardMaterial color={b.color} metalness={0.2} roughness={0.7} />
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
                                color={b.windowColor} emissive={b.windowColor} emissiveIntensity={0.4}
                                transparent opacity={0.7} side={THREE.DoubleSide}
                            />
                        </mesh>
                        <mesh position={[0, wy, -b.d / 2 - 0.05]}>
                            <planeGeometry args={[b.w * 0.8, 1.2]} />
                            <meshStandardMaterial
                                color={b.windowColor} emissive={b.windowColor} emissiveIntensity={0.4}
                                transparent opacity={0.7} side={THREE.DoubleSide}
                            />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
}

export default function UrbanEnvironment({ destroyedBuildings }: Props) {
    const { buildings, vehicles } = useMemo(() => generateCity(), []);

    return (
        <>
            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[2000, 2000]} />
                <meshStandardMaterial color="#3a4050" />
            </mesh>

            {/* Road grid */}
            {Array.from({ length: 9 }, (_, i) => {
                const pos = (i - 4) * (WORLD.BLOCK_SIZE + WORLD.ROAD_WIDTH) + (WORLD.BLOCK_SIZE + WORLD.ROAD_WIDTH) / 2;
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

            {/* Buildings — destroyed ones become rubble */}
            {buildings.map((b, i) => (
                destroyedBuildings.has(i)
                    ? <Rubble key={`b-${i}`} b={b} index={i} />
                    : <IntactBuilding key={`b-${i}`} b={b} />
            ))}

            {/* Vehicles */}
            {vehicles.map((v, i) => (
                <group key={`v-${i}`} position={[v.x, 0.6, v.z]} rotation={[0, v.rot, 0]}>
                    <mesh>
                        <boxGeometry args={[2, 1.2, 4.5]} />
                        <meshStandardMaterial color={v.color} metalness={0.4} roughness={0.5} />
                    </mesh>
                    <mesh position={[0, 0.7, -0.3]}>
                        <boxGeometry args={[1.6, 0.8, 2]} />
                        <meshStandardMaterial color="#222233" metalness={0.8} roughness={0.2} />
                    </mesh>
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
