import { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import type { FieldEntry, SymptomField, FormWithFields } from '../types';
import {
  getAllEntriesForDate,
  getFieldEntriesForDate,
  getAllSymptomFields,
  getFormsWithFields,
} from '../database';
import { syncManager } from '../database/sync-manager';
import { isFirebaseConfigured } from '../database/firebase';
import { formatEntryValue, formatEntryTime, hexToRgba, getTodayString } from '../utils/entryUtils';
import { format } from 'date-fns';
import { getWeatherEnabled } from '../database/weather-sync';
import WeatherCard from '../components/WeatherCard';
import LogEntryModal from '../components/LogEntryModal';
import LogAllModal from '../components/LogAllModal';
import EntriesModal from '../components/EntriesModal';
import {
  IoChevronDown,
  IoChevronUp,
  IoAdd,
  IoMedkitOutline,
} from 'react-icons/io5';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [showCalendar, setShowCalendar] = useState(false);
  const [fields, setFields] = useState<SymptomField[]>([]);
  const [forms, setForms] = useState<FormWithFields[]>([]);
  const [entriesMap, setEntriesMap] = useState<Map<number, FieldEntry[]>>(new Map());
  const [expandedFields, setExpandedFields] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // Modals
  const [logField, setLogField] = useState<SymptomField | null>(null);
  const [viewEntriesField, setViewEntriesField] = useState<SymptomField | null>(null);
  const [viewEntries, setViewEntries] = useState<FieldEntry[]>([]);
  const [showLogAll, setShowLogAll] = useState(false);

  // Separate user fields and system fields for display
  const systemFields = fields.filter(f => f.isSystem);
  const weatherFields = systemFields.filter(f => f.name.startsWith('Weather - '));

  const loadData = useCallback(async () => {
    try {
      const [weatherEnabled, allFields, fm, entries] = await Promise.all([
        getWeatherEnabled(),
        getAllSymptomFields(),
        getFormsWithFields(),
        getAllEntriesForDate(selectedDate),
      ]);
      const userF = allFields.filter(field => !field.isSystem);
      const systemF = weatherEnabled ? allFields.filter(field => field.isSystem && field.name.startsWith('Weather - ')) : [];
      setFields([...userF, ...systemF]);
      setForms(fm);
      setEntriesMap(entries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  /** Reload local data then kick off a background sync if Firebase is configured. */
  const loadDataAndSync = useCallback(async () => {
    await loadData();
    if (isFirebaseConfigured()) {
      syncManager.sync().catch(() => {}); // fire-and-forget
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (id: number) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEntriesModal = async (field: SymptomField) => {
    const entries = await getFieldEntriesForDate(field.id!, selectedDate);
    setViewEntries(entries);
    setViewEntriesField(field);
  };

  // Fields that are not in any form and not weather
  const formFieldIds = new Set(forms.flatMap((f) => f.fields.map((ff) => ff.id!)));
  const standaloneFields = fields.filter((f) => !formFieldIds.has(f.id!) && !f.isSystem);

  const dateLabel = (() => {
    const today = getTodayString();
    if (selectedDate === today) return 'Today';
    try {
      return format(new Date(selectedDate + 'T12:00:00'), 'MMM d, yyyy');
    } catch {
      return selectedDate;
    }
  })();

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: 'white',
        maxWidth: '600px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 16px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#333' }}>FeelSeen</h1>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '20px',
              border: '1.5px solid #e0e0e0',
              background: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
            }}
          >
            {dateLabel}
            {showCalendar ? <IoChevronUp size={14} /> : <IoChevronDown size={14} />}
          </button>
        </div>

        {showCalendar && (
          <div style={{ marginBottom: '12px', borderRadius: '14px', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
            <Calendar
              value={new Date(selectedDate + 'T12:00:00')}
              onChange={(val) => {
                if (val instanceof Date) {
                  setSelectedDate(format(val, 'yyyy-MM-dd'));
                  setShowCalendar(false);
                }
              }}
              maxDate={new Date()}
            />
          </div>
        )}
      </div>

      {/* Weather Card */}
      {weatherFields.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <WeatherCard
            fields={weatherFields}
            entriesMap={entriesMap}
            onRefresh={loadData}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '8px 16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading…</div>
        ) : fields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <IoMedkitOutline size={48} color="#ddd" />
            <p style={{ color: '#999', marginTop: '12px', fontSize: '15px' }}>
              No symptoms to track yet.
            </p>
            <p style={{ color: '#bbb', fontSize: '13px', marginTop: '4px' }}>
              Go to Track to add your first tracker.
            </p>
          </div>
        ) : (
          <>
            {/* Form groups */}
            {forms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                selectedDate={selectedDate}
                entriesMap={entriesMap}
                onLogField={(field) => setLogField(field)}
                onViewEntries={openEntriesModal}
                onRefresh={loadData}
              />
            ))}

            {/* Standalone fields */}
            {standaloneFields.map((field) => {
              const entries = entriesMap.get(field.id!) || [];
              const isExpanded = expandedFields.has(field.id!);
              const latestEntry = entries[entries.length - 1];
              const color = field.color || '#a5a5df';

              return (
                <div
                  key={field.id}
                  style={{
                    borderRadius: '14px',
                    background: '#f8f8f8',
                    marginBottom: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 14px',
                      gap: '10px',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleExpand(field.id!)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openEntriesModal(field);
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, fontSize: '15px', fontWeight: '600', color: '#333' }}>
                      {field.name}
                    </span>
                    {latestEntry && (
                      <span
                        style={{
                          fontSize: '13px',
                          color: '#666',
                          background: hexToRgba(color, 0.12),
                          borderRadius: '8px',
                          padding: '2px 10px',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatEntryValue(
                          latestEntry.value,
                          field.inputType,
                          field.options,
                          field.sliderConfig
                        )}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogField(field);
                      }}
                      style={{
                        background: color,
                        border: 'none',
                        borderRadius: '8px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <IoAdd size={16} color="white" />
                    </button>
                    {isExpanded ? (
                      <IoChevronUp size={14} color="#aaa" />
                    ) : (
                      <IoChevronDown size={14} color="#aaa" />
                    )}
                  </div>

                  {isExpanded && entries.length > 0 && (
                    <div
                      style={{
                        borderTop: '1px solid #efefef',
                        padding: '8px 14px 12px',
                      }}
                    >
                      {entries.slice(-3).map((entry) => (
                        <div
                          key={entry.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 0',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#888',
                              background: hexToRgba(color, 0.15),
                              borderRadius: '6px',
                              padding: '2px 8px',
                              flexShrink: 0,
                            }}
                          >
                            {formatEntryTime(entry.loggedAt)}
                          </span>
                          <span style={{ fontSize: '13px', color: '#555' }}>
                            {formatEntryValue(
                              entry.value,
                              field.inputType,
                              field.options,
                              field.sliderConfig
                            )}
                          </span>
                        </div>
                      ))}
                      {entries.length > 3 && (
                        <button
                          onClick={() => openEntriesModal(field)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: color,
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '4px 0',
                          }}
                        >
                          View all {entries.length} entries
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Log All button */}
            {standaloneFields.length > 1 && (
              <button
                onClick={() => setShowLogAll(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#a5a5df',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  marginTop: '8px',
                }}
              >
                Log All
              </button>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <LogEntryModal
        isOpen={!!logField}
        onClose={() => setLogField(null)}
        field={logField}
        selectedDate={selectedDate}
        onSaved={loadDataAndSync}
      />
      <LogAllModal
        isOpen={showLogAll}
        onClose={() => setShowLogAll(false)}
        fields={standaloneFields}
        selectedDate={selectedDate}
        onSaved={loadDataAndSync}
      />
      <EntriesModal
        isOpen={!!viewEntriesField}
        onClose={() => setViewEntriesField(null)}
        field={viewEntriesField}
        entries={viewEntries}
        onDeleted={() => {
          loadDataAndSync();
          if (viewEntriesField) openEntriesModal(viewEntriesField);
        }}
      />
    </div>
  );
}

// FormCard sub-component
interface FormCardProps {
  form: FormWithFields;
  selectedDate: string;
  entriesMap: Map<number, FieldEntry[]>;
  onLogField: (field: SymptomField) => void;
  onViewEntries: (field: SymptomField) => void;
  onRefresh: () => void;
}

function FormCard({ form, selectedDate, entriesMap, onLogField, onViewEntries, onRefresh }: FormCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [logField, setLogField] = useState<SymptomField | null>(null);
  const color = form.color || '#a5a5df';

  const filledCount = form.fields.filter((f) => (entriesMap.get(f.id!) || []).length > 0).length;

  return (
    <div
      style={{
        borderRadius: '14px',
        background: '#f8f8f8',
        marginBottom: '10px',
        overflow: 'hidden',
        border: `1.5px solid ${hexToRgba(color, 0.3)}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 14px',
          gap: '10px',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: color,
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, fontSize: '15px', fontWeight: '600', color: '#333' }}>
          {form.name}
        </span>
        {filledCount > 0 && (
          <span
            style={{
              background: color,
              color: 'white',
              borderRadius: '10px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            {filledCount}/{form.fields.length}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLogField(form.fields[0] || null);
          }}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            background: color,
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          Log
        </button>
        {isExpanded ? <IoChevronUp size={14} color="#aaa" /> : <IoChevronDown size={14} color="#aaa" />}
      </div>

      {isExpanded && (
        <div
          style={{
            borderTop: `1px solid ${hexToRgba(color, 0.15)}`,
            padding: '10px 14px 12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          {form.fields.map((field) => {
            const entries = entriesMap.get(field.id!) || [];
            const latest = entries[entries.length - 1];
            const fc = field.color || '#a5a5df';
            return (
              <button
                key={field.id}
                onClick={() => onLogField(field)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onViewEntries(field);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: hexToRgba(fc, 0.12),
                  border: `1px solid ${hexToRgba(fc, 0.3)}`,
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: fc,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: '#555' }}>{field.name}</span>
                {latest && (
                  <span style={{ color: '#888', fontWeight: '600' }}>
                    {formatEntryValue(latest.value, field.inputType, field.options, field.sliderConfig)}
                  </span>
                )}
                {!latest && <span style={{ color: '#ccc' }}>—</span>}
              </button>
            );
          })}
        </div>
      )}

      <LogEntryModal
        isOpen={!!logField}
        onClose={() => setLogField(null)}
        field={logField}
        selectedDate={selectedDate}
        onSaved={onRefresh}
      />
    </div>
  );
}
