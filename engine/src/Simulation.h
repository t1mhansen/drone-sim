#pragma once
#include "DroneState.h"
#include "DroneConfig.h"
#include "CommandChannel.h"
#include "PhysicsEngine.h"
#include "WorldCollision.h"
#include <vector>

// The whole simulation in one object: physics, world, the drone, and the
// respawn lifecycle. Both the native engine (main.cpp, over TCP) and the
// browser build (wasm_api.cpp) drive the exact same logic through this class,
// so flight feel and destruction behavior stay identical across deployments.
class Simulation {
public:
    Simulation();

    // Swap the drone profile. Rebuilds the city and respawns; queues a WorldReset.
    void setConfig(const DroneConfig& config);

    void setFlightInput(const FlightInput& input);
    void killRotor(int index);
    void restoreRotor(int index, double throttle);

    // Full reset: rebuild the city and respawn the drone. Queues a WorldReset.
    void reset();

    // Advance one 1ms physics tick. Returns any world events produced this tick
    // (collision destruction plus queued resets).
    std::vector<WorldEvent> step();

    const DroneState& state() const { return drone; }
    const DroneConfig& config() const { return physics.getConfig(); }
    const std::vector<Building>& buildings() const { return world.getBuildings(); }

private:
    void spawn();

    DroneState drone;
    PhysicsEngine physics;
    WorldCollision world;
    double respawnTimer;
    std::vector<WorldEvent> pendingEvents;

    static constexpr double DT_SECONDS = 0.001;
    static constexpr double RESPAWN_SECONDS = 2.5;
};
