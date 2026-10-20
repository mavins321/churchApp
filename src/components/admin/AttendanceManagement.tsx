import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  where 
} from 'firebase/firestore';
import { ChurchEvent, AttendanceRecord, Member, AuditLog } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/SearchInput';
import { Avatar } from '../ui/Avatar';
import { Badge, PresentBadge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { 
  ClipboardCheck, 
  Calendar, 
  Users, 
  Check, 
  X, 
  Filter, 
  Plus, 
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatDateReadable, formatTime12Hour } from '../../lib/utils';
import { INITIAL_DEPARTMENTS, INITIAL_GROUPS } from '../../lib/seedData';
import { AttendanceManagementSkeleton } from '../ui/Skeleton';

export const AttendanceManagement: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Manual Check-In Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualMemberId, setManualMemberId] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  const fetchData = async () => {
    try {
      // 1. Events
      const evSnap = await getDocs(collection(db, 'events'));
      const evList = evSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchEvent));
      evList.sort((a, b) => a.date.localeCompare(b.date));
      setEvents(evList);
      if (evList.length > 0 && !selectedEventId) {
        setSelectedEventId(evList[0].id);
      }

      // 2. Members
      const memSnap = await getDocs(collection(db, 'members'));
      setMembers(memSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));

      // 3. Attendance records
      const attSnap = await getDocs(collection(db, 'attendance'));
      setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    } catch (err) {
      console.error('Error fetching attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentEvent = events.find(e => e.id === selectedEventId);

  // Filter attendance for the selected event
  const eventAttendance = attendance.filter(a => a.eventId === selectedEventId);

  // Present Member IDs
  const presentMemberIds = new Set(eventAttendance.map(a => a.memberId));

  // Compute Present / Absent based on filtered members
  const filteredMembers = members.filter(m => {
    const matchesDept = selectedDept === 'all' || m.departmentName === selectedDept;
    const matchesGroup = selectedGroup === 'all' || m.groupName === selectedGroup;
    const matchesSearch = searchTerm === '' ||
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.membershipNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesGroup && matchesSearch;
  });

  const presentCount = filteredMembers.filter(m => presentMemberIds.has(m.id)).length;
  const absentCount = filteredMembers.length - presentCount;
  const attendanceRate = filteredMembers.length > 0 ? Math.round((presentCount / filteredMembers.length) * 100) : 0;

  // Handle Manual Attendance Correction with Audit Log
  const handleMarkPresent = async (m: Member) => {
    if (!currentEvent || !firebaseUser) return;
    try {
      const now = new Date();
      const attendanceId = `att_${currentEvent.id}_${m.id}`;
      const formattedTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

      const newRecord: AttendanceRecord = {
        id: attendanceId,
        eventId: currentEvent.id,
        eventTitle: currentEvent.title,
        eventDate: currentEvent.date,
        memberId: m.id,
        memberName: m.fullName,
        membershipNumber: m.membershipNumber,
        departmentName: m.departmentName || '',
        groupName: m.groupName || '',
        checkInTime: now.toISOString(),
        checkInTimeFormatted: formattedTime,
        method: 'manual',
        status: 'present',
        verifiedBy: userProfile?.displayName || 'Church Admin',
        notes: 'Manual correction by church administrator',
        createdAt: now.toISOString()
      };

      await setDoc(doc(db, 'attendance', attendanceId), newRecord);

      // Create Audit Log
      const auditId = `audit_${Date.now()}`;
      await setDoc(doc(db, 'auditLogs', auditId), {
        id: auditId,
        action: 'MANUAL_ATTENDANCE_MARKED',
        details: `Marked ${m.fullName} (${m.membershipNumber}) as Present for ${currentEvent.title}`,
        performedBy: firebaseUser.uid,
        performedByName: userProfile?.displayName || 'Admin',
        performedByRole: userProfile?.role || 'admin',
        targetType: 'attendance',
        targetId: attendanceId,
        timestamp: now.toISOString()
      });

      setAttendance(prev => [newRecord, ...prev]);
    } catch (e) {
      console.error('Failed to mark present:', e);
    }
  };

  const handleRemoveAttendance = async (m: Member) => {
    if (!currentEvent || !firebaseUser) return;
    try {
      const attendanceId = `att_${currentEvent.id}_${m.id}`;
      await deleteDoc(doc(db, 'attendance', attendanceId));

      // Create Audit Log
      const auditId = `audit_${Date.now()}`;
      await setDoc(doc(db, 'auditLogs', auditId), {
        id: auditId,
        action: 'ATTENDANCE_CORRECTED_ABSENT',
        details: `Removed attendance record for ${m.fullName} (${m.membershipNumber}) for ${currentEvent.title}`,
        performedBy: firebaseUser.uid,
        performedByName: userProfile?.displayName || 'Admin',
        performedByRole: userProfile?.role || 'admin',
        targetType: 'attendance',
        targetId: attendanceId,
        timestamp: new Date().toISOString()
      });

      setAttendance(prev => prev.filter(a => a.id !== attendanceId));
    } catch (e) {
      console.error('Failed to remove attendance:', e);
    }
  };

  if (loading) {
    return <AttendanceManagementSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Management</h1>
          <p className="text-xs text-slate-500">Service roll calls, manual reconciliation, and audit logs</p>
        </div>
      </div>

      {/* Selectors Bar */}
      <Card className="p-4 bg-white border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Activity Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Select Activity
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({formatDateReadable(e.date)})
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Departments</option>
              {INITIAL_DEPARTMENTS.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Group Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Fellowship Group
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Groups</option>
              {INITIAL_GROUPS.map(g => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Search Member */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Search Member
            </label>
            <SearchInput
              placeholder="Search member..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
        </div>
      </Card>

      {/* EVENT STATS BANNER */}
      {currentEvent && (
        <Card className="p-6 bg-gradient-to-br from-emerald-800 to-teal-950 text-white rounded-3xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                {currentEvent.type}
              </span>
              <h2 className="text-2xl font-black tracking-tight">{currentEvent.title}</h2>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                {formatDateReadable(currentEvent.date)} • {currentEvent.location}
              </p>
            </div>

            <div className="flex items-center gap-6 bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
              <div className="text-center">
                <span className="text-[10px] text-emerald-200 uppercase tracking-wider block">Present</span>
                <span className="text-2xl font-black">{presentCount}</span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] text-emerald-200 uppercase tracking-wider block">Absent</span>
                <span className="text-2xl font-black">{absentCount}</span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] text-emerald-200 uppercase tracking-wider block">Attendance</span>
                <span className="text-2xl font-black text-emerald-300">{attendanceRate}%</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* MEMBER ATTENDANCE LIST & CORRECTIONS */}
      <Card className="p-5 bg-white border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Congregation Roll Call ({filteredMembers.length} Members)
          </h3>
          <span className="text-xs text-slate-400">
            Click to manually verify or correct attendance with audit log
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredMembers.map((m) => {
            const isPresent = presentMemberIds.has(m.id);
            const record = eventAttendance.find(a => a.memberId === m.id);

            return (
              <div
                key={m.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-2xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={m.fullName} photoUrl={m.photoUrl} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">{m.fullName}</p>
                      <span className="text-[11px] font-mono text-slate-400">{m.membershipNumber}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {m.departmentName || 'General'} • {m.groupName || 'Fellowship'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  {isPresent ? (
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-700 block">
                          ✓ Present
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {record?.checkInTimeFormatted || (record?.checkInTime ? formatTime12Hour(record.checkInTime) : 'Checked In')} ({record?.method === 'qr' ? 'QR' : 'Manual'})
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveAttendance(m)}
                        className="text-xs text-rose-600 hover:bg-rose-50"
                        title="Mark as Absent"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Absent</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">
                        Absent
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleMarkPresent(m)}
                        className="text-xs"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mark Present</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              No church members found matching selected filters.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
