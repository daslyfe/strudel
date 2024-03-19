class SawProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.t = 0; // samples passed
    // console.log('hereee!!')


  
  
    // this.port.onmessage = (e) => {
    //   const key = Object.keys(e.data)[0];
    //   const value = e.data[key];
    //   switch (key) {
    //     case 'webassembly':
    //       WebAssembly.instantiate(value, this.importObject).then((result) => {
    //         this.api = result.instance.exports;
    //         this.port.postMessage('OK');
    //       });
    //       break;
    //     case 'frequency':
    //       this.f = value;
    //   }
    // };
  }

  process(inputs, outputs, parameters) {

    if (this.api) {
    // console.log(outputs[0])
    //   const params = {frequency: [440], panspread: [1], freqspread: [0.2], voices: 5 }
    //   let output = outputs[0];

    //   // if (currentTime <= params.begin[0]) {
    //   //   return true;
    //   // }
    //   // // eslint-disable-next-line no-undef
    //   // if (currentTime >= params.end[0]) {
    //   //   // this.port.postMessage({ type: 'onended' });
    //   //   return false;
    //   // }
    //   let frequency = params.frequency[0];
  
    //   //apply detune in cents
    //   frequency = frequency * Math.pow(2, params.detune[0] / 1200);
    //   const dt = frequency / sampleRate;
  

    //   const voices = params.voices[0];
    //   const freqspread = params.freqspread[0];
    //   const panspread = params.panspread[0] * 0.5 + 0.5;
   
    //   outputs[0] =  this.api.proc(output, currentTime, sampleRate, this.t, voices, panspread, frequency, freqspread)

  
    //   // for (let i = 0; i < output[0].length; i++) {
    //   //   let t = this.t;
    //   //   let out = 0;
    //   //   out = this.api.saw(t / 44100, this.f);
    //   //   output.forEach((channel) => {
    //   //     channel[i] = out;
    //   //   });
    //   //   this.t++;
    //   // }

    //   this.t = this.t + output[0].length * dt;
     }
   
    return true;
  }
}
registerProcessor('saw-processor', SawProcessor);