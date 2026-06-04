import type { DroneState, FlightInput, WorldEvent, DronesResponse } from '../types/drone';
import type { ConnectionStatus } from '../hooks/useTelemetry';

// Callbacks the UI registers to receive the live simulation stream.
export interface SimHandlers {
    onState: (state: DroneState) => void;
    onEvent: (event: WorldEvent) => void;
    onStatus: (status: ConnectionStatus) => void;
}

// A pluggable source of truth for the simulation. The whole UI talks to this
// interface, so it doesn't care whether the physics runs on a remote C++ engine
// (RemoteClient, over WebSocket + REST) or in-browser via WebAssembly (WasmClient).
export interface SimClient {
    start(handlers: SimHandlers): void;
    stop(): void;
    sendFlightInput(input: FlightInput): void;
    listDrones(): Promise<DronesResponse>;
    selectDrone(id: string): Promise<void>;
    killRotor(index: number): Promise<void>;
    reset(): Promise<void>;
}
