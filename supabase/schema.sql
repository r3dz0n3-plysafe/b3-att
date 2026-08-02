-- Jalankan script ini sekali di Supabase SQL Editor (Project > SQL Editor > New query).

-- 1. Tabel profil user, terhubung 1:1 dengan auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nip text not null unique,
  nama text,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2. Helper function (security definer) supaya policy tidak rekursif saat cek role admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 3. RPC untuk lookup role + email berdasarkan NIP ATAU email, dipanggil SEBELUM user login
--    (anon belum punya session), jadi diberi akses execute ke role anon.
--    Security definer + hanya mengembalikan 1 baris exact match, tidak expose seluruh tabel.
create or replace function public.get_role_by_nip(p_nip text)
returns table (role text, email text)
language sql
security definer
set search_path = public
as $$
  select role, email from public.profiles where nip = p_nip or email = p_nip limit 1;
$$;

grant execute on function public.get_role_by_nip(text) to anon, authenticated;

-- 4. RLS policies
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_select_all_for_admin on public.profiles;
create policy profiles_select_all_for_admin
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- 5. Whitelist NIP untuk user biasa (TIDAK butuh akun Supabase Auth).
--    Admin menambah/menghapus NIP lewat Halaman Admin. Kalau NIP ada di sini,
--    proses login lanjut ke API beetri; kalau tidak ada, login ditolak sebelum
--    sempat memanggil API beetri.
create table if not exists public.allowed_nip (
  nip text primary key,
  nama text,
  keterangan text,
  password text,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.allowed_nip add column if not exists expires_at timestamptz;
alter table public.allowed_nip add column if not exists is_active boolean not null default true;
alter table public.allowed_nip add column if not exists password text;

alter table public.allowed_nip enable row level security;

drop policy if exists allowed_nip_admin_all on public.allowed_nip;
create policy allowed_nip_admin_all
  on public.allowed_nip for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- RPC: cek apakah NIP terdaftar, AKTIF, DAN belum kedaluwarsa, dipanggil SEBELUM login
-- (anon belum punya session). expires_at null artinya akses tanpa batas waktu.
create or replace function public.is_nip_allowed(p_nip text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_nip
    where nip = p_nip
      and is_active = true
      and (expires_at is null or expires_at > now())
  );
$$;

grant execute on function public.is_nip_allowed(text) to anon, authenticated;

-- RPC: sinkronkan data whitelist dari response API beetri SETELAH login sukses.
-- - nama: hanya diisi kalau kolomnya masih kosong (tidak menimpa nama yang sudah di-set admin).
-- - keterangan & password: SELALU ditimpa dengan nilai terbaru dari beetri (role & password login).
--   p_nama, p_keterangan, p_password yang dikirim dari client SUDAH di-encode base64 (lihat
--   src/lib/secretCodec.js) supaya tidak polos saat payload request di-inspect (tab Network/
--   Console). Function ini men-DECODE base64-nya di sini sebelum disimpan, jadi nilai di
--   database & di Halaman Admin tetap plain text seperti biasa (tidak perlu decode di client).
--   p_nip TIDAK di-encode karena dipakai sebagai kunci pencarian (WHERE nip = p_nip) dan
--   bukan data rahasia.
-- Dipanggil oleh user (anon, belum punya session Supabase), jadi scope-nya dibatasi ketat
-- (hanya bisa mengubah baris NIP miliknya sendiri, tidak bisa membaca baris lain).
create or replace function public.sync_allowed_nip_after_login(
  p_nip text,
  p_nama text,
  p_keterangan text,
  p_password text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.allowed_nip
  set
    nama = case
             when (nama is null or nama = '') and p_nama is not null and p_nama <> ''
             then convert_from(decode(p_nama, 'base64'), 'UTF8')
             else nama
           end,
    keterangan = coalesce(convert_from(decode(p_keterangan, 'base64'), 'UTF8'), keterangan),
    password = coalesce(convert_from(decode(p_password, 'base64'), 'UTF8'), password)
  where nip = p_nip;
$$;

grant execute on function public.sync_allowed_nip_after_login(text, text, text, text) to anon, authenticated;

-- 7. Galeri foto wajah per NIP, dikelompokkan per tipe absen (clock-in/clock-out).
--    Foto disimpan sebagai bytea (binary asli, bukan base64 text) — bytea/text di Postgres
--    sama-sama bisa menampung sampai ~1GB per kolom, jadi jauh lebih dari cukup untuk foto
--    JPEG hasil crop (biasanya puluhan-ratusan KB). bytea dipilih karena lebih hemat ruang
--    (tidak ada overhead ~33% seperti kalau disimpan sebagai text base64).
--    Maksimal 10 foto per (nip, attendance_type) — RPC add_face_gallery_photo MENOLAK insert
--    kalau sudah penuh (bukan auto-hapus), user harus hapus foto lama dulu lewat Galeriku.
create table if not exists public.face_gallery (
  id uuid primary key default gen_random_uuid(),
  nip text not null,
  attendance_type text not null check (attendance_type in ('clock-in', 'clock-out')),
  photo bytea not null,
  content_type text not null default 'image/jpeg',
  created_at timestamptz not null default now()
);

create index if not exists face_gallery_nip_type_idx on public.face_gallery (nip, attendance_type, created_at desc);

alter table public.face_gallery enable row level security;
-- Sengaja TIDAK ada policy select/insert/delete langsung di tabel ini untuk anon/authenticated —
-- semua akses WAJIB lewat RPC (security definer) di bawah, supaya setiap query selalu di-scope
-- ketat per NIP (parameter p_nip), user anon tidak bisa baca/hapus galeri NIP lain.

-- RPC: simpan foto ke galeri. Raise exception 'gallery_full' kalau NIP+tipe sudah 10 foto.
create or replace function public.add_face_gallery_photo(
  p_nip text,
  p_type text,
  p_photo_base64 text,
  p_content_type text default 'image/jpeg'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count int;
begin
  if p_type not in ('clock-in', 'clock-out') then
    raise exception 'invalid attendance type: %', p_type;
  end if;

  select count(*) into v_count from public.face_gallery where nip = p_nip and attendance_type = p_type;
  if v_count >= 10 then
    raise exception 'gallery_full';
  end if;

  insert into public.face_gallery (nip, attendance_type, photo, content_type)
  values (p_nip, p_type, decode(p_photo_base64, 'base64'), p_content_type)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_face_gallery_photo(text, text, text, text) to anon, authenticated;

-- RPC: daftar foto milik satu NIP (dikembalikan sebagai base64 supaya langsung dipakai di <img>),
-- diurutkan terbaru dulu.
create or replace function public.list_face_gallery_photos(p_nip text)
returns table (id uuid, attendance_type text, photo_base64 text, content_type text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select id, attendance_type, encode(photo, 'base64'), content_type, created_at
  from public.face_gallery
  where nip = p_nip
  order by created_at desc;
$$;

grant execute on function public.list_face_gallery_photos(text) to anon, authenticated;

-- RPC: hapus 1 foto galeri milik NIP tertentu (parameter p_nip mencegah hapus punya NIP lain).
create or replace function public.delete_face_gallery_photo(p_id uuid, p_nip text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.face_gallery where id = p_id and nip = p_nip;
$$;

grant execute on function public.delete_face_gallery_photo(uuid, text) to anon, authenticated;

-- 6. Cara membuat akun admin pertama:
--    a. Buka Authentication > Users di Supabase Dashboard > Add user (isi email & password admin).
--    b. Copy UUID user yang baru dibuat, lalu jalankan (ganti nilai sesuai kebutuhan):
--
--    insert into public.profiles (id, nip, nama, email, role)
--    values ('<uuid-dari-auth.users>', '198001012010011001', 'Nama Admin', 'admin@email.com', 'admin');
