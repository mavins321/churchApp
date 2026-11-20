import React, { useState } from 'react';
import { useAuth, PortalLoginMode } from '../../contexts/AuthContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { Mail, Lock, Eye, EyeOff, Church, ShieldCheck, User } from 'lucide-react';

interface LoginViewProps {
  onSwitchToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister }) => {
  const { signIn } = useAuth();
  const [loginMode, setLoginMode] = useState<PortalLoginMode>('member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleModeSwitch = (mode: PortalLoginMode) => {
    setLoginMode(mode);
    setError('');
  };

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
      await signIn(email.trim(), password, loginMode);
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6 sm:p-8 border-slate-200/80 shadow-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20 mb-3">
            <Church className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">FAITHTRACK</h1>
          <p className="text-xs font-medium text-emerald-700 tracking-wide uppercase mt-0.5">
            Church Member & Attendance Platform
          </p>
        </div>

        {/* Portal Sign-In Selector: Member vs Admin */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5 border border-slate-200/70">
          <button
            type="button"
            onClick={() => handleModeSwitch('member')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              loginMode === 'member'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Member Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('admin')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              loginMode === 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Sign In</span>
          </button>
        </div>

        <p className="text-xs text-center text-slate-500 mb-5">
          {loginMode === 'admin'
            ? 'Authorized church administrators only. Roles are verified through Firebase.'
            : 'Welcome home! Sign in to access activities, attendance, and prayer wall.'}
        </p>

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
            placeholder="e.g. name@example.com"
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
            variant={loginMode === 'admin' ? 'secondary' : 'primary'}
            size="lg"
            loading={loading}
            className="w-full mt-2"
          >
            {loginMode === 'admin' ? 'Sign In to Admin Portal' : 'Sign In as Member'}
          </Button>
        </form>

        {/* Register Prompt */}
        <div className="mt-6 text-center text-sm text-slate-500">
          {loginMode === 'member' ? (
            <>
              New to FaithTrack?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-0.5"
              >
                Register as Member
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400">
              All new registrations create Member accounts. Existing Admins can grant Admin access in Member Management.
            </span>
          )}
        </div>
      </Card>

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
      />
    </div>
  );
};
