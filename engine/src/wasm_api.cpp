// Browser-facing C API around the simulation core. Compiled to WebAssembly with
// Emscripten (see build_wasm.sh). The same PhysicsEngine / WorldCollision /
// Simulation code that runs natively over TCP runs here, in-process in the tab —
// no server required, which is what makes the hosted demo a single static link.
#include "Simulation.h"
#include <emscripten/emscripten.h>
#include <vector>

namespace {
    Simulation* g_sim = nullptr;
    double g_state[14];                 // latest DroneState, flat doubles
    std::vector<double> g_events;       // flattened [type, index, x, y, z] per event
}

extern "C" {

EMSCRIPTEN_KEEPALIVE void sim_init() {
    delete g_sim;
    g_sim = new Simulation();
}

EMSCRIPTEN_KEEPALIVE void sim_set_config(int type, int numRotors, int isKamikaze,
                                         double mass, double maxThrust,
                                         double drag, double lift) {
    if (!g_sim) sim_init();
    DroneConfig c;
    c.type = static_cast<DroneType>(type);
    c.numRotors = numRotors;
    c.isKamikaze = isKamikaze;
    c.mass = mass;
    c.maxThrustPerRotor = maxThrust;
    c.dragCoeff = drag;
    c.liftCoeff = lift;
    g_sim->setConfig(c);
}

EMSCRIPTEN_KEEPALIVE void sim_set_flight_input(double throttle, double pitch,
                                               double roll, double yaw) {
    if (g_sim) g_sim->setFlightInput({throttle, pitch, roll, yaw});
}

EMSCRIPTEN_KEEPALIVE void sim_kill_rotor(int i)              { if (g_sim) g_sim->killRotor(i); }
EMSCRIPTEN_KEEPALIVE void sim_restore_rotor(int i, double t) { if (g_sim) g_sim->restoreRotor(i, t); }
EMSCRIPTEN_KEEPALIVE void sim_reset()                        { if (g_sim) g_sim->reset(); }

// Advance `ticks` 1ms steps, collecting events; refresh the state buffer.
EMSCRIPTEN_KEEPALIVE void sim_step(int ticks) {
    if (!g_sim) return;
    g_events.clear();
    for (int i = 0; i < ticks; i++) {
        for (const auto& e : g_sim->step()) {
            g_events.push_back(static_cast<double>(static_cast<int>(e.type)));
            g_events.push_back(static_cast<double>(e.index));
            g_events.push_back(e.x);
            g_events.push_back(e.y);
            g_events.push_back(e.z);
        }
    }
    const DroneState& s = g_sim->state();
    const double* sp = &s.x; // DroneState is 14 contiguous doubles (static_assert'd)
    for (int i = 0; i < 14; i++) g_state[i] = sp[i];
}

EMSCRIPTEN_KEEPALIVE double* sim_state_ptr()  { return g_state; }
EMSCRIPTEN_KEEPALIVE int     sim_event_count(){ return static_cast<int>(g_events.size() / 5); }
EMSCRIPTEN_KEEPALIVE double* sim_events_ptr() { return g_events.data(); }

} // extern "C"
