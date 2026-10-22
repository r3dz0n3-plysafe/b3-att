// Akun demo (allowed_nip.is_demo): login tanpa beetri, semua panggilan beetri disimulasikan di
// klien (lihat src/lib/api.js). Token ini hanya penanda di localStorage, BUKAN kredensial apa pun.
export const DEMO_TOKEN = 'demo-session';

export function isDemoToken(token) {
  return token === DEMO_TOKEN;
}

// Lokasi jadwal simulasi (Kota Bekasi).
export const DEMO_SCHEDULE_LOCATION = { lat: -6.2383, lon: 106.9756 };

const DEMO_FACE_KEY = 'b3_demo_face';

export function loadDemoFacePhoto() {
  try {
    return sessionStorage.getItem(DEMO_FACE_KEY) || null;
  } catch {
    return null;
  }
}

export function clearDemoFacePhoto() {
  try {
    sessionStorage.removeItem(DEMO_FACE_KEY);
  } catch {
    // sessionStorage bisa tidak tersedia (mode privat); foto demo cukup tidak tersimpan.
  }
}

export function saveDemoFacePhoto(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        sessionStorage.setItem(DEMO_FACE_KEY, String(reader.result));
      } catch {
        // Kuota penuh / tidak tersedia: lewati, foto profil demo tidak tampil.
      }
      resolve();
    };
    reader.onerror = () => resolve();
    reader.readAsDataURL(blob);
  });
}

export function demoResponse(message, data = {}) {
  return { ok: true, rawText: JSON.stringify({ success: true, message: `[DEMO] ${message}`, data: { demo: true, ...data } }) };
}
