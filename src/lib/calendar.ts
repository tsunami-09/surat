import {
  ACTIVE_PERIOD_END,
  ACTIVE_PERIOD_START,
  ACTIVE_PERIOD_YEAR,
  DAILY_QUOTA,
  type CalendarHoliday,
  type DayScheduleEntry,
  type HolidayKind,
} from '../types/letter';

interface BuiltinHolidayDef {
  name: string;
  kind: HolidayKind;
}

// Hari Libur Nasional & Cuti Bersama Indonesia (2025, 2026, 2027)
const BUILTIN_HOLIDAYS: Record<string, BuiltinHolidayDef> = {
  // 2025
  '2025-01-01': { name: 'Tahun Baru 2025 Masehi', kind: 'tanggal_merah' },
  '2025-01-27': { name: 'Isra Mikraj Nabi Muhammad SAW', kind: 'tanggal_merah' },
  '2025-01-28': { name: 'Cuti Bersama Tahun Baru Imlek 2576', kind: 'cuti_bersama' },
  '2025-01-29': { name: 'Tahun Baru Imlek 2576 Kongzili', kind: 'tanggal_merah' },
  '2025-03-28': { name: 'Cuti Bersama Hari Suci Nyepi 1947', kind: 'cuti_bersama' },
  '2025-03-29': { name: 'Hari Suci Nyepi Tahun Baru Saka 1947', kind: 'tanggal_merah' },
  '2025-03-31': { name: 'Hari Raya Idulfitri 1446 H', kind: 'tanggal_merah' },
  '2025-04-01': { name: 'Hari Raya Idulfitri 1446 H', kind: 'tanggal_merah' },
  '2025-04-02': { name: 'Cuti Bersama Idulfitri 1446 H', kind: 'cuti_bersama' },
  '2025-04-03': { name: 'Cuti Bersama Idulfitri 1446 H', kind: 'cuti_bersama' },
  '2025-04-04': { name: 'Cuti Bersama Idulfitri 1446 H', kind: 'cuti_bersama' },
  '2025-04-07': { name: 'Cuti Bersama Idulfitri 1446 H', kind: 'cuti_bersama' },
  '2025-04-18': { name: 'Wafat Yesus Kristus', kind: 'tanggal_merah' },
  '2025-04-20': { name: 'Kebangkitan Yesus Kristus (Paskah)', kind: 'tanggal_merah' },
  '2025-05-01': { name: 'Hari Buruh Internasional', kind: 'tanggal_merah' },
  '2025-05-12': { name: 'Hari Raya Waisak 2569 BE', kind: 'tanggal_merah' },
  '2025-05-13': { name: 'Cuti Bersama Hari Raya Waisak 2569 BE', kind: 'cuti_bersama' },
  '2025-05-29': { name: 'Kenaikan Yesus Kristus', kind: 'tanggal_merah' },
  '2025-05-30': { name: 'Cuti Bersama Kenaikan Yesus Kristus', kind: 'cuti_bersama' },
  '2025-06-01': { name: 'Hari Lahir Pancasila', kind: 'tanggal_merah' },
  '2025-06-06': { name: 'Hari Raya Iduladha 1446 H', kind: 'tanggal_merah' },
  '2025-06-09': { name: 'Cuti Bersama Iduladha 1446 H', kind: 'cuti_bersama' },
  '2025-06-27': { name: '1 Muharam Tahun Baru Islam 1447 H', kind: 'tanggal_merah' },
  '2025-08-17': { name: 'Hari Kemerdekaan Republik Indonesia', kind: 'tanggal_merah' },
  '2025-09-05': { name: 'Maulid Nabi Muhammad SAW', kind: 'tanggal_merah' },
  '2025-12-25': { name: 'Kelahiran Yesus Kristus (Natal)', kind: 'tanggal_merah' },
  '2025-12-26': { name: 'Cuti Bersama Kelahiran Yesus Kristus', kind: 'cuti_bersama' },

  // 2026
  '2026-01-01': { name: 'Tahun Baru 2026 Masehi', kind: 'tanggal_merah' },
  '2026-01-16': { name: 'Isra Mikraj Nabi Muhammad SAW', kind: 'tanggal_merah' },
  '2026-02-16': { name: 'Cuti Bersama Tahun Baru Imlek 2577', kind: 'cuti_bersama' },
  '2026-02-17': { name: 'Tahun Baru Imlek 2577 Kongzili', kind: 'tanggal_merah' },
  '2026-03-18': { name: 'Cuti Bersama Hari Suci Nyepi 1948', kind: 'cuti_bersama' },
  '2026-03-19': { name: 'Hari Suci Nyepi Tahun Baru Saka 1948', kind: 'tanggal_merah' },
  '2026-03-20': { name: 'Cuti Bersama Idulfitri 1447 H', kind: 'cuti_bersama' },
  '2026-03-21': { name: 'Hari Raya Idulfitri 1447 H', kind: 'tanggal_merah' },
  '2026-03-22': { name: 'Hari Raya Idulfitri 1447 H', kind: 'tanggal_merah' },
  '2026-03-23': { name: 'Cuti Bersama Idulfitri 1447 H', kind: 'cuti_bersama' },
  '2026-03-24': { name: 'Cuti Bersama Idulfitri 1447 H', kind: 'cuti_bersama' },
  '2026-04-03': { name: 'Wafat Yesus Kristus', kind: 'tanggal_merah' },
  '2026-04-05': { name: 'Kebangkitan Yesus Kristus (Paskah)', kind: 'tanggal_merah' },
  '2026-05-01': { name: 'Hari Buruh Internasional', kind: 'tanggal_merah' },
  '2026-05-14': { name: 'Kenaikan Yesus Kristus', kind: 'tanggal_merah' },
  '2026-05-15': { name: 'Cuti Bersama Kenaikan Yesus Kristus', kind: 'cuti_bersama' },
  '2026-05-27': { name: 'Hari Raya Iduladha 1447 H', kind: 'tanggal_merah' },
  '2026-05-28': { name: 'Cuti Bersama Iduladha 1447 H', kind: 'cuti_bersama' },
  '2026-05-31': { name: 'Hari Raya Waisak 2570 BE', kind: 'tanggal_merah' },
  '2026-06-01': { name: 'Hari Lahir Pancasila', kind: 'tanggal_merah' },
  '2026-06-16': { name: '1 Muharam Tahun Baru Islam 1448 H', kind: 'tanggal_merah' },
  '2026-08-17': { name: 'Hari Kemerdekaan Republik Indonesia', kind: 'tanggal_merah' },
  '2026-08-25': { name: 'Maulid Nabi Muhammad SAW', kind: 'tanggal_merah' },
  '2026-12-24': { name: 'Cuti Bersama Kelahiran Yesus Kristus', kind: 'cuti_bersama' },
  '2026-12-25': { name: 'Kelahiran Yesus Kristus (Natal)', kind: 'tanggal_merah' },

  // 2027 (SKB 3 Menteri: Hari Libur Nasional & Cuti Bersama)
  '2027-01-01': { name: 'Tahun Baru 2027 Masehi', kind: 'tanggal_merah' },
  '2027-01-05': { name: 'Isra Mikraj Nabi Muhammad SAW 1448 H', kind: 'tanggal_merah' },
  '2027-02-05': { name: 'Cuti Bersama Tahun Baru Imlek 2578 Kongzili', kind: 'cuti_bersama' },
  '2027-02-06': { name: 'Tahun Baru Imlek 2578 Kongzili', kind: 'tanggal_merah' },
  '2027-03-08': { name: 'Hari Suci Nyepi (Tahun Baru Saka 1949)', kind: 'tanggal_merah' },
  '2027-03-09': { name: 'Cuti Bersama Hari Raya Idulfitri 1448 H', kind: 'cuti_bersama' },
  '2027-03-10': { name: 'Hari Raya Idulfitri 1448 H', kind: 'tanggal_merah' },
  '2027-03-11': { name: 'Hari Raya Idulfitri 1448 H', kind: 'tanggal_merah' },
  '2027-03-12': { name: 'Cuti Bersama Hari Raya Idulfitri 1448 H', kind: 'cuti_bersama' },
  '2027-03-15': { name: 'Cuti Bersama Hari Raya Idulfitri 1448 H', kind: 'cuti_bersama' },
  '2027-03-25': { name: 'Cuti Bersama Wafat Yesus Kristus', kind: 'cuti_bersama' },
  '2027-03-26': { name: 'Wafat Yesus Kristus', kind: 'tanggal_merah' },
  '2027-03-28': { name: 'Kebangkitan Yesus Kristus (Paskah)', kind: 'tanggal_merah' },
  '2027-05-01': { name: 'Hari Buruh Internasional', kind: 'tanggal_merah' },
  '2027-05-06': { name: 'Kenaikan Yesus Kristus', kind: 'tanggal_merah' },
  '2027-05-17': { name: 'Hari Raya Iduladha 1448 H', kind: 'tanggal_merah' },
  '2027-05-18': { name: 'Cuti Bersama Hari Raya Iduladha 1448 H', kind: 'cuti_bersama' },
  '2027-05-19': { name: 'Cuti Bersama Hari Raya Waisak 2571 BE', kind: 'cuti_bersama' },
  '2027-05-20': { name: 'Hari Raya Waisak 2571 BE', kind: 'tanggal_merah' },
  '2027-06-01': { name: 'Hari Lahir Pancasila', kind: 'tanggal_merah' },
  '2027-06-06': { name: '1 Muharam Tahun Baru Islam 1449 H', kind: 'tanggal_merah' },
  '2027-08-15': { name: 'Maulid Nabi Muhammad SAW 1449 H', kind: 'tanggal_merah' },
  '2027-08-17': { name: 'Hari Kemerdekaan Republik Indonesia', kind: 'tanggal_merah' },
  '2027-12-24': { name: 'Cuti Bersama Kelahiran Yesus Kristus', kind: 'cuti_bersama' },
  '2027-12-25': { name: 'Kelahiran Yesus Kristus (Natal)', kind: 'tanggal_merah' },
  '2027-12-26': { name: 'Isra Mikraj Nabi Muhammad SAW 1449 H', kind: 'tanggal_merah' },
};

