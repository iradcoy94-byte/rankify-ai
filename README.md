# Rankify.AI

Rankify.AI sekarang memakai frontend React/Vite, backend PHP untuk Apache XAMPP, database MySQL, dan Chatbot AI melalui DeepSeek.

## Instalasi XAMPP

1. Download XAMPP dari https://www.apachefriends.org/download.html.
2. Install XAMPP, lalu buka XAMPP Control Panel.
3. Start `Apache` dan `MySQL`.
4. Salin folder project ini ke `C:\xampp\htdocs\rankify-ai`.
5. Buka `http://localhost/phpmyadmin`, lalu import file `database/rankify_ai.sql`.

## Konfigurasi Backend

1. Salin `backend/config.local.example.php` menjadi `backend/config.local.php`.
2. Isi API key DeepSeek:

```php
'deepseek' => [
    'api_key' => 'sk-deepseek-api-key-anda',
    'base_url' => 'https://api.deepseek.com/chat/completions',
    'model' => 'deepseek-chat',
],
```

3. Default MySQL XAMPP memakai user `root` tanpa password. Jika MySQL Anda berbeda, ubah bagian `db` di `backend/config.local.php`.

## Menjalankan Frontend

```bash
npm install
npm run dev
```

Frontend berjalan di `http://localhost:8080` dan akan memanggil backend di `http://localhost/rankify-ai/backend`.

## Akun Awal

Password kedua akun: `rankify123`.

- Guru: `guru@rankify.test`
- Peserta didik: `siswa@rankify.test`

Guru bisa upload, tambah, edit, hapus, reset data, melihat semua tabel, dan memakai Chatbot AI. Peserta didik hanya bisa melihat tabel/analisis dan memakai Chatbot AI.
