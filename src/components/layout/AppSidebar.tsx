import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardCheck, 
  Building2, 
  FolderGit2, 
  Megaphone, 
  BarChart3, 
  Settings,
  Home,
  Bell,
  User,
  CreditCard,
  Sparkles,
  ShieldCheck,
  ArrowRightLeft,
  X,
  Church,
  Heart
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface AppSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  unreadNotificationsCount?: number;
  onOpenDigitalCard?: () => void;
  onOpenAIAssistant?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  onSelectTab,
  unreadNotificationsCount = 0,
  onOpenDigitalCard,
  onOpenAIAssistant,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const { role, member, userProfile, switchRoleForDemo } = useAuth();
  const isAdminRole = role === 'admin' || role === 'super_admin';

  const memberNavItems: NavItem[] = [
    { id: 'home', label: 'Overview', icon: Home, description: 'Dashboard & Next Service' },
    { id: 'activities', label: 'Activities', icon: Calendar, description: 'Services & Gatherings' },
    { id: 'prayers', label: 'Prayer Wall', icon: Heart, description: 'Petitions & Testimonies' },
    { id: 'attendance', label: 'My Attendance', icon: ClipboardCheck, description: 'Personal History' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, description: 'Church Bulletins' },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: Bell, 
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      description: 'Activity Receipts' 
    },
    { id: 'profile', label: 'My Profile', icon: User, description: 'Account & Information' },
  ];

  const adminNavItems: NavItem[] = [
    { id: 'admin-dashboard', label: 'Admin Overview', icon: LayoutDashboard, description: 'Church Metrics & Operations' },
    { id: 'admin-members', label: 'Members Directory', icon: Users, description: 'Registry & Pastoral Care' },
    { id: 'admin-events', label: 'Activities & Services', icon: Calendar, description: 'Schedules & Check-in' },
    { id: 'prayers', label: 'Prayer Wall', icon: Heart, description: 'Intercessions & Testimonies' },
    { id: 'admin-attendance', label: 'Attendance Roll Call', icon: ClipboardCheck, description: 'Live Headcount & Audits' },
    { id: 'admin-departments', label: 'Departments', icon: Building2, description: 'Ministry Teams' },
    { id: 'admin-groups', label: 'Cell Groups', icon: FolderGit2, description: 'Fellowship Circles' },
    { id: 'admin-announcements', label: 'Announcements', icon: Megaphone, description: 'Broadcast Bulletins' },
    { id: 'admin-reports', label: 'Reports & Export', icon: BarChart3, description: 'Analytics, CSV & PDF' },
    { id: 'admin-settings', label: 'Church Settings', icon: Settings, description: 'Parish Configuration' },
  ];

  const handleItemClick = (tabId: string) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-5">
        {/* Mobile Header when inside slideover drawer */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Church className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-slate-900">FAITHTRACK</span>
              <p className="text-[10px] text-slate-400">Web Portal</p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Portal Context Banner & Quick Switcher */}
        <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              {isAdminRole ? 'Church Administration' : 'Congregation Portal'}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {isAdminRole ? 'Admin' : 'Member'}
            </span>
          </div>
          <p className="text-xs text-slate-700 font-bold truncate">
            {member?.fullName || userProfile?.displayName || 'FaithTrack Cathedral'}
          </p>

          <div className="flex items-center gap-1 p-0.5 bg-white/90 rounded-xl border border-emerald-200/70 text-xs">
            <button
              onClick={() => {
                switchRoleForDemo('member');
                handleItemClick('home');
              }}
              className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition-all ${
                !isAdminRole
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Member
            </button>
            <button
              onClick={() => {
                switchRoleForDemo('admin');
                handleItemClick('admin-dashboard');
              }}
              className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition-all flex items-center justify-center gap-1 ${
                isAdminRole
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
            {isAdminRole ? 'Church Operations' : 'Main Menu'}
          </p>
          <nav className="space-y-1">
            {(isAdminRole ? adminNavItems : memberNavItems).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all group text-left',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={cn('w-4 h-4 shrink-0 transition-transform group-hover:scale-105', isActive ? 'text-white' : 'text-slate-400')} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0',
                      isActive ? 'bg-white text-emerald-700' : 'bg-rose-500 text-white'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Member-specific quick actions */}
        {!isAdminRole && onOpenDigitalCard && (
          <div className="pt-2">
            <button
              onClick={() => {
                onOpenDigitalCard();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/70 transition-all text-left"
            >
              <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Digital Member ID Card</span>
            </button>
          </div>
        )}

        {/* AI Assistant Quick Trigger */}
        {onOpenAIAssistant && (
          <div>
            <button
              onClick={() => {
                onOpenAIAssistant();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/60 transition-all text-left"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 animate-pulse" />
              <span>Ask Church AI Assistant</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Role Switcher / Demo Controls */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <div className="px-2">
          <button
            onClick={() => {
              if (isAdminRole) {
                switchRoleForDemo('member');
                handleItemClick('home');
              } else {
                switchRoleForDemo('admin');
                handleItemClick('admin-dashboard');
              }
            }}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border border-slate-200/70 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isAdminRole ? 'Switch to Member View' : 'Switch to Admin View'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop & Laptop Persistent Web Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 hidden md:flex flex-col justify-between shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        {navContent}
      </aside>

      {/* 2. Tablet & Mobile Responsive Off-Canvas Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Off-canvas sidebar panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white p-5 shadow-2xl transition-transform animate-in slide-in-from-left duration-200 overflow-y-auto">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
