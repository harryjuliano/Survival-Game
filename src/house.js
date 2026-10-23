import * as THREE from "three";
import { box, ball, cyl, group, mat, mesh } from "./geometry.js";
import { currentRoom } from "./collision.js";
export function createHouse({ scene, materials, centers }) {
  const { wood, darkWood, plaster, roof, brass } = materials,
    doors = [],
    windows = [],
    roomFill = [],
    shell = [];
  function register(g, side, x) {
    const parts = [];
    g.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        parts.push(o);
      }
    });
    shell.push({ g, side, x, parts, alpha: 1 });
    return g;
  }
  function horizontalWall(cx, z, side) {
    const g = group(scene, cx, 0, z),
      wx = 2.4,
      ww = 2.8,
      low = 1.85,
      high = 3.75;
    box(g, 12.35, low, 0.28, 0, low / 2, 0, plaster);
    box(g, 12.35, 5 - high, 0.28, 0, (5 + high) / 2, 0, plaster);
    box(
      g,
      wx - ww / 2 + 6.175,
      high - low,
      0.28,
      (-6.175 + wx - ww / 2) / 2,
      (low + high) / 2,
      0,
      plaster,
    );
    box(
      g,
      6.175 - wx - ww / 2,
      high - low,
      0.28,
      (6.175 + wx + ww / 2) / 2,
      (low + high) / 2,
      0,
      plaster,
    );
    for (const y of [low, high]) box(g, ww + 0.24, 0.14, 0.36, wx, y, 0, wood);
    for (const x of [wx - ww / 2, wx + ww / 2])
      box(g, 0.14, high - low, 0.36, x, (low + high) / 2, 0, wood);
    box(g, ww + 0.4, 0.12, 0.58, wx, low - 0.08, 0, wood);
    const pivot = group(g, wx - ww / 2 + 0.08, low + 0.08, 0),
      pane = group(pivot, (ww - 0.16) / 2, (high - low - 0.16) / 2, 0);
    const glass = mat("#b5c7c5", {
      metalness: 0.1,
      roughness: 0.12,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    glass.name = "glass";
    box(pane, ww - 0.16, high - low - 0.16, 0.035, 0, 0, 0, glass);
    box(pane, 0.07, high - low - 0.16, 0.08, 0, 0, 0, wood);
    box(pane, ww - 0.16, 0.07, 0.08, 0, 0, 0, wood);
    ball(pane, 0.04, ww / 2 - 0.24, 0, 0.08, brass);
    windows.push({ x: cx + wx, z, open: false, pivot, sign: z > 0 ? 1 : -1 });
    box(g, 12.3, 0.18, 0.35, 0, 0.13, 0, darkWood);
    register(g, side, cx);
  }
  centers.forEach((cx, i) => {
    const floor = box(scene, 12.25, 0.22, 12.25, cx, -0.09, 0, wood);
    floor.material = wood.clone();
    floor.material.map = wood.map.clone();
    floor.material.map.repeat.set(5, 5);
    horizontalWall(cx, -6.1, "back");
    horizontalWall(cx, 6.1, "front");
    const x = cx - 6.1,
      g = group(scene, x, 0, 0);
    box(g, 0.3, 5, 2.85, 0, 2.5, -4.825, plaster);
    box(g, 0.3, 5, 7.85, 0, 2.5, 2.325, plaster);
    box(g, 0.3, 2, 1.8, 0, 4, -2.5, plaster);
    [-3.47, -1.53].forEach((z) => box(g, 0.4, 3.06, 0.12, 0, 1.53, z, wood));
    box(g, 0.4, 0.14, 2.1, 0, 3.06, -2.5, wood);
    const pivot = group(g, 0, 0, -3.4);
    box(pivot, 0.1, 2.94, 1.78, 0, 1.47, 0.89, wood);
    for (const y of [0.65, 1.95])
      box(pivot, 0.13, 0.95, 1.46, 0, y, 0.89, darkWood);
    for (const sign of [-1, 1]) {
      cyl(pivot, 0.025, 0.025, 0.18, sign * 0.12, 1.3, 1.55, brass).rotation.z =
        Math.PI / 2;
      ball(pivot, 0.045, sign * 0.19, 1.3, 1.55, brass);
    }
    doors.push({ x, z: -2.5, open: false, pivot });
    register(g, "partition", x);
    const roofGroup = group(scene, cx, 5, 0);
    box(roofGroup, 12.4, 0.18, 12.4, 0, 0.08, 0, plaster);
    for (const sign of [-1, 1]) {
      const panel = box(
        roofGroup,
        12.55,
        0.22,
        6.75,
        0,
        0.91,
        sign * 3.18,
        roof,
      );
      panel.rotation.x = sign * 0.245;
      box(roofGroup, 12.7, 0.2, 0.19, 0, 0.13, sign * 6.45, darkWood);
    }
    cyl(roofGroup, 0.14, 0.14, 12.6, 0, 1.72, 0, roof, 12).rotation.z =
      Math.PI / 2;
    // Gable end closes the space between ceiling and the pitched roof.
    for (const sign of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(-6.3, 0.1);
      shape.lineTo(0, 1.7);
      shape.lineTo(6.3, 0.1);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.2,
        bevelEnabled: false,
      });
      const end = mesh(geo, plaster, roofGroup, sign * 6.1, 0, 0);
      end.rotation.y = Math.PI / 2;
    }
    register(roofGroup, "roof", cx);
    const light = new THREE.PointLight("#ffd8a4", 0.7, 14, 2);
    light.position.set(cx, 4.4, 0);
    scene.add(light);
    roomFill.push(light);
    cyl(
      scene,
      0.28,
      0.36,
      0.2,
      cx,
      4.83,
      0,
      mat("#e1cfb4", { emissive: "#ffcf8f", emissiveIntensity: 0.25 }),
    );
  });
  const east = group(scene, 6.1, 0, 0);
  box(east, 0.3, 5, 12.5, 0, 2.5, 0, plaster);
  box(east, 0.36, 0.18, 12.4, 0, 0.13, 0, darkWood);
  register(east, "right", 6.1);
  // Entrance doorstep is flush with the terrain; the west doorway remains traversable.
  box(scene, 0.65, 0.08, 2.1, -30.85, -0.05, -2.5, materials.sand);
  const api = {
    doors,
    windows,
    roomFill,
    autoWalls: true,
    update(dt, player, camera) {
      const a = 1 - Math.exp(-8 * dt);
      doors.forEach(
        (d) =>
          (d.pivot.rotation.y = THREE.MathUtils.lerp(
            d.pivot.rotation.y,
            d.open ? -Math.PI / 2 : 0,
            a,
          )),
      );
      windows.forEach(
        (w) =>
          (w.pivot.rotation.y = THREE.MathUtils.lerp(
            w.pivot.rotation.y,
            w.open ? w.sign * 1.1 : 0,
            a,
          )),
      );
      const inside =
        player && currentRoom(player.position.x, player.position.z) >= 0;
      for (const s of shell) {
        const fade =
          api.autoWalls &&
          inside &&
          (s.side === "roof" ||
            (s.side === "front" && camera.position.z > 6) ||
            (s.side === "back" && camera.position.z < -6) ||
            (s.side === "right" && camera.position.x > 6) ||
            (s.side === "partition" &&
              (camera.position.x - s.x) * (player.position.x - s.x) < 0));
        s.alpha = THREE.MathUtils.lerp(s.alpha, fade ? 0.07 : 1, a);
        for (const p of s.parts) {
          if (p.material.name === "glass") continue;
          const transparent = s.alpha < 0.995;
          if (p.material.transparent !== transparent) {
            p.material.transparent = transparent;
            p.material.needsUpdate = true;
          }
          p.material.opacity = s.alpha;
          p.material.depthWrite = !transparent;
          p.castShadow = !fade;
        }
      }
    },
  };
  return api;
}
