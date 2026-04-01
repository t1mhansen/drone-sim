import socket
import struct
import threading
import time
from models.drone_state import DroneState

# Wire protocol constants (must match C++ TcpServer)
MSG_TYPE_STATE = 0x01
MSG_TYPE_COMMAND = 0x02
MSG_TYPE_CONFIG = 0x03
HEADER_SIZE = 5  # 4-byte LE length + 1-byte type
STATE_PAYLOAD = 104  # 13 doubles
COMMAND_PAYLOAD = 16  # int32 + int32 + float64
CONFIG_PAYLOAD = 40  # int32 + int32 + 4 doubles

# Command types (must match C++ CommandType enum)
COMMAND_SET_THROTTLE = 1
COMMAND_RESET = 2


class EngineClient:
    """TCP client that connects to the C++ drone engine for bidirectional IPC."""

    def __init__(self, host: str = "localhost", port: int = 9001):
        self.host = host
        self.port = port
        self._sock: socket.socket | None = None
        self._lock = threading.Lock()
        self._send_lock = threading.Lock()
        self._latest_state = DroneState()
        self._running = False
        self._thread: threading.Thread | None = None
        self._connected = False

    def connect(self):
        """Connect to engine with retry and exponential backoff."""
        delay = 1.0
        max_delay = 10.0
        while True:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.connect((self.host, self.port))
                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                self._sock = sock
                self._connected = True
                print(f"Connected to engine at {self.host}:{self.port}")
                return
            except OSError as e:
                print(f"Connection to engine failed ({e}), retrying in {delay:.0f}s...")
                time.sleep(delay)
                delay = min(delay * 2, max_delay)

    def start(self):
        """Start the background reader thread."""
        self._running = True
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()

    def _read_loop(self):
        """Background thread: read framed messages from engine, update latest state."""
        buf = b""
        while self._running:
            if not self._connected or self._sock is None:
                self._reconnect()
                buf = b""
                continue

            try:
                data = self._sock.recv(4096)
                if not data:
                    raise ConnectionError("Engine closed connection")
                buf += data
            except OSError:
                self._connected = False
                continue

            # Parse complete frames from buffer
            while len(buf) >= HEADER_SIZE:
                payload_len = struct.unpack_from("<I", buf, 0)[0]
                msg_type = buf[4]
                frame_size = HEADER_SIZE + payload_len

                if len(buf) < frame_size:
                    break  # Incomplete frame

                if msg_type == MSG_TYPE_STATE and payload_len == STATE_PAYLOAD:
                    values = struct.unpack_from("<13d", buf, HEADER_SIZE)
                    with self._lock:
                        self._latest_state = DroneState(*values)

                buf = buf[frame_size:]

    def _reconnect(self):
        """Reconnect to engine after connection loss."""
        if self._sock:
            try:
                self._sock.close()
            except OSError:
                pass
            self._sock = None
        print("Lost connection to engine, reconnecting...")
        self.connect()

    def read_state(self) -> DroneState:
        """Return the most recent drone state (thread-safe)."""
        with self._lock:
            return self._latest_state

    def _send_command(self, cmd_type: int, rotor_index: int, throttle: float):
        """Send a framed command message to the engine."""
        payload = struct.pack("<iid", cmd_type, rotor_index, throttle)
        header = struct.pack("<IB", len(payload), MSG_TYPE_COMMAND)
        with self._send_lock:
            if self._sock and self._connected:
                try:
                    self._sock.sendall(header + payload)
                except OSError as e:
                    print(f"Failed to send command: {e}")
                    self._connected = False

    def send_set_throttle(self, rotor_index: int, throttle: float):
        """Send a SET_THROTTLE command to the engine."""
        self._send_command(COMMAND_SET_THROTTLE, rotor_index, throttle)

    def send_reset(self):
        """Send a RESET command to the engine."""
        self._send_command(COMMAND_RESET, 0, 0.0)

    def send_config(self, drone_type: int, num_rotors: int, mass: float,
                    max_thrust_per_rotor: float, drag_coeff: float, lift_coeff: float):
        """Send a drone configuration to the engine (triggers drone swap)."""
        payload = struct.pack("<ii4d", drone_type, num_rotors,
                              mass, max_thrust_per_rotor, drag_coeff, lift_coeff)
        header = struct.pack("<IB", len(payload), MSG_TYPE_CONFIG)
        with self._send_lock:
            if self._sock and self._connected:
                try:
                    self._sock.sendall(header + payload)
                except OSError as e:
                    print(f"Failed to send config: {e}")
                    self._connected = False

    def close(self):
        """Stop background thread and close socket."""
        self._running = False
        if self._sock:
            try:
                self._sock.close()
            except OSError:
                pass
