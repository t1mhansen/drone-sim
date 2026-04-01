#include "PhysicsEngine.h"
#include <cmath>

PhysicsEngine::PhysicsEngine()
    : rotors({Rotor(9.81), Rotor(9.81), Rotor(9.81), Rotor(9.81)}),
      currentInput{0.0, 0.0, 0.0, 0.0},
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

void PhysicsEngine::setFlightInput(const FlightInput& input) {
    currentInput = input;
}

void PhysicsEngine::update(DroneState& drone_state) {
    rk4Integrator.integrate(drone_state, [this](const DroneState& state) {
        return computeDerivative(state);
    });
}

DroneState PhysicsEngine::computeDerivative(const DroneState& state) const {
    DroneState result;
    constexpr double g = 9.81;

    double totalThrust = 0.0;
    for (const auto& rotor : rotors) {
        totalThrust += rotor.getThrust();
    }

    if (config.type == DroneType::FIXED_WING) {
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

        // Drag
        double dragX = -config.dragCoeff * state.vx * horizontalSpeed;
        double dragY = -config.dragCoeff * state.vy * horizontalSpeed;

        // Lift from airspeed
        double lift = config.liftCoeff * horizontalSpeed * horizontalSpeed;

        // Elevator: pitch input adds vertical force
        double elevatorForce = currentInput.pitch * 15.0 * config.mass;

        // Rudder: yaw input rotates the velocity heading
        double yawRate = currentInput.yaw * 1.5;
        double cosYaw = std::cos(yawRate * 0.001); // dt = 0.001
        double sinYaw = std::sin(yawRate * 0.001);
        double rotVx = state.vx * cosYaw - state.vy * sinYaw;
        double rotVy = state.vx * sinYaw + state.vy * cosYaw;
        double yawForceX = (rotVx - state.vx) / 0.001 * config.mass;
        double yawForceY = (rotVy - state.vy) / 0.001 * config.mass;

        result.x = state.vx;
        result.y = state.vy;
        result.z = state.vz;
        result.vx = (thrustX + dragX + yawForceX) / config.mass;
        result.vy = (thrustY + dragY + yawForceY) / config.mass;
        result.vz = (lift + elevatorForce) / config.mass - g;
    } else {
        // Rotorcraft: thrust is vertical, pitch/roll produce horizontal force
        double thrustAcceleration = totalThrust / config.mass;
        double netAcceleration = thrustAcceleration - g;

        // Horizontal drag
        double horizontalSpeed = std::sqrt(state.vx * state.vx + state.vy * state.vy);
        double dragX = (horizontalSpeed > 0.01) ? -config.dragCoeff * state.vx * horizontalSpeed : 0.0;
        double dragY = (horizontalSpeed > 0.01) ? -config.dragCoeff * state.vy * horizontalSpeed : 0.0;

        // Pitch/roll input → horizontal force (models tilt-to-translate)
        double pitchForce = currentInput.pitch * 10.0;
        double rollForce = currentInput.roll * 10.0;

        // Yaw rotates the effective pitch/roll direction
        // For simplicity, pitch = +X, roll = +Y in world coords
        result.x = state.vx;
        result.y = state.vy;
        result.z = state.vz;
        result.vx = dragX / config.mass + pitchForce;
        result.vy = dragY / config.mass + rollForce;
        result.vz = netAcceleration;
    }

    return result;
}
