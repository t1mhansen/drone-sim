#include <iostream>
#include <csignal>
#include "DroneState.h"
#include "PhysicsEngine.h"
#include "Logger.h"
#include "SharedMemory.h"
#include "CommandChannel.h"

static bool running = true;

void signalHandler(int signum) {
    running = false;
}

int main() {
    std::signal(SIGINT, signalHandler);

    std::cout << "Drone sim engine starting..." << std::endl;

    DroneState drone;
    PhysicsEngine physics;
    Logger logger("flight_log.json", 10);
    SharedMemory sharedMemory("/drone_state");
    CommandChannel commands("/drone_commands");

    drone.z = 100.0;

    for (int i = 0; i < 4; i++) {
        physics.getRotor(i).throttle = 0.375;
    }

    std::cout << "Start position: ("
              << drone.x << ", "
              << drone.y << ", "
              << drone.z << ")" << std::endl;

    while (running) {
        // read and process any incoming commands from Python
        Command cmd = commands.read();

        if (cmd.type != CommandType::NONE) {
            std::cout << "Received command: type=" << (int)cmd.type
                      << " rotor=" << cmd.rotor_index
                      << " throttle=" << cmd.throttle << std::endl;
        }

        if (cmd.type == CommandType::SET_THROTTLE) {
            // kill or adjust a specific rotor
            physics.getRotor(cmd.rotor_index).throttle = cmd.throttle;
            commands.clear();
        } else if (cmd.type == CommandType::RESET) {
            // restore all rotors to hover throttle
            for (int i = 0; i < 4; i++) {
                physics.getRotor(i).throttle = 0.375;
            }
            // reset velocity so drone stops falling immediately
            drone.vz = 0.0;
            drone.vx = 0.0;
            drone.vy = 0.0;
            commands.clear();
        }

        physics.update(drone);
        logger.log(drone);
        sharedMemory.write(drone);
    }

    std::cout << "Engine shutting down..." << std::endl;
    return 0;
}