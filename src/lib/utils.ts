export function cn(...classes: (string | boolean | undefined | null | number | any)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateMembershipNumber(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `FT-${year}-${randomNum}`;
}

export function formatTime12Hour(timeStr: string): string {
  if (!timeStr) return '';
  // If timeStr is already "09:00"
  if (timeStr.includes(':') && timeStr.length <= 5) {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return `${hours12}:${m < 10 ? '0' + m : m} ${period}`;
  }
  // If it's an ISO date
  try {
    const d = new Date(timeStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return timeStr;
  }
}

export function formatDateReadable(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (year && month && day) {
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function getRelativeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function isCheckInWindowActive(event: {
  date: string;
  checkInOpenTime: string;
  checkInCloseTime: string;
  status: string;
}): { isOpen: boolean; message: string } {
  if (event.status === 'cancelled') {
    return { isOpen: false, message: 'This activity has been cancelled.' };
  }
  if (event.status === 'completed') {
    return { isOpen: false, message: 'This activity has ended.' };
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Compare dates
  if (event.date < todayStr) {
    return { isOpen: false, message: 'Check-in is closed for past events.' };
  }
  if (event.date > todayStr) {
    return { isOpen: false, message: `Check-in opens on ${formatDateReadable(event.date)} at ${formatTime12Hour(event.checkInOpenTime)}.` };
  }

  // Today! Check time window
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = event.checkInOpenTime.split(':').map(Number);
  const [closeH, closeM] = event.checkInCloseTime.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (currentMinutes < openMinutes) {
    return { isOpen: false, message: `Check-in opens at ${formatTime12Hour(event.checkInOpenTime)}.` };
  }
  if (currentMinutes > closeMinutes) {
    return { isOpen: false, message: `Check-in closed at ${formatTime12Hour(event.checkInCloseTime)}.` };
  }

  return { isOpen: true, message: 'Check-in is currently open!' };
}
