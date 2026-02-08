import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AchievementProvider } from './context/AchievementContext';
import { NotificationProvider } from './context/NotificationContext';
import Auth from './pages/Auth';
import DashboardLayout from './pages/DashboardLayout';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Goals from './pages/Goals';
import Wallets from './pages/Wallets';
import Bank from './pages/Bank';

import LinkAccounts from './pages/LinkAccounts';
import Settings from './pages/Settings';
import Achievements from './pages/Achievements';
import Simulation from './pages/Simulation';
import Forecast from './pages/Forecast';
import Statement from './pages/Statement';
import Investments from './pages/Investments';
import EconomyForecast from './pages/EconomyForecast';
import Recurring from './pages/Recurring';
import MobileMenu from './pages/MobileMenu';

import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <AchievementProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Auth />} />

              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<Overview />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="bank" element={<Bank />} />
                <Route path="goals" element={<Goals />} />
                <Route path="wallets" element={<Wallets />} />
                <Route path="simulation" element={<Simulation />} />
                <Route path="forecast" element={<Forecast />} />
                <Route path="statement" element={<Statement />} />
                <Route path="investments" element={<Investments />} />
                <Route path="link-accounts" element={<LinkAccounts />} />
                <Route path="settings" element={<Settings />} />
                <Route path="achievements" element={<Achievements />} />
                <Route path="economy-forecast" element={<EconomyForecast />} />
                <Route path="recurring" element={<Recurring />} />
                <Route path="menu" element={<MobileMenu />} />

                {/* Fallback for other routes */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AchievementProvider>
    </AuthProvider>
  );
}

export default App;
