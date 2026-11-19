import { useMemo, useState, type FormEvent } from 'react';
import { CalendarPlus, FilePlus2, RotateCcw, Trash2 } from 'lucide-react';
import {
  buildYearSchedule,
  getMergedHolidaysForYear,
  INDONESIAN_DAY_NAMES,
} from '../lib/calendar';
import {
  formatSequenceCode,
  formatTanggalIndonesia,
  getTodayIsoDate,
  INDONESIAN_MONTHS,
} from '../lib/numbering';
import {
  ACTIVE_PERIOD_END,
  ACTIVE_PERIOD_START,
  ACTIVE_PERIOD_YEAR,
  DAILY_QUOTA,
  type CalendarHoliday,
  type DailyCounter,
  type HolidayKind,
  type SystemSettings,
} from '../types/letter';

interface CalendarAllocationViewProps {
  settings: SystemSettings;
  dailyCounters: Record<string, DailyCounter>;
  customHolidays: Record<string, CalendarHoliday>;
  isAdmin: boolean;
  onIssueForDate: (isoDate: string) => void;
  onSaveHoliday: (params: {
    date: string;
    name: string;
    kind: HolidayKind;
    active: boolean;
  }) => Promise<void>;
  onRemoveHoliday: (date: string) => Promise<void>;
}

