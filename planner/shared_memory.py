import mmap
import struct
import posix_ipc
from models.drone_state import DroneState

class SharedMemoryReader:
    def __init__(self, name: str):
        self.memory = posix_ipc.SharedMemory(name)
        self.map = mmap.mmap(self.memory.fd, self.memory.size)

    def read(self):
        self.map.seek(0)
        data = self.map.read(struct.calcsize("13d"))
        values = struct.unpack("13d", data)
        return DroneState(*values)
    def close(self):
        self.map.close()
        self.memory.unlink()
