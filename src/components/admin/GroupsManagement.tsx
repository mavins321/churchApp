import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ChurchGroup } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { FolderGit2, Plus, Edit, Users, Calendar } from 'lucide-react';
import { CardGridSkeleton } from '../ui/Skeleton';

export const GroupsManagement: React.FC = () => {
  const [groups, setGroups] = useState<ChurchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<ChurchGroup | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChurchGroup['type']>('Cell');
  const [meetingDay, setMeetingDay] = useState('');
  const [leaderName, setLeaderName] = useState('');

  const fetchGroups = async () => {
    try {
      const snap = await getDocs(collection(db, 'groups'));
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchGroup)));
    } catch (e) {
      console.error('Error fetching groups:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleOpenCreate = () => {
    setActiveGroup(null);
    setName('');
    setDescription('');
    setType('Cell');
    setMeetingDay('Wednesday 6:00 PM');
    setLeaderName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: ChurchGroup) => {
    setActiveGroup(g);
    setName(g.name);
    setDescription(g.description);
    setType(g.type);
    setMeetingDay(g.meetingDay || '');
    setLeaderName(g.leaderName || '');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (g: ChurchGroup) => {
    try {
      await updateDoc(doc(db, 'groups', g.id), { active: !g.active });
      setGroups(prev => prev.map(item => item.id === g.id ? { ...item, active: !item.active } : item));
    } catch (e) {
      console.error('Toggle group active error:', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!activeGroup) {
        const id = `grp-${Date.now()}`;
        const newGroup: ChurchGroup = {
          id,
          name: name.trim(),
          description: description.trim(),
          type,
          meetingDay: meetingDay.trim(),
          leaderName: leaderName.trim(),
          active: true,
          memberCount: 0,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'groups', id), newGroup);
        setGroups(prev => [...prev, newGroup]);
      } else {
        const updated = {
          name: name.trim(),
          description: description.trim(),
          type,
          meetingDay: meetingDay.trim(),
          leaderName: leaderName.trim()
        };
        await updateDoc(doc(db, 'groups', activeGroup.id), updated);
        setGroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, ...updated } : g));
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error('Save group error:', e);
    }
  };

  if (loading) {
    return <CardGridSkeleton columns="3" cardsCount={6} />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fellowship & Cell Groups</h1>
          <p className="text-xs text-slate-500">Home cell groups, Bible study circles, and demographics fellowships</p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
          className="text-xs"
        >
          Add Group
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card key={group.id} className="p-5 bg-white border-slate-200/80 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  {group.type}
                </span>
                <Badge variant={group.active ? 'success' : 'neutral'} size="sm">
                  {group.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <h3 className="text-base font-bold text-slate-900">{group.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-2">{group.description}</p>
              
              <div className="text-xs text-slate-700 space-y-0.5 pt-1">
                <p>Meeting: <span className="font-semibold text-slate-900">{group.meetingDay || 'Midweek'}</span></p>
                <p>Leader: <span className="font-semibold text-slate-900">{group.leaderName || 'Cell Leader'}</span></p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                {group.memberCount || 20} members
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(group)}
                >
                  Edit
                </Button>
                <Button
                  variant={group.active ? 'outline' : 'success'}
                  size="sm"
                  onClick={() => handleToggleActive(group)}
                >
                  {group.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={activeGroup ? 'Edit Fellowship Group' : 'Create Fellowship Group'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-left">
          <Input
            label="Group Name"
            placeholder="e.g. Grace Cell Fellowship"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Group Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
              >
                <option value="Cell">Cell Fellowship</option>
                <option value="Bible Study">Bible Study</option>
                <option value="Fellowship">Fellowship</option>
                <option value="Youth">Youth Hub</option>
                <option value="Men">Men Fellowship</option>
                <option value="Women">Women Fellowship</option>
              </select>
            </div>

            <Input
              label="Meeting Day & Time"
              placeholder="e.g. Wednesday 6:00 PM"
              value={meetingDay}
              onChange={(e) => setMeetingDay(e.target.value)}
              required
            />
          </div>

          <Input
            label="Leader / Host Name"
            placeholder="e.g. Bro. & Sis. Adeleke"
            value={leaderName}
            onChange={(e) => setLeaderName(e.target.value)}
          />

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:border-emerald-500 outline-none"
              placeholder="Location coverage and meeting details..."
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
