import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  increment 
} from 'firebase/firestore';
import { isCheckInWindowActive, formatTime12Hour } from '../lib/utils';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// Initialize Google Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

// Helper to check user role from Firestore
async function getUserRole(userId: string): Promise<{ role: string; email: string }> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return { role: data.role || 'member', email: data.email || '' };
    }
    return { role: 'member', email: '' };
  } catch {
    return { role: 'member', email: '' };
  }
}

// -------------------------------------------------------------
// 1. SECURE QR / MANUAL ATTENDANCE VERIFICATION ENDPOINT
// -------------------------------------------------------------
apiRouter.post('/check-in/verify', async (req: Request, res: Response) => {
  try {
    const { userId, qrToken, eventId, overrideWindow } = req.body;

    if (!userId || (!qrToken && !eventId)) {
      return res.status(400).json({ error: 'Missing required check-in parameters.' });
    }

    // 1. Fetch User & Member Profile
    const memberQuery = query(collection(db, 'members'), where('userId', '==', userId));
    const memberSnap = await getDocs(memberQuery);
    
    if (memberSnap.empty) {
      return res.status(404).json({ error: 'Member profile not found. Please complete your registration.' });
    }

    const memberDoc = memberSnap.docs[0];
    const member = memberDoc.data();

    if (member.status === 'suspended') {
      return res.status(403).json({ error: 'Your membership is currently inactive or suspended. Please contact the church office.' });
    }

    // 2. Identify Event
    let targetEventId = eventId;
    let eventData: any = null;

    if (qrToken) {
      // Find event by token directly or through checkInSessions
      const eventsSnap = await getDocs(query(collection(db, 'events'), where('qrSessionToken', '==', qrToken)));
      if (!eventsSnap.empty) {
        const evDoc = eventsSnap.docs[0];
        targetEventId = evDoc.id;
        eventData = evDoc.data();
      } else {
        // Check checkInSessions collection
        const sessionSnap = await getDocs(query(collection(db, 'checkInSessions'), where('token', '==', qrToken)));
        if (!sessionSnap.empty) {
          const session = sessionSnap.docs[0].data();
          if (session.status !== 'active') {
            return res.status(400).json({ error: 'This QR check-in session has expired or is closed.' });
          }
          if (new Date(session.expiresAt).getTime() < Date.now()) {
            return res.status(400).json({ error: 'This QR check-in code has expired.' });
          }
          targetEventId = session.eventId;
          const evDoc = await getDoc(doc(db, 'events', targetEventId));
          if (evDoc.exists()) {
            eventData = evDoc.data();
          }
        }
      }
    } else if (eventId) {
      const evDoc = await getDoc(doc(db, 'events', eventId));
      if (evDoc.exists()) {
        eventData = evDoc.data();
      }
    }

    if (!eventData) {
      return res.status(404).json({ error: 'Invalid QR code or church activity not found.' });
    }

    // 3. Validate Event Status
    if (eventData.status === 'cancelled') {
      return res.status(400).json({ error: 'This church activity has been cancelled.' });
    }

    // 4. Validate Check-in Window (unless admin override)
    if (!overrideWindow) {
      const windowCheck = isCheckInWindowActive(eventData);
      if (!windowCheck.isOpen) {
        return res.status(400).json({ error: windowCheck.message });
      }
    }

    // 5. Prevent Duplicate Check-In
    const dupQuery = query(
      collection(db, 'attendance'),
      where('eventId', '==', targetEventId),
      where('memberId', '==', memberDoc.id)
    );
    const dupSnap = await getDocs(dupQuery);

    if (!dupSnap.empty) {
      const existing = dupSnap.docs[0].data();
      return res.status(200).json({
        alreadyCheckedIn: true,
        message: "You're already checked in.",
        checkInTime: existing.checkInTimeFormatted || formatTime12Hour(existing.checkInTime),
        record: existing
      });
    }

    // 6. Create Attendance Record
    const now = new Date();
    const attendanceId = `att_${targetEventId}_${memberDoc.id}`;
    const formattedTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    const attendanceRecord = {
      id: attendanceId,
      eventId: targetEventId,
      eventTitle: eventData.title,
      eventDate: eventData.date,
      memberId: memberDoc.id,
      memberName: member.fullName || `${member.firstName} ${member.lastName}`,
      membershipNumber: member.membershipNumber,
      departmentName: member.departmentName || '',
      groupName: member.groupName || '',
      checkInTime: now.toISOString(),
      checkInTimeFormatted: formattedTime,
      method: qrToken ? 'qr' : 'manual',
      status: 'present',
      verifiedBy: qrToken ? 'system_qr' : (req.body.adminName || 'Admin'),
      notes: req.body.notes || '',
      createdAt: now.toISOString()
    };

    await setDoc(doc(db, 'attendance', attendanceId), attendanceRecord);

    // Update event attendee count
    try {
      await updateDoc(doc(db, 'events', targetEventId), {
        attendeesCount: increment(1)
      });
    } catch (e) {
      console.warn('Could not increment attendee count:', e);
    }

    // Create Notification for the member
    try {
      const notifId = `notif_${Date.now()}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: userId,
        title: 'Attendance Confirmed',
        message: `Your attendance for "${eventData.title}" was recorded at ${formattedTime}.`,
        type: 'attendance',
        read: false,
        createdAt: now.toISOString()
      });
    } catch (e) {
      console.warn('Could not create notification:', e);
    }

    return res.status(200).json({
      success: true,
      alreadyCheckedIn: false,
      message: 'Check-in successful!',
      checkInTime: formattedTime,
      record: attendanceRecord
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return res.status(500).json({ error: 'We could not complete your check-in. Please try again.' });
  }
});

// -------------------------------------------------------------
// 2. ADMIN REFRESH QR CODE SESSION
// -------------------------------------------------------------
apiRouter.post('/events/refresh-qr', async (req: Request, res: Response) => {
  try {
    const { eventId, adminId, adminName } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'Missing event ID' });
    }

    const { role } = await getUserRole(adminId);
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
    }

    const newToken = `FT-${eventId.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour

    await updateDoc(doc(db, 'events', eventId), {
      qrSessionToken: newToken,
      qrSessionExpiresAt: expiresAt,
      updatedAt: now.toISOString()
    });

    const sessionId = `session-${eventId}`;
    await setDoc(doc(db, 'checkInSessions', sessionId), {
      id: sessionId,
      eventId: eventId,
      token: newToken,
      expiresAt: expiresAt,
      status: 'active',
      openedBy: adminName || 'Admin',
      createdAt: now.toISOString()
    });

    return res.json({ success: true, token: newToken, expiresAt });
  } catch (err) {
    console.error('Refresh QR error:', err);
    return res.status(500).json({ error: 'Failed to refresh QR session.' });
  }
});

// -------------------------------------------------------------
// 3. AI ASSISTANT ENDPOINT (GEMINI 2.5 FLASH WITH RESTRICTED TOOLS)
// -------------------------------------------------------------
apiRouter.post('/ai/assistant', async (req: Request, res: Response) => {
  try {
    const { userId, prompt, chatHistory = [] } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Please provide a message or question.' });
    }

    // 1. Get User Profile & Member Info
    let memberProfile: any = null;
    let userRole = 'member';
    let memberDocId = '';

    if (userId) {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        userRole = userDoc.data().role || 'member';
      }
      const memberQuery = query(collection(db, 'members'), where('userId', '==', userId));
      const memberSnap = await getDocs(memberQuery);
      if (!memberSnap.empty) {
        memberDocId = memberSnap.docs[0].id;
        memberProfile = memberSnap.docs[0].data();
      }
    }

    // 2. Controlled Data Retrieval Functions based on Role
    // Fetch upcoming events
    const eventsSnap = await getDocs(collection(db, 'events'));
    const eventsList = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fetch member attendance records if authenticated
    let myAttendance: any[] = [];
    if (memberDocId) {
      const attQuery = query(collection(db, 'attendance'), where('memberId', '==', memberDocId));
      const attSnap = await getDocs(attQuery);
      myAttendance = attSnap.docs.map(d => d.data());
    }

    // Admin-only stats
    let totalMembersCount = 0;
    let allAttendanceStats: any = null;
    if (userRole === 'admin' || userRole === 'super_admin') {
      const allMembersSnap = await getDocs(collection(db, 'members'));
      totalMembersCount = allMembersSnap.size;

      const allAttSnap = await getDocs(collection(db, 'attendance'));
      allAttendanceStats = {
        totalAttendanceRecords: allAttSnap.size,
        recentCheckIns: allAttSnap.docs.slice(0, 10).map(d => d.data())
      };
    }

    // Build context securely for the LLM
    const systemInstruction = `
You are the FaithTrack Church Assistant for "FaithTrack Cathedral".
You are warm, courteous, spiritually uplifting, clear, and very helpful.
You provide precise answers about church activities, personal attendance, departments, and general church schedules.

CURRENT USER ROLE: "${userRole}"
${memberProfile ? `CURRENT MEMBER NAME: "${memberProfile.fullName || memberProfile.firstName}"
MEMBERSHIP NUMBER: "${memberProfile.membershipNumber}"
DEPARTMENT: "${memberProfile.departmentName || 'Not assigned'}"
GROUP: "${memberProfile.groupName || 'Not assigned'}"` : 'Guest / Unregistered User'}

SECURE CONTEXT DATA AVAILABLE:
- Upcoming Events: ${JSON.stringify(eventsList.map((e: any) => ({
      title: e.title,
      type: e.type,
      date: e.date,
      time: `${e.startTime} - ${e.endTime}`,
      location: e.location,
      checkInTime: `${e.checkInOpenTime} - ${e.checkInCloseTime}`
    })))}
- Member's Attendance Records (${myAttendance.length} total): ${JSON.stringify(myAttendance.map(a => ({
      eventTitle: a.eventTitle,
      date: a.eventDate,
      time: a.checkInTimeFormatted,
      status: a.status
    })))}
${userRole === 'admin' || userRole === 'super_admin' ? `
- ADMIN ONLY STATS:
  Total Members: ${totalMembersCount}
  Total Attendance Logs: ${allAttendanceStats?.totalAttendanceRecords || 0}
` : 'NOTE: Administrative church stats are restricted and not accessible for non-admin members.'}

GUIDELINES:
- Keep answers warm, friendly, concise, and easy to read.
- If a member asks about their attendance (e.g. Digging Deep, Sunday Service, or attendance percentage), calculate it accurately from the provided attendance records.
- If an ordinary member asks for restricted administrative stats (like total church members or financial reports), politely explain that this information is reserved for church leadership.
- Address the user kindly with Christian warmth (e.g., "Peace be with you, John", "God bless you").
`;

    const chatMessages = [
      ...chatHistory.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: chatMessages,
      config: {
        systemInstruction,
        temperature: 0.4,
      }
    });

    const reply = response.text || "I'm here to help you with your church activities, attendance, and announcements!";
    return res.json({ reply });
  } catch (error: any) {
    console.error('AI assistant error:', error);
    return res.status(500).json({
      reply: "Peace be with you! I'm temporarily having trouble reaching the church records. Please try again shortly."
    });
  }
});
