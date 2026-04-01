import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { DroneState, DroneProfile } from '../types/drone';
import UrbanEnvironment from './UrbanEnvironment';

type CameraMode = 'chase' | 'fpv' | 'orbit';

interface Props {
    state: DroneState;
    droneProfile: DroneProfile | null;
    cameraMode: CameraMode;
}

// Bright emissive marker so the drone is always visible
function DroneMarker() {
    return (
        <pointLight color="#00ff88" intensity={50} distance={60} />
    );
}

// Rotorcraft: central body, arms, motors, rotor discs, landing gear, camera gimbal
function RotorcraftMesh({ profile }: { profile: DroneProfile | null }) {
    const numRotors = profile?.physics.num_rotors ?? 4;
    const mass = profile?.physics.mass ?? 1.5;
    const scale = Math.cbrt(mass / 1.5);
    const armLen = 2.2 * scale;
    const bodyR = 0.8 * scale;
    const bodyH = 0.4 * scale;

    const arms: { pos: [number, number, number]; rot: number; motorPos: [number, number, number]; }[] = [];
    for (let i = 0; i < numRotors; i++) {
        const angle = (2 * Math.PI * i) / numRotors;
        const cx = armLen * Math.cos(angle);
        const cz = armLen * Math.sin(angle);
        arms.push({
            pos: [cx / 2, 0, cz / 2],
            rot: angle,
            motorPos: [cx, 0.15 * scale, cz],
        });
    }

    return (
        <group>
            <DroneMarker />

            {/* Central body - rounded cylinder */}
            <mesh>
                <cylinderGeometry args={[bodyR, bodyR * 0.9, bodyH, 16]} />
                <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Top shell */}
            <mesh position={[0, bodyH * 0.35, 0]}>
                <sphereGeometry args={[bodyR * 0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.2} />
            </mesh>

            {/* LED strip on body */}
            <mesh position={[0, -bodyH * 0.1, 0]}>
                <torusGeometry args={[bodyR * 0.95, 0.04 * scale, 8, 32]} />
                <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={2} />
            </mesh>

            {/* Arms + Motors + Rotors */}
            {arms.map((arm, i) => (
                <group key={i}>
                    {/* Arm beam */}
                    <mesh position={arm.pos} rotation={[0, -arm.rot, 0]}>
                        <boxGeometry args={[0.12 * scale, 0.1 * scale, armLen]} />
                        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
                    </mesh>

                    {/* Motor housing */}
                    <mesh position={arm.motorPos}>
                        <cylinderGeometry args={[0.2 * scale, 0.22 * scale, 0.3 * scale, 12]} />
                        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
                    </mesh>

                    {/* Rotor disc (translucent spinning disc) */}
                    <mesh position={[arm.motorPos[0], arm.motorPos[1] + 0.2 * scale, arm.motorPos[2]]}>
                        <cylinderGeometry args={[0.9 * scale, 0.9 * scale, 0.02 * scale, 24]} />
                        <meshStandardMaterial
                            color={i < 2 ? "#ff4444" : "#00ff88"}
                            transparent opacity={0.25}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </group>
            ))}

            {/* Landing gear - 4 legs */}
            {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz], i) => (
                <group key={`leg-${i}`}>
                    <mesh position={[dx * bodyR * 0.6, -bodyH * 0.5, dz * bodyR * 0.6]}>
                        <cylinderGeometry args={[0.03 * scale, 0.03 * scale, 0.5 * scale, 6]} />
                        <meshStandardMaterial color="#555555" />
                    </mesh>
                    <mesh position={[dx * bodyR * 0.6, -bodyH * 0.5 - 0.25 * scale, dz * bodyR * 0.6]}>
                        <sphereGeometry args={[0.06 * scale, 8, 8]} />
                        <meshStandardMaterial color="#333333" />
                    </mesh>
                </group>
            ))}

            {/* Camera gimbal on front */}
            <mesh position={[0, -bodyH * 0.3, bodyR * 0.7]}>
                <sphereGeometry args={[0.15 * scale, 12, 12]} />
                <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Camera lens */}
            <mesh position={[0, -bodyH * 0.3, bodyR * 0.7 + 0.12 * scale]}>
                <cylinderGeometry args={[0.06 * scale, 0.06 * scale, 0.05 * scale, 12]} />
                <meshStandardMaterial color="#2244aa" metalness={0.9} roughness={0.1} emissive="#112244" emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}

