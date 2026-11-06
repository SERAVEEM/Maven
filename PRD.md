# Product Requirements Document (PRD) --- MAVEN

**Versi:** 0.1\
**Status:** Draft untuk validasi\
**Pemilik produk:** MAVEN project team

## 1. Ringkasan produk

MAVEN adalah personal AI assistant local-first yang membantu pengguna
mengelola pekerjaan dan aktivitas pribadi melalui satu antarmuka
percakapan dan seperangkat fitur produktivitas. Fokus rilis MVP (v0.1)
adalah Windows Desktop, dengan penyimpanan lokal mandiri di perangkat.
Dukungan native iOS dijadwalkan pada Fase 2 setelah fondasi sistem stabil.

MAVEN bukan autonomous agent tanpa batas. Pada MVP, MAVEN adalah
productivity assistant yang dapat memahami perintah, mengelola data
produktivitas, mengambil kembali informasi pribadi, dan menjalankan
tindakan yang telah didefinisikan serta divalidasi.

## 2. Visi dan tujuan

### Visi

Menjadi asisten digital pribadi yang membantu pengguna mengatur,
memahami, dan secara bertahap mengeksekusi aktivitas sehari-hari secara
aman, efisien, dan privat.

### Tujuan MVP

-   Mengurangi friksi dalam mencatat dan mengelola tugas.
-   Menyatukan tugas, proyek, kalender, pengingat, dan catatan.
-   Memungkinkan input bahasa alami untuk operasi produktivitas umum.
-   Menyediakan pencarian dan retrieval informasi pribadi.
-   Memastikan fitur inti tetap bekerja saat offline.
-   Menjaga penggunaan resource dan biaya AI tetap rendah.

### Bukan tujuan MVP

-   Sinkronisasi cloud antarperangkat.
-   Kolaborasi multi-user atau team workspace.
-   Autonomous agent yang menjalankan perintah arbitrer.
-   Integrasi luas dengan email, messaging, smart home, atau layanan
    pihak ketiga.
-   Menjamin AI selalu benar atau dapat mengambil keputusan tanpa review
    pengguna.
-   Menjalankan proses background permanen di iOS.

## 3. Target pengguna dan kebutuhan

### Target pengguna awal

Individu yang ingin mengelola tugas, jadwal, pengingat, dan catatan
melalui aplikasi produktivitas pribadi dengan kontrol lokal atas data.

### Kebutuhan utama

-   Membuat tugas secepat mungkin, termasuk melalui bahasa alami.
-   Melihat prioritas dan tenggat.
-   Menghubungkan tugas dengan proyek.
-   Menyimpan catatan dan menemukan kembali informasi.
-   Melihat jadwal dan menerima pengingat.
-   Menggunakan fitur dasar tanpa internet.
-   Mengetahui dan mengontrol tindakan yang dilakukan assistant.

## 4. Ruang lingkup produk

### 4.1 MVP --- termasuk

  -----------------------------------------------------------------------
  Modul                               Kapabilitas MVP
  ----------------------------------- -----------------------------------
  Task management                     Create, read, update, delete,
                                      status, priority, due date

  Projects                            Membuat proyek dan mengelompokkan
                                      tugas

  Calendar                            Membuat dan melihat event; tampilan
                                      agenda sederhana

  Reminders                           Pengingat lokal untuk tugas/event

  Notes & knowledge                   Membuat, mengedit, menghapus,
                                      mencari catatan

  Conversational interface            Chat teks untuk perintah dan
                                      pertanyaan produktivitas

  Command interpreter                 Memetakan bahasa alami ke intent
                                      dan parameter

  Local AI runtime                    Model lokal untuk interpretasi
                                      kompleks dan retrieval berbantuan
                                      AI

  Execution controls                  Validasi, permission, konfirmasi,
                                      dan execution log

  Offline core                        CRUD dan akses data lokal tanpa
                                      internet
  -----------------------------------------------------------------------

### 4.2 Fase setelah MVP

