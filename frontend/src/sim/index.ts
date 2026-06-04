import type { SimClient } from './SimClient';
import { RemoteClient } from './RemoteClient';
import { WasmClient } from './WasmClient';

// Hosted static builds set VITE_WASM=1 to run the engine in-browser; otherwise
// the app talks to the live Python + C++ backend.
export const USE_WASM = import.meta.env.VITE_WASM === '1' || import.meta.env.VITE_WASM === 'true';

let client: SimClient | null = null;

export function getSimClient(): SimClient {
    if (!client) client = USE_WASM ? new WasmClient() : new RemoteClient();
    return client;
}

export type { SimClient } from './SimClient';
