/**
 * firestore-sync.ts — two-way sync between IndexedDB and Firestore.
 *
 * DATA FORMAT COMPATIBILITY
 * ─────────────────────────
 * This file must produce and consume Firestore documents that are byte-for-byte
 * compatible with the React Native app's firestore-sync.ts. Key invariants:
 *
 *   symptom_fields documents:
 *     - `created_at`  → plain ISO string  (NOT a Timestamp)
 *     - `table_name`  → preserved unchanged (SQLite artefact; meaningless here
 *                        but the mobile restore code depends on it)
 *     - `options`     → JSON string or null  (mobile stores it serialised)
 *     - `input_type`  → snake_case string matching InputType
 *     - `lastModified`→ Firestore Timestamp
 *
 *   entries sub-collection (users/{uid}/symptom_fields/field_{id}/entries/entry_{id}):
 *     - `logged_at`   → "YYYY-MM-DD HH:MM:SS" local-time string
 *                        (mobile uses SQLite datetime() which is local time)
 *     - `value`       → plain string  (multi_select values are JSON arrays)
 *     - `lastModified`→ Firestore Timestamp
 *
 * CONFLICT STRATEGY
 * ─────────────────
 * 'local'  — upload local data to Firestore; on restore skip fields that
 *             already exist locally (local wins for fields; entries are merged
 *             by the composite key logged_at + "__" + value).
 * 'cloud'  — download and overwrite local fields; merge entries same as above.
 *
 * Two-way sync (default): upload first, then pull missing cloud data.
 */

import {
  collection,
  doc,
  getDocs,
  writeBatch,
  Timestamp,
  type WriteBatch,
} from 'firebase/firestore';
import { FIREBASE_DB, FIREBASE_AUTH, isFirebaseConfigured } from './firebase';
import { db } from './index';
import type { SymptomField } from '../types';
import { format } from 'date-fns';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getCurrentUserId(): string {
  if (!isFirebaseConfigured()) throw new Error('Firebase is not configured');
  const user = (FIREBASE_AUTH as any).currentUser;
  if (!user) throw new Error('User must be authenticated to sync data');
  return user.uid as string;
}

/** Convert an ISO datetime string to the "YYYY-MM-DD HH:MM:SS" format the
 *  mobile app writes into Firestore (SQLite datetime() format, local time). */
function toMobileLoggedAt(isoString: string): string {
  try {
    const d = new Date(isoString);
    return format(d, 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return isoString;
  }
}

/** Convert "YYYY-MM-DD HH:MM:SS" (mobile) back to an ISO string (web). */
function fromMobileLoggedAt(mobileStr: string): string {
  // Treat as local time (same as the mobile app does)
  if (mobileStr.includes('T')) return mobileStr; // already ISO
  return new Date(mobileStr.replace(' ', 'T')).toISOString();
}

/** Flush a Firestore write batch when it reaches 400 ops and return a new one. */
async function maybeFlushBatch(
  batch: WriteBatch,
  count: { n: number }
): Promise<WriteBatch> {
  if (count.n >= 400) {
    await batch.commit();
    count.n = 0;
    return writeBatch(FIREBASE_DB);
  }
  return batch;
}

/** Serialise a web SymptomField into the Firestore document the mobile app expects. */
function fieldToFirestore(field: SymptomField): Record<string, unknown> {
  // options: mobile stores as JSON string; web stores as object/array
  let optionsStr: string | null = null;
  if (field.options != null) {
    optionsStr =
      typeof field.options === 'string'
        ? field.options
        : JSON.stringify(field.options);
  } else if (field.sliderConfig != null) {
    optionsStr =
      typeof field.sliderConfig === 'string'
        ? field.sliderConfig
        : JSON.stringify(field.sliderConfig);
  }

  // table_name: derive a stable name from id + name (same pattern as mobile)
  const safeName = field.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  // Use the field's createdAt timestamp in millis for uniqueness (same as mobile)
  const tsMillis = field.createdAt
    ? new Date(field.createdAt).getTime()
    : Date.now();
  const tableName = `sf_${safeName}_${tsMillis}`;

  return {
    id: field.id,
    user_id: 1,
    name: field.name,
    input_type: field.inputType,
    options: optionsStr,
    category_id: field.categoryId ?? null,
    color: field.color,
    table_name: tableName,
    created_at: field.createdAt, // plain ISO string — intentional
    lastModified: Timestamp.now(),
  };
}

/** Parse a Firestore symptom_fields document into a web SymptomField. */
function fieldFromFirestore(data: Record<string, unknown>, docId: string): Partial<SymptomField> {
  // Parse options/sliderConfig from the JSON string the mobile app stores
  let options: SymptomField['options'] = undefined;
  let sliderConfig: SymptomField['sliderConfig'] = undefined;
  const inputType = data.input_type as SymptomField['inputType'];
  const rawOptions = data.options as string | null;

  if (rawOptions) {
    try {
      const parsed = JSON.parse(rawOptions);
      if (inputType === 'slider') {
        sliderConfig = parsed;
      } else {
        // single_select / multi_select
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'object') {
            options = parsed; // already [{label, value?}]
          } else {
            options = (parsed as string[]).map((l) => ({ label: l }));
          }
        } else {
          options = [];
        }
      }
    } catch {
      options = [];
    }
  }

  // Extract id from docId ("field_5" → 5) if not in data
  const id = (data.id as number | undefined) ?? parseInt(docId.replace('field_', ''), 10);

  return {
    id,
    name: data.name as string,
    inputType,
    options,
    sliderConfig,
    color: (data.color as string) || '#a5a5df',
    categoryId: (data.category_id as number | undefined) ?? undefined,
    createdAt: (data.created_at as string) || new Date().toISOString(),
    isSystem: false,
  };
}

