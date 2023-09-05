import { parseNumeral, Pattern, logger } from '@strudel.cycles/core';
import { Invoke } from './utils.mjs';

Pattern.prototype.osc = function (otherparams) {
  return this.onTrigger(async (time, hap, currentTime, cps = 1) => {
    if (otherparams != null && typeof otherparams === 'object') {
      logger('params must be passed in as a key value object');
    }

    hap.ensureObjectValue();
    const cycle = hap.wholeOrPart().begin.valueOf();
    const delta = hap.duration.valueOf();
    const controls = { ...Object.assign({}, { cps, cycle, delta }, hap.value), ...otherparams };
    // make sure n and note are numbers
    controls.n && (controls.n = parseNumeral(controls.n));
    controls.note && (controls.note = parseNumeral(controls.note));
    console.log(otherparams);
    const params = [];

    const timestamp = Math.round(Date.now() + (time - currentTime) * 1000);

    Object.keys(controls).forEach((key) => {
      const val = controls[key];
      const value = typeof val === 'number' ? val.toString() : val;

      if (value == null) {
        return;
      }
      params.push({
        name: key,
        value,
        valueisnumber: typeof val === 'number',
      });
    });

    const messagesfromjs = [];
    if (params.length) {
      messagesfromjs.push({ target: '/dirt/play', timestamp, params });
    }
    console.log(otherparams);

    if (messagesfromjs.length) {
      setTimeout(() => {
        Invoke('sendosc', { messagesfromjs });
      });
    }
  });
};
