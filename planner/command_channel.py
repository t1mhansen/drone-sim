import mmap
import struct
import posix_ipc

# command types must match C++ enum exactly
COMMAND_NONE = 0
COMMAND_SET_THROTTLE = 1
COMMAND_RESET = 2

# struct format: int (command type) + int (rotor index) + double (throttle)
# must match C++ Command struct memory layout exactly
COMMAND_FORMAT = 'iid'

class CommandChannelWriter:
    """Writes commands to the shared memory command channel for C++ to read."""

    COMMAND_SIZE = struct.calcsize(COMMAND_FORMAT)  # 16 bytes

    def __init__(self, name: str):
        self.memory = posix_ipc.SharedMemory(name)
        # use exact struct size, not the full shm size
        self.map = mmap.mmap(self.memory.fd, self.COMMAND_SIZE)
        print(f"Command struct size: {self.COMMAND_SIZE}, shm size: {self.memory.size}")

    def set_throttle(self, rotor_index: int, throttle: float):
        """Kill or adjust a specific rotor."""
        self.map.seek(0)
        self.map.write(struct.pack(COMMAND_FORMAT, COMMAND_SET_THROTTLE, rotor_index, throttle))

    def reset(self):
        """Restore all rotors to hover throttle."""
        self.map.seek(0)
        self.map.write(struct.pack(COMMAND_FORMAT, COMMAND_RESET, 0, 0.0))

    def close(self):
        self.map.close()
        self.memory.close()  # just close, don't unlink