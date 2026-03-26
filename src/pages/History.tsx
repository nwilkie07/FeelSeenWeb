import { useState, useEffect, useCallback } from 'react';
import type { FieldEntry, SymptomField } from '../types';
import { getUserSymptomFields, getFieldEntries, deleteFieldEntry } from '../database';
import { formatEntryValue, formatDateHeader, hexToRgba, groupEntriesByDate } from '../utils/entryUtils';
import { IoChevronDown, IoTrashOutline, IoTimeOutline } from 'react-icons/io5';

const PAGE_SIZE = 20;

export default function History() {
  const [fields, setFields] = useState<SymptomField[]>([]);
  const [selectedField, setSelectedField] = useState<SymptomField | null>(null);
  const [entries, setEntries] = useState<FieldEntry[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUserSymptomFields().then((f) => {
      setFields(f);
      if (f.length > 0) setSelectedField(f[0]);
    });
  }, []);

  const loadEntries = useCallback(async () => {
    if (!selectedField) return;
    setLoading(true);
    try {
      const all = await getFieldEntries(selectedField.id!);
      setEntries(all.reverse()); // newest first
      setDisplayCount(PAGE_SIZE);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedField]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleDelete = async (entry: FieldEntry) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteFieldEntry(entry.id!);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const displayedEntries = entries.slice(0, displayCount);
  const grouped = groupEntriesByDate(displayedEntries);
  const sortedDates = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

  const color = selectedField?.color || '#a5a5df';

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'white', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#333', marginBottom: '14px' }}>
          History
        </h1>

        {/* Field selector */}
        <button
          onClick={() => setShowFieldPicker(!showFieldPicker)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '12px',
            border: `2px solid ${hexToRgba(color, 0.4)}`,
            background: hexToRgba(color, 0.07),
            cursor: 'pointer',
            marginBottom: '8px',
          }}
        >
          {selectedField && (
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ flex: 1, fontSize: '15px', fontWeight: '600', color: '#333', textAlign: 'left' }}>
            {selectedField?.name || 'Select a tracker…'}
          </span>
          <IoChevronDown size={16} color="#aaa" />
        </button>

        {/* Field picker dropdown */}
        {showFieldPicker && (
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              marginBottom: '12px',
              overflow: 'hidden',
            }}
          >
            {fields
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((field) => (
                <button
                  key={field.id}
                  onClick={() => {
                    setSelectedField(field);
                    setShowFieldPicker(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    width: '100%',
                    background: selectedField?.id === field.id ? '#f8f8f8' : 'white',
                    border: 'none',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: field.color || '#a5a5df',
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>{field.name}</span>
                </button>
              ))}
          </div>
        )}

        {/* Entries */}
        {!selectedField ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <IoTimeOutline size={40} color="#ddd" />
            <p style={{ marginTop: '10px', fontSize: '14px' }}>Select a tracker to view its history</p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading…</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p style={{ fontSize: '14px' }}>No entries for {selectedField.name} yet</p>
          </div>
        ) : (
          <>
            {sortedDates.map((date) => {
              const dayEntries = grouped.get(date) || [];
              return (
                <div key={date}>
                  <div
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: 'white',
                      padding: '8px 0 4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#999',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {formatDateHeader(date)}
                  </div>
                  {dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: '#f8f8f8',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{
                          background: hexToRgba(color, 0.2),
                          color: '#444',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          flexShrink: 0,
                        }}
                      >
                        {new Date(entry.loggedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span style={{ flex: 1, fontSize: '14px', color: '#333' }}>
                        {formatEntryValue(
                          entry.value,
                          selectedField.inputType,
                          selectedField.options,
                          selectedField.sliderConfig
                        )}
                      </span>
                      <button
                        onClick={() => handleDelete(entry)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#d32f2f',
                          padding: '4px',
                        }}
                      >
                        <IoTrashOutline size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            {entries.length > displayCount && (
              <button
                onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1.5px solid #ddd',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#666',
                  marginTop: '8px',
                }}
              >
                Load more ({entries.length - displayCount} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
