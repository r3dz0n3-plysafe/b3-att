import { useState } from 'react';
import Swal from 'sweetalert2';
import { updateOwnPassword } from '../lib/auth.js';

export default function ChangeOwnPasswordModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      await updateOwnPassword(password);
      Swal.fire({ icon: 'success', title: 'Password Diperbarui', timer: 1500, showConfirmButton: false });
      onClose();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Mengubah Password', text: e.message || e.toString() });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-slate-800 mb-4">🔑 Ganti Password</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password Baru</label>
            <input
              type="password"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Konfirmasi Password</label>
            <input
              type="password"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all disabled:opacity-60"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button
            type="button"
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-2.5 rounded-xl transition-all"
            onClick={onClose}
            disabled={isSaving}
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
