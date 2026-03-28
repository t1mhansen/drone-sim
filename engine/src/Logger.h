#pragma once
#include <fstream>
#include <string>
#include "DroneState.h"

class Logger {
public:
    Logger(const std::string& fileName, int logInterval);
    void log(const DroneState& state);

private:
    std::ofstream file;
    int logInterval;
    int stepCount;
    double timestamp;
};