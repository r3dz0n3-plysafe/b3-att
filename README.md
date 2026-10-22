# B3 Toolkit (b3-att)

Aplikasi web untuk absensi dengan deteksi wajah. User login memakai akun beetri
(`beetri.bekasikota.go.id`), mengambil foto wajah dengan pengecekan kualitas/liveness, lalu
mengirim absen masuk/pulang. Admin mengelola siapa saja yang boleh memakai aplikasi lewat
whitelist NIP.

- **V2 (React + Vite)**: aplikasi utama di repo ini, memakai Supabase untuk auth admin dan data.
- **V1 (halaman statis lama)**: `public/v1/index.html`, masih bisa dibuka dari tautan "Coba Versi Lama (V1)" di halaman login.

Situs live (GitHub Pages): https://r3dz0n3-plysafe.github.io/b3-att/

## Fitur

**User (pegawai)**
- Login dengan NIP + password beetri + captcha. Sesi disimpan di perangkat (maks. sesuai masa berlaku token beetri).
- Deteksi wajah (MediaPipe) dengan validasi kualitas foto sebelum dikirim.
- Absen masuk/pulang dengan lokasi dari jadwal hari itu.
- Profil: unggah, hapus, dan verifikasi foto wajah.
- Galeri foto wajah per NIP dan per tipe absen, dengan batas jumlah foto per NIP.

**Admin**
- Login dengan NIP/email + password (Supabase Auth). Sesi admin sengaja tidak disimpan, jadi refresh = login ulang.
- Kelola whitelist NIP: tambah/ubah/hapus, aktif/nonaktif, tanggal kedaluwarsa, batas foto galeri.
- Lihat dan hapus galeri foto milik NIP tertentu.
- Buat **akun demo** (lihat bagian di bawah).
- Kelola akun admin: tambah, ubah, hapus, kirim email reset password, ganti password sendiri.

## Akun demo

Untuk memperkenalkan aplikasi tanpa memakai akun beetri asli, admin bisa membuat NIP demo:

1. Halaman Admin > Whitelist NIP User, isi NIP fiktif (mis. `DEMO001`) dan nama.
2. Centang **Akun demo (tanpa beetri)** dan isi password demo, lalu **+ Tambah NIP**.
   (Akun biasa bisa dijadikan demo lewat tombol Edit > Akun Demo.)
3. Bagikan NIP dan password itu. Login demo tidak memakai captcha dan **tidak menghubungi beetri**.

Di sesi demo, jadwal, upload/lihat/hapus/verifikasi foto, dan absen disimulasikan di browser
(`src/lib/demo.js` dan cabang `isDemoToken` di `src/lib/api.js`) dan tidak dikirim ke sistem absensi.
Banner "Mode Demo" tampil di atas halaman. Foto profil demo hanya disimpan di `sessionStorage` tab itu.
Akun demo tidak ikut disinkronkan dari beetri (`sync_allowed_nip_after_login` melewatinya).
Jangan memakai NIP pegawai sungguhan sebagai akun demo, dan anggap password demo bersifat publik.

## Arsitektur singkat

```
Browser (React SPA, GitHub Pages)
 ├─ API beetri ............ login user, jadwal, absen, foto wajah (dipanggil langsung dari browser)
 ├─ Supabase Auth ......... login admin
 ├─ Supabase Postgres ..... profiles, allowed_nip, face_gallery (akses lewat RLS + RPC)
 └─ Supabase Edge Function  `admin-users`: buat/hapus akun admin (butuh service_role)
```

Struktur folder penting:

```
src/App.jsx                 routing & sesi
src/components/             halaman (Login, FaceDetection, Attendance, Profile, Admin, ...)
src/lib/api.js              klien API beetri
src/lib/auth.js             auth admin, CRUD whitelist & akun admin
src/lib/gallery.js          galeri foto wajah (RPC Supabase)
src/lib/userSession.js      sesi user di localStorage
supabase/schema.sql         skema database, RLS, trigger, RPC (jalankan di SQL Editor)
supabase/functions/admin-users/  Edge Function pembuatan/penghapusan admin
public/v1/                  versi lama (statis)
.github/workflows/deploy-pages.yml  deploy otomatis ke GitHub Pages
```

