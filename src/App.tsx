// src/App.tsx
import * as React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import AuthPage from "./ui/pages/AuthPage";
import ActivatePage from "./ui/pages/ActivatePage";
import WorldSelectPage from "./ui/pages/WorldSelectPage";
import GamePage from "./ui/pages/GamePage";

import OverviewPanel from "./ui/panels/OverviewPanel";
import CompaniesPanel from "./ui/panels/CompaniesPanel";
import CompanyDetailPanel from "./ui/panels/CompanyDetailPanel";
import DecisionsPanel from "./ui/panels/DecisionsPanel";
import MarketPanel from "./ui/panels/MarketPanel";
import SocialPanel from "./ui/panels/SocialPanel";
import ProfilePanel from "./ui/panels/ProfilePanel";

import AppShell from "./ui/layout/AppShell";
import { useAuth } from "./ui/hooks/useAuth";

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

// Authenticated routes WITH sidebar (AppShell)
const AppShellLayout: React.FC = () => (
  <RequireAuth>
    <AppShell>
      <Outlet />
    </AppShell>
  </RequireAuth>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public (no sidebar) */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/activate" element={<ActivatePage />} />

        {/* Authenticated WITH sidebar */}
        <Route element={<AppShellLayout />}>
          <Route path="/worlds" element={<WorldSelectPage />} />
        </Route>

        {/* Game: Authenticated, but NO AppShell (gates should be fullscreen) */}
        <Route
          path="/game"
          element={
            <RequireAuth>
              <GamePage />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/game/overview" replace />} />
          <Route path="overview" element={<OverviewPanel />} />
          <Route path="companies" element={<CompaniesPanel />} />
          <Route path="companies/:companyId" element={<CompanyDetailPanel />} />
          <Route path="decisions" element={<DecisionsPanel />} />
          <Route path="market" element={<MarketPanel />} />
          <Route path="social" element={<SocialPanel />} />
          <Route path="profile" element={<ProfilePanel />} />
        </Route>

        {/* Defaults */}
        <Route path="/" element={<Navigate to="/game" replace />} />
        <Route path="*" element={<Navigate to="/game" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