-   Aplikasi native iOS (SwiftUI + Swift) setelah validasi Windows Desktop stabil.
-   Push-to-talk voice interaction.
-   Speech-to-text lokal atau native sesuai kemampuan platform.
-   Memory retrieval yang lebih kontekstual & semantic embeddings.
-   Workflow automation berbasis trigger dan action yang diizinkan.
-   Integrasi eksternal dengan permission per konektor.
-   Evaluasi opsi sinkronisasi antarperangkat sebagai keputusan produk
    terpisah.

### 4.3 Tidak termasuk pada MVP

-   Dukungan iOS (diparkir ke Fase 2 untuk menghindari duplikasi logic di awal).
-   Sinkronisasi data otomatis antarperangkat atau cloud backend.
-   Pengiriman email/pesan atau transaksi eksternal.
-   Eksekusi arbitrary shell command.
-   Akses bebas model AI ke file system atau SQL.
-   Multi-user, role management, dan server backend wajib.

## 5. Platform dan pengalaman

### Windows Desktop (Target Utama MVP v0.1)

-   Aplikasi desktop utama untuk validasi MVP (Tauri 2 + Rust + React).
-   Mendukung pengelolaan data lokal melalui SQLite terkelola di host Rust.
-   Model AI berbasis Adapter pattern (rule-based/deterministic parser di awal,
    disusul runtime model lokal teruji).
-   Notifikasi sistem melalui Windows native notification APIs.
-   Penyimpanan aman lokal untuk konfigurasi.

### iOS (Roadmap Fase 2)

-   Aplikasi native SwiftUI + Swift mandiri.
-   Diimplementasikan setelah kontrak domain dan flow MVP terbukti stabil di Windows.
-   Menggunakan local notifications (UNUserNotificationCenter).
-   Tidak mengandalkan proses background yang berjalan terus-menerus.

### Sinkronisasi

**Keputusan saat ini: single-device.** Setiap instalasi memiliki
database sendiri. Tidak ada jaminan data Windows dan iOS saling
tersinkronisasi. Ekspor/impor lokal dapat dipertimbangkan kemudian, tetapi
bukan bagian dari MVP.

## 6. Prinsip interaksi AI

1.  Operasi sederhana seperti "buat tugas beli susu besok" dapat
    diproses melalui parser deterministik jika pola dan parameter cukup
    jelas.
2.  LLM lokal digunakan untuk instruksi ambigu, ekstraksi yang lebih
    kompleks, rangkuman, dan retrieval berbantuan AI.
3.  Output LLM harus berupa struktur/intent yang divalidasi, bukan query
    SQL atau perintah shell.
4.  Jika parameter penting tidak tersedia atau confidence rendah, MAVEN
    meminta klarifikasi.
5.  Tindakan destruktif atau eksternal memerlukan konfirmasi eksplisit.
6.  Pengguna dapat melihat hasil tindakan dan riwayat eksekusi yang
    relevan.

## 7. User journeys utama

### Journey A --- membuat tugas

1.  Pengguna membuka MAVEN.
2.  Pengguna mengetik "Ingatkan aku mengirim laporan Jumat jam 3 sore".
3.  Interpreter mengekstrak judul, tanggal, dan waktu.
4.  Sistem memvalidasi zona waktu dan parameter.
5.  Task/reminder disimpan ke SQLite.
6.  OS notification dijadwalkan.
7.  MAVEN menampilkan konfirmasi hasil.

### Journey B --- mengelola proyek

1.  Pengguna membuat proyek.
2.  Pengguna menambahkan tugas ke proyek.
3.  Pengguna mengubah prioritas/status.
4.  Pengguna melihat daftar tugas berdasarkan proyek atau status.

### Journey C --- menemukan catatan

1.  Pengguna menanyakan informasi yang pernah dicatat.
2.  Sistem melakukan pencarian lokal.
3.  Jika diperlukan, AI membantu merangkum hasil yang ditemukan.
4.  Jawaban menyertakan referensi ke catatan sumber di dalam aplikasi.

### Journey D --- tindakan berisiko

