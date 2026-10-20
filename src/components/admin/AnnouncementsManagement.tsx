import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Announcement } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Megaphone, Plus, Edit, Trash2, CheckCircle2, Archive, Send } from 'lucide-react';
import { formatDateReadable } from '../../lib/utils';
import { INITIAL_DEPARTMENTS, INITIAL_GROUPS } from '../../lib/seedData';
import { useAuth } from '../../contexts/AuthContext';
import { AnnouncementsViewSkeleton } from '../ui/Skeleton';

export const AnnouncementsManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAnn, setActiveAnn] = useState<Announcement | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'everyone' | 'department' | 'group'>('everyone');
  const [targetName, setTargetName] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('published');

  const fetchAnnouncements = async () => {
    try {
      const snap = await getDocs(collection(db, 'announcements'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setAnnouncements(list);
    } catch (e) {
      console.error('Error fetching announcements:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenCreate = () => {
    setActiveAnn(null);
    setTitle('');
    setMessage('');
    setAudience('everyone');
    setTargetName('');
    setStatus('published');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann: Announcement) => {
    setActiveAnn(ann);
    setTitle(ann.title);
    setMessage(ann.message);
    setAudience(ann.audience);
    setTargetName(ann.targetName || '');
    setStatus(ann.status);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (ann: Announcement, nextStatus: 'draft' | 'published' | 'archived') => {
    try {
      await updateDoc(doc(db, 'announcements', ann.id), { status: nextStatus });
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, status: nextStatus } : a));
    } catch (e) {
      console.error('Update status error:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Delete announcement error:', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date().toISOString();
      if (!activeAnn) {
        const id = `ann-${Date.now()}`;
        const newAnn: Announcement = {
          id,
          title: title.trim(),
          message: message.trim(),
          audience,
          targetName: audience === 'everyone' ? 'Everyone' : targetName.trim(),
          status,
          date: now.split('T')[0],
          authorName: userProfile?.displayName || 'Church Administrator',
          createdAt: now
        };
        await setDoc(doc(db, 'announcements', id), newAnn);
        setAnnouncements(prev => [newAnn, ...prev]);
      } else {
        const updated = {
          title: title.trim(),
          message: message.trim(),
          audience,
          targetName: audience === 'everyone' ? 'Everyone' : targetName.trim(),
          status
        };
        await updateDoc(doc(db, 'announcements', activeAnn.id), updated);
        setAnnouncements(prev => prev.map(a => a.id === activeAnn.id ? { ...a, ...updated } : a));
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error('Save announcement error:', e);
    }
  };

  if (loading) {
    return <AnnouncementsViewSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Announcements & Bulletins</h1>
          <p className="text-xs text-slate-500">Broadcast updates to all members, specific departments, or fellowship groups</p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
          className="text-xs"
        >
          Create Announcement
        </Button>
      </div>

      <div className="space-y-4">
        {announcements.map((ann) => (
          <Card key={ann.id} className="p-5 bg-white border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
                  Target: {ann.targetName || 'Everyone'}
                </span>
                <Badge
                  variant={ann.status === 'published' ? 'success' : ann.status === 'draft' ? 'warning' : 'neutral'}
                  size="sm"
                >
                  {ann.status.toUpperCase()}
                </Badge>
              </div>
              <span className="text-xs text-slate-400">
                {formatDateReadable(ann.date)} • By {ann.authorName}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">{ann.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{ann.message}</p>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                {ann.status !== 'published' && (
                  <Button
                    variant="success"
                    size="sm"
                    icon={<Send className="w-3.5 h-3.5" />}
                    onClick={() => handleStatusChange(ann, 'published')}
                  >
                    Publish
                  </Button>
                )}
                {ann.status === 'published' && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Archive className="w-3.5 h-3.5" />}
                    onClick={() => handleStatusChange(ann, 'archived')}
                  >
                    Archive
                  </Button>
                )}
                {ann.status !== 'draft' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(ann, 'draft')}
                  >
                    Save as Draft
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Edit className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenEdit(ann)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  onClick={() => handleDelete(ann.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={activeAnn ? 'Edit Announcement' : 'Create Announcement'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-left">
          <Input
            label="Announcement Title"
            placeholder="e.g. Annual Church Conference 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Audience Scope</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
              >
                <option value="everyone">Everyone (All Congregation)</option>
                <option value="department">Specific Department</option>
                <option value="group">Specific Fellowship Group</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Publication Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
              >
                <option value="published">Publish Immediately</option>
                <option value="draft">Save as Draft</option>
                <option value="archived">Archive</option>
              </select>
            </div>
          </div>

          {audience === 'department' && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Select Department</label>
              <select
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                required
              >
                <option value="">-- Choose Department --</option>
                {INITIAL_DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {audience === 'group' && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Select Group</label>
              <select
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                required
              >
                <option value="">-- Choose Fellowship Group --</option>
                {INITIAL_GROUPS.map(g => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Message Body</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:border-emerald-500 outline-none"
              placeholder="Announcement details, date, instructions..."
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Announcement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
