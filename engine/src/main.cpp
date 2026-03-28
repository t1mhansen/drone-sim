#include <iostream>

#include "DroneState.h"
#include "PhysicsEngine.h"
#include "Logger.h"
#include "SharedMemory.h"


int main() {
    std::cout << "Drone sim engine starting..." << std::endl;

    DroneState drone;
    PhysicsEngine physics;
    Logger logger("flight_log.json",10);
    SharedMemory sharedMemory("/drone_state");

    drone.z = 100.0;

    for (int i = 0; i < 4; i++) {
        physics.getRotor(i).throttle = 0.375;
    }

    std::cout << "Start position: ("
              << drone.x << ", "
              << drone.y << ", "
              << drone.z << ")" << std::endl;

    while (true) {
        physics.update(drone);
        logger.log(drone);
        sharedMemory.write(drone);
    }

    std::cout << "End position: ("
             << drone.x << ", "
             << drone.y << ", "
             << drone.z << ")" << std::endl;

    return 0;
}
