// Seeded pseudo-random number generator (Mulberry32) + Gaussian via Box-Muller.
// Matches semantics of Python's `random.Random(seed)`: deterministic stream.

class Rng {
  constructor(seed) {
    if (seed === undefined || seed === null) {
      seed = (Math.random() * 2 ** 32) >>> 0;
    }
    this.state = seed >>> 0;
    this._spare = null; // for Box-Muller
  }

  // Uniform [0, 1).
  random() {
    let t = (this.state += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Integer in [lo, hi] inclusive (matches Python's randint).
  randint(lo, hi) {
    return lo + Math.floor(this.random() * (hi - lo + 1));
  }

  // Float in [lo, hi).
  uniform(lo, hi) {
    return lo + this.random() * (hi - lo);
  }

  // Gaussian with mean mu and std sigma.
  gauss(mu, sigma) {
    if (this._spare !== null) {
      const v = this._spare;
      this._spare = null;
      return mu + sigma * v;
    }
    let u1, u2;
    do {
      u1 = this.random();
    } while (u1 <= Number.EPSILON);
    u2 = this.random();
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const z0 = mag * Math.cos(2.0 * Math.PI * u2);
    const z1 = mag * Math.sin(2.0 * Math.PI * u2);
    this._spare = z1;
    return mu + sigma * z0;
  }

  // Weighted choice: items=[{value, weight}, ...]. Returns value.
  weighted(items) {
    const total = items.reduce((s, it) => s + it.weight, 0);
    if (total <= 0) return items[0].value;
    let r = this.random() * total;
    for (const it of items) {
      r -= it.weight;
      if (r <= 0) return it.value;
    }
    return items[items.length - 1].value;
  }

  choice(arr) {
    return arr[Math.floor(this.random() * arr.length)];
  }
}

module.exports = { Rng };
