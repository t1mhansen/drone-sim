#include "Logger.h"

Logger::Logger(const std::string& fileName, int logInterval)
    : file(fileName), logInterval(logInterval), stepCount(0), timestamp(0.0)
{}

void Logger::log(const DroneState &state) {
    stepCount++;
    timestamp += 0.001;
    if (stepCount % logInterval == 0) {
        file << "{"
         << "\"timestamp\":" << timestamp << ","
        // position
         << "\"x\":" << state.x << ","
        << "\"y\":" << state.y << ","
        << "\"z\":" << state.z << ","
        // orientation quaternion
        << "\"qx\":" << state.qx << ","
        << "\"qy\":" << state.qy << ","
        << "\"qz\":" << state.qz << ","
        << "\"qw\":" << state.qw << ","
        // Linear velocity
        << "\"vx\":" << state.vx << ","
        << "\"vy\":" << state.vy << ","
        << "\"vz\":" << state.vz << ","
        // angular velocity
        << "\"ax\":" << state.ax << ","
        << "\"ay\":" << state.ay << ","
        << "\"az\":" << state.az
        << "}\n";
    }
}
