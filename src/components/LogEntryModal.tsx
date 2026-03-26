import { useState, useEffect } from 'react';
import type { SymptomField } from '../types';
import { logFieldEntry } from '../database';
import { parseSliderConfig } from '../utils/entryUtils';
import BottomSheet from './BottomSheet';
import FieldInput from './FieldInput';

interface LogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: SymptomField | null;
  selectedDate: string;
  onSaved: () => void;
}

export default function LogEntryModal({
  isOpen,
  onClose,
  field,
  selectedDate,
  onSaved,
}: LogEntryModalProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && field) {
      if (field.inputType === 'slider') {
        const config = parseSliderConfig(field.sliderConfig);
        setValue(String(config.min));
      } else {
        setValue('');
      }
    }
  }, [isOpen, field]);

  if (!field) return null;

  const canSave = (() => {
    if (!value) return field.inputType === 'slider';
    if (field.inputType === 'multi_select') {
      try {
        return (JSON.parse(value) as string[]).length > 0;
      } catch {
        return false;
      }
    }
    return true;
  })();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const dateStr = selectedDate === new Date().toISOString().slice(0, 10)
        ? undefined
        : selectedDate;
      await logFieldEntry(field.id!, value || String(parseSliderConfig(field.sliderConfig).min), dateStr);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`Log: ${field.name}`}>
      <div style={{ padding: '0 16px 24px' }}>
        <FieldInput field={field} value={value} onChange={setValue} />
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
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
            onClick={handleSave}
            disabled={!canSave || saving}
            style={{
              flex: 2,
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: canSave ? (field.color || '#a5a5df') : '#e0e0e0',
              color: 'white',
              cursor: canSave ? 'pointer' : 'default',
              fontSize: '15px',
              fontWeight: '600',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