const FIXED_ANNUAL_HOLIDAYS: Record<string, BuiltinHolidayDef> = {
  '01-01': { name: 'Tahun Baru Masehi', kind: 'tanggal_merah' },
  '05-01': { name: 'Hari Buruh Internasional', kind: 'tanggal_merah' },
  '06-01': { name: 'Hari Lahir Pancasila', kind: 'tanggal_merah' },
  '08-17': { name: 'Hari Kemerdekaan Republik Indonesia', kind: 'tanggal_merah' },
  '12-25': { name: 'Kelahiran Yesus Kristus (Natal)', kind: 'tanggal_merah' },
};

export const INDONESIAN_DAY_NAMES = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export function formatIsoDateUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDayOfWeekFromIso(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function getEffectiveHoliday(
  isoDate: string,
  customHolidays: Record<string, CalendarHoliday>,
): BuiltinHolidayDef | null {
  const custom = customHolidays[isoDate];
  if (custom) {
    return custom.active ? { name: custom.name, kind: custom.kind } : null;
  }

  if (BUILTIN_HOLIDAYS[isoDate]) {
    return BUILTIN_HOLIDAYS[isoDate];
  }

  const mmdd = isoDate.slice(5);
  return FIXED_ANNUAL_HOLIDAYS[mmdd] ?? null;
}

export function getMergedHolidaysForYear(
  year: number,
  customHolidays: Record<string, CalendarHoliday>,
): CalendarHoliday[] {
  const map = new Map<string, CalendarHoliday>();

  // Add built-in holidays for this year
  for (const [date, def] of Object.entries(BUILTIN_HOLIDAYS)) {
    if (date.startsWith(`${year}-`)) {
      map.set(date, {
        date,
        year,
        name: def.name,
        kind: def.kind,
        active: true,
        isBuiltin: true,
      });
    }
  }

  // Fallback fixed annual holidays if year isn't in BUILTIN_HOLIDAYS
  for (const [mmdd, def] of Object.entries(FIXED_ANNUAL_HOLIDAYS)) {
    const date = `${year}-${mmdd}`;
    if (!map.has(date)) {
      map.set(date, {
        date,
        year,
        name: def.name,
        kind: def.kind,
        active: true,
        isBuiltin: true,
      });
    }
  }

  // Apply Firestore overrides
  for (const [date, item] of Object.entries(customHolidays)) {
    if (item.year === year) {
      map.set(date, { ...item, isBuiltin: false });
    }
  }

  return Array.from(map.values())
    .filter((item) =>
      year === ACTIVE_PERIOD_YEAR
        ? item.date >= ACTIVE_PERIOD_START && item.date <= ACTIVE_PERIOD_END
        : true,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildYearSchedule(
  year: number,
  customHolidays: Record<string, CalendarHoliday>,
): DayScheduleEntry[] {
  const schedule: DayScheduleEntry[] = [];
  const start =
    year === ACTIVE_PERIOD_YEAR ? new Date(Date.UTC(year, 0, 2)) : new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  let workingDayIndex = 0;

  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 86400000)) {
    const isoDate = formatIsoDateUtc(cursor);
    const month = cursor.getUTCMonth() + 1;
    const day = cursor.getUTCDate();
    const dayOfWeek = cursor.getUTCDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      schedule.push({
        date: isoDate,
        year,
        month,
        day,
        dayOfWeek,
        status: 'akhir_pekan',
        holidayName: dayOfWeek === 6 ? 'Akhir Pekan (Sabtu)' : 'Akhir Pekan (Minggu)',
        workingDayIndex: null,
        startSeq: null,
        endSeq: null,
      });
      continue;
    }

    const holiday = getEffectiveHoliday(isoDate, customHolidays);
    if (holiday) {
      schedule.push({
        date: isoDate,
        year,
        month,
        day,
        dayOfWeek,
        status: holiday.kind,
        holidayName: holiday.name,
        workingDayIndex: null,
        startSeq: null,
        endSeq: null,
      });
      continue;
    }

    workingDayIndex += 1;
    const startSeq = (workingDayIndex - 1) * DAILY_QUOTA + 1;
    const endSeq = workingDayIndex * DAILY_QUOTA;
    schedule.push({
      date: isoDate,
      year,
      month,
      day,
      dayOfWeek,
      status: 'hari_kerja',
      holidayName: null,
      workingDayIndex,
      startSeq,
      endSeq,
    });
  }

  return schedule;
}

