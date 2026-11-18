import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  FilePlus2,
  FileSpreadsheet,
  LogOut,
  Menu,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, BOOTSTRAPPED_ADMIN_EMAIL, googleProvider } from './lib/firebase';
import { BUILTIN_CLASSIFICATIONS, DEFAULT_SYSTEM_SETTINGS } from './lib/numbering';
import {
  fetchUserProfileAndAdminStatus,
  issueOutgoingLetter,
  removeCalendarHoliday,
  removeClassificationCode,
  saveCalendarHoliday,
  saveClassificationCode,
  saveOwnStaffProfile,
  saveSystemSettings,
  subscribeCalendarHolidays,
  subscribeClassifications,
  subscribeDailyCounters,
  subscribeOutgoingLetters,
  subscribeStaffDirectory,
  subscribeSystemSettings,
  updateOutgoingLetterDetails,
  updateStaffMemberRoleAndStatus,
  voidOutgoingLetter,
} from './services/firestoreService';
import type {
  CalendarHoliday,
  ClassificationCode,
  DailyCounter,
  OutgoingLetter,
  StaffDirectoryEntry,
  StaffProfile,
  SystemSettings,
} from './types/letter';
import { CalendarAllocationView } from './components/CalendarAllocationView';
import { IssueLetterModal } from './components/IssueLetterModal';
import { LedgerView } from './components/LedgerView';
import { LetterDetailDrawer } from './components/LetterDetailDrawer';
import { LoginView } from './components/LoginView';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { SettingsView } from './components/SettingsView';
import { StaffView } from './components/StaffView';
import { StatsView } from './components/StatsView';

type ActiveTab = 'ledger' | 'calendar' | 'stats' | 'settings' | 'staff';

