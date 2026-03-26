/**
 * weather-sync.ts — automatic weather data fetching from Open-Meteo.
 *
 * Fetches daily weather data from the free Open-Meteo API,
 * stores them as SymptomField entries in IndexedDB.
 *
 * Works globally (not limited to Canada).
 * Auto-triggers on app startup if weather tracking is enabled.
 */

import { db, getAppSetting, setAppSetting, createSymptomField, logFieldEntry, deleteSymptomField, getFieldEntriesForDate } from './index';
import { format } from 'date-fns';

const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_BASE = 'https://api.open-meteo.com/v1/air-quality';

interface WeatherMetric {
  key: string;
  name: string;
  unit: string;
}

export const WEATHER_METRICS: WeatherMetric[] = [
  { key: 'max_temp', name: 'Weather - Max Temp (°C)', unit: '°C' },
  { key: 'min_temp', name: 'Weather - Min Temp (°C)', unit: '°C' },
  { key: 'precipitation', name: 'Weather - Precipitation (mm)', unit: 'mm' },
  { key: 'rain_sum', name: 'Weather - Rain Sum (mm)', unit: 'mm' },
  { key: 'humidity', name: 'Weather - Humidity (%)', unit: '%' },
  { key: 'uv_high', name: 'Weather - UV Index High', unit: 'index' },
  { key: 'uv_low', name: 'Weather - UV Index Low', unit: 'index' },
  { key: 'max_wind', name: 'Weather - Max Wind (km/h)', unit: 'km/h' },
  { key: 'daylight', name: 'Weather - Daylight Hours', unit: 'hours' },
  { key: 'cloud_cover', name: 'Weather - Cloud Cover (%)', unit: '%' },
  { key: 'aqi', name: 'Weather - Air Quality (AQI)', unit: 'index' },
  { key: 'pm25', name: 'Weather - PM2.5 (µg/m³)', unit: 'µg/m³' },
  { key: 'pm10', name: 'Weather - PM10 (µg/m³)', unit: 'µg/m³' },
  { key: 'ozone', name: 'Weather - Ozone (µg/m³)', unit: 'µg/m³' },
  { key: 'no2', name: 'Weather - NO2 (µg/m³)', unit: 'µg/m³' },
  { key: 'so2', name: 'Weather - SO2 (µg/m³)', unit: 'µg/m³' },
  { key: 'co', name: 'Weather - CO (µg/m³)', unit: 'µg/m³' },
  { key: 'wind_chill', name: 'Weather - Feels Like (°C)', unit: '°C' },
  { key: 'pressure', name: 'Weather - Pressure (hPa)', unit: 'hPa' },
];

const PHYSICAL_CATEGORY_ID = 3;

export async function getWeatherEnabled(): Promise<boolean> {
  const val = await getAppSetting('weather_enabled');
  return val === '1';
}

export async function setWeatherEnabled(enabled: boolean): Promise<void> {
  await setAppSetting('weather_enabled', enabled ? '1' : '0');
}

export async function getWeatherCoords(): Promise<{ lat: number; lon: number } | null> {
  const lat = await getAppSetting('weather_lat');
  const lon = await getAppSetting('weather_lon');
  if (!lat || !lon) return null;
  return { lat: parseFloat(lat), lon: parseFloat(lon) };
}

export async function setWeatherCoords(lat: number, lon: number): Promise<void> {
  await setAppSetting('weather_lat', String(lat));
  await setAppSetting('weather_lon', String(lon));
}

export async function getWeatherLastSynced(): Promise<string | null> {
  const val = await getAppSetting('weather_last_synced');
  return val ?? null;
}

export async function isWeatherTracked(metricKey: string): Promise<boolean> {
  const val = await getAppSetting(`weather_track_${metricKey}`);
  return val !== '0';
}

export async function setWeatherTracked(metricKey: string, tracked: boolean): Promise<void> {
  await setAppSetting(`weather_track_${metricKey}`, tracked ? '1' : '0');
}

export async function getAllWeatherTracked(): Promise<Set<string>> {
  const enabled = new Set<string>();
  for (const m of WEATHER_METRICS) {
    if (await isWeatherTracked(m.key)) enabled.add(m.key);
  }
  return enabled;
}

async function getLocationFromIP(): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.latitude && data.longitude) {
      return { lat: data.latitude, lon: data.longitude };
    }
  } catch {
    // IP geolocation fallback failed
  }
  return null;
}

interface WeatherData {
  maxTemp: number | null;
  minTemp: number | null;
  precipitation: number | null;
  rainSum: number | null;
  humidity: number | null;
  uvHigh: number | null;
  uvLow: number | null;
  maxWind: number | null;
  daylightHours: number | null;
  cloudCover: number | null;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  apparentTemp: number | null;
  pressure: number | null;
}

