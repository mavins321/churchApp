import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { Mail, Lock, Eye, EyeOff, Church, ShieldCheck, UserCheck } from 'lucide-react';

interface LoginViewProps {
  onSwitchToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister }) => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Access for instant testing
  const handleQuickDemo = async (role: 'member' | 'admin') => {
    setError('');
    setLoading(true);
    const demoEmail = role === 'admin' ? 'admin@faithtrack.church' : 'john.adebayo@faithtrack.church';
    const demoPass = 'FaithTrack2026!';

    try {
      // Try login first
      await signIn(demoEmail, demoPass);
    } catch {
      // If not yet created in this Firebase project, auto-register demo account
      try {
        await signUp({
          email: demoEmail,
          password: demoPass,
          firstName: role === 'admin' ? 'Pastor' : 'John',
          lastName: role === 'admin' ? 'Administrator' : 'Adebayo',
          phone: '+234 802 345 6789',
          gender: 'Male',
          dateOfBirth: '1990-05-14',
          address: '14 Grace Cathedral Way',
          city: 'Ikeja',
          state: 'Lagos',
          country: 'Nigeria',
          departmentName: role === 'admin' ? 'Pastoral & Admin' : 'Choir & Worship',
          groupName: 'Grace Cell Fellowship',
          emergencyName: 'Mary Adebayo',
          emergencyPhone: '+234 803 987 6543'
        });
      } catch (regErr: any) {
        setError(regErr.message || 'Could not launch demo account. Please try manual registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6 sm:p-8 border-slate-200/80 shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20 mb-3">
            <Church className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">FAITHTRACK</h1>
          <p className="text-xs font-medium text-emerald-700 tracking-wide uppercase mt-0.5">
            Church Member & Attendance Platform
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Welcome home! Sign in to access activities and attendance.
          </p>
        </div>

        {/* Demo Fast Login Bar */}
        <div className="mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Instant Demo Sign In
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<UserCheck className="w-4 h-4 text-emerald-600" />}
              onClick={() => handleQuickDemo('member')}
              disabled={loading}
              className="text-xs py-2"
            >
              Member Demo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<ShieldCheck className="w-4 h-4 text-slate-700" />}
              onClick={() => handleQuickDemo('admin')}
              disabled={loading}
              className="text-xs py-2"
            >
              Admin Demo
            </Button>
          </div>
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="shrink mx-3 text-xs text-slate-400 font-medium">or continue with email</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-medium text-rose-700 flex items-start gap-2">
            <span className="shrink-0 font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. john.adebayo@faithtrack.church"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoComplete="email"
          />

          <div className="space-y-1">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
              autoComplete="current-password"
            />
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full mt-2"
          >
            Sign In
          </Button>
        </form>

        {/* Register Prompt */}
        <div className="mt-6 text-center text-sm text-slate-500">
          New to FaithTrack?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-0.5"
          >
            Register Here
          </button>
        </div>
      </Card>

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
      />
    </div>
  );
};
