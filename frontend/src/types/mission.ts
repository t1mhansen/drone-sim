// a single point in 3D space
export interface Waypoint {
    id: number;
    x: number;
    y: number;
    z: number;
}

// an obstacle in 3D space
export interface Obstacle {
    id: number;
    x: number;
    y: number;
    z: number;
}

// a planned path returned from the API
export interface Mission {
    algorithm: string;
    path: [number, number, number][];
    path_length: number;
    compute_time_ms: number;
}