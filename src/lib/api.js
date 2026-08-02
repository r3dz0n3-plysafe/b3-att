const BASE_URL = "https://beetri.bekasikota.go.id/api/v1";

export async function fetchCaptcha() {
  const res = await fetch(`${BASE_URL}/auth/captcha`, {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  const json = JSON.parse(text);
  return { captchaId: json.captcha_id, imageB64: json.image_b64 };
}

export async function login({ nip, password, captchaId, captchaAnswer }) {
  const payload = {
    nip,
    password,
    remember_me: true,
    captcha_id: captchaId,
    captcha_answer: captchaAnswer,
  };
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let token = "";
  let userName = "";
  let userRole = "";
  try {
    const json = JSON.parse(text);
    token = json.access_token || json.token || json.data?.access_token || json.data?.token || "";
    userName = json.user?.name || json.data?.user?.name || "";
    userRole = json.user?.role || json.data?.user?.role || "";
  } catch (e) {
    // Bukan JSON valid
  }
  return { ok: res.ok, rawText: text, token, userName, userRole };
}

export async function fetchTodayScheduleLocation(token) {
  const res = await fetch(`${BASE_URL}/attendance/today-schedule`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  const json = JSON.parse(text);
  const loc = json?.location || json?.data?.location;
  const lat = parseFloat(loc?.latitude);
  const lon = parseFloat(loc?.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon };
}

export async function uploadFacePhoto(token, blob) {
  const fd = new FormData();
  fd.append("photo", blob, "absensi_liveness.jpg");
  const res = await fetch(`${BASE_URL}/employee/upload-face`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const text = await res.text();
  return { ok: res.ok, rawText: text };
}

// Bentuk response endpoint ini belum pernah kita lihat contoh aslinya, jadi ditangani
// secara defensif: kalau content-type JSON, coba beberapa nama field foto yang umum
// (url absolut/data URL/base64 polos); kalau bukan JSON, anggap body-nya langsung binary image.
export async function fetchMyFacePhoto(token) {
  const res = await fetch(`${BASE_URL}/employee/my-face`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    const raw =
      json?.data?.photo_url ||
      json?.data?.photo ||
      json?.data?.face_photo ||
      json?.photo_url ||
      json?.photo ||
      '';
    if (!raw) return null;
    return raw.startsWith('data:') || raw.startsWith('http') ? raw : `data:image/jpeg;base64,${raw}`;
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// Diambil dari aksi `deleteFace` di panel admin lama (src/lib/employee.js), dipakai di sini
// untuk hapus foto wajah milik sendiri (nip = milik user yang login).
export async function deleteMyFacePhoto(token, nip) {
  const res = await fetch(`${BASE_URL}/employee/face/${nip}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  return { ok: res.ok, rawText: text };
}

// Diambil dari aksi `verifyFace` di panel admin lama, dipakai di sini untuk menandai foto
// milik sendiri sebagai terverifikasi (status: 'approved').
export async function verifyMyFace(token, nip) {
  const res = await fetch(`${BASE_URL}/employee/verify-face`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nip, status: "approved" }),
  });
  const text = await res.text();
  return { ok: res.ok, rawText: text };
}

export async function submitAttendance({ token, type, blob, lat, lon, userAgent }) {
  const fd = new FormData();
  fd.append("photo", blob, "absensi_liveness.jpg");
  fd.append("lat", lat);
  fd.append("lon", lon);
  fd.append("device_id", userAgent);
  fd.append("is_fake_gps", "false");

  const res = await fetch(`${BASE_URL}/attendance/${type}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const text = await res.text();
  return { ok: res.ok, rawText: text };
}