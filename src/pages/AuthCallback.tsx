/**
 * AuthCallback.tsx — handles the Google OAuth authorization code redirect.
 *
 * Google redirects here after the user approves the consent screen:
 *   /auth/callback?code=...&state=...
 *
 * This page:
 *  1. Sends the code + PKCE verifier to the Cloudflare Pages Function at /auth/token.
 *  2. The function exchanges them for access_token + id_token using the client secret.
 *  3. signInWithGoogle() provisions Firebase and signs in.
 *  4. Starts the sync manager and navigates to /settings.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleOAuthCallback, type SetupStep } from '../database/firebase';
import { syncManager } from '../database/sync-manager';
import { IoSparkles } from 'react-icons/io5';

const STEP_LABELS: Record<SetupStep | string, string> = {
  'Exchanging authorization code…': 'Exchanging authorization code…',
  checking_projects: 'Checking your Firebase projects…',
  creating_project:  'Creating FeelSeen project…',
  registering_app:   'Registering web app…',
  fetching_config:   'Fetching SDK config…',
  enabling_auth:     'Enabling authentication…',
  signing_in:        'Signing in…',
  done:              'Done!',
};

const STEP_ORDER: string[] = [
  'Exchanging authorization code…',
  'checking_projects',
  'creating_project',
  'registering_app',
  'fetching_config',
  'enabling_auth',
  'signing_in',
  'done',
];

export default function AuthCallback() {
  const navigate = useNavigate();
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No code param — user landed here directly
    if (!new URLSearchParams(window.location.search).has('code')) {
      navigate('/settings', { replace: true });
      return;
    }

    handleOAuthCallback(setStep)
      .then((user) => {
        if (!user) {
          navigate('/settings', { replace: true });
          return;
        }
        syncManager.start();
        navigate('/settings', { replace: true });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'white',
        textAlign: 'center',
      }}
    >
      {error ? (
        <>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
            Sign-in failed
          </h2>
          <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px', maxWidth: '320px' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/settings', { replace: true })}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: '#a5a5df',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Back to Settings
          </button>
        </>
      ) : (
        <>
          <IoSparkles size={48} color="#a5a5df" style={{ marginBottom: '20px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
            Setting up Cloud Sync
          </h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px', minHeight: '20px' }}>
            {step ? (STEP_LABELS[step] ?? step) : 'Starting…'}
          </p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {STEP_ORDER.map((s) => (
              <div
                key={s}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background:
                    step === s
                      ? '#a5a5df'
                      : step != null && STEP_ORDER.indexOf(s) < STEP_ORDER.indexOf(step)
                      ? '#d0d0f0'
                      : '#e0e0e0',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
