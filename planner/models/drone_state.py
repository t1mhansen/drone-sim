from dataclasses import dataclass

@dataclass
class DroneState:
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

    qx: float = 0.0
    qy: float = 0.0
    qz: float = 0.0
    qw: float = 1.0

    vx: float = 0.0
    vy: float = 0.0
    vz: float = 0.0

    ax: float = 0.0
    ay: float = 0.0
    az: float = 0.0