import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Ban,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  FileUp,
  HardDrive,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteDriveFile,
  DriveAuthError,
  ensureArchiveFolder,
  uploadFileToDrive,
} from '../services/googleDriveService';
import { formatSequenceCode, formatTanggalIndonesia } from '../lib/numbering';
import {
  LETTER_CATEGORIES,
  type LetterCategory,
  type OutgoingLetter,
  type StaffProfile,
} from '../types/letter';

interface LetterDetailDrawerProps {
  letter: OutgoingLetter;
  profile: StaffProfile;
  isAdmin: boolean;
  padDigits: number;
  driveToken: string | null;
  onConnectDrive: () => Promise<string>;
  onTokenExpired: () => void;
  onAttachDriveFile: (params: {
    letterId: string;
    driveFileId: string;
    driveFileName: string;
    driveWebViewLink: string;
  }) => Promise<void>;
  onClearDriveFile: (letterId: string) => Promise<void>;
  onUpdate: (payload: {
    letterId: string;
    category: LetterCategory;
    subject: string;
    recipient: string;
    picName: string;
    notes: string;
  }) => Promise<void>;
  onVoid: (payload: { letterId: string; cancelReason: string }) => Promise<void>;
  onClose: () => void;
}

export function LetterDetailDrawer({
  letter,
  profile,
  isAdmin,
  padDigits,
  driveToken,
  onConnectDrive,
  onTokenExpired,
  onAttachDriveFile,
  onClearDriveFile,
  onUpdate,
  onVoid,
  onClose,
}: LetterDetailDrawerProps) {
  const canModify =
    (isAdmin || letter.createdByUid === profile.uid) && letter.status === 'terbit';

  const [mode, setMode] = useState<'view' | 'edit' | 'void'>('view');
  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState<LetterCategory>(letter.category);
  const [subject, setSubject] = useState(letter.subject);
  const [recipient, setRecipient] = useState(letter.recipient);
  const [picName, setPicName] = useState(letter.picName);
  const [notes, setNotes] = useState(letter.notes);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDrive, setUploadingDrive] = useState(false);
  const [confirmRemoveDrive, setConfirmRemoveDrive] = useState(false);
  const [removingDrive, setRemovingDrive] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter.fullNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onUpdate({
        letterId: letter.id,
        category,
        subject: subject.trim(),
        recipient: recipient.trim(),
        picName: picName.trim(),
        notes: notes.trim(),
      });
      setMode('view');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui data surat.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (cancelReason.trim().length < 3) {
      setError('Alasan pembatalan minimal 3 karakter.');
      return;
    }
    setSubmitting(true);
    try {
      await onVoid({ letterId: letter.id, cancelReason: cancelReason.trim() });
      setMode('view');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membatalkan nomor surat.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadDriveFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploadingDrive(true);
    try {
      const token = driveToken ?? (await onConnectDrive());
      const folderInfo = await ensureArchiveFolder(token, letter.year);
      const safeFileName = `[${letter.fullNumber.replace(/[\\/]/g, '-')}] ${file.name}`;
      const uploaded = await uploadFileToDrive({
        accessToken: token,
        file,
        fileName: safeFileName,
        mimeType: file.type || 'application/octet-stream',
        folderId: folderInfo.targetFolderId,
        description: `Arsip surat ${letter.fullNumber} - ${letter.subject}`,
      });
      await onAttachDriveFile({
        letterId: letter.id,
        driveFileId: uploaded.id,
        driveFileName: uploaded.name,
        driveWebViewLink:
          uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
      });
    } catch (err) {
      if (err instanceof DriveAuthError) onTokenExpired();
      setError(
        err instanceof Error ? err.message : 'Gagal mengunggah berkas ke Google Drive.',
      );
    } finally {
      setUploadingDrive(false);
    }
  };

  const handleConfirmDeleteDriveAttachment = async () => {
    setError(null);
    setRemovingDrive(true);
    try {
      if (letter.driveFileId) {
        const token = driveToken ?? (await onConnectDrive());
        await deleteDriveFile(token, letter.driveFileId);
      }
      await onClearDriveFile(letter.id);
      setConfirmRemoveDrive(false);
    } catch (err) {
      if (err instanceof DriveAuthError) onTokenExpired();
      setError(
        err instanceof Error ? err.message : 'Gagal menghapus berkas dari Google Drive.',
      );
    } finally {
      setRemovingDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[1px] flex justify-end">
      <div className="w-full max-w-xl bg-white h-full border-l border-slate-200 flex flex-col shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Detail Arsip Surat Keluar</p>
            <h2 className="text-base font-semibold text-slate-900 font-mono tabular-nums mt-0.5">
              {letter.fullNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Nomor Urut & Status</p>
              <div className="flex items-center gap-2 mt-1 text-sm">
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  #{formatSequenceCode(letter.sequenceNumber, letter.subNumber, padDigits)}
                </span>
                {letter.subNumber > 0 && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-amber-700 font-medium">Sisipan Kronologis</span>
                  </>
                )}
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span
                  className={
                    letter.status === 'terbit'
                      ? 'text-emerald-700 font-semibold'
                      : 'text-red-700 font-semibold'
                  }
                >
                  {letter.status === 'terbit' ? 'Terbit' : 'Dibatalkan'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Disalin' : 'Salin Nomor'}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          {mode === 'view' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Tanggal Surat</p>
                  <p className="text-sm font-medium text-slate-900 mt-1 tabular-nums">
                    {formatTanggalIndonesia(letter.letterDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kode Klasifikasi & Jenis</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">
                    <span className="font-mono">{letter.classificationCode}</span> · {letter.category}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">Perihal Surat</p>
                <p className="text-sm font-medium text-slate-900 mt-1 leading-relaxed">
                  {letter.subject}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Tujuan / Penerima</p>
                <p className="text-sm text-slate-800 mt-1">{letter.recipient}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Pengolah / Penandatangan</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{letter.picName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Dicatat Oleh</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{letter.createdByName}</p>
                  <p className="text-xs text-slate-500">{letter.createdByDivision}</p>
                </div>
              </div>

              {letter.notes && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500">Catatan Tambahan</p>
                  <p className="text-sm text-slate-700 mt-1 leading-relaxed">{letter.notes}</p>
                </div>
              )}

              {letter.status === 'batal' && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs font-semibold text-red-800">Alasan Pembatalan Nomor</p>
                  <p className="text-sm text-red-900 mt-1">{letter.cancelReason}</p>
                </div>
              )}

              {/* Google Drive Storage Attachment Section */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-700" />
                    <p className="text-xs font-semibold text-slate-700">
                      Arsip Berkas di Google Drive
                    </p>
                  </div>
                </div>

                {letter.driveWebViewLink ? (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 break-all">
                          {letter.driveFileName || 'Berkas Surat di Google Drive'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tersimpan di folder arsip Google Drive
                        </p>
                      </div>
                      <a
                        href={letter.driveWebViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Buka di Drive
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {canModify && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <FileUp className="w-3.5 h-3.5" />
                          <span>{uploadingDrive ? 'Mengunggah...' : 'Unggah Ulang Berkas'}</span>
                          <input
                            type="file"
                            disabled={uploadingDrive}
                            onChange={(e) => void handleUploadDriveFile(e)}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveDrive(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus dari Drive
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-600">
                      Belum ada berkas PDF/Word yang disimpan di Google Drive untuk nomor ini.
                    </p>
                    {canModify && (
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap shrink-0">
                        <FileUp className="w-3.5 h-3.5" />
                        <span>
                          {uploadingDrive
                            ? 'Mengunggah...'
                            : driveToken
                              ? 'Simpan ke Google Drive'
                              : 'Hubungkan & Unggah ke Drive'}
                        </span>
                        <input
                          type="file"
                          disabled={uploadingDrive}
                          onChange={(e) => void handleUploadDriveFile(e)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {confirmRemoveDrive && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-3">
                    <p className="text-xs font-semibold text-red-900">
                      Konfirmasi Penghapusan Berkas Google Drive
                    </p>
                    <p className="text-xs text-red-800 leading-relaxed">
                      Apakah Anda yakin ingin menghapus berkas{' '}
                      <strong>{letter.driveFileName}</strong> dari Google Drive dan melepaskan tautannya dari nomor surat ini?
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={removingDrive}
                        onClick={() => setConfirmRemoveDrive(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={removingDrive}
                        onClick={() => void handleConfirmDeleteDriveAttachment()}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg cursor-pointer"
                      >
                        {removingDrive ? 'Menghapus...' : 'Ya, Hapus Berkas'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'edit' && (
            <form id="edit-letter-form" onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jenis Surat
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LetterCategory)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
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
                  Perihal Surat
                </label>
                <input
                  type="text"
                  required
                  maxLength={300}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tujuan / Penerima
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
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
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Catatan
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg resize-none"
                />
              </div>
              <p className="text-xs text-slate-500">
                Nomor surat dan tanggal surat bersifat permanen demi menjaga keutuhan urutan arsip.
              </p>
            </form>
          )}

          {mode === 'void' && (
            <form id="void-letter-form" onSubmit={handleVoidSubmit} className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                Pembatalan akan menandai nomor ini sebagai <strong>Dibatalkan</strong> di buku agenda agar tidak ada kekosongan nomor yang membingungkan di kemudian hari.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Alasan Pembatalan
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={300}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Kegiatan ditunda / salah pilih klasifikasi surat"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg resize-none"
                />
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          {mode === 'view' ? (
            <>
              {canModify ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('edit')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Ubah Keterangan
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('void')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Batalkan Nomor
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500">
                  {letter.status === 'batal'
                    ? 'Nomor berstatus dibatalkan'
                    : 'Hanya pembuat atau koordinator yang dapat mengubah'}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </>
          ) : mode === 'edit' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('view');
                  setError(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="edit-letter-form"
                disabled={submitting}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('view');
                  setError(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                form="void-letter-form"
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {submitting ? 'Memproses...' : 'Konfirmasi Pembatalan'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
