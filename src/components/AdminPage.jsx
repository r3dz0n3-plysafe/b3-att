import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { addAllowedNip, fetchAllProfiles, fetchAllowedNips, removeAllowedNip, updateAllowedNip } from '../lib/auth.js';
import { DURATION_OPTIONS, computeExpiresAt, isExpired } from '../lib/nipUtils.js';
import EditNipModal from './EditNipModal.jsx';
import { PencilIcon, PowerIcon, RefreshIcon, TrashIcon } from './icons.jsx';

const roleBadgeClass = {
  admin: 'bg-blue-50 text-blue-600 border border-blue-200',
  user: 'bg-slate-100 text-slate-600 border border-slate-200',
};

function ActionButton({ label, onClick, colorClass, children }) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`p-1.5 rounded-lg transition-colors ${colorClass}`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 z-10">
        {label}
      </span>
    </div>
  );
}

export default function AdminPage({ profile, onLogout }) {
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const [allowedNips, setAllowedNips] = useState([]);
  const [isLoadingNips, setIsLoadingNips] = useState(true);
  const [newNip, setNewNip] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newDurationDays, setNewDurationDays] = useState('30');
  const [isAdding, setIsAdding] = useState(false);
  const [editingNip, setEditingNip] = useState(null);

  useEffect(() => {
    loadUsers();
    loadAllowedNips();
  }, []);

  async function loadUsers() {
    setIsLoadingUsers(true);
    try {
      const data = await fetchAllProfiles();
      setUsers(data);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Memuat Data', text: e.message || e.toString() });
    } finally {
      setIsLoadingUsers(false);
    }
  }

  async function loadAllowedNips() {
    setIsLoadingNips(true);
    try {
      const data = await fetchAllowedNips();
      setAllowedNips(data);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Memuat Whitelist NIP', text: e.message || e.toString() });
    } finally {
      setIsLoadingNips(false);
    }
  }

  async function handleAddNip() {
    if (!newNip) {
      Swal.fire({ icon: 'warning', title: 'NIP Kosong', text: 'Isi NIP terlebih dahulu.' });
      return;
    }

    setIsAdding(true);
    try {
      const days = newDurationDays === 'unlimited' ? null : Number(newDurationDays);
      await addAllowedNip({ nip: newNip, nama: newNama || null, expiresAt: computeExpiresAt(days) });
      setNewNip('');
      setNewNama('');
      await loadAllowedNips();
      Swal.fire({ icon: 'success', title: 'NIP Ditambahkan', timer: 1200, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Menambahkan NIP', text: e.message || e.toString() });
    } finally {
      setIsAdding(false);
    }
  }

  async function handleExtendNip(n, days) {
    try {
      await addAllowedNip({
        nip: n.nip,
        nama: n.nama,
        keterangan: n.keterangan,
        expiresAt: computeExpiresAt(days),
        isActive: n.is_active,
      });
      await loadAllowedNips();
      Swal.fire({ icon: 'success', title: 'Akses Diperpanjang', timer: 1200, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Memperpanjang Akses', text: e.message || e.toString() });
    }
  }

  async function handleToggleActive(n) {
    try {
      await updateAllowedNip(n.nip, { is_active: !n.is_active });
      await loadAllowedNips();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Mengubah Status', text: e.message || e.toString() });
    }
  }

  async function handleSaveEditNip(updates) {
    try {
      await updateAllowedNip(editingNip.nip, updates);
      await loadAllowedNips();
      setEditingNip(null);
      Swal.fire({ icon: 'success', title: 'Perubahan Disimpan', timer: 1200, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Perubahan', text: e.message || e.toString() });
    }
  }

  async function handleRemoveNip(nip) {
    const result = await Swal.fire({
      title: 'Hapus Akses NIP?',
      text: `NIP ${nip} tidak akan bisa login lagi.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus',
    });
    if (!result.isConfirmed) return;

    try {
      await removeAllowedNip(nip);
      await loadAllowedNips();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Menghapus NIP', text: e.message || e.toString() });
    }
  }

  return (
    <div className="bg-slate-200 min-h-screen p-3 md:p-6 font-sans text-slate-800 flex flex-col justify-center">
      <div className="max-w-7xl mx-auto w-full space-y-4">
        <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Halaman Admin</p>
              <p className="text-sm font-bold text-slate-800">{profile?.nama || profile?.email || 'Admin'}</p>
            </div>
          </div>
          <button
            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5"
            onClick={onLogout}
          >
            🚪 Logout / Keluar
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h1 className="text-lg font-extrabold text-slate-800">👥 Akun Admin</h1>
            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              onClick={loadUsers}
            >
              🔄 Muat Ulang
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs font-bold uppercase text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-4">NIP</th>
                  <th className="py-2 pr-4">Nama</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingUsers && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">Memuat data...</td>
                  </tr>
                )}
                {!isLoadingUsers && users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">Belum ada data user.</td>
                  </tr>
                )}
                {!isLoadingUsers && users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold">{u.nip}</td>
                    <td className="py-2.5 pr-4">{u.nama || '-'}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full ${roleBadgeClass[u.role] || roleBadgeClass.user}`}>
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div>
              <h1 className="text-lg font-extrabold text-slate-800">📋 Whitelist NIP User</h1>
              <p className="text-xs text-slate-400">NIP di bawah ini yang diizinkan login lewat API beetri (tanpa akun Supabase).</p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              onClick={loadAllowedNips}
            >
              🔄 Muat Ulang
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <input
              type="text"
              className="flex-1 min-w-[160px] border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="NIP"
              value={newNip}
              onChange={(e) => setNewNip(e.target.value)}
            />
            <input
              type="text"
              className="flex-1 min-w-[160px] border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nama (opsional)"
              value={newNama}
              onChange={(e) => setNewNama(e.target.value)}
            />
            <select
              className="border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newDurationDays}
              onChange={(e) => setNewDurationDays(e.target.value)}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.days ?? 'unlimited'}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-60"
              onClick={handleAddNip}
              disabled={isAdding}
            >
              {isAdding ? 'Menambahkan...' : '+ Tambah NIP'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs font-bold uppercase text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-4">NIP</th>
                  <th className="py-2 pr-4">Nama</th>
                  <th className="py-2 pr-4">Berlaku Sampai</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingNips && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">Memuat data...</td>
                  </tr>
                )}
                {!isLoadingNips && allowedNips.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">Belum ada NIP terdaftar.</td>
                  </tr>
                )}
                {!isLoadingNips && allowedNips.map((n) => {
                  const expired = isExpired(n.expires_at);
                  const statusLabel = !n.is_active ? 'Nonaktif' : expired ? 'Kedaluwarsa' : 'Aktif';
                  const statusClass = !n.is_active
                    ? 'bg-slate-100 text-slate-500 border border-slate-200'
                    : expired
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                  return (
                    <tr key={n.nip} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-4 font-semibold">{n.nip}</td>
                      <td className="py-2.5 pr-4">{n.nama || '-'}</td>
                      <td className="py-2.5 pr-4 text-slate-500">
                        {n.expires_at ? new Date(n.expires_at).toLocaleDateString('id-ID') : 'Tanpa Batas'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-1">
                          <ActionButton
                            label="Edit"
                            colorClass="text-slate-600 hover:bg-slate-100"
                            onClick={() => setEditingNip(n)}
                          >
                            <PencilIcon />
                          </ActionButton>
                          <ActionButton
                            label="Perpanjang 30 Hari"
                            colorClass="text-blue-600 hover:bg-blue-50"
                            onClick={() => handleExtendNip(n, 30)}
                          >
                            <RefreshIcon />
                          </ActionButton>
                          <ActionButton
                            label={n.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            colorClass="text-amber-600 hover:bg-amber-50"
                            onClick={() => handleToggleActive(n)}
                          >
                            <PowerIcon />
                          </ActionButton>
                          <ActionButton
                            label="Hapus"
                            colorClass="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleRemoveNip(n.nip)}
                          >
                            <TrashIcon />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingNip && (
        <EditNipModal
          nip={editingNip}
          onClose={() => setEditingNip(null)}
          onSave={handleSaveEditNip}
        />
      )}
    </div>
  );
}
