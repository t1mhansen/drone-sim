#pragma once
#include <cstdint>

enum class DroneType : int32_t {
    ROTORCRAFT = 0,
    FIXED_WING = 1
};

struct DroneConfig {
    DroneType type;
    int32_t numRotors;
    int32_t isKamikaze;     // 1 = one-way munition: destroys what it hits and itself
    double mass;
    double maxThrustPerRotor;
    double dragCoeff;
    double liftCoeff;   // fixed-wing only: lift = liftCoeff * speed^2

    DroneConfig()
        : type(DroneType::ROTORCRAFT),
          numRotors(4),
          isKamikaze(0),
          mass(1.5),
          maxThrustPerRotor(9.81),
          dragCoeff(0.08),
          liftCoeff(0.0) {}
};
