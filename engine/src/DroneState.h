#pragma once

struct DroneState {
    // Position (x, y, z) in meters
    double x, y, z;

    // orientation as a quaternion
    double  qx, qy, qz, qw;

    // Linear velocity (x, y, z) in meters per second
    double vx, vy, vz;

    // Angular velocity (x, y, z) in radians per second
    double ax, ay, az;

    DroneState() :
    x(0), y(0), z(0),
    qx(0), qy(0), qz(0), qw(1),
    vx(0), vy(0), vz(0),
    ax(0), ay(0), az(0)
    {}
};
