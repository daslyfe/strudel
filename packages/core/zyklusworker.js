function getTime() {
  return performance.now() / 1000;
}
const allPorts = [];
let num_cycles_at_cps_change = 0;
let num_ticks_since_cps_change = 0;
let time_at_cps_change = 0;
let cps = 0.5;
let duration = 0.05;

const sendMessage = (type, payload) => {
  allPorts.forEach((port) => {
    port.postMessage({ type, payload });
  });
};

const sendTick = ({ phase, duration, tick, time }) => {
  sendMessage('tick', {
    phase,
    duration,
    tick,
    time,
    cps,
    num_cycles_at_cps_change,
    num_ticks_since_cps_change,
    time_at_cps_change,
  });
};

let clock = createClock(sendTick);
let started = false;

const startClock = () => {
  if (started) {
    return;
  }
  clock.start();
  time_at_cps_change = getTime();
  started = true;
};
const stopClock = () => {
  if (!started) {
    return;
  }
  clock.stop();
  started = false;
};

const numClientsConnected = () => allPorts.length;
const processMessage = (message) => {
  const { type, payload } = message;

  switch (type) {
    case 'cpschange': {
      if (payload.cps !== cps) {
        const eventLength = duration * cps;
        num_cycles_at_cps_change = (getTime() - time_at_cps_change) * cps;
        time_at_cps_change = getTime();

        // num_cycles_at_cps_change = num_ticks_since_cps_change * eventLength;

        num_ticks_since_cps_change = 0;
        cps = payload.cps;
      }
      break;
    }
    case 'toggle': {
      if (payload.started) {
        startClock();

        //dont stop the clock if others are using it...
      } else if (numClientsConnected() === 1) {
        stopClock();
      }
      break;
    }
  }
};

self.onconnect = function (e) {
  //   startClock();
  // the incoming port
  const port = e.ports[0];
  allPorts.push(port);
  port.addEventListener('message', function (e) {
    processMessage(e.data);
  });
  port.start(); // Required when using addEventListener. Otherwise called implicitly by onmessage setter.
};

function createClock(
  callback, // called slightly before each cycle
) {
  let interval = 0.1;
  let overlap = 0.1;
  let tick = 0; // counts callbacks
  let phase = 0; // next callback time
  let precision = 10 ** 4; // used to round phase
  let minLatency = 0.01;
  const setDuration = (setter) => (duration = setter(duration));

  const onTick = () => {
    const t = getTime();
    const lookahead = t + interval + overlap; // the time window for this tick
    if (phase === 0) {
      phase = t + minLatency;
    }
    callback({ phase, duration, tick, time: t });
    // callback as long as we're inside the lookahead
    // while (phase < lookahead) {
    //   phase = Math.round(phase * precision) / precision;
    //   phase >= t && callback({ phase, duration, tick, time: t });
    //   phase < t && console.log('TOO LATE', phase); // what if latency is added from outside?
    //   phase += duration; // increment phase by duration
    //   tick++;
    //   num_ticks_since_cps_change++;
    // }
  };
  let intervalID;
  const start = () => {
    clear(); // just in case start was called more than once
    onTick();
    intervalID = setInterval(onTick, interval * 1000);
  };
  const clear = () => intervalID !== undefined && clearInterval(intervalID);
  const pause = () => clear();
  const stop = () => {
    tick = 0;
    phase = 0;
    clear();
  };
  const getPhase = () => phase;
  return { setDuration, start, stop, pause, duration, interval, getPhase, minLatency };
}
