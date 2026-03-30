import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import type { DroneState } from '../types/drone';

interface Props {
    state: DroneState;
}

// the drone mesh - a simple box body with 4 cylinder rotors
function Drone({ state }: Props) {
    return (
        <group position={[state.x, state.z, state.y]}>
            {/* drone body */}
            <mesh>
                <boxGeometry args={[1, 0.2, 1]} />
                <meshStandardMaterial color="#00ff88" />
            </mesh>

            {/* 4 rotors */}
            {[[-0.6, 0.1, -0.6], [0.6, 0.1, -0.6], [-0.6, 0.1, 0.6], [0.6, 0.1, 0.6]].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
                    <meshStandardMaterial color="#888888" />
                </mesh>
            ))}
        </group>
    );
}

export default function Scene3D({ state }: Props) {
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

            {/* the drone */}
            <Drone state={state} />
        </Canvas>
    );
}