import { useCallback, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DroneState, SceneEffect } from '../../types/drone';

// One explosion: a growing, fading fireball + flash light. Buildings get a
// shockwave ring; drone kills get a bigger, longer blast.
function Explosion({ effect, onDone }: { effect: SceneEffect; onDone: (id: number) => void }) {
    const group = useRef<THREE.Group>(null);
    const core = useRef<THREE.MeshStandardMaterial>(null);
    const shell = useRef<THREE.MeshStandardMaterial>(null);
    const ring = useRef<THREE.Mesh>(null);
    const light = useRef<THREE.PointLight>(null);
    const age = useRef(0);

    const big = effect.kind === 'drone';
    const ttl = big ? 1.2 : 0.8;
    const maxR = big ? 16 : 8;
    const lightPeak = big ? 600 : 280;

    useFrame((_, dt) => {
        age.current += dt;
        const t = Math.min(age.current / ttl, 1);
        if (age.current >= ttl) { onDone(effect.id); return; }

        const r = maxR * (0.25 + 0.75 * t);
        if (group.current) group.current.scale.setScalar(r);
        const fade = 1 - t;
        if (core.current) core.current.opacity = fade;
        if (shell.current) shell.current.opacity = 0.7 * fade;
        if (light.current) light.current.intensity = lightPeak * fade;
        if (ring.current) {
            ring.current.scale.setScalar(1 + t * 2.5);
            (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * fade;
        }
    });

    // drone-space (x, y, z) -> three-space (x, z, y)
    return (
        <group ref={group} position={[effect.x, effect.z, effect.y]}>
            <pointLight ref={light} color="#ff7722" intensity={lightPeak} distance={maxR * 6} />
            <mesh>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial ref={core} color="#ffdd66" emissive="#ffaa33" emissiveIntensity={4} transparent opacity={1} />
            </mesh>
            <mesh scale={1.6}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial ref={shell} color="#cc3300" emissive="#ff5500" emissiveIntensity={2} transparent opacity={0.7} />
            </mesh>
            <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.6, 2.0, 32]} />
                <meshBasicMaterial color="#ffcc88" transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// Pulls queued effects from the telemetry hook and renders live explosions.
export function Explosions({ drainEffects }: { drainEffects: () => SceneEffect[] }) {
    const [active, setActive] = useState<SceneEffect[]>([]);

    useFrame(() => {
        const fresh = drainEffects();
        if (fresh.length) setActive(prev => [...prev, ...fresh]);
    });

    const remove = useCallback((id: number) => {
        setActive(prev => prev.filter(e => e.id !== id));
    }, []);

    return (
        <>
            {active.map(e => <Explosion key={e.id} effect={e} onDone={remove} />)}
        </>
    );
}

// Small orange flash on hard velocity changes (bumps that don't destroy anything).
export function CollisionFlash({ state, onCollision }: { state: DroneState; onCollision?: () => void }) {
    const [flash, setFlash] = useState(false);
    const prevVel = useRef({ vx: 0, vy: 0, vz: 0 });
    const cooldown = useRef(0);

    useFrame(() => {
        if (cooldown.current > 0) {
            cooldown.current -= 1;
            if (cooldown.current <= 0) setFlash(false);
            return;
        }

        const prev = prevVel.current;
        const dvx = Math.abs(state.vx - prev.vx);
        const dvy = Math.abs(state.vy - prev.vy);
        const dvz = Math.abs(state.vz - prev.vz);
        const dv = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);

        if (dv > 5) {
            setFlash(true);
            cooldown.current = 15;
            onCollision?.();
        }

        prevVel.current = { vx: state.vx, vy: state.vy, vz: state.vz };
    });

    if (!flash) return null;

    return (
        <group position={[state.x, state.z, state.y]}>
            <pointLight color="#ff8800" intensity={200} distance={40} />
            <mesh>
                <sphereGeometry args={[3, 12, 12]} />
                <meshStandardMaterial color="#ff4400" emissive="#ff8800" emissiveIntensity={3} transparent opacity={0.5} />
            </mesh>
        </group>
    );
}
