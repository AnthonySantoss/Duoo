import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Auth from './pages/Auth';
import DashboardLayout from './pages/DashboardLayout';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Goals from './pages/Goals';
import Wallets from './pages/Wallets';
import Bank from './pages/Bank';

import LinkAccounts from './pages/LinkAccounts';
import Settings from './pages/Settings';
import Simulation from './pages/Simulation';
import Forecast from './pages/Forecast';
import Statement from './pages/Statement';
import Investments from './pages/Investments';
import EconomyForecast from './pages/EconomyForecast';

const ProtectedRoute = ({ children }) => {
  // Simple check, real app would check AuthContext loading state
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
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
            <Route path="economy-forecast" element={<EconomyForecast />} />

            {/* Fallback for other routes */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
