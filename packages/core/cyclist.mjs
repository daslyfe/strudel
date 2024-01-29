/*
cyclist.mjs - <short description TODO>
Copyright (C) 2022 Strudel contributors - see <https://github.com/tidalcycles/strudel/blob/main/packages/core/cyclist.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import createClock from './zyklus.mjs';
import { logger } from './logger.mjs';

export class Cyclist {
  constructor({ interval, onTrigger, onToggle, onError, getTime, latency = 0.1 }) {
    this.started = false;
    this.cps = 1;
    this.num_ticks_since_cps_change = 0;
    this.lastTick = 0; // absolute time when last tick (clock callback) happened
    this.lastBegin = 0; // query begin of last tick
    this.lastEnd = 0; // query end of last tick
    this.getTime = getTime; // get absolute time
    this.worker = new SharedWorker(new URL('./zyklusworker.js', import.meta.url));
    this.worker.port.start();
    this.num_cycles_at_cps_change = 0;
    this.onToggle = onToggle;
    this.latency = latency; // fixed trigger time offset
    this.nextCycleStartTime = 0;
    this.worker_time_diff;

    const callback = (phase, duration, tick, workertime) => {
      const time = getTime();
      if (tick === 0) {
        this.origin = phase;
      }
      if (this.worker_time_diff == null) {
        this.worker_time_diff = workertime - time;
      }
      if (this.num_ticks_since_cps_change === 0) {
        this.num_cycles_at_cps_change = this.lastEnd;
      }
      this.num_ticks_since_cps_change++;
      try {
        const begin = this.lastEnd;
        this.lastBegin = begin;
        //convert ticks to cycles, so you can query the pattern for events
        const eventLength = duration * this.cps;
        const num_cycles_since_cps_change = this.num_ticks_since_cps_change * eventLength;
        const end = this.num_cycles_at_cps_change + num_cycles_since_cps_change;
        this.lastEnd = end;

        // query the pattern for events
        const haps = this.pattern.queryArc(begin, end, { _cps: this.cps });

        const tickdeadline = phase - time - this.worker_time_diff; // time left until the phase is a whole number

        this.lastTick = time + tickdeadline;

        haps.forEach((hap) => {
          if (hap.part.begin.equals(hap.whole.begin)) {
            const deadline = (hap.whole.begin - begin) / this.cps + tickdeadline + latency;
            const duration = hap.duration / this.cps;
            onTrigger?.(hap, deadline, duration, this.cps);
          }
        });
      } catch (e) {
        logger(`[cyclist] error: ${e.message}`);
        onError?.(e);
      }
    };
    this.worker.port.addEventListener('message', (message) => {
      console.count(message);
      if (!this.started) {
        return;
      }
      const { payload, type } = message.data;

      switch (type) {
        case 'tick': {
          const { duration, phase, tick, time } = payload;
          callback(phase, duration, tick, time);
        }
      }
    });

    this.clock = createClock(
      getTime,
      // called slightly before each cycle
      () => {},
      interval, // duration of each cycle
    );
  }
  sendMessage(type, payload) {
    this.worker.port.postMessage({ type, payload });
  }
  now() {
    const secondsSinceLastTick = this.getTime() - this.lastTick - this.clock.duration;
    return this.lastBegin + secondsSinceLastTick * this.cps; // + this.clock.minLatency;
  }
  setStarted(v) {
    this.started = v;
    this.onToggle?.(v);
  }
  start() {
    this.num_ticks_since_cps_change = 0;
    this.num_cycles_at_cps_change = 0;
    if (!this.pattern) {
      throw new Error('Scheduler: no pattern set! call .setPattern first.');
    }
    logger('[cyclist] start');
    this.clock.start();
    this.setStarted(true);
    this.sendMessage('toggle', { started: this.started });
    // this.started = started;
  }
  pause() {
    logger('[cyclist] pause');
    this.clock.pause();
    this.setStarted(false);
  }
  stop() {
    logger('[cyclist] stop');
    this.clock.stop();
    this.lastEnd = 0;
    this.setStarted(false);
    this.sendMessage('toggle', { started: this.started });
  }
  setPattern(pat, autostart = false) {
    this.pattern = pat;
    if (autostart && !this.started) {
      this.start();
    }
  }
  setCps(cps = 1) {
    if (this.cps === cps) {
      return;
    }
    this.cps = cps;
    this.num_ticks_since_cps_change = 0;
  }
  log(begin, end, haps) {
    const onsets = haps.filter((h) => h.hasOnset());
    console.log(`${begin.toFixed(4)} - ${end.toFixed(4)} ${Array(onsets.length).fill('I').join('')}`);
  }
}
