import { useState, type FormEvent } from 'react';
import { UserCheck } from 'lucide-react';
import { UPT_DIVISIONS, type StaffProfile } from '../types/letter';

interface ProfileSetupModalProps {
  uid: string;
  email: string;
  defaultDisplayName: string;
  existingProfile: StaffProfile | null;
  onSave: (data: {
    displayName: string;
    nip: string;
    division: string;
    jabatan: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function ProfileSetupModal({
  email,
  defaultDisplayName,
  existingProfile,
  onSave,
  onCancel,
}: ProfileSetupModalProps) {
  const [displayName, setDisplayName] = useState(
    existingProfile?.displayName || defaultDisplayName || '',
  );
  const [nip, setNip] = useState(existingProfile?.nip || '');
  const [division, setDivision] = useState(
    existingProfile?.division || UPT_DIVISIONS[0],
  );
  const [jabatan, setJabatan] = useState(
    existingProfile?.jabatan || 'Staf Administrasi',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (displayName.trim().length < 2) {
      setError('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (jabatan.trim().length < 2) {
      setError('Jabatan minimal 2 karakter.');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        nip: nip.trim(),
        division: division.trim(),
        jabatan: jabatan.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil staf.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
          <UserCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {existingProfile ? 'Perbarui Profil Staf' : 'Lengkapi Identitas Staf UPT'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Lengkap & Gelar
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Contoh: Budi Santoso, S.P."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Subbagian / Seksi
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                {UPT_DIVISIONS.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jabatan
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                placeholder="Contoh: Pengadministrasi Umum"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              NIP / NIPPPK (Opsional)
            </label>
            <input
              type="text"
              maxLength={40}
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Contoh: 199004152020121004"
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
            <p className="text-xs text-slate-500 mt-1">
              Data NIP hanya tersimpan pada profil pribadi dan admin, tidak ditampilkan di daftar surat publik.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
