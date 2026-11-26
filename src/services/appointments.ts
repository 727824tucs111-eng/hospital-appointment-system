import type { SupabaseClient } from '@supabase/supabase-js';
import type { Appointment, CreateAppointmentInput, Doctor } from '../types/hospital';

export async function fetchDoctors(client: SupabaseClient): Promise<Doctor[]> {
  const { data, error } = await client
    .from('doctors')
    .select('id, name, department, room_number')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Could not load doctors: ${error.message}`);
  }

  return (data ?? []) as Doctor[];
}

export async function fetchTakenSlots(
  client: SupabaseClient,
  doctorId: string,
  appointmentDate: string,
): Promise<string[]> {
  const { data, error } = await client.rpc('get_taken_slots', {
    p_doctor_id: doctorId,
    p_appointment_date: appointmentDate,
  });

  if (error) {
    throw new Error(`Could not check available slots: ${error.message}`);
  }

  return ((data ?? []) as Array<{ appointment_time: string }>).map(
    (row) => row.appointment_time,
  );
}

export async function fetchMyAppointments(
  client: SupabaseClient,
  patientId: string,
): Promise<Appointment[]> {
  const { data, error } = await client
    .from('appointments')
    .select(
      'id, patient_id, doctor_id, patient_name, patient_phone, appointment_date, appointment_time, notes, status, queue_token, created_at, doctor:doctors(id, name, department, room_number)',
    )
    .eq('patient_id', patientId)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });

  if (error) {
    throw new Error(`Could not load your appointments: ${error.message}`);
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const record = row as Appointment & { doctor?: Doctor | Doctor[] | null };
    const normalizedDoctor = Array.isArray(record.doctor)
      ? (record.doctor[0] ?? null)
      : (record.doctor ?? null);
    return {
      ...record,
      doctor: normalizedDoctor,
    };
  });
}

export async function createAppointment(
  client: SupabaseClient,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const { data, error } = await client
    .from('appointments')
    .insert({
      patient_id: input.patient_id,
      doctor_id: input.doctor_id,
      patient_name: input.patient_name.trim(),
      patient_phone: input.patient_phone.trim(),
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      notes: input.notes.trim(),
      status: 'booked',
    })
    .select(
      'id, patient_id, doctor_id, patient_name, patient_phone, appointment_date, appointment_time, notes, status, queue_token, created_at, doctor:doctors(id, name, department, room_number)',
    )
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'This doctor and time slot is already booked. Please choose another available slot.',
      );
    }
    throw new Error(`Could not book appointment: ${error.message}`);
  }

  const record = data as unknown as Appointment & { doctor?: Doctor | Doctor[] | null };
  return {
    ...record,
    doctor: Array.isArray(record.doctor) ? (record.doctor[0] ?? null) : (record.doctor ?? null),
  };
}

export async function cancelAppointment(
  client: SupabaseClient,
  appointmentId: string,
  patientId: string,
): Promise<void> {
  const { data, error } = await client
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('patient_id', patientId)
    .eq('status', 'booked')
    .select('id')
    .single();

  if (error) {
    throw new Error(`Could not cancel appointment: ${error.message}`);
  }

  if (!data) {
    throw new Error('Appointment was not found or can no longer be cancelled.');
  }
}
