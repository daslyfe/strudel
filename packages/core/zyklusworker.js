const getTime = () => performance.now() / 1000;
const allPorts = [];

const sendMessage = (type, payload) => {
  allPorts.forEach((port) => {
    port.postMessage({ type, payload });
  });
};

const sendTick = (phase, duration, tick, time) => {
  sendMessage('tick', { phase, duration, tick, time });
};
const interval = 0.1;
let clock = createClock(getTime, sendTick, interval);
let started = false;

const numClientsConnected = () => allPorts.length;
const processMessage = (message) => {
  const { type, payload } = message;

  switch (type) {
    case 'toggle': {
      if (payload.started && !started) {
        started = true;
        clock.start();
        //dont stop the clock if others are using it...
      } else if (numClientsConnected() === 1) {
        started = false;
        clock.stop();
      }
      break;
    }
  }
};

self.onconnect = function (e) {
  clock.start();
  console.log('initiating...');
  // the incoming port
  const port = e.ports[0];
  allPorts.push(port);
  port.addEventListener('message', function (e) {
    processMessage(e.data);
  });
  port.start(); // Required when using addEventListener. Otherwise called implicitly by onmessage setter.
};

function createClock(
  getTime,
  callback, // called slightly before each cycle
  duration = 0.05, // duration of each cycle
  interval = 0.1, // interval between callbacks
  overlap = 0.1, // overlap between callbacks
) {
  let tick = 0; // counts callbacks
  let phase = 0; // next callback time
  let precision = 10 ** 4; // used to round phase
  let minLatency = 0.01;
  const setDuration = (setter) => (duration = setter(duration));
  overlap = overlap || interval / 2;
  const onTick = () => {
    const t = getTime();
    const lookahead = t + interval + overlap; // the time window for this tick
    if (phase === 0) {
      phase = t + minLatency;
    }
    // callback as long as we're inside the lookahead
    while (phase < lookahead) {
      phase = Math.round(phase * precision) / precision;
      phase >= t && callback(phase, duration, tick, t);
      phase < t && console.log('TOO LATE', phase); // what if latency is added from outside?
      phase += duration; // increment phase by duration
      tick++;
    }
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
  // setCallback
  return { setDuration, start, stop, pause, duration, interval, getPhase, minLatency };
}
