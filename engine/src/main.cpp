#include <iostream>
#include <csignal>
#include "DroneState.h"
#include "PhysicsEngine.h"
#include "Logger.h"
#include "SharedMemory.h"

static bool running = true;

void signalHandler(int signum) {
    running = false;
}

int main() {
    std::signal(SIGINT, signalHandler);

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

    while (running) {
        physics.update(drone);
        logger.log(drone);
        sharedMemory.write(drone);
    }

    std::cout << "Engine shutting down..." << std::endl;

    return 0;
}
