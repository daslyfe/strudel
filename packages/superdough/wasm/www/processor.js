/*
 *  This software generates a simple tone using WebAssembly and the Web Audio API.
 *  Copyright (C) 2023  Andrew Luchuk
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

let wasm;

let cachedTextDecoder;

let cachedUint8Memory0 = null;

function getUint8Memory0() {
  if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
    cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}
/**
 */
export class SineOsc {
  static __wrap(ptr) {
    const obj = Object.create(SineOsc.prototype);
    obj.ptr = ptr;

    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.ptr;
    this.ptr = 0;

    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_sineosc_free(ptr);
  }
  /**
   * @param {number} pitch
   * @param {number} gain
   * @returns {number}
   */
  sample(pitch, gain) {
    const ret = wasm.sineosc_sample(this.ptr, pitch, gain);
    return ret;
  }
  /**
   * @param {number} sample_rate
   * @returns {SineOsc}
   */
  static new(sample_rate) {
    const ret = wasm.sineosc_new(sample_rate);
    return SineOsc.__wrap(ret);
  }
}

async function load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get('Content-Type') != 'application/wasm') {
          console.warn(
            '`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
            e,
          );
        } else {
          throw e;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);

    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}

function getImports() {
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbindgen_throw = function (arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };

  return imports;
}

function initMemory(imports, maybe_memory) {}

function finalizeInit(instance, module) {
  wasm = instance.exports;
  init.__wbindgen_wasm_module = module;
  cachedUint8Memory0 = null;

  return wasm;
}

function initSync(module) {
  const imports = getImports();

  initMemory(imports);

  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }

  const instance = new WebAssembly.Instance(module, imports);

  return finalizeInit(instance, module);
}

async function init(input) {
  if (typeof input === 'undefined') {
    input = new URL('wasm_demo_bg.wasm', import.meta.url);
  }
  const imports = getImports();

  if (
    typeof input === 'string' ||
    (typeof Request === 'function' && input instanceof Request) ||
    (typeof URL === 'function' && input instanceof URL)
  ) {
    input = fetch(input);
  }

  initMemory(imports);

  const { instance, module } = await load(await input, imports);

  return finalizeInit(instance, module);
}

class WebSynthProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);

    this.port.onmessage = (event) => this.onmessage(event.data);

    this.osc = null;
    this.destroyed = false;
    this.pitch = 440;
  }
  static get parameterDescriptors() {
    return [
      {
        name: 'begin',
        defaultValue: 0,
        max: Number.POSITIVE_INFINITY,
        min: 0,
      },

      {
        name: 'end',
        defaultValue: 0,
        max: Number.POSITIVE_INFINITY,
        min: 0,
      },

      {
        name: 'frequency',
        defaultValue: 440,
        min: Number.EPSILON,
      },
    ];
  }

  onmessage(data) {
    if (data.type === 'init-wasm') {
      const instance = async () => {
        try {
          cachedTextDecoder = data.decoder;

          let mod = await load(data.wasmData, getImports());
          finalizeInit(mod.instance, mod.module);

          this.osc = SineOsc.new(sampleRate);
        } catch (e) {
          console.log('Caught error in instantiating wasm', e);
        }
      };

      instance();
    } else if (data.type == 'freq-update') {
      this.pitch = data.freq;
    }
  }

  process(inputs, outputs, parameters) {
    // eslint-disable-next-line no-undef
    if (currentTime <= parameters.begin[0]) {
      return true;
    }
    // eslint-disable-next-line no-undef
    if (currentTime >= parameters.end[0]) {
      if (this.destroyed === false) {
        // this.osc.free();
        this.destroyed = true;
      }

      return false;
    }
    let frequency = parameters.frequency[0];
    if (typeof this.osc !== 'undefined' && this.osc !== null) {
      let output = outputs[0];

      output.forEach((channel) => {
        for (let i = 0; i < channel.length; i++) {
          let sample = this.osc.sample(frequency, 0.05);

          channel[i] = sample;
        }
      });
    } else {
      console.log('wasm not instantiated yet');
    }

    return true;
  }
}

registerProcessor('web-synth-proto', WebSynthProcessor);