async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
  const dailyVars = [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'rain_sum',
    'wind_speed_10m_max',
    'uv_index_max',
    'apparent_temperature_max',
    'sunrise',
    'sunset',
    'cloud_cover_mean',
  ].join(',');

  const hourlyVars = [
    'relative_humidity_2m',
    'surface_pressure',
    'cloud_cover',
  ].join(',');

  const url = `${API_BASE}?latitude=${lat}&longitude=${lon}&daily=${dailyVars}&hourly=${hourlyVars}&timezone=auto&forecast_days=1`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Weather fetch error:', res.status);
      return null;
    }

    const data = await res.json();
    const daily = data.daily;
    const hourly = data.hourly;

    if (!daily || !daily.time || daily.time.length === 0) {
      return null;
    }

    const num = (v: unknown): number | null => {
      if (v == null) return null;
      const n = parseFloat(String(v));
      return isNaN(n) ? null : n;
    };

    const maxTemp = num(daily.temperature_2m_max?.[0]);
    const minTemp = num(daily.temperature_2m_min?.[0]);
    const precipitation = num(daily.precipitation_sum?.[0]);
    const maxWind = num(daily.wind_speed_10m_max?.[0]);
    const uvHigh = num(daily.uv_index_max?.[0]);
    const apparentTemp = num(daily.apparent_temperature_max?.[0]);

    const uvLow = uvHigh !== null ? Math.max(0, uvHigh - 2) : null;

    let daylightHours: number | null = null;
    const sunrise = daily.sunrise?.[0];
    const sunset = daily.sunset?.[0];
    if (sunrise && sunset) {
      const riseMs = new Date(sunrise).getTime();
      const setMs = new Date(sunset).getTime();
      if (!isNaN(riseMs) && !isNaN(setMs) && setMs > riseMs) {
        daylightHours = Math.round(((setMs - riseMs) / 3_600_000) * 10) / 10;
      }
    }

    let humidity: number | null = null;
    let pressure: number | null = null;
    let cloudCover: number | null = null;
    if (hourly && hourly.time && hourly.time.length > 0) {
      const now = new Date();
      let closestIdx = 0;
      let closestDiff = Infinity;
      
      for (let i = 0; i < hourly.time.length; i++) {
        const t = new Date(hourly.time[i]);
        const diff = Math.abs(t.getTime() - now.getTime());
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIdx = i;
        }
      }

      humidity = num(hourly.relative_humidity_2m?.[closestIdx]);
      pressure = num(hourly.surface_pressure?.[closestIdx]);
      cloudCover = num(hourly.cloud_cover?.[closestIdx]);
    }

    return {
      maxTemp,
      minTemp,
      precipitation,
      rainSum: num(daily.rain_sum?.[0]),
      humidity,
      uvHigh,
      uvLow,
      maxWind,
      daylightHours,
      cloudCover,
      aqi: null,
      pm25: null,
      pm10: null,
      ozone: null,
      no2: null,
      so2: null,
      co: null,
      apparentTemp,
      pressure: pressure !== null ? Math.round(pressure) / 100 : null,
    };
  } catch (err) {
    console.error('Weather fetch exception:', err);
    return null;
  }
}

interface AirQualityData {
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
}

async function fetchAirQuality(lat: number, lon: number): Promise<AirQualityData> {
  const url = `${AIR_QUALITY_BASE}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide&timezone=auto`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { aqi: null, pm25: null, pm10: null, ozone: null, no2: null, so2: null, co: null };
    }
    const data = await res.json();
    const current = data.current;
    
    const num = (v: unknown): number | null => {
      if (v == null) return null;
      const n = parseFloat(String(v));
      return isNaN(n) ? null : Math.round(n * 100) / 100;
    };
    
    return {
      aqi: current?.us_aqi != null ? Math.round(current.us_aqi) : null,
      pm25: num(current?.pm2_5),
      pm10: num(current?.pm10),
      ozone: num(current?.ozone),
      no2: num(current?.nitrogen_dioxide),
      so2: num(current?.sulphur_dioxide),
      co: num(current?.carbon_monoxide),
    };
  } catch {
    return { aqi: null, pm25: null, pm10: null, ozone: null, no2: null, so2: null, co: null };
  }
}

async function ensureWeatherFields(): Promise<Map<string, number>> {
  const fieldMap = new Map<string, number>();
  const tracked = await getAllWeatherTracked();
  const color = '#5dade2';

  for (const metric of WEATHER_METRICS) {
    if (!tracked.has(metric.key)) continue;

    const existing = await db.symptomFields.filter(f => f.name === metric.name).first();
    if (existing?.id) {
      fieldMap.set(metric.key, existing.id);
      continue;
    }
    const id = await createSymptomField({
      name: metric.name,
      inputType: 'number_input',
      color,
      categoryId: PHYSICAL_CATEGORY_ID,
      createdAt: new Date().toISOString(),
      isSystem: true,
    });
    fieldMap.set(metric.key, id);
  }

  return fieldMap;
}

export async function deleteWeatherMetricEntries(metricKey: string): Promise<void> {
  const metric = WEATHER_METRICS.find(m => m.key === metricKey);
  if (!metric) return;

  const field = await db.symptomFields.filter(f => f.name === metric.name).first();
  if (!field?.id) return;

  await db.fieldEntries.where('fieldId').equals(field.id).delete();
  await deleteSymptomField(field.id);
}

