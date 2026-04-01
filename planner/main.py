import os
import time
from tcp_client import EngineClient

host = os.getenv("ENGINE_HOST", "localhost")
port = int(os.getenv("ENGINE_PORT", "9001"))

client = EngineClient(host, port)
client.connect()
client.start()

time.sleep(0.5)  # let the reader thread get some data

for i in range(5):
    state = client.read_state()
    print(f"Position: ({state.x:.3f}, {state.y:.3f}, {state.z:.3f})")
    time.sleep(0.5)

client.close()
