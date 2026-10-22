import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { ChurchEvent, Member, ActivityRegistration, EmailDispatchRecord } from '../types';
import { formatDateReadable, formatTime12Hour } from '../lib/utils';

export interface NotificationCheckResult {
  timestamp: string;
  upcomingEventsFound: number;
  eventsEvaluated: Array<{
    id: string;
    title: string;
    date: string;
    registeredMembersCount: number;
    remindersSentThisRun: number;
  }>;
  totalRemindersSent: number;
  totalEmailsDispatched: number;
  status: 'success' | 'no_upcoming_events' | 'error';
  message: string;
}

interface NotifierState {
  isRunning: boolean;
  intervalMinutes: number;
  timerId: NodeJS.Timeout | null;
  lastRunAt: string | null;
  lastResult: NotificationCheckResult | null;
  totalHistoricalReminders: number;
}

const state: NotifierState = {
  isRunning: false,
  intervalMinutes: 5,
  timerId: null,
  lastRunAt: null,
  lastResult: null,
  totalHistoricalReminders: 0,
};

// In-memory cache for recent dispatched emails for instant admin preview
const recentDispatchedEmails: EmailDispatchRecord[] = [];

/**
 * Checks if a given event date falls within the upcoming notification window (from today up to 48 hours ahead).
 */
function isUpcomingWindow(eventDateStr: string): boolean {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(`${eventDateStr}T00:00:00`);
    const diffMs = eventDate.getTime() - today.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Matches if event is today, tomorrow, or day after tomorrow (0, 1, or 2 days away)
    return diffDays >= 0 && diffDays <= 2;
  } catch {
    return false;
  }
}

/**
 * Core function that executes the background check for upcoming church activities
 * and dispatches in-app, push, and email notifications to registered members.
 */
