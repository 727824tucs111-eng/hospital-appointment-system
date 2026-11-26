import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PatientPortal } from '../App';
import { getTodayDateInputValue, type Appointment, type Doctor } from '../types/hospital';

const MOCK_DOCTORS: Doctor[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'Dr. Maya Lin',
    department: 'General Medicine',
    room_number: 'Room 101',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Dr. Carlos Rivera',
    department: 'Pediatrics',
    room_number: 'Room 104',
  },
];

function createMockSupabase(options?: { simulateSlotConflict?: boolean }) {
  const appointmentsStore: Appointment[] = [];
  let nextId = 1;

  const mockSession = {
    user: {
      id: 'patient-1',
      email: 'maya.patel@example.com',
      user_metadata: {
        full_name: 'Maya Patel',
        phone: '555-0142',
      },
    },
  };

  const client = {
    auth: {
      getSession: async () => ({ data: { session: mockSession }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signOut: async () => ({ error: null }),
    },
    rpc: async (
      fn: string,
      params: { p_doctor_id: string; p_appointment_date: string },
    ) => {
      if (fn !== 'get_taken_slots') {
        return { data: [], error: null };
      }
      const rows = appointmentsStore
        .filter(
          (item) =>
            item.doctor_id === params.p_doctor_id &&
            item.appointment_date === params.p_appointment_date &&
            item.status !== 'cancelled',
        )
        .map((item) => ({ appointment_time: item.appointment_time }));
      return { data: rows, error: null };
    },
    from: (table: string) => {
      if (table === 'doctors') {
        return {
          select: () => ({
            order: async () => ({ data: MOCK_DOCTORS, error: null }),
          }),
        };
      }

      if (table === 'appointments') {
        return {
          select: () => ({
            eq: (_col: string, patientId: string) => ({
              order: () => ({
                order: async () => ({
                  data: appointmentsStore.filter((item) => item.patient_id === patientId),
                  error: null,
                }),
              }),
            }),
          }),
          insert: (payload: Omit<Appointment, 'id' | 'created_at' | 'queue_token' | 'doctor'>) => ({
            select: () => ({
              single: async () => {
                if (options?.simulateSlotConflict) {
                  return {
                    data: null,
                    error: {
                      code: '23505',
                      message: 'duplicate key value violates unique constraint',
                    },
                  };
                }

                const duplicate = appointmentsStore.some(
                  (item) =>
                    item.doctor_id === payload.doctor_id &&
                    item.appointment_date === payload.appointment_date &&
                    item.appointment_time === payload.appointment_time &&
                    item.status !== 'cancelled',
                );
                if (duplicate) {
                  return {
                    data: null,
                    error: {
                      code: '23505',
                      message: 'duplicate key value violates unique constraint',
                    },
                  };
                }

                const doctor = MOCK_DOCTORS.find((d) => d.id === payload.doctor_id) ?? null;
                const created: Appointment = {
                  ...payload,
                  id: `appt-${nextId++}`,
                  queue_token: null,
                  created_at: new Date().toISOString(),
                  doctor,
                };
                appointmentsStore.push(created);
                return { data: created, error: null };
              },
            }),
          }),
          update: (changes: { status: 'cancelled' }) => {
            const filters: Record<string, string> = {};
            const builder = {
              eq(col: string, val: string) {
                filters[col] = val;
                return builder;
              },
              select: () => ({
                single: async () => {
                  const target = appointmentsStore.find(
                    (item) =>
                      item.id === filters.id &&
                      item.patient_id === filters.patient_id &&
                      item.status === filters.status,
                  );
                  if (!target) {
                    return { data: null, error: { message: 'Not found' } };
                  }
                  target.status = changes.status;
                  return { data: { id: target.id }, error: null };
                },
              }),
            };
            return builder;
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return client as unknown as SupabaseClient;
}

describe('Phase 1 — Patient Booking and Cancellation', () => {
  it('books an appointment, shows it in My Appointments, and frees the slot when cancelled', async () => {
    const user = userEvent.setup();
    const mockClient = createMockSupabase();

    render(<PatientPortal client={mockClient} />);

    // Wait for doctors and appointments to finish loading
    await screen.findByText(/Dr\. Maya Lin — General Medicine/i);

    const slotButton = screen.getByRole('button', { name: /9:30 AM/i });
    await user.click(slotButton);
    await user.click(screen.getByRole('button', { name: /Book Appointment/i }));

    // Confirm appointment appears in My Appointments with status booked
    const myAppointments = screen.getByRole('region', { name: /My Appointments/i });
    await within(myAppointments).findByText('booked');
    expect(
      within(myAppointments).getByText(new RegExp(`${getTodayDateInputValue()} at 9:30 AM`)),
    ).toBeInTheDocument();

    // Confirm 9:30 AM slot is now marked Booked and disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /9:30 AM/i })).toBeDisabled();
    });

    // Cancel the booking and confirm status updates to cancelled and slot re-opens
    await user.click(within(myAppointments).getByRole('button', { name: /^Cancel$/i }));
    await within(myAppointments).findByText('cancelled');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /9:30 AM/i })).toBeEnabled();
    });
  });

  it('shows a clear message when the database rejects a duplicate doctor and time slot', async () => {
    const user = userEvent.setup();
    const mockClient = createMockSupabase({ simulateSlotConflict: true });

    render(<PatientPortal client={mockClient} />);

    await screen.findByText(/Dr\. Maya Lin — General Medicine/i);
    await user.click(screen.getByRole('button', { name: /10:00 AM/i }));
    await user.click(screen.getByRole('button', { name: /Book Appointment/i }));

    await screen.findByText(/already booked/i);
  });
});
