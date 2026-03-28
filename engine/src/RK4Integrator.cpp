#include "RK4Integrator.h"


RK4Integrator::RK4Integrator(double dt) : dt(dt) {}

void RK4Integrator::integrate(DroneState& state, const std::function<DroneState(const DroneState&)>& derivative) {

    // 4 samples
    DroneState k1 = derivative(state);
    DroneState k2 = derivative(scaledAdd(state, k1, dt / 2.0));
    DroneState k3 = derivative(scaledAdd(state, k2, dt / 2.0));
    DroneState k4 = derivative(scaledAdd(state, k3, dt));

    // weighted average
    state.x += (dt / 6.0) * (k1.x + 2*k2.x + 2*k3.x + k4.x);
    state.y += (dt / 6.0) * (k1.y + 2*k2.y + 2*k3.y + k4.y);
    state.z += (dt / 6.0) * (k1.z + 2*k2.z + 2*k3.z + k4.z);
    state.vx += (dt / 6.0) * (k1.vx + 2*k2.vx + 2*k3.vx + k4.vx);
    state.vy += (dt / 6.0) * (k1.vy + 2*k2.vy + 2*k3.vy + k4.vy);
    state.vz += (dt / 6.0) * (k1.vz + 2*k2.vz + 2*k3.vz + k4.vz);
}

DroneState RK4Integrator::scaledAdd(const DroneState& state, const DroneState& k, double scale) {
    DroneState result;
    result.x  = state.x  + k.x  * scale;
    result.y  = state.y  + k.y  * scale;
    result.z  = state.z  + k.z  * scale;
    result.vx = state.vx + k.vx * scale;
    result.vy = state.vy + k.vy * scale;
    result.vz = state.vz + k.vz * scale;
    return result;
}

