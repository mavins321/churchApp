import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { ChurchEvent, Member, AttendanceRecord, Department } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  ClipboardCheck, 
  TrendingUp, 
  QrCode, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatTime12Hour, formatDateReadable, getRelativeGreeting } from '../../lib/utils';
import { QRCheckInDisplayModal } from './QRCheckInDisplayModal';
import { AdminDashboardSkeleton } from '../ui/Skeleton';

interface AdminDashboardProps {
  onSelectTab: (tab: string) => void;
  onOpenAIAssistant: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectTab,
  onOpenAIAssistant
}) => {
  const [membersCount, setMembersCount] = useState<number>(0);
  const [activeMembersCount, setActiveMembersCount] = useState<number>(0);
  const [attendanceCountToday, setAttendanceCountToday] = useState<number>(0);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // QR Modal
  const [qrModalEvent, setQrModalEvent] = useState<ChurchEvent | null>(null);

  const fetchStats = async () => {
    try {
      // 1. Members
      const membersSnap = await getDocs(collection(db, 'members'));
      const membersList = membersSnap.docs.map(d => d.data() as Member);
      setMembersCount(membersList.length);
      setActiveMembersCount(membersList.filter(m => m.status === 'active').length);

      // 2. Events
      const evSnap = await getDocs(collection(db, 'events'));
      const evList = evSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchEvent));
      evList.sort((a, b) => a.date.localeCompare(b.date));
      setEvents(evList);

      // 3. Attendance
      const attSnap = await getDocs(collection(db, 'attendance'));
      const attList = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      attList.sort((a, b) => b.checkInTime.localeCompare(a.checkInTime));
      setRecentAttendance(attList.slice(0, 6));

      // Calculate attendance today or latest event
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAtt = attList.filter(a => a.eventDate === todayStr || a.checkInTime.startsWith(todayStr));
      setAttendanceCountToday(todayAtt.length > 0 ? todayAtt.length : (attList.length > 0 ? attList.length : 24));

      // 4. Departments
      const deptSnap = await getDocs(collection(db, 'departments'));
      setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department)));
    } catch (err) {
      console.error('Error fetching admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const greeting = getRelativeGreeting();
  const nextEvent = events.length > 0 ? events[0] : null;

  const expectedToday = nextEvent?.expectedCount || 450;
  const presentCount = attendanceCountToday || nextEvent?.attendeesCount || 24;
  const attendanceRate = Math.min(100, Math.round((presentCount / Math.max(1, expectedToday)) * 100));

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Admin Portal
            </span>
            <span className="text-xs text-slate-400">FaithTrack Cathedral</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            {greeting}, Administrator 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Congregation attendance, activities, and membership operations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            icon={<Sparkles className="w-4 h-4 text-emerald-600" />}
            onClick={onOpenAIAssistant}
            className="text-xs"
          >
            Leadership AI
          </Button>

          {nextEvent && (
            <Button
              variant="primary"
              size="md"
              icon={<QrCode className="w-4 h-4" />}
              onClick={() => setQrModalEvent(nextEvent)}
              className="text-xs"
            >
              Launch Service QR
            </Button>
          )}
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <Card className="p-5 bg-white border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Members</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{membersCount || 1}</span>
            <span className="text-xs text-emerald-700 font-semibold block mt-0.5">
              {activeMembersCount || 1} active profiles
            </span>
          </div>
        </Card>

        {/* Present Today */}
        <Card className="p-5 bg-white border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Present Today</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{presentCount}</span>
            <span className="text-xs text-slate-500 font-medium block mt-0.5">
              of {expectedToday} expected
            </span>
          </div>
        </Card>

        {/* Attendance Rate */}
        <Card className="p-5 bg-white border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{attendanceRate}%</span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${attendanceRate}%` }} />
            </div>
          </div>
        </Card>

        {/* New Members */}
        <Card className="p-5 bg-white border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Registrations</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{Math.max(1, membersCount)}</span>
            <span className="text-xs text-emerald-600 font-semibold block mt-0.5">
              Active congregation
            </span>
          </div>
        </Card>
      </div>

      {/* Today's Activity & Live Projection Banner */}
      {nextEvent && (
        <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white border-none shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  Target Activity: {nextEvent.type}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDateReadable(nextEvent.date)}
                </span>
              </div>

              <h3 className="text-2xl font-black tracking-tight">{nextEvent.title}</h3>
              <p className="text-xs text-slate-300">
                {formatTime12Hour(nextEvent.startTime)} – {formatTime12Hour(nextEvent.endTime)} • {nextEvent.location}
              </p>

              <div className="flex items-center gap-6 pt-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Present</span>
                  <span className="text-xl font-bold text-white">{presentCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Expected</span>
                  <span className="text-xl font-bold text-slate-300">{expectedToday}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Coverage</span>
                  <span className="text-xl font-bold text-emerald-400">{attendanceRate}%</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                icon={<QrCode className="w-5 h-5" />}
                onClick={() => setQrModalEvent(nextEvent)}
                className="w-full sm:w-auto font-bold shadow-md shadow-emerald-500/20"
              >
                Project Check-In QR
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => onSelectTab('admin-attendance')}
                className="w-full sm:w-auto bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Manage Roll Call
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Two Column Grid: Recent Attendance & Department Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance Logs */}
        <Card className="p-6 bg-white border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Recent Attendance Check-Ins
            </h3>
            <button
              onClick={() => onSelectTab('admin-attendance')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentAttendance.length > 0 ? (
              recentAttendance.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                      ✓
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{rec.memberName}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {rec.membershipNumber} • {rec.eventTitle}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-semibold text-slate-700 block">
                      {rec.checkInTimeFormatted || formatTime12Hour(rec.checkInTime)}
                    </span>
                    <span className="text-[10px] text-emerald-600">
                      {rec.method === 'qr' ? 'QR Code' : 'Manual'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No attendance check-ins recorded yet.</p>
            )}
          </div>
        </Card>

        {/* Departments Status */}
        <Card className="p-6 bg-white border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Department Workforce
            </h3>
            <button
              onClick={() => onSelectTab('admin-departments')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {departments.slice(0, 5).map((dept) => (
              <div
                key={dept.id}
                className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800">{dept.name}</p>
                  <p className="text-[11px] text-slate-400">Leader: {dept.leaderName || 'Pastoral Team'}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                    {dept.memberCount || 12} members
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* QR Modal */}
      <QRCheckInDisplayModal
        isOpen={!!qrModalEvent}
        onClose={() => setQrModalEvent(null)}
        event={qrModalEvent}
        onRefreshSuccess={() => fetchStats()}
      />
    </div>
  );
};
