#include "PhysicsEngine.h"

PhysicsEngine::PhysicsEngine() : rotors({Rotor(9.81), Rotor(9.81), Rotor(9.81), Rotor(9.81)}) {}

Rotor &PhysicsEngine::getRotor(const int index) {
    return rotors[index];
}


void PhysicsEngine::update(DroneState &drone_state) {
    constexpr double dt {0.001};  // timestep in seconds (1000Hz)
    constexpr double g {9.81};    // gravitational acceleration (m/s²)
    constexpr double mass {1.5}; // mass of the drone in kilograms

    double totalThrust {0.0};

    for (const auto& rotor : rotors) {
        totalThrust += rotor.getThrust();
    }

    const double thrustAcceleration = totalThrust / mass;

    // net vertical acceleration: thrust pushes up, gravity pulls down
    const double netAcceleration = thrustAcceleration - g;

    // update vertical velocity
    drone_state.vz += netAcceleration * dt;
    drone_state.x += drone_state.vx * dt;
    drone_state.y += drone_state.vy * dt;
    drone_state.z += drone_state.vz * dt;
}