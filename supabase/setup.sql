-- Sunrise Care Hospital — Phase 1 Database Setup Script
-- Run this script once in your Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

-- 1. Doctors table (fictional hospital doctors)
create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  room_number text not null,
  created_at timestamptz not null default now()
);

alter table public.doctors enable row level security;

drop policy if exists "Anyone signed in or visiting can view doctors" on public.doctors;
create policy "Anyone signed in or visiting can view doctors"
  on public.doctors
  for select
  to anon, authenticated
  using (true);

-- Seed fictional doctors (safe to re-run)
insert into public.doctors (id, name, department, room_number)
values
  ('11111111-1111-4111-8111-111111111101', 'Dr. Maya Lin', 'General Medicine', 'Room 101'),
  ('11111111-1111-4111-8111-111111111102', 'Dr. Carlos Rivera', 'Pediatrics', 'Room 104'),
  ('11111111-1111-4111-8111-111111111103', 'Dr. Priya Nair', 'Cardiology', 'Room 202'),
  ('11111111-1111-4111-8111-111111111104', 'Dr. Hannah Brooks', 'Dermatology', 'Room 205')
on conflict (id) do update
set
  name = excluded.name,
  department = excluded.department,
  room_number = excluded.room_number;

-- 2. Appointments table
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  patient_name text not null check (char_length(trim(patient_name)) >= 2),
  patient_phone text not null check (char_length(trim(patient_phone)) >= 6),
  appointment_date date not null,
  appointment_time text not null check (
    appointment_time in (
      '09:00', '09:30', '10:00', '10:30',
      '11:00', '11:30', '14:00', '14:30',
      '15:00', '15:30'
    )
  ),
  notes text not null default '',
  status text not null default 'booked' check (
    status in ('booked', 'cancelled', 'checked_in', 'completed')
  ),
  queue_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on row changes
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row
  execute function public.set_updated_at();

-- Prevent patients from editing booking details when cancelling
create or replace function public.enforce_patient_cancel_only()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if new.patient_id <> old.patient_id
      or new.doctor_id <> old.doctor_id
      or new.appointment_date <> old.appointment_date
      or new.appointment_time <> old.appointment_time
      or new.patient_name <> old.patient_name
      or new.patient_phone <> old.patient_phone then
      raise exception 'Patients may only update appointment status to cancelled.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_patient_cancel_only on public.appointments;
create trigger appointments_patient_cancel_only
  before update on public.appointments
  for each row
  execute function public.enforce_patient_cancel_only();

-- Database-level rule: two active bookings cannot share the same doctor, date, and time slot.
-- Cancelled appointments are excluded so the slot becomes available again immediately.
create unique index if not exists unique_active_doctor_slot
  on public.appointments (doctor_id, appointment_date, appointment_time)
  where status <> 'cancelled';

-- 3. Row Level Security: patients can only view, create, and cancel their own bookings
alter table public.appointments enable row level security;

drop policy if exists "Patients can view own appointments" on public.appointments;
create policy "Patients can view own appointments"
  on public.appointments
  for select
  to authenticated
  using (auth.uid() = patient_id);

drop policy if exists "Patients can create own appointments" on public.appointments;
create policy "Patients can create own appointments"
  on public.appointments
  for insert
  to authenticated
  with check (auth.uid() = patient_id and status = 'booked');

drop policy if exists "Patients can cancel own booked appointments" on public.appointments;
create policy "Patients can cancel own booked appointments"
  on public.appointments
  for update
  to authenticated
  using (auth.uid() = patient_id and status = 'booked')
  with check (auth.uid() = patient_id and status = 'cancelled');

-- 4. Safe slot lookup function: returns only taken slot times (never patient details)
create or replace function public.get_taken_slots(
  p_doctor_id uuid,
  p_appointment_date date
)
returns table (appointment_time text)
language sql
security definer
set search_path = public
as $$
  select a.appointment_time
  from public.appointments a
  where a.doctor_id = p_doctor_id
    and a.appointment_date = p_appointment_date
    and a.status <> 'cancelled'
  order by a.appointment_time;
$$;

revoke all on function public.get_taken_slots(uuid, date) from public;
grant execute on function public.get_taken_slots(uuid, date) to authenticated;
