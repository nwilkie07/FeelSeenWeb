import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <img
          src="/favicon.svg"
          alt="FeelSeen"
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 16px',
          }}
        />
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#333',
            marginBottom: '8px',
          }}
        >
          FeelSeen
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#666',
            maxWidth: '320px',
            lineHeight: '1.5',
          }}
        >
          Track your symptoms, moods, and health data all in one place. See the patterns in your data and learn how to feel your best.  No account required to start.
        </p>
        <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', justifyContent: 'center', alignItems: 'center' }}>
          <a href="/privacy" style={{ color: '#a5a5df', textDecoration: 'underline' }}>Privacy Policy</a>
          <span style={{ color: '#ccc' }}>|</span>
          <a href="/terms" style={{ color: '#a5a5df', textDecoration: 'underline' }}>Terms</a>
          <span style={{ color: '#ccc' }}>|</span>
          <a href="/contact" style={{ color: '#a5a5df', textDecoration: 'underline' }}>Contact</a>
        </div>
      </div>

      <button
        onClick={() => navigate('/app')}
        style={{
          background: '#a5a5df',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '14px 48px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          marginBottom: '8px',
          boxShadow: '0 4px 12px rgba(165,165,223,0.4)',
        }}
      >
        Enter App
      </button>
      <p
        style={{
          fontSize: '12px',
          color: '#aaa',
          marginTop: '24px',
        }}
      >
        Your data stays private on your device.
      </p>
    </div>
  );
}
