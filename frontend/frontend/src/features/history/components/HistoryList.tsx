import type { SessionSummary } from "../../../shared/types/api";
import { RecordItem } from "../../../shared/components/ui";
import { formatSessionDate, formatSessionTime } from "../lib/sessionUtils";

interface HistoryListProps {
  sessions: SessionSummary[];
  locale: string;
  typeLabel: string;
  countLabel: string;
  scoreLabel: string;
  onSelectSession: (sessionId: string) => void;
}

export function HistoryList({
  sessions,
  locale,
  typeLabel,
  countLabel,
  scoreLabel,
  onSelectSession,
}: HistoryListProps) {
  return (
    <section className="history-list">
      {sessions.map((session) => (
        <RecordItem
          key={session.session_id}
          title={session.session_id}
          date={formatSessionDate(session.created_at, locale)}
          time={formatSessionTime(session.created_at, locale)}
          type={typeLabel}
          count={session.squat_count}
          score={session.overall_score}
          countLabel={countLabel}
          scoreLabel={scoreLabel}
          onClick={() => onSelectSession(session.session_id)}
        />
      ))}
    </section>
  );
}
