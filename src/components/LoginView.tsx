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
                <p className="text-sm font-semibold text-slate-900">Kredensial & Penyimpanan Google Drive</p>
                <p className="text-sm text-slate-600">
                  Masuk menggunakan akun Google terverifikasi dan simpan arsip dokumen surat langsung ke Google Drive Anda.
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
            className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-60 text-slate-800 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span>{loading ? 'Menghubungkan Akun...' : 'Masuk dengan Google'}</span>
            <ArrowRight className="w-4 h-4 shrink-0 text-slate-500" />
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
