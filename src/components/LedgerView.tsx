import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  Search,
} from 'lucide-react';
import { buildYearSchedule, getDayAllocation } from '../lib/calendar';
import {
  exportLettersToCsv,
  formatSequenceCode,
  formatTanggalIndonesia,
  getTodayIsoDate,
  INDONESIAN_MONTHS,
} from '../lib/numbering';
import {
  DAILY_QUOTA,
  type CalendarHoliday,
  type ClassificationCode,
  type DailyCounter,
  type OutgoingLetter,
  type SystemSettings,
} from '../types/letter';

interface LedgerViewProps {
  letters: OutgoingLetter[];
  loading: boolean;
  settings: SystemSettings;
  classifications: ClassificationCode[];
  dailyCounters: Record<string, DailyCounter>;
  customHolidays: Record<string, CalendarHoliday>;
  onOpenIssueModal: () => void;
  onSelectLetter: (letter: OutgoingLetter) => void;
}

export function LedgerView({
  letters,
  loading,
  settings,
  classifications,
  dailyCounters,
  customHolidays,
  onOpenIssueModal,
  onSelectLetter,
}: LedgerViewProps) {
  const todayIso = getTodayIsoDate();
  const currentYear = Number(todayIso.slice(0, 4));
  const currentMonth = Number(todayIso.slice(5, 7));

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'terbit' | 'batal'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear, currentYear + 1]);
    for (const l of letters) years.add(l.year);
    return Array.from(years).sort((a, b) => b - a);
  }, [letters, currentYear]);

  const lettersInSelectedYear = useMemo(
    () => letters.filter((l) => l.year === selectedYear),
    [letters, selectedYear],
  );

  const todayAlloc = useMemo(
    () => getDayAllocation(todayIso, customHolidays),
    [todayIso, customHolidays],
  );

  const yearScheduleStats = useMemo(() => {
    const schedule = buildYearSchedule(selectedYear, customHolidays);
    const workingDays = schedule.filter((d) => d.status === 'hari_kerja');
    const holidayDays = schedule.filter((d) => d.status !== 'hari_kerja');
    const lastDay = workingDays[workingDays.length - 1];
    return {
      workingDayCount: workingDays.length,
      holidayCount: holidayDays.length,
      maxNumberInYear: lastDay?.endSeq ?? 0,
    };
  }, [selectedYear, customHolidays]);

  const stats = useMemo(() => {
    const todayCounter = dailyCounters[todayIso];
    const todayUsed = todayCounter?.usedCount ?? 0;
    const isTodayWorking = todayAlloc?.status === 'hari_kerja';
    const nextTodayNum =
      isTodayWorking && todayAlloc?.startSeq !== null && todayUsed < DAILY_QUOTA
        ? formatSequenceCode(todayAlloc.startSeq + todayUsed, 0, settings.padDigits)
        : '—';

    const activeThisMonth = lettersInSelectedYear.filter(
      (l) => l.month === currentMonth && l.status === 'terbit',
    ).length;
    const totalActive = lettersInSelectedYear.filter((l) => l.status === 'terbit').length;

    return {
      isTodayWorking,
      todayHolidayName: todayAlloc?.holidayName ?? null,
      todayUsed,
      todayRange:
        isTodayWorking && todayAlloc?.startSeq !== null && todayAlloc?.endSeq !== null
          ? `${formatSequenceCode(todayAlloc.startSeq, 0, settings.padDigits)}–${formatSequenceCode(todayAlloc.endSeq, 0, settings.padDigits)}`
          : 'Kosong (Libur)',
      nextTodayNum,
      activeThisMonth,
      totalActive,
      totalRecords: lettersInSelectedYear.length,
    };
  }, [
    dailyCounters,
    todayIso,
    todayAlloc,
    lettersInSelectedYear,
    currentMonth,
    settings.padDigits,
  ]);

  const filteredLetters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = lettersInSelectedYear.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (selectedMonth !== 'all' && l.month !== selectedMonth) return false;
      if (selectedClass !== 'all' && l.classificationCode !== selectedClass) return false;
      if (q) {
        const hay = `${l.fullNumber} ${l.subject} ${l.recipient} ${l.picName} ${l.createdByName} ${l.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const seqDiff = a.sequenceNumber - b.sequenceNumber;
      const cmp = seqDiff !== 0 ? seqDiff : a.letterDate.localeCompare(b.letterDate);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [
    lettersInSelectedYear,
    searchQuery,
    statusFilter,
    selectedMonth,
    selectedClass,
    sortOrder,
  ]);

  const handleCopyNumber = async (id: string, fullNumber: string) => {
    try {
      await navigator.clipboard.writeText(fullNumber);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleExportCsv = () => {
    const csv = exportLettersToCsv(filteredLetters);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-surat-keluar-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 4-Column Summary Strip (Single Elevation, Hairline Dividers) */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">
            Alokasi Hari Ini ({formatTanggalIndonesia(todayIso)})
          </p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1.5">
            {stats.isTodayWorking ? `${stats.todayUsed} / ${DAILY_QUOTA}` : 'Kosong'}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {stats.isTodayWorking
              ? `Rentang nomor: ${stats.todayRange}`
              : stats.todayHolidayName || 'Akhir Pekan / Libur'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Nomor Berikutnya Hari Ini</p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1.5">
            {stats.nextTodayNum}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.isTodayWorking
              ? `Tersisa ${Math.max(0, DAILY_QUOTA - stats.todayUsed)} slot hari ini`
              : 'Tidak ada nomor di hari libur'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">
            Rentang Tahun {selectedYear} (1 Jan–31 Des)
          </p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1.5">
            001 – {yearScheduleStats.maxNumberInYear.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {yearScheduleStats.workingDayCount} hari kerja · {yearScheduleStats.holidayCount} hari libur kosong
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Total Surat Tercatat ({selectedYear})</p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1.5">
            {stats.totalActive}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {stats.activeThisMonth} terbit bulan ini · {stats.totalRecords} total baris
          </p>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor surat, perihal, tujuan, atau pengolah..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'terbit', label: 'Terbit' },
                  { id: 'batal', label: 'Dibatalkan' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter Tahun"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 tabular-nums"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter Bulan"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700"
            >
              <option value="all">Semua Bulan</option>
              {INDONESIAN_MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter Klasifikasi"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 max-w-[180px]"
            >
              <option value="all">Semua Klasifikasi</option>
              {classifications.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortOrder === 'asc' ? 'Urut: 1 → Akhir' : 'Urut: Akhir → 1'}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredLetters.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor CSV
            </button>
          </div>
        </div>

        {/* High-Density Data Grid */}
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex items-center gap-4 animate-pulse">
                <div className="h-4 w-12 bg-slate-200 rounded" />
                <div className="h-4 w-44 bg-slate-200 rounded" />
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="h-4 flex-1 bg-slate-200 rounded" />
                <div className="h-4 w-24 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredLetters.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-base font-semibold text-slate-900">
              {letters.length === 0
                ? 'Belum Ada Nomor Surat Keluar Tercatat'
                : 'Tidak Ada Surat yang Sesuai Filter'}
            </p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {letters.length === 0
                ? 'Setiap hari kerja memiliki alokasi 15 nomor surat mulai 1 Januari hingga 31 Desember. Ambil nomor surat pertama untuk memulai.'
                : 'Ubah kata kunci pencarian atau pilih rentang bulan dan klasifikasi lainnya.'}
            </p>
            {letters.length === 0 && (
              <button
                type="button"
                onClick={onOpenIssueModal}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                Ambil Nomor Surat
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Urut</th>
                  <th className="py-3 px-4 whitespace-nowrap">Nomor Surat</th>
                  <th className="py-3 px-4 whitespace-nowrap">Tanggal</th>
                  <th className="py-3 px-4">Perihal & Jenis</th>
                  <th className="py-3 px-4">Tujuan</th>
                  <th className="py-3 px-4 whitespace-nowrap">Pengolah / Pencatat</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredLetters.map((letter) => (
                  <tr
                    key={letter.id}
                    onClick={() => onSelectLetter(letter)}
                    className={`group hover:bg-slate-50 transition-colors cursor-pointer ${
                      letter.status === 'batal' ? 'bg-slate-50/50 text-slate-500' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap align-top">
                      {formatSequenceCode(letter.sequenceNumber, letter.subNumber, settings.padDigits)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap align-top">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs font-semibold tabular-nums ${
                            letter.status === 'batal'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900'
                          }`}
                        >
                          {letter.fullNumber}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleCopyNumber(letter.id, letter.fullNumber);
                          }}
                          title="Salin nomor surat"
                          aria-label={`Salin ${letter.fullNumber}`}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-emerald-700 rounded transition-opacity cursor-pointer"
                        >
                          {copiedId === letter.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 tabular-nums whitespace-nowrap align-top">
                      {formatTanggalIndonesia(letter.letterDate)}
                    </td>
                    <td className="py-3 px-4 align-top max-w-md">
                      <p
                        className={`text-sm font-medium line-clamp-2 ${
                          letter.status === 'batal' ? 'text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {letter.subject}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                        <span>
                          {letter.category} · Kode {letter.classificationCode}
                        </span>
                        {letter.driveWebViewLink && (
                          <a
                            href={letter.driveWebViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium underline underline-offset-2"
                          >
                            Arsip Drive
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 align-top max-w-[200px]">
                      <span className="line-clamp-2">{letter.recipient}</span>
                    </td>
                    <td className="py-3 px-4 text-xs align-top whitespace-nowrap">
                      <p className="font-medium text-slate-800">{letter.picName}</p>
                      <p className="text-slate-500">Dicatat: {letter.createdByName}</p>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-right whitespace-nowrap align-top">
                      <span
                        className={
                          letter.status === 'terbit' ? 'text-emerald-700' : 'text-red-700'
                        }
                      >
                        {letter.status === 'terbit' ? 'Terbit' : 'Dibatalkan'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
