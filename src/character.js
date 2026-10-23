import * as THREE from "three";
import { SkeletonUtils } from "three/examples/jsm/utils/SkeletonUtils.js";
import { loadGLTF } from "./assets.js";
export async function loadCharacter(gender) {
  if (!["male", "female"].includes(gender))
    throw new Error("Karakter tidak dikenal.");
  const gltf = await loadGLTF(`characters/${gender}.glb`),
    root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  const avatar = SkeletonUtils.clone(gltf.scene);
  body.add(avatar);
  let skins = 0;
  avatar.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.isSkinnedMesh) {
        skins++;
        o.frustumCulled = false;
      }
      if (o.material) o.material.envMapIntensity = 0.42;
    }
  });
  if (!skins)
    throw new Error("Aset karakter harus memiliki skeleton dan skin.");
  const mixer = new THREE.AnimationMixer(avatar),
    actions = {};
  for (const clip of gltf.animations)
    actions[clip.name] = mixer.clipAction(clip);
  for (const n of ["Idle", "Walk", "Run", "Jump"])
    if (!actions[n]) throw new Error(`Animasi ${n} tidak tersedia.`);
  actions.Idle.play();
  root.userData = { body, avatar, mixer, actions, state: "Idle" };
  return root;
}
export function updateCharacter(root, dt, { moving, running, air, sleeping }) {
  const d = root.userData,
    next = sleeping
      ? "Idle"
      : air
        ? "Jump"
        : moving
          ? running
            ? "Run"
            : "Walk"
          : "Idle";
  if (next !== d.state) {
    d.actions[d.state].fadeOut(0.22);
    d.actions[next].reset().fadeIn(0.22).play();
    d.state = next;
  }
  d.mixer.update(dt * (sleeping ? 0.35 : 1));
}
export function disposeCharacter(root) {
  root.userData.mixer.stopAllAction();
  root.userData.mixer.uncacheRoot(root.userData.avatar);
  root.traverse((o) => {
    if (o.isSkinnedMesh) o.skeleton.dispose();
  });
}
