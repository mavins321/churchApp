import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  verifyFirebaseIdToken,
  fsGetDoc,
  fsListCollection,
  fsQueryWhereEqual
} from './firestoreRest';
import { runNotificationCheck, getNotifierStatus } from './backgroundNotifier';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// Initialize Google Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

function extractBearerToken(req: Request): string {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
}

// -------------------------------------------------------------
// 1. AUTHENTICATED AI ASSISTANT ENDPOINT (GEMINI 2.5 FLASH)
// -------------------------------------------------------------
apiRouter.post('/ai/assistant', async (req: Request, res: Response) => {
  try {
    const idToken = extractBearerToken(req);
    if (!idToken) {
      return res.status(401).json({ reply: 'Please sign in with a verified account to use the Church Assistant.' });
    }

    const tokenUser = await verifyFirebaseIdToken(idToken);
    if (!tokenUser.emailVerified) {
      return res.status(403).json({ reply: 'Please verify your email address before accessing the Church Assistant.' });
    }

    const { prompt, chatHistory = [] } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Please provide a message or question.' });
    }

    // 1. Fetch verified User Role & Member Info via Firestore REST (enforces rules)
    const userDoc = await fsGetDoc('users', tokenUser.uid, idToken);
    const userRole: string = userDoc?.role || 'member';
    const accountStatus: string = userDoc?.status || 'active';

    if (accountStatus !== 'active') {
      return res.status(403).json({ reply: 'Your account must be active before accessing church records.' });
    }

    const memberMatches = await fsQueryWhereEqual('members', 'userId', tokenUser.uid, idToken);
    const memberProfile = memberMatches[0] || null;

    // 2. Controlled Data Retrieval based strictly on Firestore-verified Role
    const [eventsList, myAttendance] = await Promise.all([
      fsListCollection('events', idToken),
      fsQueryWhereEqual('attendance', 'userId', tokenUser.uid, idToken)
    ]);

    let totalMembersCount = 0;
    let totalAttendanceRecords = 0;
    if (userRole === 'admin' || userRole === 'super_admin') {
      const [allMembers, allAtt] = await Promise.all([
        fsListCollection('members', idToken),
        fsListCollection('attendance', idToken)
      ]);
      totalMembersCount = allMembers.length;
      totalAttendanceRecords = allAtt.length;
    }

    const systemInstruction = `
You are the FaithTrack Church Assistant for "FaithTrack Cathedral".
You are warm, courteous, spiritually uplifting, clear, and very helpful.
You provide precise answers about church activities, personal attendance, departments, and general church schedules.

CURRENT USER ROLE: "${userRole}"
${memberProfile ? `CURRENT MEMBER NAME: "${memberProfile.fullName || memberProfile.firstName}"
MEMBERSHIP NUMBER: "${memberProfile.membershipNumber}"
DEPARTMENT: "${memberProfile.departmentName || 'Not assigned'}"
GROUP: "${memberProfile.groupName || 'Not assigned'}"` : 'Verified Member'}

SECURE CONTEXT DATA AVAILABLE:
- Upcoming Events: ${JSON.stringify(eventsList.map((e: any) => ({
      title: e.title,
      type: e.type,
      date: e.date,
      time: `${e.startTime} - ${e.endTime}`,
      location: e.location,
      checkInTime: `${e.checkInOpenTime} - ${e.checkInCloseTime}`
    })))}
- Member's Attendance Records (${myAttendance.length} total): ${JSON.stringify(myAttendance.map((a: any) => ({
      eventTitle: a.eventTitle,
      date: a.eventDate,
      time: a.checkInTimeFormatted,
      status: a.status
    })))}
${userRole === 'admin' || userRole === 'super_admin' ? `
- ADMIN ONLY STATS:
  Total Members: ${totalMembersCount}
  Total Attendance Logs: ${totalAttendanceRecords}
` : 'NOTE: Administrative church stats are restricted and not accessible for non-admin members.'}

GUIDELINES:
- Keep answers warm, friendly, concise, and easy to read.
- If a member asks about their attendance (e.g. Digging Deep, Sunday Service, or attendance percentage), calculate it accurately from the provided attendance records.
- If an ordinary member asks for restricted administrative stats (like total church members or financial reports), politely explain that this information is reserved for church leadership.
- Address the user kindly with Christian warmth (e.g., "Peace be with you", "God bless you").
`;

    const chatMessages = [
      ...(Array.isArray(chatHistory) ? chatHistory : []).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(m.content || '') }]
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
        temperature: 0.4
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

// -------------------------------------------------------------
// 2. ADMIN NOTIFICATION DISPATCH & TELEMETRY
// -------------------------------------------------------------
apiRouter.post('/notifications/run-check', async (req: Request, res: Response) => {
  try {
    const idToken = extractBearerToken(req);
    if (!idToken) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const tokenUser = await verifyFirebaseIdToken(idToken);
    if (!tokenUser.emailVerified) {
      return res.status(403).json({ success: false, error: 'Verified email required.' });
    }

    const userDoc = await fsGetDoc('users', tokenUser.uid, idToken);
    const role = userDoc?.role || 'member';
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Administrator privileges required.' });
    }

    const result = await runNotificationCheck(idToken);
    return res.json({ success: true, result });
  } catch (err: any) {
    console.error('Trigger check error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to execute check.' });
  }
});

apiRouter.get('/notifications/status', async (req: Request, res: Response) => {
  try {
    const idToken = extractBearerToken(req);
    if (!idToken) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const tokenUser = await verifyFirebaseIdToken(idToken);
    const userDoc = await fsGetDoc('users', tokenUser.uid, idToken);
    const role = userDoc?.role || 'member';
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }

    return res.json(getNotifierStatus());
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Unauthorized.' });
  }
});
