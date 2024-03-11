use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn saw(currentTime: f64, sampleRate: f64, frequency: f64) -> f64 {
    return (((f * currentTime * 1.0) % 1.0) - 0.5) * 1.0;
}
