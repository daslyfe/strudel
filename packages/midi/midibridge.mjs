import { invoke } from '@tauri-apps/api/tauri';
import { noteToMidi } from '@strudel.cycles/core';

export function playNote(hap, offset, output) {
  const { note, nrpnn, nrpv, ccn, ccv, midichan = 1 } = hap.value;
  const velocity = hap.context?.velocity ?? 0.9; // TODO: refactor velocity
  const duration = hap.duration.valueOf() * 1000;
  const roundedOffset = Math.round(offset);

  if (note != null) {
    const midiNumber = typeof note === 'number' ? note : noteToMidi(note);

    const noteData = {
      notenumber: midiNumber,
      velocity: Math.floor(velocity * 100),
      duration: Math.floor(duration - 10),
      offset: roundedOffset,
      cc: [false, 1, 0],
      outputport: output ?? 'IAC',
      midichan,
    };
    // invoke is temporarily blocking, run in an async process
    setTimeout(() => {
      invoke('sendmidi', noteData);
    });
  }
}
