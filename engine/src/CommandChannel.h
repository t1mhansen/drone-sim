#pragma once

// Commands that Python can send to the C++ engine
enum class CommandType {
    NONE = 0,         // no command, normal operation
    SET_THROTTLE = 1, // set a specific rotor throttle
    RESET = 2,        // reset all rotors to hover
    SET_CONFIG = 3    // apply a new drone configuration
};

// A single command from Python to C++
struct Command {
    CommandType type;
    int rotor_index;  // which rotor (0-3)
    double throttle;  // new throttle value (0.0 - 1.0)
};
