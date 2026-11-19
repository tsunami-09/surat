import { useState } from 'react';
import { CalendarCheck2, FileSpreadsheet, ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onSignIn: () => Promise<void>;
  error: string | null;
}

export function LoginView({ onSignIn, error }: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onSignIn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 grid lg:grid-cols-12 items-stretch">
      <div className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white border-r border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            UPT Pelatihan Pertanian
          </span>
          <span className="text-xs text-slate-500 font-medium">Tata Usaha & Kesekretariatan</span>
        </div>

        <div className="max-w-xl my-auto py-12">
          <p className="text-xs font-semibold tracking-wider text-emerald-700 uppercase mb-3">
            Sistem Penomoran Surat Keluar
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight [text-wrap:balance] mb-4">
            Pencatatan dan Penomoran Surat Keluar Secara Real-Time
          </h1>
          <p className="text-base text-slate-600 leading-relaxed mb-8">
            Memudahkan staf administrasi UPT Pelatihan Pertanian mengambil nomor surat keluar sesuai urutan tanggal dari mana saja, baik saat WFH maupun saat penanggung jawab berhalangan hadir.
          </p>

          <div className="space-y-4 mb-10 border-t border-slate-200 pt-6">
            <div className="flex items-start gap-3">
              <CalendarCheck2 className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Urutan Tanggal Kronologis & Sisipan Otomatis</p>
                <p className="text-sm text-slate-600">
                  Nomor urut otomatis melanjutkan seri tahunan atau membuat sisipan kronologis tanpa menggeser nomor yang sudah terbit.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Anti-Duplikasi Transaksional</p>
                <p className="text-sm text-slate-600">
                  Pengambilan nomor bersamaan oleh beberapa staf diproses secara atomik sehingga tidak ada nomor ganda.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Kredensial Terintegrasi</p>
                <p className="text-sm text-slate-600">
                  Masuk menggunakan akun Google terverifikasi dengan jejak pencatat yang tercatat pada setiap arsip surat.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
              />
            </svg>
            <span>{loading ? 'Menghubungkan Akun...' : 'Masuk dengan Akun Google'}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
          <span>UPT Pelatihan Pertanian</span>
          <span aria-hidden="true">·</span>
          <span>Buku Agenda Surat Keluar Digital</span>
        </div>
      </div>

      <div className="lg:col-span-5 relative hidden lg:block bg-slate-900 overflow-hidden">
        {!imgFailed ? (
          <img
            src="/src/assets/images/upt_campus_pavilion_1794985173091.jpg"
            alt="Gedung dan lahan percontohan UPT Pelatihan Pertanian"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 flex items-center justify-center p-12">
            <div className="text-center text-emerald-100/80">
              <p className="text-lg font-semibold">UPT Pelatihan Pertanian</p>
              <p className="text-sm mt-1">Administrasi Persuratan Terpadu</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
          <p className="text-xs font-medium text-emerald-300 mb-2">
            Akses Terpadu · WFH & Kantor
          </p>
          <p className="text-lg font-semibold leading-snug">
            Penyelenggaraan pelatihan dan tata persuratan tetap berjalan tepat jadwal tanpa hambatan lokasi.
          </p>
        </div>
      </div>
    </div>
  );
}
