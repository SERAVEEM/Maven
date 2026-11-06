# Software Requirements Specification (SRS) --- MAVEN

**Versi:** 0.1\
**Status:** Draft untuk validasi\
**Acuan:** PRD MAVEN v0.1

## 1. Tujuan dan ruang lingkup

Dokumen ini mendefinisikan kebutuhan perangkat lunak MAVEN untuk MVP
v0.1 dengan fokus utama pada Windows Desktop. Dukungan native iOS
dijadwalkan pada Fase 2 setelah core business logic dan command engine
tervalidasi. Persyaratan diberi ID agar dapat ditelusuri ke desain,
implementasi, dan pengujian.

Kata **MUST** berarti wajib untuk MVP; **SHOULD** berarti sangat
disarankan; **MAY** berarti opsional.

## 2. Lingkungan sistem

-   Windows Desktop (MVP v0.1): aplikasi berbasis Tauri 2, UI React + TypeScript,
    host/backend Rust sebagai pemilik otoritatif SQLite dan platform integration.
-   iOS (Roadmap Fase 2): aplikasi native SwiftUI + Swift mandiri.
-   Database lokal: SQLite terkelola melalui `rusqlite` pada host Rust dengan
    migrasi SQL versi manual dan ekstensi FTS5.
-   Model AI: runtime berbasis Adapter pattern; implementasi awal
    menggunakan parser deterministik berbasis aturan/regex, diikuti modul
    llama.cpp lokal pada fase berikutnya.
-   Tidak ada server/cloud yang wajib untuk fungsi inti.

## 3. Kebutuhan fungsional

### 3.1 Task management

-   **FR-TASK-001 MUST:** Sistem menyediakan pembuatan tugas dengan
    judul wajib.
-   **FR-TASK-002 MUST:** Sistem menyediakan pembacaan daftar dan detail
    tugas.
-   **FR-TASK-003 MUST:** Sistem menyediakan pengubahan judul,
    deskripsi, status, prioritas, tanggal tenggat, dan relasi proyek.
-   **FR-TASK-004 MUST:** Sistem menyediakan penghapusan tugas dengan
    mekanisme soft delete (`deleted_at`) dan konfirmasi, sehingga tugas dapat
    dipulihkan jika terjadi kesalahan.
-   **FR-TASK-005 MUST:** Sistem mendukung status minimal `todo`,
    `in_progress`, `done`, dan `cancelled`.
-   **FR-TASK-006 MUST:** Sistem mendukung prioritas minimal `low`,
    `medium`, `high`, dan `urgent`.
-   **FR-TASK-007 SHOULD:** Sistem menyediakan filter berdasarkan
    status, prioritas, proyek, dan tenggat.
-   **FR-TASK-008 SHOULD:** Sistem menyediakan opsi memulihkan (restore)
    tugas yang telah di-soft delete serta penghapusan permanen (hard delete)
    eksplisit.

### 3.2 Projects

-   **FR-PROJ-001 MUST:** Pengguna dapat membuat, melihat, mengubah, dan
    menghapus proyek.
-   **FR-PROJ-002 MUST:** Tugas dapat dikaitkan dengan nol atau satu
    proyek.
-   **FR-PROJ-003 MUST:** Penghapusan proyek tidak boleh menghapus tugas
    terkait secara diam-diam; sistem harus meminta pilihan atau melepas
    relasi sesuai kebijakan yang ditetapkan.

### 3.3 Calendar

-   **FR-CAL-001 MUST:** Pengguna dapat membuat, melihat, mengubah, dan
    menghapus event kalender.
-   **FR-CAL-002 MUST:** Event memiliki judul, waktu mulai, dan zona
    waktu.
-   **FR-CAL-003 MUST:** Event dengan waktu selesai harus memiliki waktu
    selesai setelah waktu mulai.
-   **FR-CAL-004 SHOULD:** Sistem menyediakan tampilan agenda/list view
    berdasarkan rentang tanggal sebagai antarmuka kalender utama MVP.
