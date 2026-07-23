import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { submitAttendance } from '../lib/api.js';
import { DEVICE_OPTIONS, DEVICE_USER_AGENTS } from '../lib/deviceUserAgents.js';
import { buildApiResponseHtml } from '../lib/apiResponseHtml.js';

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

const MAX_RANDOM_RADIUS_M = 100;

export default function AttendanceView({ authToken, faceCapture, scheduleLocation, onNeedFace }) {
  const [type, setType] = useState('clock-in');
  const [device, setDevice] = useState('ios18');
  const [lat, setLat] = useState('-6.314554');
  const [lon, setLon] = useState('106.986443');
  const [mapSrc, setMapSrc] = useState('');
  const [attRes, setAttRes] = useState('-');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultLatRef = useRef(-6.314567);
  const defaultLonRef = useRef(106.986529);

  function updateMapPreview(latValue, lonValue) {
    const la = parseFloat(latValue);
    const lo = parseFloat(lonValue);
    if (Number.isNaN(la) || Number.isNaN(lo)) return;
    const d = 0.003; // small bbox delta agar zoom preview tidak terlalu jauh
    const bbox = `${lo - d}%2C${la - d}%2C${lo + d}%2C${la + d}`;
    setMapSrc(`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${la}%2C${lo}`);
  }

  // Render peta awal sekali saat komponen mount (meniru updateMapPreview() di akhir script asli)
  useEffect(() => {
    updateMapPreview(lat, lon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ambil lokasi default dari jadwal hari ini setelah login berhasil.
  // Jika API gagal / kosong, default tidak berubah (lihat App.jsx).
  useEffect(() => {
    if (!scheduleLocation) return;
    defaultLatRef.current = scheduleLocation.lat;
    defaultLonRef.current = scheduleLocation.lon;
    setLat(String(scheduleLocation.lat));
    setLon(String(scheduleLocation.lon));
    updateMapPreview(scheduleLocation.lat, scheduleLocation.lon);
  }, [scheduleLocation]);

  function handleViewLocation() {
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank');
  }

  function handleResetLocation() {
    const la = defaultLatRef.current;
    const lo = defaultLonRef.current;
    setLat(String(la));
    setLon(String(lo));
    updateMapPreview(la, lo);
  }

  function handleRandomLocation() {
    // sqrt(random) -> distribusi merata di seluruh area lingkaran, Math.min menjamin jarak tidak pernah melebihi radius maksimum
    const R = Math.min(MAX_RANDOM_RADIUS_M * Math.sqrt(Math.random()), MAX_RANDOM_RADIUS_M);
    const t = Math.random() * 2 * Math.PI;
    const dx = R * Math.cos(t), dy = R * Math.sin(t);
    const la = defaultLatRef.current + dy / 111320;
    const lo = defaultLonRef.current + dx / (111320 * Math.cos((defaultLatRef.current * Math.PI) / 180));
    const laStr = la.toFixed(6);
    const loStr = lo.toFixed(6);
    setLat(laStr);
    setLon(loStr);
    updateMapPreview(laStr, loStr);
  }

  async function handleSubmit() {
    if (!authToken) {
      Swal.fire({ icon: 'warning', title: 'Sesi Tidak Valid', text: 'Silakan login kembali.' });
      return;
    }
    if (!faceCapture) {
      Swal.fire({
        icon: 'warning',
        title: 'Wajah Belum Terdeteksi',
        text: 'Silakan ambil foto wajah terlebih dahulu melalui Tab 1 (Deteksi Wajah).',
        confirmButtonText: 'Ke Deteksi Wajah',
      }).then((res) => {
        if (res.isConfirmed) onNeedFace();
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { ok, rawText } = await submitAttendance({
        token: authToken,
        type,
        blob: faceCapture.blob,
        lat,
        lon,
        userAgent: DEVICE_USER_AGENTS[device],
      });
      setAttRes(rawText);
      Swal.fire({
        icon: ok ? 'success' : 'error',
        title: ok ? 'Absensi Berhasil Dikirim' : 'Absensi Gagal Dikirim',
        html: buildApiResponseHtml(rawText),
        width: 640,
        confirmButtonText: 'Tutup',
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error Submit', text: err.toString() });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div id="view-b3" className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-200">
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">📸 Submit Attendance (Absensi)</h3>
          <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">Sesi Aktif</span>
        </div>
        <div className="p-6">
          {/* Wajah Payload Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 flex items-center gap-4">
            <img
              src={faceCapture ? faceCapture.base64 : PLACEHOLDER_IMG}
              className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm bg-slate-200"
              alt="Wajah"
            />
            <div>
              <p className="text-sm font-bold text-slate-700">Foto Wajah (Payload Base)</p>
              <p className={`text-sm font-semibold ${faceCapture ? 'text-green-600' : 'text-red-500'}`}>
                {faceCapture ? '✅ Wajah tersimpan dan siap dikirim' : '❌ Belum ada wajah tersimpan'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Selesaikan "Deteksi Wajah" di Tab 1 untuk mengisi payload ini.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tipe Absen</label>
              <select
                className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="clock-in">Hadir (Clock-In)</option>
                <option value="clock-out">Pulang (Clock-Out)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Device ID Emulator</label>
              <select
                className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
              >
                {DEVICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-5">
            <label className="block text-sm font-bold text-slate-700 mb-2">Koordinat Lokasi</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-500">Latitude</label>
                <input
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  onBlur={() => updateMapPreview(lat, lon)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Longitude</label>
                <input
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  onBlur={() => updateMapPreview(lat, lon)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors" onClick={handleViewLocation}>
                🗺️ View Map
              </button>
              <button type="button" className="bg-orange-400 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors" onClick={handleRandomLocation}>
                🎲 Acak ±100m
              </button>
              <button type="button" className="bg-slate-400 hover:bg-slate-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors" onClick={handleResetLocation}>
                🔄 Reset Lokasi
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-300 shadow-inner" style={{ height: '150px' }}>
              <iframe
                className="w-full h-full"
                style={{ border: 0, pointerEvents: 'none' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={mapSrc}
                title="Map Preview"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Bearer Token Aktif</label>
            <textarea
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono bg-slate-100 text-slate-600 focus:outline-none"
              rows={2}
              readOnly
              value={authToken}
            />
          </div>

          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-lg disabled:opacity-60"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '🔄 Mengirim Data Absensi...' : '🚀 Submit Attendance'}
          </button>

          <div className="mt-4">
            <details className="group bg-slate-50 border border-slate-200 rounded-xl p-3">
              <summary className="text-sm font-bold text-slate-600 cursor-pointer list-none flex justify-between items-center">
                <span>Lihat Response API Submit</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <pre className="mt-3 text-xs bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto">{attRes}</pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}