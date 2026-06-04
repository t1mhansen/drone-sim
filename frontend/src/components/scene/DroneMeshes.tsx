import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DroneState, DroneProfile } from '../../types/drone';

export function DroneMarker() {
    return <pointLight color="#00ff88" intensity={40} distance={50} />;
}

// A two-blade propeller that spins while the rotor is alive. When the rotor is
// killed it stops dead and the parent draws the damage glow instead.
function Propeller({ r, spinning, dir }: { r: number; spinning: boolean; dir: number }) {
    const ref = useRef<THREE.Group>(null);
    useFrame((_, dt) => {
        if (ref.current && spinning) ref.current.rotation.y += dt * 55 * dir;
    });
    return (
        <group ref={ref}>
            {/* hub */}
            <mesh>
                <cylinderGeometry args={[r * 0.14, r * 0.16, r * 0.18, 10]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* two blades, each spanning from the hub outward with a little pitch */}
            {[0, Math.PI].map((a, i) => (
                <mesh key={i} rotation={[0, a, 0.12]} position={[Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5]}>
                    <boxGeometry args={[r, r * 0.04, r * 0.16]} />
                    <meshStandardMaterial color="#2b2b30" metalness={0.3} roughness={0.6} transparent opacity={spinning ? 0.85 : 1} />
                </mesh>
            ))}
            {/* faint motion-blur disc while spinning */}
            {spinning && (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[r, 24]} />
                    <meshBasicMaterial color="#9fb4c4" transparent opacity={0.07} side={THREE.DoubleSide} />
                </mesh>
            )}
        </group>
    );
}

function RotorcraftMesh({ profile, killedRotors }: { profile: DroneProfile | null; killedRotors: Set<number> }) {
    const numRotors = profile?.physics.num_rotors ?? 4;
    const mass = profile?.physics.mass ?? 1.5;
    const scale = Math.cbrt(mass / 1.5);

    const armLen = 2.0 * scale;
    const propR = 1.0 * scale;
    const bodyR = 0.85 * scale;
    const bodyH = 0.32 * scale;

    const arms = [];
    for (let i = 0; i < numRotors; i++) {
        const angle = (2 * Math.PI * i) / numRotors;
        arms.push({
            angle,
            motorPos: [armLen * Math.cos(angle), 0.05 * scale, armLen * Math.sin(angle)] as [number, number, number],
            // front rotors green, rear rotors red — like nav lights
            navColor: Math.cos(angle) >= 0 ? '#33ff66' : '#ff3344',
        });
    }

    return (
        <group>
            <DroneMarker />

            {/* Lower hull: a low, slightly tapered carbon shell */}
            <mesh>
                <cylinderGeometry args={[bodyR, bodyR * 1.05, bodyH, 4]} />
                <meshStandardMaterial color="#20232a" metalness={0.5} roughness={0.45} />
            </mesh>
            {/* squared top deck */}
            <mesh position={[0, bodyH * 0.45, 0]} rotation={[0, Math.PI / 4, 0]}>
                <boxGeometry args={[bodyR * 1.25, bodyH * 0.5, bodyR * 1.25]} />
                <meshStandardMaterial color="#16181d" metalness={0.6} roughness={0.35} />
            </mesh>
            {/* domed canopy */}
            <mesh position={[0, bodyH * 0.7, -bodyR * 0.05]}>
                <sphereGeometry args={[bodyR * 0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#0e1014" metalness={0.4} roughness={0.2} />
            </mesh>
            {/* battery strip accent */}
            <mesh position={[0, bodyH * 0.55, 0]}>
                <boxGeometry args={[bodyR * 0.9, bodyH * 0.35, bodyR * 0.5]} />
                <meshStandardMaterial color="#2e6cff" emissive="#1a3a88" emissiveIntensity={0.5} metalness={0.3} roughness={0.5} />
            </mesh>

            {/* Arms + motors + props */}
            {arms.map((arm, i) => {
                const killed = killedRotors.has(i);
                const [mx, my, mz] = arm.motorPos;
                return (
                    <group key={i}>
                        {/* arm boom */}
                        <mesh position={[mx / 2, 0, mz / 2]} rotation={[0, -arm.angle, 0]}>
                            <boxGeometry args={[armLen, 0.09 * scale, 0.14 * scale]} />
                            <meshStandardMaterial color={killed ? '#3a1414' : '#1c1c20'} metalness={0.5} roughness={0.5} />
                        </mesh>
                        {/* motor bell */}
                        <mesh position={[mx, my, mz]}>
                            <cylinderGeometry args={[0.22 * scale, 0.26 * scale, 0.26 * scale, 14]} />
                            <meshStandardMaterial color={killed ? '#5a1010' : '#3a3a40'} metalness={0.85} roughness={0.25} />
                        </mesh>
                        {/* nav light on the motor */}
                        <mesh position={[mx, my - 0.16 * scale, mz]}>
                            <sphereGeometry args={[0.08 * scale, 8, 8]} />
                            <meshStandardMaterial color={arm.navColor} emissive={arm.navColor} emissiveIntensity={2.5} />
                        </mesh>

                        {/* propeller, or damage glow if killed */}
                        <group position={[mx, my + 0.18 * scale, mz]}>
                            <Propeller r={propR} spinning={!killed} dir={i % 2 === 0 ? 1 : -1} />
                            {killed && (
                                <>
                                    <pointLight color="#ff2200" intensity={18} distance={7 * scale} />
                                    <mesh position={[0, 0.2 * scale, 0]}>
                                        <sphereGeometry args={[0.35 * scale, 8, 8]} />
                                        <meshStandardMaterial color="#311" emissive="#ff2200" emissiveIntensity={1.5} transparent opacity={0.6} />
                                    </mesh>
                                </>
                            )}
                        </group>
                    </group>
                );
            })}

            {/* Front camera gimbal */}
            <mesh position={[0, -bodyH * 0.2, bodyR * 0.85]}>
                <sphereGeometry args={[0.16 * scale, 12, 12]} />
                <meshStandardMaterial color="#0c0c0c" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0, -bodyH * 0.2, bodyR * 0.85 + 0.13 * scale]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.06 * scale, 0.06 * scale, 0.06 * scale, 12]} />
                <meshStandardMaterial color="#3366cc" metalness={0.9} roughness={0.1} emissive="#112244" emissiveIntensity={0.6} />
            </mesh>

            {/* Skids */}
            {[-1, 1].map((side) => (
                <mesh key={side} position={[side * bodyR * 0.7, -bodyH * 0.7, 0]}>
                    <boxGeometry args={[0.06 * scale, 0.5 * scale, bodyR * 1.6]} />
                    <meshStandardMaterial color="#2a2a2e" metalness={0.4} roughness={0.6} />
                </mesh>
            ))}
        </group>
    );
}

