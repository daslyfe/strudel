export const worker = (() => {
  'use strict';
  const e = new Map(),
    t = new Map(),
    r = (e, t) => {
      let r, o;
      const i = performance.now();
      (r = i), (o = e - Math.max(0, i - t));
      return { expected: r + o, remainingDelay: o };
    },
    o = (e, t, r, i) => {
      const s = performance.now();
      s > r
        ? postMessage({ id: null, method: 'call', params: { timerId: t, timerType: i } })
        : e.set(t, setTimeout(o, r - s, e, t, r, i));
    };
  addEventListener('message', (i) => {
    let { data: s } = i;
    try {
      if ('clear' === s.method) {
        const {
          id: r,
          params: { timerId: o, timerType: i },
        } = s;
        if ('interval' === i)
          ((t) => {
            const r = e.get(t);
            if (void 0 === r) throw new Error('There is no interval scheduled with the given id "'.concat(t, '".'));
            clearTimeout(r), e.delete(t);
          })(o),
            postMessage({ error: null, id: r });
        else {
          if ('timeout' !== i) throw new Error('The given type "'.concat(i, '" is not supported'));
          ((e) => {
            const r = t.get(e);
            if (void 0 === r) throw new Error('There is no timeout scheduled with the given id "'.concat(e, '".'));
            clearTimeout(r), t.delete(e);
          })(o),
            postMessage({ error: null, id: r });
        }
      } else {
        if ('set' !== s.method) throw new Error('The given method "'.concat(s.method, '" is not supported'));
        {
          const {
            params: { delay: i, now: n, timerId: a, timerType: d },
          } = s;
          if ('interval' === d)
            ((t, i, s) => {
              const { expected: n, remainingDelay: a } = r(t, s);
              e.set(i, setTimeout(o, a, e, i, n, 'interval'));
            })(i, a, n);
          else {
            if ('timeout' !== d) throw new Error('The given type "'.concat(d, '" is not supported'));
            ((e, i, s) => {
              const { expected: n, remainingDelay: a } = r(e, s);
              t.set(i, setTimeout(o, a, t, i, n, 'timeout'));
            })(i, a, n);
          }
        }
      }
    } catch (e) {
      postMessage({ error: { message: e.message }, id: s.id, result: null });
    }
  });
})(); // tslint:disable-line:max-line-length