// Fixed-wing: fuselage, delta wings, V-tail, engine nacelle, warhead nose
function FixedWingMesh({ profile }: { profile: DroneProfile | null }) {
    const mass = profile?.physics.mass ?? 200;
    const scale = Math.cbrt(mass / 50);

    return (
        <group>
            <DroneMarker />

            {/* Fuselage - tapered cylinder */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.4 * scale, 0.5 * scale, 4.5 * scale, 12]} />
                <meshStandardMaterial color="#5a6b4a" metalness={0.3} roughness={0.6} />
            </mesh>

            {/* Nose cone - warhead */}
            <mesh position={[0, 0, 2.6 * scale]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.4 * scale, 1.2 * scale, 12]} />
                <meshStandardMaterial color="#6b7b5a" metalness={0.4} roughness={0.5} />
            </mesh>

            {/* Nose tip */}
            <mesh position={[0, 0, 3.3 * scale]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.12 * scale, 0.4 * scale, 8]} />
                <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Left wing - swept */}
            <mesh position={[-1.8 * scale, 0, -0.3 * scale]} rotation={[0, 0.15, 0.03]}>
                <boxGeometry args={[3.2 * scale, 0.08 * scale, 1.8 * scale]} />
                <meshStandardMaterial color="#4a5b3a" metalness={0.3} roughness={0.6} />
            </mesh>

            {/* Right wing - swept */}
            <mesh position={[1.8 * scale, 0, -0.3 * scale]} rotation={[0, -0.15, -0.03]}>
                <boxGeometry args={[3.2 * scale, 0.08 * scale, 1.8 * scale]} />
                <meshStandardMaterial color="#4a5b3a" metalness={0.3} roughness={0.6} />
            </mesh>

            {/* V-tail left */}
            <mesh position={[-0.5 * scale, 0.4 * scale, -2.0 * scale]} rotation={[0.1, 0, 0.4]}>
                <boxGeometry args={[1.2 * scale, 0.06 * scale, 0.8 * scale]} />
                <meshStandardMaterial color="#5a6b4a" metalness={0.3} roughness={0.6} />
            </mesh>

            {/* V-tail right */}
            <mesh position={[0.5 * scale, 0.4 * scale, -2.0 * scale]} rotation={[0.1, 0, -0.4]}>
                <boxGeometry args={[1.2 * scale, 0.06 * scale, 0.8 * scale]} />
                <meshStandardMaterial color="#5a6b4a" metalness={0.3} roughness={0.6} />
            </mesh>

            {/* Engine nacelle (rear) */}
            <mesh position={[0, 0.15 * scale, -2.3 * scale]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.35 * scale, 0.3 * scale, 0.8 * scale, 10]} />
                <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Engine exhaust */}
            <mesh position={[0, 0.15 * scale, -2.8 * scale]}>
                <cylinderGeometry args={[0.25 * scale, 0.25 * scale, 0.1 * scale, 10]} />
                <meshStandardMaterial color="#222222" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* Navigation lights */}
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

function Drone({ state, profile }: { state: DroneState; profile: DroneProfile | null }) {
    const isFixedWing = profile?.type === 'fixed_wing';
    let rotY = 0;
    if (isFixedWing) {
        rotY = Math.atan2(state.vy, state.vx);
    }

    return (
        <group position={[state.x, state.z, state.y]} rotation={[0, -rotY, 0]}>
            {isFixedWing
                ? <FixedWingMesh profile={profile} />
                : <RotorcraftMesh profile={profile} />
            }
        </group>
    );
}

function CameraController({ state, mode, profile }: {
    state: DroneState;
    mode: CameraMode;
    profile: DroneProfile | null;
}) {
    const { camera } = useThree();
    const smoothPos = useRef(new THREE.Vector3(20, 120, 20));
    const smoothTarget = useRef(new THREE.Vector3(0, 0, 0));

    useFrame(() => {
        if (mode === 'orbit') return;

        const dronePos = new THREE.Vector3(state.x, state.z, state.y);
        const isFixedWing = profile?.type === 'fixed_wing';

        if (mode === 'fpv') {
            const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy + state.vz * state.vz);
            let lookTarget: THREE.Vector3;
            if (speed > 0.5) {
                const dir = new THREE.Vector3(state.vx, state.vz, state.vy).normalize();
                lookTarget = dronePos.clone().add(dir.multiplyScalar(50));
            } else {
                lookTarget = dronePos.clone().add(new THREE.Vector3(50, 0, 0));
            }

            // Slightly above drone center for FPV
            const fpvPos = dronePos.clone();
            fpvPos.y += 0.5;

            smoothPos.current.lerp(fpvPos, 0.3);
            smoothTarget.current.lerp(lookTarget, 0.15);

            camera.position.copy(smoothPos.current);
            camera.lookAt(smoothTarget.current);
        } else if (mode === 'chase') {
            let heading = 0;
            const hSpeed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
            if (isFixedWing || hSpeed > 2) {
                heading = Math.atan2(state.vy, state.vx);
            }

            const behindDist = 30;
            const aboveDist = 12;
            const desiredPos = new THREE.Vector3(
                dronePos.x - Math.cos(heading) * behindDist,
                dronePos.y + aboveDist,
                dronePos.z - Math.sin(heading) * behindDist,
            );

            smoothPos.current.lerp(desiredPos, 0.04);
            smoothTarget.current.lerp(dronePos, 0.08);

            camera.position.copy(smoothPos.current);
            camera.lookAt(smoothTarget.current);
        }
    });

    return null;
}

function OrbitCameraController({ state }: { state: DroneState }) {
    const controlsRef = useRef<any>(null);

    useFrame(() => {
        if (controlsRef.current) {
            controlsRef.current.target.set(state.x, state.z, state.y);
            controlsRef.current.update();
        }
    });

    return <OrbitControls ref={controlsRef} />;
}

export default function Scene3D({ state, droneProfile, cameraMode }: Props) {
    return (
        <Canvas
            style={{ position: 'absolute', top: 0, left: 0 }}
            className="w-full h-full"
            camera={{ position: [20, 120, 20], fov: 60, near: 0.5, far: 2000 }}
        >
            <fog attach="fog" args={['#2a3040', 200, 1200]} />
            <color attach="background" args={['#1a2030']} />

            <CameraController state={state} mode={cameraMode} profile={droneProfile} />
            {cameraMode === 'orbit' && <OrbitCameraController state={state} />}

            {/* Lighting - brighter and more atmospheric */}
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[300, 400, 200]}
                intensity={1.5}
                color="#fff5e0"
            />
            <directionalLight
                position={[-100, 200, -100]}
                intensity={0.4}
                color="#8899bb"
            />
            <hemisphereLight args={['#8899bb', '#334455', 0.6]} />

            <UrbanEnvironment />
            <Drone state={state} profile={droneProfile} />
        </Canvas>
    );
}
