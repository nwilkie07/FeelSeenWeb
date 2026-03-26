import { useState } from 'react';
import type { FieldEntry, SymptomField } from '../types';
import { formatEntryValue } from '../utils/entryUtils';
import { IoChevronDown, IoChevronUp, IoRefreshOutline } from 'react-icons/io5';
import { syncWeather } from '../database/weather-sync';

interface WeatherCardProps {
  fields: SymptomField[];
  entriesMap: Map<number, FieldEntry[]>;
  onRefresh: () => void;
}

const WEATHER_LABEL_MAP: Record<string, string> = {
  'Weather - Max Temp (°C)': 'High',
  'Weather - Min Temp (°C)': 'Low',
  'Weather - Precipitation (mm)': 'Precip',
  'Weather - Humidity (%)': 'Humidity',
  'Weather - UV Index High': 'UV High',
  'Weather - UV Index Low': 'UV Low',
  'Weather - Max Wind (km/h)': 'Wind',
  'Weather - Daylight Hours': 'Daylight',
  'Weather - Air Quality (AQHI)': 'AQHI',
  'Weather - Wind Chill (°C)': 'Wind Chill',
  'Weather - Pressure (kPa)': 'Pressure',
};

const WEATHER_ICONS: Record<string, string> = {
  'Weather - Max Temp (°C)': '🌡️',
  'Weather - Min Temp (°C)': '🌡️',
  'Weather - Precipitation (mm)': '🌧️',
  'Weather - Humidity (%)': '💧',
  'Weather - UV Index High': '☀️',
  'Weather - UV Index Low': '☀️',
  'Weather - Max Wind (km/h)': '💨',
  'Weather - Daylight Hours': '🌅',
  'Weather - Air Quality (AQHI)': '🌬️',
  'Weather - Wind Chill (°C)': '🥶',
  'Weather - Pressure (kPa)': '📊',
};

export default function WeatherCard({ fields, entriesMap, onRefresh }: WeatherCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [syncing, setSyncing] = useState(false);

  if (fields.length === 0) return null;

  const handleRefresh = async () => {
    setSyncing(true);
    await syncWeather(true);
    setSyncing(false);
    onRefresh();
  };

  const weatherColor = '#5dade2';
  const todayEntries = fields.map(f => entriesMap.get(f.id!) || []).flat();

  return (
    <div
      style={{
        borderRadius: '14px',
        background: '#eaf4fb',
        border: '1px solid #c8e6f5',
        marginBottom: '10px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 14px',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ fontSize: '16px', marginRight: '8px' }}>🌤️</div>
        <span style={{ flex: 1, fontSize: '15px', fontWeight: '600', color: '#1a5276' }}>
          Weather
        </span>
        {todayEntries.length > 0 && (
          <span
            style={{
              fontSize: '11px',
              background: weatherColor,
              color: 'white',
              borderRadius: '10px',
              padding: '2px 8px',
              fontWeight: '600',
              marginRight: '8px',
            }}
          >
            {todayEntries.length} metrics
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRefresh();
          }}
          disabled={syncing}
          style={{
            background: 'none',
            border: 'none',
            cursor: syncing ? 'default' : 'pointer',
            color: '#3a86b4',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            opacity: syncing ? 0.5 : 1,
          }}
        >
          <IoRefreshOutline size={16} />
        </button>
        {expanded ? <IoChevronUp size={14} color="#3a86b4" /> : <IoChevronDown size={14} color="#3a86b4" />}
      </div>

      {/* Metrics grid */}
      {expanded && (
        <div style={{ borderTop: '1px solid #d4e9f7', padding: '8px 14px 14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {fields.map((field) => {
              const entries = entriesMap.get(field.id!) || [];
              const latest = entries[entries.length - 1];
              const shortLabel = WEATHER_LABEL_MAP[field.name] || field.name;
              
              return (
                <div
                  key={field.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(255,255,255,0.75)',
                    borderRadius: '10px',
                    padding: '6px 10px',
                    minWidth: '45%',
                  }}
                >
                  <span style={{ fontSize: '12px' }}>{WEATHER_ICONS[field.name] || '🌡️'}</span>
                  <span style={{ fontSize: '11px', color: '#666', flexShrink: 0 }}>{shortLabel}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a5276' }}>
                    {latest ? formatEntryValue(latest.value, field.inputType) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}