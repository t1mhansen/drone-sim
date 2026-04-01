import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Line } from '@react-three/drei';
import type { DroneState, DroneProfile } from '../types/drone';

interface Props {
    state: DroneState;
    plannedPath: [number, number, number][];
    obstacles: [number, number, number][];
    droneProfile: DroneProfile | null;
}

// Rotorcraft mesh - box body with cylinder rotors
function RotorcraftMesh({ profile }: { profile: DroneProfile | null }) {
    const numRotors = profile?.physics.num_rotors ?? 4;
    const mass = profile?.physics.mass ?? 1.5;

    // Scale body and rotors based on mass
    const scale = Math.cbrt(mass / 1.5); // cube root scaling
    const bodyW = 3 * scale;
    const bodyH = 0.5 * scale;
    const rotorR = 0.8 * scale;
    const armLen = 1.8 * scale;

    // Generate rotor positions in a circle
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

// Fixed-wing mesh - delta wing body with pusher prop
function FixedWingMesh({ profile }: { profile: DroneProfile | null }) {
    const mass = profile?.physics.mass ?? 200;
    const scale = Math.cbrt(mass / 50); // scale relative to a baseline

    return (
        <>
            {/* Fuselage */}
            <mesh rotation={[0, 0, 0]}>
                <boxGeometry args={[1.2 * scale, 0.4 * scale, 4 * scale]} />
                <meshStandardMaterial color="#556655" />
            </mesh>
            {/* Left wing */}
            <mesh position={[-2 * scale, 0, -0.5 * scale]} rotation={[0, 0, 0.05]}>
                <boxGeometry args={[3 * scale, 0.1 * scale, 2 * scale]} />
                <meshStandardMaterial color="#667766" />
            </mesh>
            {/* Right wing */}
            <mesh position={[2 * scale, 0, -0.5 * scale]} rotation={[0, 0, -0.05]}>
                <boxGeometry args={[3 * scale, 0.1 * scale, 2 * scale]} />
                <meshStandardMaterial color="#667766" />
            </mesh>
            {/* Tail fin */}
            <mesh position={[0, 0.5 * scale, -1.8 * scale]}>
                <boxGeometry args={[0.1 * scale, 1 * scale, 0.8 * scale]} />
                <meshStandardMaterial color="#556655" />
            </mesh>
            {/* Nose cone */}
            <mesh position={[0, 0, 2.2 * scale]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.4 * scale, 1 * scale, 8]} />
                <meshStandardMaterial color="#ff4444" />
            </mesh>
        </>
    );
}

function Drone({ state, profile }: { state: DroneState; profile: DroneProfile | null }) {
    const isFixedWing = profile?.type === 'fixed_wing';

    // Fixed-wing: rotate to face direction of travel
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

function PlannedPath({ path }: { path: [number, number, number][] }) {
    if (path.length < 2) return null;
    const points = path.map(([x, y, z]) => [x, z, y] as [number, number, number]);
    return <Line points={points} color="#ffff00" lineWidth={2} />;
}

function Obstacles({ positions }: { positions: [number, number, number][] }) {
    return (
        <>
            {positions.map(([x, y, z], i) => (
                <mesh key={i} position={[x, z, y]}>
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshStandardMaterial color="#ff4444" transparent opacity={0.5} />
                </mesh>
            ))}
        </>
    );
}

export default function Scene3D({ state, plannedPath, obstacles, droneProfile }: Props) {
    return (
        <Canvas style={{ position: 'absolute', top: 0, left: 0 }} className="w-full h-full">
            <PerspectiveCamera makeDefault position={[20, 120, 20]} />
            <OrbitControls />

            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />

            <Grid
                args={[50, 50]}
                position={[0, 0, 0]}
                cellColor="#333333"
                sectionColor="#555555"
            />

            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.5]} />
                <meshStandardMaterial color="red" />
            </mesh>

            <Obstacles positions={obstacles} />
            <PlannedPath path={plannedPath} />
            <Drone state={state} profile={droneProfile} />
        </Canvas>
    );
}