export function isWithinActivePeriod(isoDate: string): boolean {
  return isoDate >= ACTIVE_PERIOD_START && isoDate <= ACTIVE_PERIOD_END;
}

export function getDayAllocation(
  isoDate: string,
  customHolidays: Record<string, CalendarHoliday>,
): DayScheduleEntry | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  if (!isWithinActivePeriod(isoDate)) return null;
  const year = Number(isoDate.slice(0, 4));
  const schedule = buildYearSchedule(year, customHolidays);
  return schedule.find((entry) => entry.date === isoDate) ?? null;
}

export function findNearestWorkingDate(
  isoDate: string,
  customHolidays: Record<string, CalendarHoliday>,
): string {
  const clampedStart =
    isoDate < ACTIVE_PERIOD_START
      ? ACTIVE_PERIOD_START
      : isoDate > ACTIVE_PERIOD_END
        ? ACTIVE_PERIOD_START
        : isoDate;
  const [y, m, d] = clampedStart.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  for (let offset = 0; offset <= 365; offset += 1) {
    const candidate = formatIsoDateUtc(new Date(start.getTime() + offset * 86400000));
    if (candidate > ACTIVE_PERIOD_END) break;
    const alloc = getDayAllocation(candidate, customHolidays);
    if (alloc && alloc.status === 'hari_kerja') {
      return candidate;
    }
  }
  return ACTIVE_PERIOD_START;
}
