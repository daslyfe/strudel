import { invoke } from '@tauri-apps/api/tauri';
import { noteToMidi } from '@strudel.cycles/core';
import { Pattern, isPattern, logger } from '@strudel.cycles/core';

export function playNote(hap, offset, output) {
  const { note, nrpnn, nrpv, ccn, ccv, midichan = 1 } = hap.value;
  const velocity = hap.context?.velocity ?? 0.9; // TODO: refactor velocity
  const duration = hap.duration.valueOf() * 1000 - 100;
  const roundedOffset = Math.round(offset);
  const NOTE_ON_MSG = 0x90;
  const NOTE_OFF_MSG = 0x80;
  logger(output);

  if (note != null) {
    const midiNumber = typeof note === 'number' ? note : noteToMidi(note);
    logger(velocity.toString());

    const noteData = {
      notenumber: midiNumber,
      velocity: Math.floor(velocity * 100),
      duration: Math.floor(duration),
      offset: roundedOffset,
      cc: [false, 1, 0],
      output: output ?? 'IAC',
      message: NOTE_ON_MSG + (midichan - 1),
    };
    setTimeout(() => {
      invoke('test_send', noteData);

      setTimeout(() => {
        invoke('test_send', { ...noteData, message: NOTE_OFF_MSG + (midichan - 1) });
      }, duration);
    }, roundedOffset);
  }
}
