#pragma once
#include <functional>
#include "DroneState.h"


class RK4Integrator {
    public:
    void integrate(DroneState& state, const std::function<DroneState(const DroneState&)>& derivative);
    explicit RK4Integrator(double dt);

private:
    double dt;
    static DroneState scaledAdd(const DroneState& state, const DroneState& derivative, double scale);
};