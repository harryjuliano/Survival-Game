// Recompress downloaded images. Color/normal data retain their original color space.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const folder of await fs.readdir("public/assets/textures"))
  for (const file of await fs.readdir(`public/assets/textures/${folder}`)) {
    const p = `public/assets/textures/${folder}/${file}`,
      bytes = await fs.readFile(p);
    const output = await sharp(bytes)
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: file === "normal.jpg" ? 90 : 83,
        chromaSubsampling: "4:4:4",
      })
      .toBuffer();
    if (output.byteLength < bytes.byteLength) await fs.writeFile(p, output);
  }
for (const file of await fs.readdir("public/assets/models")) {
  const p = path.join("public/assets/models", file),
    doc = await io.read(p);
  for (const texture of doc.getRoot().listTextures()) {
    const bytes = texture.getImage();
    if (!bytes) continue;
    const meta = await sharp(bytes).metadata();
    if (meta.hasAlpha) continue;
    const output = await sharp(bytes)
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
      .toBuffer();
    if (output.byteLength < bytes.byteLength) {
      texture.setImage(output);
      texture.setMimeType("image/jpeg");
    }
  }
  await io.write(p, doc);
}
console.log("Optimized local texture files and embedded GLB images.");
