import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoMailOutline, IoShieldCheckmarkOutline, IoChatbubbleOutline } from 'react-icons/io5';

export default function Contact() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100dvh', background: 'white', overflowY: 'auto' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: 'white',
          borderBottom: '1px solid #f0f0f0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            color: '#333',
          }}
          aria-label="Go back"
        >
          <IoArrowBack size={22} />
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#333', margin: 0 }}>
          Contact & Support
        </h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '580px', margin: '0 auto', padding: '32px 20px 48px' }}>
        {/* Intro */}
        <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.6', marginBottom: '32px' }}>
          We're here to help. Whether you have a question about the app, want to report a bug, or
          need help with your data, reach out and we'll get back to you as soon as possible.
        </p>

        {/* Email card */}
        <a
          href="mailto:support@feelseen.ca"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              background: '#f8f8f8',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              border: '1.5px solid transparent',
              transition: 'border-color 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#a5a5df';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#ededf9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IoMailOutline size={24} color="#a5a5df" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#333' }}>
                Email Support
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '14px', color: '#a5a5df' }}>
                support@feelseen.ca
              </p>
            </div>
          </div>
        </a>

        {/* Divider */}
        <div style={{ height: '1px', background: '#f0f0f0', margin: '28px 0' }} />

        {/* Topics */}
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#333', marginBottom: '14px' }}>
          We can help with
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <TopicCard
            icon={<IoChatbubbleOutline size={18} color="#a5a5df" />}
            title="General Questions"
            description="How features work, tips for tracking your health, and getting the most out of FeelSeen."
          />
          <TopicCard
            icon={<IoShieldCheckmarkOutline size={18} color="#a5a5df" />}
            title="Privacy & Data Requests"
            description="Data access, deletion requests, or questions about how your information is handled."
          />
          <TopicCard
            icon={<IoMailOutline size={18} color="#a5a5df" />}
            title="Bug Reports"
            description="Something not working as expected? Let us know and we'll investigate."
          />
        </div>

        {/* Footer note */}
        <p style={{ fontSize: '13px', color: '#aaa', marginTop: '32px', lineHeight: '1.6' }}>
          FeelSeen is a privacy-first health tracking app. Your data stays on your device unless
          you opt in to cloud sync. For privacy policy details, see our{' '}
          <span
            onClick={() => navigate('/privacy')}
            style={{ color: '#a5a5df', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Privacy Policy
          </span>
          .
        </p>
      </div>
    </div>
  );
}

function TopicCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: '#f8f8f8',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: '#ededf9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>{title}</p>
        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#777', lineHeight: '1.5' }}>
          {description}
        </p>
      </div>
    </div>
  );
}
