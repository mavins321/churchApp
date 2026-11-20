import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Camera, 
  Sparkles, 
  ArrowRight, 
  Clock 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChurchEvent } from '../../types';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { isCheckInWindowActive, formatTime12Hour } from '../../lib/utils';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEvent?: ChurchEvent | null;
  onCheckInSuccess: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  activeEvent,
  onCheckInSuccess
}) => {
  const { firebaseUser, member } = useAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultState, setResultState] = useState<'idle' | 'success' | 'duplicate' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      setResultState('idle');
      setResultMessage('');
      setTokenInput('');
      if (activeEvent?.qrSessionToken) {
        setTokenInput(activeEvent.qrSessionToken);
      }
    }
  }, [isOpen, activeEvent]);

  const handleVerify = async (tokenToUse?: string) => {
    const token = (tokenToUse || tokenInput).trim();
    if (!firebaseUser?.uid) return;

    setLoading(true);
    setResultMessage('');

    try {
      if (member?.status === 'suspended') {
        setResultState('error');
        setResultMessage('Your membership is currently suspended. Please contact the church office.');
        setLoading(false);
        return;
      }

      let targetEvent: ChurchEvent | null = activeEvent || null;

      if (token) {
        const evSnap = await getDocs(query(collection(db, 'events'), where('qrSessionToken', '==', token)));
        if (!evSnap.empty) {
          targetEvent = { id: evSnap.docs[0].id, ...evSnap.docs[0].data() } as ChurchEvent;
        } else {
          const sessionSnap = await getDocs(query(collection(db, 'checkInSessions'), where('token', '==', token)));
          if (!sessionSnap.empty) {
            const session = sessionSnap.docs[0].data();
            if (session.status !== 'active') {
              setResultState('error');
              setResultMessage('This QR check-in session has expired or is closed.');
              setLoading(false);
              return;
            }
            if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
              setResultState('error');
              setResultMessage('This QR check-in code has expired.');
              setLoading(false);
              return;
            }
            const evDoc = await getDoc(doc(db, 'events', session.eventId));
            if (evDoc.exists()) {
              targetEvent = { id: evDoc.id, ...evDoc.data() } as ChurchEvent;
            }
          }
        }
      }

      if (!targetEvent) {
        setResultState('error');
        setResultMessage('Invalid QR token or church activity not found.');
        setLoading(false);
        return;
      }

      if (targetEvent.status === 'cancelled') {
        setResultState('error');
        setResultMessage('This church activity has been cancelled.');
        setLoading(false);
        return;
      }

      const windowCheck = isCheckInWindowActive(targetEvent);
      if (!windowCheck.isOpen) {
        setResultState('error');
        setResultMessage(windowCheck.message);
        setLoading(false);
        return;
      }

      const memberId = member?.id || `mem_${firebaseUser.uid.substring(0, 10)}`;

      // Check duplicate attendance by userId + eventId
      const dupQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', firebaseUser.uid),
        where('eventId', '==', targetEvent.id)
      );
      const dupSnap = await getDocs(dupQuery);

      if (!dupSnap.empty) {
        const existingData = dupSnap.docs[0].data();
        setResultState('duplicate');
        setResultMessage("You're already checked in.");
        setCheckInTime(
          existingData.checkInTimeFormatted ||
            (existingData.checkInTime ? formatTime12Hour(existingData.checkInTime) : 'Earlier today')
        );
        setEventTitle(targetEvent.title || 'Church Service');
        setLoading(false);
        return;
      }

      const now = new Date();
      const attendanceId = `att_${targetEvent.id}_${memberId}`;
      const formattedTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

      const attendanceRecord = {
        id: attendanceId,
        eventId: targetEvent.id,
        eventTitle: targetEvent.title,
        eventDate: targetEvent.date,
        userId: firebaseUser.uid,
        memberId,
        memberName: member?.fullName || firebaseUser.displayName || 'Church Member',
        membershipNumber: member?.membershipNumber || 'FT-2026-ACTIVE',
        departmentName: member?.departmentName || 'General Congregation',
        groupName: member?.groupName || '',
        checkInTime: now.toISOString(),
        checkInTimeFormatted: formattedTime,
        method: token ? 'qr' : 'manual',
        status: 'present',
        verifiedBy: 'system_qr',
        notes: '',
        createdAt: now.toISOString()
      };

      await setDoc(doc(db, 'attendance', attendanceId), attendanceRecord);

      try {
        const notifId = `notif_att_${targetEvent.id}_${firebaseUser.uid}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: firebaseUser.uid,
          title: 'Attendance Confirmed',
          message: `Your attendance for "${targetEvent.title}" was recorded at ${formattedTime}.`,
          type: 'attendance',
          read: false,
          createdAt: now.toISOString()
        });
      } catch {
        // non-fatal notification write
      }

      setResultState('success');
      setResultMessage('Check-in successful!');
      setCheckInTime(formattedTime);
      setEventTitle(targetEvent.title);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      onCheckInSuccess();
    } catch (fbErr: any) {
      console.error('Attendance check-in error:', fbErr);
      setResultState('error');
      setResultMessage(fbErr.message || 'Unable to complete check-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resultState === 'idle' ? 'Check In to Activity' : undefined}
      maxWidth="sm"
    >
      {/* 1. SUCCESS SCREEN */}
      {resultState === 'success' && (
        <div className="text-center py-4 space-y-5">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Verified Attendance
            </span>
            <h3 className="text-xl font-black text-slate-900 mt-1">
              ✓ CHECK-IN SUCCESSFUL
            </h3>
            <p className="text-base font-semibold text-slate-800 mt-2">
              {eventTitle}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Checked in at <span className="font-semibold text-slate-700">{checkInTime}</span>
            </p>
            <p className="text-xs text-emerald-700 font-medium bg-emerald-50 py-1.5 px-3 rounded-xl mt-3 inline-block">
              You're all set! Have a blessed service.
            </p>
          </div>

          <Button onClick={handleDone} variant="primary" size="lg" className="w-full">
            Done
          </Button>
        </div>
      )}

      {/* 2. DUPLICATE CHECK-IN SCREEN */}
      {resultState === 'duplicate' && (
        <div className="text-center py-4 space-y-5">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900">
              You're already checked in.
            </h3>
            <p className="text-base font-semibold text-slate-800 mt-1">
              {eventTitle}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Checked in at <span className="font-bold text-slate-800">{checkInTime}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Your attendance record was already verified.
            </p>
          </div>

          <Button onClick={handleDone} variant="secondary" size="lg" className="w-full">
            Done
          </Button>
        </div>
      )}

      {/* 3. ERROR SCREEN */}
      {resultState === 'error' && (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Check-In Unavailable
            </h3>
            <p className="text-sm text-rose-600 font-medium mt-2 bg-rose-50 p-3 rounded-2xl border border-rose-200">
              {resultMessage}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => setResultState('idle')} variant="outline" className="flex-1">
              Try Again
            </Button>
            <Button onClick={handleDone} variant="ghost" className="flex-1">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* 4. SCANNER / TOKEN SCREEN */}
      {resultState === 'idle' && (
        <div className="space-y-4">
          {activeEvent && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl text-left">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Target Activity</span>
              <p className="text-sm font-bold text-slate-900">{activeEvent.title}</p>
              <p className="text-xs text-slate-500">{activeEvent.date} • {activeEvent.startTime}</p>
            </div>
          )}

          {/* Scanner Viewfinder Area */}
          <div className="relative bg-slate-900 rounded-3xl p-6 text-center text-white overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[180px]">
            {/* Corner guide brackets */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

            {/* Scanning beam animation */}
            <div className="absolute inset-x-8 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />

            <QrCode className="w-14 h-14 text-emerald-400/70 mb-2" />
            <p className="text-xs font-semibold text-slate-200">
              Point camera at Church Check-in QR
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Or verify with today's activity token below
            </p>
          </div>

          {/* One-Tap Check-In for current event */}
          {activeEvent?.qrSessionToken && (
            <Button
              type="button"
              variant="primary"
              size="lg"
              loading={loading}
              onClick={() => handleVerify(activeEvent.qrSessionToken)}
              className="w-full text-sm font-bold shadow-md shadow-emerald-600/20"
            >
              Check In to {activeEvent.type || 'Service'} Now
            </Button>
          )}

          {/* Manual Token Entry */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <Input
              label="Or Enter Check-in Token"
              placeholder="e.g. FT-SUN-9X28"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="font-mono text-center uppercase tracking-wider"
            />
            <Button
              type="button"
              variant="outline"
              size="md"
              loading={loading}
              onClick={() => handleVerify(tokenInput)}
              className="w-full"
              disabled={!tokenInput.trim()}
            >
              Verify Token
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
