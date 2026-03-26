import { useState, useEffect, useCallback } from 'react';
import type { SymptomField, FormWithFields } from '../types';
import { getUserSymptomFields, getFormsWithFields, deleteSymptomField, deleteForm } from '../database';
import { INPUT_TYPE_LABELS } from '../types';
import { parseOptions } from '../utils/entryUtils';
import SymptomModal from '../components/SymptomModal';
import FormModal from '../components/FormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { IoAdd, IoPencil, IoTrashOutline, IoMedkitOutline, IoAlbumsOutline } from 'react-icons/io5';
import { hexToRgba } from '../utils/entryUtils';

export default function CreateSymptoms() {
  const [tab, setTab] = useState<'symptoms' | 'forms'>('symptoms');
  const [fields, setFields] = useState<SymptomField[]>([]);
  const [forms, setForms] = useState<FormWithFields[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [symptomModal, setSymptomModal] = useState<{ open: boolean; field?: SymptomField | null }>({
    open: false,
  });
  const [formModal, setFormModal] = useState<{ open: boolean; form?: FormWithFields | null }>({
    open: false,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: 'symptom' | 'form';
    id: number;
    name: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [f, fm] = await Promise.all([getUserSymptomFields(), getFormsWithFields()]);
      setFields(f);
      setForms(fm);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteSymptom = async (id: number) => {
    await deleteSymptomField(id);
    loadData();
  };

  const handleDeleteForm = async (id: number) => {
    await deleteForm(id);
    loadData();
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'white', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#333', marginBottom: '14px' }}>
          Manage Trackers
        </h1>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: '#f3f3f3',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '16px',
          }}
        >
          {[
            { key: 'symptoms', label: 'Symptoms', icon: <IoMedkitOutline size={14} /> },
            { key: 'forms', label: 'Forms', icon: <IoAlbumsOutline size={14} /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'symptoms' | 'forms')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: tab === t.key ? 'white' : 'transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: tab === t.key ? '600' : '400',
                color: tab === t.key ? '#333' : '#888',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading…</div>
        ) : tab === 'symptoms' ? (
          <>
            {fields.map((field) => (
              <SymptomCard
                key={field.id}
                field={field}
                onEdit={() => setSymptomModal({ open: true, field })}
                onDelete={() =>
                  setDeleteConfirm({ open: true, type: 'symptom', id: field.id!, name: field.name })
                }
              />
            ))}
            {fields.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <IoMedkitOutline size={40} color="#ddd" />
                <p style={{ color: '#999', marginTop: '10px', fontSize: '14px' }}>
                  No trackers yet. Tap + to create your first one.
                </p>
              </div>
            )}
            <button
              onClick={() => setSymptomModal({ open: true, field: null })}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '2px dashed #ddd',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#888',
                fontSize: '14px',
                marginTop: '8px',
              }}
            >
              <IoAdd size={18} /> New Tracker
            </button>
          </>
        ) : (
          <>
            {forms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onEdit={() => setFormModal({ open: true, form })}
                onDelete={() =>
                  setDeleteConfirm({ open: true, type: 'form', id: form.id!, name: form.name })
                }
              />
            ))}
            {forms.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <IoAlbumsOutline size={40} color="#ddd" />
                <p style={{ color: '#999', marginTop: '10px', fontSize: '14px' }}>
                  No forms yet. Group trackers together into a form.
                </p>
              </div>
            )}
            <button
              onClick={() => setFormModal({ open: true, form: null })}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '2px dashed #ddd',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#888',
                fontSize: '14px',
                marginTop: '8px',
              }}
            >
              <IoAdd size={18} /> New Form
            </button>
          </>
        )}
      </div>

      {/* Modals */}
      <SymptomModal
        isOpen={symptomModal.open}
        onClose={() => setSymptomModal({ open: false })}
        field={symptomModal.field}
        onSaved={loadData}
      />
      <FormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false })}
        form={formModal.form}
        availableFields={fields}
        onSaved={loadData}
      />
      <ConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm?.type === 'symptom') handleDeleteSymptom(deleteConfirm.id);
          else if (deleteConfirm?.type === 'form') handleDeleteForm(deleteConfirm.id);
        }}
        title={`Delete ${deleteConfirm?.type === 'form' ? 'Form' : 'Tracker'}`}
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? ${
          deleteConfirm?.type === 'symptom' ? 'All logged entries will also be deleted.' : ''
        }`}
      />
    </div>
  );
}

function SymptomCard({
  field,
  onEdit,
  onDelete,
}: {
  field: SymptomField;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = field.color || '#a5a5df';
  const options = parseOptions(field.options);

  return (
    <div
      style={{
        borderRadius: '14px',
        background: '#f8f8f8',
        padding: '12px 14px',
        marginBottom: '10px',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>{field.name}</span>
            <span
              style={{
                fontSize: '11px',
                background: hexToRgba(color, 0.15),
                color: '#555',
                borderRadius: '6px',
                padding: '2px 8px',
              }}
            >
              {INPUT_TYPE_LABELS[field.inputType]}
            </span>
          </div>
          {options.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {options.slice(0, 5).map((opt) => (
                <span
                  key={opt.label}
                  style={{
                    fontSize: '11px',
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    color: '#666',
                  }}
                >
                  {opt.label}
                </span>
              ))}
              {options.length > 5 && (
                <span style={{ fontSize: '11px', color: '#aaa' }}>+{options.length - 5} more</span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onEdit}
            style={{
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#666',
            }}
          >
            <IoPencil size={14} />
          </button>
          <button
            onClick={onDelete}
            style={{
              background: 'none',
              border: '1px solid #fcc',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#d32f2f',
            }}
          >
            <IoTrashOutline size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FormCard({
  form,
  onEdit,
  onDelete,
}: {
  form: FormWithFields;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = form.color || '#a5a5df';
  return (
    <div
      style={{
        borderRadius: '14px',
        background: '#f8f8f8',
        padding: '12px 14px',
        marginBottom: '10px',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
            {form.name}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {form.fields.map((f) => (
              <span
                key={f.id}
                style={{
                  fontSize: '11px',
                  background: hexToRgba(f.color || '#a5a5df', 0.15),
                  borderRadius: '6px',
                  padding: '2px 8px',
                  color: '#555',
                }}
              >
                {f.name}
              </span>
            ))}
            {form.fields.length === 0 && (
              <span style={{ fontSize: '12px', color: '#bbb' }}>No trackers added</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onEdit}
            style={{
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            <IoPencil size={14} />
          </button>
          <button
            onClick={onDelete}
            style={{
              background: 'none',
              border: '1px solid #fcc',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#d32f2f',
            }}
          >
            <IoTrashOutline size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
