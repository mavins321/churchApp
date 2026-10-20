import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { ChurchEvent, EventType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { QRCheckInDisplayModal } from './QRCheckInDisplayModal';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  QrCode, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { formatDateReadable, formatTime12Hour } from '../../lib/utils';
import { EventsManagementSkeleton } from '../ui/Skeleton';

export const EventsManagement: React.FC = () => {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrModalEvent, setQrModalEvent] = useState<ChurchEvent | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeEvent, setActiveEvent] = useState<ChurchEvent | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<ChurchEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Sunday Service' as EventType,
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:30',
    location: 'Main Auditorium, FaithTrack Cathedral',
    recurring: true,
    attendanceEnabled: true,
    checkInOpenTime: '08:30',
    checkInCloseTime: '10:30',
    expectedCount: 400
  });

  const fetchEvents = async () => {
    try {
      const snap = await getDocs(collection(db, 'events'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchEvent));
      list.sort((a, b) => a.date.localeCompare(b.date));
      setEvents(list);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      title: 'Sunday Worship Service',
      description: 'Prophetic praise, heartfelt worship, and life-transforming Word ministered with power.',
      type: 'Sunday Service',
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
    setIsModalOpen(true);
  };

  const handleTypeSelect = (selectedType: EventType) => {
    let title = formData.title;
    let description = formData.description;
    let startTime = formData.startTime;
    let endTime = formData.endTime;
    let checkInOpenTime = formData.checkInOpenTime;
    let checkInCloseTime = formData.checkInCloseTime;

    if (selectedType === 'Sunday Service') {
      title = 'Sunday Worship Service';
      description = 'Glorious time in God\'s presence with praise, worship, and revelation from the Word.';
      startTime = '08:00';
      endTime = '11:00';
      checkInOpenTime = '07:30';
      checkInCloseTime = '10:30';
    } else if (selectedType === 'Digging Deep') {
      title = 'Digging Deep Bible Study';
      description = 'Interactive verse-by-verse scriptural exploration, doctrinal clarity, and practical Christian living.';
      startTime = '17:30';
      endTime = '18:30';
      checkInOpenTime = '17:00';
      checkInCloseTime = '18:30';
    } else if (selectedType === 'Faith Clinic') {
      title = 'Faith Clinic & Deliverance Hour';
      description = 'Intensive prayer and deliverance service focusing on divine healing and breakthroughs.';
      startTime = '17:30';
      endTime = '18:30';
      checkInOpenTime = '17:00';
      checkInCloseTime = '18:30';
    }

    setFormData(prev => ({
      ...prev,
      type: selectedType,
      title: modalMode === 'create' ? title : prev.title,
      description: modalMode === 'create' ? description : prev.description,
      startTime,
      endTime,
      checkInOpenTime,
      checkInCloseTime
    }));
  };

  const handleOpenEdit = (ev: ChurchEvent) => {
    setActiveEvent(ev);
    setModalMode('edit');
    setFormData({
      title: ev.title,
      description: ev.description,
      type: ev.type,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      location: ev.location,
      recurring: ev.recurring,
      attendanceEnabled: ev.attendanceEnabled,
      checkInOpenTime: ev.checkInOpenTime,
      checkInCloseTime: ev.checkInCloseTime,
      expectedCount: ev.expectedCount || 300
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = async (ev: ChurchEvent) => {
    try {
      const newId = `ev_${Date.now()}`;
      const now = new Date().toISOString();
      const token = `FT-${ev.type.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const duplicated: ChurchEvent = {
        ...ev,
        id: newId,
        title: `${ev.title} (Copy)`,
        attendeesCount: 0,
        qrSessionToken: token,
        status: 'upcoming',
        createdAt: now,
        updatedAt: now
      };

      await setDoc(doc(db, 'events', newId), duplicated);
      setEvents(prev => [...prev, duplicated]);
    } catch (e) {
      console.error('Duplicate error:', e);
    }
  };

  const handleCancelToggle = async (ev: ChurchEvent) => {
    const nextStatus = ev.status === 'cancelled' ? 'upcoming' : 'cancelled';
    try {
      await updateDoc(doc(db, 'events', ev.id), { status: nextStatus, updatedAt: new Date().toISOString() });
      setEvents(prev => prev.map(item => item.id === ev.id ? { ...item, status: nextStatus } : item));
    } catch (e) {
      console.error('Cancel toggle error:', e);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmEvent) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'events', deleteConfirmEvent.id));
      setEvents(prev => prev.filter(ev => ev.id !== deleteConfirmEvent.id));
      setFeedbackMessage(`Activity "${deleteConfirmEvent.title}" deleted successfully.`);
      setTimeout(() => setFeedbackMessage(''), 4000);
      setDeleteConfirmEvent(null);
    } catch (err: any) {
      console.error('Delete event error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date().toISOString();
      if (modalMode === 'create') {
        const newId = `ev_${Date.now()}`;
        const token = `FT-${formData.type.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const newEvent: ChurchEvent = {
          id: newId,
          ...formData,
          status: 'upcoming',
          attendeesCount: 0,
          qrSessionToken: token,
          createdAt: now,
          updatedAt: now
        };

        await setDoc(doc(db, 'events', newId), newEvent);
        setEvents(prev => [...prev, newEvent]);
      } else if (activeEvent) {
        const updated = {
          ...formData,
          updatedAt: now
        };
        await updateDoc(doc(db, 'events', activeEvent.id), updated);
        setEvents(prev => prev.map(item => item.id === activeEvent.id ? { ...item, ...updated } : item));
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Save event error:', err);
    }
  };

  if (loading) {
    return <EventsManagementSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Activities & Services</h1>
          <p className="text-xs text-slate-500">Configure church schedule, QR check-in windows, and attendance rules</p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
          className="text-xs"
        >
          Create New Activity
        </Button>
      </div>

      {/* Success Feedback Banner */}
      {feedbackMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        {events.map((ev) => (
          <Card
            key={ev.id}
            className="p-5 sm:p-6 bg-white border-slate-200/80 hover:border-slate-300 transition-all space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    {ev.type}
                  </span>
                  <Badge variant={ev.status === 'cancelled' ? 'danger' : 'success'} size="sm">
                    {ev.status === 'cancelled' ? 'Cancelled' : 'Active'}
                  </Badge>
                  {ev.attendanceEnabled && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                      Attendance Enabled
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{ev.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-1">{ev.description}</p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-sm font-bold text-emerald-800 block">
                  {formatDateReadable(ev.date)}
                </span>
                <span className="text-xs text-slate-500">
                  {formatTime12Hour(ev.startTime)} – {formatTime12Hour(ev.endTime)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {ev.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Check-in: {formatTime12Hour(ev.checkInOpenTime)} – {formatTime12Hour(ev.checkInCloseTime)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">
                  {ev.attendeesCount || 0} Attended
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  Token: {ev.qrSessionToken || 'N/A'}
                </span>
              </div>
            </div>

            {/* Admin Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <Button
                variant="primary"
                size="sm"
                icon={<QrCode className="w-4 h-4" />}
                onClick={() => setQrModalEvent(ev)}
                className="text-xs shadow-xs"
              >
                Project Check-In QR
              </Button>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Copy className="w-3.5 h-3.5" />}
                  onClick={() => handleDuplicate(ev)}
                  className="text-xs"
                >
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Edit className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenEdit(ev)}
                  className="text-xs"
                >
                  Edit
                </Button>
                <Button
                  variant={ev.status === 'cancelled' ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={() => handleCancelToggle(ev)}
                  className="text-xs"
                >
                  {ev.status === 'cancelled' ? 'Re-activate' : 'Cancel'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                  onClick={() => setDeleteConfirmEvent(ev)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create Church Activity' : 'Edit Activity'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-left">
          <Input
            label="Activity Title"
            placeholder="e.g. Sunday Worship Service"
            value={formData.title}
            onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Activity Type</label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeSelect(e.target.value as EventType)}
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
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))}
              required
            />
          </div>

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
            required
          />

          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Attendance & QR Check-In Configuration
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Check-In Window Opens"
                type="time"
                value={formData.checkInOpenTime}
                onChange={(e) => setFormData(p => ({ ...p, checkInOpenTime: e.target.value }))}
                required
              />
              <Input
                label="Check-In Window Closes"
                type="time"
                value={formData.checkInCloseTime}
                onChange={(e) => setFormData(p => ({ ...p, checkInCloseTime: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm focus:border-emerald-500 outline-none"
              placeholder="Activity notes or description..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {modalMode === 'create' ? 'Create Event' : 'Save Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Check-In Screen Modal */}
      <QRCheckInDisplayModal
        isOpen={!!qrModalEvent}
        onClose={() => setQrModalEvent(null)}
        event={qrModalEvent}
        onRefreshSuccess={() => fetchEvents()}
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
                  This action cannot be undone. The scheduled service and its associated check-in session token will be permanently removed from the church database.
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
