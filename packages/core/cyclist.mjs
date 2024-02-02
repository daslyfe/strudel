/*
cyclist.mjs - <short description TODO>
Copyright (C) 2022 Strudel contributors - see <https://github.com/tidalcycles/strudel/blob/main/packages/core/cyclist.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

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

    this.cycle = 0;
    let tick_at_first_tick = 0;
    let time_at_first_tick = 0;
    let phase_at_first_tick = 0;
    let deadlineatfirsttick = 0;
    let num_callbacks = 0;
    let worker_time_dif = 0;

    let prevtime = getTime();

    const setTimeReferences = ({ tick, time, phase, workertime, date }) => {
      // const now = date.now();
      // const message_lag = (date - now) / 1000;
      tick_at_first_tick = tick;
      time_at_first_tick = time;
      phase_at_first_tick = phase;
      deadlineatfirsttick = phase_at_first_tick - workertime;
      worker_time_dif = workertime - time;
    };
    const callback2 = (payload) => {
      const workertime = payload.time;
      const time = this.getTime();

      const { duration, phase, num_ticks_since_cps_change, num_cycles_at_cps_change, tick, cps, date } = payload;
      // console.log(time, time - prevtime);
      prevtime = time;

      if (num_callbacks < 1) {
        setTimeReferences({ tick, time, phase, workertime, date });
        // const date_diff = 0;
      }

      this.cps = cps;
      const eventLength = duration * cps;
      const num_cycles_since_cps_change = num_ticks_since_cps_change * eventLength;
      const begin = num_cycles_at_cps_change + num_cycles_since_cps_change;

      const tick_diff = tick - tick_at_first_tick;
      let tickdeadline = phase - time - worker_time_dif;
      let approximatedeadline = phase - workertime;
      if (Math.abs(tickdeadline - approximatedeadline) > 0.015) {
        setTimeReferences({ tick, time, phase, workertime, date });
        tickdeadline = phase - time - worker_time_dif;
      }

      // let tickdeadline = tick_diff * duration - (time - time_at_first_tick) + deadlineatfirsttick + latency;

      console.log({ tickdeadline, d2: phase - workertime });
      const end = begin + eventLength;

      const lastTick = time + tickdeadline;
      const secondsSinceLastTick = time - lastTick - duration;
      this.cycle = begin + secondsSinceLastTick * cps;
      num_callbacks++;

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
  }
  sendMessage(type, payload) {
    this.worker.port.postMessage({ type, payload });
  }

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
