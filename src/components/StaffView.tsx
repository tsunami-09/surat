import { useState } from 'react';
import { UserCog } from 'lucide-react';
import type { StaffDirectoryEntry, StaffProfile, StaffRole } from '../types/letter';

interface StaffViewProps {
  staffList: StaffDirectoryEntry[];
  currentProfile: StaffProfile;
  isAdmin: boolean;
  onEditOwnProfile: () => void;
  onUpdateRoleAndStatus: (params: {
    targetUid: string;
    role: StaffRole;
    active: boolean;
  }) => Promise<void>;
}

export function StaffView({
  staffList,
  currentProfile,
  isAdmin,
  onEditOwnProfile,
  onUpdateRoleAndStatus,
}: StaffViewProps) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                          member.role === 'admin' ? 'text-emerald-700' : 'text-slate-600'
                        }
                      >
                        {member.role === 'admin' ? 'Koordinator / Admin' : 'Staf Administrasi'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        {!isSelf ? (
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
                        ) : (
                          <span className="text-xs text-slate-400">Akun aktif</span>
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
    </div>
  );
}
