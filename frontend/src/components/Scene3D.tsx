import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Line } from '@react-three/drei';
import type { DroneState } from '../types/drone';

interface Props {
    state: DroneState;
    plannedPath: [number, number, number][];
}

// the drone mesh - a simple box body with 4 cylinder rotors
function Drone({ state }: { state: DroneState }) {
    return (
        <group position={[state.x, state.z, state.y]}>
            {/* drone body */}
            <mesh>
                <boxGeometry args={[3, 0.5, 3]} />
                <meshStandardMaterial color="#00ff88" />
            </mesh>

            {/* 4 rotors */}
            {[[-1.8, 0.3, -1.8], [1.8, 0.3, -1.8], [-1.8, 0.3, 1.8], [1.8, 0.3, 1.8]].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                    <cylinderGeometry args={[0.8, 0.8, 0.1, 16]} />
                    <meshStandardMaterial color="#888888" />
                </mesh>
            ))}
        </group>
    );
}

// renders the planned path as a yellow line through 3D space
function PlannedPath({ path }: { path: [number, number, number][] }) {
    if (path.length < 2) return null;

    // remap coordinates to Three.js space (y is up in Three.js)
    const points = path.map(([x, y, z]) => [x, z, y] as [number, number, number]);

    return (
        <Line
            points={points}
            color="#ffff00"
            lineWidth={2}
        />
    );
}

export default function Scene3D({ state, plannedPath }: Props) {
    return (
        <Canvas style={{ position: 'absolute', top: 0, left: 0 }} className="w-full h-full">
            <PerspectiveCamera makeDefault position={[20, 120, 20]} />
            <OrbitControls />

            {/* lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />

            {/* ground grid */}
            <Grid
                args={[50, 50]}
                position={[0, 0, 0]}
                cellColor="#333333"
                sectionColor="#555555"
            />

            {/* origin marker */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.5]} />
                <meshStandardMaterial color="red" />
            </mesh>

            {/* planned path line */}
            <PlannedPath path={plannedPath} />

            {/* the drone */}
            <Drone state={state} />
        </Canvas>
    );
}