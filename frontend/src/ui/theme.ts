// Shared visual language for the HUD overlays. Every panel is a translucent
// dark card in a monospace font with a single accent color; this module is the
// one place that knows the palette and the panel shape, so the components don't
// each repeat the same style literals.
import type { CSSProperties } from 'react';

export const MONO = 'monospace';

export const colors = {
    panelBg: 'rgba(0,0,0,0.75)',
    green: '#00ff88',   // nominal / telemetry
    amber: '#ffaa00',   // caution
    blue: '#44aaff',    // selection / info
    red: '#ff4444',     // danger / faults
    label: '#888',      // section labels
    dim: '#666',        // hints, secondary text
    faint: '#444',      // borders, inactive
} as const;

// A HUD card. `accent` tints the text; `overrides` sets size/positioning.
export function panel(accent: string = colors.green, overrides: CSSProperties = {}): CSSProperties {
    return {
        background: colors.panelBg,
        color: accent,
        fontFamily: MONO,
        fontSize: '13px',
        padding: '16px',
        borderRadius: '8px',
        ...overrides,
    };
}

// Small uppercase section label (e.g. "SPEED", "KILL ROTOR").
export const sectionLabel: CSSProperties = {
    color: colors.label,
    fontSize: '11px',
    marginBottom: '4px',
};
