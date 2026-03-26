import { useNavigate } from 'react-router-dom';
import { IoLeafOutline } from 'react-icons/io5';

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
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: '#a5a5df',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <IoLeafOutline size={40} color="white" />
        </div>
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
          Track your symptoms, moods, and health data in one place. Understand your patterns and feel your best.
        </p>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          maxWidth: '340px',
          width: '100%',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <h2
          style={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '12px',
          }}
        >
          What you can track
        </h2>
        <ul
          style={{
            textAlign: 'left',
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.8',
            paddingLeft: '20px',
          }}
        >
          <li>Symptoms and how you feel</li>
          <li>Mood and energy levels</li>
          <li>Sleep, activity, and habits</li>
          <li>Weather conditions (Canada)</li>
          <li>Custom health metrics</li>
        </ul>
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
          marginBottom: '32px',
          boxShadow: '0 4px 12px rgba(165,165,223,0.4)',
        }}
      >
        Enter App
      </button>

      <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
        <button
          onClick={() => navigate('/privacy')}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '13px',
            textDecoration: 'underline',
          }}
        >
          Privacy Policy
        </button>
        <span style={{ color: '#ccc' }}>|</span>
        <button
          onClick={() => navigate('/terms')}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '13px',
            textDecoration: 'underline',
          }}
        >
          Terms of Service
        </button>
      </div>

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