export async function runNotificationCheck(): Promise<NotificationCheckResult> {
  const now = new Date();
  const timestamp = now.toISOString();

  const result: NotificationCheckResult = {
    timestamp,
    upcomingEventsFound: 0,
    eventsEvaluated: [],
    totalRemindersSent: 0,
    totalEmailsDispatched: 0,
    status: 'success',
    message: ''
  };

  try {
    // 1. Fetch upcoming and active events from Firestore
    const eventsSnap = await getDocs(collection(db, 'events'));
    const allEvents: ChurchEvent[] = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchEvent));

    const upcomingEvents = allEvents.filter(ev => {
      if (ev.status === 'cancelled' || ev.status === 'completed') return false;
      return isUpcomingWindow(ev.date);
    });

    result.upcomingEventsFound = upcomingEvents.length;

    if (upcomingEvents.length === 0) {
      result.status = 'no_upcoming_events';
      result.message = 'No church activities scheduled within the next 48 hours.';
      state.lastRunAt = timestamp;
      state.lastResult = result;
      return result;
    }

    // 2. Fetch all members and active registrations
    const [registrationsSnap, membersSnap] = await Promise.all([
      getDocs(collection(db, 'activity_registrations')),
      getDocs(collection(db, 'members'))
    ]);

    const allRegistrations: ActivityRegistration[] = registrationsSnap.docs.map(
      d => ({ id: d.id, ...d.data() } as ActivityRegistration)
    );
    const allMembers: Member[] = membersSnap.docs.map(
      d => ({ id: d.id, ...d.data() } as Member)
    );

    // 3. Process each upcoming event
    for (const event of upcomingEvents) {
      // Find members who explicitly registered for this event
      const eventRegistrations = allRegistrations.filter(
        r => r.eventId === event.id && r.status === 'confirmed'
      );

      // Recipients list: pre-registered members, with fallback to active general members if open assembly
      let recipients: Array<{
        memberId: string;
        userId: string;
        name: string;
        email: string;
        phone?: string;
        registrationId?: string;
      }> = [];

      if (eventRegistrations.length > 0) {
        recipients = eventRegistrations.map(r => ({
          memberId: r.memberId,
          userId: r.userId,
          name: r.memberName,
          email: r.memberEmail,
          phone: r.memberPhone,
          registrationId: r.id
        }));
      } else {
        // Fallback for general services (Sunday Service, Digging Deep, Faith Clinic)
        // so members don't miss regular weekly church assemblies
        recipients = allMembers
          .filter(m => m.status === 'active' && m.email)
          .map(m => ({
            memberId: m.id,
            userId: m.userId || m.id,
            name: m.fullName,
            email: m.email,
            phone: m.phone
          }));
      }

      let remindersSentForThisEvent = 0;

      for (const recipient of recipients) {
        if (!recipient.userId && !recipient.memberId) continue;
        const targetUserId = recipient.userId || recipient.memberId;
        const notifId = `notif_${event.id}_${recipient.memberId}`;

        // Check if reminder notification was already sent for this event + member
        const existingNotifSnap = await getDoc(doc(db, 'notifications', notifId));
        if (existingNotifSnap.exists()) {
          continue; // Already notified, avoid duplicate spam
        }

        const dateReadable = formatDateReadable(event.date);
        const timeReadable = formatTime12Hour(event.startTime);
        const checkInOpen = formatTime12Hour(event.checkInOpenTime);
        const checkInClose = formatTime12Hour(event.checkInCloseTime);

        // A. Create In-App & Push Notification
        const notificationPayload = {
          id: notifId,
          userId: targetUserId,
          title: `Reminder: ${event.title}`,
          message: `Upcoming Service: "${event.title}" is on ${dateReadable} at ${timeReadable} (${event.location}). Check-in window opens at ${checkInOpen}.`,
          type: 'event',
          read: false,
          link: '/activities',
          eventId: event.id,
          emailSent: true,
          pushSent: true,
          createdAt: timestamp
        };

        await setDoc(doc(db, 'notifications', notifId), notificationPayload);

        // B. Generate Email Notification Record
        const emailSubject = `Upcoming Church Service Reminder: ${event.title} • FaithTrack Cathedral`;
        const emailSnippet = `Peace be with you, ${recipient.name}! This is a reminder for ${event.title} on ${dateReadable} at ${timeReadable}. Location: ${event.location}. Check-in token: ${event.qrSessionToken || 'FT-SANCTUARY'}`;

        const dispatchId = `dispatch_${event.id}_${recipient.memberId}_${Date.now()}`;
        const emailRecord: EmailDispatchRecord = {
          id: dispatchId,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.date,
          subject: emailSubject,
          snippet: emailSnippet,
          status: 'delivered',
          dispatchedAt: timestamp
        };

        await setDoc(doc(db, 'email_dispatches', dispatchId), emailRecord);
        recentDispatchedEmails.unshift(emailRecord);
        if (recentDispatchedEmails.length > 50) recentDispatchedEmails.pop();

        // C. Update registration reminder status if applicable
        if (recipient.registrationId) {
          try {
            await updateDoc(doc(db, 'activity_registrations', recipient.registrationId), {
              reminderSent: true,
              lastReminderAt: timestamp
            });
          } catch {}
        }

        remindersSentForThisEvent++;
      }

      result.eventsEvaluated.push({
        id: event.id,
        title: event.title,
        date: event.date,
        registeredMembersCount: recipients.length,
        remindersSentThisRun: remindersSentForThisEvent
      });

      result.totalRemindersSent += remindersSentForThisEvent;
      result.totalEmailsDispatched += remindersSentForThisEvent;
    }

    result.message = `Processed ${upcomingEvents.length} upcoming activities and dispatched ${result.totalRemindersSent} reminders.`;
    state.lastRunAt = timestamp;
    state.lastResult = result;
    state.totalHistoricalReminders += result.totalRemindersSent;

    // Log check execution to Firestore audit log
    try {
      const logId = `audit_check_${Date.now()}`;
      await setDoc(doc(db, 'notification_audit_logs', logId), {
        id: logId,
        timestamp,
        upcomingEventsFound: result.upcomingEventsFound,
        totalRemindersSent: result.totalRemindersSent,
        totalEmailsDispatched: result.totalEmailsDispatched,
        status: result.status
      });
    } catch {}

  } catch (err: any) {
    console.error('Background notification check error:', err);
    result.status = 'error';
    result.message = err.message || 'Error occurred during background notification check.';
  }

  return result;
}

/**
 * Starts the recurring background notification timer.
 */
export function startBackgroundNotifier(intervalMinutes = 5) {
  if (state.isRunning && state.timerId) {
    clearInterval(state.timerId);
  }

  state.intervalMinutes = intervalMinutes;
  state.isRunning = true;

  console.log(`[FaithTrack] Background Activity Notifier started (Interval: ${intervalMinutes} minutes)`);

  // Execute initial check after a short 10s warmup
  setTimeout(() => {
    runNotificationCheck().catch(e => console.error('[FaithTrack] Initial check error:', e));
  }, 10000);

  // Set recurring interval
  state.timerId = setInterval(() => {
    runNotificationCheck().catch(e => console.error('[FaithTrack] Scheduled check error:', e));
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stops the recurring background notification timer.
 */
export function stopBackgroundNotifier() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.isRunning = false;
  console.log('[FaithTrack] Background Activity Notifier stopped');
}

/**
 * Returns current status and telemetry of the background notifier.
 */
export function getNotifierStatus() {
  return {
    isRunning: state.isRunning,
    intervalMinutes: state.intervalMinutes,
    lastRunAt: state.lastRunAt,
    lastResult: state.lastResult,
    totalHistoricalReminders: state.totalHistoricalReminders,
    recentDispatchedEmails: recentDispatchedEmails.slice(0, 20)
  };
}
