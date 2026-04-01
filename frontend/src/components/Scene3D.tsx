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

// Rotorcraft mesh - box body with cylinder rotors
function RotorcraftMesh({ profile }: { profile: DroneProfile | null }) {
    const numRotors = profile?.physics.num_rotors ?? 4;
    const mass = profile?.physics.mass ?? 1.5;
    const scale = Math.cbrt(mass / 1.5);
    const bodyW = 3 * scale;
    const bodyH = 0.5 * scale;
    const rotorR = 0.8 * scale;
    const armLen = 1.8 * scale;

    const rotorPositions: [number, number, number][] = [];
    for (let i = 0; i < numRotors; i++) {
        const angle = (2 * Math.PI * i) / numRotors;
        rotorPositions.push([
            armLen * Math.cos(angle),
            bodyH * 0.6,
            armLen * Math.sin(angle),
        ]);
    }

    return (
        <>
            <mesh>
                <boxGeometry args={[bodyW, bodyH, bodyW]} />
                <meshStandardMaterial color="#00ff88" />
            </mesh>
            {rotorPositions.map((pos, i) => (
                <mesh key={i} position={pos}>
                    <cylinderGeometry args={[rotorR, rotorR, 0.1, 16]} />
                    <meshStandardMaterial color="#888888" />
                </mesh>
            ))}
        </>
    );
}

// Fixed-wing mesh
function FixedWingMesh({ profile }: { profile: DroneProfile | null }) {
    const mass = profile?.physics.mass ?? 200;
    const scale = Math.cbrt(mass / 50);

    return (
        <>
            <mesh>
                <boxGeometry args={[1.2 * scale, 0.4 * scale, 4 * scale]} />
                <meshStandardMaterial color="#556655" />
            </mesh>
            <mesh position={[-2 * scale, 0, -0.5 * scale]} rotation={[0, 0, 0.05]}>
                <boxGeometry args={[3 * scale, 0.1 * scale, 2 * scale]} />
                <meshStandardMaterial color="#667766" />
            </mesh>
            <mesh position={[2 * scale, 0, -0.5 * scale]} rotation={[0, 0, -0.05]}>
                <boxGeometry args={[3 * scale, 0.1 * scale, 2 * scale]} />
                <meshStandardMaterial color="#667766" />
            </mesh>
            <mesh position={[0, 0.5 * scale, -1.8 * scale]}>
                <boxGeometry args={[0.1 * scale, 1 * scale, 0.8 * scale]} />
                <meshStandardMaterial color="#556655" />
            </mesh>
            <mesh position={[0, 0, 2.2 * scale]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.4 * scale, 1 * scale, 8]} />
                <meshStandardMaterial color="#ff4444" />
            </mesh>
        </>
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
        if (mode === 'orbit') return; // OrbitControls handles this

        // Drone position in Three.js coords (x, z_sim -> y_three, y_sim -> z_three)
        const dronePos = new THREE.Vector3(state.x, state.z, state.y);
        const isFixedWing = profile?.type === 'fixed_wing';

        if (mode === 'fpv') {
            // Camera at drone position, looking along velocity
            const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy + state.vz * state.vz);
            let lookDir: THREE.Vector3;
            if (speed > 0.5) {
                lookDir = new THREE.Vector3(state.vx, state.vz, state.vy).normalize();
            } else {
                lookDir = new THREE.Vector3(1, 0, 0);
            }
            const targetPos = dronePos.clone().add(lookDir.multiplyScalar(0.1));
            camera.position.copy(dronePos);
            camera.lookAt(targetPos.add(dronePos));
        } else if (mode === 'chase') {
            // Chase camera: behind and above the drone
            let heading = 0;
            if (isFixedWing) {
                heading = Math.atan2(state.vy, state.vx);
            }
            const behindDist = 30;
            const aboveDist = 15;
            const desiredPos = new THREE.Vector3(
                dronePos.x - Math.cos(heading) * behindDist,
                dronePos.y + aboveDist,
                dronePos.z - Math.sin(heading) * behindDist,
            );

            // Smooth lerp
            smoothPos.current.lerp(desiredPos, 0.05);
            smoothTarget.current.lerp(dronePos, 0.1);

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
        <Canvas style={{ position: 'absolute', top: 0, left: 0 }} className="w-full h-full">
            <fog attach="fog" args={['#1a1a1a', 100, 800]} />

            <CameraController state={state} mode={cameraMode} profile={droneProfile} />
            {cameraMode === 'orbit' && <OrbitCameraController state={state} />}

            <ambientLight intensity={0.4} />
            <directionalLight position={[200, 300, 100]} intensity={1.2} />
            <hemisphereLight args={['#667788', '#222222', 0.3]} />

            <UrbanEnvironment />
            <Drone state={state} profile={droneProfile} />
        </Canvas>
    );
}
