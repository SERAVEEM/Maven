# MAVEN --- Product & Technical Documentation

**Dokumen:** PRD, SRS, Architecture, Database Design\
**Status:** Baseline v0.1 --- divalidasi untuk implementasi MVP\
**Nama produk:** MAVEN\
**Platform target:** Windows Desktop (MVP v0.1); iOS (Roadmap Fase 2)\
**Prinsip utama:** Local-first, single-device, cost-efficient

## Daftar dokumen

1.  [`PRD.md`](PRD.md) --- visi produk, pengguna, masalah, ruang
    lingkup, MVP, metrik keberhasilan, roadmap.
2.  [`SRS.md`](SRS.md) --- kebutuhan fungsional/nonfungsional, aturan
    bisnis, use case, acceptance criteria.
3.  [`ARCHITECTURE.md`](ARCHITECTURE.md) --- arsitektur sistem,
    komponen, alur data, keamanan, keputusan teknologi.
4.  [`DATABASE.md`](DATABASE.md) --- model data SQLite, tabel, relasi,
    indeks, constraint, dan strategi migrasi.

## Cara membaca status keputusan

-   **Disepakati:** arah yang telah dipilih dalam diskusi produk.
-   **Usulan:** rancangan teknis awal yang perlu diuji sebelum dianggap
    final.
-   **Belum diputuskan:** membutuhkan keputusan produk/teknis
    berikutnya.

Dokumen ini sengaja membedakan keputusan produk dari usulan
implementasi. Target performa adalah sasaran pengujian, bukan jaminan
sebelum benchmark.

## Ringkasan MAVEN

MAVEN adalah personal AI assistant local-first untuk membantu pengguna
mengelola aktivitas sehari-hari melalui task management, kalender,
pengingat, catatan/pengetahuan pribadi, dan interaksi bahasa alami.
Fitur inti harus tetap dapat digunakan tanpa koneksi internet dan tanpa
model AI. AI lokal digunakan saat interpretasi atau perencanaan
membutuhkan kemampuan bahasa/model; operasi sederhana dijalankan secara
deterministik.

MVP berfokus pada produktivitas pribadi. Otomasi yang lebih luas dan
tindakan eksternal berisiko ditambahkan bertahap setelah fondasi izin,
validasi, dan audit tersedia.

## Prinsip desain

1.  **Local-first:** data utama disimpan pada perangkat.
2.  **Offline-capable core:** CRUD dan fungsi inti tidak bergantung pada
    internet atau LLM.
3.  **AI sebagai interpreter, bukan pemilik data:** model tidak boleh
    mengakses database atau shell secara langsung.
4.  **Explicit permissions:** tindakan destruktif atau berdampak ke luar
    perangkat memerlukan konfirmasi.
5.  **Modular monolith:** satu aplikasi dengan batas modul yang jelas;
    tidak memerlukan microservices untuk MVP.
6.  **Platform-native where it matters:** manfaatkan kemampuan OS untuk
    notifikasi dan speech.
7.  **Cost/resource efficiency:** jangan memanggil model untuk setiap
    operasi; muat model saat diperlukan dan evaluasi dampak RAM, CPU,
    GPU, dan baterai.
