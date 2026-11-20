import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { 
  Church, 
  Bell, 
  LogOut, 
  ShieldCheck, 
  User, 
  Sparkles,
  ChevronDown,
  Menu
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  portalView: 'admin' | 'member';
  onSwitchPortalView: (view: 'admin' | 'member') => void;
  unreadNotificationsCount?: number;
  onOpenAIAssistant: () => void;
  onToggleMobileNav?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  portalView,
  onSwitchPortalView,
  unreadNotificationsCount = 0,
  onOpenAIAssistant,
  onToggleMobileNav
}) => {
  const { member, userProfile, role, signOut } = useAuth();
  const isAdminRole = role === 'admin' || role === 'super_admin';
  const displayName = member?.fullName || userProfile?.displayName || 'Beloved';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu Toggle & Church Logo & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onToggleMobileNav && (
            <button
              onClick={onToggleMobileNav}
              className="p-2 -ml-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden transition-colors shrink-0"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div 
            onClick={() => onSelectTab(isAdminRole && portalView === 'admin' ? 'admin-dashboard' : 'home')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:bg-emerald-700 transition-colors shrink-0">
              <Church className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-lg tracking-tight text-slate-900 truncate">FAITHTRACK</span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase shrink-0">
                  {isAdminRole ? (portalView === 'admin' ? 'Admin' : 'Member View') : 'Cathedral'}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block">FaithTrack Cathedral</p>
            </div>
          </div>
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* AI Assistant Quick Trigger */}
          <button
            onClick={onOpenAIAssistant}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-800 text-xs font-semibold hover:shadow-xs transition-all"
            title="Open Church AI Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>AI Assistant</span>
          </button>

          {/* Portal View Switcher — Visible ONLY to Admins */}
          {isAdminRole && (
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-100/80 text-xs shadow-xs shrink-0">
              <button
                onClick={() => onSwitchPortalView('member')}
                className={`px-1.5 sm:px-2.5 py-1 rounded-lg font-bold transition-all text-[10px] sm:text-xs ${
                  portalView === 'member'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Member
              </button>
              <button
                onClick={() => onSwitchPortalView('admin')}
                className={`px-1.5 sm:px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 text-[10px] sm:text-xs ${
                  portalView === 'admin'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Admin</span>
              </button>
            </div>
          )}

          {/* Notifications Bell */}
          <button
            onClick={() => onSelectTab('notifications')}
            className="relative p-2 sm:p-2.5 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Member Profile Avatar / Sign Out */}
          <div className="flex items-center gap-1 sm:gap-2 pl-1 border-l border-slate-200/80 shrink-0">
            <button
              onClick={() => onSelectTab(isAdminRole && portalView === 'admin' ? 'admin-settings' : 'profile')}
              className="flex items-center gap-2 p-1 rounded-2xl hover:bg-slate-50 transition-colors text-left"
              aria-label="Profile & Settings"
            >
              <Avatar name={displayName} photoUrl={member?.photoUrl} size="sm" />
              <div className="hidden lg:block">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {member?.membershipNumber || 'Member'}
                </p>
              </div>
            </button>

            <button
              onClick={signOut}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
