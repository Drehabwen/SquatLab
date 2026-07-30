import { Navigate, Route, Routes } from "react-router-dom";

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
import { V3FlowProvider } from "../../features/v3/V3Flow";
import { V3Shell } from "../../features/v3/V3UI";
import {
  AdamsRecordPageV3,
  CaptureHubPageV3,
  GaitCapturePageV3,
  ProfilePageV3,
  ReportReadinessPageV3,
  ReportsPageV3,
  StandardScreeningPageV3,
  StudentsPageV3,
  TasksPageV3,
  TriageResultPageV3,
} from "../../features/v3/V3Pages";

export function AppShell() {
  return (
    <V3FlowProvider>
      <V3Shell>
        <Routes>
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route path="/tasks" element={<TasksPageV3 />} />
          <Route path="/students" element={<StudentsPageV3 />} />
          <Route path="/capture" element={<CaptureHubPageV3 />} />
          <Route path="/reports" element={<ReportsPageV3 />} />
          <Route path="/profile" element={<ProfilePageV3 />} />
          <Route
            path="/sessions/:id/capture/gait-silhouette"
            element={<GaitCapturePageV3 />}
          />
          <Route
            path="/sessions/:id/triage-result"
            element={<TriageResultPageV3 />}
          />
          <Route
            path="/sessions/:id/standard-screening"
            element={<StandardScreeningPageV3 />}
          />
          <Route
            path="/sessions/:id/capture/adams"
            element={<AdamsRecordPageV3 />}
          />
          <Route
            path="/sessions/:id/report-readiness"
            element={<ReportReadinessPageV3 />}
          />

          <Route path="/legacy" element={<DashboardPage />} />
          <Route path="/legacy/subjects" element={<SubjectListPage />} />
          <Route path="/legacy/subjects/new" element={<SubjectCreatePage />} />
          <Route path="/legacy/subjects/:id" element={<SubjectDetailPage />} />
          <Route path="/legacy/sessions" element={<SessionListPage />} />
          <Route path="/legacy/sessions/new" element={<SessionCreatePage />} />
          <Route path="/legacy/sessions/:id" element={<SessionDetailPage />} />
          <Route
            path="/legacy/sessions/:id/protocols/:protocol"
            element={<ProtocolCapturePage />}
          />
          <Route
            path="/legacy/sessions/:id/report"
            element={<IntegratedReportPage />}
          />
          <Route path="/legacy/settings" element={<SettingsPage />} />
          <Route path="/legacy/import" element={<ImportPage />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Routes>
      </V3Shell>
    </V3FlowProvider>
  );
}