function FixedWingMesh({ profile }: { profile: DroneProfile | null }) {
    const mass = profile?.physics.mass ?? 200;
    const scale = Math.cbrt(mass / 50);

    return (
        <group>
            <DroneMarker />
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.4 * scale, 0.5 * scale, 4.5 * scale, 12]} />
                <meshStandardMaterial color="#5a6b4a" metalness={0.3} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 2.6 * scale]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.4 * scale, 1.2 * scale, 12]} />
                <meshStandardMaterial color="#6b7b5a" metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 3.3 * scale]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.12 * scale, 0.4 * scale, 8]} />
                <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[-1.8 * scale, 0, -0.3 * scale]} rotation={[0, 0.15, 0.03]}>
                <boxGeometry args={[3.2 * scale, 0.08 * scale, 1.8 * scale]} />
                <meshStandardMaterial color="#4a5b3a" metalness={0.3} roughness={0.6} />
            </mesh>
            <mesh position={[1.8 * scale, 0, -0.3 * scale]} rotation={[0, -0.15, -0.03]}>
                <boxGeometry args={[3.2 * scale, 0.08 * scale, 1.8 * scale]} />
                <meshStandardMaterial color="#4a5b3a" metalness={0.3} roughness={0.6} />
            </mesh>
            <mesh position={[-0.5 * scale, 0.4 * scale, -2.0 * scale]} rotation={[0.1, 0, 0.4]}>
                <boxGeometry args={[1.2 * scale, 0.06 * scale, 0.8 * scale]} />
                <meshStandardMaterial color="#5a6b4a" metalness={0.3} roughness={0.6} />
            </mesh>
            <mesh position={[0.5 * scale, 0.4 * scale, -2.0 * scale]} rotation={[0.1, 0, -0.4]}>
                <boxGeometry args={[1.2 * scale, 0.06 * scale, 0.8 * scale]} />
                <meshStandardMaterial color="#5a6b4a" metalness={0.3} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.15 * scale, -2.3 * scale]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.35 * scale, 0.3 * scale, 0.8 * scale, 10]} />
                <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.15 * scale, -2.8 * scale]}>
                <cylinderGeometry args={[0.25 * scale, 0.25 * scale, 0.1 * scale, 10]} />
                <meshStandardMaterial color="#222222" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[-3.4 * scale, 0, -0.3 * scale]}>
                <sphereGeometry args={[0.06 * scale, 8, 8]} />
                <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} />
            </mesh>
            <mesh position={[3.4 * scale, 0, -0.3 * scale]}>
                <sphereGeometry args={[0.06 * scale, 8, 8]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={3} />
            </mesh>
        </group>
    );
}

// Flickering smoke + sparks that intensify as the airframe takes damage.
function DamageSmoke({ scale }: { scale: number }) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((_, dt) => {
        if (!ref.current) return;
        const m = ref.current;
        m.position.y += dt * 1.5;
        if (m.position.y > 3 * scale) m.position.y = scale;
        const flicker = 0.5 + 0.5 * Math.abs(Math.sin(m.position.y * 4));
        (m.material as THREE.MeshStandardMaterial).opacity = 0.4 * flicker;
    });
    return (
        <group>
            <pointLight color="#ff5500" intensity={12} distance={10 * scale} />
            <mesh ref={ref} position={[0, scale, 0]}>
                <sphereGeometry args={[0.6 * scale, 8, 8]} />
                <meshStandardMaterial color="#221008" emissive="#ff4400" emissiveIntensity={1.2} transparent opacity={0.4} />
            </mesh>
        </group>
    );
}

export function Drone({ state, profile, killedRotors }: {
    state: DroneState;
    profile: DroneProfile | null;
    killedRotors: Set<number>;
}) {
    // A destroyed airframe is hidden — the explosion effect stands in for it.
    if (state.health <= 0) return null;

    const isFixedWing = profile?.type === 'fixed_wing';
    const mass = profile?.physics.mass ?? 1.5;
    const scale = isFixedWing ? Math.cbrt(mass / 50) : Math.cbrt(mass / 1.5);
    const rotY = isFixedWing ? Math.atan2(state.vy, state.vx) : 0;
    const damaged = state.health < 40;

    return (
        <group position={[state.x, state.z, state.y]} rotation={[0, -rotY, 0]}>
            {isFixedWing
                ? <FixedWingMesh profile={profile} />
                : <RotorcraftMesh profile={profile} killedRotors={killedRotors} />
            }
            {damaged && <DamageSmoke scale={scale} />}
        </group>
    );
}
