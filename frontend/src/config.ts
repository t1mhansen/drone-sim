export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const WS_TELEMETRY_URL = import.meta.env.VITE_WS_URL ||
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/telemetry`;
