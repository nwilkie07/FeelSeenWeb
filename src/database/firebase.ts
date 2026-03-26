/**
 * firebase.ts — Firebase init + Google Sign-In for the web app.
 *
 * Auth flow (PKCE authorization code):
 *  1. generatePKCE()    — create a code_verifier + code_challenge in the browser
 *  2. startGoogleOAuth() — redirect to Google with response_type=code + challenge
 *  3. Google redirects back to /auth/callback?code=...
 *  4. handleOAuthCallback() — sends code + verifier to the Cloudflare Pages Function
 *     at /auth/token, which holds the client secret and exchanges for tokens
 *  5. signInWithGoogle() — uses the returned access_token + id_token to provision
 *     and sign into Firebase (same auto-provisioning flow as the mobile app)
 *
 * The client secret NEVER touches the browser — it lives only in the
 * Cloudflare Pages environment variable GOOGLE_CLIENT_SECRET.
 *
 * Required env vars (in .env / Cloudflare Pages dashboard):
 *   VITE_GOOGLE_CLIENT_ID  — OAuth 2.0 Web Client ID from Google Cloud Console
 *                            (same one used by the mobile app)
 */

import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// ─── constants ────────────────────────────────────────────────────────────────

const FIREBASE_CONFIG_KEY = 'feelseen_firebase_config_v2'; // same as mobile
const FIREBASE_USER_KEY   = 'feelseen_firebase_user';
const PKCE_VERIFIER_KEY   = 'oauth_pkce_verifier';
const OAUTH_STATE_KEY     = 'oauth_state';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const OAUTH_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/firebase',
  'https://www.googleapis.com/auth/cloud-platform',
].join(' ');

// ─── module-level singletons ──────────────────────────────────────────────────

let _app:  FirebaseApp | null = null;
let _auth: Auth        | null = null;
let _db:   Firestore   | null = null;

// ─── public types ─────────────────────────────────────────────────────────────

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type SetupStep =
  | 'checking_projects'
  | 'creating_project'
  | 'registering_app'
  | 'fetching_config'
  | 'enabling_auth'
  | 'signing_in'
  | 'done';

// ─── lazy proxy accessors ────────────────────────────────────────────────────

export const FIREBASE_DB = new Proxy({} as Firestore, {
  get(_t, prop) {
    if (!_db) throw new Error('Firebase not configured — sign in first');
    return (_db as any)[prop];
  },
});

export const FIREBASE_AUTH = new Proxy({} as Auth, {
  get(_t, prop) {
    if (!_auth) {
      if (prop === 'currentUser') return null;
      throw new Error('Firebase not configured — sign in first');
    }
    return (_auth as any)[prop];
  },
});

// ─── init helpers ─────────────────────────────────────────────────────────────

function initFromConfig(config: FirebaseWebConfig): void {
  const existing = getApps().find((a) => a.name === '[DEFAULT]');
  _app  = existing ?? initializeApp(config);
  _auth = getAuth(_app);
  _db   = getFirestore(_app);
}

export function isFirebaseConfigured(): boolean {
  return _db !== null && _auth !== null;
}

export function getCurrentUser(): FirebaseUser | null {
  const u: User | null = _auth?.currentUser ?? null;
  if (!u) return null;
  return { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL };
}

export function getSavedUser(): { email: string; displayName: string } | null {
  try {
    const raw = localStorage.getItem(FIREBASE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Re-initialise from persisted config on page load. */
export async function loadSavedFirebaseConfig(): Promise<boolean> {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (!raw) return false;
    const config: FirebaseWebConfig = JSON.parse(raw);
    initFromConfig(config);
    await new Promise<void>((resolve) => {
      const unsub = _auth!.onAuthStateChanged(() => { unsub(); resolve(); });
      setTimeout(resolve, 3000);
    });
    return _auth?.currentUser != null;
  } catch {
    return false;
  }
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return { verifier, challenge };
}

// ─── OAuth redirect ───────────────────────────────────────────────────────────

/**
 * Redirect the user to Google OAuth (authorization code + PKCE).
 * Saves the verifier and state to sessionStorage so handleOAuthCallback()
 * can retrieve them when Google redirects back.
 */
export async function startGoogleOAuth(): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set in .env');
  }

  const { verifier, challenge } = await generatePKCE();
  const state = crypto.randomUUID();

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id:             GOOGLE_CLIENT_ID,
    redirect_uri:          `${window.location.origin}/auth/callback`,
    response_type:         'code',
    scope:                 OAUTH_SCOPES,
    state,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    access_type:           'online',
    prompt:                'select_account',
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ─── OAuth callback handling ──────────────────────────────────────────────────

/**
 * Called from /auth/callback after Google redirects back.
 * Exchanges the code via the Cloudflare Pages Function at /auth/token,
 * then provisions Firebase and signs in.
 */
export async function handleOAuthCallback(
  onStep?: (step: SetupStep | string) => void
): Promise<FirebaseUser | null> {
  const params   = new URLSearchParams(window.location.search);
  const code     = params.get('code');
  const state    = params.get('state');
  const errorMsg = params.get('error');

  if (errorMsg) throw new Error(`Google OAuth error: ${errorMsg}`);
  if (!code)    return null;

  // Verify state to prevent CSRF
  const savedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  if (savedState && state && savedState !== state) {
    throw new Error('OAuth state mismatch — possible CSRF attack');
  }

  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) throw new Error('PKCE verifier missing — please try signing in again');

  // Clean up sessionStorage
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);

  onStep?.('Exchanging authorization code…');

  // Exchange code via the Cloudflare Pages Function (holds the client secret)
  const tokenRes = await fetch('/auth/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      code,
      code_verifier: verifier,
      redirect_uri:  `${window.location.origin}/auth/callback`,
      client_id:     GOOGLE_CLIENT_ID,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; id_token?: string; error?: string };
  if (!tokenRes.ok || !tokenData.access_token || !tokenData.id_token) {
    throw new Error(tokenData.error ?? 'Token exchange failed');
  }

  // Clear the code from the URL so it can't be reused
  window.history.replaceState({}, '', window.location.pathname);

  return signInWithGoogle(tokenData.access_token, tokenData.id_token, onStep as ((step: SetupStep) => void) | undefined);
}

