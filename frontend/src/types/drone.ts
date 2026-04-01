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
