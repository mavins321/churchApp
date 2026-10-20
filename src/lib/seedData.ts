import { collection, getDocs, doc, setDoc, query, limit } from 'firebase/firestore';
import { db } from './firebase';
import { ChurchEvent, Department, ChurchGroup, Announcement, ChurchSettings } from '../types';

export const INITIAL_SETTINGS: ChurchSettings = {
  id: 'general',
  churchName: 'FaithTrack Cathedral',
  tagline: 'Growing Together in Faith, Love, and Fellowship',
  address: 'Plot 14 Grace Sanctuary Way, Ikeja, Lagos, Nigeria',
  phone: '+234 803 123 4567',
  email: 'info@faithtrack.church',
  timezone: 'Africa/Lagos',
  checkInWindowMinutesBefore: 45,
  checkInWindowMinutesAfter: 90,
  qrSessionExpiryMinutes: 60,
  allowManualCheckIn: true,
  welcomeMessage: 'Welcome to FaithTrack! You are blessed and highly favoured.'
};

export const INITIAL_DEPARTMENTS: Omit<Department, 'createdAt'>[] = [
  { id: 'dept-choir', name: 'Choir & Worship', description: 'Leading the congregation in vibrant praises and heartfelt worship.', active: true, memberCount: 42, leaderName: 'Bro. Emmanuel David' },
  { id: 'dept-media', name: 'Media & Technical', description: 'Audio-visual broadcast, live streaming, photography, and sound engineering.', active: true, memberCount: 28, leaderName: 'Sis. Grace Obi' },
  { id: 'dept-ushering', name: 'Ushering & Protocol', description: 'Welcoming worshippers, coordinating seating, and maintaining orderliness.', active: true, memberCount: 35, leaderName: 'Bro. Peter Adeyemi' },
  { id: 'dept-youth', name: 'Youth & Young Adults', description: 'Empowering young minds for spiritual, academic, and leadership excellence.', active: true, memberCount: 68, leaderName: 'Pastor Tolu Bakare' },
  { id: 'dept-protocol', name: 'Protocol & Hospitality', description: 'Guest minister reception, church leadership welfare, and hospitality.', active: true, memberCount: 19, leaderName: 'Sis. Blessing Okon' },
  { id: 'dept-prayer', name: 'Intercessory Prayer Band', description: 'Standing in the gap through regular prayers and spiritual warfare.', active: true, memberCount: 24, leaderName: 'Elder Samuel Johnson' }
];

export const INITIAL_GROUPS: Omit<ChurchGroup, 'createdAt'>[] = [
  { id: 'grp-grace-cell', name: 'Grace Cell Fellowship', description: 'Ikeja & Maryland district midweek fellowship and care network.', type: 'Cell', meetingDay: 'Wednesday 6:00 PM', leaderName: 'Bro. & Sis. Adeleke', active: true, memberCount: 26 },
  { id: 'grp-zion-cell', name: 'Zion House of Praise', description: 'Lekki & Victoria Island home fellowship hub.', type: 'Cell', meetingDay: 'Wednesday 6:30 PM', leaderName: 'Deacon Femi', active: true, memberCount: 31 },
  { id: 'grp-bible-study', name: 'Berean Bible Explorers', description: 'In-depth systematic study of scriptures and doctrine.', type: 'Bible Study', meetingDay: 'Thursday 5:00 PM', leaderName: 'Pastor Mercy', active: true, memberCount: 45 },
  { id: 'grp-mens-fellowship', name: "Men of Valor Fellowship", description: 'Brotherhood, business mentorship, and spiritual leadership for men.', type: 'Men', meetingDay: '1st Saturday 8:00 AM', leaderName: 'Engr. Segun Ogundimu', active: true, memberCount: 52 },
  { id: 'grp-womens-fellowship', name: 'Virtuous Daughters of Zion', description: 'Women in ministry, prayer, marriage mentorship, and family life.', type: 'Women', meetingDay: '2nd Saturday 10:00 AM', leaderName: 'Mrs. Folake Adebayo', active: true, memberCount: 60 },
  { id: 'grp-youth-alive', name: 'Youth Ignite Hub', description: 'Campus students and young professionals fellowship.', type: 'Youth', meetingDay: 'Friday 6:00 PM', leaderName: 'Bro. Joshua James', active: true, memberCount: 75 }
];

