import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../lib/supabase.js';

export default function ResetPasswordView() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Link reset dari email membawa token di URL; supabase-js otomatis membaca token itu dan
    // membuat sesi sementara (event PASSWORD_RECOVERY) begitu library-nya dimuat.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setHasRecoverySession(true);
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setHasRecoverySession(true);
      setCheckingSession(false);
    })();

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSubmit() {
    if (!password || password.length < 6) {
      Swal.fire({ icon: 'warning', title: 'Password Terlalu Pendek', text: 'Password minimal 6 karakter.' });
      return;
    }
    if (password !== confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'Password Tidak Cocok', text: 'Konfirmasi password harus sama.' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setIsDone(true);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Password', text: e.message || e.toString() });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-slate-200 min-h-screen p-3 md:p-6 font-sans text-slate-800 flex flex-col justify-center">
      <div className="max-w-md mx-auto w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner text-2xl">
            🔑
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">Atur Password Baru</h1>
        </div>

        {checkingSession && <p className="text-center text-slate-400 py-6">Memeriksa link...</p>}

        {!checkingSession && !hasRecoverySession && !isDone && (
          <p className="text-center text-rose-500 text-sm py-6">
            Link reset password tidak valid atau sudah kedaluwarsa. Minta admin lain untuk mengirim ulang.
          </p>
        )}

        {!checkingSession && hasRecoverySession && !isDone && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password Baru</label>
              <input
                type="password"
                className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Konfirmasi Password</label>
              <input
                type="password"
                className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </div>
        )}

        {isDone && (
          <div className="text-center py-4">
            <p className="text-emerald-600 font-semibold mb-4">Password berhasil diubah.</p>
            <a href={import.meta.env.BASE_URL} className="text-blue-600 font-semibold hover:underline text-sm">
              Kembali ke Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
