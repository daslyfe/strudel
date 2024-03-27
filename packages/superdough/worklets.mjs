// coarse, crush, and shape processors adapted from dktr0's webdirt: https://github.com/dktr0/WebDirt/blob/5ce3d698362c54d6e1b68acc47eb2955ac62c793/dist/AudioWorklets.js
// LICENSE GNU General Public License v3.0 see https://github.com/dktr0/WebDirt/blob/main/LICENSE
function clamp(x, minval, maxval) {
  return Math.max(minval, Math.min(maxval, x));
}

class CoarseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'coarse', defaultValue: 1 }];
  }

  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const blockSize = 128;

    let coarse = parameters.coarse[0] ?? 0;
    coarse = Math.max(1, coarse);

    if (input[0] == null || output[0] == null) {
      return false;
    }
    for (let n = 0; n < blockSize; n++) {
      for (let i = 0; i < input.length; i++) {
        output[i][n] = n % coarse === 0 ? input[i][n] : output[i][n - 1];
      }
    }
    return true;
  }
}
registerProcessor('coarse-processor', CoarseProcessor);

class CrushProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'crush', defaultValue: 0 }];
  }

  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const blockSize = 128;

    let crush = parameters.crush[0] ?? 8;
    crush = Math.max(1, crush);

    if (input[0] == null || output[0] == null) {
      return false;
    }
    for (let n = 0; n < blockSize; n++) {
      for (let i = 0; i < input.length; i++) {
        const x = Math.pow(2, crush - 1);
        output[i][n] = Math.round(input[i][n] * x) / x;
      }
    }
    return true;
  }
}
registerProcessor('crush-processor', CrushProcessor);

class ShapeProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'shape', defaultValue: 0 },
      { name: 'postgain', defaultValue: 1 },
    ];
  }

  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const blockSize = 128;

    let shape = parameters.shape[0];
    shape = shape < 1 ? shape : 1.0 - 4e-10;
    shape = (2.0 * shape) / (1.0 - shape);
    const postgain = Math.max(0.001, Math.min(1, parameters.postgain[0]));

    if (input[0] == null || output[0] == null) {
      return false;
    }
    for (let n = 0; n < blockSize; n++) {
      for (let i = 0; i < input.length; i++) {
        output[i][n] = (((1 + shape) * input[i][n]) / (1 + shape * Math.abs(input[i][n]))) * postgain;
      }
    }
    return true;
  }
}
registerProcessor('shape-processor', ShapeProcessor);

class DistortProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'distort', defaultValue: 0 },
      { name: 'postgain', defaultValue: 1 },
    ];
  }

  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const blockSize = 128;

    const shape = Math.expm1(parameters.distort[0]);
    const postgain = Math.max(0.001, Math.min(1, parameters.postgain[0]));

    if (input[0] == null || output[0] == null) {
      return false;
    }
    for (let n = 0; n < blockSize; n++) {
      for (let i = 0; i < input.length; i++) {
        output[i][n] = (((1 + shape) * input[i][n]) / (1 + shape * Math.abs(input[i][n]))) * postgain;
      }
    }
    return true;
  }
}
registerProcessor('distort-processor', DistortProcessor);

// adjust waveshape to remove frequencies above nyquist to prevent aliasing
// referenced from https://www.kvraudio.com/forum/viewtopic.php?t=375517
const polyBlep = (phase, dt) => {
  // 0 <= phase < 1
  if (phase < dt) {
    phase /= dt;
    // 2 * (phase - phase^2/2 - 0.5)
    return phase + phase - phase * phase - 1;
  }

  // -1 < phase < 0
  else if (phase > 1 - dt) {
    phase = (phase - 1) / dt;
    // 2 * (phase^2/2 + phase + 0.5)
    return phase * phase + phase + phase + 1;
  }

  // 0 otherwise
  else {
    return 0;
  }
};

const saw = (phase, dt) => {
  const v = 2 * phase - 1;
  return v - polyBlep(phase, dt);
};

