import type { FieldEntry, SelectOption, SliderConfig, InputType } from '../types';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

export function formatEntryValue(
  value: string,
  inputType: InputType,
  _options?: SelectOption[],
  _sliderConfig?: SliderConfig
): string {
  if (!value) return '—';

  switch (inputType) {
    case 'yes_no':
      return value === 'true' || value === 'yes' || value === '1' ? 'Yes' : 'No';
    case 'multi_select': {
      try {
        const arr = JSON.parse(value) as string[];
        return arr.join(', ');
      } catch {
        return value;
      }
    }
    case 'slider':
    case 'number_input':
      return value;
    default:
      return value;
  }
}

export function formatEntryTime(loggedAt: string): string {
  try {
    const date = parseISO(loggedAt);
    return format(date, 'h:mm a');
  } catch {
    return loggedAt;
  }
}

export function formatDateHeader(dateStr: string): string {
  try {
    const date = parseISO(dateStr + 'T12:00:00');
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEE, MMM d, yyyy').toUpperCase();
  } catch {
    return dateStr;
  }
}

export function parseOptions(optionsJson?: string | SelectOption[]): SelectOption[] {
  if (!optionsJson) return [];
  if (Array.isArray(optionsJson)) return optionsJson;
  try {
    return JSON.parse(optionsJson) as SelectOption[];
  } catch {
    return [];
  }
}

export function parseSliderConfig(config?: string | SliderConfig): SliderConfig {
  if (!config) return { min: 0, max: 10, step: 1 };
  if (typeof config === 'object') return config;
  try {
    return JSON.parse(config) as SliderConfig;
  } catch {
    return { min: 0, max: 10, step: 1 };
  }
}

export function groupEntriesByDate(entries: FieldEntry[]): Map<string, FieldEntry[]> {
  const map = new Map<string, FieldEntry[]>();
  for (const entry of entries) {
    const date = entry.loggedAt.slice(0, 10);
    const existing = map.get(date) || [];
    existing.push(entry);
    map.set(date, existing);
  }
  return map;
}

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(165,165,223,${alpha})`;
  return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
}
