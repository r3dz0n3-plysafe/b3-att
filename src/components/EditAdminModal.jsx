import { useState } from 'react';

export default function EditAdminModal({ admin, onClose, onSave }) {
  const [nip, setNip] = useState(admin.nip || '');
  const [nama, setNama] = useState(admin.nama || '');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    setIsSaving(true);
    try {
      await onSave({ nip, nama: nama || null });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-slate-800 mb-4">Edit Admin</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">NIP</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
            />
          </div>

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
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Email</label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-100 text-slate-500"
              value={admin.email}
              readOnly
              disabled
            />
            <p className="text-[11px] text-slate-400 mt-1">Email & password tidak bisa diubah dari sini — kelola lewat Supabase Dashboard.</p>
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
