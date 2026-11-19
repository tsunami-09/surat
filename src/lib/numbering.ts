import {
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
  let n = subNumber;
  let result = '';
  while (n > 0) {
    n -= 1;
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return `.${result}`;
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

export function buildSortKey(letterDate: string, sequenceNumber: number): string {
  const year = letterDate.slice(0, 4);
  return `${year}_${String(sequenceNumber).padStart(6, '0')}_${letterDate}`;
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

  if (!alloc) {
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
      fullNumber: null,
      nearestWorkingDate,
    };
  }

  const counter = dailyCounters[letterDate];
  const usedCount = counter?.usedCount ?? 0;
  const remainingQuota = Math.max(0, DAILY_QUOTA - usedCount);

  if (usedCount >= DAILY_QUOTA) {
    return {
      canIssue: false,
      blockedReason: `Kuota ${DAILY_QUOTA} nomor untuk tanggal ${formatTanggalIndonesia(letterDate)} (No. ${formatSequenceCode(alloc.startSeq, 0, settings.padDigits)}–${formatSequenceCode(alloc.endSeq, 0, settings.padDigits)}) sudah habis. Silakan pilih tanggal hari kerja lain.`,
      dayStatus: 'hari_kerja',
      holidayName: null,
      startSeq: alloc.startSeq,
      endSeq: alloc.endSeq,
      usedCount,
      remainingQuota: 0,
      nextSequenceNumber: null,
      fullNumber: null,
      nearestWorkingDate: findNearestWorkingDate(
        `${letterDate.slice(0, 8)}${String(Number(letterDate.slice(8, 10)) + 1).padStart(2, '0')}`,
        customHolidays,
      ),
    };
  }

  const nextSeq = alloc.startSeq + usedCount;
  const fullNumber = formatFullLetterNumber({
    classificationCode,
    sequenceNumber: nextSeq,
    subNumber: 0,
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
    startSeq: alloc.startSeq,
    endSeq: alloc.endSeq,
    usedCount,
    remainingQuota,
    nextSequenceNumber: nextSeq,
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

export function exportLettersToCsv(letters: OutgoingLetter[]): string {
  const headers = [
    'Nomor Urut',
    'Nomor Surat Lengkap',
    'Tanggal Surat',
    'Kode Klasifikasi',
    'Jenis Surat',
    'Perihal',
    'Tujuan / Penerima',
    'Pengolah / Penandatangan',
    'Dicatat Oleh',
    'Unit / Bagian',
    'Status',
    'Keterangan / Alasan Batal',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replaceAll('"', '""')}"`;
    }
    return str;
  };

  const rows = letters.map((l) => [
    formatSequenceCode(l.sequenceNumber, l.subNumber, 3),
    l.fullNumber,
    l.letterDate,
    l.classificationCode,
    l.category,
    l.subject,
    l.recipient,
    l.picName,
    l.createdByName,
    l.createdByDivision,
    l.status === 'terbit' ? 'Terbit' : 'Dibatalkan',
    l.status === 'batal' ? l.cancelReason : l.notes,
  ]);

  return [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join(
    '\n',
  );
}