// ─── BACKUP (local → Firestore) ───────────────────────────────────────────────

export async function backupToFirestore(): Promise<void> {
  const uid = getCurrentUserId();
  const fields = await db.symptomFields.toArray();

  let batch = writeBatch(FIREBASE_DB);
  const count = { n: 0 };

  for (const field of fields) {
    if (!field.id) continue;

    // Write the field document
    const fieldRef = doc(
      FIREBASE_DB,
      `users/${uid}/symptom_fields`,
      `field_${field.id}`
    );
    batch.set(fieldRef, fieldToFirestore(field));
    count.n++;
    batch = await maybeFlushBatch(batch, count);

    // Write all entries for this field
    const entries = await db.fieldEntries
      .where('fieldId')
      .equals(field.id)
      .toArray();

    for (const entry of entries) {
      if (!entry.id) continue;
      const entryRef = doc(
        FIREBASE_DB,
        `users/${uid}/symptom_fields/field_${field.id}/entries`,
        `entry_${entry.id}`
      );
      batch.set(entryRef, {
        id: entry.id,
        field_id: field.id,
        value: entry.value,
        logged_at: toMobileLoggedAt(entry.loggedAt),
        lastModified: Timestamp.now(),
      });
      count.n++;
      batch = await maybeFlushBatch(batch, count);
    }
  }

  // Write sync metadata
  const metaRef = doc(FIREBASE_DB, 'syncMetadata', uid);
  batch.set(metaRef, {
    userId: uid,
    lastSyncTime: Timestamp.now(),
    syncStatus: 'completed',
  });
  count.n++;

  if (count.n > 0) await batch.commit();
}

// ─── RESTORE (Firestore → local) ──────────────────────────────────────────────

export async function restoreFromFirestore(
  strategy: 'local' | 'cloud' = 'local'
): Promise<void> {
  const uid = getCurrentUserId();

  const fieldsSnapshot = await getDocs(
    collection(FIREBASE_DB, `users/${uid}/symptom_fields`)
  );

  for (const fieldDoc of fieldsSnapshot.docs) {
    const data = fieldDoc.data() as Record<string, unknown>;
    const remoteField = fieldFromFirestore(data, fieldDoc.id);
    if (!remoteField.id || !remoteField.name || !remoteField.inputType) continue;

    const existingField = await db.symptomFields.get(remoteField.id);

    if (existingField && strategy === 'local') {
      // Local wins — don't overwrite the field definition,
      // but still pull in any remote entries that are missing locally.
    } else if (existingField && strategy === 'cloud') {
      // Cloud wins — update local field
      await db.symptomFields.update(remoteField.id, {
        name: remoteField.name,
        inputType: remoteField.inputType,
        options: remoteField.options,
        sliderConfig: remoteField.sliderConfig,
        color: remoteField.color,
        categoryId: remoteField.categoryId,
      });
    } else if (!existingField) {
      // Field doesn't exist locally — create it
      await db.symptomFields.put({
        ...(remoteField as SymptomField),
        id: remoteField.id,
      });
    }

    // Pull entries (always merge — dedup by logged_at + value)
    const entriesSnapshot = await getDocs(
      collection(
        FIREBASE_DB,
        `users/${uid}/symptom_fields/field_${remoteField.id}/entries`
      )
    );

    const localEntries = await db.fieldEntries
      .where('fieldId')
      .equals(remoteField.id)
      .toArray();

    // Build dedup set: logged_at (normalized) + "__" + value
    const existingKeys = new Set(
      localEntries.map((e) => `${toMobileLoggedAt(e.loggedAt)}__${e.value}`)
    );

    for (const entryDoc of entriesSnapshot.docs) {
      const ed = entryDoc.data() as {
        id?: number;
        field_id?: number;
        value?: string;
        logged_at?: string;
      };
      if (!ed.logged_at || ed.value === undefined) continue;

      const key = `${ed.logged_at}__${ed.value}`;
      if (existingKeys.has(key)) continue; // already have this entry

      await db.fieldEntries.add({
        fieldId: remoteField.id,
        value: ed.value,
        loggedAt: fromMobileLoggedAt(ed.logged_at),
      });
      existingKeys.add(key);
    }
  }
}

// ─── TWO-WAY SYNC (default) ───────────────────────────────────────────────────

export async function syncWithFirestore(
  strategy: 'local' | 'cloud' = 'local'
): Promise<void> {
  await backupToFirestore();
  await restoreFromFirestore(strategy);
}
