import * as XLSX from 'xlsx';
import {
  ACTIVE_PERIOD_END,
  ACTIVE_PERIOD_START,
  DAILY_QUOTA,
  type CalendarHoliday,
  type ClassificationCode,
  type DailyCounter,
  type NumberPreviewResult,
  type OutgoingLetter,
  type SystemSettings,
} from '../types/letter';
import {
  findNearestWorkingDate,
  getDayAllocation,
  isWithinActivePeriod,
} from './calendar';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  institutionName: 'UPT Pelatihan Pertanian',
  unitCode: 'UPT-PP',
  numberFormat: '{klasifikasi}/{urut}/{unit}/{bulanRomawi}/{tahun}',
  padDigits: 3,
};

export const BUILTIN_CLASSIFICATIONS: ClassificationCode[] = [
  {
    id: 'builtin-000',
    code: '000',
    label: 'Umum & Ketatausahaan',
    description: 'Surat menyurat umum, undangan rapat internal, dan administrasi kesekretariatan.',
    active: true,
    isBuiltin: true,
  },
  {
    id: 'builtin-400',
    code: '400',
    label: 'Pelatihan & Peningkatan SDM',
    description: 'Penyelenggaraan diklat, bimbingan teknis petani, sertifikat, dan evaluasi pelatihan.',
    active: true,
    isBuiltin: true,
  },
  {
    id: 'builtin-520',
    code: '520',
    label: 'Pertanian & Ketahanan Pangan',
    description: 'Program pertanian terpadu, kemitraan kelompok tani, dan penyuluhan lapangan.',
    active: true,
    isBuiltin: true,
  },
  {
    id: 'builtin-521',
    code: '521',
    label: 'Tanaman Pangan & Hortikultura',
    description: 'Lahan percontohan, demplot budidaya, benih, dan teknologi pascapanen.',
    active: true,
    isBuiltin: true,
  },
  {
    id: 'builtin-524',
    code: '524',
    label: 'Peternakan & Agribisnis',
    description: 'Pelatihan budidaya ternak, pengolahan pakan, dan kemitraan agribisnis.',
    active: true,
    isBuiltin: true,
  },
  {
    id: 'builtin-800',
    code: '800',
    label: 'Kepegawaian & Surat Tugas',
    description: 'Surat tugas pegawai/widyaiswara, cuti, pembinaan ASN, dan perjalanan dinas.',
    active: true,
    isBuiltin: true,
  },
  {
    id: 'builtin-900',
    code: '900',
    label: 'Keuangan & Sarana Prasarana',
    description: 'Pengadaan barang/jasa pelatihan, pertanggungjawaban anggaran, dan aset UPT.',
    active: true,
    isBuiltin: true,
  },
];

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function toRomanMonth(month: number): string {
  return ROMAN_MONTHS[month - 1] ?? String(month);
}

export function subNumberToSuffix(subNumber: number): string {
  if (subNumber <= 0) return '';
  return `.${subNumber}`;
}

export function formatSequenceCode(
  sequenceNumber: number,
  subNumber: number,
  padDigits: number,
): string {
  const padded = String(sequenceNumber).padStart(padDigits, '0');
  return `${padded}${subNumberToSuffix(subNumber)}`;
}

export function formatFullLetterNumber(params: {
  classificationCode: string;
  sequenceNumber: number;
  subNumber: number;
  unitCode: string;
  month: number;
  year: number;
  settings: SystemSettings;
}): string {
  const { classificationCode, sequenceNumber, subNumber, unitCode, month, year, settings } = params;
  const urut = formatSequenceCode(sequenceNumber, subNumber, settings.padDigits);
  const bulan = String(month).padStart(2, '0');
  const bulanRomawi = toRomanMonth(month);

  return settings.numberFormat
    .replaceAll('{klasifikasi}', classificationCode)
    .replaceAll('{urut}', urut)
    .replaceAll('{unit}', unitCode)
    .replaceAll('{bulanRomawi}', bulanRomawi)
    .replaceAll('{bulan}', bulan)
    .replaceAll('{tahun}', String(year));
}

export function buildSortKey(
  letterDate: string,
  sequenceNumber: number,
  subNumber = 0,
): string {
  const year = letterDate.slice(0, 4);
  return `${year}_${String(sequenceNumber).padStart(6, '0')}_${String(subNumber).padStart(4, '0')}_${letterDate}`;
}

