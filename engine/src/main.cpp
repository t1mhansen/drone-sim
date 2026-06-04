#include <iostream>
#include <cstdlib>
#include <chrono>
#include <thread>
#include "DroneConfig.h"
#include "Simulation.h"
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

    Simulation sim;
    Logger logger("flight_log.json", 10);
    TcpServer server(port);

    std::cout << "Start position: ("
              << sim.state().x << ", " << sim.state().y << ", " << sim.state().z << ")" << std::endl;

    // Real-time loop: physics at 1000Hz, network I/O every iteration.
    using clock = std::chrono::steady_clock;
    constexpr auto PHYSICS_DT = std::chrono::microseconds(1000); // 1ms = 1000Hz
    constexpr int BROADCAST_INTERVAL = 33; // broadcast every ~33ms (~30Hz)
    int tickCount = 0;
    auto nextTick = clock::now();

    while (running) {
        auto now = clock::now();
        if (now < nextTick) {
            std::this_thread::sleep_until(nextTick);
        }
        nextTick += PHYSICS_DT;
        if (clock::now() - nextTick > std::chrono::milliseconds(50)) {
            nextTick = clock::now();
        }

        server.acceptClients();
        ParsedMessage msg = server.readMessages();

        if (msg.hasConfig) {
            std::cout << "Applying new drone config: type="
                      << (int)msg.config.type
                      << " rotors=" << msg.config.numRotors
                      << " kamikaze=" << msg.config.isKamikaze
                      << " mass=" << msg.config.mass << "kg" << std::endl;
            sim.setConfig(msg.config);
        }

        if (msg.hasFlightInput) {
            sim.setFlightInput(msg.flightInput);
        }

        Command& cmd = msg.command;
        if (cmd.type == CommandType::SET_THROTTLE) {
            if (cmd.throttle <= 0.0) sim.killRotor(cmd.rotor_index);
            else                     sim.restoreRotor(cmd.rotor_index, cmd.throttle);
        } else if (cmd.type == CommandType::RESET) {
            sim.reset();
        }

        for (const auto& e : sim.step()) {
            server.broadcastEvent(e);
        }

        logger.log(sim.state());

        tickCount++;
        if (tickCount >= BROADCAST_INTERVAL) {
            server.broadcastState(sim.state());
            tickCount = 0;
        }
    }

    std::cout << "Engine shutting down..." << std::endl;
    return 0;
}
