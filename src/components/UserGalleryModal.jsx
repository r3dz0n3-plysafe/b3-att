import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { deleteFaceGalleryPhoto, listFaceGalleryPhotos } from '../lib/gallery.js';
import { TrashIcon } from './icons.jsx';

const TYPE_LABEL = { 'clock-in': 'Hadir (Clock-In)', 'clock-out': 'Pulang (Clock-Out)' };

export default function UserGalleryModal({ nip, nama, photoLimit, onClose }) {
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [activeTab, setActiveTab] = useState('clock-in');

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nip]);

  async function loadPhotos() {
    setIsLoading(true);
    try {
      const data = await listFaceGalleryPhotos(nip);
      setPhotos(data);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Memuat Galeri', text: e.message || e.toString() });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(photo) {
    const result = await Swal.fire({
      title: 'Hapus Foto?',
      text: `Foto (${TYPE_LABEL[photo.type] || photo.type}) ini akan dihapus permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    setDeletingId(photo.id);
    try {
      await deleteFaceGalleryPhoto(photo.id, nip);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: e.message || e.toString() });
    } finally {
      setDeletingId('');
    }
  }

  const groups = { 'clock-in': [], 'clock-out': [] };
  for (const p of photos) {
    if (!groups[p.type]) groups[p.type] = [];
    groups[p.type].push(p);
  }

  const activeList = groups[activeTab] || [];
  const emptySlots = Math.max((photoLimit || 0) - activeList.length, 0);

  const activeTabClass = 'flex-1 py-2 text-sm rounded-lg font-bold bg-white text-blue-600 shadow-sm transition-all';
  const inactiveTabClass = 'flex-1 py-2 text-sm rounded-lg font-semibold text-slate-600 transition-all';

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">🖼️ Galeri Foto</h2>
            <p className="text-sm text-slate-500">{nama || 'Tanpa Nama'} — NIP: {nip}</p>
          </div>
          <button type="button" className="text-slate-400 hover:text-slate-600 text-xl leading-none" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
            {Object.keys(TYPE_LABEL).map((type) => (
              <button
                key={type}
                type="button"
                className={activeTab === type ? activeTabClass : inactiveTabClass}
                onClick={() => setActiveTab(type)}
              >
                {TYPE_LABEL[type]} ({(groups[type] || []).length}/{photoLimit ?? '-'})
              </button>
            ))}
          </div>

          {isLoading && <p className="text-center text-slate-400 py-6">Memuat galeri...</p>}

          {!isLoading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {activeList.map((photo) => (
                <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={photo.base64} alt="Foto galeri" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-sm transition-all disabled:opacity-60"
                    onClick={() => handleDelete(photo)}
                    disabled={deletingId === photo.id}
                    title="Hapus foto ini"
                  >
                    {deletingId === photo.id ? (
                      <span className="text-[10px]">...</span>
                    ) : (
                      <TrashIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <div
                  key={`empty-${activeTab}-${i}`}
                  className="aspect-square rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300 text-[10px] font-semibold"
                >
                  Kosong
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-200 shrink-0">
          <button
            type="button"
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-2.5 px-4 rounded-xl transition-all"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
