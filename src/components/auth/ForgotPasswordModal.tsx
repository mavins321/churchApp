import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Unable to send password reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setEmail('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Password" maxWidth="sm">
      {submitted ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">Check Your Email</h4>
            <p className="text-xs text-slate-500 mt-1">
              We sent a password reset link to <strong className="text-slate-700">{email}</strong>. Please check your inbox and spam folder.
            </p>
          </div>
          <Button onClick={handleClose} variant="primary" className="w-full">
            Return to Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Enter the email address registered with your church account and we'll send you instructions to reset your password.
          </p>

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. member@faithtrack.church"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            error={error}
            autoFocus
          />

          <div className="pt-2 flex flex-col gap-2">
            <Button type="submit" variant="primary" loading={loading} className="w-full">
              Send Reset Instructions
            </Button>
            <Button type="button" variant="ghost" onClick={handleClose} className="w-full">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
