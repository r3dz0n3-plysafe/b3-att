import { supabase } from './supabase.js';

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

export async function isNipAllowed(nip) {
  const { data, error } = await supabase.rpc('is_nip_allowed', { p_nip: nip });
  if (error) throw error;
  return Boolean(data);
}

export async function fetchAllowedNips() {
  const { data, error } = await supabase
    .from('allowed_nip')
    .select('nip, nama, keterangan, password, expires_at, is_active, created_at')
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
    p_nama: nama || null,
    p_keterangan: keterangan || null,
    p_password: password || null,
  });
  if (error) throw error;
}
