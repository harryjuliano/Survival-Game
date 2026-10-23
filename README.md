# Room Decor 3D — visual overhaul

Game 3D interaktif untuk browser, dikembangkan dari versi HTML Three.js yang tersedia. Tetap menggunakan Three.js 0.128.0; Vite ditambahkan untuk modul, pengembangan lokal, dan build statis. Tidak ada migrasi React/R3F yang diperlukan.

**Status:** implementasi overhaul tersedia, 15 pengujian otomatis dan kompilasi/link shader offline lulus. Pengujian visual/gameplay lengkap di browser GPU dan mobile **belum terverifikasi**, karena browser pengujian tidak dapat membuat konteks WebGL. Detail di [docs/TESTING.md](docs/TESTING.md).

## Menjalankan

Gunakan Node.js 22.12 atau lebih baru, lalu buka terminal di folder proyek:

```bash
npm ci
npm run dev
```

Buka `http://localhost:4173/`. Aset sudah termasuk di `public/assets/`; tidak perlu mengunduh model atau memiliki akun penyedia aset. Instalasi dependency pertama memerlukan internet. Setelah instalasi, game tidak memakai CDN/API eksternal saat dimainkan.

```bash
npm test
npm run build
npm run preview -- --port 4173
```

Jangan membuka `index.html` dengan `file://`; ES modules dan pemuatan GLB memerlukan HTTP.

## Deploy

Folder `dist/` berisi build statis yang sudah disertakan. Upload **seluruh isi** folder tersebut ke hosting statis dengan HTTPS, termasuk `assets/`. Untuk membangun ulang gunakan `npm ci && npm run build`; publish directory adalah `dist`. Konfigurasi Vite memakai `base: './'` agar aset mendukung hosting dalam subfolder. Tidak diperlukan server aplikasi, database, atau API key. Tidak ada deployment eksternal yang dilakukan dalam pekerjaan ini.

## Kontrol

| Kontrol | Fungsi |
|---|---|
| WASD / panah | Berjalan relatif arah kamera |
| Shift | Berlari |
| Space | Melompat |
| E / tombol aksi | Pintu, jendela, tidur/bangun |
| Drag area kosong / klik kanan | Orbit kamera |
| Roda mouse / pinch | Zoom |
| Drag furnitur | Pindahkan furnitur di dalam ruangan asal |
| Katalog, + Dekor, Hapus | Tambah/hapus dekor tambahan |
| Foto | Unggah hingga 10 gambar; klik bingkai untuk memperbesar |
| Dinding | Otomatis transparan untuk kamera / rumah utuh |
| Lampu, Suara, Grafik | Pencahayaan, ambience, preset Low/Medium/High |
| Code | API dekorasi JavaScript yang sudah ada |

Pada layar kecil tersedia tombol arah, lari, lompat, dan aksi. Audio hanya dimulai setelah tombol Suara ditekan. Progres dan foto hanya disimpan selama sesi halaman, sama seperti versi sebelumnya.

## Struktur

- `src/main.js`: alur game, input, kamera, foto, UI, dan API lama.
- `src/environment.js`, `src/terrain.js`: pulau, vegetasi, laut, animasi hewan.
- `src/house.js`, `src/furniture.js`, `src/placement.js`: rumah, dekorasi, penempatan.
- `src/character.js`: GLB humanoid, skeleton clone, mixer dan crossfade animasi.
- `src/assets.js`: material PBR, HDR, cache model dan normalisasi ukuran.
- `src/collision.js`: collision dinding, pintu, furnitur, pohon, batu, tepi pulau.
- `src/quality.js`, `src/audio.js`: preset/adaptive rendering dan ambience sintetis.
- `public/assets/`: aset lokal, lisensi, dan manifest sumber.
- `scripts/`: pipeline aset opsional dan pemeriksaan shader offline.
- `tests/`: pengujian aset, collision, geometri rumah, dan penempatan.
- `docs/legacy-reference.html`: salinan versi awal untuk perbandingan; bukan runtime.

Lihat [audit dan hasil tahap](docs/AUDIT.md), [aset dan lisensi](docs/ASSETS.md), serta [hasil pengujian](docs/TESTING.md).
