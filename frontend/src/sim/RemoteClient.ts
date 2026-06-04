import type { DroneState, FlightInput, WorldEvent, DronesResponse } from '../types/drone';
import type { SimClient, SimHandlers } from './SimClient';
import { API_BASE_URL, WS_TELEMETRY_URL } from '../config';

// Talks to the live distributed backend: telemetry + events over the WebSocket,
// drone selection and fault injection over the planner's REST API.
export class RemoteClient implements SimClient {
    private ws: WebSocket | null = null;
    private handlers: SimHandlers | null = null;
    private attempt = 0;
    private disposed = false;

    start(handlers: SimHandlers) {
        this.handlers = handlers;
        this.disposed = false;
        this.connect();
    }

    private connect() {
        if (this.disposed) return;
        const ws = new WebSocket(WS_TELEMETRY_URL);
        this.ws = ws;

        ws.onopen = () => {
            this.attempt = 0;
            this.handlers?.onStatus('connected');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'event') {
                this.handlers?.onEvent(data as WorldEvent);
            } else {
                this.handlers?.onState(data as DroneState);
            }
        };

        ws.onclose = () => {
            if (this.disposed) return;
            this.handlers?.onStatus('reconnecting');
            const delay = Math.min(1000 * Math.pow(2, this.attempt), 10000);
            this.attempt++;
            setTimeout(() => this.connect(), delay);
        };

        ws.onerror = () => ws.close();
    }

    stop() {
        this.disposed = true;
        this.ws?.close();
        this.handlers?.onStatus('disconnected');
    }

    sendFlightInput(input: FlightInput) {
        const ws = this.ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'flight_input', ...input }));
        }
    }

    async listDrones(): Promise<DronesResponse> {
        const r = await fetch(`${API_BASE_URL}/drones`);
        return r.json();
    }

    async selectDrone(id: string): Promise<void> {
        await fetch(`${API_BASE_URL}/drone/select/${id}`, { method: 'POST' });
    }

    async killRotor(index: number): Promise<void> {
        await fetch(`${API_BASE_URL}/fault/kill_rotor/${index}`, { method: 'POST' });
    }

    async reset(): Promise<void> {
        await fetch(`${API_BASE_URL}/fault/reset`, { method: 'POST' });
    }
}
