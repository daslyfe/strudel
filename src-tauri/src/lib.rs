use wasm_bindgen::prelude::*;

static mut LEFT_PHASE: f64 = 0.0;
static

#[wasm_bindgen]
pub fn saw(
    current_time: f64,
    sample_rate: f64,
    frequency: f64,
    detune: f64,
    voices: i64,
    freqspread: f64,
    panspread: f64,
) -> f64 {
   
    frequency =   (2.0_f64.powf(detune)).into() / 1200;
    panspread = panspread * 0.5 + 0.5;
    let gain_1 = (panspread - 1.0).sqrt();
    let gain_2 = panspread.sqrt();
    let output_length = 128;
    let mut output_1 = 0.0;
    let mut output_2 = 0.0;

    for n in 0..voices {
        let mut adj = 0;
        let is_odd = (n & 1) == 1;
        let mut gain_l = gain_1;
        let mut gain_r = gain_2;
        // invert right and left gain
        if is_odd {
          gain_l = gain_1;
          gain_r = gain_2;
        }


      for  i in 0..output_length {
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


    (((f * current_time * 1.0) % 1.0) - 0.5) * 1.0
}
