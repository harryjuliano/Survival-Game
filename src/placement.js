import * as THREE from "three";
import { ROOM_CENTERS } from "./collision.js";
// Keep the entire world-space footprint inside its original room, including after scaling.
export function fitFurnitureToRoom(g, x, z) {
  g.updateMatrixWorld(true);
  let b = new THREE.Box3().setFromObject(g);
  const size = b.getSize(new THREE.Vector3());
  const fit = Math.min(1, 11 / size.x, 11 / size.z);
  if (fit < 1) {
    g.scale.multiplyScalar(fit);
    g.updateMatrixWorld(true);
    b.setFromObject(g);
  }
  const hx = (b.max.x - b.min.x) / 2,
    hz = (b.max.z - b.min.z) / 2,
    cx = ROOM_CENTERS[g.userData.room];
  g.position.x = THREE.MathUtils.clamp(x, cx - 5.5 + hx, cx + 5.5 - hx);
  g.position.z = THREE.MathUtils.clamp(z, -5.5 + hz, 5.5 - hz);
  g.updateMatrixWorld(true);
}
export function findFreePosition(collision, x, z, doors) {
  if (collision.canStand(x, z, doors)) return { x, z };
  for (let r = 0.6; r < 7; r += 0.6)
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        px = x + Math.cos(a) * r,
        pz = z + Math.sin(a) * r;
      if (collision.canStand(px, pz, doors)) return { x: px, z: pz };
    }
  return { x: -32, z: -2.5 };
}
