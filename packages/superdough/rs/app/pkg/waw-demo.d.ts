/* tslint:disable */
/* eslint-disable */
/**
*/
export function main(): void;
/**
* Equivalent of bindgen `init` for the worklet.
*
* Given the URL to the worklet bindgen js this will initialise WASM in the worklet scope.
* @param {AudioContext} ctx
* @param {string} js_url
* @returns {Promise<void>}
*/
export function init_worklet(ctx: AudioContext, js_url: string): Promise<void>;
export type OscillatorParams = "Frequency";

export type OscillatorEvent = { One: number } | "Two";

export interface OscillatorDefaultState {
    count: number;
}

export type OscillatorCommand = { Count: number };


export type Callback<T> = (event: T) => void; 


/**
*/
export class Gain {
  free(): void;
/**
* @param {AudioContext} ctx
* @param {never | undefined} [initial_state]
* @returns {Promise<Gain>}
*/
  static create(ctx: AudioContext, initial_state?: never): Promise<Gain>;
/**
* @returns {AudioWorkletNode}
*/
  node(): AudioWorkletNode;
/**
* @param {never} param
* @returns {AudioParam}
*/
  get_param(param: never): AudioParam;
/**
* @param {never} message
*/
  command(message: never): void;
/**
* @param {Callback<never>} callback
*/
  subscribe(callback: Callback<never>): void;
/**
*/
  destroy(): void;
}
/**
*/
export class Oscillator {
  free(): void;
/**
* @param {AudioContext} ctx
* @param {OscillatorDefaultState | undefined} [initial_state]
* @returns {Promise<Oscillator>}
*/
  static create(ctx: AudioContext, initial_state?: OscillatorDefaultState): Promise<Oscillator>;
/**
* @returns {AudioWorkletNode}
*/
  node(): AudioWorkletNode;
/**
* @param {OscillatorParams} param
* @returns {AudioParam}
*/
  get_param(param: OscillatorParams): AudioParam;
/**
* @param {OscillatorCommand} message
*/
  command(message: OscillatorCommand): void;
/**
* @param {Callback<OscillatorEvent>} callback
*/
  subscribe(callback: Callback<OscillatorEvent>): void;
/**
*/
  destroy(): void;
}
/**
*/
export class _GainProcessor {
  free(): void;
/**
* @param {AudioWorkletProcessor} js_processor
* @param {never | undefined} [initial_state]
*/
  constructor(js_processor: AudioWorkletProcessor, initial_state?: never);
/**
*/
  connect(): void;
/**
* @param {Array<any>} input
* @param {Array<any>} output
* @param {any} params
* @returns {boolean}
*/
  process(input: Array<any>, output: Array<any>, params: any): boolean;
/**
* @returns {string}
*/
  static parameter_descriptor(): string;
}
/**
*/
export class _OscillatorProcessor {
  free(): void;
/**
* @param {AudioWorkletProcessor} js_processor
* @param {OscillatorDefaultState | undefined} [initial_state]
*/
  constructor(js_processor: AudioWorkletProcessor, initial_state?: OscillatorDefaultState);
/**
*/
  connect(): void;
/**
* @param {Array<any>} input
* @param {Array<any>} output
* @param {any} params
* @returns {boolean}
*/
  process(input: Array<any>, output: Array<any>, params: any): boolean;
/**
* @returns {string}
*/
  static parameter_descriptor(): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly oscillator_create: (a: number, b: number) => number;
  readonly oscillator_node: (a: number, b: number) => void;
  readonly oscillator_get_param: (a: number, b: number) => number;
  readonly oscillator_command: (a: number, b: number) => void;
  readonly oscillator_subscribe: (a: number, b: number) => void;
  readonly oscillator_destroy: (a: number) => void;
  readonly __wbg_oscillator_free: (a: number) => void;
  readonly _oscillatorprocessor_new: (a: number, b: number) => number;
  readonly _oscillatorprocessor_connect: (a: number) => void;
  readonly _oscillatorprocessor_process: (a: number, b: number, c: number, d: number) => number;
  readonly _oscillatorprocessor_parameter_descriptor: (a: number) => void;
  readonly __wbg__oscillatorprocessor_free: (a: number) => void;
  readonly gain_create: (a: number, b: number) => number;
  readonly gain_node: (a: number, b: number) => void;
  readonly gain_get_param: (a: number, b: number) => number;
  readonly gain_command: (a: number, b: number) => void;
  readonly gain_subscribe: (a: number, b: number) => void;
  readonly gain_destroy: (a: number) => void;
  readonly __wbg_gain_free: (a: number) => void;
  readonly _gainprocessor_new: (a: number, b: number) => number;
  readonly _gainprocessor_connect: (a: number) => void;
  readonly _gainprocessor_process: (a: number, b: number, c: number, d: number) => number;
  readonly _gainprocessor_parameter_descriptor: (a: number) => void;
  readonly __wbg__gainprocessor_free: (a: number) => void;
  readonly main: () => void;
  readonly init_worklet: (a: number, b: number, c: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly wasm_bindgen__convert__closures__invoke1_mut__heb4bdd43f06d75f8: (a: number, b: number, c: number) => void;
  readonly wasm_bindgen__convert__closures__invoke1__h39ad45dc5a5e543b: (a: number, b: number, c: number) => void;
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hdb12a4006e83738b: (a: number, b: number, c: number) => void;
  readonly wasm_bindgen__convert__closures__invoke1_mut__h7e4451a10270cd02: (a: number, b: number, c: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly wasm_bindgen__convert__closures__invoke2_mut__hbdb2690ca0f4482d: (a: number, b: number, c: number, d: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
