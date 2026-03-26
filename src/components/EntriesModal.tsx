
import type { FieldEntry, SymptomField } from '../types';
import { deleteFieldEntry } from '../database';
import { formatEntryTime, formatEntryValue, hexToRgba } from '../utils/entryUtils';
import BottomSheet from './BottomSheet';
import { IoTrashOutline } from 'react-icons/io5';

interface EntriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: SymptomField | null;
  entries: FieldEntry[];
  onDeleted: () => void;
}

export default function EntriesModal({
  isOpen,
  onClose,
  field,
  entries,
  onDeleted,
}: EntriesModalProps) {
  // Sync with prop changes
  const currentEntries = entries;

  const handleDelete = async (entry: FieldEntry) => {
    if (!confirm('Delete this entry?')) return;
    await deleteFieldEntry(entry.id!);
    onDeleted();
  };

  if (!field) return null;
  const color = field.color || '#a5a5df';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={field.name}>
      <div style={{ padding: '0 16px 24px' }}>
        {currentEntries.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>
            No entries for this day
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#f8f8f8',
                }}
              >
                <span
                  style={{
                    background: hexToRgba(color, 0.25),
                    color: '#333',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    flexShrink: 0,
                  }}
                >
                  {formatEntryTime(entry.loggedAt)}
                </span>
                <span style={{ flex: 1, fontSize: '14px', color: '#333' }}>
                  {formatEntryValue(entry.value, field.inputType, field.options, field.sliderConfig)}
                </span>
                <button
                  onClick={() => handleDelete(entry)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#d32f2f',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IoTrashOutline size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
