import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SymptomField, FieldEntry } from '../types';
import { getUserSymptomFields, getEntriesInRange } from '../database';
import { parseOptions, hexToRgba } from '../utils/entryUtils';
import { format, subDays, subYears } from 'date-fns';
import {
  IoCheckmark,
  IoFilterOutline,
  IoBarChartOutline,
  IoTrendingUpOutline,
  IoLayersOutline,
  IoGridOutline,
  IoGitNetworkOutline,
} from 'react-icons/io5';
import BottomSheet from '../components/BottomSheet';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

type TimeRange = 'week' | 'month' | 'year' | 'custom';
type ChartType = 'bar' | 'line' | 'area' | 'heatmap' | 'correlation';

const CHART_TABS: { key: ChartType; icon: React.ReactNode; label: string }[] = [
  { key: 'bar',         icon: <IoBarChartOutline size={14} />,   label: 'Bar' },
  { key: 'line',        icon: <IoTrendingUpOutline size={14} />, label: 'Line' },
  { key: 'area',        icon: <IoLayersOutline size={14} />,     label: 'Area' },
  { key: 'heatmap',     icon: <IoGridOutline size={14} />,       label: 'Heatmap' },
  { key: 'correlation', icon: <IoGitNetworkOutline size={14} />, label: 'Correlate' },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getDateRange(range: TimeRange, customStart?: string, customEnd?: string): { start: string; end: string } {
  const today = new Date();
  const end = format(today, 'yyyy-MM-dd');
  if (range === 'week')  return { start: format(subDays(today, 6),   'yyyy-MM-dd'), end };
  if (range === 'month') return { start: format(subDays(today, 29),  'yyyy-MM-dd'), end };
  if (range === 'year')  return { start: format(subYears(today, 1),  'yyyy-MM-dd'), end };
  // custom
  const s = customStart?.trim() || format(subDays(today, 6), 'yyyy-MM-dd');
  const e = customEnd?.trim()   || end;
  return { start: s, end: e };
}

function getDayDiff(start: string, end: string): number {
  return Math.floor(
    (new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) /
    86400000
  );
}

function getDatesInRange(start: string, end: string, range: TimeRange): string[] {
  const startDate = new Date(start + 'T12:00:00');
  const endDate   = new Date(end   + 'T12:00:00');
  const monthly   = range === 'year' || (range === 'custom' && getDayDiff(start, end) > 60);
  const dates: string[] = [];
  if (monthly) {
    let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cur <= endDate) {
      dates.push(format(cur, 'yyyy-MM'));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else {
    let cur = new Date(startDate);
    while (cur <= endDate) {
      dates.push(format(cur, 'yyyy-MM-dd'));
      cur = new Date(cur.getTime() + 86400000);
    }
  }
  return dates;
}

function isNumericField(field: SymptomField): boolean {
  if (field.inputType === 'number_input' || field.inputType === 'slider') return true;
  if (field.inputType === 'single_select') {
    return parseOptions(field.options).some((o) => o.value != null);
  }
  return false;
}

function getNumericValue(value: string, field: SymptomField): number | null {
  if (field.inputType === 'number_input' || field.inputType === 'slider') {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }
  if (field.inputType === 'single_select' && field.options) {
    const opt = parseOptions(field.options).find((o) => o.label === value);
    return opt?.value != null ? opt.value : null;
  }
  return null;
}

function formatRangeLabel(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end   + 'T12:00:00');
  if (s.getFullYear() === e.getFullYear())
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
  return `${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`;
}

function pearsonCorrelation(x: number[], y: number[]): number | null {
  const n = x.length;
  if (n < 3) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den === 0 ? null : num / den;
}

function correlationColor(r: number): string {
  if (r >=  0.7) return '#2ecc71';
  if (r >=  0.4) return '#a8e6cf';
  if (r >= -0.1) return '#f0f0f0';
  if (r >= -0.4) return '#fadadd';
  if (r >= -0.7) return '#e88888';
  return '#c0392b';
}

function correlationLabel(r: number): string {
  const a = Math.abs(r);
  if (a >= 0.7) return r > 0 ? 'Strong +' : 'Strong −';
  if (a >= 0.4) return r > 0 ? 'Moderate +' : 'Moderate −';
  if (a >= 0.1) return r > 0 ? 'Weak +' : 'Weak −';
  return 'None';
}

function computeTrend(data: number[]): { label: string; color: string } | null {
  const valid = data.filter((v) => v > 0);
  if (valid.length < 2) return null;
  const mid = Math.ceil(valid.length / 2);
  const a1 = valid.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const a2 = valid.slice(mid).reduce((a, b) => a + b, 0) / (valid.length - mid);
  if (a1 === 0) return null;
  const pct = ((a2 - a1) / a1) * 100;
  if (Math.abs(pct) < 5) return { label: 'Stable', color: '#888' };
  return pct > 0
    ? { label: `+${Math.round(pct)}%`, color: '#4caf50' }
    : { label: `${Math.round(pct)}%`,  color: '#f44336' };
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, valueLabel }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', fontSize: '12px', lineHeight: '1.5' }}>
      <div style={{ color: '#999', marginBottom: '2px' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontWeight: 600, color: p.color || '#333' }}>
          {p.name ?? valueLabel}: {typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
        </div>
      ))}
    </div>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: hexToRgba(color, 0.08), borderRadius: '8px', padding: '6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px', flex: '1 1 0' }}>
      <span style={{ fontSize: '15px', fontWeight: '700', color: '#333' }}>{value}</span>
      <span style={{ fontSize: '10px', color: '#999', marginTop: '1px' }}>{label}</span>
    </div>
  );
}

