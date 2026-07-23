import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { fetchCaptcha, login } from '../lib/api.js';
import { fetchOwnProfile, getRoleByNip, isNipAllowed, signInAdmin, syncAllowedNipAfterLogin } from '../lib/auth.js';

export default function LoginView({ onAdminLoginSuccess, onUserLoginSuccess }) {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [loginRes, setLoginRes] = useState('-');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadCaptcha() {
    setCaptchaLoading(true);
    try {
      const { captchaId: id, imageB64 } = await fetchCaptcha();
      setCaptchaId(id);
      setCaptchaImage(imageB64);
    } catch (e) {
      console.error('Gagal load captcha', e);
    } finally {
      setCaptchaLoading(false);
    }
  }

  useEffect(() => {
    loadCaptcha();
  }, []);

  async function handleLogin() {
    if (!nip || !password) {
      Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Isi NIP dan Password terlebih dahulu!' });
      return;
    }

    setIsSubmitting(true);
    try {
      let roleInfo = null;
      try {
        roleInfo = await getRoleByNip(nip);
      } catch (e) {
        console.error('Gagal cek role di Supabase, lanjut sebagai user biasa', e);
      }

      if (roleInfo?.role === 'admin') {
        try {
          await signInAdmin(roleInfo.email, password);
        } catch (e) {
          Swal.fire({ icon: 'error', title: 'Login Admin Gagal', text: 'Password admin salah atau akun belum aktif.' });
          return;
        }

        const profile = await fetchOwnProfile();
        Swal.fire({
          icon: 'success',
          title: 'Login Admin Berhasil!',
          text: 'Selamat datang di Halaman Admin',
          timer: 1500,
          showConfirmButton: false,
        });
        onAdminLoginSuccess(profile);
        return;
      }

      let allowed = false;
      try {
        allowed = await isNipAllowed(nip);
      } catch (e) {
        console.error('Gagal cek whitelist NIP', e);
      }

      if (!allowed) {
        Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'NIP Anda belum terdaftar. Hubungi admin untuk mendapatkan akses.' });
        return;
      }

      if (!captchaAnswer) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Isi Captcha terlebih dahulu!' });
        return;
      }

      const { rawText, token, userName, userRole } = await login({ nip, password, captchaId, captchaAnswer });
      setLoginRes(rawText);

      if (token) {
        try {
          await syncAllowedNipAfterLogin(nip, { nama: userName, keterangan: userRole, password });
        } catch (e) {
          console.error('Gagal sinkronisasi data whitelist otomatis', e);
        }

        Swal.fire({
          icon: 'success',
          title: 'Login Berhasil!',
          text: 'Selamat datang di Aplikasi B3 Toolkit',
          timer: 1500,
          showConfirmButton: false,
        });
        onUserLoginSuccess(token, nip);
      } else {
        Swal.fire({ icon: 'error', title: 'Login Gagal', text: 'Periksa NIP, Password, atau Captcha Anda!' });
        loadCaptcha();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error API', text: err.toString() });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div id="view-login" className="max-w-md mx-auto my-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-6 md:p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800">Login Sistem B3</h1>
        <p className="text-xs text-slate-500 mt-1">Silakan login untuk mengakses fitur Deteksi & Absensi</p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">NIP</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Masukkan NIP Anda"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors text-base"
              onClick={() => setShowPassword((v) => !v)}
            >
              👁️
            </button>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
          <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Verifikasi Captcha</label>
          <div className="bg-white border border-slate-200 p-2 rounded-xl mb-2 flex flex-col items-center justify-center min-h-[70px] relative shadow-inner">
            <img
              className={`max-w-full h-12 object-contain rounded transition-opacity ${captchaLoading ? 'opacity-50' : ''}`}
              alt="Loading Captcha..."
              src={captchaImage}
            />
            <button type="button" className="text-xs text-blue-600 font-semibold mt-1 hover:underline flex items-center gap-1" onClick={loadCaptcha}>
              🔄 Muat Ulang Captcha
            </button>
          </div>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ketik Kode Captcha"
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
          />
          <p className="text-[11px] text-slate-400 mt-1.5">Captcha hanya diperlukan untuk login user (bukan admin).</p>
        </div>

        <button
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 text-sm disabled:opacity-60"
          onClick={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? '🔄 Memproses Login...' : '🔑 Masuk ke Aplikasi'}
        </button>
      </form>

      <div className="mt-4">
        <details className="group bg-slate-50 border border-slate-200 rounded-xl p-2.5">
          <summary className="text-xs font-semibold text-slate-500 cursor-pointer list-none flex justify-between items-center">
            <span>Lihat Response API Login</span>
            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <pre className="mt-2 text-[11px] bg-slate-900 text-green-400 p-2 rounded-lg overflow-x-auto">{loginRes}</pre>
        </details>
      </div>

      <div className="mt-3 text-center">
        <a href="/v1/index.html" className="text-xs font-semibold text-slate-400 hover:text-blue-600 hover:underline transition-colors">
          Coba Versi Lama (V1)
        </a>
      </div>
    </div>
  );
}
