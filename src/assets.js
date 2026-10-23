import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { mat } from "./geometry.js";
export const assetURL = (path) => `${import.meta.env.BASE_URL}assets/${path}`;
const loader = new GLTFLoader(),
  models = new Map();
export function loadGLTF(path) {
  if (!models.has(path)) {
    const promise = loader.loadAsync(assetURL(path)).catch((e) => {
      models.delete(path);
      throw new Error(`Aset gagal dimuat: ${path}`, { cause: e });
    });
    models.set(path, promise);
  }
  return models.get(path);
}
export async function loadModel(name) {
  return (await loadGLTF(`models/${name}.glb`)).scene;
}
export function fitModel(source, size, axis = "y") {
  const g = new THREE.Group(),
    model = source.clone(true);
  g.add(model);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model),
    dimensions = bounds.getSize(new THREE.Vector3()),
    center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
  g.scale.setScalar(size / dimensions[axis]);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = true;
      o.userData.sharedAsset = true;
    }
  });
  return g;
}
export async function loadMaterials(renderer) {
  const tex = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  async function pbr(name, color = "#ffffff", repeat = 1) {
    const maps = await Promise.all(
      ["color", "normal", "roughness"].map(async (key) => {
        const t = await tex.loadAsync(assetURL(`textures/${name}/${key}.jpg`));
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeat, repeat);
        t.anisotropy = aniso;
        if (key === "color") t.encoding = THREE.sRGBEncoding;
        return t;
      }),
    );
    return mat(color, {
      map: maps[0],
      normalMap: maps[1],
      roughnessMap: maps[2],
      roughness: 1,
      normalScale: new THREE.Vector2(0.65, 0.65),
      envMapIntensity: 0.42,
    });
  }
  const [wood, plaster, roof, bark, sand, grass] = await Promise.all([
    pbr("wood", "#c9b59b"),
    pbr("plaster", "#ddd2bc"),
    pbr("roof", "#a68c79", 2),
    pbr("bark", "#b7a58e"),
    pbr("sand", "#c5b8a1", 48),
    pbr("grass", "#a2aa86", 48),
  ]);
  const darkWood = wood.clone();
  darkWood.color.set("#78614b");
  const linen = mat("#d7ccba", { roughness: 0.98 });
  const cream = linen.clone();
  const green = mat("#71816c", { roughness: 0.92 });
  const brass = mat("#a58e64", { metalness: 0.75, roughness: 0.36 });
  return {
    wood,
    darkWood,
    cream,
    green,
    brass,
    plaster,
    roof,
    bark,
    sand,
    grass,
    linen,
  };
}
export async function loadHDR(renderer, scene) {
  const hdr = await new RGBELoader()
    .setDataType(THREE.UnsignedByteType)
    .loadAsync(assetURL("environment/sky.hdr"));
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const environment = pmrem.fromEquirectangular(hdr);
  scene.environment = environment.texture;
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = hdr;
  pmrem.dispose();
}
let sofaSource, fernSource;
export async function upgradeFurniture(objects) {
  [sofaSource, fernSource] = await Promise.all([
    loadModel("sofa_03"),
    loadModel("fern_02"),
  ]);
  objects.forEach(upgradeOneFurniture);
}
export function upgradeOneFurniture(g) {
  let model;
  if (g.userData.name === "sofa" && sofaSource) {
    g.traverse((o) => {
      if (o.isMesh && !o.userData.sharedAsset) o.geometry.dispose();
    });
    g.clear();
    model = fitModel(sofaSource, 3.2, "x");
    g.add(model);
  }
  if (["tanaman", "pot kecil"].includes(g.userData.name) && fernSource) {
    while (g.children.length > 1) g.remove(g.children[g.children.length - 1]);
    model = fitModel(fernSource, 1.2);
    model.position.y = 0.54;
    g.add(model);
    model.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        g.userData.plantMaterials?.push(o.material);
      }
    });
  }
  g.traverse((o) => {
    if (o.isMesh) o.userData.owner = g;
  });
}
