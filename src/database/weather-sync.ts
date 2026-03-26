/**
 * weather-sync.ts — automatic weather data fetching from Environment Canada.
 *
 * Fetches current conditions + forecast from the free Environment Canada API,
 * stores them as SymptomField entries in IndexedDB.
 *
 * Works for Canadian locations only (Environment Canada coverage).
 * Auto-triggers on app startup if weather tracking is enabled.
 */

import { db, getAppSetting, setAppSetting, createSymptomField, logFieldEntry, deleteSymptomField } from './index';
import { format } from 'date-fns';

const API_BASE = 'https://api.weather.gc.ca/collections';

// ─── Weather fields config ───────────────────────────────────────────────────

interface WeatherMetric {
  key: string;
  name: string;
  unit: string;
}

export const WEATHER_METRICS: WeatherMetric[] = [
  { key: 'max_temp', name: 'Weather - Max Temp (°C)', unit: '°C' },
  { key: 'min_temp', name: 'Weather - Min Temp (°C)', unit: '°C' },
  { key: 'precipitation', name: 'Weather - Precipitation (mm)', unit: 'mm' },
  { key: 'humidity', name: 'Weather - Humidity (%)', unit: '%' },
  { key: 'uv_high', name: 'Weather - UV Index High', unit: 'index' },
  { key: 'uv_low', name: 'Weather - UV Index Low', unit: 'index' },
  { key: 'max_wind', name: 'Weather - Max Wind (km/h)', unit: 'km/h' },
  { key: 'daylight', name: 'Weather - Daylight Hours', unit: 'hours' },
  { key: 'aqhi', name: 'Weather - Air Quality (AQHI)', unit: 'index' },
  { key: 'wind_chill', name: 'Weather - Wind Chill (°C)', unit: '°C' },
  { key: 'pressure', name: 'Weather - Pressure (kPa)', unit: 'kPa' },
];

const PHYSICAL_CATEGORY_ID = 3; // Physical category

// ─── Settings helpers ───────────────────────────────────────────────────────

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
  return val !== '0'; // defaults to enabled
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

// ─── Location resolution ────────────────────────────────────────────────────

async function resolveCityId(lat: number, lon: number): Promise<{ cityId: string; cityName: string } | null> {
  // Try progressively expanding bounding boxes
  for (const delta of [0.5, 1.5, 3.0, 6.0]) {
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    const url = `${API_BASE}/citypageweather-realtime/items?f=json&bbox=${bbox}&limit=5`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const features: any[] = data.features ?? [];
      if (features.length === 0) continue;

      // Pick closest feature by geometry coordinates
      let best: any = null;
      let bestDist = Infinity;
      for (const f of features) {
        const [fLon, fLat] = f.geometry?.coordinates ?? [0, 0];
        const dist = Math.sqrt(Math.pow(fLat - lat, 2) + Math.pow(fLon - lon, 2));
        if (dist < bestDist) { bestDist = dist; best = f; }
      }
      if (best) {
        // Real API: feature.id is the city code (e.g. "on-143"), name is at properties.name.en
        return {
          cityId: best.id as string,
          cityName: best.properties?.name?.en ?? (best.id as string),
        };
      }
    } catch {
      continue;
    }
  }
  return null;
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

// ─── Weather data fetching ───────────────────────────────────────────────────

interface WeatherData {
  maxTemp: number | null;
  minTemp: number | null;
  precipitation: number | null;
  humidity: number | null;
  uvHigh: number | null;
  uvLow: number | null;
  maxWind: number | null;
  daylightHours: number | null;
  aqhi: number | null;
  windChill: number | null;
  pressure: number | null;
}