// ─── FieldStats type ──────────────────────────────────────────────────────────

type FieldStats =
  | { type: 'numeric'; avg: string; min: string; max: string; daysLogged: number; totalEntries: number; trend: { label: string; color: string } | null }
  | { type: 'count';   totalEntries: number; daysLogged: number; avgPerDay: string; peak: number; trend: { label: string; color: string } | null };

// ─── Main component ───────────────────────────────────────────────────────────

export default function Trends() {
  const [timeRange,       setTimeRange]       = useState<TimeRange>('week');
  const [chartType,       setChartType]       = useState<ChartType>('line');
  const [fields,          setFields]          = useState<SymptomField[]>([]);
  const [enabledFields,   setEnabledFields]   = useState<Set<number>>(new Set());
  const [entries,         setEntries]         = useState<FieldEntry[]>([]);
  const [showFilter,      setShowFilter]      = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate,   setCustomEndDate]   = useState('');
  const [heatmapTooltip,  setHeatmapTooltip]  = useState<{ date: string; count: number; avg: number | null; fieldId: number } | null>(null);

  useEffect(() => {
    getUserSymptomFields().then((f) => {
      setFields(f);
      setEnabledFields(new Set(f.map((ff) => ff.id!)));
    });
  }, []);

  const loadEntries = useCallback(async () => {
    const { start, end } = getDateRange(timeRange, customStartDate, customEndDate);
    setLoading(true);
    try { setEntries(await getEntriesInRange(start, end)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [timeRange, customStartDate, customEndDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const activeFields  = fields.filter((f) => enabledFields.has(f.id!));
  const numericFields = activeFields.filter(isNumericField);

  const { start, end } = getDateRange(timeRange, customStartDate, customEndDate);
  const buckets         = getDatesInRange(start, end, timeRange);
  const useMonthly      = timeRange === 'year' || (timeRange === 'custom' && getDayDiff(start, end) > 60);

  const totalEntries = entries.filter((e) => activeFields.some((f) => f.id === e.fieldId)).length;

  const dateLabel = (bucket: string) => {
    if (useMonthly) return format(new Date(bucket + '-01T12:00:00'), 'MMM');
    if (timeRange === 'week') return format(new Date(bucket + 'T12:00:00'), 'EEE');
    const d = new Date(bucket + 'T12:00:00');
    return d.getDate() === 1 ? format(d, 'MMM d') : format(d, 'd');
  };

  // Per-field chart data (bar / line / area)
  function buildFieldChartData(field: SymptomField) {
    const fe  = entries.filter((e) => e.fieldId === field.id);
    const num = isNumericField(field);
    return buckets.map((bucket) => {
      const day = fe.filter((e) => (useMonthly ? e.loggedAt.slice(0, 7) : e.loggedAt.slice(0, 10)) === bucket);
      const count = day.length;
      let avg: number | null = null;
      let min: number | null = null;
      let max: number | null = null;
      if (num) {
        const nums = day.map((e) => getNumericValue(e.value, field)).filter((n): n is number => n != null);
        if (nums.length > 0) {
          avg = parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
          min = Math.min(...nums);
          max = Math.max(...nums);
        }
      }
      return { date: dateLabel(bucket), count, value: avg, min, max };
    });
  }

  function computeStats(field: SymptomField): FieldStats {
    const data       = buildFieldChartData(field);
    const totalCount = data.reduce((a, b) => a + b.count, 0);
    const daysLogged = data.filter((d) => d.count > 0).length;
    if (isNumericField(field)) {
      const vals = data.map((d) => d.value).filter((n): n is number => n != null);
      if (vals.length > 0) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        return { type: 'numeric', avg: avg.toFixed(1), min: Math.min(...vals).toFixed(1), max: Math.max(...vals).toFixed(1), daysLogged, totalEntries: totalCount, trend: computeTrend(vals) };
      }
    }
    const counts = data.map((d) => d.count);
    return { type: 'count', totalEntries: totalCount, daysLogged, avgPerDay: daysLogged > 0 ? (totalCount / buckets.length).toFixed(1) : '0', peak: Math.max(0, ...counts), trend: computeTrend(counts) };
  }

  // Combined overview data (multi-line)
  const overviewData = useMemo(() => buckets.map((bucket) => {
    const row: Record<string, string | number | null> = { date: dateLabel(bucket) };
    for (const field of activeFields) {
      const day = entries.filter((e) => e.fieldId === field.id && (useMonthly ? e.loggedAt.slice(0, 7) : e.loggedAt.slice(0, 10)) === bucket);
      if (isNumericField(field)) {
        const nums = day.map((e) => getNumericValue(e.value, field)).filter((n): n is number => n != null);
        row[`f_${field.id}`] = nums.length > 0 ? parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : null;
      } else {
        row[`f_${field.id}`] = day.length || null;
      }
    }
    return row;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [entries, activeFields, buckets, useMonthly]);

  // ── Heatmap data ────────────────────────────────────────────────────────────
  // Build a set of all calendar days in range (Sunday-padded, full weeks)
  const heatmapCalendar = useMemo(() => {
    const startD  = new Date(start + 'T12:00:00');
    const endD    = new Date(end   + 'T12:00:00');
    const today   = format(new Date(), 'yyyy-MM-dd');
    // pad back to Sunday
    const padded  = new Date(startD);
    padded.setDate(padded.getDate() - padded.getDay());
    const allDays: string[] = [];
    const cur = new Date(padded);
    while (cur <= endD) { allDays.push(format(cur, 'yyyy-MM-dd')); cur.setDate(cur.getDate() + 1); }
    while (allDays.length % 7 !== 0) {
      const last = new Date(allDays[allDays.length - 1] + 'T12:00:00');
      last.setDate(last.getDate() + 1);
      allDays.push(format(last, 'yyyy-MM-dd'));
    }
    const weeks: string[][] = [];
    for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));
    return { weeks, today, startISO: format(startD, 'yyyy-MM-dd'), endISO: format(endD, 'yyyy-MM-dd') };
  }, [start, end]);

  // ── Correlation matrix ──────────────────────────────────────────────────────
  const correlationMatrix = useMemo(() => {
    if (numericFields.length < 2) return null;
    const series = numericFields.map((field) => {
      const fe = entries.filter((e) => e.fieldId === field.id);
      return buckets.map((bucket) => {
        const day  = fe.filter((e) => (useMonthly ? e.loggedAt.slice(0, 7) : e.loggedAt.slice(0, 10)) === bucket);
        const nums = day.map((e) => getNumericValue(e.value, field)).filter((n): n is number => n != null);
        return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      });
    });
    const n = numericFields.length;
    const matrix: (number | null)[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i === j) return 1;
        const xs: number[] = [], ys: number[] = [];
        series[i].forEach((v, k) => { const w = series[j][k]; if (v != null && w != null) { xs.push(v); ys.push(w); } });
        return pearsonCorrelation(xs, ys);
      })
    );
    return { matrix, series };
  }, [numericFields, entries, buckets, useMonthly]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div style={{ padding: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#333', margin: 0 }}>Trends</h1>
          <button onClick={() => setShowFilter(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '20px', border: '1.5px solid #e0e0e0', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#555' }}>
            <IoFilterOutline size={14} />
            Filter
            {enabledFields.size < fields.length && (
              <span style={{ background: '#a5a5df', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>{enabledFields.size}</span>
            )}
          </button>
        </div>

        {/* Time range tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'white', borderRadius: '10px', padding: '3px', marginBottom: '10px' }}>
          {(['week', 'month', 'year'] as TimeRange[]).map((r) => (
            <button key={r} onClick={() => setTimeRange(r)} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', background: timeRange === r ? '#a5a5df' : 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: timeRange === r ? '600' : '400', color: timeRange === r ? 'white' : '#888', textTransform: 'capitalize', transition: 'all 0.15s ease' }}>
              {r}
            </button>
          ))}
          <button
            onClick={() => {
              setTimeRange('custom');
              if (!customStartDate) setCustomStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
              if (!customEndDate)   setCustomEndDate(format(new Date(), 'yyyy-MM-dd'));
            }}
            style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', background: timeRange === 'custom' ? '#a5a5df' : 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: timeRange === 'custom' ? '600' : '400', color: timeRange === 'custom' ? 'white' : '#888', transition: 'all 0.15s ease' }}
          >
            Custom
          </button>
        </div>

        {/* Custom date range picker */}
        {timeRange === 'custom' && (
          <div style={{ background: 'white', borderRadius: '10px', padding: '12px', marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px', fontWeight: 500 }}>From</label>
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e8e8e8', fontSize: '13px', boxSizing: 'border-box', color: '#333' }} />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px', fontWeight: 500 }}>To</label>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e8e8e8', fontSize: '13px', boxSizing: 'border-box', color: '#333' }} />
            </div>
          </div>
        )}

        {/* Summary bar */}
        {!loading && activeFields.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 2px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#999' }}>{formatRangeLabel(start, end)}</span>
            <span style={{ fontSize: '12px', color: '#999' }}>{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}</span>
          </div>
        )}

        {/* Chart type pills */}
        {!loading && activeFields.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
            {CHART_TABS.map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setChartType(key)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '20px', border: `1.5px solid ${chartType === key ? '#a5a5df' : '#e0e0e0'}`, background: chartType === key ? '#a5a5df' : 'white', color: chartType === key ? 'white' : '#666', cursor: 'pointer', fontSize: '12px', fontWeight: chartType === key ? '600' : '400', whiteSpace: 'nowrap', transition: 'all 0.15s ease', flexShrink: 0 }}
              >
                {icon}{label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading...</div>
        ) : activeFields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' }}>No trackers selected. Use the filter to enable some.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* ── Overview multi-line (bar / line / area only) ── */}
            {activeFields.length > 1 && (chartType === 'bar' || chartType === 'line' || chartType === 'area') && (
              <div style={{ background: 'white', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>Overview</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={overviewData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={{ stroke: '#eee' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'white', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', border: 'none', fontSize: '12px' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    {activeFields.map((field) => (
                      <Line key={field.id} type="monotone" dataKey={`f_${field.id}` as any} stroke={field.color || '#a5a5df'} strokeWidth={2} name={field.name} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Heatmap — one card per field ── */}
            {chartType === 'heatmap' && (
              <HeatmapSection
                activeFields={activeFields}
                entries={entries}
                calendar={heatmapCalendar}
                tooltip={heatmapTooltip}
                setTooltip={setHeatmapTooltip}
              />
            )}

            {/* ── Correlation matrix ── */}
            {chartType === 'correlation' && (
              <CorrelationSection
                numericFields={numericFields}
                matrix={correlationMatrix?.matrix ?? null}
              />
            )}

            {/* ── Per-field cards (bar / line / area) ── */}
            {(chartType === 'bar' || chartType === 'line' || chartType === 'area') &&
              activeFields.map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  chartData={buildFieldChartData(field)}
                  stats={computeStats(field)}
                  chartType={chartType}
                  isNumeric={isNumericField(field)}
                />
              ))
            }
          </div>
        )}
      </div>

      {/* Filter sheet */}
      <BottomSheet isOpen={showFilter} onClose={() => setShowFilter(false)} title="Filter Trackers">
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => setEnabledFields(new Set(fields.map((f) => f.id!)))} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #e0e0e0', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#555' }}>All</button>
            <button onClick={() => setEnabledFields(new Set())} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #e0e0e0', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#555' }}>None</button>
          </div>
          {fields.map((field) => {
            const enabled = enabledFields.has(field.id!);
            const fc = field.color || '#a5a5df';
            return (
              <button
                key={field.id}
                onClick={() => setEnabledFields((prev) => { const next = new Set(prev); next.has(field.id!) ? next.delete(field.id!) : next.add(field.id!); return next; })}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '10px', border: `2px solid ${enabled ? fc : '#e0e0e0'}`, background: enabled ? hexToRgba(fc, 0.08) : 'white', cursor: 'pointer', marginBottom: '6px', textAlign: 'left' }}
              >
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: enabled ? fc : 'white', border: `2px solid ${enabled ? fc : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {enabled && <IoCheckmark size={10} color="white" />}
                </div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: fc }} />
                <span style={{ fontSize: '14px', color: '#333' }}>{field.name}</span>
                {isNumericField(field) && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#bbb' }}>Numeric</span>}
              </button>
            );
          })}
          <button onClick={() => setShowFilter(false)} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: '#a5a5df', color: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: '600', marginTop: '8px' }}>
            Apply ({enabledFields.size} trackers)
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── Per-Field Chart Card (bar / line / area) ─────────────────────────────────

interface FieldCardProps {
  field: SymptomField;
  chartData: { date: string; count: number; value: number | null; min: number | null; max: number | null }[];
  stats: FieldStats;
  chartType: 'bar' | 'line' | 'area';
  isNumeric: boolean;
}

function FieldCard({ field, chartData, stats, chartType, isNumeric }: FieldCardProps) {
  const color      = field.color || '#a5a5df';
  const hasData    = stats.totalEntries > 0;
  const useValue   = isNumeric && (chartType === 'line' || chartType === 'area');
  const dataKey    = useValue ? 'value' : 'count';
  const yLabel     = useValue ? 'Avg' : 'Count';
  const gradientId = `grad-${field.id}`;

  const axisProps = {
    tick: { fontSize: 10, fill: '#bbb' },
    tickLine: false,
    axisLine: { stroke: '#eee' } as any,
  };
  const yAxisProps = { tick: { fontSize: 10, fill: '#bbb' }, tickLine: false, axisLine: false as any, width: 40, allowDecimals: false };

  return (
    <div style={{ background: 'white', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasData ? '12px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>{field.name}</span>
        </div>
        {stats.trend && (
          <span style={{ fontSize: '12px', fontWeight: '600', color: stats.trend.color, background: hexToRgba(stats.trend.color, 0.1), padding: '2px 8px', borderRadius: '10px' }}>
            {stats.trend.label}
          </span>
        )}
      </div>

      {!hasData ? (
        <div style={{ padding: '20px 0 4px', textAlign: 'center', color: '#bbb', fontSize: '13px' }}>No entries in this period</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={150}>
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" {...axisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<CustomTooltip valueLabel={yLabel} />} />
                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            ) : chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" {...axisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<CustomTooltip valueLabel={yLabel} />} />
                {/* Min–max reference band using two areas */}
                {isNumeric && (
                  <Area type="monotone" dataKey="max" stroke="none" fill={hexToRgba(color, 0.08)} connectNulls />
                )}
                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} connectNulls />
              </AreaChart>
            ) : (
              /* line with min/max range shading via ReferenceLine isn't ideal; use AreaChart with band */
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={color} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" {...axisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<CustomTooltip valueLabel={yLabel} />} />
                {isNumeric && (
                  <>
                    <Area type="monotone" dataKey="max" stroke="none" fill={hexToRgba(color, 0.1)} connectNulls name="Max" />
                    <Area type="monotone" dataKey="min" stroke="none" fill="white" connectNulls name="Min" />
                  </>
                )}
                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} connectNulls />
              </AreaChart>
            )}
          </ResponsiveContainer>

          {chartType === 'line' && isNumeric && (
            <div style={{ fontSize: '11px', color: '#bbb', textAlign: 'center', marginTop: '2px' }}>Shaded band = daily min–max range</div>
          )}

          <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
            {stats.type === 'numeric' ? (
              <>
                <StatPill label="Avg"     value={stats.avg}          color={color} />
                <StatPill label="Min"     value={stats.min}          color={color} />
                <StatPill label="Max"     value={stats.max}          color={color} />
                <StatPill label="Days"    value={stats.daysLogged}   color={color} />
                <StatPill label="Entries" value={stats.totalEntries} color={color} />
              </>
            ) : (
              <>
                <StatPill label="Total"   value={stats.totalEntries} color={color} />
                <StatPill label="Days"    value={stats.daysLogged}   color={color} />
                <StatPill label="Avg/day" value={stats.avgPerDay}    color={color} />
                <StatPill label="Peak"    value={stats.peak}         color={color} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Heatmap Section ──────────────────────────────────────────────────────────

interface HeatmapProps {
  activeFields: SymptomField[];
  entries: FieldEntry[];
  calendar: { weeks: string[][]; today: string; startISO: string; endISO: string };
  tooltip: { date: string; count: number; avg: number | null; fieldId: number } | null;
  setTooltip: (v: { date: string; count: number; avg: number | null; fieldId: number } | null) => void;
}

function HeatmapSection({ activeFields, entries, calendar, tooltip, setTooltip }: HeatmapProps) {
  const { weeks, today, startISO, endISO } = calendar;
  const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  if (activeFields.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb', fontSize: '13px' }}>Select trackers to see the heatmap.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Tooltip banner */}
      {tooltip && (
        <div
          onClick={() => setTooltip(null)}
          style={{ background: '#222', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>
              {format(new Date(tooltip.date + 'T12:00:00'), 'EEE, MMM d, yyyy')}
            </div>
            <div style={{ color: '#aaa', fontSize: '11px', marginTop: '1px' }}>
              {tooltip.count === 0 ? 'No entries' : tooltip.avg != null ? `${tooltip.count} ${tooltip.count === 1 ? 'entry' : 'entries'} · avg ${tooltip.avg.toFixed(1)}` : `${tooltip.count} ${tooltip.count === 1 ? 'entry' : 'entries'}`}
            </div>
          </div>
          <span style={{ color: '#666', fontSize: '16px' }}>×</span>
        </div>
      )}

      {activeFields.map((field) => {
        const color     = field.color || '#a5a5df';
        const fe        = entries.filter((e) => e.fieldId === field.id);
        const countMap  = new Map<string, number>();
        const avgMap    = new Map<string, number>();
        const numeric   = isNumericField(field);

        fe.forEach((e) => {
          const d = e.loggedAt.slice(0, 10);
          countMap.set(d, (countMap.get(d) || 0) + 1);
          if (numeric) {
            const v = getNumericValue(e.value, field);
            if (v != null) {
              const prev = avgMap.get(d);
              avgMap.set(d, prev == null ? v : (prev + v) / 2);
            }
          }
        });

        const maxCount  = Math.max(1, ...Array.from(countMap.values()));
        const hasAny    = Array.from(countMap.values()).some((c) => c > 0);
        const totalCount = Array.from(countMap.values()).reduce((a, b) => a + b, 0);

        // Month boundary labels
        const monthLabels: Map<number, string> = new Map();
        weeks.forEach((week, wi) => {
          const d = new Date(week[0] + 'T12:00:00');
          if (wi === 0 || d.getDate() <= 7)
            monthLabels.set(wi, format(d, 'MMM'));
        });

        return (
          <div key={field.id} style={{ background: 'white', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#333', flex: 1 }}>{field.name}</span>
              {hasAny && <span style={{ fontSize: '11px', color: '#bbb' }}>{totalCount} entries</span>}
            </div>

            {!hasAny ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#bbb', fontSize: '13px' }}>No data in this period</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'inline-block', minWidth: '100%' }}>
                  {/* Month labels */}
                  <div style={{ display: 'flex', marginLeft: '18px', marginBottom: '2px' }}>
                    {weeks.map((_, wi) => (
                      <div key={wi} style={{ width: '16px', marginRight: '3px', fontSize: '9px', color: '#aaa', fontWeight: 600 }}>
                        {monthLabels.get(wi) || ''}
                      </div>
                    ))}
                  </div>
                  {/* Grid rows = days of week */}
                  {DOW.map((dowLabel, dow) => (
                    <div key={dow} style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ width: '14px', fontSize: '9px', color: '#ccc', textAlign: 'right', marginRight: '4px', flexShrink: 0 }}>
                        {[1, 3, 5].includes(dow) ? dowLabel : ''}
                      </span>
                      {weeks.map((week, wi) => {
                        const day       = week[dow];
                        const count     = countMap.get(day) ?? 0;
                        const avg       = avgMap.get(day) ?? null;
                        const intensity = count > 0 ? Math.max(0.2, count / maxCount) : 0;
                        const isToday   = day === today;
                        const isFuture  = day > endISO;
                        const isPadded  = day < startISO;
                        const isSelected = tooltip?.date === day && tooltip.fieldId === field.id;

                        let bg = '#f0f0f0';
                        if (isFuture || isPadded) bg = 'transparent';
                        else if (count > 0) bg = color + Math.round(intensity * 255).toString(16).padStart(2, '0');

                        return (
                          <div
                            key={wi}
                            onClick={() => {
                              if (isFuture || isPadded) return;
                              if (isSelected) { setTooltip(null); return; }
                              setTooltip({ date: day, count, avg, fieldId: field.id! });
                            }}
                            title={`${day}: ${count} entries${avg != null ? ` · avg ${avg.toFixed(1)}` : ''}`}
                            style={{ width: '14px', height: '14px', borderRadius: '3px', background: bg, marginRight: '3px', border: isToday ? `2px solid ${color}` : isSelected ? '2px solid #222' : '2px solid transparent', boxSizing: 'border-box', cursor: isFuture || isPadded ? 'default' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          />
                        );
                      })}
                    </div>
                  ))}
                  {/* Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', marginLeft: '18px' }}>
                    <span style={{ fontSize: '9px', color: '#bbb' }}>Less</span>
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
                      <div key={v} style={{ width: '10px', height: '10px', borderRadius: '2px', background: color + Math.round(v * 255).toString(16).padStart(2, '0') }} />
                    ))}
                    <span style={{ fontSize: '9px', color: '#bbb' }}>More</span>
                    {numeric && <span style={{ fontSize: '9px', color: '#bbb', marginLeft: '6px' }}>· tap cell for details</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Correlation Matrix Section ───────────────────────────────────────────────

interface CorrelationProps {
  numericFields: SymptomField[];
  matrix: (number | null)[][] | null;
}

function CorrelationSection({ numericFields, matrix }: CorrelationProps) {
  if (numericFields.length < 2) {
    return (
      <div style={{ background: 'white', borderRadius: '14px', padding: '32px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center', color: '#bbb', fontSize: '13px' }}>
        Select at least 2 numeric fields to see correlations.
      </div>
    );
  }
  if (!matrix) return null;

  const n = numericFields.length;

  // Notable pairs (|r| >= 0.4, excluding diagonal)
  const notable: { a: SymptomField; b: SymptomField; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const r = matrix[i][j];
      if (r != null && Math.abs(r) >= 0.4)
        notable.push({ a: numericFields[i], b: numericFields[j], r });
    }
  }
  notable.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  const cellSize = Math.min(64, Math.floor((Math.min(600, window.innerWidth) - 48 - 60) / n));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Matrix */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Correlation Matrix</div>
        <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '12px' }}>Pearson correlation — how symptoms move together</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: '3px' }}>
            <thead>
              <tr>
                <th style={{ width: `${cellSize}px` }} />
                {numericFields.map((f, j) => (
                  <th key={j} style={{ width: `${cellSize}px`, padding: '0 0 6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.color || '#a5a5df' }} />
                      <span style={{ fontSize: '8px', color: '#666', textAlign: 'center', lineHeight: '1.2', maxWidth: `${cellSize}px`, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{f.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numericFields.map((rowF, i) => (
                <tr key={i}>
                  <td style={{ paddingRight: '4px', textAlign: 'right' }}>
                    <span style={{ fontSize: '8px', color: '#666', display: 'block', maxWidth: `${cellSize}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rowF.name}</span>
                  </td>
                  {numericFields.map((_, j) => {
                    const r    = matrix[i][j];
                    const diag = i === j;
                    const bg   = diag ? hexToRgba(rowF.color || '#a5a5df', 0.15) : r != null ? correlationColor(r) : '#f9f9f9';
                    return (
                      <td key={j}>
                        <div style={{ width: `${cellSize}px`, height: `${cellSize}px`, borderRadius: '6px', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          {diag ? (
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: rowF.color || '#a5a5df' }} />
                          ) : r != null ? (
                            <>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: Math.abs(r) > 0.4 ? '#222' : '#999' }}>{r.toFixed(2)}</span>
                              <span style={{ fontSize: '7px', color: '#888', textAlign: 'center', lineHeight: '1.2' }}>{correlationLabel(r)}</span>
                            </>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#ccc' }}>—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Colour legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px', justifyContent: 'center' }}>
          {[
            { color: '#2ecc71', label: 'Strong + (≥0.7)' },
            { color: '#a8e6cf', label: 'Moderate + (≥0.4)' },
            { color: '#f0f0f0', label: 'Weak / none' },
            { color: '#fadadd', label: 'Moderate −' },
            { color: '#c0392b', label: 'Strong −' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, border: '1px solid #ddd' }} />
              <span style={{ fontSize: '10px', color: '#888' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notable correlations */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Notable Correlations</div>
        {notable.length === 0 ? (
          <div style={{ color: '#bbb', fontSize: '13px' }}>No strong correlations (|r| ≥ 0.4) in this period.</div>
        ) : (
          notable.slice(0, 5).map(({ a, b, r }) => (
            <div key={`${a.id}-${b.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.color || '#a5a5df', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#333', flex: 1 }}>{a.name} & {b.name}</span>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color || '#a5a5df', flexShrink: 0 }} />
              <div style={{ padding: '2px 8px', borderRadius: '8px', background: correlationColor(r) }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#333' }}>{r > 0 ? '+' : ''}{r.toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
