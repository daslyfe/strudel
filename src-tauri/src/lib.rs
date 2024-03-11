use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use rand::Rng;


// static mut LEFT_PHASE: f64 = 0.0;
// static


pub fn poly_blep (p: &f64, dt: &f64) ->f64  {
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

pub fn saw(p: &f64, dt: &f64) ->f64 {
    // Correct phase, so it would be in line with sin(2.*M_PI * phase)
  let mut corrected_phase = p + 0.5;
 
  if corrected_phase >= 1.0 {
    corrected_phase = corrected_phase - 1.0;
  };
  let v = 2.0 * corrected_phase - 1.0;

 v - poly_blep(&corrected_phase, dt)
}

#[wasm_bindgen]
pub fn supersawprocessor(
    current_time: f64,
    sample_rate: f64,
    frequency: f64,
    detune: f64,
    voices: i32,
    freqspread: f64,
    panspread: f64,
) -> f64 {
   
    frequency =   (2.0_f64.powf(detune)).into() / 1200;
    panspread = panspread * 0.5 + 0.5;
    let gain_1 = (panspread - 1.0).sqrt();
    let gain_2 = panspread.sqrt();
    let output_length = 128;
    let mut output_1 : HashMap<&i32,  f64> = HashMap::new();
    let mut output_2 : HashMap<&i32,  f64> = HashMap::new();
    let mut phase : HashMap<&i32,  f64> = HashMap::new();


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
        let dt = frequency / sample_rate;


      for  i in 0..output_length {
        let mut rng = rand::thread_rng();
        let mut cur_phase = phase.get(&n).unwrap_or(&rng.gen::<f64>());
     
        let v = saw(cur_phase, &dt);

        output_1.insert(&i, v * gain_l);
        output_2.insert(&i, v * gain_r);
        let mut new_phase = cur_phase + dt;
      


        if new_phase > 1.0 {
          new_phase = new_phase - 1.0;
        }

        phase.insert(&n, new_phase);
      }


     }


     1.0
}