export function CalendarAllocationView({
  settings,
  dailyCounters,
  customHolidays,
  isAdmin,
  onIssueForDate,
  onSaveHoliday,
  onRemoveHoliday,
}: CalendarAllocationViewProps) {
  const todayIso = getTodayIsoDate();
  const currentYear = Number(todayIso.slice(0, 4));
  const currentMonth = Number(todayIso.slice(5, 7));

  const [selectedYear, setSelectedYear] = useState(ACTIVE_PERIOD_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(
    currentYear === ACTIVE_PERIOD_YEAR ? currentMonth : 1,
  );

  const [holidayDate, setHolidayDate] = useState(ACTIVE_PERIOD_START);
  const [holidayKind, setHolidayKind] = useState<HolidayKind>('tanggal_merah');
  const [holidayName, setHolidayName] = useState('');
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayErr, setHolidayErr] = useState<string | null>(null);

  const yearSchedule = useMemo(
    () => buildYearSchedule(selectedYear, customHolidays),
    [selectedYear, customHolidays],
  );

  const mergedHolidays = useMemo(
    () => getMergedHolidaysForYear(selectedYear, customHolidays),
    [selectedYear, customHolidays],
  );

  const filteredDays = useMemo(() => {
    if (selectedMonth === 'all') return yearSchedule;
    return yearSchedule.filter((d) => d.month === selectedMonth);
  }, [yearSchedule, selectedMonth]);

  const yearSummary = useMemo(() => {
    const working = yearSchedule.filter((d) => d.status === 'hari_kerja');
    const weekends = yearSchedule.filter((d) => d.status === 'akhir_pekan');
    const holidays = yearSchedule.filter(
      (d) => d.status === 'tanggal_merah' || d.status === 'cuti_bersama',
    );
    const totalNumbers = working.length * DAILY_QUOTA;
    return {
      workingCount: working.length,
      weekendCount: weekends.length,
      holidayCount: holidays.length,
      totalNumbers,
    };
  }, [yearSchedule]);

  const handleAddHoliday = async (e: FormEvent) => {
    e.preventDefault();
    setHolidayErr(null);
    if (holidayName.trim().length < 2) {
      setHolidayErr('Nama hari libur atau cuti bersama minimal 2 karakter.');
      return;
    }
    setSavingHoliday(true);
    try {
      await onSaveHoliday({
        date: holidayDate,
        name: holidayName.trim(),
        kind: holidayKind,
        active: true,
      });
      setHolidayName('');
    } catch (err) {
      setHolidayErr(err instanceof Error ? err.message : 'Gagal menyimpan tanggal libur.');
    } finally {
      setSavingHoliday(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Kalender Alokasi Nomor Harian ({selectedYear})
          </h2>
          <p className="text-sm text-slate-500">
            Alokasi tetap {DAILY_QUOTA} nomor per hari kerja mulai 2 Januari hingga 31 Desember {selectedYear}. Nomor dikosongkan pada Sabtu, Minggu, hari libur nasional, dan cuti bersama.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Pilih Tahun Kalender"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3.5 py-2 text-sm font-medium border border-slate-300 rounded-lg bg-white text-slate-800 tabular-nums"
          >
            {[ACTIVE_PERIOD_YEAR].map((yr) => (
              <option key={yr} value={yr}>
                Tahun {yr}
              </option>
            ))}
          </select>

          <select
            aria-label="Pilih Bulan Kalender"
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="px-3.5 py-2 text-sm font-medium border border-slate-300 rounded-lg bg-white text-slate-800"
          >
            <option value="all">Periode Penuh (2 Jan – 31 Des {selectedYear})</option>
            {INDONESIAN_MONTHS.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Total Hari Kerja</p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1.5">
            {yearSummary.workingCount} hari
          </p>
          <p className="text-xs text-slate-500 mt-1">Mendapat alokasi {DAILY_QUOTA} nomor/hari</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Rentang Nomor Tahunan</p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1.5">
            001 – {yearSummary.totalNumbers.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-slate-500 mt-1">2 Januari s.d. 31 Desember {selectedYear}</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Sabtu & Minggu (Kosong)</p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1.5">
            {yearSummary.weekendCount} hari
          </p>
          <p className="text-xs text-slate-500 mt-1">Otomatis tanpa nomor surat</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Tanggal Merah & Cuti Bersama</p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1.5">
            {yearSummary.holidayCount} hari
          </p>
          <p className="text-xs text-slate-500 mt-1">Hari kerja terjepit libur nasional</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Daily Allocation Table */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Rincian Alokasi Nomor Per Tanggal
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {filteredDays.length} hari kalender
            </span>
          </div>

          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Tanggal</th>
                  <th className="py-3 px-4 whitespace-nowrap">Hari</th>
                  <th className="py-3 px-4 whitespace-nowrap">Rentang Nomor</th>
                  <th className="py-3 px-4 whitespace-nowrap">Terpakai</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredDays.map((entry) => {
                  const isWorking = entry.status === 'hari_kerja';
                  const counter = dailyCounters[entry.date];
                  const used = counter?.usedCount ?? 0;
                  const isToday = entry.date === todayIso;
                  const isFull = isWorking && used >= DAILY_QUOTA;

                  return (
                    <tr
                      key={entry.date}
                      className={
                        isToday
                          ? 'bg-emerald-50/60'
                          : isWorking
                            ? 'hover:bg-slate-50'
                            : 'bg-slate-50/70 text-slate-500'
                      }
                    >
                      <td className="py-2.5 px-4 text-xs font-mono font-medium tabular-nums whitespace-nowrap text-slate-800">
                        {formatTanggalIndonesia(entry.date)}
                        {isToday && (
                          <span className="ml-2 text-[11px] font-sans font-semibold text-emerald-700">
                            · Hari Ini
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                        {INDONESIAN_DAY_NAMES[entry.dayOfWeek]}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
                        {isWorking && entry.startSeq !== null && entry.endSeq !== null ? (
                          <span className="text-slate-900">
                            {formatSequenceCode(entry.startSeq, 0, settings.padDigits)} –{' '}
                            {formatSequenceCode(entry.endSeq, 0, settings.padDigits)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Kosong</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs tabular-nums whitespace-nowrap">
                        {isWorking ? (
                          <span className={isFull ? 'text-amber-700 font-semibold' : 'text-slate-700'}>
                            {used} / {DAILY_QUOTA}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {isWorking ? (
                          <span className="text-emerald-700 font-medium">
                            Hari Kerja #{entry.workingDayIndex}
                          </span>
                        ) : entry.status === 'akhir_pekan' ? (
                          <span className="text-slate-500">{entry.holidayName}</span>
                        ) : entry.status === 'cuti_bersama' ? (
                          <span className="text-amber-700 font-medium">
                            Cuti Bersama · {entry.holidayName}
                          </span>
                        ) : (
                          <span className="text-red-700 font-medium">
                            Tanggal Merah · {entry.holidayName}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {isWorking && !isFull && (
                          <button
                            type="button"
                            onClick={() => onIssueForDate(entry.date)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                          >
                            <FilePlus2 className="w-3 h-3" />
                            Ambil Nomor
                          </button>
                        )}
                        {isFull && (
                          <span className="text-xs text-amber-700 font-medium">Kuota Penuh</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Holidays & Cuti Bersama Manager */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Daftar Tanggal Merah & Cuti Bersama ({selectedYear})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Koordinator dapat menambah atau menyesuaikan tanggal libur nasional dan cuti bersama sesuai SKB terbaru.'
                : 'Daftar hari libur yang otomatis mengosongkan nomor surat.'}
            </p>
          </div>

          {isAdmin && (
            <form
              onSubmit={handleAddHoliday}
              className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
            >
              <p className="text-xs font-semibold text-slate-700">
                Tambah / Ubah Tanggal Libur
              </p>
              {holidayErr && <p className="text-xs text-red-700">{holidayErr}</p>}
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="date"
                  required
                  min={ACTIVE_PERIOD_START}
                  max={ACTIVE_PERIOD_END}
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
                <select
                  value={holidayKind}
                  onChange={(e) => setHolidayKind(e.target.value as HolidayKind)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="tanggal_merah">Tanggal Merah</option>
                  <option value="cuti_bersama">Cuti Bersama</option>
                </select>
              </div>
              <input
                type="text"
                required
                maxLength={120}
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="Nama hari libur / cuti bersama"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
              <button
                type="submit"
                disabled={savingHoliday}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                {savingHoliday ? 'Menyimpan...' : 'Simpan Tanggal Libur'}
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-200 max-h-[420px] overflow-y-auto">
            {mergedHolidays.map((h) => {
              const isOverriddenOff = !h.active;
              return (
                <div key={h.date} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-mono font-semibold tabular-nums ${
                        isOverriddenOff ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {formatTanggalIndonesia(h.date)}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        isOverriddenOff ? 'text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      {h.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {h.kind === 'cuti_bersama' ? 'Cuti Bersama' : 'Tanggal Merah'} ·{' '}
                      {h.isBuiltin ? 'Kalender Nasional' : 'Penyesuaian UPT'}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="shrink-0 flex items-center gap-1">
                      {h.isBuiltin ? (
                        <button
                          type="button"
                          onClick={() =>
                            void onSaveHoliday({
                              date: h.date,
                              name: h.name,
                              kind: h.kind,
                              active: false,
                            })
                          }
                          title="Jadikan hari kerja"
                          className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onRemoveHoliday(h.date)}
                          title={isOverriddenOff ? 'Kembalikan sebagai hari libur' : 'Hapus'}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        >
                          {isOverriddenOff ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
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
