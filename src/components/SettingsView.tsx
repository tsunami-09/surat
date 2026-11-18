import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatFullLetterNumber } from '../lib/numbering';
import type { ClassificationCode, SystemSettings } from '../types/letter';

interface SettingsViewProps {
  settings: SystemSettings;
  classifications: ClassificationCode[];
  customClassifications: ClassificationCode[];
  isAdmin: boolean;
  onSaveSettings: (data: {
    institutionName: string;
    unitCode: string;
    numberFormat: string;
    padDigits: number;
  }) => Promise<void>;
  onSaveClassification: (data: {
    code: string;
    label: string;
    description: string;
    active: boolean;
    existingId?: string;
  }) => Promise<void>;
  onDeleteClassification: (id: string) => Promise<void>;
}

export function SettingsView({
  settings,
  classifications,
  customClassifications,
  isAdmin,
  onSaveSettings,
  onSaveClassification,
  onDeleteClassification,
}: SettingsViewProps) {
  const [institutionName, setInstitutionName] = useState(settings.institutionName);
  const [unitCode, setUnitCode] = useState(settings.unitCode);
  const [numberFormat, setNumberFormat] = useState(settings.numberFormat);
  const [padDigits, setPadDigits] = useState(settings.padDigits);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsErr, setSettingsErr] = useState<string | null>(null);

  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [addingCls, setAddingCls] = useState(false);
  const [clsError, setClsError] = useState<string | null>(null);

  const previewSample = formatFullLetterNumber({
    classificationCode: '400',
    sequenceNumber: 12,
    subNumber: 0,
    unitCode: unitCode || settings.unitCode,
    month: 11,
    year: new Date().getFullYear(),
    settings: {
      institutionName,
      unitCode: unitCode || settings.unitCode,
      numberFormat: numberFormat || settings.numberFormat,
      padDigits,
    },
  });

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSettingsMsg(null);
    setSettingsErr(null);
    setSavingSettings(true);
    try {
      await onSaveSettings({
        institutionName: institutionName.trim(),
        unitCode: unitCode.trim(),
        numberFormat: numberFormat.trim(),
        padDigits,
      });
      setSettingsMsg('Konfigurasi format nomor surat berhasil disimpan.');
    } catch (err) {
      setSettingsErr(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddClassification = async (e: FormEvent) => {
    e.preventDefault();
    setClsError(null);
    setAddingCls(true);
    try {
      await onSaveClassification({
        code: newCode.trim(),
        label: newLabel.trim(),
        description: newDesc.trim(),
        active: true,
      });
      setNewCode('');
      setNewLabel('');
      setNewDesc('');
    } catch (err) {
      setClsError(err instanceof Error ? err.message : 'Gagal menambahkan kode klasifikasi.');
    } finally {
      setAddingCls(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Klasifikasi & Format Penomoran</h2>
        <p className="text-sm text-slate-500">
          Standar pola nomor surat keluar dan daftar kode klasifikasi resmi UPT Pelatihan Pertanian.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Format Settings */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Format Nomor Surat</h3>
          <p className="text-xs text-slate-500 mb-5">
            {isAdmin
              ? 'Sesuaikan kode unit dan pola penomoran dinas.'
              : 'Hanya Koordinator / Admin yang dapat mengubah format global.'}
          </p>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mb-5">
            <p className="text-xs text-slate-500">Contoh Hasil Format</p>
            <p className="text-base font-mono font-semibold text-slate-900 tabular-nums mt-1">
              {previewSample}
            </p>
          </div>

          {settingsMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              {settingsMsg}
            </div>
          )}
          {settingsErr && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {settingsErr}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Instansi / UPT
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                maxLength={120}
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kode Unit Kerja
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  maxLength={32}
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Digit Nomor Urut
                </label>
                <select
                  disabled={!isAdmin}
                  value={padDigits}
                  onChange={(e) => setPadDigits(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value={2}>2 digit (01)</option>
                  <option value={3}>3 digit (001)</option>
                  <option value={4}>4 digit (0001)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pola Template
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                maxLength={100}
                value={numberFormat}
                onChange={(e) => setNumberFormat(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-lg disabled:bg-slate-50 disabled:text-slate-500"
              />
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Variabel tersedia: {'{klasifikasi}'}, {'{urut}'}, {'{unit}'}, {'{bulanRomawi}'}, {'{bulan}'}, {'{tahun}'}
              </p>
            </div>

            {isAdmin && (
              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan Format'}
              </button>
            )}
          </form>
        </div>

        {/* Classification Directory */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Kode Klasifikasi Surat</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar kode klasifikasi aktif yang dapat dipilih staf saat mengambil nomor surat.
            </p>
          </div>

          {isAdmin && (
            <form
              onSubmit={handleAddClassification}
              className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
            >
              <p className="text-xs font-semibold text-slate-700">Tambah Kode Klasifikasi Khusus</p>
              {clsError && (
                <p className="text-xs text-red-700">{clsError}</p>
              )}
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="Kode (mis. 521.1)"
                  className="px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white"
                />
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Nama Klasifikasi"
                  className="sm:col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  maxLength={300}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Keterangan singkat penggunaan kode (opsional)"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                />
                <button
                  type="submit"
                  disabled={addingCls}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {addingCls ? 'Menambahkan...' : 'Tambah Kode'}
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-200">
            {classifications.map((cls) => {
              const isCustom = customClassifications.some((c) => c.id === cls.id);
              return (
                <div key={cls.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {cls.code}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-sm font-medium text-slate-800">{cls.label}</span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs text-slate-500">
                        {isCustom ? 'Tambahan UPT' : 'Standar'}
                      </span>
                    </div>
                    {cls.description && (
                      <p className="text-xs text-slate-500 mt-1">{cls.description}</p>
                    )}
                  </div>
                  {isAdmin && isCustom && (
                    <button
                      type="button"
                      onClick={() => void onDeleteClassification(cls.id)}
                      title="Hapus klasifikasi khusus"
                      className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
