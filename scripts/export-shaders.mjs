// Generate the actual Three r128 shader sources for optional offline Mesa validation.
import * as THREE from "three";
import { WebGLProgram } from "three/src/renderers/webgl/WebGLProgram.js";
import { terrain, ocean, grassPatches } from "../src/environment.js";
import fs from "node:fs/promises";
const dir = process.argv[2] || "/tmp/room-decor-shaders";
await fs.mkdir(dir, { recursive: true });
const scene = new THREE.Scene(),
  m = () =>
    new THREE.MeshStandardMaterial({
      map: new THREE.Texture(),
      normalMap: new THREE.Texture(),
      roughnessMap: new THREE.Texture(),
    });
const materials = { grass: m(), sand: m() };
terrain(scene, materials);
ocean(scene);
grassPatches(scene, materials);
const unique = new Set();
let i = 0;
for (const obj of scene.children) {
  if (unique.has(obj.material)) continue;
  unique.add(obj.material);
  const material = obj.material,
    shader = {
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      uniforms: {},
    };
  material.onBeforeCompile(shader);
  for (const webgl2 of [false, true]) {
    const sources = [];
    const gl = {
      createProgram: () => ({}),
      createShader: (type) => ({ type }),
      shaderSource: (s, source) => sources.push({ type: s.type, source }),
      compileShader: () => {},
      attachShader: () => {},
      linkProgram: () => {},
      deleteShader: () => {},
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
    };
    const renderer = {
      getContext: () => gl,
      debug: { checkShaderErrors: false },
      gammaFactor: 2,
    };
    const parameters = {
      ...shader,
      shaderName: `overhaul${i}`,
      defines: { STANDARD: "" },
      precision: "highp",
      isWebGL2: webgl2,
      maxBones: 0,
      map: !!material.map,
      mapEncoding: THREE.sRGBEncoding,
      normalMap: !!material.normalMap,
      tangentSpaceNormalMap: true,
      roughnessMap: !!material.roughnessMap,
      vertexUvs: !!material.map,
      vertexColors: !!material.vertexColors,
      instancing: !!obj.isInstancedMesh,
      instancingColor: !!obj.isInstancedMesh,
      doubleSided: material.side === THREE.DoubleSide,
      envMap: true,
      envMapMode: THREE.CubeUVReflectionMapping,
      envMapEncoding: THREE.LinearEncoding,
      outputEncoding: THREE.sRGBEncoding,
      toneMapping: THREE.ACESFilmicToneMapping,
      numDirLights: 1,
      numPointLights: 4,
      numSpotLights: 0,
      numRectAreaLights: 0,
      numHemiLights: 1,
      numDirLightShadows: 1,
      numSpotLightShadows: 0,
      numPointLightShadows: 0,
      numClippingPlanes: 0,
      numClipIntersection: 0,
      shadowMapEnabled: true,
      shadowMapType: THREE.PCFSoftShadowMap,
      rendererExtensionDerivatives: true,
      rendererExtensionShaderTextureLod: true,
      extensions: {},
    };
    new WebGLProgram(renderer, "offline", parameters, {});
    for (const s of sources)
      await fs.writeFile(
        `${dir}/${i}-${webgl2 ? "es3" : "es2"}.${s.type === 35633 ? "vert" : "frag"}`,
        s.source,
      );
  }
  i++;
}
console.log(`Exported ${i * 4} vertex/fragment shader variants to ${dir}`);
