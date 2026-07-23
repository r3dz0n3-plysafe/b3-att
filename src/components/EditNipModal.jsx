import { useState } from 'react';
import { DURATION_OPTIONS, computeExpiresAt } from '../lib/nipUtils.js';

export default function EditNipModal({ nip: n, onClose, onSave }) {
  const [nama, setNama] = useState(n.nama || '');
  const [keterangan, setKeterangan] = useState(n.keterangan || '');
  const [password, setPassword] = useState(n.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [duration, setDuration] = useState('keep');
  const [isActive, setIsActive] = useState(n.is_active);
  const [isSaving, setIsSaving] = useState(false);

  const currentLabel = n.expires_at ? new Date(n.expires_at).toLocaleDateString('id-ID') : 'Tanpa Batas';

  async function handleSubmit() {
    let expiresAt = n.expires_at;
    if (duration === 'unlimited') expiresAt = null;
    else if (duration !== 'keep') expiresAt = computeExpiresAt(Number(duration));

    setIsSaving(true);
    try {
      await onSave({
        nama: nama || null,
        keterangan: keterangan || null,
        password: password || null,
        is_active: isActive,
        expires_at: expiresAt,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-slate-800 mb-4">Edit NIP {n.nip}</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Nama</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Keterangan</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full border border-slate-300 rounded-xl p-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors text-sm"
                onClick={() => setShowPassword((v) => !v)}
              >
                👁️
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Masa Aktif</label>
            <select
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="keep">Tidak Diubah (saat ini: {currentLabel})</option>
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.days ?? 'unlimited'}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-semibold text-slate-700">Status Aktif</span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
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
