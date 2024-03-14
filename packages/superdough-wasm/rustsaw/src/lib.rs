use wasm_bindgen::prelude::*;

// static mut PHASE: f64 = 0.0;
#[wasm_bindgen]
pub fn saw(current_time: f64, sample_rate: f64, outputs: Vec<Vec<f32>>, phase: f32, frequency: f64) -> Vec<Vec<f32>> {

    let mut output_1 = *outputs.get(0).unwrap();
    let mut output_2 = *outputs.get(1).unwrap();
    let output_length = output_1.len();
    let mut new_phase = phase;


      for  i in 0..output_length {
        let mut cur_phase = phase;
     
        let v =  (((frequency * (cur_phase /sample_rate) * 1.0) % 1.0) - 0.5) * 1.0;

        output_1.insert(i, v );
        output_2.insert(i, v );
        new_phase+=1.0;
      }
    let p = vec![new_phase];
   
     vec![output_1, output_2, p]
}
