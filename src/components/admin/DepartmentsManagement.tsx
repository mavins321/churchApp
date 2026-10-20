import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Department } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Building2, Plus, Edit, Users, CheckCircle2, XCircle } from 'lucide-react';
import { CardGridSkeleton } from '../ui/Skeleton';

export const DepartmentsManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDept, setActiveDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderName, setLeaderName] = useState('');

  const fetchDepartments = async () => {
    try {
      const snap = await getDocs(collection(db, 'departments'));
      setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Department)));
    } catch (e) {
      console.error('Error fetching departments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenCreate = () => {
    setActiveDept(null);
    setName('');
    setDescription('');
    setLeaderName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setActiveDept(dept);
    setName(dept.name);
    setDescription(dept.description);
    setLeaderName(dept.leaderName || '');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (dept: Department) => {
    try {
      await updateDoc(doc(db, 'departments', dept.id), { active: !dept.active });
      setDepartments(prev => prev.map(d => d.id === dept.id ? { ...d, active: !d.active } : d));
    } catch (e) {
      console.error('Toggle active error:', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!activeDept) {
        const id = `dept-${Date.now()}`;
        const newDept: Department = {
          id,
          name: name.trim(),
          description: description.trim(),
          leaderName: leaderName.trim(),
          active: true,
          memberCount: 0,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'departments', id), newDept);
        setDepartments(prev => [...prev, newDept]);
      } else {
        const updated = {
          name: name.trim(),
          description: description.trim(),
          leaderName: leaderName.trim()
        };
        await updateDoc(doc(db, 'departments', activeDept.id), updated);
        setDepartments(prev => prev.map(d => d.id === activeDept.id ? { ...d, ...updated } : d));
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error('Save department error:', e);
    }
  };

  if (loading) {
    return <CardGridSkeleton columns="3" cardsCount={6} />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Church Departments</h1>
          <p className="text-xs text-slate-500">Ministry units, volunteer teams, and workforce leadership</p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
          className="text-xs"
        >
          Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <Card key={dept.id} className="p-5 bg-white border-slate-200/80 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <Badge variant={dept.active ? 'success' : 'neutral'} size="sm">
                  {dept.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <h3 className="text-base font-bold text-slate-900">{dept.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-2">{dept.description}</p>
              <p className="text-xs text-slate-700 font-medium">
                Leader: <span className="text-slate-900">{dept.leaderName || 'Pastoral Board'}</span>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                {dept.memberCount || 15} workers
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(dept)}
                >
                  Edit
                </Button>
                <Button
                  variant={dept.active ? 'outline' : 'success'}
                  size="sm"
                  onClick={() => handleToggleActive(dept)}
                >
                  {dept.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={activeDept ? 'Edit Department' : 'Create Department'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-left">
          <Input
            label="Department Name"
            placeholder="e.g. Media & Technical"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Department Leader"
            placeholder="e.g. Bro. Emmanuel David"
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
              placeholder="Department purpose and activities..."
              required
            />
          </div>
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Department
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
