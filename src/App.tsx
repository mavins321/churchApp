import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { AppSidebar } from './components/layout/AppSidebar';
import { DigitalCardModal } from './components/member/DigitalCardModal';

// Auth Views
import { LoginView } from './components/auth/LoginView';
import { RegisterMultiStep } from './components/auth/RegisterMultiStep';

// Member Views
import { MemberDashboard } from './components/member/MemberDashboard';
import { AttendanceView } from './components/member/AttendanceView';
import { ActivitiesView } from './components/member/ActivitiesView';
import { AnnouncementsView } from './components/member/AnnouncementsView';
import { NotificationsView } from './components/member/NotificationsView';
import { ProfileView } from './components/member/ProfileView';

// Admin Views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MembersManagement } from './components/admin/MembersManagement';
import { EventsManagement } from './components/admin/EventsManagement';
import { AttendanceManagement } from './components/admin/AttendanceManagement';
import { DepartmentsManagement } from './components/admin/DepartmentsManagement';
import { GroupsManagement } from './components/admin/GroupsManagement';
import { AnnouncementsManagement } from './components/admin/AnnouncementsManagement';
import { ReportsManagement } from './components/admin/ReportsManagement';
import { SettingsManagement } from './components/admin/SettingsManagement';

// AI Assistant
import { AIAssistantModal } from './components/ai/AIAssistantModal';

// Icons & Utilities
import { Sparkles, Church, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';

const MainApp: React.FC = () => {
  const { firebaseUser, role, loading, member } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [justRegistered, setJustRegistered] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDigitalCardOpen, setIsDigitalCardOpen] = useState(false);

  // Sync tab with role on switch
  useEffect(() => {
    if (role === 'admin' || role === 'super_admin') {
      if (!currentTab.startsWith('admin-')) {
        setCurrentTab('admin-dashboard');
      }
    } else {
      if (currentTab.startsWith('admin-')) {
        setCurrentTab('home');
      }
    }
  }, [role]);

  // Fetch unread notifications count
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

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Member View Routes */}
          {currentTab === 'home' && (
            <MemberDashboard
              onSelectTab={setCurrentTab}
              onOpenAIAssistant={() => setIsAIOpen(true)}
            />
          )}
          {currentTab === 'activities' && <ActivitiesView />}
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

      {/* Gemini AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
      />

      {/* Digital Member ID Card Modal */}
      <DigitalCardModal
        isOpen={isDigitalCardOpen}
        onClose={() => setIsDigitalCardOpen(false)}
        member={member}
      />
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
