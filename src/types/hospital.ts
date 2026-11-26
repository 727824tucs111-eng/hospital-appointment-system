export type AppointmentStatus = 'booked' | 'cancelled' | 'checked_in' | 'completed';

export interface Doctor {
  id: string;
  name: string;
  department: string;
  room_number: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  notes: string;
  status: AppointmentStatus;
  queue_token: string | null;
  created_at: string;
  doctor?: Doctor | null;
}

export interface CreateAppointmentInput {
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  notes: string;
}

export const CLINIC_TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
] as const;

export function formatTimeSlot(slot: string): string {
  const [hourText, minute] = slot.split(':');
  const hour = Number(hourText);
  if (Number.isNaN(hour) || !minute) return slot;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

export function getTodayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
