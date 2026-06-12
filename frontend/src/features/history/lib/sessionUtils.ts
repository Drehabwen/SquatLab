import type { ReportPreviewResponse, SessionSummary } from "../../../shared/types/api";

export function filterSessions(sessions: SessionSummary[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return sessions;
  }

  return sessions.filter((session) => {
    const values = [session.session_id, session.summary];
    return values.some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}

export function formatSessionDate(dateString: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

export function formatSessionTime(dateString: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export function exportSessionSummaries(sessions: SessionSummary[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadJson(`qingyue-zhiheng-history-${timestamp}.json`, sessions);
}

export function exportSessionReport(report: ReportPreviewResponse) {
  downloadJson(`qingyue-zhiheng-session-${report.session_id}.json`, report);
}
