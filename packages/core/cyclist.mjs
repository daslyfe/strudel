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
    let worker_time_dif = 0;
    let precision = 10 ** 4;
    this.begin = 0;
    this.prevtime = getTime();
    let time_at_cps_change = 0;

    const getInterval = (num_cycles_at_cps_change, time_at_cps_change, time) => {
      return num_cycles_at_cps_change + (time - time_at_cps_change) * this.cps;
    };

    const callback2 = (payload) => {
      const workertime = payload.time;
      const time = this.getTime();
      const { duration, phase, num_ticks_since_cps_change, num_cycles_at_cps_change, cps } = payload;
      worker_time_dif - workertime - time;
      if (this.begin === 0) {
        this.begin = getInterval(num_cycles_at_cps_change, time_at_cps_change, time);
        time_at_cps_change = payload.time_at_cps_change - worker_time_dif;
        return;
      }

      // getInterval(num_cycles_at_cps_change, time_at_cps_change, prevtime);
      // console.log(begin);
      let end = getInterval(num_cycles_at_cps_change, time_at_cps_change, time);

      // let end = num_cycles_at_cps_change + (time - time_at_cps_change) * cps;

      processHaps(this.begin, end, 0);
      console.log({ begin: this.begin, end });
      time_at_cps_change = payload.time_at_cps_change - worker_time_dif;
      this.begin = end;
      this.cps = cps;
      this.cycle = end;
      this.prevtime = time;

      // if (this.cycle === 0) {
      //   setTimeReference(time, workertime);
      // }

      // // console.log(workertime - time);
      // this.cps = cps;
      // const eventLength = duration * cps;
      // const num_cycles_since_cps_change = (time - time_at_cps_change) / cps;

      // const num_cycles_since_cps_change2 = num_ticks_since_cps_change * eventLength;
      // console.log({ num_cycles_at_cps_change, num_cycles_since_cps_change, num_cycles_since_cps_change2 });
      // const begin = num_cycles_at_cps_change + num_cycles_since_cps_change2;
      // let tickdeadline = getTickDeadline(phase, time);
      // let approximatedeadline = phase - workertime;
      // if (Math.abs(tickdeadline - approximatedeadline) > 0.015) {
      //   setTimeReference(time, workertime);
      //   tickdeadline = getTickDeadline(phase, time);
      // }
      // const end = begin + eventLength;

      // const lastTick = time + tickdeadline;
      // const secondsSinceLastTick = time - lastTick - duration;
      // this.cycle = begin + secondsSinceLastTick * cps;

      // processHaps(begin, end, tickdeadline);
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
          if (this.started === false) {
            return;
          }
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
    const gap = (this.getTime() - this.prevtime) * this.cps;
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
    this.begin = 0;
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
