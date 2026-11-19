import { useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, Calendar, Check, Copy, Info, X } from 'lucide-react';
import { findNearestWorkingDate } from '../lib/calendar';
import {
  formatSequenceCode,
  formatTanggalIndonesia,
  getTodayIsoDate,
  previewNextLetterNumber,
} from '../lib/numbering';
import {
  DAILY_QUOTA,
  LETTER_CATEGORIES,
  type CalendarHoliday,
  type ClassificationCode,
  type DailyCounter,
  type LetterCategory,
  type StaffProfile,
  type SystemSettings,
} from '../types/letter';

interface IssueLetterModalProps {
  profile: StaffProfile;
  settings: SystemSettings;
  classifications: ClassificationCode[];
  dailyCounters: Record<string, DailyCounter>;
  customHolidays: Record<string, CalendarHoliday>;
  initialDate?: string | null;
  onIssue: (payload: {
    letterDate: string;
    classificationCode: string;
    category: LetterCategory;
    subject: string;
    recipient: string;
    picName: string;
    notes: string;
  }) => Promise<{ id: string; fullNumber: string; sequenceNumber: number }>;
  onClose: () => void;
}

export function IssueLetterModal({
  profile,
  settings,
  classifications,
  dailyCounters,
  customHolidays,
  initialDate,
  onIssue,
  onClose,
}: IssueLetterModalProps) {
  const activeClassifications = useMemo(
    () => classifications.filter((c) => c.active),
    [classifications],
  );

  const [letterDate, setLetterDate] = useState(
    initialDate || findNearestWorkingDate(getTodayIsoDate(), customHolidays),
  );
  const [classificationCode, setClassificationCode] = useState(
    activeClassifications[0]?.code || '000',
  );
  const [category, setCategory] = useState<LetterCategory>('Surat Tugas');
  const [subject, setSubject] = useState('');
  const [recipient, setRecipient] = useState('');
  const [picName, setPicName] = useState(profile.displayName);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedResult, setIssuedResult] = useState<{
    fullNumber: string;
    letterDate: string;
    subject: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const preview = useMemo(
    () =>
      previewNextLetterNumber({
        letterDate,
        classificationCode,
        settings,
        dailyCounters,
        customHolidays,
      }),
    [letterDate, classificationCode, settings, dailyCounters, customHolidays],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!preview.canIssue) {
      setError(preview.blockedReason || 'Tanggal tidak dapat digunakan.');
      return;
    }
    if (subject.trim().length < 3) {
      setError('Perihal surat minimal 3 karakter.');
      return;
    }
    if (recipient.trim().length < 2) {
      setError('Tujuan / penerima surat minimal 2 karakter.');
      return;
    }
    if (picName.trim().length < 2) {
      setError('Nama pengolah / penandatangan minimal 2 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await onIssue({
        letterDate,
        classificationCode,
        category,
        subject: subject.trim(),
        recipient: recipient.trim(),
        picName: picName.trim(),
        notes: notes.trim(),
      });
      setIssuedResult({
        fullNumber: res.fullNumber,
        letterDate,
        subject: subject.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menerbitkan nomor surat.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {issuedResult ? 'Nomor Surat Berhasil Diterbitkan' : 'Ambil Nomor Surat Keluar'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Batas maksimal {DAILY_QUOTA} nomor per hari kerja · {settings.institutionName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {issuedResult ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-6 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
              <p className="text-xs font-semibold text-emerald-800 mb-2">
                Nomor Surat Resmi Tercatat
              </p>
              <p className="text-2xl sm:text-3xl font-mono font-semibold text-slate-900 tabular-nums tracking-tight break-all">
                {issuedResult.fullNumber}
              </p>
              <p className="text-xs text-slate-600 mt-3">
                Tanggal {formatTanggalIndonesia(issuedResult.letterDate)} · {issuedResult.subject}
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCopy(issuedResult.fullNumber)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Nomor Disalin' : 'Salin Nomor Surat'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setIssuedResult(null);
                  setSubject('');
                  setRecipient('');
                  setNotes('');
                }}
                className="px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              >
                Ambil Nomor Lainnya
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Kembali ke Buku Agenda
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Live Daily Quota & Number Preview */}
            <div
              className={`p-4 rounded-xl border ${
                !preview.canIssue
                  ? 'bg-amber-50/80 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  {preview.canIssue
                    ? 'Pratinjau Nomor yang Akan Diterbitkan'
                    : 'Tanggal Tidak Tersedia untuk Penomoran'}
                </span>
                {preview.canIssue && preview.startSeq !== null && preview.endSeq !== null ? (
                  <span className="text-xs font-mono font-semibold text-emerald-700 tabular-nums">
                    Kuota Harian: {preview.usedCount}/{DAILY_QUOTA} terpakai (Sisa {preview.remainingQuota})
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-800">
                    Nomor Dikosongkan
                  </span>
                )}
              </div>

              {preview.canIssue && preview.fullNumber ? (
                <>
                  <p className="text-xl font-mono font-semibold text-slate-900 tabular-nums tracking-tight">
                    {preview.fullNumber}
                  </p>
                  <div className="flex items-start gap-2 mt-2 text-xs text-slate-600">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="tabular-nums">
                      Alokasi tanggal {formatTanggalIndonesia(letterDate)}:{' '}
                      <strong>
                        No. {formatSequenceCode(preview.startSeq!, 0, settings.padDigits)} –{' '}
                        {formatSequenceCode(preview.endSeq!, 0, settings.padDigits)}
                      </strong>{' '}
                      (maks. {DAILY_QUOTA} nomor/hari kerja).
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-3 mt-1">
                  <div className="flex items-start gap-2 text-xs text-amber-900 leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{preview.blockedReason}</span>
                  </div>
                  {preview.nearestWorkingDate && preview.nearestWorkingDate !== letterDate && (
                    <button
                      type="button"
                      onClick={() => setLetterDate(preview.nearestWorkingDate)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
                    >
                      Gunakan Hari Kerja Terdekat ({formatTanggalIndonesia(preview.nearestWorkingDate)})
                    </button>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Surat
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={letterDate}
                    onChange={(e) => setLetterDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kode Klasifikasi
                </label>
                <select
                  value={classificationCode}
                  onChange={(e) => setClassificationCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                >
                  {activeClassifications.map((cls) => (
                    <option key={cls.id} value={cls.code}>
                      {cls.code} — {cls.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jenis Surat
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LetterCategory)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                >
                  {LETTER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pengolah / Penandatangan
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={picName}
                  onChange={(e) => setPicName(e.target.value)}
                  placeholder="Nama penanggung jawab surat"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Perihal / Pokok Surat
              </label>
              <input
                type="text"
                required
                maxLength={300}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Contoh: Surat Tugas Pendampingan Bimbingan Teknis Budidaya Padi"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tujuan / Penerima Surat
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Contoh: Kepala Dinas Pertanian Kabupaten / Kelompok Tani Maju"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nomor kegiatan, lampiran, atau keterangan arsip..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Dicatat oleh {profile.displayName} · {profile.division}
              </p>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !preview.canIssue}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {submitting ? 'Memproses...' : 'Terbitkan Nomor Surat'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
