# Rankify.AI

Rankify.AI adalah aplikasi penelitian pengolahan nilai siswa berbasis React/Vite dan Supabase. Aplikasi mendukung akun admin, guru, dan siswa; input nilai lewat OCR dan Excel/CSV; peringkat serta analisis penelitian; dan tutor matematika berbasis materi PDF.

## Menjalankan frontend

1. Buat project Supabase dan salin `.env.example` menjadi `.env.local`.
2. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` dari pengaturan API project.
3. Pasang dependensi dan jalankan aplikasi:

```bash
npm install
npm run dev
```

Jika konfigurasi Supabase belum terisi, aplikasi menampilkan pesan konfigurasi dan tidak menggunakan akun demo atau penyimpanan lokal sebagai pengganti.

## Menyiapkan Supabase

Jalankan migrasi `supabase/migrations/20261013000000_school_foundation.sql` melalui Supabase CLI (`supabase link` lalu `supabase db push`) atau SQL Editor. `supabase/seed.sql` menambahkan periode penelitian dan tiga kelas pilot; jalankan setelah migrasi.

Di Supabase Auth, matikan pendaftaran publik. Untuk pilot, buat akun secara manual dengan metadata berikut:

- `app_metadata.rankify_role`: `guru`, `siswa`, atau `admin`
- `app_metadata.school_id`: `00000000-0000-4000-8000-000000000001`
- `app_metadata.must_change_password`: `true`
- `user_metadata.full_name`: nama akun
- `user_metadata.nisn`: NISN untuk siswa

Trigger migrasi membuat profil saat akun Auth dibuat. Guru dapat membuat kelas dan mengubah KKM di menu **Pengaturan**. Hubungkan akun guru dan siswa ke kelas melalui tabel `class_memberships` di Supabase; untuk pilot gunakan email profil yang sudah dibuat. Contoh SQL setelah mengganti email:

```sql
insert into public.class_memberships (class_id, profile_id, member_role)
select c.id, p.id, p.role
from public.classes c
join public.profiles p on p.email in ('guru@sekolah.id', 'siswa@sekolah.id')
where p.role in ('guru', 'siswa') and c.name = 'Eksperimen 1'
on conflict (class_id, profile_id) do nothing;
```

Sediakan fungsi Edge dan rahasia OpenRouter:

```bash
supabase functions deploy tutor-chat
supabase functions deploy teacher-insights
supabase functions deploy admin-create-user
supabase functions deploy admin-account-action
supabase secrets set OPENROUTER_API_KEY=...
supabase secrets set OPENROUTER_MODEL=openai/gpt-4o
supabase secrets set APP_ORIGIN=https://alamat-frontend-anda
```

Saat mengembangkan secara lokal, fungsi juga menerima origin `localhost`. `admin-create-user` memakai `SUPABASE_SERVICE_ROLE_KEY` hanya di sisi Edge Function untuk membuat akun dan tidak pernah mengeksposnya ke browser.

## Peran dan batas data

- Guru mengelola nilai dan kelas yang ditugaskan.
- Siswa hanya membaca nilai miliknya. Ranking kelas disajikan lewat fungsi database yang hanya mengembalikan nama dan posisi, tanpa nilai teman.
- Admin dapat melihat data satu sekolah dan mengelola akun melalui menu **Administrasi**.
- Tutor siswa memakai materi yang disetujui dan progres pribadi anonim. Foto soal serta percakapan tidak disimpan.

## Impor dan migrasi data

Pada **Input Data**, file Excel/CSV dapat menyertakan kolom NISN, Nama, dan Nilai di tiap kelompok asesmen. Jika NISN tidak ada, sistem mencocokkan nama dalam kelas. OCR foto/kamera menampilkan pratinjau sebelum data dikirim. Konflik nilai meminta keputusan untuk memperbarui atau melewati data yang sudah ada; baris tanpa pasangan roster masuk ke laporan karantina untuk diverifikasi sebelum disimpan.

Untuk memindahkan data lama:

1. Buka versi lama pada origin/browser yang menyimpan data, lalu ekspor data `localStorage` melalui halaman **Input Data**.
2. Ekspor tabel `students` MySQL dari phpMyAdmin sebagai CSV, atau ekspor tiap browser lama sebagai JSON.
3. Di versi Supabase, impor dump `.sql`, CSV, atau JSON melalui panel migrasi pada halaman **Input Data**.
4. Pastikan kelas, periode, akun siswa, NISN, dan keanggotaan roster sudah ada. Tinjau `import_quarantine` sebelum memakai nilai untuk analisis resmi.

## Materi tutor

Guru dapat mengunggah PDF di menu **Materi Tutor**. Teks PDF diekstrak; halaman hasil scan diproses dengan OCR. Periksa dan koreksi tiap halaman sebelum menyetujui materi. Tutor merujuk judul dan halaman yang tersedia serta menolak menjawab bila sumber yang disetujui tidak mencakup pertanyaan.

## Pemeriksaan

```bash
npm run test
npm run build
```

Tes mencakup validasi nilai, dense ranking, KKM, N-Gain, dan parsing Excel dengan NISN. Kebijakan RLS harus diverifikasi pada project Supabase pilot dengan akun admin, guru, dan siswa.

Direktori `backend/` dan `database/rankify_ai.sql` dipertahankan hanya sebagai sumber migrasi historis; frontend aktif tidak lagi memakai API PHP/MySQL.
