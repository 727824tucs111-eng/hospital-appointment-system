# Project Plan: Sunrise Care Hospital Appointment System

This plan describes a small website for one fictional clinic, **Sunrise Care Hospital**. It helps patients, receptionists, and doctors manage clinic visits in three simple steps.

## Phase 1: Patient Booking

**Goal:** Let a patient book or cancel an appointment online.

**What to build:**
- A simple booking form where a patient enters their name, phone number, doctor or department, and preferred date/time.
- A patient view showing their booked appointments with a **Cancel** button.
- Database table in Supabase to store appointments with statuses (`booked`, `cancelled`).

**Simple Test for Phase 1:**
1. Open the booking page and submit a new appointment for a test patient.
2. Confirm the appointment appears with status `booked`.
3. Click **Cancel** on that appointment and confirm its status updates to `cancelled`.

---

## Phase 2: Reception Check-In and Queue Token

**Goal:** Let a receptionist check in arriving patients and give each one a queue token.

**What to build:**
- A receptionist view listing today's booked appointments.
- A **Check In** button next to each booked appointment.
- Automatic creation of a daily queue token number (for example, `A-01`, `A-02`) when a patient checks in, changing the status to `checked_in`.

**Simple Test for Phase 2:**
1. Open the receptionist view and find the test patient from Phase 1 (with status `booked`).
2. Click **Check In**.
3. Confirm the status changes to `checked_in` and a queue token number is shown.

---

## Phase 3: Doctor Queue and Visit Completion

**Goal:** Let a doctor see the waiting queue and mark visits as completed.

**What to build:**
- A doctor view showing checked-in patients ordered by their queue token.
- A **Complete Visit** button to finish the consultation and update the status to `completed`.

**Simple Test for Phase 3:**
1. Open the doctor view and confirm the checked-in test patient appears in the waiting queue with their token.
2. Click **Complete Visit** for that patient.
3. Confirm the status changes to `completed` and the patient is removed from the active waiting queue.

---

## Running Commands in Windows PowerShell

When code and tests are added in later phases, run project scripts using `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd test
```
