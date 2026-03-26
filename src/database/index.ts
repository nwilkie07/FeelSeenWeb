import Dexie, { type Table } from 'dexie';
import type {
  SymptomField,
  FieldEntry,
  Form,
  FormField,
  AppSetting,
} from '../types';

class FeelSeenDB extends Dexie {
  symptomFields!: Table<SymptomField, number>;
  fieldEntries!: Table<FieldEntry, number>;
  forms!: Table<Form, number>;
  formFields!: Table<FormField, number>;
  appSettings!: Table<AppSetting, string>;

  constructor() {
    super('FeelSeenDB');
    this.version(1).stores({
      symptomFields: '++id, name, inputType, color, createdAt, isSystem',
      fieldEntries: '++id, fieldId, loggedAt, [fieldId+loggedAt]',
      forms: '++id, name, color, createdAt',
      formFields: '++id, formId, fieldId, sortOrder',
      appSettings: 'key',
    });
  }
}

export const db = new FeelSeenDB();

// ---- SymptomFields ----

export async function getSymptomFields(): Promise<SymptomField[]> {
  return db.symptomFields.orderBy('createdAt').reverse().toArray();
}

export async function getUserSymptomFields(): Promise<SymptomField[]> {
  return db.symptomFields
    .filter((f) => !f.isSystem)
    .reverse()
    .sortBy('createdAt');
}

export async function getAllSymptomFields(): Promise<SymptomField[]> {
  return db.symptomFields.orderBy('createdAt').reverse().toArray();
}

export async function getSystemFields(): Promise<SymptomField[]> {
  const all = await db.symptomFields.orderBy('createdAt').reverse().toArray();
  return all.filter(f => f.isSystem === true);
}

export async function createSymptomField(
  field: Omit<SymptomField, 'id'>
): Promise<number> {
  return db.symptomFields.add(field);
}

export async function updateSymptomField(
  id: number,
  updates: Partial<SymptomField>
): Promise<void> {
  await db.symptomFields.update(id, updates);
}

export async function deleteSymptomField(id: number): Promise<void> {
  await db.transaction('rw', db.symptomFields, db.fieldEntries, db.formFields, async () => {
    await db.symptomFields.delete(id);
    await db.fieldEntries.where('fieldId').equals(id).delete();
    await db.formFields.where('fieldId').equals(id).delete();
  });
}

export async function getSymptomFieldById(id: number): Promise<SymptomField | undefined> {
  return db.symptomFields.get(id);
}

// ---- FieldEntries ----

export async function logFieldEntry(
  fieldId: number,
  value: string,
  date?: string
): Promise<number> {
  const now = date
    ? new Date(date + 'T12:00:00').toISOString()
    : new Date().toISOString();
  return db.fieldEntries.add({ fieldId, value, loggedAt: now });
}

export async function getFieldEntries(
  fieldId: number,
  startDate?: string,
  endDate?: string
): Promise<FieldEntry[]> {
  const entries = await db.fieldEntries.where('fieldId').equals(fieldId).sortBy('loggedAt');
  if (startDate || endDate) {
    return entries.filter((e) => {
      if (startDate && e.loggedAt < startDate) return false;
      if (endDate && e.loggedAt > endDate) return false;
      return true;
    });
  }
  return entries;
}

export async function getFieldEntriesForDate(
  fieldId: number,
  date: string
): Promise<FieldEntry[]> {
  // Use local date comparison
  const all = await db.fieldEntries.where('fieldId').equals(fieldId).sortBy('loggedAt');
  return all.filter((e) => {
    const entryDate = e.loggedAt.slice(0, 10);
    return entryDate === date;
  });
}

export async function getAllEntriesForDate(date: string): Promise<Map<number, FieldEntry[]>> {
  const all = await db.fieldEntries.toArray();
  const map = new Map<number, FieldEntry[]>();
  for (const entry of all) {
    const entryDate = entry.loggedAt.slice(0, 10);
    if (entryDate === date) {
      const existing = map.get(entry.fieldId) || [];
      existing.push(entry);
      map.set(entry.fieldId, existing);
    }
  }
  return map;
}

