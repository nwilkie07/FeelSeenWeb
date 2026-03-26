import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';

export default function Terms() {
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
          Terms of Service
        </h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px 48px' }}>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '28px' }}>
          Last Updated: March 2026
        </p>

        <Section title="1. Acceptance of Terms">
          <p>
            By downloading, installing, or using FeelSeen ("the App"), you agree to be bound by
            these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
          </p>
          <p style={{ marginTop: '10px' }}>
            These Terms apply to both the FeelSeen mobile application and the FeelSeen web
            application. We reserve the right to update these Terms at any time. Continued use of
            the App after changes constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            FeelSeen is a personal health and symptom tracking application. It allows you to:
          </p>
          <ul style={listStyle}>
            <li>Create custom symptom and health trackers</li>
            <li>Log daily health entries and observations</li>
            <li>View trends and insights over time</li>
            <li>Optionally sync data across devices via cloud backup</li>
            <li>Optionally import daily weather data for correlation</li>
          </ul>
          <p style={{ marginTop: '10px' }}>
            FeelSeen is a personal wellness tool only. It is <strong>not</strong> a medical device,
            clinical tool, or substitute for professional medical advice, diagnosis, or treatment.
          </p>
        </Section>

        <Section title="3. Medical Disclaimer">
          <p>
            <strong>FeelSeen is not a medical product.</strong> The information and data you record
            in FeelSeen are for your personal reference only and do not constitute medical advice.
          </p>
          <ul style={listStyle}>
            <li>
              Always consult a qualified healthcare professional before making decisions about your
              health, medications, or treatment
            </li>
            <li>
              Do not use FeelSeen as a substitute for professional medical advice, diagnosis, or
              treatment
            </li>
            <li>
              In a medical emergency, contact your local emergency services immediately
            </li>
            <li>
              FeelSeen does not review, or validate the health data you enter
            </li>
          </ul>
        </Section>

        <Section title="4. Eligibility">
          <p>
            You must be at least 13 years of age to use FeelSeen. By using the App, you represent
            and warrant that you meet this requirement. If you are under 18, you represent that you
            have obtained parental or guardian consent.
          </p>
          <p style={{ marginTop: '10px' }}>
            FeelSeen is not directed at children under 13. If we learn that a user is under 13, we
            will take steps to remove their data.
          </p>
        </Section>

        <Section title="5. Your Account and Data">
          <SubHeading>5.1 Local Storage</SubHeading>
          <p>
            All health data you enter is stored locally on your device. You are responsible for
            maintaining access to your device and backing up your data. We are not responsible for
            data loss due to device failure or browser data clearing.
          </p>

          <SubHeading>5.2 Cloud Sync (Optional)</SubHeading>
          <p>
            If you choose to enable cloud sync, your data will be stored in Firebase Cloud Firestore
            under your Google account. You are responsible for the security of your Google account.
            You can disable cloud sync and delete cloud data at any time through Settings.
          </p>

          <SubHeading>5.3 Data Accuracy</SubHeading>
          <p>
            You are solely responsible for the accuracy and completeness of the health data you
            enter. FeelSeen does not verify, or validate your entries.
          </p>

          <SubHeading>5.4 Export and Portability</SubHeading>
          <p>
            You may export your data at any time in CSV or JSON format from the Settings screen.
            Your data belongs to you.
          </p>
        </Section>

        <Section title="6. Acceptable Use">
          <p>You agree not to:</p>
          <ul style={listStyle}>
            <li>Use FeelSeen for any unlawful purpose</li>
            <li>Use the App to store or transmit harmful, offensive, or illegal content</li>
            <li>Attempt to gain unauthorised access to any part of the App or its infrastructure</li>
            <li>Interfere with the proper working of the App or its connected services</li>
            <li>Use automated means to access or interact with the App</li>
          </ul>
        </Section>

        <Section title="7. Third-Party Integrations">
          <p>
            FeelSeen integrates with optional third-party services including Firebase and Open-Meteo. 
            By connecting these services, you agree to their respective terms of service and privacy policies.
          </p>
          <p style={{ marginTop: '10px' }}>
            We are not responsible for the availability, accuracy, or actions of any third-party 
            service. Third-party integrations may be modified or discontinued at any time.
          </p>
          <div style={{ overflowX: 'auto', marginTop: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  <Th>Service</Th>
                  <Th>Purpose</Th>
                  <Th>Optional</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>Google Firebase</Td>
                  <Td>Cloud backup &amp; authentication</Td>
                  <Td>Yes</Td>
                </tr>
                <tr style={{ background: '#fafafa' }}>
                  <Td>Open-Meteo API</Td>
                  <Td>Weather data (global)</Td>
                  <Td>Yes</Td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="8. Intellectual Property">
          <p>
            FeelSeen and its original content, features, and functionality are owned by the
            developer of FeelSeen. The App is provided for your personal, non-commercial use only.
          </p>
          <p style={{ marginTop: '10px' }}>
            You retain full ownership of all health data you enter into the App. By using cloud
            sync, you grant us a limited licence to store and transmit your data solely for the
            purpose of providing the sync service.
          </p>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <p>
            FeelSeen is provided <strong>"as is"</strong> and <strong>"as available"</strong>{' '}
            without warranties of any kind, express or implied, including but not limited to
            warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
          <p style={{ marginTop: '10px' }}>
            We do not warrant that the App will be uninterrupted, error-free, or free of viruses
            or other harmful components. We do not warrant the accuracy or completeness of any
            health-related content or insights provided by the App.
          </p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, FeelSeen and its developers shall
            not be liable for any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to:
          </p>
          <ul style={listStyle}>
            <li>Loss of data or health information</li>
            <li>Personal injury or health outcomes resulting from use of the App</li>
            <li>Any reliance on data, trends, or insights displayed in the App</li>
            <li>Interruption of service or inability to access your data</li>
          </ul>
          <p style={{ marginTop: '10px' }}>
            Our total liability to you for any claims arising from your use of FeelSeen shall not
            exceed the amount you paid for the App (if any) in the twelve months preceding the claim.
          </p>
        </Section>

        <Section title="11. Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless FeelSeen and its developers from and
            against any claims, liabilities, damages, losses, and expenses arising from your use of
            the App, your violation of these Terms, or your violation of any third-party rights.
          </p>
        </Section>

        <Section title="12. Termination">
          <p>
            You may stop using FeelSeen at any time by uninstalling the App or clearing your
            browser data. We reserve the right to suspend or terminate access to the App for
            violations of these Terms.
          </p>
          <p style={{ marginTop: '10px' }}>
            Upon termination, your locally stored data will remain on your device until you clear
            it. Any cloud-backed data in your Firebase project can be deleted through your Google
            account.
          </p>
        </Section>

        <Section title="13. Governing Law">
          <p>
            These Terms are governed by the laws of Canada, without regard to conflict of
            law principles. Any disputes arising from these Terms or your use of FeelSeen shall be
            subject to the exclusive jurisdiction of Canada.
          </p>
        </Section>

        <Section title="14. Changes to These Terms">
          <p>
            We may update these Terms from time to time. We will notify you of significant changes
            by posting a notice within the App. Your continued use of FeelSeen after any changes
            constitutes acceptance of the new Terms.
          </p>
        </Section>

        <Section title="15. Contact Us">
          <p>
            If you have questions about these Terms of Service, please contact us:
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
