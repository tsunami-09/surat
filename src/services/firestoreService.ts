import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { getDayAllocation } from '../lib/calendar';
import { buildSortKey, formatFullLetterNumber } from '../lib/numbering';
import {
  BLUEPRINT_LIMITS,
  DAILY_QUOTA,
  type CalendarHoliday,
  type ClassificationCode,
  type DailyCounter,
  type HolidayKind,
  type LetterCategory,
  type OutgoingLetter,
  type RevokedUser,
  type StaffDirectoryEntry,
  type StaffProfile,
  type StaffRole,
  type SystemSettings,
} from '../types/letter';

function sanitizeText(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export async function fetchUserProfileAndAdminStatus(uid: string): Promise<{
  profile: StaffProfile | null;
  isAdminGrant: boolean;
}> {
  try {
    const profileSnap = await getDoc(doc(db, 'staff_profiles', uid));
    const adminSnap = await getDoc(doc(db, 'admins', uid));
    return {
      profile: profileSnap.exists() ? (profileSnap.data() as StaffProfile) : null,
      isAdminGrant: adminSnap.exists(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `staff_profiles/${uid}`);
  }
}

export async function syncBootstrappedAdminRole(
  uid: string,
  email: string,
): Promise<StaffProfile | null> {
  if (email.toLowerCase() !== BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  try {
    const profileRef = doc(db, 'staff_profiles', uid);
    const directoryRef = doc(db, 'staff_directory', uid);
    const adminRef = doc(db, 'admins', uid);

    const [profileSnap, directorySnap, adminSnap] = await Promise.all([
      getDoc(profileRef),
      getDoc(directoryRef),
      getDoc(adminRef),
    ]);

    let updatedProfile: StaffProfile | null = profileSnap.exists()
      ? (profileSnap.data() as StaffProfile)
      : null;

    if (profileSnap.exists()) {
      const data = profileSnap.data() as StaffProfile;
      if (data.role !== 'admin') {
        await updateDoc(profileRef, {
          role: 'admin',
          updatedAt: serverTimestamp(),
        });
        updatedProfile = { ...data, role: 'admin' };
      }
    }

    if (directorySnap.exists()) {
      const dirData = directorySnap.data() as StaffDirectoryEntry;
      if (dirData.role !== 'admin' || !dirData.active) {
        await updateDoc(directoryRef, {
          role: 'admin',
          active: true,
          updatedAt: serverTimestamp(),
        });
      }
    }

    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        grantedByUid: uid,
        createdAt: serverTimestamp(),
      });
    }

    return updatedProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `staff_profiles/${uid}`);
  }
}

