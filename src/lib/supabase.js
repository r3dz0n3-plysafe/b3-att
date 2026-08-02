import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.error(
    'Konfigurasi Supabase belum lengkap. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY pada file .env (lihat .env.example).'
  );
}

// persistSession: false -> sesi admin (Supabase Auth) sengaja TIDAK disimpan di local storage,
// jadi setiap refresh/buka tab baru admin wajib login ulang (beda dengan sesi user biasa yang
// memang sengaja disimpan, lihat src/lib/userSession.js).
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: false },
});
