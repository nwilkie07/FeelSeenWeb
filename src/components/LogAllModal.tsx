import { useState, useEffect } from 'react';
import type { SymptomField } from '../types';
import { logFieldEntry } from '../database';
import { parseSliderConfig } from '../utils/entryUtils';
import BottomSheet from './BottomSheet';
import FieldInput from './FieldInput';

interface LogAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: SymptomField[];
  selectedDate: string;
  onSaved: () => void;
}

export default function LogAllModal({
  isOpen,
  onClose,
  fields,
  selectedDate,
  onSaved,
}: LogAllModalProps) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<number, string> = {};
      for (const f of fields) {
        if (f.inputType === 'slider') {
          initial[f.id!] = String(parseSliderConfig(f.sliderConfig).min);
        } else {
          initial[f.id!] = '';
        }
      }
      setValues(initial);
    }
  }, [isOpen, fields]);

  const filledCount = Object.entries(values).filter(([, v]) => {
    if (!v) return false;
    if (v.startsWith('[')) {
      try {
        return (JSON.parse(v) as string[]).length > 0;
      } catch {
        return false;
      }
    }
    return true;
  }).length;

  const handleSubmit = async () => {
    setSaving(true);
    const dateStr =
      selectedDate === new Date().toISOString().slice(0, 10)
        ? undefined
        : selectedDate;
    try {
      for (const field of fields) {
        const val = values[field.id!];
        if (!val) continue;
        if (val.startsWith('[')) {
          try {
            if ((JSON.parse(val) as string[]).length === 0) continue;
          } catch {
            continue;
          }
        }
        await logFieldEntry(field.id!, val, dateStr);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '0 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Log All</h2>
          {filledCount > 0 && (
            <span
              style={{
                background: '#a5a5df',
                color: 'white',
                borderRadius: '12px',
                padding: '2px 10px',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {filledCount} filled
            </span>
          )}
        </div>

        {fields.map((field) => (
          <div key={field.id} style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: field.color || '#a5a5df',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                {field.name}
              </span>
            </div>
            <FieldInput
              field={field}
              value={values[field.id!] || ''}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.id!]: v }))}
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '13px',
              borderRadius: '12px',
              border: '1px solid #ddd',
              background: 'white',
              cursor: 'pointer',
              fontSize: '15px',
              color: '#333',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || filledCount === 0}
            style={{
              flex: 2,
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: filledCount > 0 ? '#a5a5df' : '#e0e0e0',
              color: 'white',
              cursor: filledCount > 0 ? 'pointer' : 'default',
              fontSize: '15px',
              fontWeight: '600',
            }}
          >
            {saving ? 'Saving…' : `Submit${filledCount > 0 ? ` ${filledCount} Entries` : ''}`}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
