import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { AttendanceRecord, ChurchEvent } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/SearchInput';
import { PresentBadge } from '../ui/Badge';
import { formatDateReadable, formatTime12Hour } from '../../lib/utils';
import { AttendanceViewSkeleton } from '../ui/Skeleton';
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  Filter, 
  CheckCircle2, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

interface AttendanceViewProps {
  onSelectTab: (tab: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ onSelectTab }) => {
  const { member } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!member?.id) return;
      try {
        const attQuery = query(collection(db, 'attendance'), where('memberId', '==', member.id));
        const attSnap = await getDocs(attQuery);
        const list = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
        // Sort descending by checkInTime
        list.sort((a, b) => b.checkInTime.localeCompare(a.checkInTime));
        setAttendance(list);

        // Fetch events for denominator
        const evSnap = await getDocs(collection(db, 'events'));
        setEvents(evSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchEvent)));
      } catch (err) {
        console.error('Error fetching attendance records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [member?.id]);

  // Activity breakdown counts
  const sundayCount = attendance.filter(a => a.eventTitle.toLowerCase().includes('sunday')).length;
  const diggingCount = attendance.filter(a => a.eventTitle.toLowerCase().includes('digging')).length;
  const clinicCount = attendance.filter(a => a.eventTitle.toLowerCase().includes('clinic')).length;

  const totalPossible = Math.max(1, events.length || 8);
  const monthlyRate = Math.min(100, Math.round((attendance.length / totalPossible) * 100));

  // Filtered list
  const filteredList = attendance.filter(a => {
    const matchesFilter = filterType === 'all' || a.eventTitle.toLowerCase().includes(filterType.toLowerCase());
    const matchesSearch = searchTerm === '' || 
      a.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.eventDate.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return <AttendanceViewSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Attendance</h1>
          <p className="text-xs text-slate-500">Your personal worship and fellowship history</p>
        </div>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/80 w-fit">
          Member: {member?.membershipNumber}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Overall This Month */}
        <Card className="p-4 sm:p-5 bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider">This Month</span>
            <div className="text-3xl font-black mt-1">{monthlyRate}%</div>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-300 h-full rounded-full transition-all" style={{ width: `${monthlyRate}%` }} />
          </div>
        </Card>

        {/* Sunday Service */}
        <Card className="p-4 sm:p-5 bg-white border-slate-200/80 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sunday Service</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{sundayCount} <span className="text-xs text-slate-400 font-semibold">/ 5</span></div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (sundayCount / 5) * 100)}%` }} />
          </div>
        </Card>

        {/* Digging Deep */}
        <Card className="p-4 sm:p-5 bg-white border-slate-200/80 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Digging Deep</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{diggingCount} <span className="text-xs text-slate-400 font-semibold">/ 4</span></div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full" style={{ width: `${Math.min(100, (diggingCount / 4) * 100)}%` }} />
          </div>
        </Card>

        {/* Faith Clinic */}
        <Card className="p-4 sm:p-5 bg-white border-slate-200/80 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Faith Clinic</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{clinicCount} <span className="text-xs text-slate-400 font-semibold">/ 4</span></div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, (clinicCount / 4) * 100)}%` }} />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput
            placeholder="Search by activity name or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'sunday', label: 'Sunday' },
            { id: 'digging', label: 'Digging Deep' },
            { id: 'clinic', label: 'Faith Clinic' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all ${
                filterType === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance History List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Attendance History ({filteredList.length})
        </h2>

        {filteredList.length > 0 ? (
          <div className="space-y-2.5">
            {filteredList.map((rec) => (
              <Card
                key={rec.id}
                className="p-4 sm:p-5 bg-white border-slate-200/80 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {formatDateReadable(rec.eventDate)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-emerald-800">
                      {rec.eventTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Checked in at {rec.checkInTimeFormatted || formatTime12Hour(rec.checkInTime)}
                    </span>
                    {rec.method === 'qr' && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        QR Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <PresentBadge />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <Card className="p-10 text-center border-dashed border-slate-200 bg-white space-y-3">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                You haven't checked into any activities yet.
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                When you attend church services or midweek programs, tap Check In or scan the auditorium QR code.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => onSelectTab('activities')}
              className="mt-2"
            >
              VIEW ACTIVITIES
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};
