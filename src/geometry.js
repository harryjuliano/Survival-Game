import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
export const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
export function mesh(geo, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function box(parent, w, h, d, x, y, z, m) {
  return mesh(
    new RoundedBoxGeometry(
      w,
      h,
      d,
      2,
      Math.min(0.055, w * 0.12, h * 0.12, d * 0.12),
    ),
    m,
    parent,
    x,
    y,
    z,
  );
}
export function cyl(parent, rt, rb, h, x, y, z, m, n = 16) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, n), m, parent, x, y, z);
}
export function ball(parent, r, x, y, z, m) {
  return mesh(new THREE.SphereGeometry(r, 12, 8), m, parent, x, y, z);
}
export function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
let seed = 91257;
export function rnd() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}
export function texture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle =
    kind === "wood" ? "#ba9168" : kind === "grass" ? "#7d9c69" : "#eeeade";
  ctx.fillRect(0, 0, 512, 512);
  if (kind === "tile") {
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++) {
        ctx.fillStyle = (i + j) % 2 ? "#d6dcce" : "#f0ecdf";
        ctx.fillRect(i * 64, j * 64, 63, 63);
      }
  } else if (kind === "wood") {
    for (let row = 0; row < 8; row++) {
      ctx.strokeStyle = "#89634066";
      ctx.strokeRect(-128 * (row % 2), row * 64, 256, 64);
      ctx.strokeRect(256 - 128 * (row % 2), row * 64, 256, 64);
      for (let j = 0; j < 30; j++) {
        ctx.fillStyle = "#73543215";
        ctx.fillRect(rnd() * 512, row * 64 + rnd() * 64, 40 + rnd() * 120, 1);
      }
    }
  } else {
    for (let i = 0; i < 7000; i++) {
      ctx.fillStyle = i % 2 ? "#bfd39944" : "#486e4938";
      ctx.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 2 + rnd() * 8);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.encoding = THREE.sRGBEncoding;
  return t;
}