export async function saveOwnStaffProfile(params: {
  uid: string;
  email: string;
  displayName: string;
  nip: string;
  division: string;
  jabatan: string;
  existingProfile: StaffProfile | null;
}): Promise<StaffProfile> {
  const { uid, email, displayName, nip, division, jabatan, existingProfile } = params;
  const cleanName = sanitizeText(displayName, BLUEPRINT_LIMITS.maxDisplayName);
  const cleanNip = sanitizeText(nip, BLUEPRINT_LIMITS.maxNip);
  const cleanDivision = sanitizeText(division, BLUEPRINT_LIMITS.maxDivision);
  const cleanJabatan = sanitizeText(jabatan, BLUEPRINT_LIMITS.maxJabatan);

  if (cleanName.length < BLUEPRINT_LIMITS.minDisplayName) {
    throw new Error('Nama lengkap minimal 2 karakter.');
  }
  if (cleanDivision.length < 2 || cleanJabatan.length < 2) {
    throw new Error('Bagian/Seksi dan Jabatan wajib diisi.');
  }

  const isBootstrapped = email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
  const targetRole: StaffRole = isBootstrapped ? 'admin' : (existingProfile?.role ?? 'staff');

  const profileRef = doc(db, 'staff_profiles', uid);
  const directoryRef = doc(db, 'staff_directory', uid);

  try {
    if (!existingProfile) {
      await setDoc(profileRef, {
        uid,
        email: sanitizeText(email, 160),
        displayName: cleanName,
        nip: cleanNip,
        division: cleanDivision,
        jabatan: cleanJabatan,
        role: targetRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(directoryRef, {
        uid,
        displayName: cleanName,
        division: cleanDivision,
        jabatan: cleanJabatan,
        role: targetRole,
        active: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(profileRef, {
        displayName: cleanName,
        nip: cleanNip,
        division: cleanDivision,
        jabatan: cleanJabatan,
        ...(isBootstrapped ? { role: 'admin' as const } : {}),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(directoryRef, {
        displayName: cleanName,
        division: cleanDivision,
        jabatan: cleanJabatan,
        ...(isBootstrapped ? { role: 'admin' as const, active: true } : {}),
        updatedAt: serverTimestamp(),
      });
    }

    if (isBootstrapped) {
      const adminRef = doc(db, 'admins', uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          grantedByUid: uid,
          createdAt: serverTimestamp(),
        });
      }
    }

    return {
      uid,
      email,
      displayName: cleanName,
      nip: cleanNip,
      division: cleanDivision,
      jabatan: cleanJabatan,
      role: targetRole,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `staff_profiles/${uid}`);
  }
}

export function subscribeSystemSettings(
  onData: (settings: SystemSettings | null) => void,
): Unsubscribe {
  const path = 'system_settings/main';
  return onSnapshot(
    doc(db, 'system_settings', 'main'),
    (snap) => {
      onData(snap.exists() ? (snap.data() as SystemSettings) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export async function saveSystemSettings(
  settings: Omit<SystemSettings, 'updatedByUid' | 'updatedAt'>,
  actorUid: string,
): Promise<void> {
  const path = 'system_settings/main';
  const cleanInstitution = sanitizeText(settings.institutionName, BLUEPRINT_LIMITS.maxInstitutionName);
  const cleanUnit = sanitizeText(settings.unitCode, BLUEPRINT_LIMITS.maxUnitCode);
  const cleanFormat = sanitizeText(settings.numberFormat, BLUEPRINT_LIMITS.maxNumberFormat);
  const padDigits = Math.min(6, Math.max(2, Math.round(settings.padDigits)));

  if (!BLUEPRINT_LIMITS.unitCodePattern.test(cleanUnit)) {
    throw new Error('Kode unit hanya boleh berisi huruf, angka, titik, strip, atau garis miring.');
  }

  try {
    const ref = doc(db, 'system_settings', 'main');
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        institutionName: cleanInstitution,
        unitCode: cleanUnit,
        numberFormat: cleanFormat,
        padDigits,
        updatedByUid: actorUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        institutionName: cleanInstitution,
        unitCode: cleanUnit,
        numberFormat: cleanFormat,
        padDigits,
        updatedByUid: actorUid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeClassifications(
  onData: (items: ClassificationCode[]) => void,
): Unsubscribe {
  const path = 'classifications';
  const q = query(collection(db, path), where('code', '>', ''));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ClassificationCode, 'id'>),
        }))
        .sort((a, b) => a.code.localeCompare(b.code));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function saveClassificationCode(params: {
  code: string;
  label: string;
  description: string;
  active: boolean;
  existingId?: string;
}): Promise<void> {
  const cleanCode = sanitizeText(params.code, BLUEPRINT_LIMITS.maxClassificationCode);
  const cleanLabel = sanitizeText(params.label, BLUEPRINT_LIMITS.maxClassificationLabel);
  const cleanDesc = sanitizeText(params.description, BLUEPRINT_LIMITS.maxClassificationDesc);

  if (!BLUEPRINT_LIMITS.classificationPattern.test(cleanCode)) {
    throw new Error('Kode klasifikasi hanya boleh berisi huruf, angka, titik, atau tanda hubung.');
  }
  if (cleanLabel.length < 2) {
    throw new Error('Nama klasifikasi minimal 2 karakter.');
  }

  const docId =
    params.existingId ?? `cls-${cleanCode.replace(/[^a-zA-Z0-9_\-]/g, '_')}-${Date.now()}`;
  const path = `classifications/${docId}`;

  try {
    const ref = doc(db, 'classifications', docId);
    if (params.existingId) {
      await updateDoc(ref, {
        code: cleanCode,
        label: cleanLabel,
        description: cleanDesc,
        active: params.active,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        code: cleanCode,
        label: cleanLabel,
        description: cleanDesc,
        active: params.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeClassificationCode(id: string): Promise<void> {
  const path = `classifications/${id}`;
  try {
    await deleteDoc(doc(db, 'classifications', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeDailyCounters(
  onData: (counters: Record<string, DailyCounter>) => void,
): Unsubscribe {
  const path = 'daily_counters';
  const q = query(collection(db, path), where('year', '>=', 2000));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, DailyCounter> = {};
      for (const d of snap.docs) {
        const data = d.data() as DailyCounter;
        map[data.date] = data;
      }
      onData(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeCalendarHolidays(
  onData: (holidays: Record<string, CalendarHoliday>) => void,
): Unsubscribe {
  const path = 'calendar_holidays';
  const q = query(collection(db, path), where('year', '>=', 2000));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, CalendarHoliday> = {};
      for (const d of snap.docs) {
        const data = d.data() as CalendarHoliday;
        map[data.date] = data;
      }
      onData(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function saveCalendarHoliday(params: {
  date: string;
  name: string;
  kind: HolidayKind;
  active: boolean;
  actorUid: string;
}): Promise<void> {
  const { date, name, kind, active, actorUid } = params;
  if (!BLUEPRINT_LIMITS.datePattern.test(date)) {
    throw new Error('Format tanggal harus YYYY-MM-DD.');
  }
  const cleanName = sanitizeText(name, BLUEPRINT_LIMITS.maxHolidayName);
  if (cleanName.length < 2) {
    throw new Error('Keterangan hari libur minimal 2 karakter.');
  }
  const year = Number(date.slice(0, 4));
  const path = `calendar_holidays/${date}`;

  try {
    const ref = doc(db, 'calendar_holidays', date);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        date,
        year,
        name: cleanName,
        kind,
        active,
        updatedByUid: actorUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: cleanName,
        kind,
        active,
        updatedByUid: actorUid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeCalendarHoliday(date: string): Promise<void> {
  const path = `calendar_holidays/${date}`;
  try {
    await deleteDoc(doc(db, 'calendar_holidays', date));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeOutgoingLetters(
  onData: (letters: OutgoingLetter[]) => void,
): Unsubscribe {
  const path = 'outgoing_letters';
  const q = query(collection(db, path), where('year', '>=', 2000));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<OutgoingLetter, 'id'>),
        }))
        .sort((a, b) => {
          if (a.sequenceNumber !== b.sequenceNumber) {
            return a.sequenceNumber - b.sequenceNumber;
          }
          return a.letterDate.localeCompare(b.letterDate);
        });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeStaffDirectory(
  onData: (staff: StaffDirectoryEntry[]) => void,
): Unsubscribe {
  const path = 'staff_directory';
  const q = query(collection(db, path), where('uid', '>', ''));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => d.data() as StaffDirectoryEntry)
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function issueOutgoingLetter(params: {
  letterDate: string;
  classificationCode: string;
  category: LetterCategory;
  subject: string;
  recipient: string;
  picName: string;
  notes: string;
  profile: StaffProfile;
  settings: SystemSettings;
  customHolidays: Record<string, CalendarHoliday>;
}): Promise<{ id: string; fullNumber: string; sequenceNumber: number }> {
  const {
    letterDate,
    classificationCode,
    category,
    subject,
    recipient,
    picName,
    notes,
    profile,
    settings,
    customHolidays,
  } = params;

  if (!BLUEPRINT_LIMITS.datePattern.test(letterDate)) {
    throw new Error('Format tanggal surat harus YYYY-MM-DD.');
  }

  const alloc = getDayAllocation(letterDate, customHolidays);
  if (!alloc || alloc.status !== 'hari_kerja' || alloc.startSeq === null || alloc.endSeq === null) {
    throw new Error(
      `Tanggal ${letterDate} jatuh pada ${alloc?.holidayName ?? 'hari libur'}. Alokasi nomor surat dikosongkan.`,
    );
  }

  const cleanClass = sanitizeText(classificationCode, BLUEPRINT_LIMITS.maxClassificationCode);
  const cleanSubject = sanitizeText(subject, BLUEPRINT_LIMITS.maxSubject);
  const cleanRecipient = sanitizeText(recipient, BLUEPRINT_LIMITS.maxRecipient);
  const cleanPic = sanitizeText(picName, BLUEPRINT_LIMITS.maxPicName);
  const cleanNotes = sanitizeText(notes, BLUEPRINT_LIMITS.maxNotes);

  if (cleanSubject.length < BLUEPRINT_LIMITS.minSubject) {
    throw new Error('Perihal surat minimal 3 karakter.');
  }
  if (cleanRecipient.length < BLUEPRINT_LIMITS.minRecipient) {
    throw new Error('Tujuan / penerima surat minimal 2 karakter.');
  }
  if (cleanPic.length < BLUEPRINT_LIMITS.minPicName) {
    throw new Error('Nama pengolah / penandatangan minimal 2 karakter.');
  }

  const year = alloc.year;
  const month = alloc.month;
  const startSeq = alloc.startSeq;
  const endSeq = alloc.endSeq;

  const letterId = crypto.randomUUID();
  const dailyCounterRef = doc(db, 'daily_counters', letterDate);
  const letterRef = doc(db, 'outgoing_letters', letterId);

  try {
    const result = await runTransaction(db, async (tx) => {
      const counterSnap = await tx.get(dailyCounterRef);
      const existingData = counterSnap.exists() ? (counterSnap.data() as DailyCounter) : null;
      const usedCount = existingData?.usedCount ?? 0;

      if (usedCount >= DAILY_QUOTA) {
        throw new Error(
          `Kuota maksimal 15 nomor untuk tanggal ${letterDate} sudah terpenuhi.`,
        );
      }

      const effectiveStart = existingData?.startSeq ?? startSeq;
      const effectiveEnd = existingData?.endSeq ?? endSeq;
      const sequenceNumber = effectiveStart + usedCount;

      if (sequenceNumber > effectiveEnd) {
        throw new Error(
          `Kuota maksimal 15 nomor untuk tanggal ${letterDate} sudah terpenuhi.`,
        );
      }

      if (!counterSnap.exists()) {
        tx.set(dailyCounterRef, {
          date: letterDate,
          year,
          startSeq: effectiveStart,
          endSeq: effectiveEnd,
          usedCount: 1,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.update(dailyCounterRef, {
          usedCount: usedCount + 1,
          updatedAt: serverTimestamp(),
        });
      }

      const fullNumber = formatFullLetterNumber({
        classificationCode: cleanClass,
        sequenceNumber,
        subNumber: 0,
        unitCode: settings.unitCode,
        month,
        year,
        settings,
      });

      const sortKey = buildSortKey(letterDate, sequenceNumber);

      tx.set(letterRef, {
        year,
        month,
        letterDate,
        sequenceNumber,
        subNumber: 0,
        sortKey,
        classificationCode: cleanClass,
        unitCode: settings.unitCode,
        fullNumber: sanitizeText(fullNumber, 80),
        category,
        subject: cleanSubject,
        recipient: cleanRecipient,
        picName: cleanPic,
        notes: cleanNotes,
        status: 'terbit',
        cancelReason: '',
        createdByUid: profile.uid,
        createdByName: sanitizeText(profile.displayName, BLUEPRINT_LIMITS.maxDisplayName),
        createdByDivision: sanitizeText(profile.division, BLUEPRINT_LIMITS.maxDivision),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { id: letterId, fullNumber, sequenceNumber };
    });

    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Kuota maksimal 15 nomor')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, `outgoing_letters/${letterId}`);
  }
}

export async function updateOutgoingLetterDetails(params: {
  letterId: string;
  category: LetterCategory;
  subject: string;
  recipient: string;
  picName: string;
  notes: string;
}): Promise<void> {
  const path = `outgoing_letters/${params.letterId}`;
  const cleanSubject = sanitizeText(params.subject, BLUEPRINT_LIMITS.maxSubject);
  const cleanRecipient = sanitizeText(params.recipient, BLUEPRINT_LIMITS.maxRecipient);
  const cleanPic = sanitizeText(params.picName, BLUEPRINT_LIMITS.maxPicName);
  const cleanNotes = sanitizeText(params.notes, BLUEPRINT_LIMITS.maxNotes);

  if (cleanSubject.length < BLUEPRINT_LIMITS.minSubject) {
    throw new Error('Perihal surat minimal 3 karakter.');
  }
  if (cleanRecipient.length < BLUEPRINT_LIMITS.minRecipient) {
    throw new Error('Tujuan surat minimal 2 karakter.');
  }

  try {
    await updateDoc(doc(db, 'outgoing_letters', params.letterId), {
      category: params.category,
      subject: cleanSubject,
      recipient: cleanRecipient,
      picName: cleanPic,
      notes: cleanNotes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function attachDriveFileToLetter(params: {
  letterId: string;
  driveFileId: string;
  driveFileName: string;
  driveWebViewLink: string;
}): Promise<void> {
  const path = `outgoing_letters/${params.letterId}`;
  const cleanId = sanitizeText(params.driveFileId, BLUEPRINT_LIMITS.maxDriveFileId);
  const cleanName = sanitizeText(params.driveFileName, BLUEPRINT_LIMITS.maxDriveFileName);
  const cleanLink = sanitizeText(params.driveWebViewLink, BLUEPRINT_LIMITS.maxDriveWebViewLink);

  if (
    cleanLink &&
    !cleanLink.startsWith('https://drive.google.com/') &&
    !cleanLink.startsWith('https://docs.google.com/')
  ) {
    throw new Error('Tautan Google Drive tidak valid.');
  }

  try {
    await updateDoc(doc(db, 'outgoing_letters', params.letterId), {
      driveFileId: cleanId,
      driveFileName: cleanName,
      driveWebViewLink: cleanLink,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function clearDriveFileFromLetter(letterId: string): Promise<void> {
  const path = `outgoing_letters/${letterId}`;
  try {
    await updateDoc(doc(db, 'outgoing_letters', letterId), {
      driveFileId: '',
      driveFileName: '',
      driveWebViewLink: '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function voidOutgoingLetter(params: {
  letterId: string;
  cancelReason: string;
}): Promise<void> {
  const path = `outgoing_letters/${params.letterId}`;
  const cleanReason = sanitizeText(params.cancelReason, BLUEPRINT_LIMITS.maxCancelReason);

  if (cleanReason.length < BLUEPRINT_LIMITS.minCancelReason) {
    throw new Error('Alasan pembatalan minimal 3 karakter.');
  }

  try {
    await updateDoc(doc(db, 'outgoing_letters', params.letterId), {
      status: 'batal',
      cancelReason: cleanReason,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateStaffMemberRoleAndStatus(params: {
  targetUid: string;
  role: StaffRole;
  active: boolean;
  actorUid: string;
}): Promise<void> {
  const { targetUid, role, active, actorUid } = params;
  const dirPath = `staff_directory/${targetUid}`;
  try {
    await updateDoc(doc(db, 'staff_directory', targetUid), {
      role,
      active,
      updatedAt: serverTimestamp(),
    });

    const profileSnap = await getDoc(doc(db, 'staff_profiles', targetUid));
    if (profileSnap.exists()) {
      await updateDoc(doc(db, 'staff_profiles', targetUid), {
        role,
        updatedAt: serverTimestamp(),
      });
    }

    const adminRef = doc(db, 'admins', targetUid);
    if (role === 'admin' && active) {
      await setDoc(adminRef, {
        grantedByUid: actorUid,
        createdAt: serverTimestamp(),
      });
    } else if (targetUid !== actorUid) {
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists()) {
        await deleteDoc(adminRef);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, dirPath);
  }
}

export async function checkIsUserRevoked(uid: string): Promise<boolean> {
  const path = `revoked_users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'revoked_users', uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeRevokedUsers(
  actorUid: string,
  onData: (items: RevokedUser[]) => void,
): Unsubscribe {
  const path = 'revoked_users';
  const q = query(collection(db, path), where('revokedByUid', '==', actorUid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as RevokedUser)
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function deleteStaffAccount(params: {
  targetUid: string;
  displayName: string;
  actorUid: string;
}): Promise<void> {
  const { targetUid, displayName, actorUid } = params;
  if (targetUid === actorUid) {
    throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');
  }

  const cleanName = sanitizeText(displayName, BLUEPRINT_LIMITS.maxDisplayName) || 'Staf';
  const revokedPath = `revoked_users/${targetUid}`;

  try {
    await setDoc(doc(db, 'revoked_users', targetUid), {
      uid: targetUid,
      displayName: cleanName,
      revokedByUid: actorUid,
      createdAt: serverTimestamp(),
    });

    const dirRef = doc(db, 'staff_directory', targetUid);
    const dirSnap = await getDoc(dirRef);
    if (dirSnap.exists()) {
      await deleteDoc(dirRef);
    }

    const profileRef = doc(db, 'staff_profiles', targetUid);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      await deleteDoc(profileRef);
    }

    const adminRef = doc(db, 'admins', targetUid);
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      await deleteDoc(adminRef);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, revokedPath);
  }
}

export async function restoreRevokedAccount(targetUid: string): Promise<void> {
  const path = `revoked_users/${targetUid}`;
  try {
    await deleteDoc(doc(db, 'revoked_users', targetUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
