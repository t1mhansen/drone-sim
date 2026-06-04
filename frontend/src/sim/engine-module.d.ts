// The WASM engine is emitted by Emscripten as a self-contained ES module with no
// type declarations. WasmClient narrows the real shape after import.
declare module '*/wasm/engine.mjs' {
    const factory: (opts?: object) => Promise<any>;
    export default factory;
}
