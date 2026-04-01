import { useEffect, useRef, useCallback } from 'react';

export function useAudioEngine() {
    const ctxRef = useRef<AudioContext | null>(null);
    const engineOscRef = useRef<OscillatorNode | null>(null);
    const engineGainRef = useRef<GainNode | null>(null);
    const filterRef = useRef<BiquadFilterNode | null>(null);
    const startedRef = useRef(false);

    // Lazy-init AudioContext on first user interaction (browser autoplay policy)
    const ensureContext = useCallback(() => {
        if (ctxRef.current) return ctxRef.current;
        const ctx = new AudioContext();
        // Resume immediately — required by most browsers after user gesture
        ctx.resume();
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
        filter.frequency.value = 300;
        filter.Q.value = 1;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        engineOscRef.current = osc;
        engineGainRef.current = gain;
        filterRef.current = filter;

        return ctx;
    }, []);

    // Start audio on first keypress (satisfies autoplay policy)
    useEffect(() => {
        const handler = () => {
            if (!startedRef.current) {
                const ctx = ensureContext();
                // Also resume on subsequent interactions in case it got suspended
                ctx.resume();
                startedRef.current = true;
            }
        };
        window.addEventListener('keydown', handler, { once: false });
        window.addEventListener('mousedown', handler, { once: false });
        return () => {
            window.removeEventListener('keydown', handler);
            window.removeEventListener('mousedown', handler);
        };
    }, [ensureContext]);

    // Update engine hum based on throttle
    const updateEngineSound = useCallback((throttle: number) => {
        const osc = engineOscRef.current;
        const gain = engineGainRef.current;
        const filter = filterRef.current;
        if (!osc || !gain || !filter) return;

        // Resume context if it got suspended
        if (ctxRef.current?.state === 'suspended') {
            ctxRef.current.resume();
        }

        // Pitch: 50Hz at idle, 280Hz at full throttle
        osc.frequency.value = 50 + throttle * 230;
        // Filter opens up with throttle: 150Hz idle, 600Hz full
        filter.frequency.value = 150 + throttle * 450;
        // Volume: audible at idle, loud at full throttle
        gain.gain.value = 0.06 + throttle * 0.14;
    }, []);

    // Play a collision impact sound
    const playCollisionSound = useCallback(() => {
        const ctx = ctxRef.current;
        if (!ctx || ctx.state === 'suspended') return;

        // White noise burst — 200ms, exponential decay
        const duration = 0.2;
        const bufferSize = Math.floor(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.value = 0.5;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;

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
