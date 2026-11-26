# Hospital Appointment Management System

A small web application for a fictional hospital (**Sunrise Care Hospital**) built as an internship project.

## Problem It Solves

Small clinics often rely on paper logs or spreadsheets to track patient visits. This causes long wait times, missed updates between the front desk and doctors, and confusion about who goes next. This system connects patients, receptionists, and doctors in one shared workflow from booking to visit completion.

## Planned Technology Stack

- **React** — User interface
- **TypeScript** — Type-safe JavaScript
- **Vite** — Fast frontend build tool and dev server
- **Supabase** — PostgreSQL database and backend API

## Planned Features (Not Built Yet)

All application features below are currently **planned** and will be built in three phases (see [PROJECT_PLAN.md](./PROJECT_PLAN.md)):

- [ ] **Phase 1 — Patient Booking:** Patients can book a new appointment or cancel an existing one.
- [ ] **Phase 2 — Reception Check-In:** Receptionists can check in arrived patients and issue a queue token.
- [ ] **Phase 3 — Doctor Queue:** Doctors can view the active queue in token order and mark visits as completed.

## Future Local Setup (Windows PowerShell)

Once the Vite and React app is initialized, use `npm.cmd` in Windows PowerShell:

1. Copy `.env.example` to `.env` and fill in your Supabase keys.
2. Install dependencies:
   ```powershell
   npm.cmd install
   ```
3. Start the development server:
   ```powershell
   npm.cmd run dev
   ```
