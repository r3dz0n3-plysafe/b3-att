import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import LoginView from './components/LoginView.jsx';
import FaceDetectionView from './components/FaceDetectionView.jsx';
import AttendanceView from './components/AttendanceView.jsx';
import ProfileView from './components/ProfileView.jsx';
import AdminPage from './components/AdminPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { fetchTodayScheduleLocation } from './lib/api.js';
import { fetchOwnProfile, signOutAdmin } from './lib/auth.js';
import { supabase } from './lib/supabase.js';
import { saveUserSession, loadUserSession, clearUserSession } from './lib/userSession.js';
import { useMyFacePhoto } from './lib/useMyFacePhoto.js';

function App() {
  const [authToken, setAuthToken] = useState('');
  const [nip, setNip] = useState('');
  const [userName, setUserName] = useState('');
  const [mainTab, setMainTab] = useState('face');
  const [faceCapture, setFaceCapture] = useState(null);
  const [scheduleLocation, setScheduleLocation] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  const isUserLoggedIn = Boolean(authToken);
  const isAdminLoggedIn = Boolean(adminProfile);
  const { photoUrl: navbarPhotoUrl } = useMyFacePhoto(authToken);

  // Pulihkan sesi admin (Supabase Auth) saat halaman dibuka/di-refresh.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session && mounted) {
        try {
          const profile = await fetchOwnProfile();
          if (mounted && profile?.role === 'admin') setAdminProfile(profile);
        } catch (e) {
          console.error('Gagal memuat profil admin', e);
        }
      } else if (mounted) {
        // Belum ada sesi admin. Cek sesi user biasa (token beetri) di local storage —
        // kalau masih ada dan belum expired, langsung anggap sudah login (tidak perlu ulang).
        const userSession = loadUserSession();
        if (userSession) {
          setAuthToken(userSession.token);
          setNip(userSession.nip);
          setUserName(userSession.name || '');
        }
      }
      if (mounted) setCheckingSession(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setAdminProfile(null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  function handleAdminLoginSuccess(profile) {
    setAdminProfile(profile);
    navigate('/admin', { replace: true });
  }

  async function handleUserLoginSuccess(token, nipValue, nameValue) {
    setAuthToken(token);
    setNip(nipValue);
    setUserName(nameValue || '');
    setMainTab('face');
    saveUserSession({ token, nip: nipValue, name: nameValue });

    // Update default lokasi dari jadwal hari ini (jika tersedia)
    try {
      const loc = await fetchTodayScheduleLocation(token);
      if (loc) setScheduleLocation(loc);
    } catch (e) {
      Swal.fire({
        icon: 'warning',
        title: 'Jadwal Hari Ini Tidak Tersedia',
        text: 'Gagal mengambil lokasi dari jadwal hari ini. Lokasi default tidak diubah.',
        timer: 2000,
        showConfirmButton: false,
      });
    }

    navigate('/', { replace: true });
  }

  function handleLogout() {
    Swal.fire({
      title: 'Konfirmasi Logout',
      text: 'Apakah Anda yakin ingin keluar?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Keluar',
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      if (isAdminLoggedIn) {
        await signOutAdmin();
        setAdminProfile(null);
      }

      clearUserSession();
      setAuthToken('');
      setNip('');
      setUserName('');
      setFaceCapture(null);
      setScheduleLocation(null);
      setMainTab('face');
      navigate('/login', { replace: true });
    });
  }

  const activeTabClass = 'flex-1 md:px-8 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-2';
  const inactiveTabClass = 'flex-1 md:px-8 py-3 text-sm font-semibold text-slate-600 hover:text-blue-600 rounded-xl transition-all flex items-center justify-center gap-2';

  if (checkingSession) {
    return (
      <div className="bg-slate-200 min-h-screen flex items-center justify-center text-slate-500 text-sm font-semibold">
        Memuat sesi...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAdminLoggedIn ? (
            <Navigate to="/admin" replace />
          ) : isUserLoggedIn ? (
            <Navigate to="/" replace />
          ) : (
            <div className="bg-slate-200 min-h-screen p-3 md:p-6 font-sans text-slate-800 flex flex-col justify-center">
              <div className="max-w-7xl mx-auto w-full">
                <LoginView onAdminLoginSuccess={handleAdminLoginSuccess} onUserLoginSuccess={handleUserLoginSuccess} />
              </div>
            </div>
          )
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute isAllowed={isAdminLoggedIn} redirectTo={isUserLoggedIn ? '/' : '/login'}>
            <AdminPage profile={adminProfile} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute isAllowed={isUserLoggedIn} redirectTo={isAdminLoggedIn ? '/admin' : '/login'}>
            <div className="bg-slate-200 min-h-screen p-3 md:p-6 font-sans text-slate-800 flex flex-col justify-center">
              <div className="max-w-7xl mx-auto w-full space-y-4">
                {/* Top Header & Logout Bar */}
                <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-3">
                  <button
                    type="button"
                    className="group flex items-center gap-2 sm:gap-3 rounded-xl -m-2 p-2 hover:bg-slate-100 active:bg-slate-200 ring-1 ring-transparent hover:ring-slate-200 transition-all text-left cursor-pointer min-w-0 flex-1 sm:flex-initial"
                    onClick={() => setMainTab('profile')}
                    title="Buka Profil"
                  >
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-blue-400 transition-all">
                      {navbarPhotoUrl ? (
                        <img src={navbarPhotoUrl} alt="Foto Profil" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base sm:text-lg text-slate-400">👤</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 leading-tight truncate group-hover:text-blue-600 transition-colors">{userName || 'Terautentikasi'}</p>
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="truncate">{nip ? `NIP: ${nip}` : 'Sesi Aktif'}</span>
                      </p>
                    </div>
                    <span className="hidden sm:inline text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all text-sm ml-1 shrink-0">›</span>
                  </button>
                  <button
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                    onClick={handleLogout}
                  >
                    🚪 <span className="hidden sm:inline">Logout / Keluar</span><span className="sm:hidden">Keluar</span>
                  </button>
                </div>

                {/* Tab Navigasi Utama */}
                <div className="flex justify-center w-full">
                  <div className="bg-white p-1 rounded-2xl shadow-md flex w-full md:w-auto border border-slate-200">
                    <button className={mainTab === 'face' ? activeTabClass : inactiveTabClass} onClick={() => setMainTab('face')}>
                      📷 1. Deteksi Wajah
                    </button>
                    <button className={mainTab === 'b3' ? activeTabClass : inactiveTabClass} onClick={() => setMainTab('b3')}>
                      📝 2. Absensi B3
                    </button>
                  </div>
                </div>

                <div className={mainTab === 'face' ? '' : 'hidden'}>
                  <FaceDetectionView
                    authToken={authToken}
                    nip={nip}
                    onCapture={(base64, blob) => setFaceCapture({ base64, blob })}
                    onReset={() => setFaceCapture(null)}
                    onGotoB3={() => setMainTab('b3')}
                  />
                </div>

                <div className={mainTab === 'b3' ? '' : 'hidden'}>
                  <AttendanceView
                    authToken={authToken}
                    nip={nip}
                    faceCapture={faceCapture}
                    scheduleLocation={scheduleLocation}
                    onNeedFace={() => setMainTab('face')}
                  />
                </div>

                <div className={mainTab === 'profile' ? '' : 'hidden'}>
                  <ProfileView authToken={authToken} nip={nip} name={userName} />
                </div>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to={isAdminLoggedIn ? '/admin' : isUserLoggedIn ? '/' : '/login'} replace />}
      />
    </Routes>
  );
}

export default App;
