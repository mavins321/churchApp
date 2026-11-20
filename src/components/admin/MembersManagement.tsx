import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { Member, UserRole, AccountStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
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
  ShieldOff,
  Phone, 
  Mail, 
  MapPin, 
  Check, 
  UserCheck,
  UserX, 
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { generateMembershipNumber } from '../../lib/utils';
import { INITIAL_DEPARTMENTS, INITIAL_GROUPS } from '../../lib/seedData';
import { MembersManagementSkeleton } from '../ui/Skeleton';

export const MembersManagement: React.FC = () => {
  const { firebaseUser } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [roleConfirmTarget, setRoleConfirmTarget] = useState<{ member: Member; nextRole: UserRole } | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

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
    status: 'active' as AccountStatus
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchMembers = async () => {
    try {
      const [membersSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'users'))
      ]);
      const list = membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setMembers(list);

      const rolesMap: Record<string, UserRole> = {};
      usersSnap.docs.forEach(d => {
        const data = d.data();
        rolesMap[d.id] = (data.role as UserRole) || 'member';
      });
      setUserRoles(rolesMap);
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

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const handleToggleStatus = async (m: Member) => {
    const nextStatus: AccountStatus = m.status === 'active' ? 'suspended' : 'active';
    const now = new Date().toISOString();
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'members', m.id), { status: nextStatus, updatedAt: now });
      if (m.userId && userRoles[m.userId]) {
        batch.update(doc(db, 'users', m.userId), { status: nextStatus, updatedAt: now });
      }
      await batch.commit();
      setMembers(prev => prev.map(item => item.id === m.id ? { ...item, status: nextStatus } : item));
      showFeedback(
        'success',
        nextStatus === 'active'
          ? `${m.fullName} has been approved & activated.`
          : `${m.fullName} has been suspended.`
      );
    } catch (e) {
      console.error('Failed to change status:', e);
      showFeedback('error', 'Failed to update member status.');
    }
  };

  const getMemberPortalRole = (m: Member): UserRole | null => {
    if (m.userId && userRoles[m.userId]) return userRoles[m.userId];
    return null;
  };

  const handleConfirmRoleChange = async () => {
    if (!roleConfirmTarget) return;
    const { member: target, nextRole } = roleConfirmTarget;

    if (!target.userId || !userRoles[target.userId]) {
      showFeedback('error', `${target.fullName} does not have a registered login account yet. They must register first before being granted Admin access.`);
      setRoleConfirmTarget(null);
      return;
    }

    if (userRoles[target.userId] === 'super_admin' && nextRole === 'member') {
      showFeedback('error', 'Super Administrator accounts cannot be demoted here.');
      setRoleConfirmTarget(null);
      return;
    }

    if (target.userId === firebaseUser?.uid && nextRole === 'member') {
      showFeedback('error', 'You cannot remove your own Admin privileges while signed in.');
      setRoleConfirmTarget(null);
      return;
    }

    setUpdatingRole(true);
    try {
      await updateDoc(doc(db, 'users', target.userId), {
        role: nextRole,
        updatedAt: new Date().toISOString()
      });
      setUserRoles(prev => ({ ...prev, [target.userId]: nextRole }));
      showFeedback(
        'success',
        nextRole === 'admin'
          ? `${target.fullName} has been promoted to Admin.`
          : `${target.fullName} has been changed back to Member.`
      );
      setRoleConfirmTarget(null);
    } catch (err) {
      console.error('Failed to update user role:', err);
      showFeedback('error', 'Failed to update user role in database.');
    } finally {
      setUpdatingRole(false);
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
          <p className="text-xs text-slate-500">Approve members, manage access roles (Member / Admin), and update directory ({members.length} total)</p>
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

      {actionFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

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
            <option value="pending">Pending Approval</option>
            <option value="active">Active Members</option>
            <option value="suspended">Suspended Members</option>
          </select>
        </div>
      </Card>

      {/* DESKTOP & TABLET TABLE */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 overflow-x-auto shadow-xs">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Member</th>
              <th className="px-4 py-3.5">Membership ID</th>
              <th className="px-4 py-3.5">Department</th>
              <th className="px-4 py-3.5">Portal Role</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Joined</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedMembers.map((m) => {
              const portalRole = getMemberPortalRole(m);
              const isMemberAdmin = portalRole === 'admin' || portalRole === 'super_admin';
              const isProtectedAdmin = portalRole === 'super_admin' || m.userId === firebaseUser?.uid;
              return (
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
                <td className="px-4 py-3.5">
                  {portalRole ? (
                    <Badge variant={isMemberAdmin ? 'info' : 'neutral'} size="sm">
                      {portalRole === 'super_admin' ? 'Super Admin' : isMemberAdmin ? 'Admin' : 'Member'}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-slate-400">Directory Only</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant={m.status === 'active' ? 'success' : m.status === 'pending' ? 'warning' : 'danger'} size="sm">
                    {m.status === 'active' ? 'Active' : m.status === 'pending' ? 'Pending' : 'Suspended'}
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
                    {portalRole && !isProtectedAdmin && (
                      <button
                        onClick={() => setRoleConfirmTarget({ member: m, nextRole: isMemberAdmin ? 'member' : 'admin' })}
                        className={`p-1.5 rounded-lg ${
                          isMemberAdmin
                            ? 'text-indigo-600 hover:text-amber-700 hover:bg-amber-50'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={isMemberAdmin ? 'Revoke Admin Role' : 'Make Admin'}
                      >
                        {isMemberAdmin ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(m)}
                      className={`p-1.5 rounded-lg ${
                        m.status === 'active'
                          ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={m.status === 'active' ? 'Suspend Member' : 'Approve & Activate Member'}
                    >
                      {m.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            );
            })}

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
        {paginatedMembers.map((m) => {
          const portalRole = getMemberPortalRole(m);
          const isMemberAdmin = portalRole === 'admin' || portalRole === 'super_admin';
          const isProtectedAdmin = portalRole === 'super_admin' || m.userId === firebaseUser?.uid;
          return (
          <Card key={m.id} className="p-4 bg-white border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={m.fullName} photoUrl={m.photoUrl} size="md" />
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">{m.fullName}</h4>
                  <p className="text-[11px] font-mono text-slate-400">{m.membershipNumber}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={m.status === 'active' ? 'success' : m.status === 'pending' ? 'warning' : 'danger'} size="sm">
                  {m.status === 'active' ? 'Active' : m.status === 'pending' ? 'Pending' : 'Suspended'}
                </Badge>
                {portalRole && (
                  <Badge variant={isMemberAdmin ? 'info' : 'neutral'} size="sm">
                    {isMemberAdmin ? 'Admin' : 'Member'}
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
              <p>Dept: <span className="font-medium text-slate-800">{m.departmentName || 'General Assembly'}</span></p>
              <p>Phone: <span className="font-medium text-slate-800">{m.phone}</span></p>
              <p>Email: <span className="font-medium text-slate-800">{m.email}</span></p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
              {portalRole && !isProtectedAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRoleConfirmTarget({ member: m, nextRole: isMemberAdmin ? 'member' : 'admin' })}
                >
                  {isMemberAdmin ? 'Revoke Admin' : 'Make Admin'}
                </Button>
              )}
              <Button
                variant={m.status === 'active' ? 'danger' : 'success'}
                size="sm"
                onClick={() => handleToggleStatus(m)}
              >
                {m.status === 'active' ? 'Suspend' : 'Activate'}
              </Button>
            </div>
          </Card>
          );
        })}
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
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant={activeMember.status === 'active' ? 'success' : activeMember.status === 'pending' ? 'warning' : 'danger'} size="sm">
                    {activeMember.status === 'active' ? 'Active' : activeMember.status === 'pending' ? 'Pending' : 'Suspended'}
                  </Badge>
                  {getMemberPortalRole(activeMember) && (
                    <Badge
                      variant={
                        getMemberPortalRole(activeMember) === 'admin' || getMemberPortalRole(activeMember) === 'super_admin'
                          ? 'info'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {getMemberPortalRole(activeMember) === 'admin' || getMemberPortalRole(activeMember) === 'super_admin'
                        ? 'Admin'
                        : 'Member'}
                    </Badge>
                  )}
                </div>
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

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {getMemberPortalRole(activeMember) && getMemberPortalRole(activeMember) !== 'super_admin' && activeMember.userId !== firebaseUser?.uid && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const isMemberAdmin =
                      getMemberPortalRole(activeMember) === 'admin' ||
                      getMemberPortalRole(activeMember) === 'super_admin';
                    setIsDetailModalOpen(false);
                    setRoleConfirmTarget({
                      member: activeMember,
                      nextRole: isMemberAdmin ? 'member' : 'admin'
                    });
                  }}
                >
                  {getMemberPortalRole(activeMember) === 'admin' || getMemberPortalRole(activeMember) === 'super_admin'
                    ? 'Revoke Admin'
                    : 'Make Admin'}
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM ROLE CHANGE MODAL */}
      {roleConfirmTarget && (
        <Modal
          isOpen={!!roleConfirmTarget}
          onClose={() => !updatingRole && setRoleConfirmTarget(null)}
          title={roleConfirmTarget.nextRole === 'admin' ? 'Grant Admin Privileges' : 'Revoke Admin Privileges'}
          maxWidth="sm"
        >
          <div className="space-y-4 text-left">
            <p className="text-xs text-slate-600 leading-relaxed">
              {roleConfirmTarget.nextRole === 'admin' ? (
                <>
                  Are you sure you want to promote <strong className="text-slate-900">{roleConfirmTarget.member.fullName}</strong> ({roleConfirmTarget.member.email}) to <strong className="text-emerald-700">Admin</strong>? They will gain full access to the Admin Dashboard and church operations.
                </>
              ) : (
                <>
                  Are you sure you want to change <strong className="text-slate-900">{roleConfirmTarget.member.fullName}</strong> ({roleConfirmTarget.member.email}) back to <strong className="text-slate-900">Member</strong>? They will no longer be able to access the Admin Dashboard.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={updatingRole}
                onClick={() => setRoleConfirmTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={roleConfirmTarget.nextRole === 'admin' ? 'primary' : 'danger'}
                size="sm"
                loading={updatingRole}
                onClick={handleConfirmRoleChange}
              >
                {roleConfirmTarget.nextRole === 'admin' ? 'Confirm Make Admin' : 'Confirm Revoke Admin'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