-   **FR-CAL-005 MUST:** Waktu disimpan dalam format UTC dan zona waktu
    IANA asal disimpan terpisah.

### 3.4 Reminders and notifications

-   **FR-REM-001 MUST:** Pengguna dapat membuat pengingat dengan waktu
    pemicu.
-   **FR-REM-002 MUST:** Pengingat dapat dikaitkan dengan tugas atau
    event.
-   **FR-REM-003 MUST:** Sistem menjadwalkan notifikasi melalui
    mekanisme native OS.
-   **FR-REM-004 MUST:** Pengguna dapat mengubah atau membatalkan
    pengingat.
-   **FR-REM-005 MUST:** Sistem mencatat status reminder, termasuk
    `scheduled`, `fired`, `cancelled`, atau `failed`.
-   **FR-REM-006 MUST:** Jika izin notifikasi ditolak, sistem memberi
    tahu pengguna dan tetap menyimpan reminder.

### 3.5 Notes and personal knowledge

-   **FR-NOTE-001 MUST:** Pengguna dapat membuat, melihat, mengubah, dan
    menghapus catatan (dengan dukungan soft delete `deleted_at`).
-   **FR-NOTE-002 MUST:** Catatan memiliki judul, isi, created
    timestamp, dan updated timestamp.
-   **FR-NOTE-003 MUST:** Sistem menyediakan pencarian lokal berbasis
    SQLite FTS5 (Full-Text Search) untuk judul dan isi catatan.
-   **FR-NOTE-004 SHOULD:** Sistem mendukung tag sederhana.
-   **FR-NOTE-005 SHOULD:** Sistem dapat menampilkan catatan sumber yang
    dipakai untuk menjawab pertanyaan.

### 3.6 Conversational interface and command interpretation

-   **FR-AI-001 MUST:** Sistem menyediakan antarmuka chat teks.
-   **FR-AI-002 MUST:** Sistem menerima instruksi bahasa alami untuk use
    case produktivitas yang didukung.
-   **FR-AI-003 MUST:** Sistem memetakan instruksi ke intent, entities,
    dan parameter terstruktur.
-   **FR-AI-004 MUST:** Sistem memvalidasi struktur hasil interpretasi
    terhadap schema sebelum tindakan.
-   **FR-AI-005 MUST:** Sistem meminta klarifikasi ketika parameter
    wajib tidak tersedia atau ambigu.
-   **FR-AI-006 MUST:** Sistem tidak boleh mengirim SQL mentah atau
    shell command dari model ke execution layer.
-   **FR-AI-007 MUST:** Operasi deterministik yang dapat diproses tanpa
    LLM tidak boleh memanggil LLM secara default.
-   **FR-AI-008 SHOULD:** Sistem menyimpan riwayat percakapan lokal
    dengan opsi penghapusan.

### 3.7 Action execution and permissions

-   **FR-EXEC-001 MUST:** Semua tindakan melalui registry tool/action
    yang terdaftar.
-   **FR-EXEC-002 MUST:** Setiap tool mendefinisikan input schema,
    permission level, dan validasi.
-   **FR-EXEC-003 MUST:** Tindakan destruktif memerlukan konfirmasi
    eksplisit.
-   **FR-EXEC-004 MUST:** Tindakan eksternal, jika ditambahkan pada fase
    berikutnya, memerlukan konfirmasi dan permission khusus.
-   **FR-EXEC-005 MUST:** Sistem mencatat waktu, action, input ringkas,
    status, dan error pada execution log.
-   **FR-EXEC-006 MUST:** Sistem menolak tool yang tidak terdaftar atau
    input yang tidak lolos validasi.

### 3.8 Offline and local data

-   **FR-LOCAL-001 MUST:** CRUD tugas, proyek, event, reminder, dan
    catatan dapat digunakan tanpa internet.
-   **FR-LOCAL-002 MUST:** Data utama disimpan pada database lokal
    perangkat.
-   **FR-LOCAL-003 MUST:** Sistem tidak mengirim data pengguna ke server
    eksternal pada MVP.
