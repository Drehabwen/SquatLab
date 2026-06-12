import { useCallback, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { BottomNavBar, TopAppBar, Icon, getDefaultNavItems, VersionUpdateChecker } from "../components/ui";

import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { SubjectListPage } from "../../features/subjects/pages/SubjectListPage";
import { SubjectCreatePage } from "../../features/subjects/pages/SubjectCreatePage";
import { SubjectDetailPage } from "../../features/subjects/pages/SubjectDetailPage";
import { SessionListPage } from "../../features/sessions/pages/SessionListPage";
import { SessionCreatePage } from "../../features/sessions/pages/SessionCreatePage";
import { SessionDetailPage } from "../../features/sessions/pages/SessionDetailPage";
import { ProtocolCapturePage } from "../../features/protocols/pages/ProtocolCapturePage";
import { IntegratedReportPage } from "../../features/reports/pages/IntegratedReportPage";
import { SettingsPage } from "../../features/settings/pages/SettingsPage";
import { ImportPage } from "../../features/import/pages/ImportPage";

const THEME_STORAGE_KEY = "app-theme";

function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-app-theme", theme);
}

export function AppShell() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <div className="app-shell">
      <TopAppBar
        title="青跃智衡"
        actions={
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "切换为暗色模式" : "切换为亮色模式"}
          >
            <Icon name={theme === "light" ? "dark_mode" : "light_mode"} />
          </button>
        }
      />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/subjects" element={<SubjectListPage />} />
          <Route path="/subjects/new" element={<SubjectCreatePage />} />
          <Route path="/subjects/:id" element={<SubjectDetailPage />} />
          <Route path="/sessions" element={<SessionListPage />} />
          <Route path="/sessions/new" element={<SessionCreatePage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route
            path="/sessions/:id/protocols/:protocol"
            element={<ProtocolCapturePage />}
          />
          <Route
            path="/sessions/:id/report"
            element={<IntegratedReportPage />}
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Routes>
      </main>

      <BottomNavBar
        items={getDefaultNavItems()}
      />
      <VersionUpdateChecker />
    </div>
  );
}
