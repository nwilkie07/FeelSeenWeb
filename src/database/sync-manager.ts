/**
 * sync-manager.ts — background auto-sync coordinator.
 *
 * Mirrors the mobile app's sync-manager.ts:
 *   - Runs syncWithFirestore() every 5 minutes when Firebase is configured.
 *   - Exposes manual backup(), restore(), and sync() methods.
 *   - Serialises concurrent syncs via an isSyncing lock.
 *   - Retries up to 3 times with a 2-second delay on failure.
 */

import { isFirebaseConfigured } from './firebase';
import { syncWithFirestore, backupToFirestore, restoreFromFirestore } from './firestore-sync';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  lastError: string | null;
}

type SyncListener = (state: SyncState) => void;

class SyncManager {
  private isSyncing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private state: SyncState = { status: 'idle', lastSyncTime: null, lastError: null };
  private listeners: Set<SyncListener> = new Set();

  private readonly INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  private emit() {
    for (const l of this.listeners) l({ ...this.state });
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  getState(): SyncState {
    return { ...this.state };
  }

  /** Start the background auto-sync interval. Call this after Firebase is configured. */
  start(): void {
    if (this.intervalId) return; // already running
    this.intervalId = setInterval(() => {
      if (!this.isSyncing && isFirebaseConfigured()) {
        this.performSync('local').catch(() => {});
      }
    }, this.INTERVAL_MS);

    // Trigger an immediate sync when starting
    if (isFirebaseConfigured()) {
      this.performSync('local').catch(() => {});
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async performSync(strategy: 'local' | 'cloud'): Promise<SyncState> {
    if (this.isSyncing) return this.state;
    if (!isFirebaseConfigured()) return this.state;

    this.isSyncing = true;
    this.state = { status: 'syncing', lastSyncTime: this.state.lastSyncTime, lastError: null };
    this.emit();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await syncWithFirestore(strategy);
        this.state = { status: 'success', lastSyncTime: new Date(), lastError: null };
        this.emit();
        this.isSyncing = false;
        return this.state;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, this.RETRY_DELAY_MS));
        }
      }
    }

    this.state = {
      status: 'error',
      lastSyncTime: this.state.lastSyncTime,
      lastError: lastError?.message ?? 'Unknown error',
    };
    this.emit();
    this.isSyncing = false;
    return this.state;
  }

  /** Manual: upload local data to Firestore. */
  async backup(): Promise<SyncState> {
    if (this.isSyncing) return this.state;
    if (!isFirebaseConfigured()) {
      this.state = { ...this.state, status: 'error', lastError: 'Firebase not configured' };
      this.emit();
      return this.state;
    }

    this.isSyncing = true;
    this.state = { status: 'syncing', lastSyncTime: this.state.lastSyncTime, lastError: null };
    this.emit();

    try {
      await backupToFirestore();
      this.state = { status: 'success', lastSyncTime: new Date(), lastError: null };
    } catch (err) {
      this.state = {
        status: 'error',
        lastSyncTime: this.state.lastSyncTime,
        lastError: err instanceof Error ? err.message : String(err),
      };
    }

    this.emit();
    this.isSyncing = false;
    return this.state;
  }

  /** Manual: pull data from Firestore, cloud wins. */
  async restore(): Promise<SyncState> {
    if (this.isSyncing) return this.state;
    if (!isFirebaseConfigured()) {
      this.state = { ...this.state, status: 'error', lastError: 'Firebase not configured' };
      this.emit();
      return this.state;
    }

    this.isSyncing = true;
    this.state = { status: 'syncing', lastSyncTime: this.state.lastSyncTime, lastError: null };
    this.emit();

    try {
      await restoreFromFirestore('cloud');
      this.state = { status: 'success', lastSyncTime: new Date(), lastError: null };
    } catch (err) {
      this.state = {
        status: 'error',
        lastSyncTime: this.state.lastSyncTime,
        lastError: err instanceof Error ? err.message : String(err),
      };
    }

    this.emit();
    this.isSyncing = false;
    return this.state;
  }

  /** Manual: two-way sync (upload then pull missing). */
  async sync(): Promise<SyncState> {
    return this.performSync('local');
  }
}

// Singleton — one sync manager for the entire app
export const syncManager = new SyncManager();
