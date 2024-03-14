use std::cmp;
use std::ops::Sub;
use std::sync::atomic::{AtomicI32, AtomicU8, Ordering};

use wasm_bindgen::JsValue;
// use log::{info, warn};
use web_sys::console::log;

pub fn poly_blep(p: f32, dt: &f32) -> f32 {
    let mut phase = p + 0.0;
    // 0 <= phase < 1
    if phase < *dt {
        phase /= dt;
        // 2 * (phase - phase^2/2 - 0.5)
        return phase + phase - phase * phase - 1.0;
    }
    if phase > 1.0 - dt {
        phase = (phase - 1.0) / dt;
        // 2 * (phase^2/2 + phase + 0.5)
        return phase * phase + phase + phase + 1.0;
    }

    // 0 otherwise
    0.0
}

pub fn saw(p: f32, dt: &f32) -> f32 {
    // Correct phase, so it would be in line with sin(2.*M_PI * phase)
    let mut corrected_phase = p + 0.5;

    if corrected_phase >= 1.0 {
        corrected_phase = corrected_phase - 1.0;
    }
    let v = 2.0 * corrected_phase - 1.0;

    v - poly_blep(corrected_phase, dt)
}
// Let's implement a simple sine oscillator with variable frequency and volume.
pub struct Oscillator {
    params: &'static Params,
    accumulator: u32,
    phase: Vec<f32>,
    logged: i8,
}

impl Oscillator {
    pub fn new(params: &'static Params) -> Self {
        Self {
            params,
            accumulator: 0,
            phase: Vec::new(),
            logged: 0,
        }
    }
}

impl Oscillator {
    pub fn process(&mut self, output: &mut [f32]) -> bool {
        // This method is called in the audio process thread.
        // All imports are set, so host functionality available in worklets
        // (for example, logging) can be used:
        // `web_sys::console::log_1(&JsValue::from(output.len()));`
        // Note that currently TextEncoder and TextDecoder are stubs, so passing
        // strings may not work in this thread.
        // unsafe { web_sys::console::log_1(&JsValue::from(output.len())) };
        let frequency = f32::from(self.params.frequency.load(Ordering::Relaxed));

        // let volume: u8 = self.params.volume.load(Ordering::Relaxed);
        // // let mut panspread = f32::from(self.params.panspread.load(Ordering::Relaxed));
        // // let freqspread = self.params.freqspread.load(Ordering::Relaxed);
        // // let voices = self.params.voices.load(Ordering::Relaxed);

        let mut panspread: f32 = 0.5;
        let freqspread: f32 = 0.5;
        let voices: usize = 6;
        // let frequency: f32 = 440.0;

        let sample_rate: f32 = 44100.0;

        panspread = panspread * 0.5 + 0.5;
        let gain_1 = (1.0 - panspread).sqrt();
        let gain_2 = panspread.sqrt();
        for nu in 0..voices {
            let n = nu as f32;

            let mut adj: f32 = 0.0;
            let is_odd = (nu & 1) == 1;
            if nu > 0 {
                if is_odd {
                    adj = n * freqspread;
                } else {
                    adj = -((n.sub(1.0)) * freqspread);
                }
            }
            let freq = (frequency + adj * 0.01 * frequency).max(1.0);
            let mut gain_l = gain_1;
            let mut gain_r = gain_2;
            // invert right and left gain
            if is_odd {
                gain_l = gain_2;
                gain_r = gain_1;
            }
            // eslint-disable-next-line no-undef
            let dt = freq / sample_rate;
            // for a in output {
            for i in 0..output.len() {
                let cur_phase = *self.phase.get(nu).unwrap_or(&0.0);
                //     let mut v = output.get(i).unwrap();
                let v = saw(cur_phase, &dt);
                let curr_value = *output.get(i).unwrap();
                let new_value = curr_value + (v * gain_l);
                if self.logged < 1 {
                    // unsafe { web_sys::console::log_1(&JsValue::from(cur_phase)) };
                    unsafe { web_sys::console::log_1(&JsValue::from(gain_l)) };
                    // unsafe { web_sys::console::log_1(&JsValue::from(new_value)) };
                }

                output[i] = new_value;
                // // output_2[i] = output.get(i).unwrap() + (v * gain_r);
                let mut newphase = cur_phase + dt;

                if newphase > 1.0 {
                    newphase = newphase - 1.0;
                }
                // self.phase.remove(nu);
                if self.phase.len() <= nu {
                    self.phase.insert(nu, newphase)
                } else {
                    self.phase[nu] = newphase;
                }

                // unsafe { web_sys::console::log_1(&JsValue::from(output[i])) };

                // self.phase.insert(nu, newphase);
                // self.phase[nu] = newphase;
            }

            self.logged = 1;

            //     //     self.accumulator += u32::from(frequency);
            //     //     *a = (self.accumulator as f32 / 512.).sin() * (volume as f32 / 100.);
            //     //
        }
        true
    }
}

#[derive(Default)]
pub struct Params {
    // Use atomics for parameters so they can be set in the main thread and
    // fetched by the audio process thread without further synchronization.

    // panspread: AtomicU8,
    // freqspread: AtomicI32,
    // voices: AtomicU8,
    frequency: AtomicU8,
    volume: AtomicU8,
}

impl Params {
    pub fn set_frequency(&self, frequency: u8) {
        self.frequency.store(frequency, Ordering::Relaxed);
    }
    pub fn set_volume(&self, volume: u8) {
        self.volume.store(volume, Ordering::Relaxed);
    }
}
