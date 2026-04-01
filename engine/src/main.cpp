#include <iostream>
#include <cstdlib>
#include <cmath>
#include <algorithm>
#include <chrono>
#include <thread>
#include <vector>
#include "DroneState.h"
#include "DroneConfig.h"
#include "PhysicsEngine.h"
#include "Logger.h"
#include "TcpServer.h"
#include "WorldCollision.h"

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

// Track killed rotors persistently (survive across flight input updates)
static std::vector<bool> killedRotors;

static void resetDrone(DroneState& drone, PhysicsEngine& physics) {
    const auto& config = physics.getConfig();

    drone = DroneState();
    drone.z = 100.0;

    // Clear all rotor kills
    killedRotors.assign(physics.getRotorCount(), false);

    if (config.type == DroneType::FIXED_WING) {
        drone.vx = 50.0;
        for (int i = 0; i < physics.getRotorCount(); i++) {
            physics.getRotor(i).throttle = 0.5;
        }
    } else {
        double hoverThrottle = (config.mass * 9.81) /
            (config.numRotors * config.maxThrustPerRotor);
        if (hoverThrottle > 1.0) hoverThrottle = 1.0;
        for (int i = 0; i < physics.getRotorCount(); i++) {
            physics.getRotor(i).throttle = hoverThrottle;
        }
    }
}

static double computeHoverThrottle(const DroneConfig& config) {
    double h = (config.mass * 9.81) / (config.numRotors * config.maxThrustPerRotor);
    return std::min(h, 1.0);
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
    WorldCollision world;
    Logger logger("flight_log.json", 10);
    TcpServer server(port);

    resetDrone(drone, physics);

    std::cout << "Start position: ("
              << drone.x << ", "
              << drone.y << ", "
              << drone.z << ")" << std::endl;

    // Real-time loop: physics at 1000Hz, network I/O every iteration
    using clock = std::chrono::steady_clock;
    constexpr auto PHYSICS_DT = std::chrono::microseconds(1000); // 1ms = 1000Hz
    constexpr int BROADCAST_INTERVAL = 33; // broadcast every ~33ms (~30Hz)
    int tickCount = 0;
    auto nextTick = clock::now();

    while (running) {
        // Sleep until next physics tick
        auto now = clock::now();
        if (now < nextTick) {
            std::this_thread::sleep_until(nextTick);
        }
        nextTick += PHYSICS_DT;

        // If we fell behind by more than 50ms, reset the clock
        if (clock::now() - nextTick > std::chrono::milliseconds(50)) {
            nextTick = clock::now();
        }

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
            const auto& config = physics.getConfig();

            if (config.type == DroneType::FIXED_WING) {
                // Fixed-wing: throttle controls engine directly
                if (physics.getRotorCount() > 0) {
                    physics.getRotor(0).throttle = msg.flightInput.throttle;
                }
            } else {
                // Rotorcraft: throttle 0.5 = hover, 0 = no thrust, 1 = max climb
                // Map input [0,1] to [0, 2*hoverThrottle], clamped to [0,1]
                double hover = computeHoverThrottle(config);
                double baseThrottle = msg.flightInput.throttle * 2.0 * hover;

                int n = physics.getRotorCount();
                double mixScale = 0.3;
                for (int i = 0; i < n; i++) {
                    double angle = (2.0 * M_PI * i) / n;
                    double t = baseThrottle
                             + msg.flightInput.pitch * std::cos(angle) * mixScale
                             + msg.flightInput.roll * std::sin(angle) * mixScale
                             + msg.flightInput.yaw * ((i % 2 == 0) ? 1.0 : -1.0) * mixScale;
                    physics.getRotor(i).throttle = std::clamp(t, 0.0, 1.0);
                }
            }
        }

        // Handle commands (AFTER flight input so kills stick)
        Command& cmd = msg.command;
        if (cmd.type != CommandType::NONE) {
            std::cout << "Received command: type=" << (int)cmd.type
                      << " rotor=" << cmd.rotor_index
                      << " throttle=" << cmd.throttle << std::endl;
        }

        if (cmd.type == CommandType::SET_THROTTLE) {
            if (cmd.rotor_index >= 0 && cmd.rotor_index < physics.getRotorCount()) {
                // Mark rotor as killed (throttle=0) or restored
                if (cmd.throttle <= 0.0) {
                    killedRotors[cmd.rotor_index] = true;
                } else {
                    killedRotors[cmd.rotor_index] = false;
                    physics.getRotor(cmd.rotor_index).throttle = cmd.throttle;
                }
            }
        } else if (cmd.type == CommandType::RESET) {
            resetDrone(drone, physics);
        }

        // Enforce killed rotors (always, regardless of mixer)
        for (int i = 0; i < physics.getRotorCount(); i++) {
            if (i < (int)killedRotors.size() && killedRotors[i]) {
                physics.getRotor(i).throttle = 0.0;
            }
        }

        physics.update(drone);
        world.resolveCollisions(drone, physics.getConfig());
        logger.log(drone);

        // Broadcast state at ~30Hz
        tickCount++;
        if (tickCount >= BROADCAST_INTERVAL) {
            server.broadcastState(drone);
            tickCount = 0;
        }
    }

    std::cout << "Engine shutting down..." << std::endl;
    return 0;
}
