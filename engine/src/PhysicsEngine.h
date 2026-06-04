#pragma once
#include "DroneState.h"
#include "DroneConfig.h"
#include "CommandChannel.h"
#include "Rotor.h"
#include <vector>
#include "RK4Integrator.h"

class PhysicsEngine {
public:
    PhysicsEngine();
    void update(DroneState& drone_state);
    Rotor& getRotor(int index);
    void applyConfig(const DroneConfig& config);
    const DroneConfig& getConfig() const;
    int getRotorCount() const;
    void setFlightInput(const FlightInput& input);

    // Throttle at which a rotorcraft exactly hovers (clamped to 1.0).
    double hoverThrottle() const;

    // Translate a WASD flight input into per-rotor throttles: direct engine
    // throttle for fixed-wing, differential-thrust mixing for rotorcraft.
    // Killed rotors are always re-pinned to zero afterwards.
    void applyFlightInput(const FlightInput& input);

    // Trim all rotors to a stable starting throttle (hover / cruise) and clear
    // any battle damage. Call when (re)spawning the drone.
    void trimToNeutral();

    // Fault injection.
    void killRotor(int index);
    void restoreRotor(int index, double throttle);
    bool isRotorKilled(int index) const;

private:
    std::vector<Rotor> rotors;
    std::vector<bool> killed;   // persistent rotor failures
    DroneConfig config;
    FlightInput currentInput;
    RK4Integrator rk4Integrator;
    void enforceKills();
    [[nodiscard]] DroneState computeDerivative(const DroneState& state) const;
};
