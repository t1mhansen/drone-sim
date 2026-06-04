#include "PhysicsEngine.h"
#include <cmath>
#include <algorithm>

namespace {
    // Rotorcraft control authority: how strongly pitch/roll/yaw bias per-rotor
    // throttle around the base (hover) throttle.
    constexpr double MIX_SCALE = 0.3;
    // Horizontal force per unit pitch/roll input (tilt-to-translate model).
    constexpr double HORIZONTAL_FORCE = 12.0;
    // Linear damping so velocity settles when the sticks are released, instead of
    // the drone drifting forever. Tuned for a controllable, non-floaty feel.
    constexpr double HORIZONTAL_DAMP = 0.6; // 1/s, on top of quadratic air drag
    constexpr double VERTICAL_DAMP   = 0.7; // 1/s, climbs/descents reach a steady rate

    // Fixed-wing: once above stall speed the wings carry the aircraft's weight
    // (capped, so it doesn't balloon at high speed); below it, lift falls off and
    // the plane sinks. Pitch is the elevator for climbing and diving.
    constexpr double FW_STALL_SPEED    = 28.0; // m/s; below this it stalls and drops
    constexpr double FW_ELEVATOR_ACCEL = 9.0;  // m/s^2 climb/dive authority at full pitch
    constexpr double FW_VERTICAL_DAMP  = 0.5;  // 1/s, settle the vertical rate
}

PhysicsEngine::PhysicsEngine()
    : rotors({Rotor(9.81), Rotor(9.81), Rotor(9.81), Rotor(9.81)}),
      killed(4, false),
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
    killed.assign(config.numRotors, false);
}

void PhysicsEngine::setFlightInput(const FlightInput& input) {
    currentInput = input;
}

double PhysicsEngine::hoverThrottle() const {
    if (config.numRotors <= 0 || config.maxThrustPerRotor <= 0.0) return 0.0;
    double h = (config.mass * 9.81) / (config.numRotors * config.maxThrustPerRotor);
    return std::min(h, 1.0);
}

void PhysicsEngine::trimToNeutral() {
    killed.assign(rotors.size(), false);
    if (config.type == DroneType::FIXED_WING) {
        for (auto& r : rotors) r.throttle = 0.5;
    } else {
        double hover = hoverThrottle();
        for (auto& r : rotors) r.throttle = hover;
    }
}

void PhysicsEngine::applyFlightInput(const FlightInput& input) {
    setFlightInput(input);

    if (config.type == DroneType::FIXED_WING) {
        // Throttle drives the single engine directly.
        if (!rotors.empty()) rotors[0].throttle = input.throttle;
    } else {
        // Map throttle [0,1] to [0, 2*hover] so 0.5 holds a hover, then bias
        // each rotor by pitch/roll/yaw based on its angular position.
        double base = input.throttle * 2.0 * hoverThrottle();
        int n = getRotorCount();
        for (int i = 0; i < n; i++) {
            double angle = (2.0 * M_PI * i) / n;
            double t = base
                     + input.pitch * std::cos(angle) * MIX_SCALE
                     + input.roll  * std::sin(angle) * MIX_SCALE
                     + input.yaw   * ((i % 2 == 0) ? 1.0 : -1.0) * MIX_SCALE;
            rotors[i].throttle = std::clamp(t, 0.0, 1.0);
        }
    }
    enforceKills();
}

void PhysicsEngine::killRotor(int index) {
    if (index >= 0 && index < (int)killed.size()) {
        killed[index] = true;
        rotors[index].throttle = 0.0;
    }
}

void PhysicsEngine::restoreRotor(int index, double throttle) {
    if (index >= 0 && index < (int)killed.size()) {
        killed[index] = false;
        rotors[index].throttle = throttle;
    }
}

bool PhysicsEngine::isRotorKilled(int index) const {
    return index >= 0 && index < (int)killed.size() && killed[index];
}

void PhysicsEngine::enforceKills() {
    for (size_t i = 0; i < rotors.size(); i++) {
        if (i < killed.size() && killed[i]) rotors[i].throttle = 0.0;
    }
}

void PhysicsEngine::update(DroneState& drone_state) {
    enforceKills();
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

        // Lift: the wings hold up the aircraft's full weight once it's past stall
        // speed, ramping in below that and capped above it (no high-speed balloon).
        double weight = config.mass * g;
        double speedFrac = horizontalSpeed / FW_STALL_SPEED;
        double lift = weight * std::min(1.0, speedFrac * speedFrac);

        // Elevator: pitch climbs or dives the plane.
        double elevatorAccel = currentInput.pitch * FW_ELEVATOR_ACCEL;

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
        result.vz = (lift - weight) / config.mass + elevatorAccel - FW_VERTICAL_DAMP * state.vz;
    } else {
        // Rotorcraft: thrust is vertical, pitch/roll produce horizontal force
        double thrustAcceleration = totalThrust / config.mass;
        double netAcceleration = thrustAcceleration - g;

        // Horizontal drag
        double horizontalSpeed = std::sqrt(state.vx * state.vx + state.vy * state.vy);
        double dragX = (horizontalSpeed > 0.01) ? -config.dragCoeff * state.vx * horizontalSpeed : 0.0;
        double dragY = (horizontalSpeed > 0.01) ? -config.dragCoeff * state.vy * horizontalSpeed : 0.0;

        // Pitch/roll input → horizontal force (models tilt-to-translate)
        double pitchForce = currentInput.pitch * HORIZONTAL_FORCE;
        double rollForce = currentInput.roll * HORIZONTAL_FORCE;

        result.x = state.vx;
        result.y = state.vy;
        result.z = state.vz;
        result.vx = dragX / config.mass + pitchForce - HORIZONTAL_DAMP * state.vx;
        result.vy = dragY / config.mass + rollForce - HORIZONTAL_DAMP * state.vy;
        result.vz = netAcceleration - VERTICAL_DAMP * state.vz;
    }

    return result;
}
