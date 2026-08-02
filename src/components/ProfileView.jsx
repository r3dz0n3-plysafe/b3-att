import { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { deleteMyFacePhoto, uploadFacePhoto, verifyMyFace } from '../lib/api.js';
import { useMyFacePhoto } from '../lib/useMyFacePhoto.js';

export default function ProfileView({ authToken, nip, name }) {
  const { photoUrl, isLoading, refetch } = useMyFacePhoto(authToken);
  const [busyAction, setBusyAction] = useState('');
  const fileInputRef = useRef(null);

  const isBusy = Boolean(busyAction);

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusyAction('upload');
    try {
      const { ok, rawText } = await uploadFacePhoto(authToken, file);
      if (ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Foto berhasil diunggah.', timer: 1500, showConfirmButton: false });
        refetch();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Mengunggah', text: rawText });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error API', text: err.toString() });
    } finally {
      setBusyAction('');
    }
  }

  async function handleDelete() {
    const result = await Swal.fire({
      title: 'Hapus Foto?',
      text: 'Foto wajah Anda akan dihapus dari server.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    setBusyAction('delete');
    try {
      const { ok, rawText } = await deleteMyFacePhoto(authToken, nip);
      if (ok) {
        Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Foto berhasil dihapus.', timer: 1500, showConfirmButton: false });
        refetch();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: rawText });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error API', text: err.toString() });
    } finally {
      setBusyAction('');
    }
  }

  async function handleVerify() {
    setBusyAction('verify');
    try {
      const { ok, rawText } = await verifyMyFace(authToken, nip);
      if (ok) {
        Swal.fire({ icon: 'success', title: 'Terverifikasi', text: 'Foto berhasil diverifikasi.', timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Verifikasi', text: rawText });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error API', text: err.toString() });
    } finally {
      setBusyAction('');
    }
  }

  return (
    <div id="view-profile" className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-200">
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">👤 Profil</h3>
        </div>
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-200 flex items-center justify-center mb-4">
            {isLoading ? (
              <span className="text-xs text-slate-400 font-semibold">Memuat...</span>
            ) : photoUrl ? (
              <img src={photoUrl} alt="Foto Profil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl text-slate-400">👤</span>
            )}
          </div>
          {!isLoading && !photoUrl && <p className="text-xs text-amber-600 font-semibold mb-3">Foto profil belum tersedia.</p>}

          <p className="text-lg font-bold text-slate-800">{name || '-'}</p>
          <p className="text-sm text-slate-500 mt-1 mb-5">NIP: {nip || '-'}</p>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              onClick={handleUploadClick}
              disabled={isBusy}
            >
              {busyAction === 'upload' ? '🔄 Mengunggah...' : '📤 Upload Foto'}
            </button>
            <button
              type="button"
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              onClick={handleDelete}
              disabled={isBusy || !photoUrl}
            >
              {busyAction === 'delete' ? '🔄 Menghapus...' : '🗑️ Hapus Foto'}
            </button>
            <button
              type="button"
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              onClick={handleVerify}
              disabled={isBusy || !photoUrl}
            >
              {busyAction === 'verify' ? '🔄 Verifikasi...' : '✅ Verifikasi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
