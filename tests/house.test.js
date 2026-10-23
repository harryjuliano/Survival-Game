import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHouse } from "../src/house.js";
import { createFurnitureSystem } from "../src/furniture.js";
import { CollisionWorld, ROOM_CENTERS } from "../src/collision.js";
function setup() {
  const scene = new THREE.Scene(),
    collision = new CollisionWorld(),
    materials = {};
  for (const key of [
    "wood",
    "darkWood",
    "cream",
    "green",
    "brass",
    "plaster",
    "roof",
    "sand",
  ])
    materials[key] = new THREE.MeshStandardMaterial();
  materials.wood.map = new THREE.Texture();
  const house = createHouse({
    scene,
    materials,
    collision,
    centers: ROOM_CENTERS,
  });
  return { scene, collision, materials, house };
}
test("Actual house geometry encloses front, back, east, west and ceiling", () => {
  const { scene, house } = setup();
  house.autoWalls = false;
  house.update(1, null, new THREE.PerspectiveCamera());
  scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  function hits(x, y, z, dx, dy, dz) {
    ray.set(new THREE.Vector3(x, y, z), new THREE.Vector3(dx, dy, dz));
    return ray.intersectObjects(scene.children, true).length;
  }
  for (const cx of ROOM_CENTERS)
    for (const dx of [-5, -2, 0, 2.4, 5])
      for (const y of [0.4, 2.6, 4.5]) {
        assert.ok(hits(cx + dx, y, 0, 0, 0, 1), "Front opening");
        assert.ok(hits(cx + dx, y, 0, 0, 0, -1), "Back opening");
        assert.ok(hits(cx + dx, 1, 0, 0, 1, 0), "Missing ceiling");
      }
  assert.ok(hits(0, 1, 0, 1, 0, 0));
  assert.ok(hits(-24, 1, 0, -1, 0, 0));
});
test("Door animation clears the real mesh corridor and restores it on close", () => {
  const { scene, house } = setup(),
    camera = new THREE.PerspectiveCamera(),
    ray = new THREE.Raycaster(
      new THREE.Vector3(0, 1.5, -2.5),
      new THREE.Vector3(-1, 0, 0),
      0.01,
      33,
    );
  scene.updateMatrixWorld(true);
  assert.ok(ray.intersectObjects(scene.children, true).length > 0);
  house.doors.forEach((d) => (d.open = true));
  for (let i = 0; i < 120; i++) house.update(1 / 60, null, camera);
  scene.updateMatrixWorld(true);
  assert.equal(ray.intersectObjects(scene.children, true).length, 0);
  house.doors.forEach((d) => (d.open = false));
  for (let i = 0; i < 120; i++) house.update(1 / 60, null, camera);
  scene.updateMatrixWorld(true);
  assert.ok(ray.intersectObjects(scene.children, true).length > 0);
});
test("Existing default decor leaves the spawn point and door corridor traversable", () => {
  const { scene, house, materials, collision } = setup(),
    furniture = createFurnitureSystem({ scene, materials, collision });
  furniture.objects.forEach((o) => collision.registerFurniture(o));
  assert.ok(collision.canStand(0, 2.7, house.doors));
  for (const d of house.doors) {
    d.open = true;
    d.pivot.rotation.y = -Math.PI / 2;
  }
  for (let x = 0; x >= -33; x -= 0.1)
    assert.ok(
      collision.canStand(x, -2.5, house.doors),
      `Furniture blocks doorway at ${x}`,
    );
});

test("Oversized rotated furniture remains entirely within its assigned room", async () => {
  const { fitFurnitureToRoom } = await import("../src/placement.js");
  const g = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 4));
  g.userData.room = 1;
  g.scale.setScalar(3);
  g.rotation.y = 0.7;
  fitFurnitureToRoom(g, -7, 5);
  const b = new THREE.Box3().setFromObject(g);
  assert.ok(b.min.x >= -17.7 - 0.001 && b.max.x <= -6.7 + 0.001);
  assert.ok(b.min.z >= -5.501 && b.max.z <= 5.501);
});
test("Spawn and wake recovery find a free position after room decoration", async () => {
  const { findFreePosition } = await import("../src/placement.js");
  const w = new CollisionWorld(),
    g = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 3));
  g.position.set(0, 0.5, 2.7);
  w.registerFurniture(g);
  const p = findFreePosition(w, 0, 2.7, []);
  assert.ok(w.canStand(p.x, p.z));
  assert.ok(Math.hypot(p.x, p.z - 2.7) < 4);
});
