#include <iostream>

#include "DroneState.h"
#include "PhysicsEngine.h"

int main() {
    std::cout << "Drone sim engine starting..." << std::endl;

    DroneState drone;
    PhysicsEngine physics;

    drone.z = 100.0;

    for (int i = 0; i < 4; i++) {
        physics.getRotor(i).throttle = 0.375;
    }

    std::cout << "Start position: ("
              << drone.x << ", "
              << drone.y << ", "
              << drone.z << ")" << std::endl;

    for (int i = 0; i < 1000; i++) {
        physics.update(drone);
    }

    std::cout << "End position: ("
             << drone.x << ", "
             << drone.y << ", "
             << drone.z << ")" << std::endl;

    return 0;
}
