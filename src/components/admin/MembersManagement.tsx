import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  deleteDoc 
} from 'firebase/firestore';
import { Member } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SearchInput } from '../ui/SearchInput';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Check, 
  UserX, 
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { generateMembershipNumber } from '../../lib/utils';
import { INITIAL_DEPARTMENTS, INITIAL_GROUPS } from '../../lib/seedData';
import { MembersManagementSkeleton } from '../ui/Skeleton';

export const MembersManagement: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    departmentName: 'Choir & Worship',
    groupName: 'Grace Cell Fellowship',
    address: 'Plot 14 Grace Sanctuary Way',
    city: 'Ikeja',
    state: 'Lagos',
    country: 'Nigeria',
    dateOfBirth: '1992-04-12',
    emergencyName: 'Emergency Contact',
    emergencyPhone: '+234 800 000 0000',
    status: 'active' as 'active' | 'suspended'
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchMembers = async () => {
    try {
      const snap = await getDocs(collection(db, 'members'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setMembers(list);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleOpenCreate = () => {
    setEditMode('create');
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      gender: 'Male',
      departmentName: 'Choir & Worship',
      groupName: 'Grace Cell Fellowship',
      address: 'Lagos, Nigeria',
      city: 'Ikeja',
      state: 'Lagos',
      country: 'Nigeria',
      dateOfBirth: '1995-01-01',
      emergencyName: 'Emergency Contact',
      emergencyPhone: '',
      status: 'active'
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (m: Member) => {
    setActiveMember(m);
    setEditMode('edit');
    setFormData({
      firstName: m.firstName,
      lastName: m.lastName,
      phone: m.phone,
      email: m.email,
      gender: m.gender,
      departmentName: m.departmentName || 'Choir & Worship',
      groupName: m.groupName || 'Grace Cell Fellowship',
      address: m.address,
      city: m.city,
      state: m.state,
      country: m.country,
      dateOfBirth: m.dateOfBirth,
      emergencyName: m.emergencyName,
      emergencyPhone: m.emergencyPhone,
      status: m.status
    });
    setIsAddEditModalOpen(true);
  };

  const handleToggleStatus = async (m: Member) => {
    const nextStatus = m.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'members', m.id), { status: nextStatus, updatedAt: new Date().toISOString() });
      setMembers(prev => prev.map(item => item.id === m.id ? { ...item, status: nextStatus } : item));
    } catch (e) {
      console.error('Failed to change status:', e);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date().toISOString();
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      if (editMode === 'create') {
        const newId = `mem_admin_${Date.now()}`;
        const newMember: Member = {
          id: newId,
          userId: `usr_dummy_${Date.now()}`,
          membershipNumber: generateMembershipNumber(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          fullName,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          country: formData.country.trim(),
          departmentName: formData.departmentName,
          groupName: formData.groupName,
          membershipDate: now.split('T')[0],
          emergencyName: formData.emergencyName.trim(),
          emergencyPhone: formData.emergencyPhone.trim(),
          status: formData.status,
          createdAt: now,
          updatedAt: now
        };
        await setDoc(doc(db, 'members', newId), newMember);
        setMembers(prev => [newMember, ...prev]);
      } else if (activeMember) {
        const updated = {
          ...formData,
          fullName,
          updatedAt: now
        };
        await updateDoc(doc(db, 'members', activeMember.id), updated);
        setMembers(prev => prev.map(m => m.id === activeMember.id ? { ...m, ...updated } : m));
      }

      setIsAddEditModalOpen(false);
    } catch (err) {
      console.error('Save member error:', err);
    }
  };

  // Filter logic
  const filtered = members.filter(m => {
    const matchesSearch = searchTerm === '' ||
      m.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.membershipNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone?.includes(searchTerm) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = selectedDept === 'all' || m.departmentName === selectedDept;
    const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedMembers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return <MembersManagementSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Member Management</h1>
          <p className="text-xs text-slate-500">View, add, update, and manage church members ({members.length} total)</p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={handleOpenCreate}
          className="text-xs"
        >
          Add New Member
        </Button>
      </div>

      {/* Filter and Search Controls */}
      <Card className="p-4 bg-white border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchInput
            placeholder="Search by name, ID, phone, or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            onClear={() => setSearchTerm('')}
          />

          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Departments</option>
            {INITIAL_DEPARTMENTS.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Members</option>
            <option value="suspended">Suspended Members</option>
          </select>
        </div>
      </Card>

      {/* DESKTOP & TABLET TABLE */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 overflow-x-auto shadow-xs">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Member</th>
              <th className="px-4 py-3.5">Membership ID</th>
              <th className="px-4 py-3.5">Department</th>
              <th className="px-4 py-3.5">Phone</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Joined</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedMembers.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.fullName} photoUrl={m.photoUrl} size="sm" />
                    <div>
                      <p className="font-bold text-slate-900">{m.fullName}</p>
                      <p className="text-[11px] text-slate-400">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-mono font-bold text-slate-700">
                  {m.membershipNumber}
                </td>
                <td className="px-4 py-3.5 text-slate-600 font-medium">
                  {m.departmentName || 'General Assembly'}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {m.phone}
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant={m.status === 'active' ? 'success' : 'danger'} size="sm">
                    {m.status === 'active' ? 'Active' : 'Suspended'}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 text-slate-500">
                  {m.membershipDate || '2026'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => {
                        setActiveMember(m);
                        setIsDetailModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                      title="View Member"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                      title="Edit Member"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(m)}
                      className={`p-1.5 rounded-lg ${
                        m.status === 'active'
                          ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={m.status === 'active' ? 'Suspend Member' : 'Activate Member'}
                    >
                      {m.status === 'active' ? <UserX className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {paginatedMembers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  No members matched your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-3">
        {paginatedMembers.map((m) => (
          <Card key={m.id} className="p-4 bg-white border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={m.fullName} photoUrl={m.photoUrl} size="md" />
                <div>
                  <h4 className="font-bold text-slate-900">{m.fullName}</h4>
                  <p className="text-[11px] font-mono text-slate-400">{m.membershipNumber}</p>
                </div>
              </div>
              <Badge variant={m.status === 'active' ? 'success' : 'danger'} size="sm">
                {m.status === 'active' ? 'Active' : 'Suspended'}
              </Badge>
            </div>

            <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
              <p>Dept: <span className="font-medium text-slate-800">{m.departmentName || 'General Assembly'}</span></p>
              <p>Phone: <span className="font-medium text-slate-800">{m.phone}</span></p>
              <p>Email: <span className="font-medium text-slate-800">{m.email}</span></p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveMember(m);
                  setIsDetailModalOpen(true);
                }}
              >
                Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(m)}
              >
                Edit
              </Button>
              <Button
                variant={m.status === 'active' ? 'danger' : 'success'}
                size="sm"
                onClick={() => handleToggleStatus(m)}
              >
                {m.status === 'active' ? 'Suspend' : 'Activate'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} ({filtered.length} members)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editMode === 'create' ? 'Add Church Member' : 'Edit Member Profile'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveMember} className="space-y-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Department</label>
              <select
                value={formData.departmentName}
                onChange={(e) => setFormData(p => ({ ...p, departmentName: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
              >
                {INITIAL_DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Fellowship Group</label>
              <select
                value={formData.groupName}
                onChange={(e) => setFormData(p => ({ ...p, groupName: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
              >
                {INITIAL_GROUPS.map(g => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Emergency Name"
              value={formData.emergencyName}
              onChange={(e) => setFormData(p => ({ ...p, emergencyName: e.target.value }))}
              required
            />
            <Input
              label="Emergency Phone"
              value={formData.emergencyPhone}
              onChange={(e) => setFormData(p => ({ ...p, emergencyPhone: e.target.value }))}
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {editMode === 'create' ? 'Create Member' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW MEMBER DETAILS MODAL */}
      {activeMember && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Member Record"
          maxWidth="md"
        >
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <Avatar name={activeMember.fullName} photoUrl={activeMember.photoUrl} size="lg" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">{activeMember.fullName}</h3>
                <p className="text-xs font-mono font-bold text-emerald-700">{activeMember.membershipNumber}</p>
                <Badge variant={activeMember.status === 'active' ? 'success' : 'danger'} size="sm" className="mt-1">
                  {activeMember.status === 'active' ? 'Active' : 'Suspended'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p><strong>Department:</strong> {activeMember.departmentName || 'None'}</p>
              <p><strong>Fellowship:</strong> {activeMember.groupName || 'None'}</p>
              <p><strong>Phone:</strong> {activeMember.phone}</p>
              <p><strong>Email:</strong> {activeMember.email}</p>
              <p><strong>Address:</strong> {activeMember.address}, {activeMember.city}, {activeMember.state}</p>
              <p><strong>Emergency Contact:</strong> {activeMember.emergencyName} ({activeMember.emergencyPhone})</p>
              <p><strong>Joined Date:</strong> {activeMember.membershipDate}</p>
            </div>

            <Button
              type="button"
              variant="primary"
              className="w-full mt-2"
              onClick={() => setIsDetailModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
