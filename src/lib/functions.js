import { supabase } from './supabase.js';

export async function invokeFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Untuk respons non-2xx, pesan asli ada di body response (error.context), bukan di error.message.
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message);
  }
  return data;
}