-   **FR-LOCAL-004 MUST:** Kegagalan runtime AI tidak boleh menghalangi
    operasi CRUD manual.
-   **FR-LOCAL-005 MUST:** Instalasi Windows dan iOS memiliki database
    terpisah dan tidak melakukan sinkronisasi otomatis.

### 3.9 Voice --- post-MVP

-   **FR-VOICE-001 SHOULD:** Interaksi suara menggunakan push-to-talk,
    bukan always-listening.
-   **FR-VOICE-002 SHOULD:** Pengguna dapat membatalkan proses rekaman
    sebelum transkripsi.
-   **FR-VOICE-003 SHOULD:** Sistem menampilkan teks transkripsi sebelum
    tindakan berisiko dieksekusi.
-   **FR-VOICE-004 SHOULD:** Implementasi memanfaatkan API native atau
    STT lokal sesuai platform.

## 4. Kebutuhan nonfungsional

### 4.1 Performance

-   **NFR-PERF-001:** Target operasi CRUD lokal p95 \<100 ms pada
    perangkat referensi; wajib diukur.
-   **NFR-PERF-002:** Target parser deterministik p95 \<500 ms untuk
    perintah yang didukung.
-   **NFR-PERF-003:** Target respons model lokal sederhana \<10 detik
    pada perangkat referensi; wajib benchmark.
-   **NFR-PERF-004:** Model AI tidak boleh dimuat permanen tanpa
    kebutuhan yang jelas; dukung lazy-load/unload jika runtime
    memungkinkan.

### 4.2 Reliability and data integrity

-   **NFR-REL-001:** Operasi multi-langkah pada database menggunakan
    transaksi.
-   **NFR-REL-002:** Aplikasi harus menangani kegagalan penyimpanan
    tanpa menyatakan operasi berhasil.
-   **NFR-REL-003:** Migrasi database harus versioned dan dapat diuji
    dari versi sebelumnya.
-   **NFR-REL-004:** Penghapusan dan perubahan data harus mengikuti
    foreign key constraints.

### 4.3 Security and privacy

-   **NFR-SEC-001:** Database dan file lokal mengikuti perlindungan OS;
    opsi enkripsi database perlu dievaluasi.
-   **NFR-SEC-002:** Tidak ada API key atau secret yang ditanam di
    source code.
-   **NFR-SEC-003:** Model tidak memiliki akses langsung ke SQL,
    arbitrary file access, atau shell.
-   **NFR-SEC-004:** Input AI diperlakukan sebagai untrusted input dan
    selalu divalidasi.
-   **NFR-SEC-005:** Execution log tidak boleh menyimpan secret atau
    konten sensitif secara berlebihan.
-   **NFR-SEC-006:** Pengguna dapat menghapus data lokal melalui fitur
    yang jelas.

### 4.4 Usability and accessibility

-   **NFR-UX-001:** Status keberhasilan, kegagalan, dan kebutuhan
    konfirmasi harus terlihat jelas.
-   **NFR-UX-002:** Pengguna dapat menyelesaikan CRUD inti tanpa
    menggunakan chat.
-   **NFR-UX-003:** Form input menyediakan validasi dan pesan kesalahan
    yang dapat ditindaklanjuti.
-   **NFR-UX-004:** UI harus mempertimbangkan keyboard navigation pada
    Windows dan dynamic type/accessibility pada iOS.

### 4.5 Portability and maintainability

-   **NFR-MNT-001:** Domain logic dipisahkan dari UI dan infrastruktur
    OS.
-   **NFR-MNT-002:** Kontrak command/entity menggunakan
    schema/versioning yang terdokumentasi.
-   **NFR-MNT-003:** Adapter AI dan adapter notification dapat diganti
    tanpa mengubah domain logic.
-   **NFR-MNT-004:** Setiap perubahan schema database memiliki
    migration.

## 5. Aturan bisnis

