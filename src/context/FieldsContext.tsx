import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { SymptomField, FormWithFields } from '../types';
import { getUserSymptomFields, getFormsWithFields } from '../database';

interface FieldsContextValue {
  fields: SymptomField[];
  forms: FormWithFields[];
  loading: boolean;
  refreshFields: () => Promise<void>;
}

const FieldsContext = createContext<FieldsContextValue>({
  fields: [],
  forms: [],
  loading: true,
  refreshFields: async () => {},
});

export function FieldsProvider({ children }: { children: React.ReactNode }) {
  const [fields, setFields] = useState<SymptomField[]>([]);
  const [forms, setForms] = useState<FormWithFields[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshFields = useCallback(async () => {
    try {
      const [f, fm] = await Promise.all([getUserSymptomFields(), getFormsWithFields()]);
      setFields(f);
      setForms(fm);
    } catch (err) {
      console.error('Failed to load fields', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFields();
  }, [refreshFields]);

  return (
    <FieldsContext.Provider value={{ fields, forms, loading, refreshFields }}>
      {children}
    </FieldsContext.Provider>
  );
}

export function useFields() {
  return useContext(FieldsContext);
}
