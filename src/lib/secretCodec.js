// Encoding base64 (bukan enkripsi) supaya nilai sensitif (nama, keterangan, password)
// tidak tampil polos saat payload dikirim ke sync_allowed_nip_after_login (tab Network/Console).
// Didekode kembali di sisi database (lihat supabase/schema.sql) sebelum disimpan sebagai teks
// biasa, jadi client tidak perlu decode saat membaca data kembali.
export function encodeSecret(value) {
  if (!value) return value;
  return btoa(unescape(encodeURIComponent(value)));
}
