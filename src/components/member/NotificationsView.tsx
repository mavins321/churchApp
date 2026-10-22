import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { ChurchNotification } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Bell, CheckCheck, Clock, CheckCircle2, Megaphone, Calendar, Mail, BellRing, RefreshCw } from 'lucide-react';
import { formatTime12Hour, formatDateReadable } from '../../lib/utils';
import { NotificationsViewSkeleton } from '../ui/Skeleton';

export const NotificationsView: React.FC = () => {
  const { firebaseUser } = useAuth();
  const [notifications, setNotifications] = useState<ChurchNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPushStatus(Notification.permission);
    }
  }, []);

  const handleRequestPush = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setPushStatus(perm);
      if (perm === 'granted') {
        new Notification('FaithTrack Cathedral Alerts Enabled', {
          body: 'You will receive proactive reminders for registered upcoming services.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  const fetchNotifications = async () => {
    if (!firebaseUser?.uid) return;
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', firebaseUser.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchNotification));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setNotifications(list);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [firebaseUser?.uid]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const handleMarkAllRead = async () => {
    if (!firebaseUser?.uid) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <NotificationsViewSkeleton />;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'attendance':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-indigo-600" />;
      default:
        return <Calendar className="w-5 h-5 text-teal-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification Center</h1>
          <p className="text-xs text-slate-500">Service reminders, attendance receipts, and announcements</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            icon={<RefreshCw className="w-3.5 h-3.5 text-slate-600" />}
          >
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              icon={<CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Push Notification Banner */}
      {pushStatus !== 'granted' && typeof Notification !== 'undefined' && (
        <Card className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Enable Instant Push Notifications</p>
              <p className="text-slate-600 text-[11px]">Receive proactive alerts on your device for registered upcoming services.</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRequestPush}
            className="shrink-0 self-start sm:self-auto font-bold text-xs"
          >
            Enable Browser Push
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        {notifications.map((notif) => (
          <Card
            key={notif.id}
            onClick={() => !notif.read && handleMarkAsRead(notif.id)}
            className={`p-4 sm:p-5 bg-white border transition-all cursor-pointer flex items-start gap-4 ${
              notif.read ? 'border-slate-200/70 opacity-80' : 'border-emerald-300 bg-emerald-50/20 shadow-xs'
            }`}
          >
            <div className="p-2.5 rounded-2xl bg-slate-50 shrink-0">
              {getIcon(notif.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {formatTime12Hour(notif.createdAt)}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>

              {/* Delivery Receipt Badges */}
              {(notif.emailSent || notif.pushSent) && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100/60">
                  {notif.emailSent && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                      <Mail className="w-3 h-3 text-teal-600" />
                      Email Dispatched
                    </span>
                  )}
                  {notif.pushSent && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      <Bell className="w-3 h-3 text-indigo-600" />
                      Push Alert Sent
                    </span>
                  )}
                </div>
              )}
            </div>

            {!notif.read && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 mt-2" />
            )}
          </Card>
        ))}

        {notifications.length === 0 && !loading && (
          <Card className="p-12 text-center border-dashed border-slate-200">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCheck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">You're all caught up! 🎉</h3>
            <p className="text-xs text-slate-400 mt-1">No unread notifications at this time.</p>
          </Card>
        )}
      </div>
    </div>
  );
};
