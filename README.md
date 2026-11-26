# Hospital Appointment Management System

A small web application for a fictional hospital (**Sunrise Care Hospital**) built as an internship project.

## Problem It Solves

Small clinics often rely on paper logs or spreadsheets to track patient visits. This causes long wait times, missed updates between the front desk and doctors, and confusion about who goes next. This system connects patients, receptionists, and doctors in one shared workflow from booking to visit completion.

## Technology Stack

- **React** — User interface
- **TypeScript** — Type-safe JavaScript
- **Vite** — Fast frontend build tool and dev server
- **Supabase** — PostgreSQL database, Row Level Security (RLS), and Authentication

## Features Status

### Built (Phase 1)

- [x] **Phase 1 — Patient Booking:**
  - Patient sign-up and sign-in with Supabase Auth.
  - Fictional hospital doctors (`Dr. Maya Lin`, `Dr. Carlos Rivera`, `Dr. Priya Nair`, `Dr. Hannah Brooks`).
  - Live time-slot picker showing open and already-booked slots without exposing other patients' information.
  - **My Appointments** list loaded from Supabase (persists across page refreshes).
  - Patient-only Row Level Security so patients can only view and cancel their own bookings.
  - Database unique index preventing two active bookings for the same doctor, date, and time slot.
  - Cancelling a booking marks it `cancelled` and makes the time slot available again.

### Still Planned (Not Built Yet)

- [ ] **Phase 2 — Reception Check-In:** Receptionist screen to view today's booked appointments, check in arriving patients, and issue daily queue tokens (`A-01`, `A-02`, ...).
- [ ] **Phase 3 — Doctor Queue:** Doctor screen to view checked-in patients ordered by queue token and mark visits as `completed`.

## Local Setup (Windows PowerShell)

Use `npm.cmd` in Windows PowerShell:

1. Create a Supabase project and run [supabase/setup.sql](./supabase/setup.sql) in the **Supabase SQL Editor**.
2. Copy `.env.example` to `.env` (never commit `.env` to Git) and fill in your Supabase keys:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Install dependencies:
   ```powershell
   npm.cmd install
   ```
4. Start the development server:
   ```powershell
   npm.cmd run dev
   ```
5. Run the Phase 1 tests:
   ```powershell
   npm.cmd test
   ```
