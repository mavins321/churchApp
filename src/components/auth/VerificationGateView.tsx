import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  MailCheck,
  Clock,
  ShieldAlert,
  RefreshCw,
  Send,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Church
} from 'lucide-react';

export const VerificationGateView: React.FC = () => {
  const {
    firebaseUser,
    emailVerified,
    accountStatus,
    resendVerificationEmail,
    refreshAuthState,
    signOut
  } = useAuth();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setFeedback(null);
    try {
      const result = await refreshAuthState();
      if (!result.emailVerified) {
        setFeedback({
          type: 'info',
          message: 'Your email is not verified yet. Please click the verification link in your inbox (or spam folder), then check again.'
        });
      } else if (result.accountStatus === 'pending') {
        setFeedback({
          type: 'info',
          message: 'Email verified! Your membership account is currently awaiting activation by a Church Administrator.'
        });
      } else if (result.accountStatus === 'suspended') {
        setFeedback({
          type: 'error',
          message: 'Your account is currently suspended. Please contact church administration.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Could not refresh status. Please try again.'
      });
    } finally {
      setChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setFeedback(null);
    try {
      await resendVerificationEmail();
      setCooldown(60);
      setFeedback({
        type: 'success',
        message: `A new verification email has been sent to ${firebaseUser?.email}. Check your inbox and spam folder.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Unable to resend verification email right now.'
      });
    } finally {
      setResending(false);
    }
  };

  const isEmailPending = !emailVerified;
  const isAccountPending = emailVerified && accountStatus === 'pending';
  const isSuspended = accountStatus === 'suspended';

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 bg-slate-50">
      <Card className="w-full max-w-md p-6 sm:p-8 border-slate-200/80 shadow-lg text-center space-y-6">
        <div className="flex items-center justify-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
          <Church className="w-4 h-4" />
          <span>FaithTrack Security Check</span>
        </div>

        {isEmailPending ? (
          <>
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
              <MailCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900">Verify Your Email Address</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                We sent a Firebase verification link to{' '}
                <strong className="text-slate-900">{firebaseUser?.email}</strong>. Please open the link in your email to verify your account before entering the portal.
              </p>
            </div>
          </>
        ) : isAccountPending ? (
          <>
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900">Account Activation Pending</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your email (<strong className="text-slate-900">{firebaseUser?.email}</strong>) is verified! Your membership profile is awaiting activation by a Church Administrator in Member Management.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900">Account Suspended</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your FaithTrack account (<strong className="text-slate-900">{firebaseUser?.email}</strong>) is currently suspended. Please reach out to Church Administration to reactivate your access.
              </p>
            </div>
          </>
        )}

        {feedback && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-medium text-left flex items-start gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : feedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          <Button
            type="button"
            variant="primary"
            size="lg"
            loading={checking}
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleCheckStatus}
            className="w-full"
          >
            {isEmailPending ? "I've Verified My Email" : 'Refresh Activation Status'}
          </Button>

          {isEmailPending && (
            <Button
              type="button"
              variant="outline"
              size="md"
              loading={resending}
              disabled={cooldown > 0}
              icon={<Send className="w-4 h-4" />}
              onClick={handleResendEmail}
              className="w-full"
            >
              {cooldown > 0 ? `Resend Available in ${cooldown}s` : 'Resend Verification Email'}
            </Button>
          )}

          {!isSuspended && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              icon={<LogOut className="w-4 h-4" />}
              onClick={signOut}
              className="w-full text-slate-500"
            >
              Sign Out & Use Another Account
            </Button>
          )}

          {isSuspended && (
            <Button
              type="button"
              variant="outline"
              size="md"
              icon={<LogOut className="w-4 h-4" />}
              onClick={signOut}
              className="w-full"
            >
              Sign Out
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
