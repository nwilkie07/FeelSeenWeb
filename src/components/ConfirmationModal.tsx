import BottomSheet from './BottomSheet';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  destructive = true,
}: ConfirmationModalProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '0 16px 24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          {title}
        </h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #ddd',
              background: 'white',
              cursor: 'pointer',
              fontSize: '15px',
              color: '#333',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: destructive ? '#d32f2f' : '#a5a5df',
              color: 'white',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
