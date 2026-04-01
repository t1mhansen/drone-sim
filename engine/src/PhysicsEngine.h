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

private:
    std::vector<Rotor> rotors;
    DroneConfig config;
    FlightInput currentInput;
    RK4Integrator rk4Integrator;
    [[nodiscard]] DroneState computeDerivative(const DroneState& state) const;
};