export function previewNextLetterNumber(params: {
  letterDate: string;
  classificationCode: string;
  settings: SystemSettings;
  dailyCounters: Record<string, DailyCounter>;
  customHolidays: Record<string, CalendarHoliday>;
}): NumberPreviewResult {
  const { letterDate, classificationCode, settings, dailyCounters, customHolidays } = params;
  const alloc = getDayAllocation(letterDate, customHolidays);
  const nearestWorkingDate = findNearestWorkingDate(letterDate, customHolidays);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(letterDate)) {
    return {
      canIssue: false,
      blockedReason: 'Format tanggal tidak valid.',
      dayStatus: 'akhir_pekan',
      holidayName: null,
      startSeq: null,
      endSeq: null,
      usedCount: 0,
      remainingQuota: 0,
      nextSequenceNumber: null,
      nextSubNumber: null,
      isOverflow: false,
      fullNumber: null,
      nearestWorkingDate,
    };
  }

  if (!isWithinActivePeriod(letterDate) || !alloc) {
    return {
      canIssue: false,
      blockedReason: `Periode penomoran surat berlaku mulai ${formatTanggalIndonesia(ACTIVE_PERIOD_START)} sampai dengan ${formatTanggalIndonesia(ACTIVE_PERIOD_END)}.`,
      dayStatus: 'tanggal_merah',
      holidayName: 'Di Luar Periode 2 Jan – 31 Des 2027',
      startSeq: null,
      endSeq: null,
      usedCount: 0,
      remainingQuota: 0,
      nextSequenceNumber: null,
      nextSubNumber: null,
      isOverflow: false,
      fullNumber: null,
      nearestWorkingDate,
    };
  }

  if (alloc.status !== 'hari_kerja' || alloc.startSeq === null || alloc.endSeq === null) {
    const labelMap: Record<string, string> = {
      akhir_pekan: 'Akhir Pekan (Sabtu/Minggu)',
      tanggal_merah: 'Tanggal Merah / Hari Libur Nasional',
      cuti_bersama: 'Cuti Bersama',
    };
    const statusText = labelMap[alloc.status] ?? 'Hari Libur';
    return {
      canIssue: false,
      blockedReason: `Tanggal ${formatTanggalIndonesia(letterDate)} adalah ${statusText} (${alloc.holidayName ?? 'Libur'}). Alokasi nomor surat dikosongkan pada hari libur.`,
      dayStatus: alloc.status,
      holidayName: alloc.holidayName,
      startSeq: null,
      endSeq: null,
      usedCount: 0,
      remainingQuota: 0,
      nextSequenceNumber: null,
      nextSubNumber: null,
      isOverflow: false,
      fullNumber: null,
      nearestWorkingDate,
    };
  }

  const counter = dailyCounters[letterDate];
  const effectiveStart = counter?.startSeq ?? alloc.startSeq;
  const effectiveEnd = counter?.endSeq ?? alloc.endSeq;
  const effectiveQuota = Math.max(1, effectiveEnd - effectiveStart + 1);
  const usedCount = counter?.usedCount ?? 0;
  const remainingQuota = Math.max(0, effectiveQuota - usedCount);

  const isOverflow = usedCount >= effectiveQuota || usedCount >= DAILY_QUOTA;
  const nextSeq = isOverflow ? effectiveEnd : effectiveStart + usedCount;
  const nextSub = isOverflow ? Math.max(1, usedCount - effectiveQuota + 1) : 0;

  const fullNumber = formatFullLetterNumber({
    classificationCode,
    sequenceNumber: nextSeq,
    subNumber: nextSub,
    unitCode: settings.unitCode,
    month: alloc.month,
    year: alloc.year,
    settings,
  });

  return {
    canIssue: true,
    blockedReason: null,
    dayStatus: 'hari_kerja',
    holidayName: null,
    startSeq: effectiveStart,
    endSeq: effectiveEnd,
    usedCount,
    remainingQuota,
    nextSequenceNumber: nextSeq,
    nextSubNumber: nextSub,
    isOverflow,
    fullNumber,
    nearestWorkingDate: letterDate,
  };
}

export function formatTanggalIndonesia(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const monthName = INDONESIAN_MONTHS[m - 1] ?? '';
  return `${d} ${monthName} ${y}`;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface RecapSpreadsheetRow {
  nomor: number;
  tanggalSurat: string;
  nomorSurat: string;
  judulSurat: string;
  instansiTujuan: string;
  letter: OutgoingLetter;
}

export function buildRecapRows(letters: OutgoingLetter[]): RecapSpreadsheetRow[] {
  return letters.map((letter, idx) => ({
    nomor: idx + 1,
    tanggalSurat: formatTanggalIndonesia(letter.letterDate),
    nomorSurat: letter.fullNumber,
    judulSurat: letter.subject,
    instansiTujuan: letter.recipient,
    letter,
  }));
}

export function exportLettersToCsv(letters: OutgoingLetter[]): string {
  const headers = ['Nomor', 'Tanggal Surat', 'Nomor Surat', 'Judul Surat', 'Instansi Tujuan'];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replaceAll('"', '""')}"`;
    }
    return str;
  };

  const rows = buildRecapRows(letters).map((r) => [
    r.nomor,
    r.tanggalSurat,
    r.nomorSurat,
    r.judulSurat,
    r.instansiTujuan,
  ]);

  return [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join(
    '\n',
  );
}

export function exportRecapToTsv(letters: OutgoingLetter[]): string {
  const headers = ['Nomor', 'Tanggal Surat', 'Nomor Surat', 'Judul Surat', 'Instansi Tujuan'];
  const cleanCell = (val: string | number) =>
    String(val ?? '').replaceAll('\t', ' ').replaceAll('\n', ' ');

  const rows = buildRecapRows(letters).map((r) => [
    cleanCell(r.nomor),
    cleanCell(r.tanggalSurat),
    cleanCell(r.nomorSurat),
    cleanCell(r.judulSurat),
    cleanCell(r.instansiTujuan),
  ]);

  return [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
}

export function exportRecapToXlsx(letters: OutgoingLetter[], filename: string): void {
  const headers = ['Nomor', 'Tanggal Surat', 'Nomor Surat', 'Judul Surat', 'Instansi Tujuan'];
  const data = buildRecapRows(letters).map((r) => [
    r.nomor,
    r.tanggalSurat,
    r.nomorSurat,
    r.judulSurat,
    r.instansiTujuan,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 22 },
    { wch: 32 },
    { wch: 52 },
    { wch: 36 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Surat Keluar');
  XLSX.writeFile(workbook, filename);
}
