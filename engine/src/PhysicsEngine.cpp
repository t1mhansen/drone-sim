#include "PhysicsEngine.h"
#include <cmath>

PhysicsEngine::PhysicsEngine()
    : rotors({Rotor(9.81), Rotor(9.81), Rotor(9.81), Rotor(9.81)}),
      rk4Integrator(0.001) {
}

Rotor& PhysicsEngine::getRotor(const int index) {
    return rotors[index];
}

int PhysicsEngine::getRotorCount() const {
    return static_cast<int>(rotors.size());
}

const DroneConfig& PhysicsEngine::getConfig() const {
    return config;
}

void PhysicsEngine::applyConfig(const DroneConfig& newConfig) {
    config = newConfig;
    rotors.clear();
    for (int i = 0; i < config.numRotors; i++) {
        rotors.emplace_back(config.maxThrustPerRotor);
    }
}

void PhysicsEngine::update(DroneState& drone_state) {
    rk4Integrator.integrate(drone_state, [this](const DroneState& state) {
        return computeDerivative(state);
    });

    // ground collision - stop at z = 0
    if (drone_state.z < 0.0) {
        drone_state.z = 0.0;
        drone_state.vz = 0.0;
        if (config.type == DroneType::FIXED_WING) {
            drone_state.vx = 0.0;
            drone_state.vy = 0.0;
        }
    }
}

DroneState PhysicsEngine::computeDerivative(const DroneState& state) const {
    DroneState result;
    constexpr double g = 9.81;

    double totalThrust = 0.0;
    for (const auto& rotor : rotors) {
        totalThrust += rotor.getThrust();
    }

    if (config.type == DroneType::FIXED_WING) {
        // Fixed-wing: thrust drives forward, lift comes from airspeed
        double horizontalSpeed = std::sqrt(state.vx * state.vx + state.vy * state.vy);

        // Thrust in direction of velocity (or +x if nearly stationary)
        double thrustX, thrustY;
        if (horizontalSpeed > 0.1) {
            thrustX = totalThrust * state.vx / horizontalSpeed;
            thrustY = totalThrust * state.vy / horizontalSpeed;
        } else {
            thrustX = totalThrust;
            thrustY = 0.0;
        }

        // Drag opposing velocity
        double dragX = -config.dragCoeff * state.vx * horizontalSpeed;
        double dragY = -config.dragCoeff * state.vy * horizontalSpeed;

        // Lift proportional to speed squared (acts upward)
        double lift = config.liftCoeff * horizontalSpeed * horizontalSpeed;

        result.x = state.vx;
        result.y = state.vy;
        result.z = state.vz;
        result.vx = (thrustX + dragX) / config.mass;
        result.vy = (thrustY + dragY) / config.mass;
        result.vz = lift / config.mass - g;
    } else {
        // Rotorcraft: thrust is vertical
        double thrustAcceleration = totalThrust / config.mass;
        double netAcceleration = thrustAcceleration - g;

        // Horizontal drag for rotorcraft
        double horizontalSpeed = std::sqrt(state.vx * state.vx + state.vy * state.vy);
        double dragX = (horizontalSpeed > 0.01) ? -config.dragCoeff * state.vx * horizontalSpeed : 0.0;
        double dragY = (horizontalSpeed > 0.01) ? -config.dragCoeff * state.vy * horizontalSpeed : 0.0;

        result.x = state.vx;
        result.y = state.vy;
        result.z = state.vz;
        result.vx = dragX / config.mass;
        result.vy = dragY / config.mass;
        result.vz = netAcceleration;
    }

    return result;
}
