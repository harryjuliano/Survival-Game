import * as THREE from "three";
import { normalizedShore } from "./terrain.js";
export const ROOM_CENTERS = [0, -12.2, -24.4],
  PARTITIONS = [-6.1, -18.3, -30.5];
export function currentRoom(x, z = 0) {
  if (Math.abs(z) > 6) return -1;
  return ROOM_CENTERS.findIndex((cx) => Math.abs(x - cx) < 6.1);
}
export function intersectsCircleBox(x, z, r, b) {
  const dx = x - Math.max(b.minX, Math.min(b.maxX, x)),
    dz = z - Math.max(b.minZ, Math.min(b.maxZ, z));
  return dx * dx + dz * dz < r * r;
}
export class CollisionWorld {
  constructor() {
    this.radius = 0.29;
    this.furniture = new Map();
    this.obstacles = [];
  }
  registerFurniture(g) {
    if (g.userData.name === "karpet") return;
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g);
    this.furniture.set(g, {
      minX: b.min.x,
      maxX: b.max.x,
      minZ: b.min.z,
      maxZ: b.max.z,
    });
  }
  remove(g) {
    this.furniture.delete(g);
  }
  addCircle(x, z, r) {
    this.obstacles.push({ x, z, r });
  }
  canStand(x, z, doors = []) {
    const r = this.radius;
    if (normalizedShore(x, z) > 0.985) return false;
    if (
      x >= -30.65 - r &&
      x <= 6.25 + r &&
      Math.abs(Math.abs(z) - 6.1) < 0.15 + r
    )
      return false;
    if (Math.abs(x - 6.1) < 0.15 + r && Math.abs(z) < 6.25 + r) return false;
    for (const wall of PARTITIONS) {
      if (Math.abs(x - wall) < 0.15 + r && Math.abs(z) < 6.25 + r) {
        const d = doors.find((d) => Math.abs(d.x - wall) < 0.01),
          pass = d?.open && Math.abs(d.pivot.rotation.y) > 1.25;
        if (z < -3.4 + r || z > -1.6 - r || !pass) return false;
      }
    }
    for (const b of this.furniture.values())
      if (intersectsCircleBox(x, z, r, b)) return false;
    for (const o of this.obstacles)
      if (Math.hypot(x - o.x, z - o.z) < o.r + r) return false;
    return true;
  }
}