// ─── Firebase sign-in + auto-provisioning ────────────────────────────────────

export async function signInWithGoogle(
  accessToken: string,
  idToken: string,
  onStep?: (step: SetupStep) => void
): Promise<FirebaseUser> {
  const config = await findOrCreateFirebaseProject(accessToken, onStep);
  initFromConfig(config);
  onStep?.('signing_in');

  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const result = await signInWithCredential(_auth!, credential);

  localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  localStorage.setItem(FIREBASE_USER_KEY, JSON.stringify({
    email:       result.user.email,
    displayName: result.user.displayName,
  }));

  onStep?.('done');

  return {
    uid:         result.user.uid,
    email:       result.user.email,
    displayName: result.user.displayName,
    photoURL:    result.user.photoURL,
  };
}

/** Subscribe to auth state changes. */
export function onAuthChange(cb: (user: FirebaseUser | null) => void): () => void {
  if (!_auth) return () => {};
  return onAuthStateChanged(_auth, (u) => {
    cb(u ? { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL } : null);
  });
}

export async function signOut(): Promise<void> {
  try { await _auth?.signOut(); } catch { /* ignore */ }
  localStorage.removeItem(FIREBASE_CONFIG_KEY);
  localStorage.removeItem(FIREBASE_USER_KEY);
  const existing = getApps().find((a) => a.name === '[DEFAULT]');
  if (existing) {
    try { await deleteApp(existing); } catch { /* ignore */ }
  }
  _app = null; _auth = null; _db = null;
}

// ─── Firebase project auto-provisioning ──────────────────────────────────────
// Mirrors the mobile app's firebase-setup.ts exactly.

async function apiGet<T = unknown>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function apiPost<T = unknown>(url: string, token: string, body?: object): Promise<T> {
  const res = await fetch(url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function pollOperation(name: string, token: string, maxAttempts = 20, intervalMs = 3000): Promise<unknown> {
  for (let i = 0; i < maxAttempts; i++) {
    const op = await apiGet<{ done?: boolean; error?: unknown; response?: unknown }>(
      `https://firebase.googleapis.com/v1beta1/${name}`, token
    );
    if (op.done) {
      if (op.error) throw new Error(`Operation failed: ${JSON.stringify(op.error)}`);
      return op.response ?? op;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Firebase operation timed out');
}

async function findOrCreateFirebaseProject(
  accessToken: string,
  onStep?: (step: SetupStep) => void
): Promise<FirebaseWebConfig> {
  onStep?.('checking_projects');

  const projectsRes = await apiGet<{ results?: Array<{ displayName?: string; projectId?: string; name?: string; id?: string }> }>(
    'https://firebase.googleapis.com/v1beta1/projects?pageSize=100', accessToken
  );
  const projects = projectsRes.results ?? [];
  let project = projects.find((p) => (p.displayName ?? '').toLowerCase() === 'feelseen');

  if (!project) {
    onStep?.('creating_project');
    const suffix   = Date.now().toString(36).slice(-5);
    const createOp = await apiPost<{ name?: string; operationName?: string }>(
      'https://firebase.googleapis.com/v1beta1/projects',
      accessToken,
      { projectId: `feelseen-${suffix}`, displayName: 'FeelSeen' }
    );
    const opName = createOp.name ?? createOp.operationName ?? '';
    project = (await pollOperation(opName, accessToken)) as typeof project;
  }

  const projectId: string =
    (project as any).projectId ??
    (project as any).name?.split('/').pop() ??
    (project as any).id;

  onStep?.('registering_app');

  type WebApp = { appId?: string; name?: string; displayName?: string };
  let webApp: WebApp | null = null;
  try {
    const appsRes = await apiGet<{ apps?: WebApp[] }>(
      `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`, accessToken
    );
    const apps = appsRes.apps ?? [];
    webApp = apps.find((a) => (a?.displayName ?? '').toLowerCase() === 'feelseen') ?? apps[0] ?? null;
  } catch { /* no apps yet */ }

  if (!webApp) {
    const createAppOp = await apiPost<{ name?: string; operationName?: string }>(
      `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
      accessToken,
      { displayName: 'FeelSeen' }
    );
    const opName = createAppOp.name ?? createAppOp.operationName ?? '';
    webApp = (await pollOperation(opName, accessToken)) as WebApp;
  }

  const appId: string = webApp?.appId ?? webApp?.name?.split('/').pop() ?? '';

  onStep?.('fetching_config');

  const configRes = await apiGet<Partial<FirebaseWebConfig>>(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps/${appId}/config`,
    accessToken
  );

  onStep?.('enabling_auth');
  try {
    await apiPost(
      `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/identityPlatform:initializeAuth`,
      accessToken, {}
    );
  } catch { /* may already be enabled */ }

  return {
    apiKey:            configRes.apiKey            ?? '',
    authDomain:        configRes.authDomain        ?? `${projectId}.firebaseapp.com`,
    projectId:         configRes.projectId         ?? projectId,
    storageBucket:     configRes.storageBucket     ?? `${projectId}.appspot.com`,
    messagingSenderId: configRes.messagingSenderId ?? '',
    appId:             configRes.appId             ?? appId,
  };
}
