import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { ChurchEvent, AttendanceRecord, Announcement } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, PresentBadge, UpcomingBadge } from '../ui/Badge';
import { 
  getRelativeGreeting, 
  formatDateReadable, 
  formatTime12Hour, 
  isCheckInWindowActive 
} from '../../lib/utils';
import { 
  QrCode, 
  Calendar, 
  ClipboardCheck, 
  User, 
  Clock, 
  MapPin, 
  ChevronRight, 
  CreditCard,
  Sparkles,
  CheckCircle2,
  Megaphone,
  Heart
} from 'lucide-react';
import { QRScannerModal } from './QRScannerModal';
import { DigitalCardModal } from './DigitalCardModal';
import { MemberDashboardSkeleton } from '../ui/Skeleton';
import { staleWhileRevalidate } from '../../lib/cache';

interface MemberDashboardProps {
  onSelectTab: (tab: string) => void;
  onOpenAIAssistant: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  onSelectTab,
  onOpenAIAssistant
}) => {
  const { member, firebaseUser } = useAuth();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [selectedEventForCheckIn, setSelectedEventForCheckIn] = useState<ChurchEvent | null>(null);

  const fetchData = async () => {
    try {
      const cacheKey = `dashboard_data_${member?.id || 'guest'}`;
      await staleWhileRevalidate(cacheKey, async () => {
        const eventsPromise = getDocs(query(collection(db, 'events')));
        const attPromise = member?.id 
          ? getDocs(query(collection(db, 'attendance'), where('memberId', '==', member.id)))
          : Promise.resolve({ docs: [] } as any);
        const annPromise = getDocs(query(collection(db, 'announcements'), limit(3)));

        // Run all three queries simultaneously in parallel
        const [eventsSnap, attSnap, annSnap] = await Promise.all([
          eventsPromise,
          attPromise,
          annPromise
        ]);

        const evList = eventsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ChurchEvent));
        evList.sort((a: ChurchEvent, b: ChurchEvent) => a.date.localeCompare(b.date));

        const attList = attSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as AttendanceRecord));
        const annList = annSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Announcement));

        return { events: evList, attendance: attList, announcements: annList };
      }, (data, fromCache) => {
        setEvents(data.events);
        setMyAttendance(data.attendance);
        setAnnouncements(data.announcements);
        if (fromCache) {
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [member?.id]);

  const greeting = getRelativeGreeting();
  const firstName = member?.firstName || 'Beloved';

  // Find next upcoming activity
  const nextEvent = events.length > 0 ? events[0] : null;

  // Check if user already checked into the next event
  const nextEventAttendance = nextEvent && myAttendance.find(a => a.eventId === nextEvent.id);

  // Check if check-in is currently open for next event
  const checkInStatus = nextEvent ? isCheckInWindowActive(nextEvent) : { isOpen: false, message: '' };

  // Calculate monthly attendance stat
  const thisMonthRecords = myAttendance.filter(a => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return a.checkInTime.startsWith(currentMonth) || a.eventDate.startsWith(currentMonth);
  });
  const attendanceRate = events.length > 0 ? Math.min(100, Math.round((thisMonthRecords.length / Math.max(1, events.length)) * 100)) : 85;

  if (loading) {
    return <MemberDashboardSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-6xl mx-auto">
      {/* 1. Warm Greeting & Quick ID Card trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <p className="text-xs font-semibold text-emerald-200 tracking-wider uppercase">
            FaithTrack Cathedral
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
            {member?.departmentName ? `${member.departmentName} Department` : 'Welcome to worship'} • {member?.membershipNumber}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCardOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs rounded-xl backdrop-blur-md"
            icon={<CreditCard className="w-3.5 h-3.5 text-emerald-200" />}
          >
            Digital ID Card
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAIAssistant}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs rounded-xl backdrop-blur-md"
            icon={<Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />}
          >
            Ask AI
          </Button>
        </div>
      </div>

      {/* 2. NEXT ACTIVITY HERO CARD */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Next Church Activity
          </h2>
          {nextEvent && (
            <span className="text-xs text-emerald-700 font-semibold">
              {formatDateReadable(nextEvent.date)}
            </span>
          )}
        </div>

        {nextEvent ? (
          <Card className="p-6 sm:p-7 border-slate-200/90 hover:border-emerald-200 transition-all bg-white relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {nextEvent.type}
                  </span>
                  {nextEventAttendance ? (
                    <PresentBadge time={nextEventAttendance.checkInTimeFormatted} />
                  ) : checkInStatus.isOpen ? (
                    <Badge variant="success" size="sm">● Check-in Active</Badge>
                  ) : (
                    <UpcomingBadge label={checkInStatus.message} />
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {nextEvent.title}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    {formatTime12Hour(nextEvent.startTime)} – {formatTime12Hour(nextEvent.endTime)}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {nextEvent.location}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0 flex flex-col sm:items-end gap-2">
                {nextEventAttendance ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>✓ You're checked in</span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    icon={<QrCode className="w-5 h-5" />}
                    onClick={() => {
                      setSelectedEventForCheckIn(nextEvent);
                      setIsScannerOpen(true);
                    }}
                    className="w-full sm:w-auto px-8 font-black tracking-wide text-base shadow-md shadow-emerald-600/20"
                  >
                    CHECK IN
                  </Button>
                )}

                {!nextEventAttendance && (
                  <p className="text-[11px] text-slate-400 text-center sm:text-right">
                    {checkInStatus.message}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center border-dashed border-slate-200">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No upcoming activities scheduled</p>
            <p className="text-xs text-slate-400 mt-1">Please check back later for announcements.</p>
          </Card>
        )}
      </div>

      {/* 3. QUICK ACTIONS (Large, easy-to-understand buttons) */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Check In Action */}
          <button
            onClick={() => {
              setSelectedEventForCheckIn(nextEvent);
              setIsScannerOpen(true);
            }}
            className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group active:scale-[0.98] text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center mb-2.5">
              <QrCode className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-800">Check In</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Scan event QR</span>
          </button>

          {/* My Attendance */}
          <button
            onClick={() => onSelectTab('attendance')}
            className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group active:scale-[0.98] text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center mb-2.5">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-800">My Attendance</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{myAttendance.length} records</span>
          </button>

          {/* Church Activities */}
          <button
            onClick={() => onSelectTab('activities')}
            className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group active:scale-[0.98] text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center mb-2.5">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-800">Activities</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{events.length} upcoming</span>
          </button>

          {/* My Profile */}
          <button
            onClick={() => onSelectTab('profile')}
            className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group active:scale-[0.98] text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center mb-2.5">
              <User className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-800">My Profile</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Card & info</span>
          </button>
        </div>
      </div>

      {/* 4. ATTENDANCE METRICS PREVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 sm:p-5 flex items-center gap-4 bg-white">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-black text-lg shrink-0">
            {attendanceRate}%
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">This Month Rate</p>
            <p className="text-sm font-bold text-slate-800">Active Member</p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center gap-4 bg-white">
          <div className="w-12 h-12 rounded-2xl bg-teal-100/70 text-teal-700 flex items-center justify-center font-black text-lg shrink-0">
            {myAttendance.filter(a => a.eventTitle.includes('Sunday')).length}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Sunday Services</p>
            <p className="text-sm font-bold text-slate-800">Attended</p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center gap-4 bg-white">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center font-black text-lg shrink-0">
            {myAttendance.filter(a => !a.eventTitle.includes('Sunday')).length}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Midweek Fellowships</p>
            <p className="text-sm font-bold text-slate-800">Attended</p>
          </div>
        </Card>
      </div>

      {/* 5. UPCOMING ACTIVITIES LIST (Database Driven) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Upcoming Church Gatherings
          </h2>
          <button
            onClick={() => onSelectTab('activities')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>See all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {events.slice(0, 3).map((event) => {
            const isAttended = myAttendance.some(a => a.eventId === event.id);
            return (
              <Card
                key={event.id}
                className="p-4 sm:p-5 bg-white border-slate-200/70 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                      {event.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDateReadable(event.date)} • {formatTime12Hour(event.startTime)}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{event.title}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {event.location}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isAttended ? (
                    <PresentBadge />
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<QrCode className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setSelectedEventForCheckIn(event);
                        setIsScannerOpen(true);
                      }}
                    >
                      Check In
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 6. PRAYER WALL SPOTLIGHT BANNER */}
      <Card className="p-5 bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white border-teal-900/50 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                Congregation Prayer Wall
              </span>
              <span className="text-xs text-slate-300">Live Agreement</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Stand in the Gap with Your Church Family
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pray over active petitions, post your personal needs, and rejoice in answered prayers and testimonies.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Heart className="w-4 h-4 fill-white text-white" />}
            onClick={() => onSelectTab('prayers')}
            className="shrink-0 text-xs font-bold shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500"
          >
            Visit Prayer Wall
          </Button>
        </div>
      </Card>

      {/* 7. ANNOUNCEMENTS PREVIEW */}
      {announcements.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Announcements & Bulletins
            </h2>
            <button
              onClick={() => onSelectTab('announcements')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {announcements.map((ann) => (
              <Card key={ann.id} className="p-4 bg-white border-slate-200/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-slate-400">{formatDateReadable(ann.date)}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{ann.title}</h4>
                <p className="text-xs text-slate-600 line-clamp-2">{ann.message}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        activeEvent={selectedEventForCheckIn}
        onCheckInSuccess={() => fetchData()}
      />

      <DigitalCardModal
        isOpen={isCardOpen}
        onClose={() => setIsCardOpen(false)}
        member={member}
      />
    </div>
  );
};
