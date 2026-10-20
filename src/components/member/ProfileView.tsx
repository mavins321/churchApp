import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { DigitalCardModal } from './DigitalCardModal';
import { 
  User, 
  CreditCard, 
  Phone, 
  Mail, 
  MapPin, 
  Church, 
  Calendar, 
  Check, 
  Edit3,
  ShieldCheck
} from 'lucide-react';
import { INITIAL_DEPARTMENTS, INITIAL_GROUPS } from '../../lib/seedData';
import { ProfileViewSkeleton } from '../ui/Skeleton';

export const ProfileView: React.FC = () => {
  const { member, updateMemberProfile } = useAuth();
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editable fields
  const [phone, setPhone] = useState(member?.phone || '');
  const [address, setAddress] = useState(member?.address || '');
  const [city, setCity] = useState(member?.city || '');
  const [state, setState] = useState(member?.state || '');
  const [departmentName, setDepartmentName] = useState(member?.departmentName || 'Choir & Worship');
  const [groupName, setGroupName] = useState(member?.groupName || 'Grace Cell Fellowship');
  const [occupation, setOccupation] = useState(member?.occupation || '');
  const [emergencyName, setEmergencyName] = useState(member?.emergencyName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(member?.emergencyPhone || '');
  const [photoUrl, setPhotoUrl] = useState(member?.photoUrl || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateMemberProfile({
        phone,
        address,
        city,
        state,
        departmentName,
        groupName,
        occupation,
        emergencyName,
        emergencyPhone,
        photoUrl
      });
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!member) {
    return <ProfileViewSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-6xl mx-auto">
      {/* Header Profile Card */}
      <Card className="p-6 sm:p-8 bg-white border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative">
              <Avatar name={member.fullName} photoUrl={photoUrl || member.photoUrl} size="xl" />
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white text-[10px]">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {member.fullName}
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {member.status === 'active' ? 'Active' : 'Suspended'}
                </span>
              </div>
              <p className="text-sm font-semibold text-emerald-700 mt-0.5">
                {member.departmentName || 'General Assembly'} • {member.groupName || 'Grace Cell'}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-1">
                ID: {member.membershipNumber}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<CreditCard className="w-4 h-4" />}
              onClick={() => setIsCardModalOpen(true)}
              className="w-full sm:w-auto text-xs"
            >
              Digital Membership Card
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              icon={<Edit3 className="w-4 h-4" />}
              onClick={() => setIsEditing(!isEditing)}
              className="w-full sm:w-auto text-xs"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800">
            {errorMsg}
          </div>
        )}

        {/* Profile Details or Edit Form */}
        {!isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 bg-slate-50/70 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
              <p className="text-sm font-bold text-slate-800">{member.phone}</p>
            </div>

            <div className="p-4 bg-slate-50/70 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
              <p className="text-sm font-bold text-slate-800">{member.email}</p>
            </div>

            <div className="p-4 bg-slate-50/70 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address</span>
              <p className="text-sm font-bold text-slate-800">{member.address}, {member.city}, {member.state}</p>
            </div>

            <div className="p-4 bg-slate-50/70 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Membership Date</span>
              <p className="text-sm font-bold text-slate-800">{member.membershipDate}</p>
            </div>

            <div className="p-4 bg-slate-50/70 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Contact</span>
              <p className="text-sm font-bold text-slate-800">{member.emergencyName} ({member.emergencyPhone})</p>
            </div>

            <div className="p-4 bg-slate-50/70 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Occupation / Talents</span>
              <p className="text-sm font-bold text-slate-800">{member.occupation || 'Member of FaithTrack'}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Input
                label="Avatar Image URL (Optional)"
                placeholder="https://..."
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </div>

            <Input
              label="Residential Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <Input
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Department
                </label>
                <select
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15 outline-none"
                >
                  {INITIAL_DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  <option value="General Congregation">General Congregation</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Fellowship / Cell Group
                </label>
                <select
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15 outline-none"
                >
                  {INITIAL_GROUPS.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Emergency Contact Name"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                required
              />
              <Input
                label="Emergency Contact Phone"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Card>

      <DigitalCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        member={member}
      />
    </div>
  );
};
