import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CLINIC_TIME_SLOTS,
  formatTimeSlot,
  getTodayDateInputValue,
  type Doctor,
} from '../types/hospital';
import { createAppointment, fetchTakenSlots } from '../services/appointments';

interface BookAppointmentFormProps {
  client: SupabaseClient;
  patientId: string;
  defaultName: string;
  defaultPhone: string;
  doctors: Doctor[];
  refreshSignal: number;
  onBooked: () => void;
}

export function BookAppointmentForm({
  client,
  patientId,
  defaultName,
  defaultPhone,
  doctors,
  refreshSignal,
  onBooked,
}: BookAppointmentFormProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<string>(getTodayDateInputValue);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [patientName, setPatientName] = useState<string>(defaultName);
  const [patientPhone, setPatientPhone] = useState<string>(defaultPhone);
  const [notes, setNotes] = useState<string>('');

  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDoctorId && doctors.length > 0) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  useEffect(() => {
    setPatientName((prev) => (prev ? prev : defaultName));
  }, [defaultName]);

  useEffect(() => {
    setPatientPhone((prev) => (prev ? prev : defaultPhone));
  }, [defaultPhone]);

  useEffect(() => {
    let active = true;

    async function loadSlots() {
      if (!selectedDoctorId || !appointmentDate) {
        setTakenSlots([]);
        return;
      }

      setLoadingSlots(true);
      setErrorMessage(null);
      try {
        const taken = await fetchTakenSlots(client, selectedDoctorId, appointmentDate);
        if (!active) return;
        setTakenSlots(taken);
        setSelectedSlot((current) => (taken.includes(current) ? '' : current));
      } catch (err) {
        if (!active) return;
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load time slots.');
      } finally {
        if (active) setLoadingSlots(false);
      }
    }

    void loadSlots();
    return () => {
      active = false;
    };
  }, [client, selectedDoctorId, appointmentDate, refreshSignal]);

  const selectedDoctor = doctors.find((doc) => doc.id === selectedDoctorId) ?? null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedDoctorId) {
      setErrorMessage('Please choose a doctor.');
      return;
    }
    if (!selectedSlot) {
      setErrorMessage('Please pick an available time slot.');
      return;
    }
    if (patientName.trim().length < 2) {
      setErrorMessage('Please enter the patient name.');
      return;
    }
    if (patientPhone.trim().length < 6) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment(client, {
        patient_id: patientId,
        doctor_id: selectedDoctorId,
        patient_name: patientName,
        patient_phone: patientPhone,
        appointment_date: appointmentDate,
        appointment_time: selectedSlot,
        notes,
      });

      const bookedLabel = `${selectedDoctor?.name ?? 'Doctor'} on ${appointmentDate} at ${formatTimeSlot(selectedSlot)}`;
      setSuccessMessage(`Appointment booked with ${bookedLabel}.`);
      setSelectedSlot('');
      setNotes('');
      onBooked();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not complete booking.');
      // Refresh slot availability in case another patient booked it just before us
      try {
        const latestTaken = await fetchTakenSlots(client, selectedDoctorId, appointmentDate);
        setTakenSlots(latestTaken);
        setSelectedSlot((current) => (latestTaken.includes(current) ? '' : current));
      } catch {
        // Keep original booking error visible
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card" aria-labelledby="book-heading">
      <h2 id="book-heading">Book an Appointment</h2>
      <p className="muted">Choose a doctor, date, and an open clinic time slot.</p>

      <form onSubmit={handleSubmit} className="stack">
        <div className="field-row">
          <label className="field">
            <span>Patient Name</span>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </label>

          <label className="field">
            <span>Phone Number</span>
            <input
              type="tel"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              placeholder="e.g., 555-0142"
              required
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Doctor</span>
            <select
              value={selectedDoctorId}
              onChange={(e) => {
                setSelectedDoctorId(e.target.value);
                setSelectedSlot('');
                setSuccessMessage(null);
              }}
              required
            >
              {doctors.length === 0 && <option value="">Loading doctors...</option>}
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} — {doctor.department} ({doctor.room_number})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={appointmentDate}
              min={getTodayDateInputValue()}
              onChange={(e) => {
                setAppointmentDate(e.target.value);
                setSelectedSlot('');
                setSuccessMessage(null);
              }}
              required
            />
          </label>
        </div>

        <div className="field">
          <div className="slot-header">
            <span>Available Time Slots</span>
            {loadingSlots && <span className="muted small">Checking availability...</span>}
          </div>

          <div className="slot-grid" role="group" aria-label="Time slots">
            {CLINIC_TIME_SLOTS.map((slot) => {
              const isTaken = takenSlots.includes(slot);
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isTaken || loadingSlots}
                  aria-pressed={isSelected}
                  className={`slot-btn ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}`}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setErrorMessage(null);
                  }}
                >
                  <span>{formatTimeSlot(slot)}</span>
                  <small>{isTaken ? 'Booked' : 'Available'}</small>
                </button>
              );
            })}
          </div>
        </div>

        <label className="field">
          <span>Reason for Visit (optional)</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Annual check-up or fever"
            maxLength={140}
          />
        </label>

        {errorMessage && (
          <p className="alert error" role="alert">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="alert success" role="status">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          className="btn primary"
          disabled={submitting || doctors.length === 0}
        >
          {submitting ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </section>
  );
}
