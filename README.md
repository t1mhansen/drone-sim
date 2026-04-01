# drone-sim

A military drone flight simulator built across three languages. Fly real-world drone profiles — FPV kamikazes, DJI Mavics, Shahed-136 cruise missiles — with keyboard controls over a procedural urban combat zone. The core is a C++ physics engine running at 1000Hz, a Python backend bridging telemetry and controls via WebSocket, and a React/Three.js frontend rendering everything live in 3D.

---

## What it does

- **Fly 5 real drone profiles** — FPV Racing, DJI Mavic 3, Ukraine FPV Kamikaze, DJI Matrice 600, Shahed-136. Each has real-world physics parameters (mass, thrust, drag, lift) that produce distinct flight characteristics.
- **Two flight models** — Rotorcraft (quad/hex/octo) with differential thrust mixing, and fixed-wing with airspeed-dependent lift, elevator, and rudder controls.
- **WASD flight controls** — Keyboard input captured at 30Hz. Throttle is cumulative (Space/Shift), pitch/roll/yaw are momentary. Different key mappings for rotorcraft vs fixed-wing.
- **Three camera modes** — Chase (smooth follow behind/above), FPV (first-person at drone), Orbit (free camera tracking drone). Press C to cycle.
- **Urban combat environment** — Procedurally generated city with ~100 buildings, road grid, and vehicle targets. Deterministic seed so the city is consistent across sessions.
- **Live telemetry HUD** — Speed (m/s + km/h), heading, vertical speed, altitude, position. All streaming at 30Hz from the physics engine.
- **Fault injection** — Kill individual rotors mid-flight to simulate battle damage. Reset to recover.

---

## Architecture

```
C++ Engine (1000Hz physics)
    |  TCP socket (binary protocol, port 9001)
Python Server (FastAPI)
    |  WebSocket (bidirectional, 30Hz telemetry + flight input)
React Frontend (Three.js)
```

Three separate processes communicating over TCP. The engine broadcasts drone state and accepts commands (throttle, config, flight input, reset). The Python server connects as a TCP client, relays flight controls from the browser to the engine, and streams telemetry back. In production it also serves the built frontend.

```
drone-sim/
├── engine/                       # C++ physics core (CMake)
│   └── src/
│       ├── DroneState.h          # 13-variable state (pos, quat, vel, accel)
│       ├── DroneConfig.h         # configurable drone physics params
│       ├── PhysicsEngine.cpp     # rotorcraft + fixed-wing flight models
│       ├── Rotor.cpp             # thrust model per rotor
│       ├── RK4Integrator.cpp     # 4th-order Runge-Kutta integration
│       ├── TcpServer.cpp         # cross-platform TCP IPC (Win/Mac/Linux)
│       ├── CommandChannel.h      # command types + flight input struct
│       ├── main.cpp              # main loop with rotorcraft mixer
│       └── Logger.cpp            # JSON flight logging
├── planner/                      # Python server
│   ├── api/
│   │   └── server.py             # FastAPI + bidirectional WebSocket
│   ├── tcp_client.py             # TCP client to C++ engine
│   ├── drone_profiles.py         # 5 military drone presets
│   └── models/
│       └── drone_state.py        # Python DroneState dataclass
└── frontend/                     # React/TypeScript (Vite)
    └── src/
        ├── components/
        │   ├── Scene3D.tsx        # 3D scene + camera controller
        │   ├── UrbanEnvironment   # procedural city generator
        │   ├── TelemetryHUD.tsx   # speed, heading, altitude overlay
        │   ├── FlightControls.tsx # visual key state + throttle bar
        │   ├── DroneSelector.tsx  # drone profile picker with specs
        │   └── FaultInjection.tsx # rotor kill/reset panel
        └── hooks/
            ├── useTelemetry.ts    # bidirectional WebSocket hook
            └── useFlightControls  # keyboard capture at 30Hz
```

---

## The physics

Each drone is modeled with 13 state variables: position (x, y, z), orientation quaternion (qx, qy, qz, qw), linear velocity (vx, vy, vz), and angular velocity (ax, ay, az). Integration uses RK4 at a 1ms timestep.

**Rotorcraft model**: Each rotor produces `thrust = throttle * maxThrust`. A mixer translates pitch/roll/yaw input into per-rotor differential thrust based on angular position. Pitch and roll tilt the thrust vector to produce horizontal movement.

**Fixed-wing model**: A single engine produces thrust along the velocity vector. Lift scales with airspeed squared (`lift = liftCoeff * v²`). Pitch input applies elevator force (vertical), yaw input rotates the velocity heading (rudder). The drone stalls if it slows below a threshold.

**Drone profiles** differ in mass, rotor count, max thrust, drag coefficient, and lift coefficient. A heavy-lift DJI Matrice (6 rotors, 15kg) handles nothing like an FPV racing quad (4 rotors, 0.8kg) or a Shahed-136 cruise missile (fixed-wing, 200kg).

---

## Controls

### Rotorcraft (quad, hex, octo)
| Key | Action |
|-----|--------|
| W / S | Pitch forward / back |
| A / D | Roll left / right |
| Q / E | Yaw left / right |
| Space | Throttle up |
| Shift | Throttle down |
| C | Cycle camera mode |

### Fixed-wing (Shahed-136)
| Key | Action |
|-----|--------|
| W / S | Pitch up / down (elevator) |
| A / D | Yaw left / right (rudder) |
| Space | Throttle up |
| Shift | Throttle down |
| C | Cycle camera mode |

---

## Getting started

### Prerequisites

- CMake 3.20+
- C++17 compiler (clang++, g++, or MSVC)
- Python 3.11+
- Node.js 18+

Works on **macOS**, **Linux**, and **Windows**.

### C++ engine

```bash
cd engine
mkdir build && cd build
cmake ..
make          # or cmake --build . on Windows
./drone_sim_engine
```

The engine listens on TCP port 9001 by default. Set `ENGINE_PORT` to change it.

### Python server

```bash
cd planner
python3 -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python3 -m uvicorn api.server:app --port 8000
```

Set `ENGINE_HOST` and `ENGINE_PORT` if the engine is on a different host.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies API requests to the Python backend automatically.

### Docker

```bash
docker-compose up --build
```

Open `http://localhost:8000`. The planner builds the frontend into its image and serves it as static files.

---

## Demo

1. Start all three services (or just `docker-compose up`)
2. The drone spawns at 100m altitude over the city
3. Select a drone from the **Drone Selector** — each shows real specs, pros/cons
4. Fly with **WASD** — the flight controls HUD shows active keys and throttle
5. Press **C** to cycle between Chase, FPV, and Orbit cameras
6. Try the **Shahed-136** — it's fixed-wing, needs forward speed to stay airborne
7. Use **Fault Injection** to kill a rotor and watch the drone respond

---

## Built with

- C++17, CMake, cross-platform TCP sockets
- Python 3, FastAPI, WebSocket
- React, TypeScript, Vite, Three.js, @react-three/fiber
