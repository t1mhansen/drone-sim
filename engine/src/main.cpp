#include <iostream>
#include <cstdlib>
#include <cmath>
#include <algorithm>
#include "DroneState.h"
#include "DroneConfig.h"
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

static void resetDrone(DroneState& drone, PhysicsEngine& physics) {
    const auto& config = physics.getConfig();

    drone = DroneState();
    drone.z = 100.0;

    if (config.type == DroneType::FIXED_WING) {
        // Fixed-wing starts with forward velocity to maintain lift
        drone.vx = 50.0;
        for (int i = 0; i < physics.getRotorCount(); i++) {
            physics.getRotor(i).throttle = 0.5;
        }
    } else {
        // Rotorcraft: compute hover throttle = (mass * g) / (numRotors * maxThrustPerRotor)
        double hoverThrottle = (config.mass * 9.81) /
            (config.numRotors * config.maxThrustPerRotor);
        if (hoverThrottle > 1.0) hoverThrottle = 1.0;
        for (int i = 0; i < physics.getRotorCount(); i++) {
            physics.getRotor(i).throttle = hoverThrottle;
        }
    }
}

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

    resetDrone(drone, physics);

    std::cout << "Start position: ("
              << drone.x << ", "
              << drone.y << ", "
              << drone.z << ")" << std::endl;

    while (running) {
        server.acceptClients();

        ParsedMessage msg = server.readMessages();

        // Handle config change (drone swap)
        if (msg.hasConfig) {
            std::cout << "Applying new drone config: type="
                      << (int)msg.config.type
                      << " rotors=" << msg.config.numRotors
                      << " mass=" << msg.config.mass << "kg"
                      << std::endl;
            physics.applyConfig(msg.config);
            resetDrone(drone, physics);
        }

        // Handle flight input (WASD controls)
        if (msg.hasFlightInput) {
            physics.setFlightInput(msg.flightInput);
            if (physics.getConfig().type == DroneType::FIXED_WING) {
                // Fixed-wing: throttle controls engine directly
                if (physics.getRotorCount() > 0) {
                    physics.getRotor(0).throttle = msg.flightInput.throttle;
                }
            } else {
                // Rotorcraft: mix throttle/pitch/roll/yaw into per-rotor thrust
                int n = physics.getRotorCount();
                double mixScale = 0.3;
                for (int i = 0; i < n; i++) {
                    double angle = (2.0 * M_PI * i) / n;
                    double t = msg.flightInput.throttle
                             + msg.flightInput.pitch * std::cos(angle) * mixScale
                             + msg.flightInput.roll * std::sin(angle) * mixScale
                             + msg.flightInput.yaw * ((i % 2 == 0) ? 1.0 : -1.0) * mixScale;
                    physics.getRotor(i).throttle = std::clamp(t, 0.0, 1.0);
                }
            }
        }

        // Handle commands
        Command& cmd = msg.command;
        if (cmd.type != CommandType::NONE) {
            std::cout << "Received command: type=" << (int)cmd.type
                      << " rotor=" << cmd.rotor_index
                      << " throttle=" << cmd.throttle << std::endl;
        }

        if (cmd.type == CommandType::SET_THROTTLE) {
            if (cmd.rotor_index >= 0 && cmd.rotor_index < physics.getRotorCount()) {
                physics.getRotor(cmd.rotor_index).throttle = cmd.throttle;
            }
        } else if (cmd.type == CommandType::RESET) {
            resetDrone(drone, physics);
        }

        physics.update(drone);
        logger.log(drone);
        server.broadcastState(drone);
    }

    std::cout << "Engine shutting down..." << std::endl;
    return 0;
}
