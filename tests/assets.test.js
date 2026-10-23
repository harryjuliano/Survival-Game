import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import validator from "gltf-validator";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const gender of ["male", "female"])
  test(`${gender}: valid weighted human GLB and four finite animation clips`, async () => {
    const path = `public/assets/characters/${gender}.glb`,
      bytes = await fs.readFile(path);
    const report = await validator.validateBytes(new Uint8Array(bytes), {
      maxIssues: 3000,
    });
    assert.equal(
      report.issues.numErrors,
      0,
      JSON.stringify(report.issues.messages),
    );
    assert.equal(
      report.issues.numWarnings,
      0,
      JSON.stringify(
        report.issues.messages.filter((m) => m.severity === 1).slice(0, 5),
      ),
    );
    const doc = await io.read(path),
      root = doc.getRoot();
    assert.equal(root.listSkins().length, 1);
    assert.ok(root.listSkins()[0].listJoints().length >= 30);
    assert.deepEqual(
      root.listAnimations().map((a) => a.getName()),
      ["Idle", "Walk", "Run", "Jump"],
    );
    assert.ok(root.listMeshes().length >= 5);
    for (const mesh of root.listMeshes())
      for (const p of mesh.listPrimitives()) {
        assert.ok(p.getAttribute("JOINTS_0"));
        const w = p.getAttribute("WEIGHTS_0").getArray();
        for (let i = 0; i < w.length; i += 4)
          assert.ok(
            Math.abs(w[i] + w[i + 1] + w[i + 2] + w[i + 3] - 1) < 0.001,
          );
      }
    for (const a of root.listAnimations())
      for (const s of a.listSamplers()) {
        assert.ok(s.getInput().getCount() > 2);
        assert.ok([...s.getOutput().getArray()].every(Number.isFinite));
      }
  });
test("External environment GLBs are self-contained and below triangle budgets", async () => {
  for (const name of [
    "island_tree_01",
    "fern_02",
    "coast_rocks_02",
    "lambis_shell",
    "sofa_03",
  ]) {
    const hi = await io.read(`public/assets/models/${name}.glb`),
      lo = await io.read(`public/assets/models/${name}-lod.glb`);
    const count = (d) =>
      d
        .getRoot()
        .listMeshes()
        .reduce(
          (n, m) =>
            n +
            m
              .listPrimitives()
              .reduce((n, p) => n + p.getIndices().getCount() / 3, 0),
          0,
        );
    assert.ok(count(hi) < 50000, `${name} exceeds 50k`);
    assert.ok(count(lo) < count(hi) * 0.55, `${name} LOD ineffective`);
    for (const t of hi.getRoot().listTextures())
      assert.ok(t.getImage()?.byteLength > 0);
  }
});
