#include <iostream>
#include <cstdlib>
#include "DroneState.h"
#include "PhysicsEngine.h"
#include "Logger.h"
#include "TcpServer.h"

static bool running = true;

#ifdef _WIN32
#include <windows.h>
static BOOL WINAPI ConsoleHandler(DWORD signal) {
    if (signal == CTRL_C_EVENT || signal == CTRL_CLOSE_EVENT) {
        running = false;
        return TRUE;
    }
    return FALSE;
}
#else
#include <csignal>
void signalHandler(int signum) {
    running = false;
}
#endif

int main() {
#ifdef _WIN32
    SetConsoleCtrlHandler(ConsoleHandler, TRUE);
#else
    std::signal(SIGINT, signalHandler);
#endif

    std::cout << "Drone sim engine starting..." << std::endl;

    const char* portEnv = std::getenv("ENGINE_PORT");
    int port = portEnv ? std::atoi(portEnv) : 9001;

    DroneState drone;
    PhysicsEngine physics;
    Logger logger("flight_log.json", 10);
    TcpServer server(port);

    drone.z = 100.0;

    for (int i = 0; i < 4; i++) {
        physics.getRotor(i).throttle = 0.375;
    }

    std::cout << "Start position: ("
              << drone.x << ", "
              << drone.y << ", "
              << drone.z << ")" << std::endl;

    while (running) {
        // Accept any new client connections
        server.acceptClients();

        // Read and process any incoming commands from Python
        Command cmd = server.readCommand();

        if (cmd.type != CommandType::NONE) {
            std::cout << "Received command: type=" << (int)cmd.type
                      << " rotor=" << cmd.rotor_index
                      << " throttle=" << cmd.throttle << std::endl;
        }

        if (cmd.type == CommandType::SET_THROTTLE) {
            physics.getRotor(cmd.rotor_index).throttle = cmd.throttle;
        } else if (cmd.type == CommandType::RESET) {
            for (int i = 0; i < 4; i++) {
                physics.getRotor(i).throttle = 0.375;
            }
            drone.z = 100.0;
            drone.vz = 0.0;
            drone.vx = 0.0;
            drone.vy = 0.0;
        }

        physics.update(drone);
        logger.log(drone);
        server.broadcastState(drone);
    }

    std::cout << "Engine shutting down..." << std::endl;
    return 0;
}
