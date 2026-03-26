import { useState, useEffect } from 'react';
import type { Form, SymptomField } from '../types';
import { createForm, updateForm, setFormFields } from '../database';
import BottomSheet from './BottomSheet';
import { HexColorPicker } from 'react-colorful';
import { IoCheckmark } from 'react-icons/io5';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form?: (Form & { fields: SymptomField[] }) | null;
  availableFields: SymptomField[];
  onSaved: () => void;
}

const DEFAULT_COLOR = '#a5a5df';

export default function FormModal({
  isOpen,
  onClose,
  form,
  availableFields,
  onSaved,
}: FormModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [selectedFieldIds, setSelectedFieldIds] = useState<number[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!form;

  useEffect(() => {
    if (isOpen) {
      if (form) {
        setName(form.name);
        setColor(form.color || DEFAULT_COLOR);
        setSelectedFieldIds(form.fields.map((f) => f.id!));
      } else {
        setName('');
        setColor(DEFAULT_COLOR);
        setSelectedFieldIds([]);
      }
      setShowColorPicker(false);
    }
  }, [isOpen, form]);

  const toggleField = (id: number) => {
    setSelectedFieldIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let formId: number;
      if (isEdit && form?.id) {
        await updateForm(form.id, { name: name.trim(), color });
        formId = form.id;
      } else {
        formId = await createForm({ name: name.trim(), color, createdAt: new Date().toISOString() });
      }
      await setFormFields(formId, selectedFieldIds);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Form' : 'New Form'}>
      <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Name */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>
            NAME
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning Check-in"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1.5px solid #e0e0e0',
              fontSize: '15px',
              outline: 'none',
              color: '#333',
            }}
          />
        </div>

        {/* Color */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>
            COLOR
          </label>
          <div
            style={{
              height: '40px',
              borderRadius: '10px',
              background: color,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setShowColorPicker(!showColorPicker)}
          >
            <span style={{ color: 'white', fontWeight: '600', fontSize: '13px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              Tap to change
            </span>
          </div>
          {showColorPicker && (
            <div style={{ marginTop: '8px', borderRadius: '10px', overflow: 'hidden' }}>
              <HexColorPicker color={color} onChange={setColor} style={{ width: '100%' }} />
            </div>
          )}
        </div>

        {/* Fields */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>
            TRACKERS ({selectedFieldIds.length} selected)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {availableFields.map((field) => {
              const isSelected = selectedFieldIds.includes(field.id!);
              return (
                <button
                  key={field.id}
                  onClick={() => toggleField(field.id!)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `2px solid ${isSelected ? field.color || '#a5a5df' : '#e0e0e0'}`,
                    background: isSelected ? `${(field.color || '#a5a5df')}15` : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: isSelected ? (field.color || '#a5a5df') : 'white',
                      border: `2px solid ${isSelected ? (field.color || '#a5a5df') : '#ccc'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <IoCheckmark size={10} color="white" />}
                  </div>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: field.color || '#a5a5df',
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>{field.name}</span>
                </button>
              );
            })}
            {availableFields.length === 0 && (
              <p style={{ color: '#999', fontSize: '13px', padding: '8px 0' }}>
                No trackers yet. Create some trackers first.
              </p>
            )}
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', gap: '10px' }}>
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
            disabled={!name.trim() || saving}
            style={{
              flex: 2,
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: name.trim() ? color : '#e0e0e0',
              color: 'white',
              cursor: name.trim() ? 'pointer' : 'default',
              fontSize: '15px',
              fontWeight: '600',
            }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Form'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
