// The WASM engine is emitted by Emscripten as a self-contained ES module with no
// type declarations. WasmClient narrows the real shape after import.
declare module '*/wasm/engine.mjs' {
    // Emscripten's factory; WasmClient narrows the real shape after import.
    const factory: unknown;
    export default factory;
}
