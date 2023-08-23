import { register } from '@strudel.cycles/core';

export function registerJadeMethods() {
  register('dirt', (orbit, pat) => pat.osc().orbit(orbit ?? 0));
  register('swingBy', (amount, division, pat) => {
    const divide = division ?? 16;
    return pat.when(
      (x) => x.cat(0, 1).fast(divide),
      (x) => x.late(amount / divide),
    );
  });
  register('tout', (channel, pat) => pat.midi('tout').midichan(channel ?? 1));
  register('jstut', (binaryInput, slow, ply, pat) => {
    return pat.when(binaryInput, (x) => x.slow(slow).ply(ply));
  });
}