const NAV_ITEMS: { id: ActiveTab; label: string; icon: typeof FileSpreadsheet }[] = [
  { id: 'ledger', label: 'Buku Agenda Surat', icon: FileSpreadsheet },
  { id: 'calendar', label: 'Kalender & Alokasi', icon: CalendarDays },
  { id: 'stats', label: 'Statistik & Rekap', icon: BarChart3 },
  { id: 'settings', label: 'Klasifikasi & Format', icon: SlidersHorizontal },
  { id: 'staff', label: 'Daftar Staf', icon: Users },
];

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAdminGrant, setIsAdminGrant] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('ledger');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [preselectedIssueDate, setPreselectedIssueDate] = useState<string | null>(null);
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);

  const [letters, setLetters] = useState<OutgoingLetter[]>([]);
  const [lettersLoading, setLettersLoading] = useState(true);
  const [dailyCounters, setDailyCounters] = useState<Record<string, DailyCounter>>({});
  const [customHolidays, setCustomHolidays] = useState<Record<string, CalendarHoliday>>({});
  const [remoteSettings, setRemoteSettings] = useState<SystemSettings | null>(null);
  const [customClassifications, setCustomClassifications] = useState<ClassificationCode[]>([]);
  const [staffList, setStaffList] = useState<StaffDirectoryEntry[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthError(null);
      if (!nextUser) {
        setProfile(null);
        setIsAdminGrant(false);
        setAuthReady(true);
        return;
      }

      setProfileLoading(true);
      try {
        const { profile: loadedProfile, isAdminGrant: adminFlag } =
          await fetchUserProfileAndAdminStatus(nextUser.uid);
        setProfile(loadedProfile);
        setIsAdminGrant(adminFlag);
      } catch (err) {
        setAuthError(
          err instanceof Error ? err.message : 'Gagal memuat profil pengguna.',
        );
      } finally {
        setProfileLoading(false);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      return;
    }

    setLettersLoading(true);
    const unsubLetters = subscribeOutgoingLetters((items) => {
      setLetters(items);
      setLettersLoading(false);
    });
    const unsubDailyCounters = subscribeDailyCounters(setDailyCounters);
    const unsubHolidays = subscribeCalendarHolidays(setCustomHolidays);
    const unsubSettings = subscribeSystemSettings(setRemoteSettings);
    const unsubClassifications = subscribeClassifications(setCustomClassifications);
    const unsubStaff = subscribeStaffDirectory(setStaffList);

    return () => {
      unsubLetters();
      unsubDailyCounters();
      unsubHolidays();
      unsubSettings();
      unsubClassifications();
      unsubStaff();
    };
  }, [authReady, user]);

  const settings = remoteSettings ?? DEFAULT_SYSTEM_SETTINGS;

  const classifications = useMemo(() => {
    const map = new Map<string, ClassificationCode>();
    for (const item of BUILTIN_CLASSIFICATIONS) {
      map.set(item.code, item);
    }
    for (const item of customClassifications) {
      map.set(item.code, item);
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [customClassifications]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const isBootstrapped =
      (user.email ?? '').toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
    return isBootstrapped || isAdminGrant || profile?.role === 'admin';
  }, [user, isAdminGrant, profile]);

  const selectedLetter = useMemo(
    () => letters.find((l) => l.id === selectedLetterId) ?? null,
    [letters, selectedLetterId],
  );

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan akun Google. Silakan coba kembali.',
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleSaveProfile = async (data: {
    displayName: string;
    nip: string;
    division: string;
    jabatan: string;
  }) => {
    if (!user || !user.email) return;
    const saved = await saveOwnStaffProfile({
      uid: user.uid,
      email: user.email,
      displayName: data.displayName,
      nip: data.nip,
      division: data.division,
      jabatan: data.jabatan,
      existingProfile: profile,
    });
    setProfile(saved);
    setShowEditProfile(false);
  };

  const openIssueForDate = (isoDate?: string) => {
    setPreselectedIssueDate(isoDate ?? null);
    setShowIssueModal(true);
  };

  if (!authReady || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">
            Menyiapkan akses sistem persuratan...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onSignIn={handleSignIn} error={authError} />;
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 space-y-4">
          <h1 className="text-lg font-semibold text-slate-900">
            Email Akun Belum Terverifikasi
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Sistem penomoran surat mewajibkan akun dengan email terverifikasi demi keamanan arsip dinas. Silakan gunakan akun Google terverifikasi.
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg cursor-pointer"
          >
            Keluar & Ganti Akun
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ProfileSetupModal
          uid={user.uid}
          email={user.email ?? ''}
          defaultDisplayName={user.displayName ?? ''}
          existingProfile={null}
          onSave={handleSaveProfile}
        />
      </div>
    );
  }

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeTab)!;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Left Workspace Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
              {settings.institutionName}
            </span>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Tutup menu"
              className="p-1.5 text-slate-500 hover:text-slate-800 lg:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {profile.displayName}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {profile.division} · {isAdmin ? 'Koordinator' : 'Staf'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEditProfile(true)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Profil
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka menu navigasi"
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                Penomoran Surat
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">
                {activeNavMeta.label}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openIssueForDate()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4 shrink-0" />
            <span>Ambil Nomor Surat</span>
          </button>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {activeTab === 'ledger' && (
            <LedgerView
              letters={letters}
              loading={lettersLoading}
              settings={settings}
              classifications={classifications}
              dailyCounters={dailyCounters}
              customHolidays={customHolidays}
              onOpenIssueModal={() => openIssueForDate()}
              onSelectLetter={(l) => setSelectedLetterId(l.id)}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarAllocationView
              settings={settings}
              dailyCounters={dailyCounters}
              customHolidays={customHolidays}
              isAdmin={isAdmin}
              onIssueForDate={(isoDate) => openIssueForDate(isoDate)}
              onSaveHoliday={(params) =>
                saveCalendarHoliday({ ...params, actorUid: user.uid })
              }
              onRemoveHoliday={removeCalendarHoliday}
            />
          )}

          {activeTab === 'stats' && (
            <StatsView letters={letters} classifications={classifications} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              classifications={classifications}
              customClassifications={customClassifications}
              isAdmin={isAdmin}
              onSaveSettings={(data) => saveSystemSettings(data, user.uid)}
              onSaveClassification={saveClassificationCode}
              onDeleteClassification={removeClassificationCode}
            />
          )}

          {activeTab === 'staff' && (
            <StaffView
              staffList={staffList}
              currentProfile={profile}
              isAdmin={isAdmin}
              onEditOwnProfile={() => setShowEditProfile(true)}
              onUpdateRoleAndStatus={({ targetUid, role, active }) =>
                updateStaffMemberRoleAndStatus({
                  targetUid,
                  role,
                  active,
                  actorUid: user.uid,
                })
              }
            />
          )}
        </main>
      </div>

      {showIssueModal && (
        <IssueLetterModal
          profile={profile}
          settings={settings}
          classifications={classifications}
          dailyCounters={dailyCounters}
          customHolidays={customHolidays}
          initialDate={preselectedIssueDate}
          onIssue={(payload) =>
            issueOutgoingLetter({
              ...payload,
              profile,
              settings,
              customHolidays,
            })
          }
          onClose={() => {
            setShowIssueModal(false);
            setPreselectedIssueDate(null);
          }}
        />
      )}

      {selectedLetter && (
        <LetterDetailDrawer
          letter={selectedLetter}
          profile={profile}
          isAdmin={isAdmin}
          padDigits={settings.padDigits}
          onUpdate={updateOutgoingLetterDetails}
          onVoid={voidOutgoingLetter}
          onClose={() => setSelectedLetterId(null)}
        />
      )}

      {showEditProfile && (
        <ProfileSetupModal
          uid={user.uid}
          email={user.email ?? ''}
          defaultDisplayName={user.displayName ?? ''}
          existingProfile={profile}
          onSave={handleSaveProfile}
          onCancel={() => setShowEditProfile(false)}
        />
      )}
    </div>
  );
}
