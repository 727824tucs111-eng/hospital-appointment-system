import { useCallback, useEffect, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  cancelAppointment,
  fetchDoctors,
  fetchMyAppointments,
} from './services/appointments';
import type { Appointment, Doctor } from './types/hospital';
import { AuthCard } from './components/AuthCard';
import { BookAppointmentForm } from './components/BookAppointmentForm';
import { MyAppointments } from './components/MyAppointments';

interface PatientPortalProps {
  client: SupabaseClient;
}

export function PatientPortal({ client }: PatientPortalProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    let active = true;

    async function initAuth() {
      const { data } = await client.auth.getSession();
      if (!active) return;
      setSession(data.session ?? null);
      setCheckingSession(false);
    }

    void initAuth();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const loadDoctors = useCallback(async () => {
    try {
      const list = await fetchDoctors(client);
      setDoctors(list);
    } catch (err) {
      setAppointmentsError(err instanceof Error ? err.message : 'Failed to load doctors.');
    }
  }, [client]);

  const loadMyAppointments = useCallback(
    async (patientId: string) => {
      setLoadingAppointments(true);
      setAppointmentsError(null);
      try {
        const list = await fetchMyAppointments(client, patientId);
        setAppointments(list);
      } catch (err) {
        setAppointmentsError(
          err instanceof Error ? err.message : 'Failed to load appointments.',
        );
      } finally {
        setLoadingAppointments(false);
      }
    },
    [client],
  );

  useEffect(() => {
    if (!session?.user) {
      setAppointments([]);
      return;
    }

    void loadDoctors();
    void loadMyAppointments(session.user.id);
  }, [session, loadDoctors, loadMyAppointments]);

  async function handleBooked() {
    if (!session?.user) return;
    setRefreshSignal((prev) => prev + 1);
    await loadMyAppointments(session.user.id);
  }

  async function handleCancel(appointmentId: string) {
    if (!session?.user) return;
    await cancelAppointment(client, appointmentId, session.user.id);
    setRefreshSignal((prev) => prev + 1);
    await loadMyAppointments(session.user.id);
  }

  async function handleSignOut() {
    await client.auth.signOut();
  }

  const user = session?.user ?? null;
  const userMetadata = (user?.user_metadata ?? {}) as {
    full_name?: string;
    phone?: string;
  };
  const displayName = userMetadata.full_name || user?.email || 'Patient';

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div>
            <span className="phase-pill">Sunrise Care Hospital · Phase 1</span>
            <h1>Patient Appointment Portal</h1>
          </div>

          {user && (
            <div className="user-bar">
              <div className="user-meta">
                <strong>{displayName}</strong>
                {user.email && <span className="muted small">{user.email}</span>}
              </div>
              <button type="button" className="btn ghost" onClick={() => void handleSignOut()}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        {checkingSession ? (
          <section className="card">
            <p className="muted">Checking sign-in session...</p>
          </section>
        ) : !user ? (
          <AuthCard client={client} />
        ) : (
          <div className="portal-grid">
            <BookAppointmentForm
              client={client}
              patientId={user.id}
              defaultName={userMetadata.full_name ?? ''}
              defaultPhone={userMetadata.phone ?? ''}
              doctors={doctors}
              refreshSignal={refreshSignal}
              onBooked={() => void handleBooked()}
            />

            <MyAppointments
              appointments={appointments}
              loading={loadingAppointments}
              errorMessage={appointmentsError}
              onCancel={handleCancel}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export function App() {
  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="page-shell">
        <header className="topbar">
          <div className="topbar-inner">
            <div>
              <span className="phase-pill">Sunrise Care Hospital · Phase 1</span>
              <h1>Patient Appointment Portal</h1>
            </div>
          </div>
        </header>
        <main className="main-content">
          <section className="card setup-card">
            <h2>Supabase Setup Needed</h2>
            <p>
              Copy <code>.env.example</code> to <code>.env</code> and add your Supabase project
              URL and publishable key, then restart <code>npm.cmd run dev</code>.
            </p>
            <pre className="code-block">
              VITE_SUPABASE_URL=your-project-url{'\n'}
              VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
            </pre>
          </section>
        </main>
      </div>
    );
  }

  return <PatientPortal client={supabase} />;
}

export default App;