export async function syncWeather(force = false): Promise<{
  success: boolean;
  error?: string;
  synced?: boolean;
}> {
  try {
    const enabled = await getWeatherEnabled();
    if (!enabled) {
      return { success: true, synced: false };
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const lastSynced = await getWeatherLastSynced();

    if (!force && lastSynced === today) {
      return { success: true, synced: false };
    }

    let coords = await getWeatherCoords();
    if (!coords) {
      coords = await getLocationFromIP();
    }
    if (!coords) {
      return { success: false, error: 'Location not available. Enable location or enter coordinates.', synced: false };
    }

    const [weather, aq] = await Promise.all([
      fetchWeatherData(coords.lat, coords.lon),
      fetchAirQuality(coords.lat, coords.lon),
    ]);

    if (!weather) {
      return { success: false, error: 'Failed to fetch weather data', synced: false };
    }

    weather.aqi = aq.aqi;
    weather.pm25 = aq.pm25;
    weather.pm10 = aq.pm10;
    weather.ozone = aq.ozone;
    weather.no2 = aq.no2;
    weather.so2 = aq.so2;
    weather.co = aq.co;

    const fieldMap = await ensureWeatherFields();
    const tracked = await getAllWeatherTracked();

    // Helper: only log if no entry already exists for this field on this date
    const logIfNew = async (fieldId: number, value: string, date: string) => {
      const existing = await getFieldEntriesForDate(fieldId, date);
      if (existing.length === 0) {
        await logFieldEntry(fieldId, value, date);
      }
    };

    if (tracked.has('max_temp') && weather.maxTemp != null) {
      await logIfNew(fieldMap.get('max_temp')!, String(weather.maxTemp), today);
    }
    if (tracked.has('min_temp') && weather.minTemp != null) {
      await logIfNew(fieldMap.get('min_temp')!, String(weather.minTemp), today);
    }
    if (tracked.has('precipitation') && weather.precipitation != null) {
      await logIfNew(fieldMap.get('precipitation')!, String(weather.precipitation), today);
    }
    if (tracked.has('rain_sum') && weather.rainSum != null) {
      await logIfNew(fieldMap.get('rain_sum')!, String(weather.rainSum), today);
    }
    if (tracked.has('humidity') && weather.humidity != null) {
      await logIfNew(fieldMap.get('humidity')!, String(weather.humidity), today);
    }
    if (tracked.has('uv_high') && weather.uvHigh != null) {
      await logIfNew(fieldMap.get('uv_high')!, String(weather.uvHigh), today);
    }
    if (tracked.has('uv_low') && weather.uvLow != null) {
      await logIfNew(fieldMap.get('uv_low')!, String(weather.uvLow), today);
    }
    if (tracked.has('max_wind') && weather.maxWind != null) {
      await logIfNew(fieldMap.get('max_wind')!, String(weather.maxWind), today);
    }
    if (tracked.has('daylight') && weather.daylightHours != null) {
      await logIfNew(fieldMap.get('daylight')!, String(weather.daylightHours), today);
    }
    if (tracked.has('cloud_cover') && weather.cloudCover != null) {
      await logIfNew(fieldMap.get('cloud_cover')!, String(weather.cloudCover), today);
    }
    if (tracked.has('aqi') && weather.aqi != null) {
      await logIfNew(fieldMap.get('aqi')!, String(weather.aqi), today);
    }
    if (tracked.has('pm25') && weather.pm25 != null) {
      await logIfNew(fieldMap.get('pm25')!, String(weather.pm25), today);
    }
    if (tracked.has('pm10') && weather.pm10 != null) {
      await logIfNew(fieldMap.get('pm10')!, String(weather.pm10), today);
    }
    if (tracked.has('ozone') && weather.ozone != null) {
      await logIfNew(fieldMap.get('ozone')!, String(weather.ozone), today);
    }
    if (tracked.has('no2') && weather.no2 != null) {
      await logIfNew(fieldMap.get('no2')!, String(weather.no2), today);
    }
    if (tracked.has('so2') && weather.so2 != null) {
      await logIfNew(fieldMap.get('so2')!, String(weather.so2), today);
    }
    if (tracked.has('co') && weather.co != null) {
      await logIfNew(fieldMap.get('co')!, String(weather.co), today);
    }
    if (tracked.has('wind_chill') && weather.apparentTemp != null) {
      await logIfNew(fieldMap.get('wind_chill')!, String(weather.apparentTemp), today);
    }
    if (tracked.has('pressure') && weather.pressure != null) {
      await logIfNew(fieldMap.get('pressure')!, String(weather.pressure), today);
    }

    console.log('[weather-sync] Synced weather for', coords.lat.toFixed(2), coords.lon.toFixed(2), 'on', today, weather);

    await setAppSetting('weather_last_synced', today);

    return { success: true, synced: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function initWeatherDefaults(): Promise<void> {
  const existing = await getAppSetting('weather_enabled');
  if (existing == null) {
    await setWeatherEnabled(true);
    for (const m of WEATHER_METRICS) {
      await setWeatherTracked(m.key, true);
    }
  }
}
