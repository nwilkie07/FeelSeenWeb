export type InputType =
  | 'single_select'
  | 'multi_select'
  | 'number_input'
  | 'slider'
  | 'yes_no'
  | 'short_answer'
  | 'long_answer';

export interface SelectOption {
  label: string;
  value?: number; // numeric value for charting
}

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
}

export interface SymptomField {
  id?: number;
  name: string;
  inputType: InputType;
  options?: SelectOption[]; // for single_select / multi_select
  sliderConfig?: SliderConfig; // for slider
  color: string;
  categoryId?: number;
  createdAt: string;
  isSystem?: boolean; // true for weather/health auto-created fields
}

export interface FieldEntry {
  id?: number;
  fieldId: number;
  value: string;
  loggedAt: string; // ISO datetime string
}

export interface Form {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface FormField {
  id?: number;
  formId: number;
  fieldId: number;
  sortOrder: number;
}

export interface FormWithFields extends Form {
  fields: SymptomField[];
}

export interface AppSetting {
  key: string;
  value: string;
}

export const INPUT_TYPE_LABELS: Record<InputType, string> = {
  single_select: 'Single Select',
  multi_select: 'Multi Select',
  number_input: 'Number',
  slider: 'Slider',
  yes_no: 'Yes / No',
  short_answer: 'Short Answer',
  long_answer: 'Long Answer',
};

export const INPUT_TYPE_DESCRIPTIONS: Record<InputType, string> = {
  single_select: 'Choose one option from a list',
  multi_select: 'Choose multiple options from a list',
  number_input: 'Enter a numeric value',
  slider: 'Slide to pick a value in a range',
  yes_no: 'Simple yes or no',
  short_answer: 'Short text entry',
  long_answer: 'Detailed text entry',
};
