// Cloudflare Worker: akses galeri foto wajah & sinkronisasi whitelist NIP untuk user biasa, yang
// tidak punya sesi Supabase (hanya token beetri). Identitas pemanggil dibuktikan dengan token
// sesi buatan Worker ini sendiri (HS256, ditandatangani SESSION_SECRET), BUKAN dengan parameter
// NIP dari browser — jadi NIP orang lain tidak bisa diakses hanya dengan menebaknya.
//
// Kenapa Worker, bukan Supabase Edge Function: beetri tidak bisa dijangkau dari server Supabase
// (timeout), tapi bisa dari Cloudflare yang keluar lewat Jakarta untuk pemanggil di Indonesia.
//
// Alur:
//  - action "exchange": SEKALI per sesi, token beetri divalidasi ke beetri, NIP diambil dari klaim
//    `nip` token itu (sudah dijamin asli oleh beetri), lalu Worker menerbitkan token sesi.
//  - action "list" | "add" | "delete": token sesi diverifikasi LOKAL (tanpa memanggil beetri).
//    Admin (JWT Supabase + is_admin()) boleh mengakses NIP mana pun lewat parameter `nip`.
//
// Environment (Secrets di dashboard Cloudflare, atau `wrangler secret put`):
//   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET

const BEETRI_BASE_URL = 'https://beetri.bekasikota.go.id/api/v1';
const SESSION_MAX_TTL_S = 12 * 60 * 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const encoder = new TextEncoder();

function toBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function decodeJwtPayload(token) {
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(token.split('.')[1])));
  } catch {
    return null;
  }
}

function hmacKey(env, usage) {
  return crypto.subtle.importKey('raw', encoder.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

async function signSession(env, nip, exp) {
  const header = toBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = toBase64Url(encoder.encode(JSON.stringify({ nip, exp })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env, 'sign'), encoder.encode(`${header}.${payload}`));
  return `${header}.${payload}.${toBase64Url(new Uint8Array(sig))}`;
}

// Mengembalikan NIP kalau token sesi asli & belum kedaluwarsa, selain itu null.
async function verifySession(env, token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(env, 'verify'),
      fromBase64Url(parts[2]),
      encoder.encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.nip !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 <= Date.now()) return null;
    return payload.nip;
  } catch {
    return null;
  }
}

// Token beetri valid kalau beetri tidak menolaknya (401/403) pada endpoint yang butuh login.
async function isBeetriTokenValid(token) {
  const res = await fetch(`${BEETRI_BASE_URL}/attendance/today-schedule`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  return res.status !== 401 && res.status !== 403;
}

// Memanggil RPC Postgres lewat PostgREST. `auth` default service_role; isi Authorization
// pemanggil untuk menjalankan RPC atas nama user itu (dipakai memeriksa is_admin()).
async function rpc(env, name, args, auth = { key: env.SUPABASE_SERVICE_ROLE_KEY, bearer: env.SUPABASE_SERVICE_ROLE_KEY }) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: auth.key, Authorization: `Bearer ${auth.bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || `RPC ${name} gagal (${res.status})`);
  return data;
}

async function isNipAllowed(env, nip) {
  try {
    return (await rpc(env, 'is_nip_allowed', { p_nip: nip })) === true;
  } catch {
    return false;
  }
}

// Admin = pemegang JWT sesi Supabase yang sah DAN is_admin() bernilai true di database.
async function isCallerAdmin(env, authorization) {
  if (!authorization) return false;
  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: authorization },
  });
  if (!userRes.ok) return false;
  try {
    const bearer = authorization.replace(/^Bearer\s+/i, '');
    return (await rpc(env, 'is_admin', {}, { key: env.SUPABASE_PUBLISHABLE_KEY, bearer })) === true;
  } catch {
    return false;
  }
}

async function handle(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body bukan JSON valid' }, 400);
  }

  if (body.action === 'exchange') {
    const { beetriToken, nama, keterangan, password } = body;
    if (!beetriToken) return json({ error: 'beetriToken wajib diisi' }, 400);

    const payload = decodeJwtPayload(beetriToken);
    const nip = payload && typeof payload.nip === 'string' ? payload.nip : '';
    if (!nip) return json({ error: 'Token tidak memuat NIP' }, 401);

    let beetriValid;
    try {
      beetriValid = await isBeetriTokenValid(beetriToken);
    } catch (e) {
      return json({ error: `Gagal menghubungi beetri: ${e instanceof Error ? e.message : String(e)}` }, 502);
    }
    if (!beetriValid) return json({ error: 'Token beetri ditolak' }, 401);
    if (!(await isNipAllowed(env, nip))) return json({ error: 'NIP tidak diizinkan' }, 403);

    // nama/keterangan/password opsional (hanya dikirim saat login, tidak saat tukar ulang token).
    // Sudah base64 dari klien, di-decode oleh RPC (lihat sync_allowed_nip_after_login).
    if (nama || keterangan || password) {
      try {
        await rpc(env, 'sync_allowed_nip_after_login', {
          p_nip: nip,
          p_nama: nama || null,
          p_keterangan: keterangan || null,
          p_password: password || null,
        });
      } catch (e) {
        console.error('sync_allowed_nip_after_login gagal', e);
      }
    }

    const beetriExp = typeof payload.exp === 'number' ? payload.exp : Infinity;
    const exp = Math.min(beetriExp, Math.floor(Date.now() / 1000) + SESSION_MAX_TTL_S);
    return json({ session: await signSession(env, nip, exp), expiresAt: exp * 1000 });
  }

  if (body.action === 'list' || body.action === 'add' || body.action === 'delete') {
    let nip;

    if (body.session) {
      nip = await verifySession(env, body.session);
      if (!nip) return json({ error: 'Sesi tidak valid atau kedaluwarsa' }, 401);
      if (!(await isNipAllowed(env, nip))) return json({ error: 'NIP tidak diizinkan' }, 403);
    } else {
      // Jalur admin: JWT Supabase sesi admin yang sedang login, NIP target dari parameter.
      if (!(await isCallerAdmin(env, request.headers.get('Authorization')))) return json({ error: 'Forbidden' }, 403);
      if (!body.nip) return json({ error: 'nip wajib diisi' }, 400);
      nip = body.nip;
    }

    try {
      if (body.action === 'list') {
        return json({ photos: await rpc(env, 'list_face_gallery_photos', { p_nip: nip }) });
      }
      if (body.action === 'add') {
        const id = await rpc(env, 'add_face_gallery_photo', {
          p_nip: nip,
          p_type: body.type,
          p_photo_base64: body.photoBase64,
          p_content_type: body.contentType || 'image/jpeg',
        });
        return json({ id });
      }
      if (!body.id) return json({ error: 'id wajib diisi' }, 400);
      await rpc(env, 'delete_face_gallery_photo', { p_id: body.id, p_nip: nip });
      return json({ ok: true });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 400);
    }
  }

  return json({ error: 'action tidak dikenal' }, 400);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (!env.SESSION_SECRET || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_PUBLISHABLE_KEY) {
      return json({ error: 'Worker belum dikonfigurasi (secrets belum lengkap)' }, 500);
    }
    try {
      return await handle(request, env);
    } catch (e) {
      console.error('Unhandled error', e);
      return json({ error: 'Internal error' }, 500);
    }
  },
};
