export const PRESETS = {
  low: { dpr: 1, shadow: 512, grass: 0.28, animals: 0.5, lod: 0.6, foam: 0.6 },
  medium: {
    dpr: 1.35,
    shadow: 1024,
    grass: 0.65,
    animals: 0.75,
    lod: 0.85,
    foam: 1,
  },
  high: { dpr: 1.75, shadow: 2048, grass: 1, animals: 1, lod: 1.2, foam: 1 },
};
export class AdaptiveQuality {
  constructor() {
    this.average = 1 / 60;
    this.elapsed = 0;
    this.scale = 1;
  }
  sample(dt) {
    if (dt <= 0 || dt > 0.2) return null;
    this.average = this.average * 0.97 + dt * 0.03;
    this.elapsed += dt;
    if (this.elapsed < 6) return null;
    this.elapsed = 0;
    const previous = this.scale;
    if (this.average > 1 / 36) this.scale = Math.max(0.65, this.scale - 0.1);
    else if (this.average < 1 / 55) this.scale = Math.min(1, this.scale + 0.05);
    return previous === this.scale ? null : this.scale;
  }
}
export function createQuality({ renderer, sun, environment }) {
  const adaptive = new AdaptiveQuality();
  let level = matchMedia("(max-width: 760px)").matches ? "low" : "medium";
  function ratio() {
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, PRESETS[level].dpr) * adaptive.scale,
    );
  }
  function set(value) {
    if (!PRESETS[value]) return;
    level = value;
    adaptive.scale = 1;
    const p = PRESETS[level];
    ratio();
    sun.shadow.mapSize.set(p.shadow, p.shadow);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    sun.shadow.needsUpdate = true;
    environment.setQuality(p);
  }
  set(level);
  return {
    get level() {
      return level;
    },
    set,
    update(dt) {
      if (adaptive.sample(dt) !== null) ratio();
    },
  };
}