export function getUpcomingWeekDates(): { sunday: string; tuesday: string; thursday: string } {
  const now = new Date();
  // Find current or next Sunday, Tuesday, Thursday
  const day = now.getDay(); // 0 is Sunday, 2 is Tue, 4 is Thu
  
  const getDateStr = (offsetDays: number) => {
    const d = new Date();
    d.setDate(now.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const daysUntilSunday = (7 - day) % 7;
  const daysUntilTuesday = (2 - day + 7) % 7;
  const daysUntilThursday = (4 - day + 7) % 7;

  return {
    sunday: getDateStr(daysUntilSunday === 0 ? 0 : daysUntilSunday),
    tuesday: getDateStr(daysUntilTuesday === 0 ? 0 : daysUntilTuesday),
    thursday: getDateStr(daysUntilThursday === 0 ? 0 : daysUntilThursday),
  };
}

export function generateInitialEvents(): Omit<ChurchEvent, 'createdAt' | 'updatedAt'>[] {
  const dates = getUpcomingWeekDates();

  return [
    {
      id: 'event-sunday-service',
      title: 'Sunday Worship Service',
      description: 'Join us for a glorious time in God\'s presence with prophetic praise, passionate worship, and life-changing revelation from the Word.',
      type: 'Sunday Service',
      date: dates.sunday,
      startTime: '08:00',
      endTime: '11:00',
      location: 'Main Auditorium, FaithTrack Cathedral',
      recurring: true,
      attendanceEnabled: true,
      checkInOpenTime: '07:30',
      checkInCloseTime: '10:30',
      status: 'upcoming',
      attendeesCount: 24,
      expectedCount: 450,
      qrSessionToken: 'FT-SUN-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    },
    {
      id: 'event-digging-deep',
      title: 'Digging Deep Bible Study',
      description: 'Interactive verse-by-verse scriptural exploration, doctrinal clarity, and practical Christian living insights.',
      type: 'Digging Deep',
      date: dates.tuesday,
      startTime: '17:30',
      endTime: '18:30',
      location: 'Fellowship Hall & Online Stream',
      recurring: true,
      attendanceEnabled: true,
      checkInOpenTime: '17:00',
      checkInCloseTime: '18:30',
      status: 'upcoming',
      attendeesCount: 18,
      expectedCount: 220,
      qrSessionToken: 'FT-TUE-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    },
    {
      id: 'event-faith-clinic',
      title: 'Faith Clinic & Deliverance Hour',
      description: 'An intensive prayer and deliverance service focusing on divine healing, breakthroughs, and victory over life struggles.',
      type: 'Faith Clinic',
      date: dates.thursday,
      startTime: '17:30',
      endTime: '18:30',
      location: 'Main Auditorium',
      recurring: true,
      attendanceEnabled: true,
      checkInOpenTime: '17:00',
      checkInCloseTime: '18:30',
      status: 'upcoming',
      attendeesCount: 31,
      expectedCount: 300,
      qrSessionToken: 'FT-THU-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    }
  ];
}

export const INITIAL_ANNOUNCEMENTS: Omit<Announcement, 'createdAt'>[] = [
  {
    id: 'ann-1',
    title: 'Church Annual Conference 2026',
    message: 'Join us for our annual church believers conference themed "Unstoppable Grace". Mark your calendars and invite friends and family for 3 days of heavenly encounters.',
    audience: 'everyone',
    status: 'published',
    date: '2026-10-10',
    authorName: 'Senior Pastor'
  },
  {
    id: 'ann-2',
    title: 'Workforce Thanksgiving & Prayer Breakfast',
    message: 'All church workers, department heads, and protocol ministers are expected this Saturday at 8:00 AM for spiritual refreshment and strategic alignment.',
    audience: 'everyone',
    status: 'published',
    date: '2026-10-03',
    authorName: 'Church Administrator'
  },
  {
    id: 'ann-3',
    title: 'Youth Mentorship & Tech Summit',
    message: 'Exciting career sessions covering AI, software development, entrepreneurship, and digital careers organized by the Youth Ministry.',
    audience: 'group',
    targetName: 'Youth Ignite Hub',
    status: 'published',
    date: '2026-10-17',
    authorName: 'Youth Pastor'
  }
];

export async function seedDatabaseIfEmpty(): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    // 1. Settings
    const settingsSnap = await getDocs(query(collection(db, 'settings'), limit(1)));
    if (settingsSnap.empty) {
      await setDoc(doc(db, 'settings', 'general'), {
        ...INITIAL_SETTINGS,
        updatedAt: now
      });
    }

    // 2. Departments
    const deptSnap = await getDocs(query(collection(db, 'departments'), limit(1)));
    if (deptSnap.empty) {
      for (const dept of INITIAL_DEPARTMENTS) {
        await setDoc(doc(db, 'departments', dept.id), {
          ...dept,
          createdAt: now
        });
      }
    }

    // 3. Groups
    const groupSnap = await getDocs(query(collection(db, 'groups'), limit(1)));
    if (groupSnap.empty) {
      for (const grp of INITIAL_GROUPS) {
        await setDoc(doc(db, 'groups', grp.id), {
          ...grp,
          createdAt: now
        });
      }
    }

    // 4. Events
    const eventSnap = await getDocs(query(collection(db, 'events'), limit(1)));
    if (eventSnap.empty) {
      const events = generateInitialEvents();
      for (const ev of events) {
        await setDoc(doc(db, 'events', ev.id), {
          ...ev,
          createdAt: now,
          updatedAt: now
        });

        // Also create an active QR session for Sunday Service
        if (ev.id === 'event-sunday-service') {
          await setDoc(doc(db, 'checkInSessions', 'session-' + ev.id), {
            id: 'session-' + ev.id,
            eventId: ev.id,
            token: ev.qrSessionToken,
            expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
            status: 'active',
            openedBy: 'Church Admin',
            createdAt: now
          });
        }
      }
    }

    // 5. Announcements
    const annSnap = await getDocs(query(collection(db, 'announcements'), limit(1)));
    if (annSnap.empty) {
      for (const ann of INITIAL_ANNOUNCEMENTS) {
        await setDoc(doc(db, 'announcements', ann.id), {
          ...ann,
          createdAt: now
        });
      }
    }

    return true;
  } catch (err) {
    console.error('Error seeding database:', err);
    return false;
  }
}
