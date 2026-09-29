import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AchievementProvider } from './context/AchievementContext';
import { NotificationProvider } from './context/NotificationContext';
import Auth from './pages/AuthRedesigned';
const Onboarding = lazy(() => import('./pages/Onboarding'));
const DashboardLayout = lazy(() => import('./pages/DashboardLayout'));
const Overview = lazy(() => import('./pages/OverviewRedesigned'));
const Transactions = lazy(() => import('./pages/TransactionsRedesigned'));
const Goals = lazy(() => import('./pages/GoalsRedesigned'));
const Wallets = lazy(() => import('./pages/WalletsRedesigned'));
const Bank = lazy(() => import('./pages/BankRedesigned'));
const LinkAccounts = lazy(() => import('./pages/LinkAccounts'));
const PartnerJoin = lazy(() => import('./pages/PartnerJoin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Settings = lazy(() => import('./pages/Settings'));
const Achievements = lazy(() => import('./pages/AchievementsRedesigned'));
const Simulation = lazy(() => import('./pages/SimulationRedesigned'));
const Forecast = lazy(() => import('./pages/ForecastRedesigned'));
const Statement = lazy(() => import('./pages/Statement'));
const Investments = lazy(() => import('./pages/InvestmentsRedesigned'));
const EconomyForecast = lazy(() => import('./pages/EconomyForecastRedesigned'));
const Recurring = lazy(() => import('./pages/RecurringRedesigned'));
const Challenges = lazy(() => import('./pages/ChallengesRedesigned'));
const MobileMenu = lazy(() => import('./pages/MobileMenuRedesigned'));
import PWAInstallPrompt from './components/ui/PWAInstallPrompt';
import PageSkeleton from './components/ui/PageSkeleton';

import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950 sm:p-10">
        <div className="mx-auto max-w-7xl pt-4">
          <PageSkeleton />
        </div>
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
            <Suspense fallback={<div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950"><PageSkeleton /></div>}><Routes>
              <Route path="/login" element={<Auth />} />
              <Route path="/join" element={<PartnerJoin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

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
                <Route path="challenges" element={<Challenges />} />
                <Route path="menu" element={<MobileMenu />} />

                {/* Fallback for other routes */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes></Suspense>
            <PWAInstallPrompt />
          </BrowserRouter>
        </NotificationProvider>
      </AchievementProvider>
    </AuthProvider>
  );
}

export default App;
