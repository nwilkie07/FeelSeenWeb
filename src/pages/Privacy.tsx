import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';

export default function Privacy() {
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
          Privacy Policy
        </h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px 48px' }}>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '28px' }}>
          Last Updated: March 2026
        </p>

        <Section title="1. Introduction">
          <p>
            FeelSeen ("we," "our," or "us") is a personal health tracking application designed to
            help users monitor their symptoms, health metrics, and overall well-being. We are
            committed to protecting your privacy and being transparent about how we collect, use,
            and protect your data.
          </p>
          <p style={{ marginTop: '10px' }}>
            By using FeelSeen, you agree to the practices described in this Privacy Policy.
          </p>
        </Section>

        <Section title="2. What Data We Collect">
          <SubHeading>2.1 User-Provided Data</SubHeading>
          <ul style={listStyle}>
            <li><strong>Symptom entries:</strong> Custom symptoms, moods, or health indicators you choose to track (e.g., pain level, energy, sleep quality)</li>
            <li><strong>Health metrics:</strong> Data you manually log, including numeric values, text responses, and multi-select answers</li>
            <li><strong>Notes and comments:</strong> Any free-text notes you add to your entries</li>
            <li><strong>Profile information:</strong> Optional profile data you provide (name, email)</li>
          </ul>

          <SubHeading>2.2 Data from Connected Services</SubHeading>
          <p>
            When you connect third-party platforms (Open Meteo Weather Data),
            we receive only the data types you explicitly authorize. We do not access any
            data beyond what you grant permission for.
          </p>

          <SubHeading>2.3 Google Services for Backup</SubHeading>
          <p>
            When you login to Google for backup, we receive your public google account profile and email address to associate with your encrypted backup data.
            We can also view and administer all your Firebase data and settings
            We also have access to see, edit, configure, and delete your Google Cloud data to automatically create a Firebase database to backup your encrypted data on your google account.
            We do not access any other Google account data.
          </p>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul style={listStyle}>
            <li><strong>Providing our services:</strong> To display your symptom trends and summary statistics</li>
            <li><strong>Syncing your data:</strong> To enable optional cloud backup and restore functionality</li>
          </ul>
        </Section>

        <Section title="4. Data Storage and Security">
          <SubHeading>4.1 Local Storage</SubHeading>
          <p>
            All your health data is stored locally on your device in an encrypted database. We do
            not maintain a central server with your personal health information. When you choose
            cloud backup, your data is stored remotely in your Google account using Firebase.
          </p>

          <SubHeading>4.2 Cloud Backup (Optional)</SubHeading>
          <p>
            You may enable Firebase Cloud Firestore backup through app settings. If enabled, your
            data is encrypted before transmission and storage. You can disable cloud backup and
            request data deletion at any time.
          </p>

          <SubHeading>4.3 Security Measures</SubHeading>
          <ul style={listStyle}>
            <li>Encryption keys are managed through the device's secure storage (iOS Keychain / Android Keystore)</li>
            <li>All network communications use TLS encryption</li>
            <li>We implement standard industry practices to protect your data</li>
          </ul>
        </Section>

        <Section title="5. Data Sharing">
          <SubHeading>5.1 We Do Not Sell Your Data</SubHeading>
          <p>
            FeelSeen does not sell, rent, or trade your personal health data to third parties for
            marketing purposes.
          </p>

          <SubHeading>5.2 Service Providers</SubHeading>
          <p>We may share limited data with service providers who help us operate our app:</p>
          <ul style={listStyle}>
            <li><strong>Firebase (Google):</strong> For optional cloud backup and authentication</li>
            <li><strong>Apple HealthKit / Google Health Connect:</strong> For optional health data integration</li>
          </ul>

          <SubHeading>5.3 Legal Requirements</SubHeading>
          <p>
            We may disclose your data if required by law. However, we cannot access your symptom
            data as it is stored locally on your device or in your Google account (cloud backup).
          </p>
        </Section>

        <Section title="6. Your Rights">
          <ul style={listStyle}>
            <li><strong>Access:</strong> View all your logged data within the app</li>
            <li><strong>Correction:</strong> Edit or delete individual entries</li>
            <li><strong>Deletion:</strong> Delete entire symptom categories or all data through app settings</li>
            <li><strong>Export:</strong> Export your data in CSV or JSON format</li>
            <li><strong>Disable sync:</strong> Turn off cloud backup at any time</li>
            <li><strong>Revoke permissions:</strong> Disconnect integrations through your device settings</li>
          </ul>
          <p style={{ marginTop: '10px' }}>To exercise these rights, use the in-app settings.</p>
        </Section>

        <Section title="7. Children's Privacy">
          <p>
            FeelSeen is not intended for use by children under the age of 13. We do not knowingly
            collect personal information from children under 13. If we become aware that we have
            collected data from a child under 13, we will delete it promptly.
          </p>
        </Section>

        <Section title="8. Third-Party Services">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  <Th>Service</Th>
                  <Th>Data Shared</Th>
                  <Th>Purpose</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>Firebase Cloud Firestore</Td>
                  <Td>Encrypted backup data</Td>
                  <Td>Cloud backup &amp; restore</Td>
                </tr>
                <tr style={{ background: '#fafafa' }}>
                  <Td>Open-Meteo API</Td>
                  <Td>Location (latitude/longitude)</Td>
                  <Td>Weather correlation</Td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
            Each service's privacy policy governs their data handling. We encourage you to review
            their policies.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we
            will notify you through the app or by posting a notice on our website prior to the
            change taking effect.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p>
            If you have questions about this Privacy Policy or want to exercise your data rights,
            please contact us:
          </p>
          <div
            style={{
              background: '#f8f8f8',
              borderRadius: '12px',
              padding: '14px 16px',
              marginTop: '12px',
            }}
          >
            <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
              <strong>Email:</strong>{' '}
              <a href="mailto:support@feelseen.ca" style={{ color: '#a5a5df', textDecoration: 'none' }}>
                support@feelseen.ca
              </a>
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

const listStyle: React.CSSProperties = {
  paddingLeft: '20px',
  marginTop: '8px',
  lineHeight: '1.8',
  color: '#444',
  fontSize: '14px',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h2
        style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#333',
          marginBottom: '10px',
          paddingBottom: '6px',
          borderBottom: '2px solid #f0f0f0',
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: '14px', color: '#444', lineHeight: '1.7' }}>{children}</div>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontWeight: '600', color: '#333', marginTop: '14px', marginBottom: '4px', fontSize: '14px' }}>
      {children}
    </p>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '8px 10px',
        fontWeight: '600',
        color: '#555',
        borderBottom: '1px solid #e8e8e8',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: '8px 10px',
        color: '#444',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      {children}
    </td>
  );
}