export async function deleteFieldEntry(entryId: number): Promise<void> {
  await db.fieldEntries.delete(entryId);
}

export async function getAllEntries(): Promise<FieldEntry[]> {
  return db.fieldEntries.orderBy('loggedAt').toArray();
}

export async function getEntriesInRange(
  startDate: string,
  endDate: string
): Promise<FieldEntry[]> {
  const all = await db.fieldEntries.orderBy('loggedAt').toArray();
  return all.filter((e) => {
    const d = e.loggedAt.slice(0, 10);
    return d >= startDate && d <= endDate;
  });
}

// ---- Forms ----

export async function getForms(): Promise<Form[]> {
  return db.forms.orderBy('createdAt').toArray();
}

export async function createForm(form: Omit<Form, 'id'>): Promise<number> {
  return db.forms.add(form);
}

export async function updateForm(id: number, updates: Partial<Form>): Promise<void> {
  await db.forms.update(id, updates);
}

export async function deleteForm(id: number): Promise<void> {
  await db.transaction('rw', db.forms, db.formFields, async () => {
    await db.forms.delete(id);
    await db.formFields.where('formId').equals(id).delete();
  });
}

export async function getFormsWithFields(): Promise<
  Array<Form & { fields: SymptomField[] }>
> {
  const forms = await getForms();
  const result = [];
  for (const form of forms) {
    const formFieldRows = await db.formFields
      .where('formId')
      .equals(form.id!)
      .sortBy('sortOrder');
    const fields: SymptomField[] = [];
    for (const ff of formFieldRows) {
      const field = await db.symptomFields.get(ff.fieldId);
      if (field) fields.push(field);
    }
    result.push({ ...form, fields });
  }
  return result;
}

export async function setFormFields(
  formId: number,
  fieldIds: number[]
): Promise<void> {
  await db.transaction('rw', db.formFields, async () => {
    await db.formFields.where('formId').equals(formId).delete();
    for (let i = 0; i < fieldIds.length; i++) {
      await db.formFields.add({ formId, fieldId: fieldIds[i], sortOrder: i });
    }
  });
}

// ---- AppSettings ----

export async function getAppSetting(key: string): Promise<string | undefined> {
  const row = await db.appSettings.get(key);
  return row?.value;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await db.appSettings.put({ key, value });
}

// ---- Export ----

