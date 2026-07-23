import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import LoginView from './components/LoginView.jsx';
import FaceDetectionView from './components/FaceDetectionView.jsx';
import AttendanceView from './components/AttendanceView.jsx';
import AdminPage from './components/AdminPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { fetchTodayScheduleLocation } from './lib/api.js';
import { fetchOwnProfile, signOutAdmin } from './lib/auth.js';
import { supabase } from './lib/supabase.js';

function App() {
  const [authToken, setAuthToken] = useState('');
  const [nip, setNip] = useState('');
  const [mainTab, setMainTab] = useState('face');
  const [faceCapture, setFaceCapture] = useState(null);
  const [scheduleLocation, setScheduleLocation] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  const isUserLoggedIn = Boolean(authToken);
  const isAdminLoggedIn = Boolean(adminProfile);

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

  async function handleUserLoginSuccess(token, nipValue) {
    setAuthToken(token);
    setNip(nipValue);
    setMainTab('face');

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

      setAuthToken('');
      setNip('');
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
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Status Sesi Login</p>
                      <p className="text-sm font-bold text-slate-800">{nip ? `NIP: ${nip}` : 'Terautentikasi'}</p>
                    </div>
                  </div>
                  <button
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5"
                    onClick={handleLogout}
                  >
                    🚪 Logout / Keluar
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
                    onCapture={(base64, blob) => setFaceCapture({ base64, blob })}
                    onReset={() => setFaceCapture(null)}
                    onGotoB3={() => setMainTab('b3')}
                  />
                </div>

                <div className={mainTab === 'b3' ? '' : 'hidden'}>
                  <AttendanceView
                    authToken={authToken}
                    faceCapture={faceCapture}
                    scheduleLocation={scheduleLocation}
                    onNeedFace={() => setMainTab('face')}
                  />
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
