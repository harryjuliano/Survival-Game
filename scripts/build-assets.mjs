import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, simplify, prune } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import fs from "node:fs/promises";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
await fs.mkdir("public/assets/models", { recursive: true });
for (const [id, ratio] of [
  ["island_tree_01", 0.025],
  ["fern_02", 0.7],
  ["coast_rocks_02", 0.035],
  ["lambis_shell", 0.5],
  ["sofa_03", 1],
]) {
  for (const [suffix, r] of [
    ["", ratio],
    ["-lod", ratio * 0.25],
  ]) {
    const doc = await io.read(`asset-sources/${id}/${id}.gltf`);
    await doc.transform(
      dedup(),
      weld(),
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: r,
        error: 1,
        lockBorder: false,
      }),
      prune(),
    );
    await io.write(`public/assets/models/${id}${suffix}.glb`, doc);
    const triangles = doc
      .getRoot()
      .listMeshes()
      .reduce(
        (n, m) =>
          n +
          m
            .listPrimitives()
            .reduce(
              (a, p) =>
                a +
                (p.getIndices()?.getCount() ||
                  p.getAttribute("POSITION").getCount()) /
                  3,
              0,
            ),
        0,
      );
    console.log(id + suffix, triangles, "triangles");
  }
}
