import { logger } from './logger.mjs';

export class NeoCyclist {
  constructor({ onTrigger, onToggle, latency = 0.1, onError, getTime }) {
    this.started = false;
    this.pattern;
    this.onToggle = onToggle;
    this.latency = latency;
    this.worker = new SharedWorker(new URL('./cyclistworker.js', import.meta.url));
    this.worker.port.start();
    this.getTime = getTime;
    this.cycle = 0;
    this.cps = 1;
    this.timeAtLastTick = 0;
    this.worker_time_diff = 0;
    this.worker.port.addEventListener('message', (message) => {
      if (!this.started) {
        return;
      }
      const { payload, type } = message.data;

      switch (type) {
        case 'tick': {
          const now = this.getTime();
          // const interval = 0.1;
          // const timeSinceLastMessage = now - this.timeAtLastTickMessage;
          // const messageLag = (interval * 1000 - timeSinceLastMessage) / 1000;

          this.timeAtLastTickMessage = now;
          let { begin, end, cps, cycle } = payload;

          if (this.cycle === 0) {
            this.worker_time_diff = payload.time - now;
          }
          const tickdeadline = payload.tickdeadline;
          console.log(tickdeadline, this.worker_time_diff);
          this.cps = cps;
          this.cycle = cycle + latency * cps;

          const haps = this.pattern.queryArc(begin, end);
          haps.forEach((hap) => {
            if (hap.part.begin.equals(hap.whole.begin)) {
              const deadline = (hap.whole.begin - begin) / cps + tickdeadline + latency;
              const duration = hap.duration / cps;
              onTrigger?.(hap, deadline, duration, cps);
            }
          });
          break;
        }
        case 'log': {
          const { type, text } = payload;
          if (type == 'error') {
            onError(text);
          } else {
            logger(text, type);
          }
        }
      }
    });
  }
  sendMessage(type, payload) {
    this.worker.port.postMessage({ type, payload });
  }

  now() {
    const gap = (this.getTime() - this.timeAtLastTickMessage) * this.cps;
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
