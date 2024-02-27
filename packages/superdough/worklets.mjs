// LICENSE GNU General Public License v3.0 see https://github.com/dktr0/WebDirt/blob/main/LICENSE
// processors adapted from dktr0's webdirt: https://github.com/dktr0/WebDirt/blob/5ce3d698362c54d6e1b68acc47eb2955ac62c793/dist/AudioWorklets.js
// <3

const processBuffer = (inputs, outputs, processBlock) => {
  const input = inputs[0];
  const output = outputs[0];
  const blockSize = 128;
  if (input == null || output == null) {
    return false;
  }

  for (let n = 0; n < blockSize; n++) {
    input.forEach((inChannel, i) => {
      const outChannel = output[i % output.length];
      const block = inChannel[n];
      outChannel[n] = processBlock(block, n, inChannel, outChannel);
    });
  }
  return true;
};

class CoarseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'coarse', defaultValue: 1 }];
  }

  constructor() {
    super();
    this.notStarted = true;
  }

  process(inputs, outputs, parameters) {
    let coarse = parameters.coarse[0] ?? 0;
    coarse = Math.min(128, Math.max(1, Math.round(coarse * 128)));
    return processBuffer(inputs, outputs, (block, n, inChannel, outChannel) => {
      const value = n % coarse === 0 ? block : outChannel[n - 1];
      return value;
    });
  }
}

registerProcessor('coarse-processor', CoarseProcessor);

class CrushProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'crush', defaultValue: 0 }];
  }

  constructor() {
    super();
    this.notStarted = true;
  }

  process(inputs, outputs, parameters) {
    const bitMax = 16;
    const bitMin = 1;
    let crush = parameters.crush[0] ?? 8;
    crush = Math.max(bitMin, bitMax - crush * bitMax);

    return processBuffer(inputs, outputs, (block) => {
      const x = Math.pow(2, crush - 1);
      return Math.round(block * x) / x;
    });
  }
}
registerProcessor('crush-processor', CrushProcessor);

class ShapeProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'shape', defaultValue: 0 }];
  }

  constructor() {
    super();
    this.notStarted = true;
  }

  process(inputs, outputs, parameters) {
    const shape_param = parameters.shape[0] ?? 0;
    const shape = (2.0 * shape_param) / (1.0 - shape_param);
    return processBuffer(inputs, outputs, (block) => {
      return ((1 + shape) * block) / (1 + shape * Math.abs(block));
    });
  }
}

registerProcessor('shape-processor', ShapeProcessor);
