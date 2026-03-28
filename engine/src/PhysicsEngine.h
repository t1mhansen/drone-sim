#pragma once
#include "DroneState.h"
#include "Rotor.h"
#include <array>
#include "RK4Integrator.h"

class PhysicsEngine {
    public:
    PhysicsEngine();
    void update(DroneState& drone_state);
    Rotor& getRotor(int index);
    private:
    std::array<Rotor, 4> rotors;
    RK4Integrator rk4Integrator;
    [[nodiscard]] DroneState computeDerivative(const DroneState& state) const ;

};
