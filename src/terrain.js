export const ISLAND_X = -22;
export function shoreRadius(angle) {
  return 55 + Math.sin(angle * 3 + 0.7) * 2.2 + Math.sin(angle * 7) * 0.65;
}
export function radial(x, z) {
  return Math.hypot(x - ISLAND_X, z);
}
export function normalizedShore(x, z) {
  return radial(x, z) / shoreRadius(Math.atan2(z, x - ISLAND_X));
}
export function heightAt(x, z) {
  if (x >= -32 && x <= 8 && Math.abs(z) < 8) return 0;
  const r = normalizedShore(x, z);
  const plateau = 0.1 + Math.sin(x * 0.23) * Math.cos(z * 0.19) * 0.12;
  const edge = Math.max(0, Math.min(1, (r - 0.77) / 0.23));
  return plateau * (1 - edge) - 1.0 * edge * edge;
}
