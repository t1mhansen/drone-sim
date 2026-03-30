// mirrors the DroneState struct from C++ and Python
export interface DroneState {
    // position in meters
    x: number;
    y: number;
    z: number;

    // orientation as quaternion
    qx: number;
    qy: number;
    qz: number;
    qw: number;

    // linear velocity in meters per second
    vx: number;
    vy: number;
    vz: number;

    // angular velocity in radians per second
    ax: number;
    ay: number;
    az: number;
}