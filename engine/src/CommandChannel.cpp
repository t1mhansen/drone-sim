#include "CommandChannel.h"
#include <stdexcept>
#include <cstring>
#include <iostream>

CommandChannel::CommandChannel(const std::string& name) : name(name), fileDescriptor(-1), sharedData(nullptr) {
    // open or create shared memory region
    fileDescriptor = shm_open(name.c_str(), O_CREAT | O_RDWR, 0666);
    if (fileDescriptor == -1) {
        throw std::runtime_error("Failed to open command channel");
    }

    // set size to one Command struct
    ftruncate(fileDescriptor, sizeof(Command));
    std::cout << "Command struct size (C++): " << sizeof(Command) << std::endl;

    // map into process address space
    sharedData = mmap(nullptr, sizeof(Command), PROT_READ | PROT_WRITE, MAP_SHARED, fileDescriptor, 0);
    if (sharedData == MAP_FAILED) {
        throw std::runtime_error("Failed to map command channel");
    }

    // initialize with no command
    clear();
}

CommandChannel::~CommandChannel() {
    if (sharedData != nullptr && sharedData != MAP_FAILED) {
        munmap(sharedData, sizeof(Command));
    }
    if (fileDescriptor != -1) {
        close(fileDescriptor);
    }
    shm_unlink(name.c_str());
}

Command CommandChannel::read() const {
    Command cmd;
    std::memcpy(&cmd, sharedData, sizeof(Command));
    return cmd;
}

void CommandChannel::clear() {
    // write a NONE command to clear
    Command empty{CommandType::NONE, 0, 0.0};
    std::memcpy(sharedData, &empty, sizeof(Command));
}