## Menjalankan secara lokal

Prasyarat: Node.js 20+ dan project Supabase.

```bash
npm install
cp .env.example .env     # lalu isi nilainya
npm run dev              # http://localhost:5173/
```

Variabel `.env`:

| Variabel | Isi |
|---|---|
| `VITE_SUPABASE_URL` | URL project Supabase (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key. Aman ada di klien |

Jangan pernah menaruh `service_role` key atau access token Supabase dengan awalan `VITE_`
(akan ikut ke bundle publik). `.env` sudah di-gitignore.

Perintah lain: `npm run build` (build produksi ke `dist/`), `npm run preview`, `npm run lint`.

## Setup Supabase (sekali)

1. **Skema database.** Buka SQL Editor di dashboard Supabase, tempel isi `supabase/schema.sql`, lalu Run.
   File ini idempotent, aman dijalankan ulang setelah ada perubahan.
2. **Edge Function `admin-users`.** Dibutuhkan untuk menambah/menghapus admin dari Halaman Admin:
   ```bash
   npx supabase functions deploy admin-users --project-ref <ref>
   ```
   (Perlu `supabase login` atau env `SUPABASE_ACCESS_TOKEN` untuk CLI.)
3. **Matikan signup publik.** Authentication > Providers > Email > nonaktifkan "Allow new users to sign up".
   Akun admin hanya dibuat lewat Edge Function di atas.
4. **Admin pertama.** Ikuti bagian terakhir `schema.sql`: buat user di Authentication > Users, lalu
   `insert` baris `profiles` dengan `role = 'admin'`.
5. **Reset password lewat email.** Tambahkan URL situs (mis. `https://r3dz0n3-plysafe.github.io/b3-att/reset-password`)
   ke Authentication > URL Configuration > Redirect URLs.

## Deploy (GitHub Pages)

Push ke branch `v2_react` memicu workflow `deploy-pages.yml`: build dengan base path `/b3-att/`,
salin `index.html` jadi `404.html` (supaya route SPA tidak 404 saat di-refresh), lalu publish.

Secret yang dibutuhkan di GitHub (Settings > Secrets and variables > Actions):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Catatan keamanan

- Pembuatan akun admin dibatasi: trigger database hanya membuat profil admin untuk user yang
  `app_metadata.role = 'admin'`, yang hanya bisa diisi lewat service_role (Edge Function).
- **Batasan yang diketahui:** user biasa tidak punya sesi Supabase (hanya token beetri), sehingga RPC galeri
  foto dan sinkronisasi whitelist (`add/list/delete_face_gallery_photo`, `sync_allowed_nip_after_login`)
  dibatasi hanya oleh parameter NIP. Orang yang tahu NIP orang lain bisa membaca/menghapus galeri
  atau menimpa data whitelist-nya. Menutupnya butuh validasi token beetri di server, tetapi beetri hanya
  bisa dijangkau dari IP Indonesia (Supabase dan Cloudflare kadang diarahkan lewat Singapura sehingga
  timeout). Percobaan lewat Cloudflare Worker ada di riwayat git (commit `9c4522a`, di-revert di `e1a7e07`).
- Password beetri user disimpan apa adanya di `allowed_nip.password` (hanya admin yang bisa membaca lewat RLS).

## Pemecahan masalah

| Gejala | Kemungkinan penyebab |
|---|---|
| Tambah/hapus admin gagal | Edge Function `admin-users` belum di-deploy, atau pemanggil bukan admin |
| Admin baru berhasil dibuat tapi tidak muncul di daftar | Trigger `on_auth_user_created` belum versi terbaru (harus `after insert or update of raw_app_meta_data`), jalankan ulang `schema.sql` |
| Halaman 404 saat refresh di produksi | `404.html` tidak ikut ter-build, pastikan memakai `npm run build` (bukan `vite build` saja) |
| Link reset password salah alamat | Redirect URL belum didaftarkan di Supabase (lihat langkah 5) |

`README_vite.md` adalah catatan bawaan template Vite dan tidak dipakai lagi.
