import { useState, useEffect } from 'react';
import type { SymptomField, InputType, SelectOption, SliderConfig } from '../types';
import { createSymptomField, updateSymptomField } from '../database';
import { INPUT_TYPE_LABELS, INPUT_TYPE_DESCRIPTIONS } from '../types';
import BottomSheet from './BottomSheet';
import { HexColorPicker } from 'react-colorful';
import { IoAdd, IoClose } from 'react-icons/io5';

interface SymptomModalProps {
  isOpen: boolean;
  onClose: () => void;
  field?: SymptomField | null;
  onSaved: () => void;
}

const DEFAULT_COLOR = '#a5a5df';
const INPUT_TYPES: InputType[] = [
  'single_select',
  'multi_select',
  'number_input',
  'slider',
  'yes_no',
  'short_answer',
  'long_answer',
];

export default function SymptomModal({ isOpen, onClose, field, onSaved }: SymptomModalProps) {
  const [name, setName] = useState('');
  const [inputType, setInputType] = useState<InputType>('single_select');
  const [options, setOptions] = useState<SelectOption[]>([{ label: '' }]);
  const [sliderConfig, setSliderConfig] = useState<SliderConfig>({ min: 0, max: 10, step: 1 });
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!field;

  useEffect(() => {
    if (isOpen) {
      if (field) {
        setName(field.name);
        setInputType(field.inputType);
        setOptions(field.options?.length ? field.options : [{ label: '' }]);
        setSliderConfig(
          field.sliderConfig
            ? typeof field.sliderConfig === 'string'
              ? JSON.parse(field.sliderConfig)
              : field.sliderConfig
            : { min: 0, max: 10, step: 1 }
        );
        setColor(field.color || DEFAULT_COLOR);
      } else {
        setName('');
        setInputType('single_select');
        setOptions([{ label: '' }, { label: '' }]);
        setSliderConfig({ min: 0, max: 10, step: 1 });
        setColor(DEFAULT_COLOR);
      }
      setShowColorPicker(false);
    }
  }, [isOpen, field]);

  const addOption = () => setOptions((prev) => [...prev, { label: '' }]);
  const removeOption = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i));
  const updateOption = (i: number, label: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, label } : o)));
  const updateOptionValue = (i: number, value: string) =>
    setOptions((prev) =>
      prev.map((o, idx) =>
        idx === i ? { ...o, value: value === '' ? undefined : Number(value) } : o
      )
    );

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const cleanOptions =
        inputType === 'single_select' || inputType === 'multi_select'
          ? options.filter((o) => o.label.trim())
          : undefined;
      const cleanSlider =
        inputType === 'slider' ? sliderConfig : undefined;

      if (isEdit && field?.id) {
        await updateSymptomField(field.id, {
          name: name.trim(),
          options: cleanOptions,
          sliderConfig: cleanSlider,
          color,
        });
      } else {
        await createSymptomField({
          name: name.trim(),
          inputType,
          options: cleanOptions,
          sliderConfig: cleanSlider,
          color,
          createdAt: new Date().toISOString(),
          isSystem: false,
        });
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Tracker' : 'New Tracker'}>
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
            placeholder="e.g. Headache, Mood, Sleep quality"
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

        {/* Input Type */}
        {!isEdit && (
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>
              INPUT TYPE
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {INPUT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setInputType(type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `2px solid ${inputType === type ? color : '#e0e0e0'}`,
                    background: inputType === type ? `${color}15` : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: `2px solid ${inputType === type ? color : '#ccc'}`,
                      background: inputType === type ? color : 'white',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                      {INPUT_TYPE_LABELS[type]}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {INPUT_TYPE_DESCRIPTIONS[type]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Options for select types */}
        {(inputType === 'single_select' || inputType === 'multi_select') && (
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>
              OPTIONS
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #e0e0e0',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {inputType === 'single_select' && (
                    <input
                      type="number"
                      value={opt.value ?? ''}
                      onChange={(e) => updateOptionValue(i, e.target.value)}
                      placeholder="Value"
                      style={{
                        width: '70px',
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: '1.5px solid #e0e0e0',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  )}
                  <button
                    onClick={() => removeOption(i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#d32f2f',
                      padding: '4px',
                    }}
                  >
                    <IoClose size={18} />
                  </button>
                </div>
              ))}
              <button
                onClick={addOption}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: '1.5px dashed #ccc',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#888',
                  fontSize: '13px',
                }}
              >
                <IoAdd size={16} /> Add option
              </button>
            </div>
          </div>
        )}

        {/* Slider config */}
        {inputType === 'slider' && (
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>
              RANGE
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['min', 'max', 'step'] as const).map((key) => (
                <div key={key} style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px', textAlign: 'center' }}>
                    {key.toUpperCase()}
                  </div>
                  <input
                    type="number"
                    value={sliderConfig[key]}
                    onChange={(e) =>
                      setSliderConfig((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                    }
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1.5px solid #e0e0e0',
                      fontSize: '14px',
                      outline: 'none',
                      textAlign: 'center',
                    }}
                  />
                </div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '6px' }}>
              {sliderConfig.min} to {sliderConfig.max}, step {sliderConfig.step}
            </p>
          </div>
        )}

        {/* Color */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>
            COLOR
          </label>
          <div
            style={{
              height: '44px',
              borderRadius: '10px',
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginBottom: '8px',
            }}
            onClick={() => setShowColorPicker(!showColorPicker)}
          >
            <span style={{ color: 'white', fontWeight: '600', fontSize: '14px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              {name || 'Preview'} — tap to change
            </span>
          </div>
          {showColorPicker && (
            <div style={{ borderRadius: '10px', overflow: 'hidden' }}>
              <HexColorPicker color={color} onChange={setColor} style={{ width: '100%' }} />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e0e0e0',
                  borderTop: 'none',
                  fontSize: '14px',
                  outline: 'none',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          )}
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
            disabled={!canSave || saving}
            style={{
              flex: 2,
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: canSave ? color : '#e0e0e0',
              color: 'white',
              cursor: canSave ? 'pointer' : 'default',
              fontSize: '15px',
              fontWeight: '600',
            }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Tracker'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
