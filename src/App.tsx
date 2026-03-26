import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// FieldsContext removed — was unused (no component calls useFields())
import NavigationFooter from './components/NavigationFooter';
import Home from './pages/Home';
import CreateSymptoms from './pages/CreateSymptoms';
import History from './pages/History';
import Trends from './pages/Trends';
import Settings from './pages/Settings';
import AuthCallback from './pages/AuthCallback';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Landing from './pages/Landing';
import { loadSavedFirebaseConfig } from './database/firebase';
import { syncManager } from './database/sync-manager';
import { initWeatherDefaults, syncWeather } from './database/weather-sync';

function App() {
  // On mount: restore Firebase session and init weather
  useEffect(() => {
    // Init weather defaults and trigger sync (fire-and-forget)
    initWeatherDefaults().then(() => {
      syncWeather().catch((e: unknown) => console.warn('Weather sync error:', e));
    });

    loadSavedFirebaseConfig().then((ok) => {
      if (ok) syncManager.start();
    });

    return () => syncManager.stop();
  }, []);

  return (
    <BrowserRouter>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh',
            overflow: 'hidden',
            background: 'white',
          }}
        >
          {/* Main content area */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<Home />} />
              <Route path="/create" element={<CreateSymptoms />} />
              <Route path="/history" element={<History />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/settings" element={<Settings />} />
              {/* OAuth callback — no nav footer */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              {/* Standalone pages — no nav footer */}
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
            </Routes>
          </div>

          {/* Bottom navigation — hidden on /auth/callback */}
          <NavigationFooter />
        </div>
    </BrowserRouter>
  );
}

export default App;
