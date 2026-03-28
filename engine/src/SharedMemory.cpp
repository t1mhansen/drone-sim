#include "SharedMemory.h"
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdexcept>
#include <cstring>

SharedMemory::SharedMemory(const std::string& name) : name(name), fileDescriptor(-1), sharedData(nullptr) {
    fileDescriptor = shm_open(name.c_str(), O_CREAT | O_RDWR, 0666);
    if (fileDescriptor == -1) {
        throw std::runtime_error("Failed to open shared memory");
    }
    ftruncate(fileDescriptor, sizeof(DroneState));
    sharedData = mmap(nullptr, sizeof(DroneState), PROT_READ | PROT_WRITE, MAP_SHARED, fileDescriptor, 0);
    if (sharedData == MAP_FAILED) {
        throw std::runtime_error("Failed to map shared memory");
    }
}

void SharedMemory::write(const DroneState& state) {
    if (!sharedData) {
        throw std::runtime_error("Shared memory not mapped");
    }

    // copy the raw bytes of 'state' into shared memory
    std::memcpy(sharedData, &state, sizeof(DroneState));
}

SharedMemory::~SharedMemory() {
    // unmap the shared memory region if it was mapped
    if (sharedData != nullptr && sharedData != MAP_FAILED) {
        munmap(sharedData, sizeof(DroneState));
        sharedData = nullptr;
    }
    // close the file descriptor if it was opened
    if (fileDescriptor != -1) {
        close(fileDescriptor);
        fileDescriptor = -1;
    }
    // remove the shared memory object
    shm_unlink(name.c_str());
}