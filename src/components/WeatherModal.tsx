import { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import {
  getWeatherEnabled,
  setWeatherEnabled,
  getWeatherCoords,
  setWeatherCoords,
  getAllWeatherTracked,
  setWeatherTracked,
  deleteWeatherMetricEntries,
  WEATHER_METRICS,
  syncWeather,
} from '../database/weather-sync';
import { db } from '../database';
import { hexToRgba } from '../utils/entryUtils';
import { IoRefreshOutline, IoTrashOutline } from 'react-icons/io5';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function WeatherModal({ isOpen, onClose, onRefresh }: WeatherModalProps) {
  const [enabled, setEnabled] = useState(true);
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const [hasData, setHasData] = useState<Set<string>>(new Set()); // metrics with existing entries
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // metricKey pending deletion
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getWeatherEnabled().then(setEnabled);
      getAllWeatherTracked().then(setTracked);
      getWeatherCoords().then((c) => {
        if (c) {
          setLat(String(c.lat));
          setLon(String(c.lon));
        }
      });
      checkHasData();
    }
  }, [isOpen]);

  // Determine which metrics have at least one entry in the DB
  async function checkHasData() {
    const allFields = await db.symptomFields.toArray();
    const withData = new Set<string>();
    for (const metric of WEATHER_METRICS) {
      const field = allFields.find(f => f.name === metric.name);
      if (field?.id) {
        const count = await db.fieldEntries.where('fieldId').equals(field.id).count();
        if (count > 0) withData.add(metric.key);
      }
    }
    setHasData(withData);
  }

  const handleToggleEnabled = async (val: boolean) => {
    await setWeatherEnabled(val);
    setEnabled(val);
  };

  const handleToggleTracked = async (key: string, val: boolean) => {
    await setWeatherTracked(key, val);
    setTracked((prev) => {
      const next = new Set(prev);
      if (val) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleSaveCoords = async () => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!isNaN(latNum) && !isNaN(lonNum) && latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180) {
      await setWeatherCoords(latNum, lonNum);
      setMessage('Location saved');
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage('Invalid coordinates');
    }
  };

  const handleRefresh = async () => {
    setSyncing(true);
    setMessage(null);
    const result = await syncWeather(true);
    setSyncing(false);
    if (result.success) {
      setMessage(result.synced ? 'Weather synced!' : 'Already synced today');
      await checkHasData();
      onRefresh?.();
    } else {
      setMessage(result.error || 'Sync failed');
    }
  };

  const handleDeleteConfirm = async (key: string) => {
    setDeleting(key);
    await deleteWeatherMetricEntries(key);
    // Also mark as not tracked so it won't re-appear until re-enabled
    await setWeatherTracked(key, false);
    setTracked((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setHasData((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setDeleting(null);
    setConfirmDelete(null);
    onRefresh?.();
  };

  const weatherColor = '#5dade2';
  const isError = (msg: string | null) =>
    msg != null && (msg.includes('fail') || msg.includes('Invalid') || msg.includes('error') || msg.includes('not'));

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Weather Tracking">
      <div style={{ padding: '0 16px 24px' }}>

        {/* Enable toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: '#f8f8f8',
            borderRadius: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>Weather Tracking</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Automatic daily weather sync</div>
          </div>
          <button
            onClick={() => handleToggleEnabled(!enabled)}
            style={{
              width: '48px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              background: enabled ? '#a5a5df' : '#ddd',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '3px',
                left: enabled ? '22px' : '3px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
              }}
            />
          </button>
        </div>

        {enabled && (
          <>
            {/* Manual coordinates */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>
                Manual Location (optional)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Latitude"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #e0e0e0',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="Longitude"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #e0e0e0',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleSaveCoords}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#333',
                  }}
                >
                  Save
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                If blank, uses IP-based geolocation (Canada only)
              </p>
            </div>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={syncing}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                border: 'none',
                background: weatherColor,
                color: 'white',
                cursor: syncing ? 'default' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '16px',
                opacity: syncing ? 0.7 : 1,
              }}
            >
              <IoRefreshOutline
                size={16}
                style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}
              />
              {syncing ? 'Refreshing…' : 'Refresh Now'}
            </button>

            {/* Metrics list */}
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '10px' }}>
              Tracked Metrics
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {WEATHER_METRICS.map((m) => {
                const isTracked = tracked.has(m.key);
                const hasEntries = hasData.has(m.key);
                const isPendingDelete = confirmDelete === m.key;
                const isBeingDeleted = deleting === m.key;

                return (
                  <div
                    key={m.key}
                    style={{
                      borderRadius: '10px',
                      border: `2px solid ${isTracked ? weatherColor : '#e0e0e0'}`,
                      background: isTracked ? hexToRgba(weatherColor, 0.08) : 'white',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Main row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px' }}>
                      {/* Checkbox toggle */}
                      <button
                        onClick={() => handleToggleTracked(m.key, !isTracked)}
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          background: isTracked ? weatherColor : 'white',
                          border: `2px solid ${isTracked ? weatherColor : '#ccc'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {isTracked && (
                          <svg width="10" height="10" viewBox="0 0 10 10">
                            <path d="M2 5 L4 7 L8 3" stroke="white" strokeWidth="2" fill="none" />
                          </svg>
                        )}
                      </button>

                      {/* Label */}
                      <button
                        onClick={() => handleToggleTracked(m.key, !isTracked)}
                        style={{
                          flex: 1,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '14px', color: '#333' }}>{m.name.replace('Weather - ', '')}</span>
                        <span style={{ fontSize: '12px', color: '#888' }}>{m.unit}</span>
                      </button>

                      {/* Delete button — only shown when there are entries */}
                      {hasEntries && !isPendingDelete && (
                        <button
                          onClick={() => setConfirmDelete(m.key)}
                          title="Delete all entries for this metric"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            color: '#c0392b',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.7,
                          }}
                        >
                          <IoTrashOutline size={15} />
                        </button>
                      )}
                    </div>

                    {/* Inline delete confirmation */}
                    {isPendingDelete && (
                      <div
                        style={{
                          borderTop: '1px solid #ffd7d7',
                          background: '#fff5f5',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ flex: 1, fontSize: '12px', color: '#c62828' }}>
                          Delete all entries for this metric?
                        </span>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          disabled={isBeingDeleted}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #ccc',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#555',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(m.key)}
                          disabled={isBeingDeleted}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#c62828',
                            color: 'white',
                            cursor: isBeingDeleted ? 'default' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            opacity: isBeingDeleted ? 0.6 : 1,
                          }}
                        >
                          {isBeingDeleted ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Status message */}
        {message && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: isError(message) ? '#fde8e8' : '#d4edda',
              color: isError(message) ? '#c62828' : '#2e7d32',
              fontSize: '13px',
            }}
          >
            {message}
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </BottomSheet>
  );
}
