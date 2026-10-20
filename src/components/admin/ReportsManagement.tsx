import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { AttendanceRecord, ChurchEvent, Member, Department } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  BarChart3, 
  Download, 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Filter 
} from 'lucide-react';
import { formatDateReadable, formatTime12Hour } from '../../lib/utils';
import { ReportsManagementSkeleton } from '../ui/Skeleton';

export const ReportsManagement: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reportType, setReportType] = useState<'activity' | 'department' | 'member' | 'monthly'>('activity');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [attSnap, evSnap, memSnap, deptSnap] = await Promise.all([
          getDocs(collection(db, 'attendance')),
          getDocs(collection(db, 'events')),
          getDocs(collection(db, 'members')),
          getDocs(collection(db, 'departments'))
        ]);
        setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
        setEvents(evSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchEvent)));
        setMembers(memSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
        setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department)));
      } catch (e) {
        console.error('Error loading reports data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Export CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'activity') {
      headers = ['Event Title', 'Event Date', 'Member Name', 'Membership ID', 'Department', 'Check-In Time', 'Method'];
      rows = attendance.map(a => [
        `"${a.eventTitle}"`,
        `"${a.eventDate}"`,
        `"${a.memberName}"`,
        `"${a.membershipNumber}"`,
        `"${a.departmentName || ''}"`,
        `"${a.checkInTimeFormatted || a.checkInTime}"`,
        `"${a.method}"`
      ]);
    } else if (reportType === 'department') {
      headers = ['Department', 'Total Workers', 'Attendance Count', 'Active Ratio'];
      rows = departments.map(d => {
        const count = attendance.filter(a => a.departmentName === d.name).length;
        return [
          `"${d.name}"`,
          `"${d.memberCount || 10}"`,
          `"${count}"`,
          `"${Math.round((count / Math.max(1, d.memberCount || 10)) * 100)}%"`
        ];
      });
    } else {
      headers = ['Member Name', 'Membership ID', 'Phone', 'Department', 'Total Gatherings Attended'];
      rows = members.map(m => {
        const count = attendance.filter(a => a.memberId === m.id).length;
        return [
          `"${m.fullName}"`,
          `"${m.membershipNumber}"`,
          `"${m.phone}"`,
          `"${m.departmentName || ''}"`,
          `"${count}"`
        ];
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `faithtrack_${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return <ReportsManagementSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Reports</h1>
          <p className="text-xs text-slate-500">Generate, analyze, and export congregation attendance records</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4 text-emerald-600" />}
            onClick={handleExportCSV}
          >
            EXPORT CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<FileText className="w-4 h-4" />}
            onClick={handleExportPDF}
          >
            EXPORT PDF
          </Button>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {[
          { id: 'activity', label: 'Activity Attendance' },
          { id: 'department', label: 'Department Workforce' },
          { id: 'member', label: 'Member Attendance History' },
          { id: 'monthly', label: 'Monthly Summary' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              reportType === tab.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Data Table */}
      <Card className="p-6 bg-white border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {reportType === 'activity' && 'Event Check-In Records'}
            {reportType === 'department' && 'Department Attendance & Workforce Metrics'}
            {reportType === 'member' && 'Individual Member Attendance Logs'}
            {reportType === 'monthly' && 'Monthly Overview Summary'}
          </h3>
          <span className="text-xs text-slate-400">
            Generated on {new Date().toLocaleDateString()}
          </span>
        </div>

        {reportType === 'activity' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Member Name</th>
                  <th className="px-4 py-3">Member ID</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Check-In Time</th>
                  <th className="px-4 py-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.slice(0, 20).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{a.eventTitle}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateReadable(a.eventDate)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{a.memberName}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{a.membershipNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{a.departmentName || 'General'}</td>
                    <td className="px-4 py-3 text-slate-700">{a.checkInTimeFormatted || formatTime12Hour(a.checkInTime)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold">
                        {a.method.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {attendance.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-400">
                      No attendance check-ins on record.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'department' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Department Name</th>
                  <th className="px-4 py-3">Department Head</th>
                  <th className="px-4 py-3">Total Workers</th>
                  <th className="px-4 py-3">Attendance Check-Ins</th>
                  <th className="px-4 py-3">Participation Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => {
                  const checkIns = attendance.filter(a => a.departmentName === d.name).length;
                  const rate = Math.min(100, Math.round((checkIns / Math.max(1, d.memberCount || 10)) * 100));
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{d.name}</td>
                      <td className="px-4 py-3 text-slate-600">{d.leaderName || 'Pastoral Board'}</td>
                      <td className="px-4 py-3 text-slate-800 font-semibold">{d.memberCount || 10}</td>
                      <td className="px-4 py-3 text-emerald-700 font-bold">{checkIns}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'member' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Member Name</th>
                  <th className="px-4 py-3">Membership ID</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Total Attended</th>
                  <th className="px-4 py-3">Consistency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.slice(0, 20).map((m) => {
                  const count = attendance.filter(a => a.memberId === m.id).length;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{m.fullName}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{m.membershipNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{m.departmentName || 'General'}</td>
                      <td className="px-4 py-3 text-slate-600">{m.phone}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{count} services</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${count >= 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                          {count >= 3 ? 'High' : 'Regular'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'monthly' && (
          <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 font-semibold block uppercase">Total Attendance Events</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{events.length}</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 font-semibold block uppercase">Total Check-In Logs</span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">{attendance.length}</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 font-semibold block uppercase">Active Congregation Base</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{members.length}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">
              Monthly statistical aggregations are compiled automatically from authenticated check-in timestamps.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
