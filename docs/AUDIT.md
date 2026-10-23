# Audit dan hasil implementasi

Audit dilakukan atas `output/index.html` yang tersedia; salinan awal ada di `legacy-reference.html`. Gambar/video referensi tidak dijadikan jaminan kesamaan visual per frame.

## Tahap 1 — Audit

| Area awal | Temuan | Keputusan |
|---|---|---|
| Framework | Satu HTML, CSS/JS inline, Three.js r128 dan OrbitControls dari CDN; belum React/TS | Pertahankan Three.js dan API gameplay. Pisahkan ES modules; tambahkan Vite. |
| Rendering | MeshStandardMaterial dengan banyak warna rata/tekstur buatan; bentuk dominan primitive | Tambah tekstur PBR hasil scan, HDR/PMREM, model eksternal dan shader lingkungan. |
| Karakter | Tubuh dari primitive, tanpa humanoid rig | Ganti dengan mesh, rig, skin dan pakaian MakeHuman asli, diekspor GLB. |
| Rumah | Dinding otomatis berpotensi tampak sebagai lubang; shell perlu konsisten | Bangun seluruh shell fisik, plafon dan atap; transparansi hanya urusan kamera. |
| Laut/vegetasi | Bentuk kaku, pengulangan dan variasi visual terbatas | Gelombang GPU, buih, tanah bertransisi, rumput instanced dan model vegetasi. |
| Gameplay | Dekorasi, foto, editor kode, tidur, audio, kamera, pintu | Pertahankan nama API dan jalur UI; tambah tes collision dan penempatan. |

React, React Three Fiber, Drei, Zustand, dan Rapier tidak ditambahkan: tidak diperlukan untuk memperbaiki masalah visual proyek ini. Migrasi besar akan memperluas risiko regresi. JavaScript ES modules dipertahankan agar gameplay lama dapat dipindahkan dengan perubahan terbatas. Three.js tetap dipin ke r128; peningkatan versi berikutnya perlu menyesuaikan API encoding/lighting dan shader chunks.

## Hasil per tahap

| Tahap | Implementasi nyata | Verifikasi / batas |
|---|---|---|
| 2. Environment | PBR pasir/rumput, terrain organik, pantai bertahap, pohon scan dan pakis GLB, batu/kerang scan, palem berpola daun menyirip, rumput melengkung instanced, HDR, ACES | Budget model dan shader diperiksa; penilaian visual akhir pada browser GPU belum selesai. |
| 3. Rumah | Shell tertutup, plafon/gable/atap PBR, bingkai/jendela berengsel, panel pintu, lantai kayu, lampu warm, sofa GLB, furniture bertepi halus dan proporsi disesuaikan | Raycast menguji enclosure dan bukaan pintu; collision terpisah dari transparansi kamera. |
| 4. Karakter | Dua humanoid CC0 berpakaian dan berambut; 36 joint setelah reduksi tulang wajah/jari; skin weights, empat klip animasi, crossfade 0,22 detik | Khronos GLB validator: nol error/warning untuk keduanya. Bentuk karakter juga diperiksa melalui rasterisasi CPU aset. Belum motion capture/foot IK. |
| 5. Animasi | Angin pada rumput/kanopi/palem; laut bergelombang dan foam bergerak; burung, kupu-kupu, kepiting; ambience ombak/angin dan kicau sintetis | Shader dikompilasi/link offline. Audio dan persepsi gerak di browser belum diuji langsung. |
| 6. Optimasi | LOD, cache model/material, tekstur 1K, material bersama antartingkat LOD, grass patches dengan bounds untuk culling, instancing pakis/bunga, karakter dimuat saat dipilih, adaptive DPR, kualitas Low/Medium/High | 15 tes otomatis dan build lulus. Benchmark FPS, memory GPU, serta regresi end-to-end desktop/mobile masih terbuka. |

## Pipeline visual

PBR MeshStandardMaterial, normal/roughness maps, environment HDR yang diprefilter PMREM, output sRGB, ACES exposure 0,85, directional sunlight hangat, hemisphere fill, PCF soft shadows. Laut memakai gelombang dan normal analitik di GPU, pantulan environment HDR, warna relatif jarak dari garis pantai, serta pola buih. Ini bukan simulasi fluida atau refleksi planar objek di laut. Ambient occlusion layar penuh belum dipasang karena biaya GPU belum dapat diprofilkan.

Ukuran ruang dan hubungan tiga ruangan dipertahankan dari versi awal. Tempat tidur, kursi, meja, lampu dan TV disesuaikan agar lebih masuk akal terhadap karakter sekitar 1,68–1,8 meter. Beberapa perabot tetap dibuat secara parametrik dengan material PBR; sofa dan tanaman menggunakan GLB. Fauna kecil memakai mesh buatan dan animasi sederhana, bukan aset sinematik.

## Gameplay yang dipertahankan

WASD/panah, Space, E, tidur 60 detik/bangun, dekorasi drag/tambah/hapus, katalog, orbit/zoom, dinding otomatis/utuh, lampu, TV, audio opt-in, foto maksimum 10 dengan rasio asli/lightbox, onboarding dua karakter, dan editor kode. API lama: `setLampColor`, `setLampIntensity`, `toggleLamp`, `toggleTV`, `setTVScreenColor`, `scaleObject`, `setPlantColor`, `addDecor`.

Perbaikan tambahan: pemeriksaan ruangan memperhitungkan sumbu Z; collider furnitur diperbarui setelah drag/scale/hapus; dekor tidak boleh menutupi pemain; ukuran dekor dibatasi ruang; spawn/bangun mencari posisi bebas; tekstur foto dibatasi 1536 piksel agar tidak boros GPU. Foto original tetap digunakan untuk lightbox.

Tidak ada aset model karakter primitive yang dipakai sebagai fallback. Kegagalan memuat GLB dilaporkan kepada pemain.
