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

// Pembuatan & penghapusan akun admin dilakukan Edge Function admin-users (butuh service_role
// key yang tidak boleh ada di browser). Function itu memverifikasi pemanggil adalah admin dari
// JWT sesi yang sedang login. Baris profiles dibuat trigger on_auth_user_created di schema.sql
// dalam transaksi yang sama dengan auth.users, jadi tidak ada insert profiles manual di sini.
async function invokeAdminUsers(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    // Untuk respons non-2xx, pesan asli ada di body response (error.context), bukan di error.message.
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message);
  }
  return data;
}

export async function createAdminAccount({ nip, nama, email, password }) {
  await invokeAdminUsers({ action: 'create', nip, nama: nama || null, email, password });
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

// Menghapus auth.users sekaligus (profiles ikut terhapus lewat cascade), jadi akun yang dihapus
// benar-benar tidak bisa login lagi.
export async function removeAdminProfile(id) {
  await invokeAdminUsers({ action: 'delete', id });
}

export async function isNipAllowed(nip) {
  const { data, error } = await supabase.rpc('is_nip_allowed', { p_nip: nip });
  if (error) throw error;
  return Boolean(data);
}

export async function fetchAllowedNips() {
  const { data, error } = await supabase
    .from('allowed_nip')
    .select('nip, nama, keterangan, password, expires_at, is_active, is_demo, photo_limit, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// isDemo/password hanya dikirim untuk akun demo: upsert hanya menimpa kolom yang disertakan,
// jadi memperpanjang akses NIP biasa tidak menyentuh password hasil sinkronisasi beetri.
export async function addAllowedNip({ nip, nama, keterangan, expiresAt, isActive = true, isDemo = false, password }) {
  const row = { nip, nama, keterangan, expires_at: expiresAt, is_active: isActive };
  if (isDemo) {
    row.is_demo = true;
    row.password = password;
  }
  const { error } = await supabase.from('allowed_nip').upsert(row, { onConflict: 'nip' });
  if (error) throw error;
}

// Mengembalikan { name } kalau NIP+password adalah akun demo yang sah, selain itu null
// (login lanjut ke jalur beetri biasa).
export async function demoLogin(nip, password) {
  const { data, error } = await supabase.rpc('demo_login', { p_nip: nip, p_password: password });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { name: row.demo_name } : null;
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
