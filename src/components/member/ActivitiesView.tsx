import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ChurchEvent, AttendanceRecord, EventType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge, PresentBadge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { QRScannerModal } from './QRScannerModal';
import { 
  formatDateReadable, 
  formatTime12Hour, 
  isCheckInWindowActive 
} from '../../lib/utils';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  QrCode, 
  CheckCircle2, 
  Users,
  Info,
  CalendarCheck,
  Plus,
  Trash2,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  BellRing,
  CalendarPlus,
  Mail
} from 'lucide-react';
import { ActivitiesViewSkeleton } from '../ui/Skeleton';
import { staleWhileRevalidate, invalidateCache } from '../../lib/cache';

export const ActivitiesView: React.FC = () => {
  const { member, role } = useAuth();
  const isAdminRole = role === 'admin' || role === 'super_admin';

  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [checkInTargetEvent, setCheckInTargetEvent] = useState<ChurchEvent | null>(null);

  // Delete Activity Confirmation State
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<ChurchEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Member Pre-Registration / RSVP State
  const [registrations, setRegistrations] = useState<Record<string, boolean>>({});
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  // Admin Create Activity Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: 'Sunday Worship Service',
    description: 'Prophetic praise, heartfelt worship, and life-transforming Word ministered with power.',
    type: 'Sunday Service' as EventType,
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '11:00',
    location: 'Main Auditorium, FaithTrack Cathedral',
    recurring: true,
    attendanceEnabled: true,
    checkInOpenTime: '07:30',
    checkInCloseTime: '10:30',
    expectedCount: 450
  });

  const fetchEventsAndAttendance = async () => {
    try {
      const cacheKey = `activities_view_${member?.id || 'guest'}`;
      await staleWhileRevalidate(cacheKey, async () => {
        const evPromise = getDocs(query(collection(db, 'events')));
        const attPromise = member?.id
          ? getDocs(query(collection(db, 'attendance'), where('memberId', '==', member.id)))
          : Promise.resolve({ docs: [] } as any);
        const regPromise = member?.id
          ? getDocs(query(collection(db, 'activity_registrations'), where('memberId', '==', member.id), where('status', '==', 'confirmed')))
          : Promise.resolve({ docs: [] } as any);

        const [evSnap, attSnap, regSnap] = await Promise.all([
          evPromise,
          attPromise,
          regPromise
        ]);

        const evList = evSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ChurchEvent));
        evList.sort((a: ChurchEvent, b: ChurchEvent) => a.date.localeCompare(b.date));

        const attList = attSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as AttendanceRecord));
        const regMap: Record<string, boolean> = {};
        regSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.eventId) regMap[data.eventId] = true;
        });

        return { events: evList, attendance: attList, registrations: regMap };
      }, (data, fromCache) => {
        setEvents(data.events);
        setAttendance(data.attendance);
        setRegistrations(data.registrations);
        if (fromCache) {
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsAndAttendance();
  }, [member?.id]);

  const handleToggleRegistration = async (event: ChurchEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!member) return;
    const isRegistered = !!registrations[event.id];
    setRegisteringEventId(event.id);

    try {
      if (isRegistered) {
        await fetch('/api/activities/unregister', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: event.id, memberId: member.id })
        });
        setRegistrations(prev => {
          const copy = { ...prev };
          delete copy[event.id];
          return copy;
        });
        setFeedbackMessage(`Registration cancelled for "${event.title}".`);
      } else {
        await fetch('/api/activities/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event.id,
            memberId: member.id,
            userId: member.userId || member.id,
            memberName: member.fullName,
            memberEmail: member.email,
            memberPhone: member.phone
          })
        });
        setRegistrations(prev => ({ ...prev, [event.id]: true }));
        setFeedbackMessage(`Registered for "${event.title}"! Automated email & push reminder scheduled.`);

        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
      setTimeout(() => setFeedbackMessage(''), 5000);
    } catch (err) {
      console.error('Registration toggle error:', err);
    } finally {
      setRegisteringEventId(null);
    }
  };

  const handleOpenDetail = (ev: ChurchEvent) => {
    setSelectedEvent(ev);
  };

  const handleStartCheckIn = (ev: ChurchEvent) => {
    setSelectedEvent(null);
    setCheckInTargetEvent(ev);
    setIsScannerOpen(true);
  };

  const handleSelectPreset = (type: EventType) => {
    if (type === 'Sunday Service') {
      setCreateForm(prev => ({
        ...prev,
        type: 'Sunday Service',
        title: 'Sunday Worship Service',
        description: 'Join us for a glorious time in God\'s presence with prophetic praise, passionate worship, and life-changing revelation from the Word.',
        startTime: '08:00',
        endTime: '11:00',
        checkInOpenTime: '07:30',
        checkInCloseTime: '10:30',
        location: 'Main Auditorium, FaithTrack Cathedral'
      }));
    } else if (type === 'Digging Deep') {
      setCreateForm(prev => ({
        ...prev,
        type: 'Digging Deep',
        title: 'Digging Deep Bible Study',
        description: 'Interactive verse-by-verse scriptural exploration, doctrinal clarity, and practical Christian living insights.',
        startTime: '17:30',
        endTime: '18:30',
        checkInOpenTime: '17:00',
        checkInCloseTime: '18:30',
        location: 'Fellowship Hall & Online Stream'
      }));
    } else if (type === 'Faith Clinic') {
      setCreateForm(prev => ({
        ...prev,
        type: 'Faith Clinic',
        title: 'Faith Clinic & Deliverance Hour',
        description: 'An intensive prayer and deliverance service focusing on divine healing, breakthroughs, and victory over life struggles.',
        startTime: '17:30',
        endTime: '18:30',
        checkInOpenTime: '17:00',
        checkInCloseTime: '18:30',
        location: 'Main Auditorium'
      }));
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const id = `event-${Date.now()}`;
      const token = 'FT-' + createForm.type.substring(0, 3).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const newEvent: ChurchEvent = {
        id,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        type: createForm.type,
        date: createForm.date,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        location: createForm.location.trim(),
        recurring: createForm.recurring,
        attendanceEnabled: createForm.attendanceEnabled,
        checkInOpenTime: createForm.checkInOpenTime,
        checkInCloseTime: createForm.checkInCloseTime,
        status: 'upcoming',
        attendeesCount: 0,
        expectedCount: createForm.expectedCount || 300,
        qrSessionToken: token,
        createdAt: now,
        updatedAt: now
      };

      await setDoc(doc(db, 'events', id), newEvent);
      invalidateCache('activities_view_');
      invalidateCache('dashboard_data_');
      await fetchEventsAndAttendance();
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Error saving activity:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (ev: ChurchEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmEvent(ev);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmEvent) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'events', deleteConfirmEvent.id));
      invalidateCache('activities_view_');
      invalidateCache('dashboard_data_');
      setEvents(prev => prev.filter(ev => ev.id !== deleteConfirmEvent.id));
      if (selectedEvent?.id === deleteConfirmEvent.id) setSelectedEvent(null);
      setFeedbackMessage(`Activity "${deleteConfirmEvent.title}" deleted successfully.`);
      setTimeout(() => setFeedbackMessage(''), 4000);
      setDeleteConfirmEvent(null);
    } catch (err) {
      console.error('Error deleting activity:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <ActivitiesViewSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-6xl mx-auto">
      {/* Title & Admin Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Church Activities</h1>
            {isAdminRole && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Admin Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Upcoming worship services, Bible study, and prayer gatherings</p>
        </div>

        {isAdminRole && (
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
            className="self-start sm:self-auto text-xs shadow-sm"
          >
            Add Activity
          </Button>
        )}
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Events Grid / List */}
      <div className="space-y-4">
        {events.map((event) => {
          const attendanceRec = attendance.find(a => a.eventId === event.id);
          const windowStatus = isCheckInWindowActive(event);

          return (
            <Card
              key={event.id}
              onClick={() => handleOpenDetail(event)}
              className="p-5 sm:p-6 bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                      {event.type}
                    </span>
                    {attendanceRec ? (
                      <PresentBadge time={attendanceRec.checkInTimeFormatted} />
                    ) : windowStatus.isOpen ? (
                      <Badge variant="success" size="sm">● Check-in Active</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">{windowStatus.message}</Badge>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">{event.title}</h3>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-sm font-bold text-emerald-800 block">
                    {formatDateReadable(event.date)}
                  </span>
                  <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                    {formatTime12Hour(event.startTime)} – {formatTime12Hour(event.endTime)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">
                {event.description}
              </p>

              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {event.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Check-in: {formatTime12Hour(event.checkInOpenTime)} – {formatTime12Hour(event.checkInCloseTime)}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {isAdminRole && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                      onClick={(e) => handleDeleteClick(event, e)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                    >
                      Delete
                    </Button>
                  )}

                  {/* Pre-Registration / RSVP status & toggle */}
                  {registrations[event.id] ? (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl text-xs font-semibold">
                      <BellRing className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>RSVP Confirmed</span>
                      <button
                        type="button"
                        onClick={(e) => handleToggleRegistration(event, e)}
                        disabled={registeringEventId === event.id}
                        className="text-[10px] text-slate-400 hover:text-rose-600 hover:underline ml-1"
                        title="Cancel registration"
                      >
                        (Cancel)
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={<CalendarPlus className="w-3.5 h-3.5 text-teal-600" />}
                      onClick={(e) => handleToggleRegistration(event, e)}
                      loading={registeringEventId === event.id}
                      className="text-xs text-slate-700 hover:text-teal-700 border-slate-200 hover:border-teal-300"
                    >
                      RSVP / Pre-Register
                    </Button>
                  )}

                  {attendanceRec ? (
                    <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Checked In</span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={<QrCode className="w-4 h-4" />}
                      onClick={() => handleStartCheckIn(event)}
                      className="text-xs"
                    >
                      Check In
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {events.length === 0 && !loading && (
          <Card className="p-12 text-center border-dashed border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-700">No upcoming activities</p>
            <p className="text-xs text-slate-400 mt-1">Check back soon for new service schedules.</p>
            {isAdminRole && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 mx-auto"
              >
                Add First Activity
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent.type}
          maxWidth="md"
        >
          <div className="space-y-5 text-left">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {selectedEvent.title}
              </h2>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mt-1">
                {formatDateReadable(selectedEvent.date)}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Time:</strong> {formatTime12Hour(selectedEvent.startTime)} – {formatTime12Hour(selectedEvent.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  <strong>Location:</strong> {selectedEvent.location}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <CalendarCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Check-in Window:</strong> {formatTime12Hour(selectedEvent.checkInOpenTime)} to {formatTime12Hour(selectedEvent.checkInCloseTime)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                About this Activity
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {selectedEvent.description}
              </p>
            </div>

            {/* Registration / RSVP reminder box */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <BellRing className="w-4 h-4 text-emerald-600" />
                  {registrations[selectedEvent.id] ? 'RSVP Active for this Service' : 'Activity Automated Reminders'}
                </span>
                <p className="text-slate-500 text-[11px]">
                  {registrations[selectedEvent.id] 
                    ? 'Automated background service will trigger email & push notifications before service starts.'
                    : 'Pre-register to trigger automated email & push alerts before this gathering.'}
                </p>
              </div>

              <Button
                type="button"
                variant={registrations[selectedEvent.id] ? 'outline' : 'primary'}
                size="sm"
                onClick={() => handleToggleRegistration(selectedEvent)}
                loading={registeringEventId === selectedEvent.id}
                className="shrink-0 text-xs"
              >
                {registrations[selectedEvent.id] ? 'Cancel RSVP' : 'RSVP Now'}
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <Button
                variant="primary"
                size="lg"
                icon={<QrCode className="w-5 h-5" />}
                onClick={() => handleStartCheckIn(selectedEvent)}
                className="w-full"
              >
                CHECK IN NOW
              </Button>
              {isAdminRole && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  icon={<Trash2 className="w-4 h-4 text-rose-600" />}
                  onClick={() => {
                    const toDelete = selectedEvent;
                    setSelectedEvent(null);
                    setDeleteConfirmEvent(toDelete);
                  }}
                  className="shrink-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  title="Delete Activity"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ADMIN CREATE ACTIVITY MODAL */}
      {isAdminRole && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Add Church Activity"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveActivity} className="space-y-4 text-left">
            {/* Quick Presets */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
              <span className="text-[11px] font-bold text-emerald-900 block mb-2 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Quick Service Presets
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('Sunday Service')}
                  className={`px-2.5 py-1 text-xs rounded-xl font-semibold border transition-all ${
                    createForm.type === 'Sunday Service'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  Sunday Service (8:00 AM – 11:00 AM)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('Digging Deep')}
                  className={`px-2.5 py-1 text-xs rounded-xl font-semibold border transition-all ${
                    createForm.type === 'Digging Deep'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  Tuesdays Digging Deep (5:30 PM – 6:30 PM)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('Faith Clinic')}
                  className={`px-2.5 py-1 text-xs rounded-xl font-semibold border transition-all ${
                    createForm.type === 'Faith Clinic'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  Thursdays Faith Clinic (5:30 PM – 6:30 PM)
                </button>
              </div>
            </div>

            <Input
              label="Activity Title *"
              value={createForm.title}
              onChange={(e) => setCreateForm(p => ({ ...p, title: e.target.value }))}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Activity Type
                </label>
                <select
                  value={createForm.type}
                  onChange={(e) => handleSelectPreset(e.target.value as EventType)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                >
                  <option value="Sunday Service">Sunday Service</option>
                  <option value="Digging Deep">Digging Deep</option>
                  <option value="Faith Clinic">Faith Clinic</option>
                  <option value="Prayer Meeting">Prayer Meeting</option>
                  <option value="Youth Fellowship">Youth Fellowship</option>
                  <option value="Special Conference">Special Conference</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <Input
                label="Date *"
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm(p => ({ ...p, date: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Time *"
                type="time"
                value={createForm.startTime}
                onChange={(e) => setCreateForm(p => ({ ...p, startTime: e.target.value }))}
                required
              />
              <Input
                label="End Time *"
                type="time"
                value={createForm.endTime}
                onChange={(e) => setCreateForm(p => ({ ...p, endTime: e.target.value }))}
                required
              />
            </div>

            <Input
              label="Location *"
              value={createForm.location}
              onChange={(e) => setCreateForm(p => ({ ...p, location: e.target.value }))}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Description
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                icon={<Plus className="w-4 h-4" />}
              >
                Create Activity
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* QR SCANNER */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        activeEvent={checkInTargetEvent}
        onCheckInSuccess={() => fetchEventsAndAttendance()}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteConfirmEvent}
        onClose={() => !deleting && setDeleteConfirmEvent(null)}
        title="Delete Church Activity"
        maxWidth="md"
      >
        {deleteConfirmEvent && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-rose-900">Are you sure you want to delete this activity?</p>
                <p className="text-xs text-rose-700">
                  This action will permanently delete this service and check-in session from the church schedule.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{deleteConfirmEvent.title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {deleteConfirmEvent.type}
                </span>
              </div>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatDateReadable(deleteConfirmEvent.date)} • {formatTime12Hour(deleteConfirmEvent.startTime)} – {formatTime12Hour(deleteConfirmEvent.endTime)}
              </p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {deleteConfirmEvent.location}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setDeleteConfirmEvent(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handleDeleteConfirm}
                loading={deleting}
              >
                Delete Activity
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
