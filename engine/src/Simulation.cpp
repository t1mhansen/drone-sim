#include "Simulation.h"

Simulation::Simulation() : respawnTimer(0.0) {
    spawn();
}

void Simulation::spawn() {
    drone = DroneState();
    drone.z = 100.0;
    physics.trimToNeutral();
    if (physics.getConfig().type == DroneType::FIXED_WING) {
        drone.vx = 50.0;
    }
}

void Simulation::setConfig(const DroneConfig& config) {
    physics.applyConfig(config);
    world.reset();
    pendingEvents.push_back({WorldEventType::WorldReset, -1, 0, 0, 0});
    spawn();
    respawnTimer = 0.0;
}

void Simulation::setFlightInput(const FlightInput& input) {
    physics.applyFlightInput(input);
}

void Simulation::killRotor(int index) {
    physics.killRotor(index);
}

void Simulation::restoreRotor(int index, double throttle) {
    physics.restoreRotor(index, throttle);
}

void Simulation::reset() {
    world.reset();
    pendingEvents.push_back({WorldEventType::WorldReset, -1, 0, 0, 0});
    spawn();
    respawnTimer = 0.0;
}

std::vector<WorldEvent> Simulation::step() {
    std::vector<WorldEvent> events;
    events.swap(pendingEvents);

    if (drone.health > 0.0) {
        physics.update(drone);
        auto collisions = world.resolveCollisions(drone, physics.getConfig());
        events.insert(events.end(), collisions.begin(), collisions.end());
        if (drone.health <= 0.0) respawnTimer = RESPAWN_SECONDS;
    } else {
        // Inert wreck: hold position, count down, then respawn the drone.
        respawnTimer -= DT_SECONDS;
        if (respawnTimer <= 0.0) {
            spawn();
        }
    }

    return events;
}
