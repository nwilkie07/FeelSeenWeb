import type { SymptomField } from '../types';
import { parseOptions, parseSliderConfig, hexToRgba } from '../utils/entryUtils';
import { IoCheckmark, IoClose } from 'react-icons/io5';

interface FieldInputProps {
  field: SymptomField;
  value: string;
  onChange: (value: string) => void;
}

export default function FieldInput({ field, value, onChange }: FieldInputProps) {
  const options = parseOptions(field.options);
  const sliderConfig = parseSliderConfig(field.sliderConfig);
  const color = field.color || '#a5a5df';

  switch (field.inputType) {
    case 'yes_no':
      return (
        <div style={{ display: 'flex', gap: '10px' }}>
          {['Yes', 'No'].map((opt) => {
            const isSelected = opt === 'Yes' ? value === 'yes' : value === 'no';
            return (
              <button
                key={opt}
                onClick={() => onChange(opt.toLowerCase())}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: `2px solid ${isSelected ? color : '#e0e0e0'}`,
                  background: isSelected ? hexToRgba(color, 0.12) : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isSelected ? color : '#666',
                }}
              >
                {opt === 'Yes' ? <IoCheckmark size={18} /> : <IoClose size={18} />}
                {opt}
              </button>
            );
          })}
        </div>
      );

    case 'single_select':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {options.map((opt) => {
            const isSelected = value === opt.label;
            return (
              <button
                key={opt.label}
                onClick={() => onChange(opt.label)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: `2px solid ${isSelected ? color : '#e0e0e0'}`,
                  background: isSelected ? hexToRgba(color, 0.12) : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '15px',
                  color: isSelected ? '#333' : '#555',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? color : '#ccc'}`,
                    background: isSelected ? color : 'white',
                    flexShrink: 0,
                  }}
                />
                {opt.label}
              </button>
            );
          })}
        </div>
      );

    case 'multi_select': {
      let selected: string[] = [];
      try {
        selected = value ? JSON.parse(value) : [];
      } catch {
        selected = [];
      }
      const toggle = (label: string) => {
        const next = selected.includes(label)
          ? selected.filter((s) => s !== label)
          : [...selected, label];
        onChange(JSON.stringify(next));
      };
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {options.map((opt) => {
            const isSelected = selected.includes(opt.label);
            return (
              <button
                key={opt.label}
                onClick={() => toggle(opt.label)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: `2px solid ${isSelected ? color : '#e0e0e0'}`,
                  background: isSelected ? hexToRgba(color, 0.12) : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '15px',
                  color: isSelected ? '#333' : '#555',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: `2px solid ${isSelected ? color : '#ccc'}`,
                    background: isSelected ? color : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && <IoCheckmark size={12} color="white" />}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    case 'number_input':
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter a number"
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: '2px solid #e0e0e0',
            fontSize: '22px',
            textAlign: 'center',
            fontWeight: 'bold',
            outline: 'none',
            color: '#333',
          }}
        />
      );

    case 'slider': {
      const numValue = value !== '' ? parseFloat(value) : sliderConfig.min;
      return (
        <div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              textAlign: 'center',
              color: color,
              marginBottom: '12px',
            }}
          >
            {numValue}
          </div>
          <input
            type="range"
            min={sliderConfig.min}
            max={sliderConfig.max}
            step={sliderConfig.step}
            value={numValue}
            onChange={(e) => onChange(e.target.value)}
            style={{
              background: `linear-gradient(to right, ${color} 0%, ${color} ${
                ((numValue - sliderConfig.min) / (sliderConfig.max - sliderConfig.min)) * 100
              }%, #e0e0e0 ${
                ((numValue - sliderConfig.min) / (sliderConfig.max - sliderConfig.min)) * 100
              }%, #e0e0e0 100%)`,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', color: '#999' }}>{sliderConfig.min}</span>
            <span style={{ fontSize: '12px', color: '#999' }}>{sliderConfig.max}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
            <button
              onClick={() =>
                onChange(
                  String(Math.max(sliderConfig.min, numValue - sliderConfig.step))
                )
              }
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #e0e0e0',
                background: 'white',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              −
            </button>
            <button
              onClick={() =>
                onChange(
                  String(Math.min(sliderConfig.max, numValue + sliderConfig.step))
                )
              }
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #e0e0e0',
                background: 'white',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>
          </div>
        </div>
      );
    }

    case 'short_answer':
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: '2px solid #e0e0e0',
            fontSize: '15px',
            outline: 'none',
            color: '#333',
          }}
        />
      );

    case 'long_answer':
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          rows={4}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: '2px solid #e0e0e0',
            fontSize: '15px',
            outline: 'none',
            resize: 'vertical',
            color: '#333',
            fontFamily: 'inherit',
          }}
        />
      );

    default:
      return null;
  }
}
