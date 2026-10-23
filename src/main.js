import { fitFurnitureToRoom, findFreePosition } from "./placement.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mat, box, group } from "./geometry.js";
import { loadMaterials, loadHDR, upgradeFurniture } from "./assets.js";
import { createHouse } from "./house.js";
import { createFurnitureSystem } from "./furniture.js";
import { createEnvironment } from "./environment.js";
import {
  loadCharacter,
  updateCharacter,
  disposeCharacter,
} from "./character.js";
import {
  CollisionWorld,
  currentRoom,
  intersectsCircleBox,
} from "./collision.js";
import { createQuality } from "./quality.js";
import { createAudio } from "./audio.js";
import "./style.css";

const $ = (id) => document.getElementById(id);
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4000);
}
async function boot() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (e) {
    throw new Error(
      "WebGL tidak tersedia. Aktifkan akselerasi grafis browser.",
    );
  }
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(innerWidth, innerHeight);
  document.body.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#b8c4c2");
  scene.fog = new THREE.Fog("#b8c4c2", 85, 230);
  const camera = new THREE.PerspectiveCamera(
    45,
    innerWidth / innerHeight,
    0.1,
    400,
  );
  camera.position.set(14, 15, 19);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 3.5;
  controls.maxDistance = 24;
  controls.maxPolarAngle = Math.PI / 2 - 0.08;
  controls.enablePan = false;
  controls.target.set(0, 1, 0);
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  const collision = new CollisionWorld();
  const centers = [0, -12.2, -24.4],
    roomNames = ["Kamar Tidur", "Ruang Tamu", "Ruang Makan"];
  $("bootText").textContent = "Memuat material PBR dan langit…";
  const materials = await loadMaterials(renderer);
  await loadHDR(renderer, scene);
  const { wood, darkWood, cream, green, brass } = materials;
  const ambient = new THREE.AmbientLight("#e5d5ba", 0.16),
    hemi = new THREE.HemisphereLight("#c5d4da", "#65513a", 0.3),
    sun = new THREE.DirectionalLight("#ffe3b8", 1.45);
  scene.add(ambient, hemi, sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -12,
    right: 12,
    top: 12,
    bottom: -12,
    near: 0.1,
    far: 60,
  });
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 3;
  const house = createHouse({ scene, materials, collision, centers });
  const { doors, roomFill } = house;
  const furniture = createFurnitureSystem({ scene, materials, collision });
  const {
    objects,
    plantMats,
    createFurniture,
    sofa,
    lamp,
    plant,
    tv,
    bed,
    lampLight,
  } = furniture;
  await upgradeFurniture(objects, materials);
  objects.forEach((o) => collision.registerFurniture(o));
  $("bootText").textContent = "Menyiapkan pulau, vegetasi dan pantai…";
  const environment = await createEnvironment({ scene, materials, collision });
  const quality = createQuality({ renderer, sun, environment, camera });
  $("quality").value = quality.level;
  $("quality").onchange = (e) => {
    quality.set(e.target.value);
    e.target.blur();
  };
  let materialCache = [];
  function refreshMaterialCache() {
    const cache = new Set();
    scene.traverse((o) => {
      if (o.isMesh) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          if (m && m.envMapIntensity !== undefined) cache.add(m);
      }
    });
    materialCache = [...cache];
  }
  const audio = createAudio($("soundButton"));
  const keys = new Set(),
    photos = [];
  let player = null,
    active = false,
    selected = null,
    sleeping = false,
    sleepEnd = 0,
    savedLamp = true,
    lampOn = true,
    tvOn = true,
    velocityY = 0,
    walkT = 0,
    highView = false,
    roomIndex = 0,
    mobileRunning = false;
  $("runMobile").onpointerdown = (e) => {
    e.preventDefault();
    mobileRunning = !mobileRunning;
    $("runMobile").textContent = mobileRunning ? "Berjalan" : "Lari";
  };
  $("wallButton").onclick = () => {
    house.autoWalls = !house.autoWalls;
    $("wallButton").textContent = house.autoWalls
      ? "⌂ Dinding: otomatis"
      : "⌂ Dinding: utuh";
  };
  // 7. Input, tabrakan per sumbu, dan gerak relatif terhadap kamera.
  const canStand = (x, z) => collision.canStand(x, z, doors);
  function typing() {
    return ["INPUT", "TEXTAREA", "SELECT"].includes(
      document.activeElement.tagName,
    );
  }
  function jump() {
    if (
      active &&
      !sleeping &&
      player.position.y <=
        environment.heightAt(player.position.x, player.position.z) + 0.015
    ) {
      velocityY = 6.2;
    }
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
      $("lightbox").hidden = true;
      return;
    }
    if (typing() || !active || !$("lightbox").hidden) return;
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    )
      e.preventDefault();
    keys.add(e.code);
    if (!e.repeat && e.code === "KeyE") interact();
    if (!e.repeat && e.code === "Space") jump();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => {
    keys.clear();
    drag = null;
    press = null;
    controls.enabled = true;
  });
  document.addEventListener("visibilitychange", () => {
    keys.clear();
  });
  document.querySelectorAll("[data-key]").forEach((b) => {
    b.onpointerdown = (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      keys.add(b.dataset.key);
    };
    b.onpointerup = b.onpointercancel = () => keys.delete(b.dataset.key);
  });
  $("jump").onpointerdown = (e) => {
    e.preventDefault();
    jump();
  };
  function nearest() {
    if (!player) return null;
    if (sleeping) return { kind: "wake", label: "Bangun" };
    let best = null,
      min = 2.4;
    doors.forEach((d) => {
      const dist = Math.hypot(player.position.x - d.x, player.position.z - d.z);
      if (dist < min) {
        min = dist;
        best = {
          kind: "door",
          door: d,
          label: d.open ? "Tutup pintu" : "Buka pintu",
        };
      }
    });
    for (const w of house.windows) {
      const d = Math.hypot(player.position.x - w.x, player.position.z - w.z);
      if (d < 1.9 && d < min) {
        min = d;
        best = {
          kind: "window",
          window: w,
          label: w.open ? "Tutup jendela" : "Buka jendela",
        };
      }
    }
    if (
      Math.hypot(
        player.position.x - bed.position.x,
        player.position.z - bed.position.z,
      ) < 2.5 &&
      !best
    )
      best = { kind: "sleep", label: "Tidur" };
    return best;
  }
  function wake() {
    if (!sleeping) return;
    sleeping = false;
    lampOn = savedLamp;
    $("sleep").hidden = true;
    $("timer").hidden = true;
    player.rotation.z = 0;
    const free = findFreePosition(
      collision,
      bed.position.x - 2,
      bed.position.z,
      doors,
    );
    player.position.set(free.x, environment.heightAt(free.x, free.z), free.z);
    player.userData.body.rotation.set(0, 0, 0);
    velocityY = 0;
  }
  function interact() {
    if (!active) return;
    const n = nearest();
    if (!n) return;
    if (n.kind === "wake") wake();
    if (n.kind === "window") {
      n.window.open = !n.window.open;
    }
    if (n.kind === "door") {
      const d = n.door;
      if (d.open && Math.abs(player.position.x - d.x) < 0.65) {
        toast("Mundur sedikit sebelum menutup pintu.");
        return;
      }
      d.open = !d.open;
    }
    if (n.kind === "sleep") {
      savedLamp = lampOn;
      lampOn = false;
      sleeping = true;
      sleepEnd = performance.now() + 60000;
      velocityY = 0;
      keys.clear();
      player.position
        .copy(bed.position)
        .add(
          new THREE.Vector3(0, 1.1 * bed.scale.y + 0.05, 1.55 * bed.scale.z),
        );
      player.rotation.y = bed.rotation.y;
      player.userData.body.rotation.x = -Math.PI / 2;
      $("sleep").hidden = false;
      $("timer").hidden = false;
    }
  }
  $("action").onclick = interact;
  // 8. Raycast, pemilihan dan drag dengan offset serta batas ruangan asal.
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2(),
    floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let drag = null,
    press = null;
  const hitPoint = new THREE.Vector3();
  function cast(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
  }
  function ownerHit(e) {
    cast(e);
    const hits = ray.intersectObjects([...objects, ...photos], true);
    return hits.find((h) => h.object.userData.owner);
  }
  const selectionBox = new THREE.BoxHelper(sofa, 0xe8ce8b);
  selectionBox.visible = false;
  scene.add(selectionBox);
  function select(g) {
    selected = g;
    selectionBox.visible = !!g;
    if (g) {
      selectionBox.setFromObject(g);
      $("selected").textContent =
        "Dipilih: " + (g.userData.apiName || g.userData.name);
    }
  }
  function clampFurniture(g, x, z) {
    const previous = g.position.clone(),
      previousScale = g.scale.clone();
    fitFurnitureToRoom(g, x, z);
    collision.registerFurniture(g);
    const b = collision.furniture.get(g);
    if (
      player &&
      !sleeping &&
      b &&
      intersectsCircleBox(
        player.position.x,
        player.position.z,
        collision.radius,
        b,
      )
    ) {
      g.position.copy(previous);
      g.scale.copy(previousScale);
      collision.registerFurniture(g);
      return false;
    }
    return true;
  }

  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (!active || sleeping || !$("lightbox").hidden) return;
    if (e.button !== 0) return;
    press = { x: e.clientX, y: e.clientY, id: e.pointerId };
    const h = ownerHit(e);
    if (h) {
      const g = h.object.userData.owner;
      select(g);
      if (!g.userData.photo) {
        cast(e);
        if (ray.ray.intersectPlane(floorPlane, hitPoint)) {
          drag = {
            g,
            offset: hitPoint.clone().sub(g.position),
            id: e.pointerId,
          };
          controls.enabled = false;
          renderer.domElement.setPointerCapture(e.pointerId);
        }
      } else press.photo = g;
    }
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (drag && drag.id === e.pointerId) {
      cast(e);
      if (ray.ray.intersectPlane(floorPlane, hitPoint)) {
        clampFurniture(
          drag.g,
          hitPoint.x - drag.offset.x,
          hitPoint.z - drag.offset.z,
        );
        selectionBox.setFromObject(drag.g);
      }
    }
  });
  function release(e) {
    if (
      press &&
      press.id === e.pointerId &&
      press.photo &&
      Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5
    ) {
      $("fullPhoto").src = press.photo.userData.url;
      $("lightbox").hidden = false;
      keys.clear();
    }
    drag = null;
    press = null;
    controls.enabled = true;
  }
  renderer.domElement.addEventListener("pointerup", release);
  renderer.domElement.addEventListener("pointercancel", () => {
    drag = null;
    press = null;
    controls.enabled = true;
  });
  renderer.domElement.addEventListener("contextmenu", (e) =>
    e.preventDefault(),
  );
  // 9. Unggah asinkron: reservasi slot, rasio asli, bingkai di dua dinding.
  let photoReserved = 0;
  const occupiedPhotoSlots = new Set();
  function updateCount() {
    $("photoCount").textContent = photoReserved + "/10";
  }
  $("uploadButton").onclick = () => $("upload").click();
  $("upload").onchange = (e) => {
    for (const file of e.target.files) {
      if (!file.type.startsWith("image/")) {
        toast("Pilih file gambar yang valid.");
        continue;
      }
      if (photoReserved >= 10) {
        toast("Maksimal 10 foto. Foto tambahan ditolak.");
        break;
      }
      let slot = 0;
      while (occupiedPhotoSlots.has(slot)) slot++;
      occupiedPhotoSlots.add(slot);
      photoReserved++;
      updateCount();
      const url = URL.createObjectURL(file);
      new THREE.TextureLoader().load(
        url,
        (t) => {
          t.encoding = THREE.sRGBEncoding;
          const ratio = t.image.width / t.image.height;
          const largest = Math.max(t.image.width, t.image.height);
          if (largest > 1536) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.round((t.image.width * 1536) / largest);
            canvas.height = Math.round((t.image.height * 1536) / largest);
            canvas
              .getContext("2d")
              .drawImage(t.image, 0, 0, canvas.width, canvas.height);
            t.image = canvas;
            t.needsUpdate = true;
          }
          let w = 1.25,
            h = w / ratio;
          if (h > 1.3) {
            h = 1.3;
            w = h * ratio;
          }
          const g = group(scene);
          g.userData = {
            photo: true,
            url,
            apiName: "foto" + (slot + 1),
            name: "foto" + (slot + 1),
            initialScale: 1,
          };
          box(g, w + 0.14, h + 0.14, 0.1, 0, 0, 0, wood);
          box(
            g,
            w,
            h,
            0.015,
            0,
            0,
            0.065,
            mat("#ffffff", { map: t, roughness: 0.6 }),
          );
          if (slot < 6) {
            g.position.set(
              -4.8 + (slot % 3) * 1.55,
              slot < 3 ? 3.9 : 2.25,
              -5.91,
            );
          } else {
            const n = slot - 6;
            g.position.set(-5.9, n < 2 ? 3.9 : 2.25, 0.3 + (n % 2) * 1.7);
            g.rotation.y = Math.PI / 2;
          }
          g.traverse((m) => {
            if (m.isMesh) m.userData.owner = g;
          });
          photos.push(g);
          refreshMaterialCache();
        },
        undefined,
        () => {
          photoReserved--;
          occupiedPhotoSlots.delete(slot);
          updateCount();
          URL.revokeObjectURL(url);
          toast("Gambar gagal dibaca. Coba gambar lain.");
        },
      );
    }
    e.target.value = "";
  };
  $("lightbox").onclick = () => ($("lightbox").hidden = true);
  // 10. API tervalidasi dengan pencatatan otomatis dalam Bahasa Indonesia.
  function hex(v) {
    if (typeof v !== "string" || !/^#?[0-9a-fA-F]{6}$/.test(v))
      throw new TypeError(
        "Warna harus berupa 6 digit heksadesimal, contoh #ff9ad5.",
      );
    return "#" + v.replace("#", "");
  }
  function bool(v) {
    if (typeof v !== "boolean")
      throw new TypeError("Nilai harus true atau false.");
    return v;
  }
  function number(v) {
    if (typeof v !== "number" || !Number.isFinite(v))
      throw new TypeError("Nilai harus berupa angka yang valid.");
    return v;
  }
  function log(message, kind = "info") {
    const d = document.createElement("div");
    d.className = kind;
    d.textContent = message;
    $("logs").append(d);
    while ($("logs").children.length > 100) $("logs").firstChild.remove();
    $("logs").scrollTop = $("logs").scrollHeight;
  }
  const API = {
    setLampColor(v) {
      const c = hex(v);
      lampLight.color.set(c);
      lamp.userData.shade.emissive.set(c);
    },
    setLampIntensity(v) {
      number(v);
      if (v < 0 || v > 5)
        throw new RangeError("Intensitas lampu harus antara 0 dan 5.");
      lampLight.userData.intensity = v;
    },
    toggleLamp(v) {
      bool(v);
      if (sleeping) throw new Error("Lampu tidak bisa diubah saat tidur.");
      lampOn = v;
    },
    toggleTV(v) {
      tvOn = bool(v);
      tv.userData.screen.emissiveIntensity = tvOn ? 0.65 : 0;
      tv.userData.screen.color.set(tvOn ? "#526a68" : "#171f20");
    },
    setTVScreenColor(v) {
      const c = hex(v);
      tv.userData.screen.color.set(c);
      tv.userData.screen.emissive.set(c);
    },
    scaleObject(name, f) {
      if (typeof name !== "string")
        throw new TypeError("Nama objek harus berupa teks.");
      number(f);
      const g = [...objects, ...photos].find(
        (o) => o.userData.apiName === name || o.userData.name === name,
      );
      if (!g) throw new Error('Objek "' + name + '" tidak ditemukan.');
      const previousScale = g.scale.clone();
      const base =
        g.userData.initialScaleVector ||
        new THREE.Vector3(1, 1, 1).multiplyScalar(g.userData.initialScale);
      g.scale.copy(base).multiplyScalar(THREE.MathUtils.clamp(f, 0.3, 3));
      if (!g.userData.photo && !clampFurniture(g, g.position.x, g.position.z)) {
        g.scale.copy(previousScale);
        collision.registerFurniture(g);
        throw new Error(
          "Ukuran ini menutupi posisi pemain. Mundur terlebih dahulu.",
        );
      }
      if (selected === g) selectionBox.setFromObject(g);
    },
    setPlantColor(v) {
      const c = hex(v);
      plantMats.forEach((m) => m.color.set(c));
    },
    addDecor(name) {
      if (!active) throw new Error("Mulai permainan terlebih dahulu.");
      if (currentRoom(player.position.x, player.position.z) < 0)
        throw new Error("Masuk ke ruangan untuk menambahkan dekor.");
      if (
        ![
          "karpet",
          "rak buku",
          "meja kopi",
          "kursi",
          "pot kecil",
          "sofa",
          "meja makan",
        ].includes(name)
      )
        throw new Error("Nama dekor tidak tersedia dalam katalog.");
      const r = currentRoom(player.position.x, player.position.z),
        g = createFurniture(
          name,
          player.position.x,
          player.position.z + 1.5,
          r,
          true,
        );
      let placed = false;
      for (const [dx, dz] of [
        [0, 1.8],
        [0, -1.8],
        [2.5, 0],
        [-2.5, 0],
        [0, 3.5],
        [0, -3.5],
      ]) {
        if (clampFurniture(g, player.position.x + dx, player.position.z + dz)) {
          placed = true;
          break;
        }
      }
      if (!placed) {
        collision.remove(g);
        scene.remove(g);
        objects.splice(objects.indexOf(g), 1);
        throw new Error(
          "Tidak ada ruang dekat pemain. Pindah sebelum menambah dekor.",
        );
      }
      select(g);
      refreshMaterialCache();
      return g.userData.apiName;
    },
  };
  lampLight.userData.intensity = 1.5;
  // 11. Editor: pewarnaan sintaks, gulir tersinkron, dan indentasi.
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function highlight() {
    const code = $("code").value,
      re =
        /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(setLampColor|setLampIntensity|toggleLamp|toggleTV|setTVScreenColor|scaleObject|setPlantColor|addDecor)\b|\b(const|let|var|if|else|true|false|for|return|function|new)\b|\b(\d+(?:\.\d+)?)\b/g;
    let out = "",
      last = 0;
    for (const m of code.matchAll(re)) {
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "f" : m[4] ? "k" : "n";
      out += '<span class="tok-' + cls + '">' + esc(m[0]) + "</span>";
      last = m.index + m[0].length;
    }
    $("highlight").innerHTML = out + esc(code.slice(last)) + "\n";
    syncScroll();
  }
  function syncScroll() {
    $("highlight").scrollTop = $("code").scrollTop;
    $("highlight").scrollLeft = $("code").scrollLeft;
  }
  $("code").oninput = highlight;
  $("code").onscroll = syncScroll;
  $("code").onkeydown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const t = e.target,
        a = t.selectionStart,
        b = t.selectionEnd;
      t.setRangeText("  ", a, b, "end");
      highlight();
    }
  };
  highlight();
  $("run").onclick = () => {
    const wrapped = Object.keys(API).map((k) => (...args) => {
      const result = API[k](...args);
      log(
        "✓ " + k + "(" + args.map((v) => JSON.stringify(v)).join(", ") + ")",
        "ok",
      );
      return result;
    });
    try {
      new Function(...Object.keys(API), '"use strict";\n' + $("code").value)(
        ...wrapped,
      );
      log("Kode selesai dijalankan.", "ok");
    } catch (e) {
      log(e.name + ": " + e.message, "error");
    }
  };
  $("clearLog").onclick = () => $("logs").replaceChildren();
  $("codeButton").onclick = () => {
    $("editor").hidden = !$("editor").hidden;
    keys.clear();
  };
  $("closeEditor").onclick = () => ($("editor").hidden = true);
  // 12. Onboarding, HUD, toolbar, dan reset pemain.
  $("startForm").onsubmit = async (e) => {
    e.preventDefault();
    $("start").disabled = true;
    $("start").textContent = "Memuat karakter…";
    try {
      const next = await loadCharacter(
        document.querySelector("[name=gender]:checked").value,
      );
      if (player) {
        disposeCharacter(player);
        scene.remove(player);
      }
      player = next;
      scene.add(player);
      refreshMaterialCache();
      const free = findFreePosition(collision, 0, 2.7, doors);
      player.position.set(free.x, environment.heightAt(free.x, free.z), free.z);
      active = true;
      sleeping = false;
      mobileRunning = false;
      $("runMobile").textContent = "Lari";
      velocityY = 0;
      keys.clear();
      $("greeting").textContent =
        "Halo, " + $("playerName").value.trim().slice(0, 14) + "!";
      $("onboarding").hidden = true;
      $("gameUI").hidden = false;
      controls.target.set(0, 1, 2.7);
      camera.position.set(10, 11, 17);
      controls.update();
      toast(
        "Selamat datang! WASD untuk berjalan, Shift untuk lari, E untuk berinteraksi.",
      );
    } catch (err) {
      toast("Karakter gagal dimuat. " + err.message);
    } finally {
      $("start").disabled = false;
      $("start").textContent = "Mulai menjelajah →";
    }
  };
  $("logout").onclick = () => {
    wake();
    active = false;
    keys.clear();
    if (player) {
      disposeCharacter(player);
      scene.remove(player);
      player = null;
    }
    doors.forEach((d) => {
      d.open = false;
      d.pivot.rotation.y = 0;
    });
    $("gameUI").hidden = true;
    $("editor").hidden = true;
    $("onboarding").hidden = false;
    select(null);
    controls.target.set(0, 1, 0);
    camera.position.set(14, 15, 19);
    controls.enabled = true;
    drag = null;
  };
  $("lampButton").onclick = () => {
    if (sleeping) {
      toast("Bangun terlebih dahulu untuk mengubah lampu.");
      return;
    }
    lampOn = !lampOn;
  };
  $("orbitButton").onclick = () => {
    highView = !highView;
    const t = controls.target;
    camera.position
      .copy(t)
      .add(
        highView ? new THREE.Vector3(7, 20, 9) : new THREE.Vector3(12, 12, 16),
      );
    controls.update();
  };
  $("catalog").onchange = (e) => e.target.blur();
  $("add").onclick = () => {
    try {
      API.addDecor($("catalog").value);
    } catch (e) {
      toast(e.message);
    }
  };
  $("remove").onclick = () => {
    if (!selected || !selected.userData.extra) {
      toast("Pilih dekor tambahan yang ingin dihapus.");
      return;
    }
    const g = selected;
    collision.remove(g);
    scene.remove(g);
    objects.splice(objects.indexOf(g), 1);
    g.traverse((o) => {
      if (o.isMesh && !o.userData.sharedAsset) o.geometry.dispose();
    });
    refreshMaterialCache();
    select(null);
    $("selected").textContent = "Dekor dihapus";
  };
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock(),
    forward = new THREE.Vector3(),
    right = new THREE.Vector3(),
    motion = new THREE.Vector3(),
    follow = new THREE.Vector3(),
    prevTarget = new THREE.Vector3(),
    cameraDelta = new THREE.Vector3();
  let lightLevel = 1;
  function animate() {
    requestAnimationFrame(animate);
    const rawDt = clock.getDelta(),
      dt = Math.min(rawDt, 0.05),
      t = clock.elapsedTime;
    if (document.hidden) return;
    if (active && player) {
      roomIndex = currentRoom(player.position.x, player.position.z);
      let moving = false,
        running = false,
        air = false;
      if (!sleeping) {
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.crossVectors(forward, THREE.Object3D.DefaultUp).normalize();
        motion.set(0, 0, 0);
        if (!typing() && $("lightbox").hidden) {
          if (keys.has("KeyW") || keys.has("ArrowUp")) motion.add(forward);
          if (keys.has("KeyS") || keys.has("ArrowDown")) motion.sub(forward);
          if (keys.has("KeyD") || keys.has("ArrowRight")) motion.add(right);
          if (keys.has("KeyA") || keys.has("ArrowLeft")) motion.sub(right);
        }
        moving = motion.lengthSq() > 0.01;
        running =
          moving &&
          (keys.has("ShiftLeft") || keys.has("ShiftRight") || mobileRunning);
        if (moving) {
          motion.normalize();
          const step = (running ? 5.2 : 3.2) * dt;
          if (canStand(player.position.x + motion.x * step, player.position.z))
            player.position.x += motion.x * step;
          if (canStand(player.position.x, player.position.z + motion.z * step))
            player.position.z += motion.z * step;
          const a = Math.atan2(motion.x, motion.z),
            d = Math.atan2(
              Math.sin(a - player.rotation.y),
              Math.cos(a - player.rotation.y),
            );
          player.rotation.y += d * Math.min(1, dt * 12);
        }
        const ground = environment.heightAt(
          player.position.x,
          player.position.z,
        );
        velocityY -= 18 * dt;
        player.position.y += velocityY * dt;
        if (player.position.y <= ground) {
          player.position.y = ground;
          velocityY = 0;
        }
        air = player.position.y > ground + 0.04;
      } else {
        const remaining = Math.max(
          0,
          Math.ceil((sleepEnd - performance.now()) / 1000),
        );
        $("timer").textContent =
          "☾ " +
          Math.floor(remaining / 60) +
          ":" +
          String(remaining % 60).padStart(2, "0");
        if (!remaining) wake();
      }
      updateCharacter(player, dt, { moving, running, air, sleeping });
      prevTarget.copy(controls.target);
      follow.copy(player.position);
      follow.y += 1.1;
      controls.target.lerp(follow, 1 - Math.exp(-5 * dt));
      cameraDelta.copy(controls.target).sub(prevTarget);
      camera.position.add(cameraDelta);
      sun.position.copy(player.position).add(new THREE.Vector3(7, 18, 10));
      sun.target.position.copy(player.position);
      const n = nearest();
      $("action").hidden = !n;
      if (n) $("action").textContent = "[ E ] " + n.label;
      $("roomLabel").textContent =
        roomIndex < 0 ? "Pulau (luar rumah)" : roomNames[roomIndex];
    } else {
      sun.position.set(7, 18, 10);
    }
    house.update(dt, player, camera);
    const targetLight = player && roomIndex === 0 && !lampOn ? 0.15 : 1;
    lightLevel = THREE.MathUtils.lerp(
      lightLevel,
      targetLight,
      1 - Math.exp(-3 * dt),
    );
    roomFill.forEach(
      (l, i) => (l.intensity = 0.7 * (i === 0 ? lightLevel : 1)),
    );
    ambient.intensity = 0.16 * lightLevel;
    hemi.intensity = 0.3 * lightLevel;
    sun.intensity = 1.45 * lightLevel;
    materialCache.forEach((m) => (m.envMapIntensity = 0.42 * lightLevel));
    lampLight.intensity = lampOn ? lampLight.userData.intensity : 0;
    lamp.userData.shade.emissiveIntensity = lampOn ? 0.6 : 0;
    environment.update(dt, t, camera, player);
    audio.update(t, active, roomIndex, player);
    if (selected) selectionBox.setFromObject(selected);
    $("lampButton").textContent = lampOn ? "💡 Lampu" : "☾ Lampu";
    controls.update();
    renderer.render(scene, camera);
    quality.update(rawDt);
  }
  refreshMaterialCache();
  $("boot").hidden = true;
  animate();
}
boot().catch((error) => {
  $("boot").hidden = false;
  $("bootText").textContent =
    error.message + " Muat ulang halaman untuk mencoba lagi.";
  console.error(error);
});
