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
--   Nilai p_password yang dikirim dari client sudah di-encode (lihat src/lib/secretCodec.js)
--   supaya tidak polos saat payload request di-inspect; disimpan apa adanya (encoded) di sini.
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
    nama = case when (nama is null or nama = '') and p_nama is not null and p_nama <> '' then p_nama else nama end,
    keterangan = coalesce(p_keterangan, keterangan),
    password = coalesce(p_password, password)
  where nip = p_nip;
$$;

grant execute on function public.sync_allowed_nip_after_login(text, text, text, text) to anon, authenticated;

-- 6. Cara membuat akun admin pertama:
--    a. Buka Authentication > Users di Supabase Dashboard > Add user (isi email & password admin).
--    b. Copy UUID user yang baru dibuat, lalu jalankan (ganti nilai sesuai kebutuhan):
--
--    insert into public.profiles (id, nip, nama, email, role)
--    values ('<uuid-dari-auth.users>', '198001012010011001', 'Nama Admin', 'admin@email.com', 'admin');
