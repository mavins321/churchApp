import React from 'react';
import {
  Home,
  Calendar,
  Heart,
  ClipboardCheck,
  LayoutDashboard,
  Users,
  Menu
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  portalView: 'admin' | 'member';
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  portalView,
  onOpenMenu
}) => {
  const { role } = useAuth();
  const isAdminRole = role === 'admin' || role === 'super_admin';
  const showAdminTabs = isAdminRole && portalView === 'admin';

  const items = showAdminTabs
    ? [
        { id: 'admin-dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'admin-members', label: 'Members', icon: Users },
        { id: 'admin-events', label: 'Activities', icon: Calendar },
        { id: 'admin-attendance', label: 'Roll Call', icon: ClipboardCheck },
      ]
    : [
        { id: 'home', label: 'Overview', icon: Home },
        { id: 'activities', label: 'Activities', icon: Calendar },
        { id: 'prayers', label: 'Prayers', icon: Heart },
        { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
      ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
    >
      <div className="grid grid-cols-5 items-stretch h-16 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-2xl mx-0.5 my-1 transition-colors active:scale-95',
                isActive
                  ? 'text-emerald-700 bg-emerald-50/90 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-emerald-600' : 'text-slate-400')} />
              <span className="text-[10px] leading-none truncate max-w-full px-1">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl mx-0.5 my-1 text-slate-500 hover:text-slate-800 font-medium transition-colors active:scale-95"
        >
          <Menu className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] leading-none">More</span>
        </button>
      </div>
    </nav>
  );
};
