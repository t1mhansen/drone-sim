#include "PhysicsEngine.h"

PhysicsEngine::PhysicsEngine() : rotors({Rotor(9.81), Rotor(9.81), Rotor(9.81), Rotor(9.81)}), rk4Integrator(0.001) {
}

Rotor &PhysicsEngine::getRotor(const int index) {
    return rotors[index];
}


void PhysicsEngine::update(DroneState &drone_state) {
    rk4Integrator.integrate(drone_state, [this](const DroneState& state) {
        return computeDerivative(state);
    });
}

DroneState PhysicsEngine::computeDerivative(const DroneState &state) const {
    DroneState result;
    constexpr double g {9.81};
    constexpr double mass {1.5};

    double totalThrust {0.0};
    for (const auto& rotor : rotors) {
        totalThrust += rotor.getThrust();
    }
    const double thrustAcceleration = totalThrust / mass;

    // net vertical acceleration - thrust pushes up, gravity pulls down
    const double netAcceleration = thrustAcceleration - g;
    result.x = state.vx;
    result.y = state.vy;
    result.z = state.vz;
    result.vx = 0.0;
    result.vy = 0.0;
    result.vz = netAcceleration;
    return result;
}
