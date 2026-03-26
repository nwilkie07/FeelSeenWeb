import { useLocation, useNavigate } from 'react-router-dom';
import {
  IoHome,
  IoHomeOutline,
  IoAdd,
  IoAddCircleOutline,
  IoTime,
  IoTimeOutline,
  IoAnalytics,
  IoAnalyticsOutline,
  IoSettings,
  IoSettingsOutline,
} from 'react-icons/io5';

const tabs = [
  { path: '/app', label: 'Home', icon: IoHomeOutline, activeIcon: IoHome },
  { path: '/create', label: 'Track', icon: IoAddCircleOutline, activeIcon: IoAdd },
  { path: '/history', label: 'History', icon: IoTimeOutline, activeIcon: IoTime },
  { path: '/trends', label: 'Trends', icon: IoAnalyticsOutline, activeIcon: IoAnalytics },
  { path: '/settings', label: 'Settings', icon: IoSettingsOutline, activeIcon: IoSettings },
];

export default function NavigationFooter() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide footer on certain routes
  if (location.pathname === '/health-integrations') return null;
  if (location.pathname.startsWith('/auth/')) return null;
  if (location.pathname === '/privacy') return null;
  if (location.pathname === '/terms') return null;
  if (location.pathname === '/contact') return null;
  if (location.pathname === '/') return null;

  return (
    <nav
      style={{
        borderTop: '1px solid #f0f0f0',
        background: 'white',
        display: 'flex',
        height: '60px',
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = isActive ? tab.activeIcon : tab.icon;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#333' : '#aaa',
              padding: '4px 0',
            }}
          >
            <Icon size={22} />
            <span
              style={{
                fontSize: '10px',
                fontWeight: isActive ? '600' : '400',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
