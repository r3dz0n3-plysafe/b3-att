const STORAGE_KEY = "b3_user_session";
// Dipakai kalau token bukan JWT / tidak ada klaim exp, supaya sesi tetap ada batas waktunya.
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam

// Bearer token dari beetri biasanya JWT (header.payload.signature). Kalau bisa di-decode
// dan ada klaim `exp` (detik epoch), pakai itu sebagai waktu kedaluwarsa asli dari server.
function decodeJwtExpMs(token) {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function saveUserSession({ token, nip, name }) {
  const expiresAt = decodeJwtExpMs(token) || Date.now() + DEFAULT_TTL_MS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, nip, name: name || '', expiresAt }));
}

export function loadUserSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data.token || !data.nip || !data.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() >= data.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearUserSession() {
  localStorage.removeItem(STORAGE_KEY);
}