async function fetchWeatherData(cityId: string): Promise<WeatherData | null> {
  const url = `${API_BASE}/citypageweather-realtime/items/${cityId}?f=json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Weather fetch error:', res.status);
    return null;
  }

  const data = await res.json();
  const props = data.properties;
  if (!props) return null;

  const current: Record<string, any> = props.currentConditions ?? {};
  const forecasts: any[] = props.forecastGroup?.forecasts ?? [];
  const riseSet: Record<string, any> = props.riseSet ?? {};

  const num = (v: unknown): number | null => {
    if (v == null) return null;
    const n = parseFloat(String(v));
    return isNaN(n) ? null : n;
  };

  // ── Temperature: scan forecast periods for high/low class values ────────────
  let maxTemp: number | null = null;
  let minTemp: number | null = null;
  for (const fc of forecasts) {
    const temps: any[] = fc.temperatures?.temperature ?? [];
    for (const t of temps) {
      const cls = (t.class?.en ?? '').toLowerCase();
      const val = num(t.value?.en);
      if (val == null) continue;
      if (cls === 'high' && maxTemp === null) maxTemp = val;
      if (cls === 'low' && minTemp === null) minTemp = val;
    }
    if (maxTemp !== null && minTemp !== null) break;
  }
  // Fallback to current temperature
  if (maxTemp === null && minTemp === null) {
    const cur = num(current.temperature?.value?.en);
    if (cur !== null) { maxTemp = cur; minTemp = cur; }
  }

  // ── Precipitation: detect from precipPeriods across first 3 forecasts ───────
  // The API doesn't give accumulation amounts in the realtime feed —
  // we use presence of precipPeriods as a proxy (1 = trace, else 0).
  let precipitation: number | null = null;
  for (const fc of forecasts.slice(0, 3)) {
    const periods: any[] = fc.precipitation?.precipPeriods ?? [];
    if (periods.length > 0) {
      precipitation = (precipitation ?? 0) + 1;
    }
  }
  if (precipitation !== null) precipitation = Math.min(precipitation, 10);

  // ── Humidity: current conditions ─────────────────────────────────────────────
  let humidity: number | null = num(current.relativeHumidity?.value?.en);
  if (humidity !== null) humidity = Math.round(humidity);
  if (humidity === null) {
    for (const fc of forecasts.slice(0, 2)) {
      const h = num(fc.relativeHumidity?.value?.en);
      if (h !== null) { humidity = Math.round(h); break; }
    }
  }

  // ── UV: scan daily forecast periods (value is a string like "3") ─────────────
  const uvReadings: number[] = [];
  for (const fc of forecasts) {
    // daily forecast uv lives at fc.uv.index.en (a string)
    const uv = num(fc.uv?.index?.en);
    if (uv !== null) uvReadings.push(uv);
  }
  // Also scan hourly forecasts for UV
  const hourly: any[] = props.hourlyForecastGroup?.hourlyForecasts ?? [];
  for (const h of hourly) {
    const uv = num(h.uv?.index?.value?.en);
    if (uv !== null) uvReadings.push(uv);
  }
  const uvHigh: number | null = uvReadings.length > 0 ? Math.max(...uvReadings) : null;
  const uvLow: number | null = uvReadings.length > 0 ? Math.min(...uvReadings) : null;

  // ── Max wind: current speed, then scan all forecast wind periods ──────────────
  let maxWind: number | null = num(current.wind?.speed?.value?.en);
  for (const fc of forecasts.slice(0, 4)) {
    for (const wp of fc.winds?.periods ?? []) {
      const spd = num(wp.speed?.value?.en);
      const gust = num(wp.gust?.value?.en);
      const peak = gust != null && (spd == null || gust > spd) ? gust : spd;
      if (peak != null) maxWind = Math.max(maxWind ?? 0, peak);
    }
  }
  if (maxWind !== null) maxWind = Math.round(maxWind * 10) / 10;

  // ── Daylight hours: riseSet.sunrise/sunset are full ISO strings ───────────────
  let daylightHours: number | null = null;
  const riseIso = riseSet.sunrise?.en;
  const setIso = riseSet.sunset?.en;
  if (riseIso && setIso) {
    const riseMs = new Date(riseIso).getTime();
    const setMs = new Date(setIso).getTime();
    if (!isNaN(riseMs) && !isNaN(setMs) && setMs > riseMs) {
      daylightHours = Math.round(((setMs - riseMs) / 3_600_000) * 10) / 10;
    }
  }

  // ── Wind chill: current conditions, then first forecast that has it ───────────
  let windChill: number | null = num(current.windChill?.value?.en);
  if (windChill === null) {
    for (const fc of forecasts.slice(0, 3)) {
      const wc = num(fc.windChill?.calculated?.en);
      if (wc !== null) { windChill = wc; break; }
    }
    // Also check hourly forecasts
    if (windChill === null) {
      for (const h of hourly.slice(0, 6)) {
        const wc = num(h.windChill?.value?.en);
        if (wc !== null) { windChill = wc; break; }
      }
    }
  }

  // ── Pressure: current conditions ─────────────────────────────────────────────
  const pressure = num(current.pressure?.value?.en);

  return {
    maxTemp,
    minTemp,
    precipitation,
    humidity,
    uvHigh,
    uvLow,
    maxWind,
    daylightHours,
    aqhi: null, // fetched separately by caller
    windChill,
    pressure: pressure !== null ? Math.round(pressure * 100) / 100 : null,
  };
}

// ─── Field provisioning ─────────────────────────────────────────────────────

/**
 * Ensure SymptomFields exist for every currently-tracked metric.
 * Fields are created on demand but are NEVER auto-deleted here — deletion
 * is explicit via deleteWeatherMetricEntries().
 */
async function ensureWeatherFields(): Promise<Map<string, number>> {
  const fieldMap = new Map<string, number>();
  const tracked = await getAllWeatherTracked();
  const color = '#5dade2'; // light blue for weather

  // Only create fields for tracked metrics
  for (const metric of WEATHER_METRICS) {
    if (!tracked.has(metric.key)) continue;

    // Check if field already exists by name
    const existing = await db.symptomFields.filter(f => f.name === metric.name).first();
    if (existing?.id) {
      fieldMap.set(metric.key, existing.id);
      continue;
    }
    // Create new field
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

/**
 * Delete all entries for a specific weather metric AND remove its SymptomField.
 * Called explicitly by the user via the delete button in WeatherModal.
 */
export async function deleteWeatherMetricEntries(metricKey: string): Promise<void> {
  const metric = WEATHER_METRICS.find(m => m.key === metricKey);
  if (!metric) return;

  const field = await db.symptomFields.filter(f => f.name === metric.name).first();
  if (!field?.id) return;

  // Delete all entries for this field
  await db.fieldEntries.where('fieldId').equals(field.id).delete();
  // Delete the field itself
  await deleteSymptomField(field.id);
}

// ─── AQHI fetch ─────────────────────────────────────────────────────────────

async function fetchAqhi(lat: number, lon: number): Promise<number | null> {
  const delta = 1.5;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  const url = `${API_BASE}/aqhi-observations-realtime/items?f=json&bbox=${bbox}&latest=true&limit=5`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const features: any[] = json?.features ?? [];
    if (features.length === 0) return null;

    // Pick the closest station
    let best: any = null;
    let bestDist = Infinity;
    for (const f of features) {
      const [fLon, fLat] = f.geometry?.coordinates ?? [0, 0];
      const dist = Math.sqrt(Math.pow(fLat - lat, 2) + Math.pow(fLon - lon, 2));
      if (dist < bestDist) { bestDist = dist; best = f; }
    }
    if (!best) return null;
    const aqhi = parseFloat(String(best.properties?.aqhi ?? ''));
    return isNaN(aqhi) ? null : Math.round(aqhi * 10) / 10;
  } catch {
    return null;
  }
}

// ─── Main sync function ────────────────────────────────────────────────────

export async function syncWeather(force = false): Promise<{
  success: boolean;
  error?: string;
  synced?: boolean;
}> {
  try {
    // Check if weather tracking is enabled
    const enabled = await getWeatherEnabled();
    if (!enabled) {
      return { success: true, synced: false };
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const lastSynced = await getWeatherLastSynced();

    // Idempotent: skip if already synced today
    if (!force && lastSynced === today) {
      return { success: true, synced: false };
    }

    // Get location
    let coords = await getWeatherCoords();
    if (!coords) {
      coords = await getLocationFromIP();
    }
    if (!coords) {
      return { success: false, error: 'Location not available. Enable location or enter coordinates.', synced: false };
    }

    // Resolve city ID
    let cityId = await getAppSetting('weather_city_id');
    let cityName = await getAppSetting('weather_city_name');

    if (!cityId || !cityName) {
      const resolved = await resolveCityId(coords.lat, coords.lon);
      if (!resolved) {
        return { success: false, error: 'Could not find weather for your location (Canada only).', synced: false };
      }
      cityId = resolved.cityId;
      cityName = resolved.cityName;
      await setAppSetting('weather_city_id', cityId);
      await setAppSetting('weather_city_name', cityName);
    }

    // Fetch weather data + AQHI in parallel
    const [weather, aqhi] = await Promise.all([
      fetchWeatherData(cityId),
      fetchAqhi(coords.lat, coords.lon),
    ]);
    if (!weather) {
      // City ID may be stale — clear and report
      await setAppSetting('weather_city_id', '');
      return { success: false, error: 'Failed to fetch weather data', synced: false };
    }
    // Attach AQHI to the weather object
    weather.aqhi = aqhi;

    // Ensure fields exist
    const fieldMap = await ensureWeatherFields();
    const tracked = await getAllWeatherTracked();

    // Log each tracked metric (use today as explicit date for idempotency)
    if (tracked.has('max_temp') && weather.maxTemp != null) {
      await logFieldEntry(fieldMap.get('max_temp')!, String(weather.maxTemp), today);
    }
    if (tracked.has('min_temp') && weather.minTemp != null) {
      await logFieldEntry(fieldMap.get('min_temp')!, String(weather.minTemp), today);
    }
    if (tracked.has('precipitation') && weather.precipitation != null) {
      await logFieldEntry(fieldMap.get('precipitation')!, String(weather.precipitation), today);
    }
    if (tracked.has('humidity') && weather.humidity != null) {
      await logFieldEntry(fieldMap.get('humidity')!, String(weather.humidity), today);
    }
    if (tracked.has('uv_high') && weather.uvHigh != null) {
      await logFieldEntry(fieldMap.get('uv_high')!, String(weather.uvHigh), today);
    }
    if (tracked.has('uv_low') && weather.uvLow != null) {
      await logFieldEntry(fieldMap.get('uv_low')!, String(weather.uvLow), today);
    }
    if (tracked.has('max_wind') && weather.maxWind != null) {
      await logFieldEntry(fieldMap.get('max_wind')!, String(weather.maxWind), today);
    }
    if (tracked.has('daylight') && weather.daylightHours != null) {
      await logFieldEntry(fieldMap.get('daylight')!, String(weather.daylightHours), today);
    }
    if (tracked.has('aqhi') && weather.aqhi != null) {
      await logFieldEntry(fieldMap.get('aqhi')!, String(weather.aqhi), today);
    }
    if (tracked.has('wind_chill') && weather.windChill != null) {
      await logFieldEntry(fieldMap.get('wind_chill')!, String(weather.windChill), today);
    }
    if (tracked.has('pressure') && weather.pressure != null) {
      await logFieldEntry(fieldMap.get('pressure')!, String(weather.pressure), today);
    }

    console.log('[weather-sync] Synced weather for', cityName, 'on', today, weather);

    // Update last synced
    await setAppSetting('weather_last_synced', today);

    return { success: true, synced: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Initialization ─────────────────────────────────────────────────────────

export async function initWeatherDefaults(): Promise<void> {
  // Enable weather by default if not set
  const existing = await getAppSetting('weather_enabled');
  if (existing === null) {
    await setWeatherEnabled(true);
    // Track all metrics by default
    for (const m of WEATHER_METRICS) {
      await setWeatherTracked(m.key, true);
    }
  }
}