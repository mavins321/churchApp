import { ChurchEvent, Member, ActivityRegistration, EmailDispatchRecord } from '../types';
import { formatDateReadable, formatTime12Hour } from '../lib/utils';
import { fsGetDoc, fsListCollection, fsPatchFields, fsSetDoc } from './firestoreRest';

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
  lastRunAt: string | null;
  lastResult: NotificationCheckResult | null;
  totalHistoricalReminders: number;
}

const state: NotifierState = {
  isRunning: false,
  intervalMinutes: 5,
  lastRunAt: null,
  lastResult: null,
  totalHistoricalReminders: 0
};

// In-memory cache for recent dispatched emails for instant admin preview
const recentDispatchedEmails: EmailDispatchRecord[] = [];

function isUpcomingWindow(eventDateStr: string): boolean {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(`${eventDateStr}T00:00:00`);
    const diffMs = eventDate.getTime() - today.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays >= 0 && diffDays <= 2;
  } catch {
    return false;
  }
}

/**
 * Executes the upcoming activity reminder scan using an authenticated Admin ID token
 * so all Firestore reads and writes strictly pass security rules.
 */
export async function runNotificationCheck(adminIdToken: string): Promise<NotificationCheckResult> {
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
    const allEvents = await fsListCollection<ChurchEvent>('events', adminIdToken);
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

    const [allRegistrations, allMembers] = await Promise.all([
      fsListCollection<ActivityRegistration>('activity_registrations', adminIdToken),
      fsListCollection<Member>('members', adminIdToken)
    ]);

    for (const event of upcomingEvents) {
      const eventRegistrations = allRegistrations.filter(
        r => r.eventId === event.id && r.status === 'confirmed'
      );

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

        const existingNotif = await fsGetDoc('notifications', notifId, adminIdToken);
        if (existingNotif) {
          continue;
        }

        const dateReadable = formatDateReadable(event.date);
        const timeReadable = formatTime12Hour(event.startTime);
        const checkInOpen = formatTime12Hour(event.checkInOpenTime);

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

        await fsSetDoc('notifications', notifId, notificationPayload, adminIdToken);

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

        await fsSetDoc('email_dispatches', dispatchId, emailRecord, adminIdToken);
        recentDispatchedEmails.unshift(emailRecord);
        if (recentDispatchedEmails.length > 50) recentDispatchedEmails.pop();

        if (recipient.registrationId) {
          try {
            await fsPatchFields(
              'activity_registrations',
              recipient.registrationId,
              {
                reminderSent: true,
                lastReminderAt: timestamp
              },
              adminIdToken
            );
          } catch {
            // non-fatal
          }
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

    try {
      const logId = `audit_check_${Date.now()}`;
      await fsSetDoc(
        'notification_audit_logs',
        logId,
        {
          id: logId,
          timestamp,
          upcomingEventsFound: result.upcomingEventsFound,
          totalRemindersSent: result.totalRemindersSent,
          totalEmailsDispatched: result.totalEmailsDispatched,
          status: result.status
        },
        adminIdToken
      );
    } catch {
      // non-fatal
    }
  } catch (err: any) {
    console.error('Background notification check error:', err);
    result.status = 'error';
    result.message = err.message || 'Error occurred during background notification check.';
  }

  return result;
}

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
