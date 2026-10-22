import React, { useState, useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { AppSidebar } from './components/layout/AppSidebar';
import { LoginView } from './components/auth/LoginView';

// Icons & Utilities
import { Sparkles, Church, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';

// Lazy-loaded Views for ultra-fast startup (<1s)
const RegisterMultiStep = React.lazy(() => import('./components/auth/RegisterMultiStep').then(m => ({ default: m.RegisterMultiStep })));
const MemberDashboard = React.lazy(() => import('./components/member/MemberDashboard').then(m => ({ default: m.MemberDashboard })));
const AttendanceView = React.lazy(() => import('./components/member/AttendanceView').then(m => ({ default: m.AttendanceView })));
const ActivitiesView = React.lazy(() => import('./components/member/ActivitiesView').then(m => ({ default: m.ActivitiesView })));
const AnnouncementsView = React.lazy(() => import('./components/member/AnnouncementsView').then(m => ({ default: m.AnnouncementsView })));
const NotificationsView = React.lazy(() => import('./components/member/NotificationsView').then(m => ({ default: m.NotificationsView })));
const ProfileView = React.lazy(() => import('./components/member/ProfileView').then(m => ({ default: m.ProfileView })));
const PrayerWallView = React.lazy(() => import('./components/prayer/PrayerWallView').then(m => ({ default: m.PrayerWallView })));

// Admin Views
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const MembersManagement = React.lazy(() => import('./components/admin/MembersManagement').then(m => ({ default: m.MembersManagement })));
const EventsManagement = React.lazy(() => import('./components/admin/EventsManagement').then(m => ({ default: m.EventsManagement })));
const AttendanceManagement = React.lazy(() => import('./components/admin/AttendanceManagement').then(m => ({ default: m.AttendanceManagement })));
const DepartmentsManagement = React.lazy(() => import('./components/admin/DepartmentsManagement').then(m => ({ default: m.DepartmentsManagement })));
const GroupsManagement = React.lazy(() => import('./components/admin/GroupsManagement').then(m => ({ default: m.GroupsManagement })));
const AnnouncementsManagement = React.lazy(() => import('./components/admin/AnnouncementsManagement').then(m => ({ default: m.AnnouncementsManagement })));
const ReportsManagement = React.lazy(() => import('./components/admin/ReportsManagement').then(m => ({ default: m.ReportsManagement })));
const SettingsManagement = React.lazy(() => import('./components/admin/SettingsManagement').then(m => ({ default: m.SettingsManagement })));

// Modals
const AIAssistantModal = React.lazy(() => import('./components/ai/AIAssistantModal').then(m => ({ default: m.AIAssistantModal })));
const DigitalCardModal = React.lazy(() => import('./components/member/DigitalCardModal').then(m => ({ default: m.DigitalCardModal })));

const ViewFallback = () => (
  <div className="flex items-center justify-center p-12 text-slate-400">
    <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mr-2" />
    <span className="text-xs font-medium">Loading view...</span>
  </div>
);

const MainApp: React.FC = () => {
  const { firebaseUser, role, loading, member, switchRoleForDemo } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [justRegistered, setJustRegistered] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDigitalCardOpen, setIsDigitalCardOpen] = useState(false);

  // Seamlessly activate admin privileges when an admin tab is selected
  useEffect(() => {
    if (currentTab.startsWith('admin-') && role !== 'admin' && role !== 'super_admin') {
      switchRoleForDemo('admin');
    }
  }, [currentTab, role]);

  // Fetch unread notifications count in background
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const fetchUnread = async () => {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', firebaseUser.uid),
          where('read', '==', false)
        );
        const snap = await getDocs(q);
        setUnreadNotifsCount(snap.size);
      } catch {
        // quiet ignore
      }
    };
    fetchUnread();
  }, [firebaseUser?.uid, currentTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 mb-4 animate-pulse">
          <Church className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black tracking-tight text-slate-800">FAITHTRACK</h2>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          Loading sanctuary portal...
        </p>
      </div>
    );
  }

  // Unauthenticated or currently celebrating registration completion
  if (!firebaseUser || justRegistered) {
    return (
      <div className="min-h-screen bg-slate-50">
        {authView === 'login' && !justRegistered ? (
          <LoginView onSwitchToRegister={() => setAuthView('register')} />
        ) : (
          <Suspense fallback={<ViewFallback />}>
            <RegisterMultiStep
              onSwitchToLogin={() => {
                setJustRegistered(false);
                setAuthView('login');
              }}
              onRegisteredSuccess={() => {
                setJustRegistered(false);
                setAuthView('login');
                setCurrentTab('home');
              }}
              onRegistrationInitiated={() => setJustRegistered(true)}
            />
          </Suspense>
        )}
      </div>
    );
  }

  const isAdminRole = role === 'admin' || role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        unreadNotificationsCount={unreadNotifsCount}
        onOpenAIAssistant={() => setIsAIOpen(true)}
        onToggleMobileNav={() => setIsMobileNavOpen(prev => !prev)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Unified Responsive Web Sidebar for Desktop, Tablet, and Mobile */}
        <AppSidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          unreadNotificationsCount={unreadNotifsCount}
          onOpenDigitalCard={() => setIsDigitalCardOpen(true)}
          onOpenAIAssistant={() => setIsAIOpen(true)}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Main Content Area with Lazy Loading Suspense */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <Suspense fallback={<ViewFallback />}>
            {/* Member View Routes */}
            {currentTab === 'home' && (
              <MemberDashboard
                onSelectTab={setCurrentTab}
                onOpenAIAssistant={() => setIsAIOpen(true)}
              />
            )}
            {currentTab === 'activities' && <ActivitiesView />}
            {currentTab === 'prayers' && <PrayerWallView />}
            {currentTab === 'attendance' && <AttendanceView onSelectTab={setCurrentTab} />}
            {currentTab === 'notifications' && <NotificationsView />}
            {currentTab === 'profile' && <ProfileView />}
            {currentTab === 'announcements' && <AnnouncementsView />}

            {/* Admin View Routes */}
            {currentTab === 'admin-dashboard' && (
              <AdminDashboard
                onSelectTab={setCurrentTab}
                onOpenAIAssistant={() => setIsAIOpen(true)}
              />
            )}
            {currentTab === 'admin-members' && <MembersManagement />}
            {currentTab === 'admin-events' && <EventsManagement />}
            {currentTab === 'admin-attendance' && <AttendanceManagement />}
            {currentTab === 'admin-departments' && <DepartmentsManagement />}
            {currentTab === 'admin-groups' && <GroupsManagement />}
            {currentTab === 'admin-announcements' && <AnnouncementsManagement />}
            {currentTab === 'admin-reports' && <ReportsManagement />}
            {currentTab === 'admin-settings' && <SettingsManagement />}
          </Suspense>
        </main>
      </div>

      {/* Floating AI Assistant Action Button */}
      <button
        onClick={() => setIsAIOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-700/30 active:scale-95 transition-all flex items-center justify-center group"
        aria-label="Open Church AI Assistant"
        title="Ask Church AI"
      >
        <Sparkles className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform" />
      </button>

      {/* Suspense Modals */}
      <Suspense fallback={null}>
        {isAIOpen && (
          <AIAssistantModal
            isOpen={isAIOpen}
            onClose={() => setIsAIOpen(false)}
          />
        )}
        {isDigitalCardOpen && (
          <DigitalCardModal
            isOpen={isDigitalCardOpen}
            onClose={() => setIsDigitalCardOpen(false)}
            member={member}
          />
        )}
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