function lerp(a, b, n) {
  return n * (b - a) + a;
}

function getUnisonDetune(unison, detune, voiceIndex) {
  if (unison < 2) {
    return 0;
  }
  return lerp(-detune * 0.5, detune * 0.5, voiceIndex / (unison - 1));
}
class SuperSawOscillatorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase;
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

      {
        name: 'panspread',
        defaultValue: 0.4,
        min: 0,
        max: 1,
      },
      {
        name: 'freqspread',
        defaultValue: 0.2,
        min: 0,
      },
      {
        name: 'detune',
        defaultValue: 0,
        min: 0,
      },

      {
        name: 'voices',
        defaultValue: 5,
        min: 1,
      },
    ];
  }
  process(input, outputs, params) {
    // eslint-disable-next-line no-undef
    if (currentTime <= params.begin[0]) {
      return true;
    }
    // eslint-disable-next-line no-undef
    if (currentTime >= params.end[0]) {
      // this.port.postMessage({ type: 'onended' });
      return false;
    }

    let frequency = params.frequency[0];
    //apply detune in cents
    frequency = frequency * Math.pow(2, params.detune[0] / 1200);

    const output = outputs[0];
    const voices = params.voices[0];
    const freqspread = params.freqspread[0];
    const panspread = params.panspread[0] * 0.5 + 0.5;
    const gain1 = Math.sqrt(1 - panspread);
    const gain2 = Math.sqrt(panspread);

    if (this.phase == null) {
      const iterable = (function* () {
        yield* Array.from({ length: voices }, () => Math.random());
      })();
      // const float32FromIterable = new Float32Array(iterable);
      this.phase = new Float32Array(iterable);
    }

    for (let n = 0; n < voices; n++) {
      const isOdd = (n & 1) == 1;

      //applies unison "spread" detune in semitones
      const freq = frequency * Math.pow(2, getUnisonDetune(voices, freqspread, n) / 12);
      let gainL = gain1;
      let gainR = gain2;
      // invert right and left gain
      if (isOdd) {
        gainL = gain2;
        gainR = gain1;
      }
      // eslint-disable-next-line no-undef
      const dt = freq / sampleRate;

      for (let i = 0; i < output[0].length; i++) {
        this.phase[n] = this.phase[n] ?? Math.random();
        const v = saw(this.phase[n], dt);

        output[0][i] = output[0][i] + v * gainL;
        output[1][i] = output[1][i] + v * gainR;

        this.phase[n] += dt;

        if (this.phase[n] > 1.0) {
          this.phase[n] = this.phase[n] - 1;
        }
      }
    }
    return true;
  }
}

registerProcessor('supersaw-oscillator', SuperSawOscillatorProcessor);

const sine = (phase, dt) => {
  return Math.sin(Math.PI * 2 * phase);

  // return Math.sin(phase);
};

// set the decay between an exact timespan
const expDecayEnvelope = (startTime, endTime, currentTime, hold = 0) => {
  let min = 0.001;
  currentTime = currentTime - hold;
  if (startTime > currentTime) {
    return 1;
  }
  if (currentTime > endTime) {
    return min;
  }
  // change relative start time to 0 to prevent numeric overflow
  currentTime = currentTime - startTime;
  endTime = endTime - startTime;
  startTime = 0;

  let x1 = startTime;
  let y1 = 1;
  let x2 = endTime;
  let y2 = min;

  // Calculate the growth or decay rate (b)
  let b = Math.log(y1 / y2) / (x1 - x2);

  // Calculate the initial value (a)
  let a = y1 / Math.exp(b * x1);

  let x = currentTime;
  //  calculate y for any x
  return a * Math.exp(b * x);
};

function simpleDecayEnvelope(time, decayRate, curve, hold = 0) {
  decayRate = (1 - decayRate) * 100;
  if (time < hold) {
    return 1;
  }
  // Calculate volume at this time using exponential decay formula: V(t) = V0 * e^(-rt)
  return 1 * Math.pow(curve, -decayRate * (time - hold));
  // return 1 * Math.exp(-decayRate * time);
}

class KickProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0.5;
    this.inc = 0;
    // this.ampEnv = new Float32Array(numSamples);
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
        name: 'shellvol',
        defaultValue: 1,
        min: 0,
      },
      {
        name: 'shellfrequency',
        defaultValue: 440,
        min: 1,
      },
      {
        name: 'shellfdecay',
        defaultValue: 0.2,
        min: Number.EPSILON,
      },
      {
        name: 'shellfenv',
        defaultValue: 36,
        min: Number.EPSILON,
      },
      {
        name: 'power',
        defaultValue: 0.05,
        min: 0,
      },
      {
        name: 'decay',
        defaultValue: 0.8,
        min: 0,
      },
      {
        name: 'impulsevol',
        defaultValue: 1,
        min: 0,
      },
      {
        name: 'impulselength',
        defaultValue: 0.01,
        min: 0,
      },
      {
        name: 'impulsecolor',
        defaultValue: 0.32,
        min: 0,
      },
      {
        name: 'impactvol',
        defaultValue: 1,
        min: 0,
      },

      {
        name: 'impactdec',
        defaultValue: 0.18,
        min: 0,
      },
    ];
  }
  incrementPhase(dt) {
    this.phase += dt;
    if (this.phase > 1.0) {
      this.phase = this.phase - 1;
    }
  }
  process(inputs, outputs, params) {
    const output = outputs[0];
    const begin = params.begin[0];
    const end = params.end[0];
    const shellfenv = params.shellfenv[0];
    const impulsevol = params.impulsevol[0];
    const impulselength = params.impulselength[0];
    const impulsecolor = params.impulsecolor[0] * 100;

    // eslint-disable-next-line no-undef
    if (currentTime < begin) {
      return true;
    }
    // eslint-disable-next-line no-undef
    if (currentTime > end) {
      return false;
    }
    // let shellfrequency = params.shellfrequency[0];

    // let freqdec = expDecayEnvelope(begin, begin + 0.1, currentTime);

    const decay = Math.max(0.01, params.decay[0]);

    // console.log(dec, { begin, t, decay, currentTime });
    // eslint-disable-next-line no-undef

    for (let channel = 0; channel < output.length; ++channel) {
      const outputChannel = output[channel];

      for (let i = 0; i < outputChannel.length; ++i) {
        const t = this.inc / sampleRate;
        let freqdec = expDecayEnvelope(0, params.shellfdecay[0], t);
        let shellfrequency = params.shellfrequency[0] * 0.5 * Math.pow(2, (freqdec * shellfenv) / 12);
        const dt = shellfrequency / sampleRate;
        let impactdec = expDecayEnvelope(0, params.impactdec[0], t);
        // let impactdec = simpleDecayEnvelope(t, 0.8, 10);

        // Implement the generate() logic here

        // const dec = expDecayEnvelope(0, decay, t);

        // Access the generated audio and sync signals
        let audioOut = sine(this.phase, dt) * expDecayEnvelope(0, decay, t, params.power[0]);

        // frequency modulate the output with a phase shifted burst to create a "knocking" sound
        const impact = audioOut * (sine(this.phase / 4, dt) * impactdec) * params.impactvol[0];

        // const audioOut = v;
        // Set the output values
        audioOut = impact + audioOut * params.shellvol[0];
        // short bit crush effect creates a natural sounding impulse

        if (t < impulselength) {
          // const x = Math.pow(2, 6 - 1);
          audioOut = audioOut * (1 - impulsevol) + (Math.round(audioOut * impulsecolor) / impulsecolor) * impulsevol;
        }

        // audioOut = impact;
        outputChannel[i] = audioOut;
        this.incrementPhase(dt);
        this.inc += 1;
      }
    }

    return true;
  }

  // Add other methods such as generate(), getSample(), getSync(), and hardsync_init() as needed
}

registerProcessor('kick-processor', KickProcessor);