-   **BR-001:** Judul tugas, proyek, event, dan catatan tidak boleh
    kosong setelah trim.
-   **BR-002:** Waktu akhir event harus lebih besar dari waktu mulai.
-   **BR-003:** Semua timestamp disimpan dalam UTC; timezone IANA
    disimpan untuk interpretasi dan display.
-   **BR-004:** Penghapusan proyek tidak boleh menyebabkan penghapusan
    tugas tanpa persetujuan.
-   **BR-005:** AI hanya boleh memanggil action yang terdaftar.
-   **BR-006:** Confidence/ambiguity di bawah ambang yang ditetapkan
    memicu klarifikasi, bukan eksekusi.
-   **BR-007:** Tindakan destructive dan external memerlukan konfirmasi.
-   **BR-008:** Kegagalan AI tidak boleh menghapus atau mengunci akses
    ke data produktivitas lokal.
-   **BR-009:** Penghapusan task dan note menggunakan mekanisme soft delete
    (`deleted_at` diisi timestamp UTC) secara default untuk mencegah kehilangan data
    permanen akibat kesalahan AI atau klik tidak sengaja.

## 6. Use cases dan acceptance criteria

### UC-01 --- Create task manually

**Given** pengguna berada di halaman task, **when** pengguna memasukkan
judul valid dan menyimpan, **then** task tersimpan dan tampil pada
daftar.

### UC-02 --- Create task using natural language

**Given** command interpreter tersedia, **when** pengguna memasukkan
instruksi yang jelas seperti "buat tugas review proposal besok",
**then** sistem menampilkan ringkasan parameter dan menyimpan task
setelah validasi. Jika tanggal ambigu, sistem meminta klarifikasi.

### UC-03 --- Delete task

**Given** task tersedia, **when** pengguna memilih delete, **then**
sistem meminta konfirmasi dan hanya menghapus setelah persetujuan.

### UC-04 --- Create reminder offline

**Given** perangkat offline, **when** pengguna membuat reminder dengan
waktu valid, **then** reminder disimpan lokal dan OS notification
dijadwalkan jika izin tersedia.

### UC-05 --- Search notes

**Given** terdapat catatan dengan kata kunci tertentu, **when** pengguna
mencari kata tersebut, **then** hasil relevan ditampilkan tanpa
memerlukan koneksi internet.

### UC-06 --- AI runtime unavailable

**Given** runtime AI tidak tersedia, **when** pengguna membuat task
melalui UI manual, **then** operasi tetap berhasil.

### UC-07 --- Invalid AI action

**Given** model menghasilkan tool atau parameter yang tidak
terdaftar/valid, **when** execution layer menerima output tersebut,
**then** tindakan ditolak dan kegagalan dicatat.

## 7. Traceability ringkas

  PRD area              SRS requirement
  --------------------- --------------------------------
  Task management       FR-TASK-001 s.d. FR-TASK-008
  Projects              FR-PROJ-001 s.d. FR-PROJ-003
  Calendar              FR-CAL-001 s.d. FR-CAL-005
  Reminders             FR-REM-001 s.d. FR-REM-006
  Notes & knowledge     FR-NOTE-001 s.d. FR-NOTE-005
  Conversational AI     FR-AI-001 s.d. FR-AI-008
  Safe execution        FR-EXEC-001 s.d. FR-EXEC-006
  Local-first/offline   FR-LOCAL-001 s.d. FR-LOCAL-005

## 8. Asumsi dan batasan

-   Satu pengguna per instalasi untuk MVP.
-   Tidak ada account/server wajib.
-   Fokus platform rilis MVP v0.1 adalah Windows Desktop; dukungan native
    iOS ditunda ke Fase 2 untuk menghindari duplikasi domain logic di awal.
-   Dukungan runtime AI menggunakan Adapter pattern dengan parser
    deterministik berbasis regex/chrono terlebih dahulu, disusul model lokal
    llama.cpp yang dapat diaktifkan bertahap.
-   Kebutuhan voice adalah post-MVP kecuali diputuskan ulang.
