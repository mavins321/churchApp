export type UserRole = 'member' | 'admin' | 'super_admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  memberId?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  userId: string;
  membershipNumber: string; // e.g. FT-2026-00482
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  photoUrl?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string; // default Nigeria
  departmentId?: string;
  departmentName?: string;
  groupId?: string;
  groupName?: string;
  membershipDate: string;
  occupation?: string;
  skills?: string[];
  emergencyName: string;
  emergencyPhone: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export type EventType = 'Sunday Service' | 'Digging Deep' | 'Faith Clinic' | 'Prayer Meeting' | 'Youth Fellowship' | 'Special Conference' | 'Other';

export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  recurring: boolean;
  attendanceEnabled: boolean;
  checkInOpenTime: string; // HH:mm
  checkInCloseTime: string; // HH:mm
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  attendeesCount: number;
  expectedCount?: number;
  qrSessionToken?: string;
  qrSessionExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  memberId: string;
  memberName: string;
  membershipNumber: string;
  departmentName?: string;
  groupName?: string;
  checkInTime: string; // ISO string
  checkInTimeFormatted: string; // e.g. 8:54 AM
  method: 'qr' | 'manual';
  status: 'present' | 'absent' | 'excused';
  verifiedBy: string; // 'system_qr' or admin name
  notes?: string;
  createdAt: string;
}

export interface CheckInSession {
  id: string;
  eventId: string;
  token: string;
  expiresAt: string;
  status: 'active' | 'closed';
  openedBy: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  leaderName?: string;
  active: boolean;
  memberCount: number;
  createdAt: string;
}

export interface ChurchGroup {
  id: string;
  name: string;
  description: string;
  type: 'Cell' | 'Bible Study' | 'Fellowship' | 'Youth' | 'Men' | 'Women';
  leaderName?: string;
  meetingDay?: string;
  active: boolean;
  memberCount: number;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  audience: 'everyone' | 'department' | 'group';
  targetId?: string;
  targetName?: string;
  status: 'draft' | 'published' | 'archived';
  date: string;
  authorName: string;
  createdAt: string;
}

export interface ChurchNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'event' | 'attendance' | 'announcement' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
  eventId?: string;
  emailSent?: boolean;
  pushSent?: boolean;
}

export interface ActivityRegistration {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventStartTime: string;
  eventLocation: string;
  memberId: string;
  userId: string;
  memberName: string;
  memberEmail: string;
  memberPhone?: string;
  membershipNumber?: string;
  status: 'confirmed' | 'cancelled';
  reminderSent: boolean;
  registeredAt: string;
}

export interface EmailDispatchRecord {
  id: string;
  recipientEmail: string;
  recipientName: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  subject: string;
  snippet: string;
  status: 'delivered' | 'simulated' | 'queued';
  dispatchedAt: string;
}

export interface ChurchSettings {
  id: string;
  churchName: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  timezone: string; // 'Africa/Lagos'
  checkInWindowMinutesBefore: number;
  checkInWindowMinutesAfter: number;
  qrSessionExpiryMinutes: number;
  allowManualCheckIn: boolean;
  welcomeMessage: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  performedByName: string;
  performedByRole: UserRole;
  targetType: 'attendance' | 'member' | 'event' | 'settings' | 'department' | 'group';
  targetId: string;
  timestamp: string;
}

export type PrayerCategory = 
  | 'Healing & Health' 
  | 'Spiritual Growth' 
  | 'Family & Marriage' 
  | 'Financial Breakthrough' 
  | 'Career & Academics' 
  | 'Fruit of the Womb' 
  | 'Protection & Deliverance' 
  | 'Thanksgiving & Praise'
  | 'Other Needs';

export interface PrayerEncouragement {
  id: string;
  authorId: string;
  authorName: string;
  authorRole?: UserRole;
  message: string;
  createdAt: string;
}

export interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  category: PrayerCategory;
  authorId: string;
  authorName: string;
  authorMemberNumber?: string;
  isAnonymous: boolean;
  isConfidentialToPastors: boolean;
  status: 'active' | 'answered' | 'archived';
  testimony?: string;
  answeredAt?: string;
  prayCount: number;
  prayedUserIds: string[];
  encouragements?: PrayerEncouragement[];
  createdAt: string;
  updatedAt: string;
}

