import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  ExternalLink,
  FileArchive,
  FileUp,
  FolderOpen,
  HardDrive,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteDriveFile,
  DRIVE_ROOT_FOLDER_NAME,
  DriveAuthError,
  ensureArchiveFolder,
  formatDriveFileSize,
  listDriveArchiveFiles,
  renameDriveFile,
  uploadFileToDrive,
} from '../services/googleDriveService';
import { exportLettersToCsv, formatTanggalIndonesia, getTodayIsoDate } from '../lib/numbering';
import type { DriveFileItem, OutgoingLetter } from '../types/letter';

interface DriveStorageViewProps {
  userEmail: string;
  driveToken: string | null;
  letters: OutgoingLetter[];
  onConnectDrive: () => Promise<string>;
  onTokenExpired: () => void;
  onAttachToLetter: (params: {
    letterId: string;
    driveFileId: string;
    driveFileName: string;
    driveWebViewLink: string;
  }) => Promise<void>;
  onClearLetterAttachment: (letterId: string) => Promise<void>;
}

export function DriveStorageView({
  userEmail,
  driveToken,
  letters,
  onConnectDrive,
  onTokenExpired,
  onAttachToLetter,
  onClearLetterAttachment,
}: DriveStorageViewProps) {
  const currentYear = Number(getTodayIsoDate().slice(0, 4));
  const [connecting, setConnecting] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [rootFolderUrl, setRootFolderUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLetterId, setSelectedLetterId] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // CSV backup state
  const [backupYear, setBackupYear] = useState<number | 'all'>(currentYear);
  const [backingUp, setBackingUp] = useState(false);

  // Confirmation modals for mutating/destructive Drive API calls
  const [deleteTarget, setDeleteTarget] = useState<DriveFileItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DriveFileItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const activeLetters = useMemo(
    () =>
      letters
        .filter((l) => l.status === 'terbit')
        .sort((a, b) => b.sequenceNumber - a.sequenceNumber),
    [letters],
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    for (const l of letters) years.add(l.year);
    return Array.from(years).sort((a, b) => b - a);
  }, [letters, currentYear]);

  const letterByDriveFileId = useMemo(() => {
    const map = new Map<string, OutgoingLetter>();
    for (const l of letters) {
      if (l.driveFileId) {
        map.set(l.driveFileId, l);
      }
    }
    return map;
  }, [letters]);

  const loadDriveData = useCallback(
    async (token: string) => {
      setLoadingFiles(true);
      setError(null);
      try {
        const folderInfo = await ensureArchiveFolder(token);
        setRootFolderId(folderInfo.rootFolderId);
        setRootFolderUrl(folderInfo.rootFolderUrl);
        const list = await listDriveArchiveFiles(token);
        setFiles(list);
      } catch (err) {
        if (err instanceof DriveAuthError) {
          onTokenExpired();
        }
        setError(
          err instanceof Error ? err.message : 'Gagal memuat berkas dari Google Drive.',
        );
      } finally {
        setLoadingFiles(false);
      }
    },
    [onTokenExpired],
  );

  useEffect(() => {
    if (driveToken) {
      void loadDriveData(driveToken);
    } else {
      setFiles([]);
      setRootFolderId(null);
      setRootFolderUrl(null);
    }
  }, [driveToken, loadDriveData]);

  const handleConnect = async () => {
    setError(null);
    setConnecting(true);
    try {
      await onConnectDrive();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menghubungkan akun Google Drive.',
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    setError(null);
    setSuccessMsg(null);
  };

  const handleUploadFile = async () => {
    if (!driveToken || !selectedFile) return;
    setError(null);
    setSuccessMsg(null);
    setUploading(true);
    try {
      const targetLetter = activeLetters.find((l) => l.id === selectedLetterId) ?? null;
      const targetYear = targetLetter?.year ?? currentYear;
      const folderInfo = await ensureArchiveFolder(driveToken, targetYear);
      setRootFolderId(folderInfo.rootFolderId);
      setRootFolderUrl(folderInfo.rootFolderUrl);

      const finalFileName = targetLetter
        ? `[${targetLetter.fullNumber.replace(/[\\/]/g, '-')}] ${selectedFile.name}`
        : selectedFile.name;

      const uploaded = await uploadFileToDrive({
        accessToken: driveToken,
        file: selectedFile,
        fileName: finalFileName,
        mimeType: selectedFile.type || 'application/octet-stream',
        folderId: folderInfo.targetFolderId,
        description: targetLetter
          ? `Arsip surat ${targetLetter.fullNumber} - ${targetLetter.subject}`
          : 'Arsip berkas UPT Pelatihan Pertanian',
      });

      if (targetLetter && uploaded.webViewLink) {
        await onAttachToLetter({
          letterId: targetLetter.id,
          driveFileId: uploaded.id,
          driveFileName: uploaded.name,
          driveWebViewLink: uploaded.webViewLink,
        });
      }

      setSelectedFile(null);
      setSelectedLetterId('');
      setSuccessMsg(
        `Berkas "${uploaded.name}" berhasil disimpan ke Google Drive${targetLetter ? ` dan ditautkan ke nomor ${targetLetter.fullNumber}` : ''}.`,
      );
      await loadDriveData(driveToken);
    } catch (err) {
      if (err instanceof DriveAuthError) onTokenExpired();
      setError(err instanceof Error ? err.message : 'Gagal mengunggah berkas ke Google Drive.');
    } finally {
      setUploading(false);
    }
  };

  const handleBackupCsv = async () => {
    if (!driveToken) return;
    setError(null);
    setSuccessMsg(null);
    setBackingUp(true);
    try {
      const targetLetters =
        backupYear === 'all'
          ? letters
          : letters.filter((l) => l.year === backupYear);
      const csv = exportLettersToCsv(targetLetters);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const folderInfo = await ensureArchiveFolder(
        driveToken,
        backupYear === 'all' ? undefined : backupYear,
      );
      const labelYear = backupYear === 'all' ? 'Semua-Tahun' : String(backupYear);
      const fileName = `Rekap-Agenda-Surat-${labelYear}-${getTodayIsoDate()}.csv`;

      const uploaded = await uploadFileToDrive({
        accessToken: driveToken,
        file: blob,
        fileName,
        mimeType: 'text/csv',
        folderId: folderInfo.targetFolderId,
        description: `Cadangan buku agenda surat keluar UPT Pelatihan Pertanian (${targetLetters.length} baris)`,
      });

      setSuccessMsg(`Cadangan CSV "${uploaded.name}" berhasil disimpan ke Google Drive.`);
      await loadDriveData(driveToken);
    } catch (err) {
      if (err instanceof DriveAuthError) onTokenExpired();
      setError(
        err instanceof Error ? err.message : 'Gagal mencadangkan CSV ke Google Drive.',
      );
    } finally {
      setBackingUp(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!driveToken || !deleteTarget) return;
    setError(null);
    setSuccessMsg(null);
    setDeleting(true);
    try {
      await deleteDriveFile(driveToken, deleteTarget.id);
      const linkedLetter = letterByDriveFileId.get(deleteTarget.id);
      if (linkedLetter) {
        await onClearLetterAttachment(linkedLetter.id);
      }
      setSuccessMsg(`Berkas "${deleteTarget.name}" telah dihapus dari Google Drive.`);
      setDeleteTarget(null);
      await loadDriveData(driveToken);
    } catch (err) {
      if (err instanceof DriveAuthError) onTokenExpired();
      setError(
        err instanceof Error ? err.message : 'Gagal menghapus berkas dari Google Drive.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmRename = async () => {
    if (!driveToken || !renameTarget) return;
    const trimmed = renameValue.trim();
    if (trimmed.length < 2) {
      setError('Nama berkas minimal 2 karakter.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setRenaming(true);
    try {
      const updated = await renameDriveFile(driveToken, renameTarget.id, trimmed);
      const linkedLetter = letterByDriveFileId.get(renameTarget.id);
      if (linkedLetter && updated.webViewLink) {
        await onAttachToLetter({
          letterId: linkedLetter.id,
          driveFileId: updated.id,
          driveFileName: updated.name,
          driveWebViewLink: updated.webViewLink,
        });
      }
      setSuccessMsg(`Berkas berhasil diubah namanya menjadi "${updated.name}".`);
      setRenameTarget(null);
      await loadDriveData(driveToken);
    } catch (err) {
      if (err instanceof DriveAuthError) onTokenExpired();
      setError(
        err instanceof Error ? err.message : 'Gagal mengubah nama berkas di Google Drive.',
      );
    } finally {
      setRenaming(false);
    }
  };

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => {
      const linked = letterByDriveFileId.get(f.id);
      const hay = `${f.name} ${f.description ?? ''} ${linked?.fullNumber ?? ''} ${linked?.subject ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [files, searchQuery, letterByDriveFileId]);

  if (!driveToken) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Penyimpanan Google Drive Saya
          </h2>
          <p className="text-sm text-slate-500">
            Simpan dokumen PDF/Word surat keluar dan cadangan buku agenda langsung ke folder Google Drive Anda.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-2xl space-y-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-slate-900">
                Hubungkan Google Drive ({userEmail})
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dengan persetujuan Anda, aplikasi akan membuat folder khusus{' '}
                <strong className="text-slate-800">{DRIVE_ROOT_FOLDER_NAME}</strong> di Google Drive Anda untuk menyimpan berkas surat keluar serta ekspor cadangan buku agenda. Aplikasi hanya mengakses berkas yang dibuat atau dikelola melalui sistem ini.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={connecting}
            className="inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
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
            <span>
              {connecting ? 'Menghubungkan Google Drive...' : 'Hubungkan Google Drive Saya'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Penyimpanan Google Drive Saya
          </h2>
          <p className="text-sm text-slate-500">
            Terhubung ke <span className="font-medium text-slate-700">{userEmail}</span> · Folder{' '}
            <span className="font-medium text-slate-700">{DRIVE_ROOT_FOLDER_NAME}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rootFolderUrl && (
            <a
              href={rootFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/70 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FolderOpen className="w-4 h-4" />
              Buka Folder di Google Drive
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            disabled={loadingFiles}
            onClick={() => void loadDriveData(driveToken)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
            Muat Ulang
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          {successMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Upload Letter Document Card */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <FileUp className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              Unggah Berkas Surat ke Google Drive
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tautkan ke Nomor Surat (Opsional)
              </label>
              <select
                value={selectedLetterId}
                onChange={(e) => setSelectedLetterId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Simpan umum di folder arsip tahun {currentYear}</option>
                {activeLetters.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullNumber} — {l.subject.slice(0, 60)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Berkas (PDF, DOCX, Gambar, dll.)
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
              />
            </div>

            <div className="pt-1 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                {selectedFile
                  ? `Berkas dipilih: ${selectedFile.name}`
                  : 'Belum ada berkas yang dipilih.'}
              </p>
              <button
                type="button"
                disabled={!selectedFile || uploading}
                onClick={() => void handleUploadFile()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5" />
                {uploading ? 'Mengunggah...' : 'Simpan ke Google Drive'}
              </button>
            </div>
          </div>
        </div>

        {/* Backup Ledger CSV Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <FileArchive className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-slate-900">
                Cadangkan Buku Agenda ke Drive
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Simpan salinan rekap seluruh nomor surat keluar dalam format CSV langsung ke folder arsip Google Drive Anda sebagai cadangan berkala.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cakupan Tahun
              </label>
              <select
                value={backupYear}
                onChange={(e) =>
                  setBackupYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
                <option value="all">Semua Tahun</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={backingUp || letters.length === 0}
            onClick={() => void handleBackupCsv()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
          >
            <FileArchive className="w-4 h-4" />
            {backingUp ? 'Menyimpan Cadangan...' : 'Simpan Rekap CSV ke Google Drive'}
          </button>
        </div>
      </div>

      {/* Stored Files Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Berkas Tersimpan di Google Drive ({filteredFiles.length})
            </h3>
            {rootFolderId && (
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan berkas yang diunggah dan dikelola melalui aplikasi ini.
              </p>
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama berkas atau nomor surat..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>
        </div>

        {loadingFiles ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Memuat daftar berkas dari Google Drive...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-10 text-center space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              Belum Ada Berkas di Google Drive
            </p>
            <p className="text-xs text-slate-500">
              Unggah dokumen surat atau cadangkan buku agenda CSV untuk menyimpannya di Google Drive Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama Berkas</th>
                  <th className="py-3 px-4">Terkait Nomor Surat</th>
                  <th className="py-3 px-4 whitespace-nowrap">Ukuran</th>
                  <th className="py-3 px-4 whitespace-nowrap">Diperbarui</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredFiles.map((file) => {
                  const linked = letterByDriveFileId.get(file.id);
                  const modifiedDate = file.modifiedTime
                    ? formatTanggalIndonesia(file.modifiedTime.slice(0, 10))
                    : '—';
                  return (
                    <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900 break-all">{file.name}</p>
                        {file.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {file.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {linked ? (
                          <div>
                            <p className="font-mono font-semibold text-emerald-700 tabular-nums">
                              {linked.fullNumber}
                            </p>
                            <p className="text-slate-500 line-clamp-1">{linked.subject}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Umum / Cadangan</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDriveFileSize(file.size)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {modifiedDate}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-800 border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              Buka
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRenameTarget(file);
                              setRenameValue(file.name);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            Ubah Nama
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(file)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explicit Confirmation Modal for Deleting Drive File */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drive-delete-dialog-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="drive-delete-dialog-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Hapus Berkas dari Google Drive?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Konfirmasi diperlukan sebelum menghapus berkas di Google Drive.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                aria-label="Tutup dialog"
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm">
              <p className="font-semibold text-slate-900 break-all">{deleteTarget.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                Ukuran: {formatDriveFileSize(deleteTarget.size)}
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Berkas ini akan dihapus secara permanen dari Google Drive Anda dan tautannya dilepaskan dari buku agenda surat keluar.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus dari Drive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Confirmation Modal for Renaming Drive File */}
      {renameTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drive-rename-dialog-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="drive-rename-dialog-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Ubah Nama Berkas di Google Drive
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Nama berkas akan diperbarui langsung pada Google Drive Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                aria-label="Tutup dialog"
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Berkas Baru
              </label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={240}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={renaming}
                onClick={() => setRenameTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={renaming}
                onClick={() => void handleConfirmRename()}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {renaming ? 'Menyimpan...' : 'Simpan Nama Baru'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
