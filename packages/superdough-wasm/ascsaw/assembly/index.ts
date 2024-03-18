// export function saw(t: number, f: number): number {
//   return (((f * t * 1.0) % 1.0) - 0.5) * 2.0;
// }
type out = Array<number>;

type output = Array<out>;

const polyBlep = (phase: number, dt: number): number => {
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

const saw = (phase: number, dt: number): number => {
  const v = 2 * phase - 1;
  return v - polyBlep(phase, dt);
};

function lerp(a: number, b: number, n: number): number {
  return n * (b - a) + a;
}

function getUnisonDetune(unison: number, detune: number, voiceIndex: number): number {
  if (unison < 2) {
    return 0;
  }
  return lerp(-detune, detune, voiceIndex / (unison - 1));
}
export function proc(
  output: output,
  currentTime: number,
  sampleRate: number,
  t: number,
  voices: number,
  panspread: number,
  frequency: number,
  freqspread: number,
): output {
  const gain1 = Math.sqrt(1 - panspread);
  const gain2 = Math.sqrt(panspread);

  for (let n = 0; n < voices; n++) {
    const isOdd = (n & 1) == 1;

    //applies unison "spread" detune in semitones
    const freq = frequency * Math.pow(2, getUnisonDetune(voices, freqspread, n) / 1.2);
    let gainL = gain1;
    let gainR = gain2;
    // invert right and left gain
    if (isOdd) {
      gainL = gain2;
      gainR = gain1;
    }

    const phaseOffset = currentTime / (n + 1);

    const vdt = freq / sampleRate;

    const adjustedIncrement = (freq / frequency) * t + phaseOffset;

    for (let i = 0; i < output[0].length; i++) {
      const inc = adjustedIncrement + i * vdt;
      const p = inc % 1;

      const v = saw(p, vdt);

      output[0][i] = output[0][i] + v * gainL;
      output[1][i] = output[1][i] + v * gainR;
    }
  }
  return output;
}
