// Lightweight assertion-based tests for the destruction model. No framework —
// just a tiny harness so `make test` stays dependency-free.
#include "../src/WorldCollision.h"
#include "../src/DroneConfig.h"
#include "../src/DroneState.h"
#include <cstdio>
#include <cmath>
#include <vector>

static int failures = 0;
#define CHECK(cond, msg) do { \
    if (!(cond)) { std::printf("  FAIL: %s\n", msg); failures++; } \
    else { std::printf("  ok:   %s\n", msg); } \
} while (0)

// Find an intact building and place the drone dead-center, just inside the top
// face, so resolveCollisions sees a real penetration.
static const Building& firstBuilding(const WorldCollision& w) {
    return w.getBuildings().front();
}

static DroneConfig rotorcraft(double mass, bool kamikaze) {
    DroneConfig c;
    c.type = DroneType::ROTORCRAFT;
    c.numRotors = 4;
    c.mass = mass;
    c.isKamikaze = kamikaze ? 1 : 0;
    return c;
}

int main() {
    std::printf("destruction model tests\n");

    // --- Kamikaze one-shots a building and detonates ---
    {
        WorldCollision world;
        const Building b = firstBuilding(world);
        DroneState d;
        d.x = (b.minX + b.maxX) / 2.0;
        d.y = (b.minY + b.maxY) / 2.0;
        d.z = b.height - 1.0;       // just inside the roof
        d.vz = -30.0;               // diving in
        auto events = world.resolveCollisions(d, rotorcraft(1.5, true));
        bool buildingGone = false, droneGone = false;
        for (auto& e : events) {
            if (e.type == WorldEventType::BuildingDestroyed) buildingGone = true;
            if (e.type == WorldEventType::DroneDestroyed) droneGone = true;
        }
        CHECK(buildingGone, "kamikaze destroys the building");
        CHECK(droneGone, "kamikaze destroys itself");
        CHECK(d.health <= 0.0, "kamikaze drone health hits zero");
        CHECK(world.getBuildings().front().destroyed, "building marked destroyed");
    }

    // --- A gentle touch destroys nothing ---
    {
        WorldCollision world;
        const Building b = firstBuilding(world);
        DroneState d;
        d.x = (b.minX + b.maxX) / 2.0;
        d.y = (b.minY + b.maxY) / 2.0;
        d.z = b.height - 1.0;
        d.vz = -1.0;                // slow drift
        double h0 = d.health;
        auto events = world.resolveCollisions(d, rotorcraft(0.4, false));
        CHECK(events.empty(), "soft touch produces no destruction events");
        CHECK(std::fabs(d.health - h0) < 1e-9, "soft touch deals no drone damage");
        CHECK(!world.getBuildings().front().destroyed, "soft touch leaves building intact");
        CHECK(d.z >= b.height - 1e-6, "soft touch pushes drone out to the roof");
    }

    // --- A heavy fast hit wrecks a weak building and damages the drone ---
    {
        WorldCollision world;
        // Pick the weakest (lowest-health) building so the hit is decisive.
        size_t weakest = 0;
        double minH = 1e18;
        for (size_t i = 0; i < world.getBuildings().size(); i++) {
            if (world.getBuildings()[i].health < minH) { minH = world.getBuildings()[i].health; weakest = i; }
        }
        const Building b = world.getBuildings()[weakest];
        DroneState d;
        d.x = (b.minX + b.maxX) / 2.0;
        d.y = (b.minY + b.maxY) / 2.0;
        d.z = b.height - 1.0;
        d.vz = -40.0;
        double h0 = d.health;
        auto events = world.resolveCollisions(d, rotorcraft(10.0, false));
        bool destroyed = false;
        for (auto& e : events) if (e.type == WorldEventType::BuildingDestroyed) destroyed = true;
        CHECK(destroyed, "heavy fast hit destroys a weak building");
        CHECK(d.health < h0, "heavy fast hit damages the drone");
    }

    // --- Reset restores destroyed buildings ---
    {
        WorldCollision world;
        const Building b = firstBuilding(world);
        DroneState d;
        d.x = (b.minX + b.maxX) / 2.0;
        d.y = (b.minY + b.maxY) / 2.0;
        d.z = b.height - 1.0;
        d.vz = -30.0;
        world.resolveCollisions(d, rotorcraft(1.5, true));
        CHECK(world.getBuildings().front().destroyed, "building destroyed before reset");
        world.reset();
        CHECK(!world.getBuildings().front().destroyed, "reset rebuilds the building");
        CHECK(world.getBuildings().front().health > 0.0, "reset restores building health");
    }

    std::printf("%s\n", failures == 0 ? "ALL PASS" : "SOME TESTS FAILED");
    return failures == 0 ? 0 : 1;
}
