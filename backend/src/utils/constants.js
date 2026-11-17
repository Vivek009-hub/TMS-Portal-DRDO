export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
};

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.USER]: 1,
};

export const CERTIFICATE_TYPES = ['completion', 'participation', 'detention', 'appreciation'];

export const COURSE_STATUSES = ['draft', 'scheduled', 'running', 'completed', 'cancelled'];

export const LEAVE_TYPES = ['casual', 'medical', 'emergency', 'official', 'other'];

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

export const DOCUMENT_CATEGORIES = ['course_material', 'policy', 'form', 'report', 'other'];

export const TEMPLATE_TYPES = ['course_calendar', 'course_schedule', 'course_circular', 'certificate'];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// Fixed daily time-slot grid used by the Course Schedule module (12 weeks x 7 days x these slots).
export const SCHEDULE_TIME_SLOTS = [
  { start_time: '06:30', end_time: '07:00' },
  { start_time: '07:00', end_time: '08:40' },
  { start_time: '08:40', end_time: '09:00' },
  { start_time: '09:00', end_time: '09:45' },
  { start_time: '09:45', end_time: '10:30' },
  { start_time: '10:30', end_time: '10:45' },
  { start_time: '10:45', end_time: '11:30' },
  { start_time: '11:30', end_time: '12:15' },
  { start_time: '12:15', end_time: '13:00' },
  { start_time: '13:00', end_time: '13:45' },
  { start_time: '13:45', end_time: '14:30' },
  { start_time: '14:30', end_time: '15:15' },
  { start_time: '15:15', end_time: '16:00' },
  { start_time: '16:00', end_time: '17:00' },
  { start_time: '17:00', end_time: '19:00' },
  { start_time: '19:00', end_time: '20:00' },
  { start_time: '20:00', end_time: '21:15' },
  { start_time: '21:15', end_time: '06:30' },
];
