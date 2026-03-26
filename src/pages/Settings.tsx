import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportAsCSV, exportAsJSON, importFromJSON } from '../database';
import {
  isFirebaseConfigured,
  getCurrentUser,
  getSavedUser,
  startGoogleOAuth,
  signOut as firebaseSignOut,
  loadSavedFirebaseConfig,
  type FirebaseUser,
} from '../database/firebase';
import { syncManager, type SyncState } from '../database/sync-manager';
import { getWeatherEnabled } from '../database/weather-sync';
import WeatherModal from '../components/WeatherModal';
import {
  IoCloudOutline,
  IoCloudDoneOutline,
  IoDownloadOutline,
  IoFolderOpenOutline,
  IoInformationCircleOutline,
  IoLogOutOutline,
  IoRefreshOutline,
  IoLogoGoogle,
  IoRainyOutline,
  IoShieldCheckmarkOutline,
  IoDocumentTextOutline,
  IoMailOutline,
  IoChevronForwardOutline,
} from 'react-icons/io5';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle', lastSyncTime: null, lastError: null });
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Load persisted Firebase config on mount
  useEffect(() => {
    loadSavedFirebaseConfig().then((ok) => {
      if (ok) {
        const u = getCurrentUser();
        setUser(u);
        syncManager.start();
      }
    });
    // Subscribe to sync state changes
    const unsub = syncManager.subscribe(setSyncState);
    return unsub;
  }, []);

  // Load weather state
  useEffect(() => {
    getWeatherEnabled().then(setWeatherEnabled);
  }, []);

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Google sign-in ───────────────────────────────────────────────────────

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await startGoogleOAuth();
      // Page will redirect — no further code runs here
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sign-in failed', true);
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!confirm('Sign out and disconnect cloud sync?')) return;
    syncManager.stop();
    await firebaseSignOut();
    setUser(null);
    showToast('Signed out');
  };

  // ─── Manual sync actions ──────────────────────────────────────────────────

  const handleSync = async () => {
    if (!isFirebaseConfigured()) return;
    await syncManager.sync();
    if (syncManager.getState().status === 'success') showToast('Sync complete');
    else showToast(syncManager.getState().lastError ?? 'Sync failed', true);
  };

  const handleManualRestore = async () => {
    if (!isFirebaseConfigured()) return;
    if (!confirm('Pull all data from the cloud? Local data that exists only on this device will be kept, but cloud data will be added.')) return;
    const result = await syncManager.restore();
    if (result.status === 'success') showToast('Restore complete — please refresh');
    else showToast(result.lastError ?? 'Restore failed', true);
  };

  // ─── Local export / import ────────────────────────────────────────────────

  const handleExportCSV = async () => {
    try {
      const csv = await exportAsCSV();
      downloadFile(csv, 'feelseen-export.csv', 'text/csv');
      showToast('CSV exported');
    } catch {
      showToast('Export failed', true);
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportAsJSON();
      downloadFile(json, 'feelseen-backup.json', 'application/json');
      showToast('Backup exported');
    } catch {
      showToast('Export failed', true);
    }
  };

  const handleImportBackup = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!confirm('This will replace ALL your current data with the backup. Continue?')) return;
      try {
        const text = await file.text();
        await importFromJSON(text);
        showToast('Backup restored — please refresh the page');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Import failed: ${msg}`, true);
      }
    };
    input.click();
  };

  // ─── derived state ────────────────────────────────────────────────────────

  const savedUser = getSavedUser();
  const displayName = user?.displayName ?? savedUser?.displayName ?? null;
  const email = user?.email ?? savedUser?.email ?? null;
  const isSyncing = syncState.status === 'syncing';
  const isConnected = isFirebaseConfigured() && (user != null || savedUser != null);

  const syncLabel = (() => {
    if (isSyncing) return 'Syncing…';
    if (syncState.status === 'error') return `Sync error: ${syncState.lastError}`;
    if (syncState.lastSyncTime) {
      return `Last synced ${syncState.lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Not synced yet';
  })();

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'white', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
          Settings
        </h1>

        {/* Toast */}
        {toast && (
          <div
            style={{
              background: toast.error ? '#fde8e8' : '#d4edda',
              color: toast.error ? '#c62828' : '#2e7d32',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '14px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <IoInformationCircleOutline size={16} />
            {toast.msg}
          </div>
        )}

        {/* Cloud Sync */}
        <SettingsCard
          icon={
            isConnected
              ? <IoCloudDoneOutline size={22} color="#2e7d32" />
              : <IoCloudOutline size={22} color="#666" />
          }
          title="Cloud Sync"
          description={
            isConnected
              ? 'Syncing with your Firebase account'
              : 'Sign in with Google to sync between the web app and the FeelSeen mobile app.'
          }
        >
          {isConnected ? (
            <div style={{ marginTop: '10px' }}>
              {/* User info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: '#edf7ee',
                  borderRadius: '10px',
                  marginBottom: '10px',
                  border: '1px solid #c3e6cb',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#a5a5df',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                >
                  {(displayName?.[0] ?? email?.[0] ?? '?').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {displayName && (
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </div>
                  )}
                  {email && (
                    <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    background: isSyncing ? '#fff3cd' : '#d4edda',
                    color: isSyncing ? '#856404' : '#2e7d32',
                    borderRadius: '20px',
                    padding: '3px 10px',
                    fontWeight: '600',
                    flexShrink: 0,
                  }}
                >
                  {isSyncing ? 'Syncing' : 'Connected'}
                </span>
              </div>

              {/* Sync status */}
              <p style={{ fontSize: '12px', color: syncState.status === 'error' ? '#c62828' : '#888', marginBottom: '10px' }}>
                {syncLabel}
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #ddd',
                    background: 'white',
                    cursor: isSyncing ? 'default' : 'pointer',
                    fontSize: '13px',
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: isSyncing ? 0.6 : 1,
                  }}
                >
                  <IoRefreshOutline size={14} />
                  Sync Now
                </button>
                <button
                  onClick={handleManualRestore}
                  disabled={isSyncing}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #ddd',
                    background: 'white',
                    cursor: isSyncing ? 'default' : 'pointer',
                    fontSize: '13px',
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: isSyncing ? 0.6 : 1,
                  }}
                >
                  <IoDownloadOutline size={14} />
                  Pull from Cloud
                </button>
                <button
                  onClick={handleSignOut}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #fcc',
                    background: 'white',
                    cursor: 'pointer',
                    color: '#d32f2f',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IoLogOutOutline size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '10px' }}>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px', lineHeight: '1.5' }}>
                Sign in with the same Google account you use on the mobile app.
                Your Firebase project is set up automatically — no configuration needed.
              </p>
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1.5px solid #e0e0e0',
                  background: 'white',
                  cursor: signingIn ? 'default' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  opacity: signingIn ? 0.6 : 1,
                }}
              >
                <IoLogoGoogle size={18} color="#4285F4" />
                {signingIn ? 'Redirecting…' : 'Sign in with Google'}
              </button>
            </div>
          )}
        </SettingsCard>

        {/* Weather Tracking */}
        <SettingsCard
          icon={<IoRainyOutline size={22} color="#5dade2" />}
          title="Weather Tracking"
          description={weatherEnabled ? 'Automatic daily weather sync (Canada only)' : 'Disabled'}
        >
          <button
            onClick={() => setShowWeatherModal(true)}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              border: 'none',
              background: weatherEnabled ? '#5dade2' : '#ddd',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              marginTop: '8px',
            }}
          >
            Configure Weather
          </button>
        </SettingsCard>

        {/* Export CSV */}
        <SettingsCard
          icon={<IoDownloadOutline size={22} color="#666" />}
          title="Export Data"
          description="Download all your logged entries as a CSV file."
        >
          <button
            onClick={handleExportCSV}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              border: 'none',
              background: '#a5a5df',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              marginTop: '8px',
            }}
          >
            Export as CSV
          </button>
        </SettingsCard>

        {/* Backup & Restore */}
        <SettingsCard
          icon={<IoFolderOpenOutline size={22} color="#666" />}
          title="Backup & Restore"
          description="Export your full database or restore from a previous backup."
        >
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={handleExportBackup}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid #ddd',
                background: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#333',
              }}
            >
              Export Backup
            </button>
            <button
              onClick={handleImportBackup}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid #fcc',
                background: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#d32f2f',
              }}
            >
              Import & Restore
            </button>
          </div>
        </SettingsCard>

        {/* About */}
        <SettingsCard
          icon={<IoInformationCircleOutline size={22} color="#666" />}
          title="About"
          description=""
        >
          <div style={{ marginTop: '6px' }}>
            <Row label="Version" value="1.0.0" />
            <Row label="Storage" value="Browser (IndexedDB)" />
            <Row label="Sync" value={isConnected ? 'Firestore (every 5 min)' : 'Off'} />
            <p style={{ fontSize: '12px', color: '#aaa', marginTop: '10px' }}>
              FeelSeen Web — a responsive recreation of the FeelSeen mobile app. Your health data stays private on your device.
            </p>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <LinkRow
                icon={<IoShieldCheckmarkOutline size={16} color="#a5a5df" />}
                label="Privacy Policy"
                onClick={() => navigate('/privacy')}
              />
              <LinkRow
                icon={<IoDocumentTextOutline size={16} color="#a5a5df" />}
                label="Terms of Service"
                onClick={() => navigate('/terms')}
              />
              <LinkRow
                icon={<IoMailOutline size={16} color="#a5a5df" />}
                label="Contact & Support"
                onClick={() => navigate('/contact')}
              />
            </div>
          </div>
        </SettingsCard>
      </div>
      <WeatherModal isOpen={showWeatherModal} onClose={() => setShowWeatherModal(false)} />
    </div>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ background: '#f8f8f8', borderRadius: '14px', padding: '14px 16px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ marginTop: '2px' }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: description ? '4px' : '0' }}>
            {title}
          </div>
          {description && <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{description}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ fontSize: '13px', color: '#666' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#333', fontWeight: '600' }}>{value}</span>
    </div>
  );
}

function LinkRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '9px 10px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {icon}
      <span style={{ flex: 1, fontSize: '13px', color: '#333' }}>{label}</span>
      <IoChevronForwardOutline size={14} color="#bbb" />
    </button>
  );
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
