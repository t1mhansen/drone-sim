#include "Rotor.h"

Rotor::Rotor(double maxThrust) : maxThrust(maxThrust), throttle(0.0) {}

double Rotor::getThrust() const {
    return throttle * maxThrust;
}
