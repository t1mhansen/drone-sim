from shared_memory import SharedMemoryReader
import time

reader = SharedMemoryReader("/drone_state")

for i in range(5):
    state = reader.read()
    print(f"Position: ({state.x:.3f}, {state.y:.3f}, {state.z:.3f})")
    time.sleep(.5)
reader.close()