#pragma once

// Commands that Python can send to the C++ engine
enum class CommandType {
    NONE = 0,         // no command, normal operation
    SET_THROTTLE = 1, // set a specific rotor throttle
    RESET = 2,        // reset all rotors to hover
    SET_CONFIG = 3,   // apply a new drone configuration
    FLIGHT_INPUT = 4  // composite flight control input
};

// A single command from Python to C++
struct Command {
    CommandType type;
    int rotor_index;  // which rotor (0-3)
    double throttle;  // new throttle value (0.0 - 1.0)
};

// High-level flight control input (from WASD)
struct FlightInput {
    double throttle;  // 0.0 to 1.0
    double pitch;     // -1.0 to 1.0 (forward/back)
    double roll;      // -1.0 to 1.0 (left/right)
    double yaw;       // -1.0 to 1.0 (rotate)
};
