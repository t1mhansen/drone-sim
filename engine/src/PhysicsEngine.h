#pragma once
#include "DroneState.h"
#include "Rotor.h"
#include <array>


class PhysicsEngine {
    public:
    PhysicsEngine();
    void update(DroneState& drone_state);
    Rotor& getRotor(int index);
    private:
    std::array<Rotor, 4> rotors;

};
