import { useEffect, useRef, useCallback } from 'react';

export function useAudioEngine() {
    const ctxRef = useRef<AudioContext | null>(null);
    const engineOscRef = useRef<OscillatorNode | null>(null);
    const engineGainRef = useRef<GainNode | null>(null);
    const startedRef = useRef(false);

    // Lazy-init AudioContext on first user interaction (browser autoplay policy)
    const ensureContext = useCallback(() => {
        if (ctxRef.current) return ctxRef.current;
        const ctx = new AudioContext();
        ctxRef.current = ctx;

        // Engine hum: low-frequency sawtooth
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 80;

        const gain = ctx.createGain();
        gain.gain.value = 0;

        // Low-pass filter to soften the sawtooth
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        engineOscRef.current = osc;
        engineGainRef.current = gain;

        return ctx;
    }, []);

    // Start audio on first keypress (satisfies autoplay policy)
    useEffect(() => {
        const handler = () => {
            if (!startedRef.current) {
                ensureContext();
                startedRef.current = true;
            }
        };
        window.addEventListener('keydown', handler, { once: false });
        return () => window.removeEventListener('keydown', handler);
    }, [ensureContext]);

    // Update engine hum based on throttle (call every frame from the controls loop)
    const updateEngineSound = useCallback((throttle: number) => {
        if (!engineOscRef.current || !engineGainRef.current) return;
        // Pitch: 60Hz at idle → 220Hz at full throttle
        engineOscRef.current.frequency.value = 60 + throttle * 160;
        // Volume: quiet at idle, louder at high throttle
        engineGainRef.current.gain.value = 0.02 + throttle * 0.06;
    }, []);

    // Play a collision impact sound
    const playCollisionSound = useCallback(() => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        // White noise burst
        const bufferSize = ctx.sampleRate * 0.15; // 150ms
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.value = 0.3;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            engineOscRef.current?.stop();
            ctxRef.current?.close();
        };
    }, []);

    return { updateEngineSound, playCollisionSound };
}
