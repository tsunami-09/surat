import type { Timestamp } from 'firebase/firestore';

export const LETTER_CATEGORIES = [
  'Surat Tugas',
  'Surat Undangan',
  'Surat Edaran',
  'Nota Dinas',
  'Surat Keterangan',
  'Surat Pengantar',
  'Surat Permohonan',
  'Lainnya',
] as const;

export type LetterCategory = (typeof LETTER_CATEGORIES)[number];

export type LetterStatus = 'terbit' | 'batal';

export type StaffRole = 'staff' | 'admin';

export type HolidayKind = 'tanggal_merah' | 'cuti_bersama';

export type DayAllocationStatus =
  | 'hari_kerja'
  | 'akhir_pekan'
  | 'tanggal_merah'
  | 'cuti_bersama';

export const DAILY_QUOTA = 20;

export const ACTIVE_PERIOD_YEAR = 2027;
export const ACTIVE_PERIOD_START = '2027-01-02';
export const ACTIVE_PERIOD_END = '2027-12-31';

export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_\-]+$/,
  unitCodePattern: /^[A-Za-z0-9.\-/]+$/,
  classificationPattern: /^[A-Za-z0-9.\-]+$/,
  datePattern: /^\d{4}-\d{2}-\d{2}$/,
  maxSubject: 300,
  minSubject: 3,
  maxRecipient: 200,
  minRecipient: 2,
  maxPicName: 120,
  minPicName: 2,
  maxNotes: 500,
  maxCancelReason: 300,
  minCancelReason: 3,
  maxDisplayName: 120,
  minDisplayName: 2,
  maxNip: 40,
  maxDivision: 120,
  maxJabatan: 120,
  maxUnitCode: 32,
  maxClassificationCode: 20,
  maxClassificationLabel: 120,
  maxClassificationDesc: 300,
  maxInstitutionName: 120,
  maxNumberFormat: 100,
  maxHolidayName: 120,
} as const;

export const UPT_DIVISIONS = [
  'Subbagian Tata Usaha',
  'Seksi Penyelenggaraan Pelatihan',
  'Seksi Evaluasi & Pengembangan Pelatihan',
  'Kelompok Jabatan Fungsional Widyaiswara',
  'Tim Kerja Sarana & Prasarana',
] as const;

export interface StaffProfile {
  uid: string;
  email: string;
  displayName: string;
  nip: string;
  division: string;
  jabatan: string;
  role: StaffRole;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StaffDirectoryEntry {
  uid: string;
  displayName: string;
  division: string;
  jabatan: string;
  role: StaffRole;
  active: boolean;
  updatedAt?: Timestamp | null;
}

export interface RevokedUser {
  uid: string;
  displayName: string;
  revokedByUid: string;
  createdAt?: Timestamp | null;
}

export interface SystemSettings {
  institutionName: string;
  unitCode: string;
  numberFormat: string;
  padDigits: number;
  updatedByUid?: string;
  updatedAt?: Timestamp | null;
}

export interface ClassificationCode {
  id: string;
  code: string;
  label: string;
  description: string;
  active: boolean;
  isBuiltin?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface DailyCounter {
  date: string;
  year: number;
  startSeq: number;
  endSeq: number;
  usedCount: number;
  updatedAt?: Timestamp | null;
}

export interface CalendarHoliday {
  date: string;
  year: number;
  name: string;
  kind: HolidayKind;
  active: boolean;
  isBuiltin?: boolean;
  updatedByUid?: string;
  updatedAt?: Timestamp | null;
}

export interface DayScheduleEntry {
  date: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 = Minggu .. 6 = Sabtu
  status: DayAllocationStatus;
  holidayName: string | null;
  workingDayIndex: number | null; // 1..N
  startSeq: number | null;
  endSeq: number | null;
}

export interface OutgoingLetter {
  id: string;
  year: number;
  month: number;
  letterDate: string;
  sequenceNumber: number;
  subNumber: number;
  sortKey: string;
  classificationCode: string;
  unitCode: string;
  fullNumber: string;
  category: LetterCategory;
  subject: string;
  recipient: string;
  picName: string;
  notes: string;
  status: LetterStatus;
  cancelReason: string;
  createdByUid: string;
  createdByName: string;
  createdByDivision: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NumberPreviewResult {
  canIssue: boolean;
  blockedReason: string | null;
  dayStatus: DayAllocationStatus;
  holidayName: string | null;
  startSeq: number | null;
  endSeq: number | null;
  usedCount: number;
  remainingQuota: number;
  nextSequenceNumber: number | null;
  fullNumber: string | null;
  nearestWorkingDate: string;
}
