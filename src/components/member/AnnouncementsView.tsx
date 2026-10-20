import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Announcement } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatDateReadable } from '../../lib/utils';
import { Megaphone, Plus, Edit, Trash2, CheckCircle2, ShieldCheck, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { INITIAL_DEPARTMENTS, INITIAL_GROUPS } from '../../lib/seedData';
import { AnnouncementsViewSkeleton } from '../ui/Skeleton';

export const AnnouncementsView: React.FC = () => {
  const { role, userProfile } = useAuth();
  const isAdminRole = role === 'admin' || role === 'super_admin';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Admin create/edit modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [activeEditingAnn, setActiveEditingAnn] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'everyone' | 'department' | 'group'>('everyone');
  const [targetName, setTargetName] = useState('Everyone');
  const [status, setStatus] = useState<'published' | 'draft'>('published');

  const fetchAnnouncements = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'announcements')));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setAnnouncements(list);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenCreateModal = () => {
    setActiveEditingAnn(null);
    setTitle('');
    setMessage('');
    setAudience('everyone');
    setTargetName('Everyone');
    setStatus('published');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (ann: Announcement) => {
    setActiveEditingAnn(ann);
    setTitle(ann.title);
    setMessage(ann.message);
    setAudience(ann.audience);
    setTargetName(ann.targetName || 'Everyone');
    setStatus(ann.status === 'draft' ? 'draft' : 'published');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleDeleteAnnouncement = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      if (selectedAnnouncement?.id === id) {
        setSelectedAnnouncement(null);
      }
    } catch (err) {
      console.error('Error deleting announcement:', err);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFormError('Please enter both a title and message.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const now = new Date().toISOString();
      const resolvedTarget = audience === 'everyone' ? 'Everyone' : targetName.trim();

      if (!activeEditingAnn) {
        // Create new
        const id = `ann-${Date.now()}`;
        const newAnn: Announcement = {
          id,
          title: title.trim(),
          message: message.trim(),
          audience,
          targetName: resolvedTarget,
          status,
          date: now.split('T')[0],
          authorName: userProfile?.displayName || 'Church Administration',
          createdAt: now
        };

        await setDoc(doc(db, 'announcements', id), newAnn);
        setAnnouncements(prev => [newAnn, ...prev]);
      } else {
        // Update existing
        const updatedData = {
          title: title.trim(),
          message: message.trim(),
          audience,
          targetName: resolvedTarget,
          status
        };

        await updateDoc(doc(db, 'announcements', activeEditingAnn.id), updatedData);
        setAnnouncements(prev => prev.map(a => a.id === activeEditingAnn.id ? { ...a, ...updatedData } : a));
      }

      setIsFormModalOpen(false);
    } catch (err: any) {
      console.error('Error saving announcement:', err);
      setFormError(err.message || 'Failed to save announcement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <AnnouncementsViewSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Announcements</h1>
            {isAdminRole && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Admin Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Official church notices, conferences, and department updates</p>
        </div>

        {/* Admin Quick Action Button to Add Announcement */}
        {isAdminRole && (
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
            className="self-start sm:self-auto text-xs shadow-sm"
          >
            Post Announcement
          </Button>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((ann) => (
          <Card
            key={ann.id}
            className="p-5 sm:p-6 bg-white border-slate-200/80 hover:border-emerald-200 transition-all space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
                  {ann.targetName || 'Everyone'}
                </span>
                {isAdminRole && (
                  <Badge
                    variant={ann.status === 'published' ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {ann.status.toUpperCase()}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {formatDateReadable(ann.date)}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">{ann.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {ann.message}
            </p>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>Published by {ann.authorName || 'Church Leadership'}</span>
              
              <div className="flex items-center gap-2">
                {isAdminRole && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Edit className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenEditModal(ann)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                      onClick={(e) => handleDeleteAnnouncement(ann.id, e)}
                    >
                      Delete
                    </Button>
                  </>
                )}
                <Button
                  variant={isAdminRole ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => setSelectedAnnouncement(ann)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {announcements.length === 0 && !loading && (
          <Card className="p-12 text-center border-dashed border-slate-200">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No active announcements</p>
            <p className="text-xs text-slate-400 mt-1">Check back later for church bulletins.</p>
            {isAdminRole && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreateModal}
                className="mt-4 mx-auto"
              >
                Create First Announcement
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Member / Detailed Reader Modal */}
      {selectedAnnouncement && (
        <Modal
          isOpen={!!selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
          title="Church Announcement"
          maxWidth="md"
        >
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold text-emerald-700 uppercase tracking-wider">
                {formatDateReadable(selectedAnnouncement.date)}
              </span>
              <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                {selectedAnnouncement.targetName || 'Everyone'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedAnnouncement.title}
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {selectedAnnouncement.message}
            </p>
            <div className="text-xs text-slate-400 pt-1">
              Author: {selectedAnnouncement.authorName || 'Church Leadership'}
            </div>
            <Button
              variant="primary"
              onClick={() => setSelectedAnnouncement(null)}
              className="w-full mt-2"
            >
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Admin Create / Edit Announcement Modal */}
      {isAdminRole && (
        <Modal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          title={activeEditingAnn ? 'Edit Church Announcement' : 'Post New Announcement'}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-left">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {formError}
              </div>
            )}

            <Input
              label="Announcement Title *"
              placeholder="e.g. Midweek Revival & Special Thanksgiving"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Target Audience *
                </label>
                <select
                  value={audience}
                  onChange={(e) => {
                    const newAud = e.target.value as any;
                    setAudience(newAud);
                    if (newAud === 'everyone') setTargetName('Everyone');
                    if (newAud === 'department') setTargetName(INITIAL_DEPARTMENTS[0].name);
                    if (newAud === 'group') setTargetName(INITIAL_GROUPS[0].name);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                >
                  <option value="everyone">Everyone (All Congregation)</option>
                  <option value="department">Specific Department</option>
                  <option value="group">Specific Fellowship / Cell Group</option>
                </select>
              </div>

              {audience !== 'everyone' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                    Select {audience === 'department' ? 'Department' : 'Group'} *
                  </label>
                  <select
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                  >
                    {audience === 'department' && INITIAL_DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                    {audience === 'group' && INITIAL_GROUPS.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {audience === 'everyone' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                    Publication Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                  >
                    <option value="published">Publish Immediately</option>
                    <option value="draft">Save as Draft</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Announcement Message / Bulletin Body *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the full announcement details, service instructions, or requirements..."
                rows={5}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                icon={<Send className="w-4 h-4" />}
              >
                {activeEditingAnn ? 'Update Announcement' : 'Publish Announcement'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
