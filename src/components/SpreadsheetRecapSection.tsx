import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import {
  buildRecapRows,
  exportLettersToCsv,
  exportRecapToTsv,
  exportRecapToXlsx,
  INDONESIAN_MONTHS,
} from '../lib/numbering';
import type { OutgoingLetter } from '../types/letter';

interface SpreadsheetRecapSectionProps {
  letters: OutgoingLetter[];
  selectedYear: number;
  onSelectLetter?: (letter: OutgoingLetter) => void;
}

export function SpreadsheetRecapSection({
  letters,
  selectedYear,
  onSelectLetter,
}: SpreadsheetRecapSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'terbit' | 'batal'>('terbit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [copiedTable, setCopiedTable] = useState(false);

  const filteredLetters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = letters.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (selectedMonth !== 'all' && l.month !== selectedMonth) return false;
      if (q) {
        const hay = `${l.fullNumber} ${l.subject} ${l.recipient} ${l.letterDate}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const seqDiff = a.sequenceNumber - b.sequenceNumber;
      if (seqDiff !== 0) return sortOrder === 'asc' ? seqDiff : -seqDiff;
      const subDiff = a.subNumber - b.subNumber;
      if (subDiff !== 0) return sortOrder === 'asc' ? subDiff : -subDiff;
      const dateCmp = a.letterDate.localeCompare(b.letterDate);
      return sortOrder === 'asc' ? dateCmp : -dateCmp;
    });
  }, [letters, searchQuery, statusFilter, selectedMonth, sortOrder]);

  const recapRows = useMemo(() => buildRecapRows(filteredLetters), [filteredLetters]);

  const fileSuffix =
    selectedMonth === 'all'
      ? `${selectedYear}`
      : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const handleDownloadXlsx = () => {
    exportRecapToXlsx(filteredLetters, `rekap-surat-keluar-${fileSuffix}.xlsx`);
  };

  const handleDownloadCsv = () => {
    const csv = exportLettersToCsv(filteredLetters);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-surat-keluar-${fileSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySpreadsheet = async () => {
    try {
      const tsv = exportRecapToTsv(filteredLetters);
      await navigator.clipboard.writeText(tsv);
      setCopiedTable(true);
      setTimeout(() => setCopiedTable(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Spreadsheet Toolbar Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Rekap Surat Keluar (Format Spreadsheet)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kolom rekap: Nomor, Tanggal Surat, Nomor Surat, Judul Surat, dan Instansi Tujuan ·{' '}
              <span className="font-mono tabular-nums text-slate-700 font-medium">
                {recapRows.length} baris
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopySpreadsheet()}
            disabled={recapRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedTable ? (
              <Check className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedTable ? 'Tabel Tersalin' : 'Salin ke Sheets / Excel'}
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={recapRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh CSV
          </button>

          <button
            type="button"
            onClick={handleDownloadXlsx}
            disabled={recapRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Unduh Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor surat, judul surat, atau instansi tujuan..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          <div className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-lg shrink-0 self-start sm:self-auto">
            {(
              [
                { id: 'terbit', label: 'Terbit' },
                { id: 'all', label: 'Semua' },
                { id: 'batal', label: 'Dibatalkan' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
            aria-label="Filter Bulan Rekap"
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700"
          >
            <option value="all">Semua Bulan ({selectedYear})</option>
            {INDONESIAN_MONTHS.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder === 'asc' ? 'Urut: 1 → Akhir' : 'Urut: Akhir → 1'}
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      {recapRows.length === 0 ? (
        <div className="py-12 px-6 text-center">
          <p className="text-sm font-semibold text-slate-900">
            Belum Ada Data Rekap pada Filter Ini
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Ubah filter status, bulan, atau kata kunci pencarian untuk menampilkan baris spreadsheet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              {/* Spreadsheet Column Letters Row (A, B, C, D, E) */}
              <tr className="bg-slate-100 text-[11px] font-mono font-semibold text-slate-500 border-b border-slate-300">
                <th className="w-10 py-1 px-2 text-center border-r border-slate-300 bg-slate-200/70" />
                <th className="w-20 py-1 px-3 text-center border-r border-slate-300">A</th>
                <th className="w-40 py-1 px-3 text-center border-r border-slate-300">B</th>
                <th className="w-60 py-1 px-3 text-center border-r border-slate-300">C</th>
                <th className="py-1 px-3 text-center border-r border-slate-300">D</th>
                <th className="w-64 py-1 px-3 text-center">E</th>
              </tr>
              {/* Header Row (Row 1) */}
              <tr className="bg-emerald-50 text-slate-900 font-semibold border-b border-slate-300">
                <th className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-500 bg-slate-100 border-r border-slate-300">
                  1
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap">
                  Nomor
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap">
                  Tanggal Surat
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap">
                  Nomor Surat
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap">
                  Judul Surat
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  Instansi Tujuan
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {recapRows.map((row, idx) => {
                const isCancelled = row.letter.status === 'batal';
                return (
                  <tr
                    key={row.letter.id}
                    onClick={() => onSelectLetter?.(row.letter)}
                    className={`border-b border-slate-200 transition-colors ${
                      onSelectLetter ? 'cursor-pointer hover:bg-emerald-50/40' : 'hover:bg-slate-50'
                    } ${isCancelled ? 'bg-slate-50/70 text-slate-400' : 'text-slate-800'}`}
                  >
                    <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-500 bg-slate-50 border-r border-slate-300 tabular-nums select-none">
                      {idx + 2}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums border-r border-slate-200 whitespace-nowrap font-medium">
                      {row.nomor}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums border-r border-slate-200 whitespace-nowrap">
                      {row.tanggalSurat}
                    </td>
                    <td
                      className={`py-2 px-3 font-mono tabular-nums border-r border-slate-200 whitespace-nowrap font-semibold ${
                        isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {row.nomorSurat}
                    </td>
                    <td className="py-2 px-3 text-sm leading-snug border-r border-slate-200">
                      <span>{row.judulSurat}</span>
                      {isCancelled && (
                        <span className="ml-2 text-[11px] font-medium text-red-600">
                          (Dibatalkan)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-sm leading-snug">
                      {row.instansiTujuan}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
