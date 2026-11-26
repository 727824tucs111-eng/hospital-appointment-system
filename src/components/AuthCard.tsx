import { useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AuthCardProps {
  client: SupabaseClient;
}

export function AuthCard({ client }: AuthCardProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMessage(error.message);
        }
      } else {
        if (fullName.trim().length < 2) {
          setErrorMessage('Please enter your full name.');
          setSubmitting(false);
          return;
        }
        if (phone.trim().length < 6) {
          setErrorMessage('Please enter a valid phone number.');
          setSubmitting(false);
          return;
        }

        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
        } else if (!data.session) {
          setInfoMessage(
            'Account created! Check your email to confirm your address, or sign in once confirmed.',
          );
          setMode('signin');
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card auth-card" aria-label="Patient Sign In">
      <div className="auth-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          className={mode === 'signin' ? 'tab active' : 'tab'}
          onClick={() => {
            setMode('signin');
            setErrorMessage(null);
            setInfoMessage(null);
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={mode === 'signup' ? 'tab active' : 'tab'}
          onClick={() => {
            setMode('signup');
            setErrorMessage(null);
            setInfoMessage(null);
          }}
        >
          New Patient
        </button>
      </div>

      <h2>{mode === 'signin' ? 'Patient Sign In' : 'Create Patient Account'}</h2>
      <p className="muted">
        {mode === 'signin'
          ? 'Sign in to book an appointment or manage your visits.'
          : 'Register with a fictional patient account to test booking.'}
      </p>

      <form onSubmit={handleSubmit} className="stack">
        {mode === 'signup' && (
          <>
            <label className="field">
              <span>Full Name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Maya Patel"
                autoComplete="name"
                required
              />
            </label>

            <label className="field">
              <span>Phone Number</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 555-0142"
                autoComplete="tel"
                required
              />
            </label>
          </>
        )}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="patient@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />
        </label>

        {errorMessage && (
          <p className="alert error" role="alert">
            {errorMessage}
          </p>
        )}

        {infoMessage && (
          <p className="alert info" role="status">
            {infoMessage}
          </p>
        )}

        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting
            ? 'Please wait...'
            : mode === 'signin'
              ? 'Sign In'
              : 'Create Account'}
        </button>
      </form>
    </section>
  );
}
