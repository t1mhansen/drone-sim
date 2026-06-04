// Mirrors the DroneState struct from C++ and Python
export interface DroneState {
    x: number;
    y: number;
    z: number;
    qx: number;
    qy: number;
    qz: number;
    qw: number;
    vx: number;
    vy: number;
    vz: number;
    ax: number;
    ay: number;
    az: number;
    health: number; // 0..100 structural integrity
}

// Destruction events streamed from the engine.
export type WorldEventKind = 'building_destroyed' | 'drone_destroyed' | 'world_reset';

export interface WorldEvent {
    type: 'event';
    event: WorldEventKind;
    index: number;   // building index for building_destroyed, else -1
    x: number;
    y: number;
    z: number;
}

// A transient visual effect queued for the 3D scene to spawn (drone-space coords).
export interface SceneEffect {
    id: number;
    kind: 'building' | 'drone';
    x: number;
    y: number;
    z: number;
}

export interface DroneProfile {
    name: string;
    type: 'rotorcraft' | 'fixed_wing';
    description: string;
    pros: string[];
    cons: string[];
    specs: {
        max_speed: string;
        range: string;
        endurance: string;
        cost: string;
    };
    physics: {
        mass: number;
        num_rotors: number;
        max_thrust_per_rotor: number;
        drag_coeff: number;
        lift_coeff: number;
        is_kamikaze?: number;
    };
}

export interface DronesResponse {
    drones: Record<string, DroneProfile>;
    current: string;
}

export interface FlightInput {
    throttle: number;
    pitch: number;
    roll: number;
    yaw: number;
}
