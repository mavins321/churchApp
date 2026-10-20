import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ChurchSettings } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Settings, Save, Check, Church, Globe, Clock, ShieldCheck } from 'lucide-react';
import { INITIAL_SETTINGS } from '../../lib/seedData';
import { SettingsManagementSkeleton } from '../ui/Skeleton';

export const SettingsManagement: React.FC = () => {
  const [settings, setSettings] = useState<ChurchSettings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) {
          setSettings(snap.data() as ChurchSettings);
        }
      } catch (e) {
        console.error('Error fetching settings:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field: keyof ChurchSettings, val: any) => {
    setSettings(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await updateDoc(doc(db, 'settings', 'general'), {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      setSuccessMsg('Church settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      console.error('Error saving settings:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SettingsManagementSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Church Settings</h1>
        <p className="text-xs text-slate-500">Parish profile, attendance windows, timezone, and check-in parameters</p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Profile */}
        <Card className="p-6 bg-white border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Church className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Parish Identity & Address
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Church / Cathedral Name"
              value={settings.churchName}
              onChange={(e) => handleChange('churchName', e.target.value)}
              required
            />
            <Input
              label="Motto / Tagline"
              value={settings.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
            />
          </div>

          <Input
            label="Cathedral Address"
            value={settings.address}
            onChange={(e) => handleChange('address', e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Contact Phone"
              value={settings.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              required
            />
            <Input
              label="Official Email"
              type="email"
              value={settings.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 outline-none"
              >
                <option value="Africa/Lagos">Africa/Lagos (WAT / GMT+1)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New York (EST/EDT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Attendance & QR Check-In Rules */}
        <Card className="p-6 bg-white border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Attendance & QR Policies
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Check-In Window Opens (Mins Before Start)"
              type="number"
              value={settings.checkInWindowMinutesBefore}
              onChange={(e) => handleChange('checkInWindowMinutesBefore', Number(e.target.value))}
              helperText="Default: 45 minutes before service"
            />
            <Input
              label="Check-In Window Closes (Mins After Start)"
              type="number"
              value={settings.checkInWindowMinutesAfter}
              onChange={(e) => handleChange('checkInWindowMinutesAfter', Number(e.target.value))}
              helperText="Default: 90 minutes after service begins"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="QR Code Session Expiry (Minutes)"
              type="number"
              value={settings.qrSessionExpiryMinutes}
              onChange={(e) => handleChange('qrSessionExpiryMinutes', Number(e.target.value))}
              helperText="Auto-regenerate expiring QR check-in tokens"
            />
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Allow Manual Admin Check-In
              </label>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="allowManual"
                  checked={settings.allowManualCheckIn}
                  onChange={(e) => handleChange('allowManualCheckIn', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="allowManual" className="text-xs text-slate-700 font-medium">
                  Enable authorized ministers to mark manual attendance
                </label>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={saving}
            icon={<Save className="w-4 h-4" />}
          >
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
