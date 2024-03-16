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

let startBtn = document.getElementById('start-sound');

      async function setup() {
        const bin = await WebAssembly.compileStreaming(await fetch('/www/wasm_demo_bg.wasm'));
        // const buf = await bin.arrayBuffer();

        let context =  new AudioContext();
        console.log("adding module");
        await context.audioWorklet.addModule('processor.js');
        let node = new AudioWorkletNode(context, 'web-synth-proto');
        node.port.postMessage({type: 'init-wasm', wasmData: bin});
        node.connect(context.destination);

        let freq = document.getElementById('frequency-input');

        freq.addEventListener('change', () => {
          node.port.postMessage({type: 'freq-update', freq: freq.value});
        });

        let stopBtn = document.getElementById('stop-sound');
        stopBtn.addEventListener('click', () => {
          context.close();
        });
      }

      startBtn.addEventListener('click', () => {
        setup();
      });