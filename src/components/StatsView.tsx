import { useMemo, useState } from 'react';
import { INDONESIAN_MONTHS } from '../lib/numbering';
import { ACTIVE_PERIOD_YEAR, type ClassificationCode, type OutgoingLetter } from '../types/letter';
import { SpreadsheetRecapSection } from './SpreadsheetRecapSection';

interface StatsViewProps {
  letters: OutgoingLetter[];
  classifications: ClassificationCode[];
  onSelectLetter?: (letter: OutgoingLetter) => void;
}

export function StatsView({ letters, classifications, onSelectLetter }: StatsViewProps) {
  const [selectedYear, setSelectedYear] = useState(ACTIVE_PERIOD_YEAR);

  const availableYears = useMemo(() => {
    const years = new Set<number>([ACTIVE_PERIOD_YEAR]);
    for (const l of letters) years.add(l.year);
    return Array.from(years).sort((a, b) => b - a);
  }, [letters]);

  const yearLetters = useMemo(
    () => letters.filter((l) => l.year === selectedYear),
    [letters, selectedYear],
  );

  const monthlyData = useMemo(() => {
    const counts = Array.from({ length: 12 }, (_, idx) => ({
      month: idx + 1,
      label: INDONESIAN_MONTHS[idx].slice(0, 3),
      fullLabel: INDONESIAN_MONTHS[idx],
      terbit: 0,
      batal: 0,
    }));

    for (const l of yearLetters) {
      const bucket = counts[l.month - 1];
      if (bucket) {
        if (l.status === 'terbit') bucket.terbit += 1;
        else bucket.batal += 1;
      }
    }
    const maxVal = Math.max(1, ...counts.map((c) => c.terbit + c.batal));
    return { counts, maxVal };
  }, [yearLetters]);

  const byClassification = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of yearLetters) {
      if (l.status === 'terbit') {
        map.set(l.classificationCode, (map.get(l.classificationCode) ?? 0) + 1);
      }
    }
    const labelMap = new Map(classifications.map((c) => [c.code, c.label]));
    return Array.from(map.entries())
      .map(([code, count]) => ({
        code,
        label: labelMap.get(code) ?? 'Klasifikasi Lain',
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [yearLetters, classifications]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of yearLetters) {
      if (l.status === 'terbit') {
        map.set(l.category, (map.get(l.category) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [yearLetters]);

  const byDivision = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of yearLetters) {
      if (l.status === 'terbit') {
        map.set(l.createdByDivision, (map.get(l.createdByDivision) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([division, count]) => ({ division, count }))
      .sort((a, b) => b.count - a.count);
  }, [yearLetters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Rekap Spreadsheet & Statistik Surat Keluar
          </h2>
          <p className="text-sm text-slate-500">
            Rekapitulasi surat keluar dalam format spreadsheet serta ringkasan volume per bulan, klasifikasi, dan subbagian.
          </p>
        </div>

        <select
          aria-label="Pilih Tahun Rekap"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3.5 py-2 text-sm font-medium border border-slate-300 rounded-lg bg-white text-slate-800 tabular-nums"
        >
          {availableYears.map((yr) => (
            <option key={yr} value={yr}>
              Tahun {yr}
            </option>
          ))}
        </select>
      </div>

      {/* Spreadsheet Rekap Surat Keluar */}
      <SpreadsheetRecapSection
        letters={yearLetters}
        selectedYear={selectedYear}
        onSelectLetter={onSelectLetter}
      />

      {/* Monthly Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Volume Surat Keluar Bulanan ({selectedYear})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan surat berstatus terbit dan dibatalkan per bulan
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700 inline-block" />
              Terbit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />
              Dibatalkan
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end h-52 pt-4 border-b border-slate-200 pb-2">
          {monthlyData.counts.map((m) => {
            const total = m.terbit + m.batal;
            const terbitPct = (m.terbit / monthlyData.maxVal) * 100;
            const batalPct = (m.batal / monthlyData.maxVal) * 100;
            return (
              <div
                key={m.month}
                title={`${m.fullLabel}: ${m.terbit} terbit, ${m.batal} batal`}
                className="flex flex-col items-center justify-end h-full gap-1.5"
              >
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {total > 0 ? total : ''}
                </span>
                <div className="w-full max-w-[28px] flex-1 flex flex-col justify-end gap-0.5">
                  {m.batal > 0 && (
                    <div
                      style={{ height: `${Math.max(4, batalPct)}%` }}
                      className="w-full bg-slate-300 rounded-t-sm"
                    />
                  )}
                  {m.terbit > 0 && (
                    <div
                      style={{ height: `${Math.max(4, terbitPct)}%` }}
                      className="w-full bg-emerald-700 rounded-t-sm"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-12 gap-2 sm:gap-3 pt-2">
          {monthlyData.counts.map((m) => (
            <div key={m.month} className="text-center text-xs text-slate-600 font-medium">
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Per Kode Klasifikasi</h3>
          {byClassification.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data pada tahun {selectedYear}.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {byClassification.map((item) => (
                <div key={item.code} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-slate-900">{item.code}</p>
                    <p className="text-xs text-slate-500 truncate">{item.label}</p>
                  </div>
                  <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Per Jenis Surat</h3>
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data pada tahun {selectedYear}.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {byCategory.map((item) => (
                <div key={item.category} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-700 truncate">{item.category}</span>
                  <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Per Subbagian / Seksi</h3>
          {byDivision.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data pada tahun {selectedYear}.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {byDivision.map((item) => (
                <div key={item.division} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-700 truncate">{item.division}</span>
                  <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
