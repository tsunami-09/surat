import { useState } from 'react';
import { RotateCcw, Trash2, UserCog, X } from 'lucide-react';
import type {
  RevokedUser,
  StaffDirectoryEntry,
  StaffProfile,
  StaffRole,
} from '../types/letter';

interface StaffViewProps {
  staffList: StaffDirectoryEntry[];
  revokedUsers: RevokedUser[];
  currentProfile: StaffProfile;
  isAdmin: boolean;
  onEditOwnProfile: () => void;
  onUpdateRoleAndStatus: (params: {
    targetUid: string;
    role: StaffRole;
    active: boolean;
  }) => Promise<void>;
  onDeleteUser: (params: { targetUid: string; displayName: string }) => Promise<void>;
  onRestoreUser: (targetUid: string) => Promise<void>;
}

export function StaffView({
  staffList,
  revokedUsers,
  currentProfile,
  isAdmin,
  onEditOwnProfile,
  onUpdateRoleAndStatus,
  onDeleteUser,
  onRestoreUser,
}: StaffViewProps) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] =
    useState<StaffDirectoryEntry | null>(null);

  const handleToggleRole = async (member: StaffDirectoryEntry) => {
    setError(null);
    setBusyUid(member.uid);
    try {
      const nextRole: StaffRole = member.role === 'admin' ? 'staff' : 'admin';
      await onUpdateRoleAndStatus({
        targetUid: member.uid,
        role: nextRole,
        active: member.active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui peran staf.');
    } finally {
      setBusyUid(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget) return;
    setError(null);
    setBusyUid(confirmDeleteTarget.uid);
    try {
      await onDeleteUser({
        targetUid: confirmDeleteTarget.uid,
        displayName: confirmDeleteTarget.displayName,
      });
      setConfirmDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus akun pengguna.');
    } finally {
      setBusyUid(null);
    }
  };

  const handleRestore = async (revoked: RevokedUser) => {
    setError(null);
    setBusyUid(revoked.uid);
    try {
      await onRestoreUser(revoked.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memulihkan akses pengguna.');
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Daftar Staf UPT Pelatihan Pertanian
          </h2>
          <p className="text-sm text-slate-500">
            Staf terintegrasi yang memiliki akses pencatatan nomor surat keluar secara real-time.
          </p>
        </div>

        <button
          type="button"
          onClick={onEditOwnProfile}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UserCog className="w-4 h-4" />
          Ubah Profil Saya
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Nama Staf</th>
                <th className="py-3 px-4">Subbagian / Seksi</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4">Peran Sistem</th>
                {isAdmin && <th className="py-3 px-4 text-right">Pengaturan Akses</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {staffList.map((member) => {
                const isSelf = member.uid === currentProfile.uid;
                const effectiveRole: StaffRole = isSelf && isAdmin ? 'admin' : member.role;
                return (
                  <tr key={member.uid} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {member.displayName}
                      {isSelf && (
                        <span className="text-xs text-emerald-700 font-semibold ml-2">
                          · Anda
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{member.division}</td>
                    <td className="py-3 px-4 text-xs text-slate-700">{member.jabatan}</td>
                    <td className="py-3 px-4 text-xs font-semibold">
                      <span
                        className={
                          effectiveRole === 'admin' ? 'text-emerald-700' : 'text-slate-600'
                        }
                      >
                        {effectiveRole === 'admin'
                          ? 'Koordinator / Admin'
                          : 'Staf Administrasi'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        {!isSelf ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={busyUid === member.uid}
                              onClick={() => void handleToggleRole(member)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {busyUid === member.uid
                                ? 'Memproses...'
                                : member.role === 'admin'
                                  ? 'Jadikan Staf Biasa'
                                  : 'Jadikan Koordinator'}
                            </button>
                            <button
                              type="button"
                              disabled={busyUid === member.uid}
                              onClick={() => setConfirmDeleteTarget(member)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Hapus Akun
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-emerald-700">
                            Koordinator Utama
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && revokedUsers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Akun yang Dihapus / Diblokir ({revokedUsers.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Akun di bawah ini tidak dapat masuk atau mengambil nomor surat sebelum aksesnya dipulihkan oleh Koordinator.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama Pengguna</th>
                  <th className="py-3 px-4">ID Akun</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {revokedUsers.map((revoked) => (
                  <tr key={revoked.uid} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {revoked.displayName}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {revoked.uid}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={busyUid === revoked.uid}
                        onClick={() => void handleRestore(revoked)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {busyUid === revoked.uid ? 'Memulihkan...' : 'Pulihkan Akses'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDeleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-dialog-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="delete-user-dialog-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Hapus Akun Pengguna?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tindakan ini hanya dapat dilakukan oleh Koordinator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                aria-label="Tutup konfirmasi"
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm space-y-1">
              <p className="font-semibold text-slate-900">
                {confirmDeleteTarget.displayName}
              </p>
              <p className="text-xs text-slate-600">
                {confirmDeleteTarget.division} · {confirmDeleteTarget.jabatan}
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Akun ini akan dihapus dari daftar staf aktif dan diblokir agar tidak dapat mengakses sistem penomoran surat maupun mendaftar ulang. Riwayat nomor surat yang pernah diterbitkan tetap terjaga di buku agenda.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={busyUid === confirmDeleteTarget.uid}
                onClick={() => setConfirmDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busyUid === confirmDeleteTarget.uid}
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {busyUid === confirmDeleteTarget.uid
                  ? 'Menghapus...'
                  : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
