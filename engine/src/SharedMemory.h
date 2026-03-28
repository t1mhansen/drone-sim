#pragma once
#include <string>
#include "DroneState.h"
#include <sys/mman.h> // POSIX header

class SharedMemory {
public:
    explicit SharedMemory(const std::string& name);
    ~SharedMemory();
    void write(const DroneState& state);
private:
    void* sharedData; // pointer to memory region
    int fileDescriptor; // OS handle to shared memory object
    std::string name; // name of shared memory regio s

};