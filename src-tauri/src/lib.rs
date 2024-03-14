// use wasm_bindgen::prelude::*;
// use std::collections::HashMap;
// use crate::rand::Rng;
// // use rand::Rng;


// // static mut LEFT_PHASE: f64 = 0.0;
// // static

// #[wasm_bindgen]
// pub fn poly_blep (p: &f64, dt: &f64) ->f64  {
//   let mut phase = p + 0.0; 
//   // 0 <= phase < 1
//   if phase < *dt {
//     phase /= dt;
//     // 2 * (phase - phase^2/2 - 0.5)
//     return phase + phase - phase * phase - 1.0;
//   }
//  if phase > 1.0 - dt {
//     phase = (phase - 1.0) / dt;
//     // 2 * (phase^2/2 + phase + 0.5)
//     return phase * phase + phase + phase + 1.0;
//   }

//   // 0 otherwise
//     0.0
// }
// #[wasm_bindgen]
// pub fn saw(p: &f64, dt: &f64) ->f64 {
//     // Correct phase, so it would be in line with sin(2.*M_PI * phase)
//   let mut corrected_phase = p + 0.5;
 
//   if corrected_phase >= 1.0 {
//     corrected_phase = corrected_phase - 1.0;
//   };
//   let v = 2.0 * corrected_phase - 1.0;

//  v - poly_blep(&corrected_phase, dt)
// }

// #[wasm_bindgen]
// pub fn supersawprocessor(
//     current_time: f64,
//     sample_rate: f64,
//     frequency: f64,
//     phase: Vec<f64>,
//     detune: f64,
//     voices: i32,
//     freqspread: f64,
//     panspread: f64,
//     outputs: Vec<Vec<f64>>
// ) -> Vec<Vec<f64>> {
   
//     frequency =   (2.0_f64.powf(detune)).into() / 1200;
//     panspread = panspread * 0.5 + 0.5;
//     let gain_1 = (panspread - 1.0).sqrt();
//     let gain_2 = panspread.sqrt();
//     let output_length = 128;
//     let mut output_1 = outputs.get(0).unwrap();
//     // let mut output_1 : HashMap<&i32,  f64> = HashMap::new();
//     let mut output_2 = outputs.get(1).unwrap();
//     let mut phase : HashMap<&i32,  f64> = HashMap::new();


//     for n in 0..voices {
//         let mut adj = 0;
//         let is_odd = (n & 1) == 1;
//         let mut gain_l = gain_1;
//         let mut gain_r = gain_2;
//         // invert right and left gain
//         if is_odd {
//           gain_l = gain_1;
//           gain_r = gain_2;
//         }
//         let dt = frequency / sample_rate;


//       for  i in 0..output_length {
//         let mut rng = rand::thread_rng();
//         let mut cur_phase = phase.get(&n).unwrap_or(&rng.gen::<f64>());
     
//         let v = saw(cur_phase, &dt);

//         output_1.insert(&i, v * gain_l);
//         output_2.insert(&i, v * gain_r);
//         let mut new_phase = cur_phase + dt;
      


//         if new_phase > 1.0 {
//           new_phase = new_phase - 1.0;
//         }

//         phase.insert(&n, new_phase);
//       }


//      }


//      Vec::new()
// }


use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Output {
  pub output_1: Vec<f64>,
  pub output_2: Vec<f64>,
  pub phase: f64
}

// static mut PHASE: f64 = 0.0;
#[wasm_bindgen]
pub fn saw(current_time: f64, sample_rate: f64, o1: Vec<f64>, o2: Vec<f64>, phase: f64, frequency: f64) -> Output {

    let mut output_1 = o1.to_vec();
    let mut output_2 = o2.to_vec();
    let output_length = output_1.len();
    let mut new_phase = phase;

    let gain1 = (1 - panspread);
    let gain2 = Math.sqrt(panspread);


      for  i in 0..output_length {
        let mut cur_phase = phase;
     
        let v =  (((frequency * (cur_phase /sample_rate) * 1.0) % 1.0) - 0.5) * 1.0;

        output_1.insert(i, v );
        output_2.insert(i, v );
        new_phase+=1.0;
      }
    let p = vec![new_phase];
   
     return Output {
      output_1,
      output_2,
      phase: new_phase
     }
}