export async function exportAsCSV(): Promise<string> {
  const fields = await getSymptomFields();
  const entries = await getAllEntries();
  const fieldMap = new Map(fields.map((f) => [f.id!, f]));

  const rows = entries.map((e) => {
    const field = fieldMap.get(e.fieldId);
    return [
      field?.name || `field_${e.fieldId}`,
      field?.inputType || '',
      e.value,
      e.loggedAt,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
  });

  return ['symptom_name,input_type,value,logged_at', ...rows].join('\n');
}

// Convert an ISO datetime string (web) → "YYYY-MM-DD HH:MM:SS" local time (mobile)
function toMobileLoggedAt(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

// Derive a mobile-compatible table_name from a field id + name.
// Pattern: sf_<sanitised_name>_<id>  (all lowercase, non-alphanum → _, no leading/trailing _)
function toTableName(id: number, name: string): string {
  const sanitised = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `sf_${sanitised}_${id}`;
}

export async function exportAsJSON(): Promise<string> {
  const fields = await db.symptomFields.toArray();
  const allEntries = await db.fieldEntries.toArray();

  // ── symptom_fields: convert web camelCase → mobile snake_case row format ──
  const symptomFields = fields.map((f) => {
    // Re-serialise options back to a JSON string (how mobile stores them)
    let optionsStr: string | null = null;
    if (f.sliderConfig) {
      optionsStr = JSON.stringify(f.sliderConfig);
    } else if (f.options && f.options.length > 0) {
      optionsStr = JSON.stringify(f.options.map((o) =>
        o.value !== undefined ? { label: o.label, value: o.value } : o.label
      ));
    }

    return {
      id: f.id!,
      user_id: 1,
      name: f.name,
      input_type: f.inputType,
      options: optionsStr,
      category_id: f.categoryId ?? null,
      color: f.color,
      table_name: toTableName(f.id!, f.name),
      created_at: toMobileLoggedAt(f.createdAt),
    };
  });

  // ── field_entries: group by table_name, convert loggedAt → local datetime ──
  const fieldEntries: Record<string, { id: number; value: string; logged_at: string }[]> = {};

  // Build fieldId → table_name lookup
  const fieldIdToTableName = new Map(symptomFields.map((f) => [f.id, f.table_name]));

  for (const entry of allEntries) {
    const tableName = fieldIdToTableName.get(entry.fieldId);
    if (!tableName) continue;
    if (!fieldEntries[tableName]) fieldEntries[tableName] = [];
    fieldEntries[tableName].push({
      id: entry.id!,
      value: entry.value,
      logged_at: toMobileLoggedAt(entry.loggedAt),
    });
  }

  // ── Static tables required by mobile importDatabase() ─────────────────────
  const now = toMobileLoggedAt(new Date().toISOString());

  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    tables: {
      users: [
        { id: 1, email: 'user@feelseen.app', password: '', created_at: now },
      ],
      symptom_categories: [
        { id: 1, name: 'Medical',  color: '#a5dfa5', created_at: now },
        { id: 2, name: 'Emotion',  color: '#dfa5df', created_at: now },
        { id: 3, name: 'Physical', color: '#dfa5a5', created_at: now },
        { id: 4, name: 'Mental',   color: '#a5a5df', created_at: now },
      ],
      symptoms: [],
      symptom_logs: [],
      symptom_fields: symptomFields,
      schema_migrations: [
        { id: '001_widen_input_type_check',    ran_at: now },
        { id: '002_create_health_integrations', ran_at: now },
        { id: '003_create_app_settings',        ran_at: now },
        { id: '004_add_yes_no_input_type',      ran_at: now },
        { id: '005_health_connect_migration',   ran_at: now },
        { id: '006_create_forms',               ran_at: now },
      ],
      field_entries: fieldEntries,
    },
  };

  return JSON.stringify(backup, null, 2);
}

// ─── Mobile backup format translator ────────────────────────────────────────
// The mobile app (React Native / SQLite) exports a different shape:
//   { version, exported_at, tables: { symptom_fields[], field_entries: { [table_name]: entry[] } } }
// This function normalises it into the web format.

function normaliseMobileBackup(data: Record<string, any>): {
  fields: SymptomField[];
  entries: FieldEntry[];
  forms: Form[];
  formFields: FormField[];
  settings: AppSetting[];
} {
  const tables = data.tables ?? {};

  // ── Symptom fields ──────────────────────────────────────────────────────────
  const rawFields: any[] = tables.symptom_fields ?? [];

  // Build a lookup: table_name → fieldId (used to attach entries)
  const tableNameToId = new Map<string, number>();

  const fields: SymptomField[] = rawFields.map((f: any) => {
    tableNameToId.set(f.table_name, f.id);

    // Parse options: mobile stores them as JSON strings
    let options: SymptomField['options'] = undefined;
    let sliderConfig: SymptomField['sliderConfig'] = undefined;

    if (f.options) {
      try {
        const parsed = typeof f.options === 'string' ? JSON.parse(f.options) : f.options;
        if (Array.isArray(parsed)) {
          // single_select / multi_select
          // Two formats: plain strings ["Low","High"] or objects [{label,value}]
          options = parsed.map((o: any) =>
            typeof o === 'string' ? { label: o } : { label: String(o.label), value: o.value }
          );
        } else if (typeof parsed === 'object' && parsed !== null) {
          if ('min' in parsed) {
            // slider config: {"min":0,"max":10,"step":1}
            sliderConfig = { min: parsed.min ?? 0, max: parsed.max ?? 10, step: parsed.step ?? 1 };
          }
          // number_input unit config {"unit":"kg"} — web has no unit field, safely ignored
        }
      } catch {
        // unparseable options — skip
      }
    }

    // Map snake_case → camelCase, mobile inputType names are already compatible
    const field: SymptomField = {
      id: f.id,
      name: f.name,
      inputType: f.input_type as SymptomField['inputType'],
      color: f.color ?? '#a5a5df',
      categoryId: f.category_id ?? undefined,
      createdAt: f.created_at
        ? new Date(f.created_at.replace(' ', 'T') + 'Z').toISOString()
        : new Date().toISOString(),
      isSystem: false,
    };
    if (options) field.options = options;
    if (sliderConfig) field.sliderConfig = sliderConfig;
    return field;
  });

  // ── Field entries ───────────────────────────────────────────────────────────
  // Mobile format: field_entries is an object { [table_name]: [{id, value, logged_at}] }
  const rawEntries: Record<string, any[]> = tables.field_entries ?? {};
  const entries: FieldEntry[] = [];

  // Entry IDs can collide across tables in mobile (each table has its own auto-increment).
  // Re-assign sequential IDs for the web DB.
  let entryId = 1;

  for (const [tableName, tableEntries] of Object.entries(rawEntries)) {
    const fieldId = tableNameToId.get(tableName);
    if (fieldId == null) continue; // orphaned table, skip

    for (const e of tableEntries) {
      // logged_at is "YYYY-MM-DD HH:MM:SS" in the device's LOCAL timezone (not UTC).
      // Parsing without a timezone suffix treats it as local time, which is correct.
      const loggedAt = e.logged_at
        ? new Date(e.logged_at.replace(' ', 'T')).toISOString()
        : new Date().toISOString();

      // yes_no: mobile may store "Yes"/"No" (capitalised) or "yes"/"no".
      // Web compares against lowercase, so normalise.
      let value = String(e.value);
      if (value === 'Yes') value = 'yes';
      else if (value === 'No') value = 'no';

      entries.push({ id: entryId++, fieldId, value, loggedAt });
    }
  }

  return { fields, entries, forms: [], formFields: [], settings: [] };
}

export async function importFromJSON(json: string): Promise<void> {
  const data = JSON.parse(json);

  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid backup file: not a JSON object');
  }

  // Detect format: mobile backup has a "tables" key; web backup has "fields"
  const isMobileFormat = 'tables' in data && !('fields' in data);

  const normalised = isMobileFormat
    ? normaliseMobileBackup(data)
    : {
        fields:     data.fields     ?? [],
        entries:    data.entries    ?? [],
        forms:      data.forms      ?? [],
        formFields: data.formFields ?? [],
        settings:   data.settings   ?? [],
      };

  const tables = [db.symptomFields, db.fieldEntries, db.forms, db.formFields, db.appSettings];
  await db.transaction('rw', tables, async () => {
    await db.symptomFields.clear();
    await db.fieldEntries.clear();
    await db.forms.clear();
    await db.formFields.clear();
    await db.appSettings.clear();

    if (normalised.fields.length)     await db.symptomFields.bulkPut(normalised.fields);
    if (normalised.entries.length)    await db.fieldEntries.bulkPut(normalised.entries);
    if (normalised.forms.length)      await db.forms.bulkPut(normalised.forms);
    if (normalised.formFields.length) await db.formFields.bulkPut(normalised.formFields);
    if (normalised.settings.length)   await db.appSettings.bulkPut(normalised.settings);
  });
}
