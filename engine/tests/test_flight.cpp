// Steady-state flight tests driven through the Simulation class — the same code
// path the native engine and the WASM build use. No framework, just asserts.
#include "../src/Simulation.h"
#include "../src/DroneConfig.h"
#include <cstdio>
#include <cmath>

static int failures = 0;
#define CHECK(cond, msg) do { \
    if (!(cond)) { std::printf("  FAIL: %s\n", msg); failures++; } \
    else { std::printf("  ok:   %s\n", msg); } \
} while (0)

static DroneConfig rotorcraft() {
    DroneConfig c;
    c.type = DroneType::ROTORCRAFT;
    c.numRotors = 4;
    c.mass = 1.5;
    c.maxThrustPerRotor = 9.81;
    c.dragCoeff = 0.08;
    return c;
}

static DroneConfig fixedWing() {
    DroneConfig c;
    c.type = DroneType::FIXED_WING;
    c.numRotors = 1;
    c.mass = 200.0;
    c.maxThrustPerRotor = 500.0;
    c.dragCoeff = 0.06;
    c.liftCoeff = 0.04;
    return c;
}

// Step the sim for the given number of 1ms ticks.
static void run(Simulation& sim, int ticks) {
    for (int i = 0; i < ticks; i++) sim.step();
}

int main() {
    std::printf("flight model tests\n");

    // --- Rotorcraft holds a hover at the neutral throttle ---
    {
        Simulation sim;
        sim.setConfig(rotorcraft());
        sim.setFlightInput({0.5, 0.0, 0.0, 0.0}); // 0.5 = hover
        run(sim, 2000); // 2 s
        const auto& s = sim.state();
        CHECK(std::fabs(s.z - 100.0) < 0.5, "rotorcraft holds altitude at hover throttle");
        CHECK(std::fabs(s.x) < 1.0 && std::fabs(s.y) < 1.0, "rotorcraft doesn't drift with no stick input");
    }

    // --- Throttle up climbs, throttle down descends ---
    {
        Simulation sim;
        sim.setConfig(rotorcraft());
        sim.setFlightInput({1.0, 0.0, 0.0, 0.0});
        run(sim, 1000);
        CHECK(sim.state().z > 101.0 && sim.state().vz > 0.0, "full throttle climbs");

        Simulation sim2;
        sim2.setConfig(rotorcraft());
        sim2.setFlightInput({0.0, 0.0, 0.0, 0.0});
        run(sim2, 1000);
        CHECK(sim2.state().z < 99.0 && sim2.state().vz < 0.0, "zero throttle descends");
    }

    // --- Fixed-wing cruises level and moves forward ---
    {
        Simulation sim;
        sim.setConfig(fixedWing());
        sim.setFlightInput({0.5, 0.0, 0.0, 0.0});
        run(sim, 2000); // 2 s
        const auto& s = sim.state();
        CHECK(std::fabs(s.z - 100.0) < 2.0, "fixed-wing holds altitude in level cruise");
        CHECK(s.x > 80.0, "fixed-wing moves forward (~cruise speed)");
        CHECK(s.health > 0.0, "fixed-wing stays intact in the air");
    }

    // --- Fixed-wing pitch is the elevator (W climbs) ---
    {
        Simulation sim;
        sim.setConfig(fixedWing());
        sim.setFlightInput({0.5, 1.0, 0.0, 0.0}); // pitch up
        run(sim, 1000);
        CHECK(sim.state().z > 101.0, "fixed-wing climbs with pitch-up (elevator)");
    }

    std::printf("%s\n", failures == 0 ? "ALL PASS" : "SOME TESTS FAILED");
    return failures == 0 ? 0 : 1;
}
