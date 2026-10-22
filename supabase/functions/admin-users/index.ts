// Edge Function: pembuatan & penghapusan akun admin dengan service_role key (tidak boleh ada di
// browser). Pemanggil WAJIB sudah login sebagai admin — dicek lewat JWT-nya sendiri + is_admin().
// Deploy: supabase functions deploy admin-users
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY otomatis tersedia di runtime Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // Client atas nama pemanggil: RLS & auth.uid() berlaku, dipakai untuk memastikan dia admin.
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

  const { data: isAdmin, error: adminError } = await caller.rpc('is_admin');
  if (adminError || isAdmin !== true) return json({ error: 'Forbidden' }, 403);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  let payload: Record<string, string>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Body bukan JSON valid' }, 400);
  }

  if (payload.action === 'create') {
    const { nip, nama, email, password } = payload;
    if (!nip || !email || !password) return json({ error: 'nip, email, dan password wajib diisi' }, 400);

    // app_metadata.role = 'admin' adalah penanda yang dicek trigger handle_new_admin_user;
    // hanya service_role yang bisa mengisinya.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nip, nama: nama || null },
      app_metadata: { role: 'admin' },
    });
    if (error) return json({ error: error.message }, 400);
    return json({ id: data.user.id });
  }

  if (payload.action === 'delete') {
    const { id } = payload;
    if (!id) return json({ error: 'id wajib diisi' }, 400);
    if (id === userData.user.id) return json({ error: 'Tidak bisa menghapus akun sendiri' }, 400);

    // Hapus auth.users; baris profiles ikut terhapus lewat on delete cascade.
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: 'action tidak dikenal' }, 400);
});
