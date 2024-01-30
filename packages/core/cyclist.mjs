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
    this.cps = 0.5;
    this.lastTick = 0; // absolute time when last tick (clock callback) happened
    this.lastBegin = 0; // query begin of last tick
    this.lastEnd = 0; // query end of last tick
    this.getTime = getTime; // get absolute time
    this.worker = new SharedWorker(new URL('./zyklusworker.js', import.meta.url));
    this.worker.port.start();
    this.num_cycles_at_cps_change = 0;
    this.onToggle = onToggle;
    this.latency = latency; // fixed trigger time offset
    this.worker_time_diff;
    this.cycle = 0;

    const callback2 = (payload) => {
      const workertime = payload.time;
      const time = this.getTime();

      const { duration, phase, num_ticks_since_cps_change, num_cycles_at_cps_change, cps } = payload;
      if (this.worker_time_diff == null) {
        this.worker_time_diff = workertime - time;
      }
      this.cps = cps;
      const eventLength = duration * cps;
      const num_cycles_since_cps_change = num_ticks_since_cps_change * eventLength;
      const begin = num_cycles_at_cps_change + num_cycles_since_cps_change;

      const tickdeadline = phase - time - this.worker_time_diff; // time left until the phase is a whole number
      const end = begin + eventLength;

      const lastTick = time + tickdeadline;
      const secondsSinceLastTick = time - lastTick - duration;
      this.cycle = begin + secondsSinceLastTick * cps;

      processHaps(begin, end, tickdeadline);
    };

    const processHaps = (begin, end, tickdeadline) => {
      const haps = this.pattern.queryArc(begin, end, { _cps: this.cps });

      haps.forEach((hap) => {
        if (hap.part.begin.equals(hap.whole.begin)) {
          const deadline = (hap.whole.begin - begin) / this.cps + tickdeadline + latency;
          const duration = hap.duration / this.cps;
          onTrigger?.(hap, deadline, duration, this.cps);
        }
      });
    };

    // const callback = (payload) => {
    //   const workertime = payload.time;
    //   const { duration, phase, num_ticks_since_cps_change, num_cycles_at_cps_change, cps } = payload;
    //   this.cps = cps;
    //   const time = getTime();
    //   console.log({ time });

    //   // if (this.worker_time_diff == null) {
    //   this.worker_time_diff = workertime - time;
    //   // }

    //   const begin = this.lastEnd;
    //   this.lastBegin = begin;
    //   //convert ticks to cycles, so you can query the pattern for events
    //   const eventLength = duration * this.cps;
    //   const num_cycles_since_cps_change = num_ticks_since_cps_change * eventLength;
    //   const end = num_cycles_at_cps_change + num_cycles_since_cps_change;
    //   this.lastEnd = end;

    //   // query the pattern for events

    //   const tickdeadline = phase - time - this.worker_time_diff; // time left until the phase is a whole number
    //   console.log({ tickdeadline });
    //   this.lastTick = time + tickdeadline;
    //   const secondsSinceLastTick = time - this.lastTick - duration;
    //   this.cycle = begin + secondsSinceLastTick * this.cps;

    //   processHaps(begin, end, tickdeadline);
    // };

    this.worker.port.addEventListener('message', (message) => {
      if (!this.started) {
        return;
      }
      const { payload, type } = message.data;

      switch (type) {
        case 'tick': {
          this.time_at_last_tick_message = this.getTime();
          callback2(payload);
          // callback2(phase, duration, tick, time);
        }
      }
    });

    this.clock = createClock(
      this.getTime,
      // called slightly before each cycle
      () => {},
      interval, // duration of each cycle
    );
  }
  sendMessage(type, payload) {
    this.worker.port.postMessage({ type, payload });
  }
  // now() {
  //   const secondsSinceLastTick = this.getTime() - this.lastTick - this.clock.duration;
  //   return this.lastBegin + secondsSinceLastTick * this.cps; // + this.clock.minLatency;
  // }

  now() {
    const gap = (this.getTime() - this.time_at_last_tick_message) * this.cps;
    return this.cycle + gap;
  }
  setCps(cps = 1) {
    this.sendMessage('cpschange', { cps });
  }
  setCycle(cycle) {
    this.sendMessage('setcycle', { cycle });
  }
  setStarted(started) {
    this.sendMessage('toggle', { started });
    this.started = started;
    this.onToggle?.(started);
  }
  start() {
    logger('[cyclist] start');
    this.setStarted(true);
  }
  stop() {
    logger('[cyclist] stop');
    this.setStarted(false);
  }
  setPattern(pat, autostart = false) {
    this.pattern = pat;
    if (autostart && !this.started) {
      this.start();
    }
  }

  log(begin, end, haps) {
    const onsets = haps.filter((h) => h.hasOnset());
    console.log(`${begin.toFixed(4)} - ${end.toFixed(4)} ${Array(onsets.length).fill('I').join('')}`);
  }
}
