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

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct SineOsc {
    sample_rate: i32,
    cycler: i32,
}

#[wasm_bindgen]
impl SineOsc {
    pub fn sample(&mut self, pitch: f64, gain: f64) -> f64 {
        let seed: f64 = ((2.0 * std::f64::consts::PI) / (self.sample_rate as f64 / pitch)) * self.cycler as f64;

        self.cycler += 1;

        if self.cycler as f64 > (self.sample_rate as f64 / pitch) {
            self.cycler = 0;
        }

        gain * seed.sin()
    }

    pub fn new(sample_rate: i32) -> Self {
        SineOsc { sample_rate: sample_rate, cycler: 0 }
    }
}