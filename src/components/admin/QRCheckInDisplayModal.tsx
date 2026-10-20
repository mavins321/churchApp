import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ChurchEvent } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  QrCode, 
  RefreshCw, 
  PowerOff, 
  CheckCircle2, 
  Clock, 
  Users, 
  ShieldAlert 
} from 'lucide-react';
import { formatTime12Hour, formatDateReadable } from '../../lib/utils';

interface QRCheckInDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ChurchEvent | null;
  onRefreshSuccess?: () => void;
}

export const QRCheckInDisplayModal: React.FC<QRCheckInDisplayModalProps> = ({
  isOpen,
  onClose,
  event,
  onRefreshSuccess
}) => {
  const { firebaseUser, userProfile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [token, setToken] = useState(event?.qrSessionToken || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (event?.qrSessionToken) {
      setToken(event.qrSessionToken);
    }
  }, [event]);

  useEffect(() => {
    if (isOpen && canvasRef.current && token) {
      QRCode.toCanvas(
        canvasRef.current,
        token,
        {
          width: 260,
          margin: 2,
          color: {
            dark: '#064e3b',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [isOpen, token]);

  const handleRefresh = async () => {
    if (!event?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/events/refresh-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          adminId: firebaseUser?.uid,
          adminName: userProfile?.displayName || 'Church Admin'
        })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        if (onRefreshSuccess) onRefreshSuccess();
      }
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!event) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance Check-In Screen"
      maxWidth="md"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Activity header */}
        <div className="w-full bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
            {event.type}
          </span>
          <h3 className="text-xl font-black text-slate-900 mt-0.5">
            {event.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {formatDateReadable(event.date)} • {event.location}
          </p>
        </div>

        {/* Big QR Code Canvas */}
        <div className="p-5 bg-white border-2 border-emerald-500/30 rounded-3xl shadow-xl flex flex-col items-center">
          <canvas ref={canvasRef} className="rounded-xl shadow-xs" />
          <p className="text-xs font-bold text-slate-800 mt-3 font-mono tracking-wider bg-slate-100 px-3 py-1 rounded-lg">
            CODE: {token}
          </p>
          <button
            onClick={handleCopy}
            className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold mt-1"
          >
            {copied ? '✓ Token copied to clipboard' : 'Click to copy token'}
          </button>
        </div>

        {/* Session Status Bar */}
        <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">STATUS: ACTIVE</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-emerald-800">
            <Clock className="w-3.5 h-3.5" />
            <span>Valid: {formatTime12Hour(event.checkInOpenTime)} – {formatTime12Hour(event.checkInCloseTime)}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 max-w-sm">
          Display this screen on the church auditorium projection screens or check-in tablets. Members scan with the FaithTrack app to record verified attendance.
        </p>

        {/* Action Controls */}
        <div className="w-full grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh QR Token
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onClose}
          >
            Close Display
          </Button>
        </div>
      </div>
    </Modal>
  );
};
