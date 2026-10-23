import { upgradeOneFurniture } from "./assets.js";
import * as THREE from "three";
import { mat, mesh, box, cyl, ball, group, rnd } from "./geometry.js";
export function createFurnitureSystem({ scene, materials, collision }) {
  const { wood, darkWood, cream, green, brass } = materials;
  const objects = [],
    plantMats = [];
  let decorId = 0;
  function createFurniture(type, x, z, room = 0, extra = false) {
    const g = group(scene, x, 0, z);
    g.userData = { name: type, room, extra, baseScale: 1 };
    g.userData.plantMaterials = plantMats;
    objects.push(g);
    const linen = mat(type === "sofa" ? "#cba278" : "#f1e9d7");
    if (type === "sofa") {
      box(g, 3.2, 0.5, 1.35, 0, 0.55, 0, green);
      box(g, 3.2, 1.1, 0.3, 0, 1.2, -0.6, green);
      [-1.5, 1.5].forEach((a) => box(g, 0.3, 0.75, 1.4, a, 0.95, 0, green));
      for (let a = -1; a <= 1; a++) box(g, 0.86, 0.23, 1, a, 0.87, 0.05, linen);
      [-1.3, 1.3].forEach((a) =>
        [-0.45, 0.45].forEach((b) =>
          cyl(g, 0.07, 0.07, 0.35, a, 0.18, b, darkWood),
        ),
      );
      box(g, 0.6, 0.6, 0.2, -0.9, 1.3, -0.35, mat("#eee5c8")).rotation.z =
        -0.18;
    } else if (type === "kasur") {
      box(g, 3, 0.5, 4, 0, 0.4, 0, wood);
      box(g, 2.85, 0.35, 3.8, 0, 0.81, 0, cream);
      box(g, 2.9, 1.3, 0.2, 0, 1, -1.95, wood);
      box(g, 2.87, 0.1, 2.5, 0, 1.02, 0.55, mat("#a8b5a0"));
      [-0.73, 0.73].forEach((a) =>
        box(g, 1.13, 0.2, 0.72, a, 1.1, -1.22, cream),
      );
      for (let a = -1.2; a <= 1.2; a += 0.4)
        box(g, 0.018, 0.018, 2.4, a, 1.08, 0.55, mat("#d4ddc8"));
    } else if (type === "lampu") {
      cyl(g, 0.45, 0.5, 0.14, 0, 0.07, 0, brass);
      cyl(g, 0.04, 0.04, 2.65, 0, 1.4, 0, brass);
      const shade = mat("#f4e2b1", {
        emissive: "#ffdf94",
        emissiveIntensity: 0.6,
        side: THREE.DoubleSide,
      });
      cyl(g, 0.38, 0.68, 0.8, 0, 2.6, 0, shade);
      g.userData.shade = shade;
    } else if (type === "tanaman" || type === "pot kecil") {
      cyl(g, 0.35, 0.23, 0.65, 0, 0.33, 0, mat("#c28e69"));
      const pm = mat("#486f48");
      plantMats.push(pm);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4;
        const leaf = ball(
          g,
          0.3,
          Math.sin(a) * 0.32,
          0.9 + (i % 3) * 0.22,
          Math.cos(a) * 0.32,
          pm,
        );
        leaf.scale.set(0.5, 1.7, 0.7);
        leaf.rotation.z = Math.sin(a) * 0.6;
      }
      cyl(g, 0.025, 0.025, 0.9, 0, 0.8, 0, green);
      if (type === "pot kecil") g.scale.setScalar(0.65);
    } else if (type === "tv") {
      box(g, 3.2, 0.65, 0.9, 0, 0.55, 0, wood);
      for (let i = -1; i <= 1; i++)
        box(g, 0.9, 0.32, 0.03, i, 0.58, 0.47, darkWood);
      box(g, 0.12, 0.5, 0.12, 0, 1.1, 0, brass);
      box(g, 2.7, 1.55, 0.17, 0, 1.95, 0, mat("#292f2d"));
      const screen = mat("#526a68", {
        emissive: "#82afaa",
        emissiveIntensity: 0.65,
      });
      box(g, 2.5, 1.35, 0.03, 0, 1.95, 0.1, screen);
      g.userData.screen = screen;
    } else if (type === "karpet") {
      box(g, 3.8, 0.035, 2.8, 0, 0.025, 0, mat("#c6a677"));
      box(g, 3.55, 0.01, 2.55, 0, 0.05, 0, mat("#e1d0aa"));
      for (let i = -3; i <= 3; i++) {
        const m = box(g, 0.36, 0.01, 0.36, i * 0.44, 0.06, 0, green);
        m.rotation.y = Math.PI / 4;
      }
    } else if (type === "rak buku") {
      box(g, 2.2, 2.8, 0.65, 0, 1.4, 0, wood);
      box(g, 1.95, 2.6, 0.62, 0, 1.4, 0.07, darkWood);
      for (let j = 0; j < 4; j++) {
        box(g, 2.2, 0.08, 0.7, 0, 0.2 + j * 0.8, 0.05, wood);
        for (let i = 0; i < 6; i++)
          box(
            g,
            0.16,
            0.35 + rnd() * 0.25,
            0.36,
            -0.85 + i * 0.31,
            0.45 + j * 0.8,
            0.18,
            mat(["#899776", "#c29a76", "#e0cda2", "#7c9492"][i % 4]),
          );
      }
    } else if (type === "meja kopi" || type === "meja makan") {
      const big = type === "meja makan",
        w = big ? 2.6 : 1.65,
        d = big ? 1.25 : 0.9,
        h = big ? 0.76 : 0.43;
      box(g, w, 0.16, d, 0, h, 0, wood);
      [-w * 0.4, w * 0.4].forEach((a) =>
        [-d * 0.35, d * 0.35].forEach((b) =>
          box(g, 0.12, h, 0.12, a, h / 2, b, darkWood),
        ),
      );
      cyl(g, 0.21, 0.21, 0.04, 0, h + 0.1, 0, cream);
      ball(g, 0.14, 0, h + 0.22, 0, mat("#c99762"));
    } else if (type === "kursi") {
      box(g, 0.95, 0.15, 0.95, 0, 0.75, 0, wood);
      box(g, 0.95, 0.8, 0.12, 0, 1.2, -0.43, green);
      [-0.35, 0.35].forEach((a) =>
        [-0.35, 0.35].forEach((b) =>
          box(g, 0.09, 0.75, 0.09, a, 0.375, b, darkWood),
        ),
      );
      box(g, 0.85, 0.08, 0.85, 0, 0.87, 0, cream);
    } else {
      objects.pop();
      scene.remove(g);
      throw new Error("Dekor tidak dikenal. Pilih dari katalog.");
    }
    g.traverse((m) => {
      if (m.isMesh) m.userData.owner = g;
    });
    const proportions = {
      lampu: 0.72,
      tv: 0.72,
      "rak buku": 0.75,
      kursi: 0.65,
    };
    if (proportions[type]) g.scale.setScalar(proportions[type]);
    if (type === "kasur") g.scale.set(0.68, 0.66, 0.56);
    g.userData.initialScaleVector = g.scale.clone();
    g.userData.initialScale = g.scale.x;
    g.userData.apiName = extra ? "dekor" + ++decorId : type;
    upgradeOneFurniture(g);
    return g;
  }
  const sofa = createFurniture("sofa", -3, 1.4),
    lamp = createFurniture("lampu", -4.5, -0.4),
    plant = createFurniture("tanaman", 4.6, -4.9),
    tv = createFurniture("tv", -0.7, -4.7),
    bed = createFurniture("kasur", 3, 1.8);
  const lampLight = new THREE.PointLight("#ffe1a1", 1.5, 12, 2);
  lampLight.position.set(0, 2.5, 0);
  lamp.add(lampLight);
  createFurniture("karpet", -12.2, 1, 1);
  createFurniture("sofa", -15.6, 1.4, 1);
  createFurniture("meja kopi", -12.2, 1, 1);
  createFurniture("rak buku", -12.2, -5, 1);
  createFurniture("tanaman", -8, -4, 1);
  createFurniture("meja makan", -24.4, 0, 2);
  [-1.1, 1.1].forEach((z) => {
    [-0.72, 0.72].forEach((x) => {
      const c = createFurniture("kursi", -24.4 + x, z, 2);
      if (z < 0) c.rotation.y = Math.PI;
    });
  });
  createFurniture("rak buku", -24.4, -5, 2);
  createFurniture("tanaman", -28.7, 3.6, 2);

  return {
    objects,
    plantMats,
    createFurniture,
    sofa,
    lamp,
    plant,
    tv,
    bed,
    lampLight,
  };
}
