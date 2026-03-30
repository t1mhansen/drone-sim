#pragma once
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
#include <string>

// commands that Python can send to the C++ engine
enum class CommandType {
    NONE = 0,         // no command, normal operation
    SET_THROTTLE = 1, // set a specific rotor throttle
    RESET = 2         // reset all rotors to hover
};

// a single command from Python to C++
struct Command {
    CommandType type;
    int rotor_index;  // which rotor (0-3)
    double throttle;  // new throttle value (0.0 - 1.0)
};

class CommandChannel {
public:
    explicit CommandChannel(const std::string& name);
    ~CommandChannel();

    // read the latest command from shared memory
    Command read() const;

    // clear the command after processing
    void clear();

private:
    void* sharedData;
    int fileDescriptor;
    std::string name;
};