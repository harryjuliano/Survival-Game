# Aset, sumber dan lisensi

Semua aset yang diperlukan untuk versi ini **sudah disertakan**. Tidak ada API key, pembelian atau unduhan aset tambahan untuk menjalankan game.

## Poly Haven — CC0

Lisensi resmi: https://polyhaven.com/license. Semua model dan tekstur di bawah menggunakan CC0; file diunduh untuk pemakaian lokal, tidak ada pemanggilan API Poly Haven dari game.

| Aset | Fungsi | Sumber | Kreator |
|---|---|---|---|
| coast_sand_02 | `textures/sand` | https://polyhaven.com/a/coast_sand_02 | Rob Tuytel |
| grass_ground | `textures/grass` | https://polyhaven.com/a/grass_ground | Charlotte Baglioni |
| brown_planks_03 | `textures/wood` | https://polyhaven.com/a/brown_planks_03 | Rob Tuytel |
| grey_plaster | `textures/plaster` | https://polyhaven.com/a/grey_plaster | Rob Tuytel |
| clay_roof_tiles | `textures/roof` | https://polyhaven.com/a/clay_roof_tiles | Amal Kumar |
| bark_brown_02 | `textures/bark` | https://polyhaven.com/a/bark_brown_02 | Rob Tuytel |
| kloofendal_48d_partly_cloudy_puresky | `environment/sky.hdr` | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | Greg Zaal, Jarod Guest |
| island_tree_01 | `models/island_tree_01.glb` | https://polyhaven.com/a/island_tree_01 | Rob Tuytel, Rico Cilliers |
| fern_02 | `models/fern_02.glb` | https://polyhaven.com/a/fern_02 | Rob Tuytel, Rico Cilliers |
| coast_rocks_02 | `models/coast_rocks_02.glb` | https://polyhaven.com/a/coast_rocks_02 | Rob Tuytel, Rico Cilliers |
| lambis_shell | `models/lambis_shell.glb` | https://polyhaven.com/a/lambis_shell | Kuutti Siitonen |
| sofa_03 | `models/sofa_03.glb` | https://polyhaven.com/a/sofa_03 | Fran Calvente |

Model mempunyai versi detail dan `-lod.glb`. Pohon sekitar 38.202/10.320 triangle, batu 44.107/11.027, pakis 4.360/1.088, sofa 8.004/1.999, kerang 6.248/1.562. Geometri disederhanakan dari aset scan, bukan pengganti primitive. Tekstur direkompres pada maksimum 1K.

## MakeHuman — CC0

- Core mesh, target morph dan rig: https://github.com/makehumancommunity/makehuman
- Penjelasan lisensi: https://static.makehumancommunity.org/about/license.html
- Paket sistem dan daftar CC0: https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html
- ZIP sumber: https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip

Aset yang digunakan: `base.obj`, `default.mhskel`, `default_weights.mhw`, morph `asian-male-young.target` dan `asian-female-young.target`, skin `young_asian_male/female`, `male_casualsuit01`, `female_casualsuit01`, `shoes01`, rambut `short01`/`bob01`, mata `high-poly` dan `brown_eye.png`. Nama etnis di atas adalah pengenal aset sumber.

Kredit paket sistem: Data Collection AB, Joel Palmius, Jonas Hauquier dan kontributor MakeHuman. Asetnya CC0; kode aplikasi MakeHuman memiliki lisensi berbeda dan **tidak disertakan/digunakan sebagai kode game**. Eksportir dan klip animasi ditulis untuk proyek ini. Teks lisensi tersedia di `public/assets/licenses/MAKEHUMAN-CC0.md`.

Hasil: laki-laki sekitar 41.028 triangle dan perempuan 34.918 triangle, masing-masing 36 joint dan maksimum empat pengaruh skin per vertex. Tulang wajah/jari yang tidak dianimasikan digabung ke parent untuk menghemat biaya. Kedua GLB berisi tubuh, pakaian, sepatu, rambut dan mata; tidak memuat mesh helper MakeHuman. Klip menggunakan keyframe buatan dan crossfade; belum mocap, facial animation atau foot IK.

## Aset buatan proyek

Rumah, perabot parametrik, palem, rumput, bunga, fauna kecil, shader air, keyframe karakter dan ambience sintetis dibuat dalam source. Audio bukan rekaman dari pihak ketiga. Fauna dan palem ini belum setara aset sinematik scan.

Aset tambahan yang **opsional** untuk kualitas lebih tinggi: motion capture dengan retargeting/foot IK, model hewan rigged, palem hasil scan dan rekaman ambience lapangan. Semuanya perlu evaluasi lisensi serta budget GPU sebelum diganti. Tidak ada aset wajib yang masih hilang dari paket ini.

## Regenerasi opsional

Tidak diperlukan untuk menjalankan/build game; hasil GLB sudah disertakan. Dari root proyek:

```bash
python3 scripts/download-assets.py
node scripts/build-assets.mjs
node scripts/optimize-textures.mjs
python3 scripts/download-human-sources.py
python3 -m pip install numpy scipy Pillow
python3 scripts/build-characters.py --source asset-sources/makehuman
npm test
npm run build
```

Unduhan sumber besar (paket MakeHuman sekitar 281 MB, ditambah sumber model Poly Haven). Pipeline memeriksa checksum sumber; bila penyedia memperbarui file, periksa perubahan dan lisensi sebelum memperbarui checksum. `asset-sources/` tidak disertakan dalam paket distribusi. `asset-checksums.json` mencatat SHA-256 aset runtime yang dikirim.

## Software

Three.js dan contoh resminya: MIT, teks di `public/assets/licenses/THREE-MIT.txt`. Vite, glTF Transform, meshoptimizer dan Prettier: MIT; Sharp dan Khronos glTF Validator: Apache-2.0. Dependency dan versinya tercatat di `package-lock.json`. Library build/validasi tidak ikut dimuat oleh browser.
