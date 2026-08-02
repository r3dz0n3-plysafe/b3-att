import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase.js';
import { encodeSecret } from './secretCodec.js';

export async function getRoleByNip(nip) {
  const { data, error } = await supabase.rpc('get_role_by_nip', { p_nip: nip });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}

export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function fetchOwnProfile() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nip, nama, email, role, created_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nip, nama, email, role, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

// Ganti password admin yang SEDANG login sendiri. Karena dipanggil pada sesi yang sudah
// terautentikasi, Supabase tidak butuh password lama untuk ini.
export async function updateOwnPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// Membuat akun admin baru (auth.users + baris profiles). Sengaja pakai instance Supabase
// client TERPISAH (persistSession: false, storage sendiri) khusus untuk signUp ini — supaya
// sesi admin yang sedang login di client utama (`supabase`) tidak ikut tertukar/ter-replace
// oleh sesi user baru yang otomatis dibuat signUp().
// nip & nama dikirim lewat options.data (raw_user_meta_data) supaya trigger
// on_auth_user_created di schema.sql bisa langsung insert baris profiles DALAM transaksi yang
// sama dengan insert auth.users — tidak perlu (dan tidak boleh) insert profiles manual di sini,
// karena itu yang sebelumnya menyebabkan race condition foreign key.
export async function createAdminAccount({ nip, nama, email, password }) {
  const tempClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await tempClient.auth.signUp({
    email,
    password,
    options: { data: { nip, nama: nama || null } },
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error('Gagal membuat akun: user id tidak ditemukan pada response signUp.');
}

// Tidak ada Supabase Admin API di client (butuh service_role key, tidak boleh dipakai di
// browser), jadi "reset password" untuk admin LAIN cuma bisa lewat email reset resmi Supabase
// (link di email membawa user itu sendiri ke /reset-password untuk atur password baru).
export async function resetAdminPassword(email) {
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updateAdminProfile(id, updates) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', id);
  if (error) throw error;
}

export async function removeAdminProfile(id) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

export async function isNipAllowed(nip) {
  const { data, error } = await supabase.rpc('is_nip_allowed', { p_nip: nip });
  if (error) throw error;
  return Boolean(data);
}

export async function fetchAllowedNips() {
  const { data, error } = await supabase
    .from('allowed_nip')
    .select('nip, nama, keterangan, password, expires_at, is_active, photo_limit, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addAllowedNip({ nip, nama, keterangan, expiresAt, isActive = true }) {
  const { error } = await supabase
    .from('allowed_nip')
    .upsert({ nip, nama, keterangan, expires_at: expiresAt, is_active: isActive }, { onConflict: 'nip' });
  if (error) throw error;
}

export async function updateAllowedNip(nip, updates) {
  const { error } = await supabase.from('allowed_nip').update(updates).eq('nip', nip);
  if (error) throw error;
}

export async function removeAllowedNip(nip) {
  const { error } = await supabase.from('allowed_nip').delete().eq('nip', nip);
  if (error) throw error;
}

export async function syncAllowedNipAfterLogin(nip, { nama, keterangan, password }) {
  const { error } = await supabase.rpc('sync_allowed_nip_after_login', {
    p_nip: nip,
    p_nama: encodeSecret(nama) || null,
    p_keterangan: encodeSecret(keterangan) || null,
    p_password: encodeSecret(password) || null,
  });
  if (error) throw error;
}
