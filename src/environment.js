import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { loadModel, fitModel } from "./assets.js";
import { mat, mesh, group, cyl, ball, rnd } from "./geometry.js";
import { ISLAND_X, heightAt, shoreRadius, normalizedShore } from "./terrain.js";

const shoreGLSL = `float shoreR(vec2 p){float a=atan(p.y,p.x+22.0);return 55.0+sin(a*3.0+.7)*2.2+sin(a*7.0)*.65;}`;
export function terrain(scene, materials) {
  const geo = new THREE.PlaneGeometry(134, 134, 192, 192);
  geo.rotateX(-Math.PI / 2);
  geo.translate(ISLAND_X, 0, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const land = materials.grass.clone();
  land.onBeforeCompile = (s) => {
    s.uniforms.sandTex = { value: materials.sand.map };
    s.uniforms.sandNormal = { value: materials.sand.normalMap };
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTerrain;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvTerrain=position;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nvarying vec3 vTerrain;uniform sampler2D sandTex;uniform sampler2D sandNormal;${shoreGLSL}\nfloat beachMask(){vec2 p=vTerrain.xz;float noise=sin(p.x*1.2)*sin(p.y*.8)*.01+sin(p.x*.25+p.y*.4)*.015;return smoothstep(.71,.84,length(vec2(p.x+22.0,p.y))/shoreR(p)+noise);}`,
      )
      .replace(
        "#include <map_fragment>",
        "#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,mapTexelToLinear(texture2D(sandTex,vUv)).rgb*vec3(.83,.79,.7),beachMask());",
      );
    const normalChunk = THREE.ShaderChunk.normal_fragment_maps.replaceAll(
      "texture2D( normalMap, vUv ).xyz",
      "mix(texture2D(normalMap,vUv).xyz,texture2D(sandNormal,vUv).xyz,beachMask())",
    );
    s.fragmentShader = s.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      normalChunk,
    );
  };
  mesh(geo, land, scene).castShadow = false;
}
export function ocean(scene) {
  const time = { value: 0 },
    foam = { value: 1 };
  const geo = new THREE.PlaneGeometry(360, 360, 180, 180);
  geo.rotateX(-Math.PI / 2);
  const material = mat("#668c89", {
    metalness: 0.12,
    roughness: 0.22,
    envMapIntensity: 0.8,
  });
  material.onBeforeCompile = (s) => {
    s.uniforms.uTime = time;
    s.uniforms.uFoam = foam;
    const waves = `uniform float uTime;varying vec3 vOcean;float wave(vec2 p){return sin(dot(p,vec2(.24,.11))+uTime*.85)*.12+sin(dot(p,vec2(-.13,.29))-uTime*.63)*.075+sin(dot(p,vec2(.55,.38))+uTime*1.1)*.025;}`;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\n" + waves)
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>\nvec2 pp=position.xz;float eps=.12;objectNormal=normalize(vec3(-(wave(pp+vec2(eps,0.0))-wave(pp-vec2(eps,0.0)))/(2.0*eps),1.0,-(wave(pp+vec2(0.0,eps))-wave(pp-vec2(0.0,eps)))/(2.0*eps)));`,
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.y+=wave(position.xz);vOcean=(modelMatrix*vec4(transformed,1.0)).xyz;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nuniform float uTime;uniform float uFoam;varying vec3 vOcean;${shoreGLSL}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>\nvec2 p=vOcean.xz;float d=length(vec2(p.x+22.0,p.y))-shoreR(p);float deep=smoothstep(-1.0,24.0,d);vec3 sea=mix(vec3(.27,.44,.4),vec3(.065,.18,.22),deep);float swell=sin(d*2.6+uTime*1.05+sin(p.x*.42+p.y*.23)*.45);float edge=1.0-smoothstep(0.0,3.0,abs(d+.65));float bubbles=smoothstep(.25,.8,sin(p.x*9.0+uTime)*sin(p.y*11.0-uTime*.3));float foamAmount=smoothstep(.65,.96,swell)*edge*(.35+bubbles*.65)*uFoam;diffuseColor.rgb=mix(sea,vec3(.76,.8,.72),foamAmount*.86);`,
      );
  };
  const water = mesh(geo, material, scene, ISLAND_X, -0.88, 0);
  water.castShadow = false;
  water.receiveShadow = true;
  return { time, foam, water };
}
export function grassPatches(scene, materials) {
  // A curved, tapered blade. Each instance is independent; each patch has its own culling bound.
  const positions = [],
    indices = [],
    colors = [];
  for (let j = 0; j <= 5; j++) {
    const t = j / 5;
    for (const side of [-1, 1]) {
      positions.push(side * 0.035 * (1 - t), t * 0.6, Math.sin(t * 1.8) * 0.12);
      colors.push(0.3 + t * 0.28, 0.35 + t * 0.23, 0.16 + t * 0.12);
    }
  }
  for (let j = 0; j < 5; j++) {
    const i = j * 2;
    indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
  }
  const blade = new THREE.BufferGeometry();
  blade.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  blade.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  blade.setIndex(indices);
  blade.computeVertexNormals();
  // r128 does not calculate InstancedMesh bounds; a conservative local patch bound fixes culling.
  blade.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.4, 0), 6.6);
  const time = { value: 0 },
    material = mat("#b5b998", {
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 1,
    });
  material.onBeforeCompile = (s) => {
    s.uniforms.uWind = time;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uWind;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\nfloat phase=instanceMatrix[3].x*.7+instanceMatrix[3].z*.4;transformed.x+=sin(uWind*1.5+phase)*position.y*position.y*.3;transformed.z+=cos(uWind*.8+phase)*position.y*.08;`,
      );
  };
  const patches = [],
    dummy = new THREE.Object3D();
  for (let x = -62; x < 27; x += 8)
    for (let z = -40; z < 41; z += 8) {
      const slots = [];
      for (let n = 0; n < 180; n++) {
        const px = x + (rnd() - 0.5) * 8,
          pz = z + (rnd() - 0.5) * 8;
        if (
          normalizedShore(px, pz) > 0.77 ||
          (px > -33 && px < 9 && Math.abs(pz) < 9)
        )
          continue;
        slots.push([px, pz]);
      }
      if (!slots.length) continue;
      const inst = new THREE.InstancedMesh(blade, material, slots.length);
      inst.position.set(x, 0, z);
      inst.castShadow = false;
      inst.receiveShadow = true;
      slots.forEach(([px, pz], i) => {
        dummy.position.set(px - x, heightAt(px, pz), pz - z);
        dummy.rotation.y = rnd() * Math.PI * 2;
        dummy.scale.set(0.6 + rnd() * 0.7, 0.55 + rnd() * 1.2, 0.6 + rnd());
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        inst.setColorAt(
          i,
          new THREE.Color().setHSL(
            0.21 + rnd() * 0.055,
            0.15 + rnd() * 0.15,
            0.5 + rnd() * 0.13,
          ),
        );
      });
      inst.userData.fullCount = slots.length;
      scene.add(inst);
      patches.push(inst);
    }
  return { patches, time };
}
function makePalm(materials) {
  const g = new THREE.Group(),
    height = 6.8,
    curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(0.1, 2, 0),
      new THREE.Vector3(0.55, 4.7, 0.15),
      new THREE.Vector3(0.85, height, 0.3),
    ]);
  mesh(new THREE.TubeGeometry(curve, 32, 0.18, 14, false), materials.bark, g);
  const crown = group(g, 0.85, height, 0.3),
    parts = [];
  // Pinnate fronds: curved central rachis plus 52 narrow, curved leaflets per frond.
  for (let f = 0; f < 10; f++) {
    const angle = (f * Math.PI * 2) / 10,
      verts = [],
      uv = [],
      ix = [];
    const frond = new THREE.Group();
    frond.rotation.y = angle;
    frond.rotation.z = (rnd() - 0.5) * 0.16;
    for (let side of [-1, 1])
      for (let n = 0; n < 27; n++) {
        const t = (n + 1) / 29,
          length = 3.2,
          y = Math.sin(t * Math.PI) * 0.6 - t * t * 0.85,
          z = t * length,
          width = Math.sin(t * Math.PI) * 0.72 + 0.08,
          base = verts.length / 3;
        for (let seg = 0; seg < 5; seg++) {
          const q = seg / 4;
          const xx = side * q * width,
            yy = y - 0.22 * q * q,
            zz = z + q * 0.35;
          const taper = Math.sin(q * Math.PI) * 0.05 + 0.003;
          verts.push(xx, yy, zz - taper, xx, yy, zz + taper);
          uv.push(q, 0, q, 1);
        }
        for (let seg = 0; seg < 4; seg++) {
          const k = base + seg * 2;
          ix.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(angle));
    parts.push(geo);
  }
  const leafmat = mat("#5c7351", { side: THREE.DoubleSide, roughness: 0.88 });
  const all = BufferGeometryUtils.mergeBufferGeometries(parts);
  mesh(all, leafmat, crown);
  parts.forEach((g) => g.dispose());
  const coconut = mat("#77634b");
  for (let n = 0; n < 4; n++)
    ball(
      crown,
      0.16,
      Math.sin(n * 2) * 0.23,
      -0.15,
      Math.cos(n * 2) * 0.23,
      coconut,
    );
  g.userData.crown = crown;
  return g;
}
function animals(scene) {
  const entries = [],
    brown = mat("#6c6354"),
    crabMat = mat("#986c55"),
    wingMat = mat("#d2cabe", { side: THREE.DoubleSide });
  function wing(parent, side, type) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    if (type === "bird") {
      shape.quadraticCurveTo(side * 0.25, 0.18, side * 0.65, 0.03);
      shape.lineTo(side * 0.22, -0.12);
    } else {
      shape.bezierCurveTo(
        side * 0.35,
        0.3,
        side * 0.45,
        -0.12,
        side * 0.06,
        -0.12,
      );
    }
    shape.closePath();
    const g = group(parent);
    mesh(new THREE.ShapeGeometry(shape, 12), wingMat, g).rotation.x =
      -Math.PI / 2;
    return g;
  }
  for (let i = 0; i < 12; i++) {
    const g = group(scene),
      type = i < 7 ? "bird" : "butterfly";
    const body = ball(g, type === "bird" ? 0.1 : 0.025, 0, 0, 0, brown);
    body.scale.set(0.65, 0.7, 2.2);
    if (type === "bird") {
      ball(g, 0.07, 0, 0.035, 0.2, wingMat);
      const beak = mesh(
        new THREE.ConeGeometry(0.025, 0.1, 8),
        brown,
        g,
        0,
        0.02,
        0.29,
      );
      beak.rotation.x = Math.PI / 2;
    }
    const left = wing(g, -1, type),
      right = wing(g, 1, type);
    if (type === "butterfly") g.scale.setScalar(0.55);
    entries.push({
      g,
      type,
      left,
      right,
      phase: rnd() * 6,
      angle: rnd() * 6,
      r: 18 + rnd() * 35,
    });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6,
      r = shoreRadius(a) * 0.965,
      g = group(scene, ISLAND_X + Math.cos(a) * r, 0, Math.sin(a) * r);
    const shell = ball(g, 0.12, 0, 0.09, 0, crabMat);
    shell.scale.set(1.3, 0.5, 1);
    const legs = [];
    for (const s of [-1, 1]) {
      for (let j = 0; j < 4; j++) {
        const leg = group(g, s * 0.1, 0.07, (j - 1.5) * 0.05);
        const seg = cyl(
          leg,
          0.012,
          0.008,
          0.18,
          s * 0.07,
          -0.01,
          0,
          crabMat,
          6,
        );
        seg.rotation.z = s * 0.95;
        legs.push(leg);
      }
      ball(g, 0.055, s * 0.17, 0.09, 0.18, crabMat);
      ball(g, 0.018, s * 0.055, 0.16, 0.07, brown);
    }
    entries.push({
      g,
      type: "crab",
      phase: rnd() * 6,
      origin: g.position.clone(),
      legs,
    });
  }
  return {
    entries,
    update(t) {
      for (const a of entries) {
        if (a.type === "crab") {
          a.g.position.x = a.origin.x + Math.sin(t * 0.26 + a.phase) * 0.55;
          a.g.position.z = a.origin.z + Math.sin(t * 0.19 + a.phase) * 0.2;
          a.g.position.y = heightAt(a.g.position.x, a.g.position.z) + 0.025;
          a.legs.forEach((l, i) => (l.rotation.y = Math.sin(t * 6 + i) * 0.18));
        } else {
          const bird = a.type === "bird",
            angle = a.angle + t * (bird ? 0.05 : 0.14),
            r = a.r;
          a.g.position.set(
            ISLAND_X + Math.cos(angle) * r,
            bird
              ? 8 + Math.sin(t * 0.5 + a.phase) * 1.3
              : 1.4 + Math.sin(t * 1.4 + a.phase) * 0.4,
            Math.sin(angle) * r,
          );
          a.g.rotation.y = -angle;
          a.left.rotation.z =
            Math.sin(t * (bird ? 3.6 : 14) + a.phase) * (bird ? 0.3 : 0.9);
          a.right.rotation.z = -a.left.rotation.z;
        }
      }
    },
  };
}
function outdoorPoint(min = 0.2, max = 0.85) {
  for (let n = 0; n < 300; n++) {
    const angle = rnd() * Math.PI * 2,
      r = (min + rnd() * (max - min)) * shoreRadius(angle),
      x = ISLAND_X + Math.cos(angle) * r,
      z = Math.sin(angle) * r;
    if (!(x > -34 && x < 10 && Math.abs(z) < 11)) return { x, z };
  }
  return { x: -48, z: 12 };
}
export async function createEnvironment({ scene, materials, collision }) {
  terrain(scene, materials);
  const water = ocean(scene),
    grass = grassPatches(scene, materials),
    fauna = animals(scene),
    lods = [],
    palms = [];
  const [tree, treeLod, fern, fernLod, rock, rockLod, shell] =
    await Promise.all(
      [
        "island_tree_01",
        "island_tree_01-lod",
        "fern_02",
        "fern_02-lod",
        "coast_rocks_02",
        "coast_rocks_02-lod",
        "lambis_shell-lod",
      ].map(loadModel),
    );
  // High and low LODs reuse materials and GPU textures after loading.
  function shareMaterials(high, low) {
    const byName = new Map();
    high.traverse((o) => {
      if (o.isMesh) byName.set(o.material.name, o.material);
    });
    low.traverse((o) => {
      if (o.isMesh && byName.has(o.material.name)) {
        const old = o.material;
        o.material = byName.get(old.name);
        for (const value of Object.values(old))
          if (value?.isTexture) value.dispose();
        old.dispose();
      }
    });
  }
  shareMaterials(tree, treeLod);
  shareMaterials(rock, rockLod);
  shareMaterials(fern, fernLod);
  function addLOD(hi, lo, size, x, z, axis = "y", distance = 28) {
    const lod = new THREE.LOD();
    lod.addLevel(fitModel(hi, size, axis), 0);
    lod.addLevel(fitModel(lo, size, axis), distance);
    lod.position.set(x, heightAt(x, z), z);
    lod.rotation.y = rnd() * Math.PI * 2;
    scene.add(lod);
    lod.userData.distance = distance;
    lods.push(lod);
    return lod;
  }
  for (let i = 0; i < 12; i++) {
    const p = outdoorPoint(0.5, 0.86);
    addLOD(tree, treeLod, 5 + rnd() * 3, p.x, p.z);
    collision.addCircle(p.x, p.z, 0.55);
  }
  // Ferns are instanced by mesh/material; all share the source asset geometry.
  const fernInstances = [];
  const fernTransforms = [];
  for (let i = 0; i < 55; i++) {
    const p = outdoorPoint(0.3, 0.78);
    const root = fitModel(fernLod, 0.6 + rnd() * 0.65);
    root.position.set(p.x, heightAt(p.x, p.z), p.z);
    root.rotation.y = rnd() * 6.28;
    root.updateMatrixWorld(true);
    fernTransforms.push(root);
  }
  const template = fernTransforms[0],
    meshes = [];
  template.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  meshes.forEach((m, meshIndex) => {
    const geometry = m.geometry.clone();
    geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(-22, 2, 0),
      65,
    );
    const inst = new THREE.InstancedMesh(
      geometry,
      m.material,
      fernTransforms.length,
    );
    inst.frustumCulled = true;
    inst.receiveShadow = true;
    fernTransforms.forEach((root, i) => {
      let n = 0;
      root.traverse((o) => {
        if (o.isMesh && n++ === meshIndex) inst.setMatrixAt(i, o.matrixWorld);
      });
    });
    scene.add(inst);
    fernInstances.push(inst);
  });
  for (let i = 0; i < 11; i++) {
    const p = outdoorPoint(0.64, 0.91),
      palm = makePalm(materials);
    palm.position.set(p.x, heightAt(p.x, p.z), p.z);
    palm.scale.setScalar(0.7 + rnd() * 0.4);
    scene.add(palm);
    palms.push(palm);
    collision.addCircle(p.x, p.z, 0.23);
  }
  for (let i = 0; i < 14; i++) {
    const p = outdoorPoint(0.85, 1.02),
      size = 1.2 + rnd() * 2.2;
    addLOD(rock, rockLod, size, p.x, p.z, "x", 16);
    collision.addCircle(p.x, p.z, size * 0.28);
  }
  for (let i = 0; i < 28; i++) {
    const p = outdoorPoint(0.87, 0.97),
      model = fitModel(shell, 0.12 + rnd() * 0.16, "x");
    model.position.set(p.x, heightAt(p.x, p.z) + 0.02, p.z);
    model.rotation.y = rnd() * 6.28;
    scene.add(model);
  }
  // Small five-petal flowers near grass, instanced from one curved-petal geometry.
  const petal = new THREE.SphereGeometry(0.065, 8, 5);
  petal.scale(1, 0.25, 0.45);
  const petalGeo = [];
  for (let i = 0; i < 5; i++) {
    const g = petal.clone();
    g.translate(0.075, 0, 0);
    g.rotateY((i * Math.PI * 2) / 5);
    petalGeo.push(g);
  }
  const flowerGeo = BufferGeometryUtils.mergeBufferGeometries(petalGeo),
    flower = new THREE.InstancedMesh(
      flowerGeo,
      mat("#c5bda1", { roughness: 1 }),
      140,
    ),
    dummy = new THREE.Object3D();
  flowerGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(-22, 0, 0), 65);
  flower.frustumCulled = true;
  for (let i = 0; i < 140; i++) {
    const p = outdoorPoint(0.3, 0.75);
    dummy.position.set(p.x, heightAt(p.x, p.z) + 0.18, p.z);
    dummy.rotation.set(rnd() * 0.3, rnd() * 6, rnd() * 0.2);
    dummy.updateMatrix();
    flower.setMatrixAt(i, dummy.matrix);
  }
  scene.add(flower);
  let settings = { grass: 1, animals: 1, lod: 1 };
  return {
    heightAt,
    water,
    grass,
    lods,
    setQuality(value) {
      settings = value;
      grass.patches.forEach(
        (p) =>
          (p.count = Math.max(
            1,
            Math.floor(p.userData.fullCount * value.grass),
          )),
      );
      lods.forEach(
        (l) => (l.levels[1].distance = l.userData.distance * value.lod),
      );
      water.foam.value = value.foam;
      fauna.entries.forEach(
        (a, i) => (a.g.visible = i % Math.round(1 / value.animals) === 0),
      );
    },
    update(dt, t, camera) {
      water.time.value = t;
      grass.time.value = t;
      fauna.update(t);
      palms.forEach((p, i) => {
        p.userData.crown.rotation.z = Math.sin(t * 0.7 + i) * 0.035;
        p.userData.crown.rotation.x = Math.cos(t * 0.5 + i) * 0.025;
      });
      lods.forEach((l, i) => {
        l.update(camera);
        if (i < 12) l.rotation.z = Math.sin(t * 0.55 + i) * 0.008;
      });
      grass.patches.forEach(
        (p) =>
          (p.visible =
            p.position.distanceTo(camera.position) <
            (settings.grass < 0.4 ? 32 : settings.grass < 0.8 ? 44 : 60)),
      );
    },
  };
}
