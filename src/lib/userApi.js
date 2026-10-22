import { supabase } from './supabase.js';
import { encodeSecret } from './secretCodec.js';
import { loadUserSession, saveUserSessionToken } from './userSession.js';

// Cloudflare Worker (worker/user-api.js), BUKAN Supabase Edge Function: beetri tidak bisa
// dijangkau dari server Supabase, tapi bisa dari Cloudflare.
const USER_API_URL = import.meta.env.VITE_USER_API_URL;

async function postToWorker(body, authorization) {
  if (!USER_API_URL) throw new Error('VITE_USER_API_URL belum diisi (lihat .env.example).');
  const res = await fetch(USER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Permintaan gagal (${res.status})`);
  return data;
}

// Tukar token beetri dengan token sesi buatan Worker (divalidasi ke beetri SEKALI; setelah itu
// aksi galeri cukup memakai token sesi, diverifikasi lokal di server). nama/keterangan/password
// opsional: kalau dikirim (saat login), whitelist NIP ikut disinkronkan di server. Di-encode
// base64 supaya tidak polos di tab Network (lihat src/lib/secretCodec.js); NIP sengaja tidak
// dikirim — server mengambilnya dari klaim token beetri.
export async function exchangeUserSession(beetriToken, { nama, keterangan, password } = {}) {
  const data = await postToWorker({
    action: 'exchange',
    beetriToken,
    nama: encodeSecret(nama) || null,
    keterangan: encodeSecret(keterangan) || null,
    password: encodeSecret(password) || null,
  });
  return { sessionToken: data.session, expiresAt: data.expiresAt };
}

async function getUserSessionToken() {
  const stored = loadUserSession();
  if (!stored) throw new Error('Sesi login tidak ditemukan, silakan login ulang.');
  if (stored.sessionToken && stored.sessionExpiresAt - Date.now() > 60 * 1000) return stored.sessionToken;

  const { sessionToken, expiresAt } = await exchangeUserSession(stored.token);
  saveUserSessionToken(sessionToken, expiresAt);
  return sessionToken;
}

// Admin (sesi Supabase aktif) mengirim access token-nya dan boleh menarget NIP mana pun lewat
// parameter `nip`. User biasa memakai token sesinya; `nip` dari parameter diabaikan server.
export async function callUserApi(action, params) {
  const { data } = await supabase.auth.getSession();
  if (data.session) return postToWorker({ action, ...params }, `Bearer ${data.session.access_token}`);
  return postToWorker({ action, session: await getUserSessionToken(), ...params });
}
