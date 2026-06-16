import { Canvas } from '@react-three/fiber';
import type { DroneState, DroneProfile, SceneEffect } from '../types/drone';
import UrbanEnvironment from './UrbanEnvironment';
import { Drone } from './scene/DroneMeshes';
import { CameraController, OrbitCameraController, type CameraMode } from './scene/Cameras';
import { Explosions, CollisionFlash } from './scene/Effects';

interface Props {
    state: DroneState;
    droneProfile: DroneProfile | null;
    cameraMode: CameraMode;
    killedRotors: Set<number>;
    destroyedBuildings: Set<number>;
    drainEffects: () => SceneEffect[];
    onCollision?: () => void;
}

export default function Scene3D({
    state, droneProfile, cameraMode, killedRotors, destroyedBuildings, drainEffects, onCollision,
}: Props) {
    return (
        <Canvas
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            camera={{ position: [20, 120, 20], fov: 60, near: 0.5, far: 2000 }}
        >
            <fog attach="fog" args={['#2a3040', 200, 1200]} />
            <color attach="background" args={['#1a2030']} />

            <CameraController state={state} mode={cameraMode} profile={droneProfile} />
            {cameraMode === 'orbit' && <OrbitCameraController state={state} />}

            <ambientLight intensity={0.5} />
            <directionalLight position={[300, 400, 200]} intensity={1.5} color="#fff5e0" />
            <directionalLight position={[-100, 200, -100]} intensity={0.4} color="#8899bb" />
            <hemisphereLight args={['#8899bb', '#334455', 0.6]} />

            <UrbanEnvironment destroyedBuildings={destroyedBuildings} />
            <Drone state={state} profile={droneProfile} killedRotors={killedRotors} />
            <CollisionFlash state={state} onCollision={onCollision} />
            <Explosions drainEffects={drainEffects} />
        </Canvas>
    );
}
