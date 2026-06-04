import type { DroneState, FlightInput, DronesResponse, WorldEventKind } from '../types/drone';
import type { SimClient, SimHandlers } from './SimClient';
import { DRONE_PROFILES, DEFAULT_DRONE, localDronesResponse } from './profiles';

// Emscripten module surface we use (see engine/src/wasm_api.cpp).
interface EngineModule {
    _sim_init(): void;
    _sim_set_config(type: number, numRotors: number, isKamikaze: number,
                    mass: number, maxThrust: number, drag: number, lift: number): void;
    _sim_set_flight_input(throttle: number, pitch: number, roll: number, yaw: number): void;
    _sim_kill_rotor(i: number): void;
    _sim_restore_rotor(i: number, t: number): void;
    _sim_reset(): void;
    _sim_step(ticks: number): void;
    _sim_state_ptr(): number;
    _sim_event_count(): number;
    _sim_events_ptr(): number;
    HEAPF64: Float64Array;
}

const TICKS_PER_FRAME = 33;   // 33 x 1ms ~= one 30Hz frame
const FRAME_MS = 1000 / 30;
const EVENT_NAMES: Record<number, WorldEventKind> = {
    1: 'building_destroyed',
    2: 'drone_destroyed',
    3: 'world_reset',
};

// Runs the whole simulation in-browser via the WASM-compiled C++ core. No server.
export class WasmClient implements SimClient {
    private mod: EngineModule | null = null;
    private handlers: SimHandlers | null = null;
    private timer: number | null = null;
    private current = DEFAULT_DRONE;

    async start(handlers: SimHandlers) {
        this.handlers = handlers;
        handlers.onStatus('reconnecting');
        // engine.mjs is a self-contained Emscripten ES module (wasm embedded).
        const factory = (await import('../wasm/engine.mjs')).default as (opts?: object) => Promise<EngineModule>;
        this.mod = await factory();
        this.mod._sim_init();
        this.applyConfig(this.current);
        handlers.onStatus('connected');

        this.timer = window.setInterval(() => this.tick(), FRAME_MS);
    }

    private applyConfig(id: string) {
        const p = DRONE_PROFILES[id]?.physics;
        if (!p || !this.mod) return;
        const type = DRONE_PROFILES[id].type === 'fixed_wing' ? 1 : 0;
        this.mod._sim_set_config(type, p.num_rotors, p.is_kamikaze ?? 0,
            p.mass, p.max_thrust_per_rotor, p.drag_coeff, p.lift_coeff);
    }

    private tick() {
        const mod = this.mod;
        if (!mod || !this.handlers) return;

        mod._sim_step(TICKS_PER_FRAME);

        // Drain events first (building/drone destruction, resets).
        const count = mod._sim_event_count();
        if (count > 0) {
            const base = mod._sim_events_ptr() / 8;
            for (let i = 0; i < count; i++) {
                const o = base + i * 5;
                const event = EVENT_NAMES[mod.HEAPF64[o]] ?? 'world_reset';
                this.handlers.onEvent({
                    type: 'event',
                    event,
                    index: mod.HEAPF64[o + 1],
                    x: mod.HEAPF64[o + 2],
                    y: mod.HEAPF64[o + 3],
                    z: mod.HEAPF64[o + 4],
                });
            }
        }

        // Then the current state frame.
        const s = mod._sim_state_ptr() / 8;
        const h = mod.HEAPF64;
        const state: DroneState = {
            x: h[s], y: h[s + 1], z: h[s + 2],
            qx: h[s + 3], qy: h[s + 4], qz: h[s + 5], qw: h[s + 6],
            vx: h[s + 7], vy: h[s + 8], vz: h[s + 9],
            ax: h[s + 10], ay: h[s + 11], az: h[s + 12],
            health: h[s + 13],
        };
        this.handlers.onState(state);
    }

    stop() {
        if (this.timer !== null) window.clearInterval(this.timer);
        this.timer = null;
        this.handlers?.onStatus('disconnected');
    }

    sendFlightInput(input: FlightInput) {
        this.mod?._sim_set_flight_input(input.throttle, input.pitch, input.roll, input.yaw);
    }

    async listDrones(): Promise<DronesResponse> {
        return localDronesResponse(this.current);
    }

    async selectDrone(id: string): Promise<void> {
        this.current = id;
        this.applyConfig(id);
    }

    async killRotor(index: number): Promise<void> {
        this.mod?._sim_kill_rotor(index);
    }

    async reset(): Promise<void> {
        this.mod?._sim_reset();
    }
}
