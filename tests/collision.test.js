import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CollisionWorld, currentRoom, PARTITIONS } from "../src/collision.js";
import { heightAt, shoreRadius, ISLAND_X } from "../src/terrain.js";
import { AdaptiveQuality, PRESETS } from "../src/quality.js";
const doors = () =>
  PARTITIONS.map((x) => ({
    x,
    open: true,
    pivot: { rotation: { y: -Math.PI / 2 } },
  }));
test("Room classification does not mistake outdoor space for a room", () => {
  assert.equal(currentRoom(0, 0), 0);
  assert.equal(currentRoom(-12.2, 0), 1);
  assert.equal(currentRoom(-24.4, 0), 2);
  assert.equal(currentRoom(0, 8), -1);
  assert.equal(currentRoom(-32, -2.5), -1);
});
test("Closed walls block continuous paths around every room", () => {
  const world = new CollisionWorld();
  for (let x = -30.5; x < 6.1; x += 0.25) {
    assert.equal(world.canStand(x, 6.05, doors()), false);
    assert.equal(world.canStand(x, -6.05, doors()), false);
  }
  for (let z = -6; z < 6; z += 0.2)
    assert.equal(world.canStand(6.08, z, doors()), false);
});
test("All three doors open a collision-safe path to the island", () => {
  const world = new CollisionWorld(),
    ds = doors();
  for (let x = 0; x >= -33; x -= 0.04)
    assert.equal(world.canStand(x, -2.5, ds), true, `Path blocked at ${x}`);
  for (const d of ds) {
    d.open = false;
    assert.equal(world.canStand(d.x, -2.5, ds), false);
    d.open = true;
    d.pivot.rotation.y = -0.1;
    assert.equal(world.canStand(d.x, -2.5, ds), false);
    d.pivot.rotation.y = -Math.PI / 2;
    assert.equal(world.canStand(d.x, -3.4, ds), false);
  }
});
test("Furniture collision follows movement, rotation, scaling and removal", () => {
  const world = new CollisionWorld(),
    g = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1));
  g.position.set(0, 0.5, 0);
  world.registerFurniture(g);
  assert.equal(world.canStand(0, 0), false);
  assert.equal(world.canStand(2, 0), true);
  g.position.x = 2;
  g.scale.setScalar(2);
  g.rotation.y = Math.PI / 2;
  world.registerFurniture(g);
  assert.equal(world.canStand(2, 1.7), false);
  assert.equal(world.canStand(0, 0), true);
  world.remove(g);
  assert.equal(world.canStand(2, 1.7), true);
});
test("Tree and rock circles block penetration but allow tangential motion", () => {
  const w = new CollisionWorld();
  w.addCircle(-40, 12, 0.7);
  assert.equal(w.canStand(-40, 12), false);
  assert.equal(w.canStand(-41.1, 12), true);
});
test("Terrain and collider agree at the irregular shoreline; doorway is level", () => {
  const w = new CollisionWorld();
  for (let a = 0; a < 6.28; a += 0.2) {
    const r = shoreRadius(a);
    assert.equal(
      w.canStand(ISLAND_X + Math.cos(a) * r, Math.sin(a) * r),
      false,
    );
    assert.ok(heightAt(ISLAND_X + Math.cos(a) * r, Math.sin(a) * r) < -0.85);
  }
  for (let x = -32; x < 7; x += 0.25) assert.equal(heightAt(x, -2.5), 0);
});
test("Adaptive quality has hysteresis and bounded resolution without changing gameplay", () => {
  const q = new AdaptiveQuality();
  for (let i = 0; i < 4000; i++) q.sample(0.04);
  assert.ok(q.scale >= 0.65 && q.scale < 0.8);
  q.sample(12);
  assert.ok(q.scale >= 0.65);
  for (let i = 0; i < 5000; i++) q.sample(1 / 90);
  assert.equal(q.scale, 1);
  assert.ok(
    PRESETS.low.grass < PRESETS.medium.grass &&
      PRESETS.medium.grass < PRESETS.high.grass,
  );
});
