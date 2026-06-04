import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { DroneState, DroneProfile } from '../../types/drone';

export type CameraMode = 'chase' | 'fpv' | 'orbit';

export function CameraController({ state, mode, profile }: {
    state: DroneState;
    mode: CameraMode;
    profile: DroneProfile | null;
}) {
    const { camera } = useThree();
    const smoothPos = useRef(new THREE.Vector3(20, 120, 20));
    const smoothTarget = useRef(new THREE.Vector3(0, 0, 0));
    const prevMode = useRef<CameraMode>(mode);

    useFrame(() => {
        // On mode switch, seed smoothPos from current camera so transition is smooth.
        if (prevMode.current !== mode) {
            smoothPos.current.copy(camera.position);
            prevMode.current = mode;
        }

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

export function OrbitCameraController({ state }: { state: DroneState }) {
    const controlsRef = useRef<any>(null);

    useFrame(() => {
        if (controlsRef.current) {
            controlsRef.current.target.set(state.x, state.z, state.y);
            controlsRef.current.update();
        }
    });

    return <OrbitControls ref={controlsRef} />;
}