1.  Pengguna meminta tindakan yang membutuhkan konfirmasi.
2.  MAVEN menampilkan ringkasan tindakan dan konsekuensinya.
3.  Pengguna menyetujui atau membatalkan.
4.  Execution service menjalankan tindakan yang telah diizinkan.
5.  Hasil dicatat di execution log.

## 8. Metrik keberhasilan MVP

Metrik berikut adalah target awal dan harus dievaluasi melalui usability
test serta benchmark:

-   Pengguna dapat membuat tugas manual dalam maksimal 3 interaksi
    utama.
-   Minimal 90% operasi CRUD inti berhasil pada test suite.
-   Operasi CRUD lokal sederhana memiliki target respons p95 di bawah
    100 ms pada perangkat referensi.
-   Perintah deterministik yang dikenali memiliki target respons p95 di
    bawah 500 ms, tidak termasuk waktu input pengguna.
-   Untuk model lokal, target respons sederhana di bawah 10 detik adalah
    sasaran benchmark, bukan SLA.
-   Tidak ada tindakan destruktif/eksternal yang dieksekusi tanpa
    otorisasi sesuai kebijakan.
-   Fitur CRUD inti dapat digunakan dalam mode airplane/offline.

## 9. Risiko dan mitigasi

  ---------------------------------------------------------------------------
  Risiko                  Dampak                  Mitigasi
  ----------------------- ----------------------- ---------------------------
  Model lokal lambat atau UX buruk dan perangkat  Benchmark beberapa ukuran
  boros RAM               terbebani               model; lazy-load/unload;
                                                  fallback deterministik

  Interpretasi            Reminder salah jadwal   Zona waktu eksplisit,
  tanggal/waktu keliru                            validasi, konfirmasi saat
                                                  ambigu

  AI menghasilkan         Data rusak atau         Schema validation,
  tindakan tidak valid    tindakan tak diinginkan allowlist tools, permission
                                                  gate

  iOS membatasi           Reminder atau proses    Gunakan
  background task         tertunda                UNUserNotificationCenter;
                                                  jangan mengandalkan daemon

  Data antarperangkat     Pengguna melihat data   Jelaskan single-device
  tidak sinkron           berbeda                 secara eksplisit;
                                                  sinkronisasi menjadi fase
                                                  terpisah

  Database rusak atau     Kehilangan data         Transaksi, backup/export,
  migrasi gagal                                   migration test, recovery
                                                  strategy
  ---------------------------------------------------------------------------

## 10. Status keputusan & pertanyaan terbuka

### Keputusan yang telah disepakati (Baseline v0.1)

-   **Platform MVP:** Windows Desktop first (Tauri 2 + Rust + React). Dukungan native iOS diparkir ke Fase 2.
-   **Tampilan Kalender MVP:** Tampilan agenda/list sederhana. Tampilan grid bulanan/mingguan dihindari di v0.1 untuk efisiensi implementasi.
-   **Format Catatan:** Teks polos & Markdown dasar. Lampiran berkas biner/media ditunda ke fase berikutnya.
-   **Penghapusan Data (Data Safety):** Menggunakan *Soft Delete* (`deleted_at`) pada task dan catatan untuk mencegah kehilangan data akibat kesalahan AI atau klik tidak sengaja.
-   **Pencarian Teks (Search):** Menggunakan SQLite FTS5 (Full-Text Search) sejak awal di host Rust.
-   **Strategi AI Runtime:** Adapter pattern dengan parser deterministik (rule-based) di awal; runtime model lokal (llama.cpp) disambungkan bertahap.
-   **Strategi Backup/Restore:** Ekspor snapshot database SQLite lokal (`VACUUM INTO`) dan format JSON portabel.
-   **Interaksi Suara (Voice):** Push-to-talk dialokasikan ke post-MVP.

### Pertanyaan terbuka berikutnya

-   Apakah ekspor/impor JSON antarperangkat perlu didukung sebelum sinkronisasi cloud Fase 2?
-   Apakah pengguna memerlukan konfigurasi ambang batas confidence AI dari UI pengaturan?
