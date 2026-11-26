import { useState } from 'react';
import { formatTimeSlot, type Appointment } from '../types/hospital';

interface MyAppointmentsProps {
  appointments: Appointment[];
  loading: boolean;
  errorMessage: string | null;
  onCancel: (appointmentId: string) => Promise<void>;
}

export function MyAppointments({
  appointments,
  loading,
  errorMessage,
  onCancel,
}: MyAppointmentsProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleCancelClick(appointmentId: string) {
    setActionError(null);
    setCancellingId(appointmentId);
    try {
      await onCancel(appointmentId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not cancel booking.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="card" aria-labelledby="appointments-heading">
      <div className="section-title-row">
        <div>
          <h2 id="appointments-heading">My Appointments</h2>
          <p className="muted">Only your own bookings are visible here.</p>
        </div>
        <span className="count-pill">{appointments.length}</span>
      </div>

      {errorMessage && (
        <p className="alert error" role="alert">
          {errorMessage}
        </p>
      )}

      {actionError && (
        <p className="alert error" role="alert">
          {actionError}
        </p>
      )}

      {loading ? (
        <p className="muted">Loading your appointments...</p>
      ) : appointments.length === 0 ? (
        <div className="empty-state">
          <p>You do not have any appointments yet.</p>
          <p className="muted small">Select a doctor and available time slot to book one.</p>
        </div>
      ) : (
        <ul className="appointment-list">
          {appointments.map((appointment) => {
            const isBooked = appointment.status === 'booked';
            const isCancelling = cancellingId === appointment.id;
            return (
              <li key={appointment.id} className="appointment-item">
                <div className="appointment-top">
                  <div>
                    <strong>{appointment.doctor?.name ?? 'Assigned Doctor'}</strong>
                    {appointment.doctor && (
                      <p className="muted small">
                        {appointment.doctor.department} · {appointment.doctor.room_number}
                      </p>
                    )}
                  </div>
                  <span className={`status-badge status-${appointment.status}`}>
                    {appointment.status}
                  </span>
                </div>

                <div className="appointment-meta">
                  <span>
                    {appointment.appointment_date} at {formatTimeSlot(appointment.appointment_time)}
                  </span>
                  <span>Patient: {appointment.patient_name}</span>
                </div>

                {appointment.notes && (
                  <p className="appointment-note">Note: {appointment.notes}</p>
                )}

                {isBooked && (
                  <div className="appointment-actions">
                    <button
                      type="button"
                      className="btn danger-outline"
                      disabled={isCancelling}
                      onClick={() => void handleCancelClick(appointment.id)}
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
