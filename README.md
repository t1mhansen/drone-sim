# drone-sim

A full-stack autonomous drone simulation platform built across three languages, each chosen for where it actually makes sense. The core is a C++ physics engine running at 1000Hz, a Python backend handling path planning and a REST/WebSocket API, and a React/TypeScript frontend that renders everything live in 3D.

---

## What it does

- **Physics simulation** — 6-DOF rigid body simulation with rotor thrust modeling and an RK4 integrator for numerical stability.
- **Path planning** — A* and RRT* planners running head-to-head on the same missions, with a benchmarking API that compares path length and compute time.
- **Live telemetry** — Drone state streams from C++ → Python → React over WebSocket at 30Hz, downsampled from the 1000Hz physics loop.
- **Mission designer** — Place waypoints and obstacles, select an algorithm, launch. The planned path renders as a line in the 3D scene.
- **Fault injection** — Kill individual rotors mid-flight and watch the drone respond. Hit reset and it recovers.
- **Mission persistence** — Missions saved to SQLite.

---

## Architecture

```
C++ Engine (1000Hz)
    |  POSIX shared memory
Python Planner (FastAPI)
    |  WebSocket @ 30Hz
React Frontend (Three.js)
```

Three separate processes. Two shared memory regions — one for state (C++ -> Python) and one for commands (Python -> C++).

```
drone-sim/
├── engine/                       # C++ physics core (CMake)
│   └── src/
│       ├── DroneState.h          # 6-DOF state representation
│       ├── PhysicsEngine.cpp     # gravity, thrust, RK4 integration
│       ├── Rotor.cpp             # thrust model
│       ├── RK4Integrator.cpp     # numerical integration
│       ├── SharedMemory.cpp      # POSIX IPC (write)
│       ├── CommandChannel.cpp    # POSIX IPC (read commands)
│       └── Logger.cpp            # JSON flight logging
├── planner/                      # Python planning service
│   ├── planner/
│   │   ├── astar.py              # A* path planner
│   │   └── rrt_star.py           # RRT* path planner
│   ├── api/
│   │   └── server.py             # FastAPI + WebSocket
│   ├── database/
│   │   └── db.py                 # SQLite via SQLAlchemy
│   ├── shared_memory.py          # reads drone state from C++
│   └── command_channel.py        # writes commands to C++
└── frontend/                     # React/TypeScript (Vite)
    └── src/
        ├── components/
        │   ├── Scene3D.tsx        # Three.js 3D scene
        │   ├── TelemetryHUD.tsx   # live telemetry overlay
        │   ├── MissionPlanner.tsx # waypoint/obstacle UI
        │   └── FaultInjection.tsx # rotor kill/reset panel
        └── hooks/
            └── useTelemetry.ts    # WebSocket hook
```


## The physics

The drone is modeled as a rigid body with 13 state variables:

- **Position** — x, y, z in meters
- **Orientation** — quaternion (qx, qy, qz, qw) to avoid gimbal lock
- **Linear velocity** — vx, vy, vz in m/s
- **Angular velocity** — ax, ay, az in rad/s

Each rotor produces thrust proportional to throttle: `thrust = throttle × maxThrust`. Net vertical acceleration is `(totalThrust / mass) - g`.

Integration uses RK4 rather than Euler. The difference is measurable — free fall from 100m gives `95.0999m` with Euler vs the theoretical `95.095m` with RK4. Small over one second, significant over a long flight.

---

## Getting started

### Prerequisites

- macOS or Linux — Windows is not currently supported. POSIX shared memory is Unix-only. Adding Boost.Interprocess for cross-platform support is on the list.
- CMake 3.20+
- clang++ with C++17 support
- Python 3.11+
- Node.js 18+

### C++ engine

```bash
cd engine
mkdir build && cd build
cmake ..
make
./drone_sim_engine
```

### Python planner

```bash
cd planner
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn api.server:app --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Start the C++ engine first, then the Python server, then the frontend.

### Docker (Linux only)

```bash
docker-compose up
```

Then run the frontend separately with `npm run dev`. Note: Docker Compose works on Linux where `ipc: host` correctly shares POSIX shared memory between containers. On macOS, Docker Desktop runs in a Linux VM which isolates IPC namespaces — run the services natively instead.

---

## Demo

1. Start all three services
2. The drone appears in the 3D scene hovering at 100m
3. Use the **Mission Planner** panel to set waypoints and obstacles, select A* or RRT*, and launch — the planned path renders as a yellow line
4. Use the **Fault Injection** panel to kill a rotor — the drone falls under gravity
5. Hit **Reset** to restore hover

The **benchmark endpoint** at `/plan/benchmark` runs both planners on the same mission and returns a head-to-head comparison of path length and compute time.

---

## Things I'd add with more time

- Kalman filter for state estimation — bridging the gap between simulation and real sensor noise
- Replay UI — the flight logs are already in SQLite, just needs a frontend scrubber
- Split-view planner comparison — A* and RRT* running simultaneously on the same mission
- Boost.Interprocess to add Windows support

---

## Built with

- C++17, CMake, POSIX shared memory
- Python 3, FastAPI, SQLAlchemy, posix-ipc
- React, TypeScript, Vite, Three.js, @react-three/fiber