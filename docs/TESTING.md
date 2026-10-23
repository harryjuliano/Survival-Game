# Pengujian dan batas verifikasi

Tanggal: 23 Oktober 2026. Node v24.19.0, Three.js 0.128.0, Vite 8.3.5.

## Sudah dijalankan

- `npm test`: **15/15 lulus**. Termasuk struktur GLB/skin/empat klip, Khronos validator dengan nol error/warning pada karakter, budget polygon/LOD, dinding tertutup, pintu membuka/menutup koridor nyata melalui raycast, collision mengikuti drag/rotation/scale/delete, jalur antar-ruang sampai luar rumah, obstacle lingkungan, shoreline, recovery posisi pemain, dan adaptive quality.
- `npm run build`: **lulus**, menghasilkan build statis `dist/` dengan semua aset lokal.
- `node scripts/export-shaders.mjs` lalu `python3 scripts/check-shaders-egl.py`: **6 kombinasi program shader compile + link lulus** pada Mesa EGL software, masing-masing GLSL ES 1.00 dan 3.00 untuk terrain, ocean, dan grass instancing. Ini memeriksa sumber shader Three r128 beserta lighting, shadow, environment, dan tone mapping; bukan benchmark GPU/browser.
- Kedua mesh karakter diperiksa melalui rasterisasi CPU dari GLB, termasuk penerapan bind matrices dan pose awal. Gambar pemeriksaan bukan output game/browser.
- Preview browser berhasil memuat modul/halaman setelah konfigurasi host Vite diperbaiki, tetapi berhenti di `THREE.WebGLRenderer: Error creating WebGL context.` Pesan kegagalan ditampilkan oleh aplikasi. Tidak dilakukan bypass atau penggantian renderer dengan mockup.

## Belum terverifikasi

Browser pengujian yang tersedia tidak menyediakan konteks WebGL. Karena itu **tidak ada klaim FPS, kualitas visual final pada GPU, atau seluruh regresi gameplay telah lulus**. Pengujian pada HP fisik juga belum dilakukan. Keberhasilan unit test dan build tidak menggantikan tes berikut.

| Pemeriksaan penerimaan di browser WebGL | Langkah |
|---|---|
| Dua karakter | Pilih laki-laki, berjalan/lari/lompat, keluar, pilih perempuan; amati pose, tangan, pakaian, kaki dan pergantian animasi. |
| Gerakan dan collision | WASD, Shift, Space; berjalan ke dinding, sofa, pohon/batu. Periksa sliding dan tidak menembus collider. |
| Jalur rumah | Dekati pintu di x −6,1, −18,3, −30,5 dengan z sekitar −2,5; E; lintasi ketiganya sampai pulau dan kembali. |
| Rumah utuh | Pilih Dinding utuh, orbit dari semua arah dan dari atas; periksa sambungan atap, dinding, kaca. Kembali ke otomatis. |
| Jendela | Dekati jendela depan/belakang lalu E dua kali; periksa animasi dan kaca. |
| Dekor | Tambah semua jenis, drag, scale lewat editor, hapus dekor tambahan. Coba dekat dinding dan pemain. |
| Tidur/lampu/TV | E dekat kasur, E bangun dan tunggu timer 60 detik; lampu kembali ke kondisi sebelumnya. Uji semua API editor dan input salah. |
| Foto | Unggah portrait/landscape, coba 11 gambar, buka lightbox, Esc, lalu gerak lagi. |
| Audio | Nyalakan/matikan; bandingkan indoor/pantai; pindah tab dan kembali. |
| Lingkungan | Periksa gelombang, garis foam, pantulan langit, transisi pasir, rumput, arah angin, burung/kupu-kupu/kepiting. |
| Kualitas | Ganti Low/Medium/High; zoom/orbit dan keliling pulau. Periksa pop LOD, shadow acne dan DPR adaptation. |
| Mobile | Android Chrome dan iOS Safari dengan WebGL, portrait/landscape; arah+lari+lompat, pinch zoom, drag dekor, scroll onboarding, touchcancel. |
| Profiling | Catat perangkat/resolusi/preset, FPS median dan 1% low selama 60 detik indoor/pantai/hutan, draw calls/triangles/memory, loading dingin dan panas. |

Target praktis untuk pengujian berikut: desktop 60 FPS, mobile minimal sekitar 30 FPS dengan preset sesuai. **Angka ini target, bukan hasil pengukuran.**

## Preset dan kontrol biaya

| Preset | Batas DPR | Shadow map | Kepadatan rumput | Jarak LOD relatif |
|---|---:|---:|---:|---:|
| Low | 1,0 | 512 | 28% | 0,6 |
| Medium | 1,35 | 1024 | 65% | 0,85 |
| High | 1,75 | 2048 | 100% | 1,2 |

Adaptive quality menilai rata-rata frame time dengan interval enam detik, menurunkan DPR sampai 65% dari batas preset, lalu memulihkan perlahan bila cukup cepat. Frame panjang saat tab kembali tidak dijadikan sampel. Ini tidak menjamin target FPS jika bottleneck utamanya CPU/draw calls. Aset tekstur maksimum 1K untuk lingkungan/karakter; foto maksimum 1536. Tidak menggunakan SSAO, ray tracing atau simulasi fisika berat.
