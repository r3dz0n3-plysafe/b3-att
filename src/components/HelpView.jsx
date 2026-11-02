// Halaman "Cara Pakai" untuk user NIP. Bahasa sengaja dibuat sederhana (non-teknis).
// Gambar contoh tombol dibuat dari elemen HTML (bukan screenshot) supaya selalu sama dengan tampilan aplikasi.

function Chip({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold align-middle ${className}`}>
      {children}
    </span>
  );
}

const blue = 'bg-blue-600 text-white';
const green = 'bg-green-600 text-white';
const white = 'bg-white text-slate-700 border border-slate-300';
const rose = 'bg-rose-50 text-rose-600 border border-rose-200';
const orange = 'bg-orange-400 text-white';
const cyan = 'bg-cyan-500 text-white';
const gray = 'bg-slate-400 text-white';

function Step({ n, title, children, mock }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 shrink-0 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">{n}</div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800">{title}</p>
        <div className="text-sm text-slate-600 mt-1 space-y-2 leading-relaxed">{children}</div>
        {mock && <div className="mt-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 flex flex-wrap gap-2 items-center">{mock}</div>}
      </div>
    </div>
  );
}

function Section({ id, icon, title, intro, children }) {
  return (
    <section id={id} className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
      <div className="bg-slate-100 px-5 py-3 border-b border-slate-200">
        <h3 className="font-bold text-lg text-slate-800">{icon} {title}</h3>
        {intro && <p className="text-sm text-slate-500 mt-0.5">{intro}</p>}
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </section>
  );
}

function Tip({ children, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
  };
  return <div className={`border rounded-xl px-3 py-2 text-sm ${tones[tone]}`}>{children}</div>;
}

export default function HelpView({ onGoto }) {
  return (
    <div id="view-help" className="max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">📖 Cara Pakai Aplikasi Absen</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Tenang, gampang kok! Pokoknya cuma 3 langkah: <b>foto wajah</b> → <b>cek fotonya</b> → <b>kirim absen</b>.
          Ikuti saja urutan di bawah ini ya.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Chip className={blue}>📷 1. Deteksi Wajah</Chip>
          <span className="text-slate-400">→</span>
          <Chip className={blue}>✅ 2. Review</Chip>
          <span className="text-slate-400">→</span>
          <Chip className={blue}>📝 3. Absensi B3</Chip>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 text-xs font-semibold">
          <a href="#bantu-foto" className="text-blue-600 hover:underline">Ambil foto</a>·
          <a href="#bantu-review" className="text-blue-600 hover:underline">Cek foto</a>·
          <a href="#bantu-absen" className="text-blue-600 hover:underline">Kirim absen</a>·
          <a href="#bantu-profil" className="text-blue-600 hover:underline">Profil</a>·
          <a href="#bantu-masalah" className="text-blue-600 hover:underline">Kalau ada masalah</a>
        </div>
      </div>

      <Section id="bantu-foto" icon="📷" title="Langkah 1: Ambil Foto Wajah" intro="Ini fotonya yang nanti dikirim saat absen.">
        <Step n="1" title="Pilih mau foto dari mana" mock={
          <>
            <Chip className="bg-white text-blue-600 shadow-sm border border-slate-200">Kamera</Chip>
            <Chip className="bg-slate-100 text-slate-600">Upload Foto</Chip>
            <Chip className="bg-slate-100 text-slate-600">Galeriku</Chip>
          </>
        }>
          <p><b>Kamera</b> = foto langsung pakai kamera HP/laptop. <b>Upload Foto</b> = pilih foto yang sudah ada di HP. <b>Galeriku</b> = pilih foto lama yang pernah kamu simpan di sini.</p>
        </Step>
        <Step n="2" title="Kalau pakai Kamera" mock={<Chip className="bg-slate-900 text-white">📷 Nyalakan Kamera</Chip>}>
          <p>Tekan tombol itu, lalu izinkan kamera kalau ditanya. Hadapkan wajah lurus ke depan, jangan terlalu jauh, jangan miring, dan cari tempat yang terang.</p>
          <p>Kalau wajahmu sudah pas, aplikasi akan memberi tanda centang ✅. Ikuti petunjuknya sampai semua centang.</p>
        </Step>
        <Step n="3" title="Ambil fotonya" mock={<Chip className={blue}>Ambil Foto</Chip>}>
          <p>Kalau sudah bagus, tekan tombol <b>Ambil Foto</b> (kalau foto dari Upload atau Galeriku, tombolnya bernama <b>Gunakan Gambar ini</b>). Kalau kurang bagus, tekan tombol abu-abu untuk mengulang sampai puas.</p>
        </Step>
        <Tip>💡 Pakai <b>Galeriku</b> kalau malas foto tiap hari: pilih saja foto lama yang sudah bagus.</Tip>
      </Section>

      <Section id="bantu-review" icon="✅" title="Langkah 2: Cek Foto (Review)" intro="Lihat dulu hasilnya, bagus atau tidak.">
        <Step n="1" title="Lihat fotonya">
          <p>Di sini kamu bisa lihat foto hasil tadi. Kalau sudah oke, tekan tombol hijau untuk lanjut.</p>
        </Step>
        <Step n="2" title="Pilih mau diapakan fotonya" mock={
          <>
            <Chip className={green}>Lanjut ke Absensi B3 →</Chip>
            <Chip className={white}>🖼️ Simpan Foto Profil</Chip>
            <Chip className={white}>💾 Simpan ke Galeriku</Chip>
          </>
        }>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Lanjut ke Absensi B3</b> → langsung pergi ke halaman kirim absen.</li>
            <li><b>Simpan Foto Profil</b> → jadikan foto ini fotomu di sistem.</li>
            <li><b>Simpan ke Galeriku</b> → disimpan biar bisa dipakai lagi nanti (maksimal 10 foto untuk Hadir dan 10 untuk Pulang).</li>
          </ul>
        </Step>
        <Step n="3" title="Kurang puas?" mock={<span className="text-sm font-semibold text-slate-500">↺ Ulangi Deteksi Wajah</span>}>
          <p>Tekan tulisan itu untuk foto ulang dari awal.</p>
        </Step>
      </Section>

      <Section id="bantu-absen" icon="📝" title="Langkah 3: Kirim Absen" intro="Ini bagian yang paling penting. Sabar ya, cuma beberapa tombol.">
        <Step n="1" title="Pastikan fotonya sudah ada" mock={<Chip className="bg-blue-50 text-green-700 border border-blue-200">✅ Wajah tersimpan dan siap dikirim</Chip>}>
          <p>Di bagian atas harus ada tulisan hijau seperti di atas. Kalau merah (❌), balik dulu ke langkah 1.</p>
        </Step>
        <Step n="2" title="Pilih Hadir atau Pulang" mock={
          <>
            <Chip className={white}>Hadir</Chip>
            <Chip className={white}>Pulang</Chip>
          </>
        }>
          <p>Pilihan ini sudah terisi sendiri. Kalau kamu belum absen hari ini, otomatis <b>Hadir</b>. Kalau sudah hadir, otomatis <b>Pulang</b>. Cek saja sudah benar atau belum ya.</p>
          <p>Di bawahnya ada tulisan "Status hari ini" yang memberi tahu kamu sudah hadir/pulang atau belum.</p>
        </Step>
        <Step n="3" title="Perangkat yang Dipakai (HP kamu)">
          <p>Biarkan saja seperti bawaannya (<b>Perangkat Ini Terdeteksi</b>). Tidak perlu diubah.</p>
        </Step>
        <Step n="4" title="Cek lokasi" mock={
          <>
            <Chip className={cyan}>🗺️ View Map</Chip>
            <Chip className={orange}>🎲 Acak ±100m</Chip>
            <Chip className={gray}>🔄 Reset Lokasi</Chip>
          </>
        }>
          <p>Lokasi sudah terisi sendiri sesuai jadwalmu hari ini. Biasanya kamu tidak perlu mengubah apa-apa.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>View Map</b> → lihat lokasinya di peta.</li>
            <li><b>Acak ±100m</b> → geser sedikit titiknya (dekat-dekat saja).</li>
            <li><b>Reset Lokasi</b> → balikin ke lokasi awal.</li>
          </ul>
        </Step>
        <Step n="5" title="Tekan kirim!" mock={<Chip className={`${green} text-sm px-4 py-2`}>🚀 Submit Attendance</Chip>}>
          <p>Tunggu sebentar sampai muncul kotak hasil. Hijau ✔ = absen berhasil. Merah ✖ = gagal, baca pesannya.</p>
          <p>Kalau muncul pesan "lokasi di luar jangkauan", aplikasi otomatis mencoba sekali lagi dengan lokasi lain. Kamu tidak perlu ngapa-ngapain, tunggu saja.</p>
        </Step>
        <Step n="6" title="Setelah berhasil (boleh dilewati)" mock={<Chip className="bg-indigo-600 text-white">💾 Simpan ke Galeriku</Chip>}>
          <p>Mau pakai foto yang sama besok? Tekan tombol ini supaya fotonya tersimpan di Galeriku.</p>
        </Step>
        <Tip tone="amber">⚠️ Cukup kirim <b>sekali</b> untuk Hadir dan sekali untuk Pulang. Tidak perlu ditekan berkali-kali.</Tip>
      </Section>

      <Section id="bantu-profil" icon="👤" title="Profil Kamu" intro="Klik nama/fotomu di pojok kiri atas untuk membukanya.">
        <Step n="1" title="Apa yang bisa dilakukan" mock={
          <>
            <Chip className={blue}>📤 Upload Foto</Chip>
            <Chip className={rose}>🗑️ Hapus Foto</Chip>
            <Chip className="bg-emerald-50 text-emerald-700 border border-emerald-200">✅ Verifikasi</Chip>
          </>
        }>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Upload Foto</b> → ganti foto profilmu dengan foto dari HP.</li>
            <li><b>Hapus Foto</b> → buang foto profil yang sekarang.</li>
            <li><b>Verifikasi</b> → menandai fotomu sudah benar/disetujui.</li>
          </ul>
        </Step>
        <div>
          <button type="button" onClick={() => onGoto('profile')} className="text-sm font-bold text-blue-600 hover:underline">Buka Profil sekarang →</button>
        </div>
      </Section>

      <Section id="bantu-masalah" icon="🆘" title="Kalau Ada Masalah" intro="Jangan panik, biasanya gampang dibereskan.">
        <ul className="space-y-3 text-sm text-slate-600">
          <li><b>Kamera tidak mau nyala?</b> Cek izin kamera di browser (ikon gembok di samping alamat web), pilih "Izinkan". Atau pakai <b>Upload Foto</b> saja.</li>
          <li><b>Wajah tidak terdeteksi?</b> Cari tempat lebih terang, lepas masker/kacamata gelap, dan hadap lurus ke kamera.</li>
          <li><b>Tombol kirim absen bilang "Wajah Belum Terdeteksi"?</b> Berarti langkah 1 belum selesai. Balik ke tab 1 dulu.</li>
          <li><b>Galeri penuh?</b> Hapus beberapa foto lama di Galeriku (tekan tombol tong sampah di fotonya).</li>
          <li><b>Absen gagal terus?</b> Baca pesan merahnya, lalu coba lagi sebentar. Kalau tetap gagal, hubungi admin dan kirimkan foto layar pesannya.</li>
          <li><b>Lupa password / ganti password?</b> Hubungi admin.</li>
        </ul>
        <Tip>🧪 Kalau ada tulisan kuning <b>"Mode Demo"</b> di atas, berarti kamu cuma latihan. Absennya tidak benar-benar dikirim.</Tip>
        <Tip>🚪 Sudah selesai? Tekan <b>Keluar</b> di pojok kanan atas supaya akunmu aman.</Tip>
      </Section>

      <div className="text-center pb-2">
        <button
          type="button"
          onClick={() => onGoto('face')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all"
        >
          Siap! Mulai Absen →
        </button>
      </div>
    </div>
  );
}
