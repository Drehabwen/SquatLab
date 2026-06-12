import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import type {
  SubjectResponse,
  ScreeningSessionSummary,
} from "../../../shared/types/api";
import { Button, Icon, SkeletonCard, SurfaceCard } from "../../../shared/components/ui";

const SEX_LABEL: Record<string, string> = {
  female: "女",
  male: "男",
  unknown: "—",
};

const STATUS_LABEL: Record<string, string> = {
  in_progress: "进行中",
  pending_report: "待报告",
  pending_recapture: "需重采",
  pending_review: "待审核",
  completed: "已完成",
  archived: "已归档",
};

const RISK_LABEL: Record<string, string> = {
  low: "低风险",
  attention: "需关注",
  review_required: "需审核",
  recapture_needed: "需重采",
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<SubjectResponse | null>(null);
  const [sessions, setSessions] = useState<ScreeningSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;

    async function load() {
      try {
        const [allSubjects, allSessions] = await Promise.all([
          apiClient.listSubjects(),
          apiClient.listScreeningSessions(),
        ]);
        if (!active) return;
        const found = allSubjects.find((s) => s.subject_id === id);
        if (!found) {
          setError("受试者未找到");
          return;
        }
        setSubject(found);
        setSessions(
          allSessions.filter((s) => s.subject_id === id),
        );
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="subjects-detail-page page-stack">
        <section className="page-header">
          <button
            className="back-button"
            type="button"
            onClick={() => navigate("/subjects")}
          >
            <Icon name="arrow_back" />
            <span>返回</span>
          </button>
        </section>
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="subjects-detail-page page-stack">
        <section className="page-header">
          <button
            className="back-button"
            type="button"
            onClick={() => navigate("/subjects")}
          >
            <Icon name="arrow_back" />
            <span>返回</span>
          </button>
        </section>
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error || "受试者未找到"}</p>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="subjects-detail-page page-stack">
      <section className="page-header">
        <button
          className="back-button"
          type="button"
          onClick={() => navigate("/subjects")}
        >
          <Icon name="arrow_back" />
          <span>返回</span>
        </button>
        <h1 className="page-title">{subject.display_name}</h1>
        <p className="page-subtitle">
          {SEX_LABEL[subject.sex]}
          {subject.age ? ` · ${subject.age}岁` : ""}
          {subject.height_cm ? ` · ${subject.height_cm}cm` : ""}
          {` · 筛查编号: ${subject.subject_id}`}
        </p>
      </section>

      {subject.notes ? (
        <SurfaceCard variant="lowest" padding="medium">
          <p className="section-caption">备注</p>
          <p>{subject.notes}</p>
        </SurfaceCard>
      ) : null}

      <div className="page-actions">
        <Button
          variant="primary"
          icon="fitness_center"
          onClick={() =>
            navigate(
              `/sessions/new?subjectId=${encodeURIComponent(subject.subject_id)}`,
            )
          }
        >
          新建筛查
        </Button>
      </div>

      <section className="detail-section">
        <h2 className="section-title">筛查历史</h2>
        {sessions.length === 0 ? (
          <SurfaceCard variant="lowest" padding="large">
            <p className="section-caption">暂无筛查记录</p>
          </SurfaceCard>
        ) : (
          <div className="session-list">
            {sessions.map((session) => (
              <SurfaceCard
                key={session.session_id}
                variant="lowest"
                padding="medium"
                onClick={() =>
                  navigate(
                    `/sessions/${encodeURIComponent(session.session_id)}`,
                  )
                }
              >
                <div className="session-card-content">
                  <div className="session-info">
                    <p className="session-summary">
                      {session.subject_display_name || session.subject_id}
                    </p>
                    <div className="session-meta">
                      <span
                        className={`status-badge status-${session.status}`}
                      >
                        {STATUS_LABEL[session.status] || session.status}
                      </span>
                      {session.overall_risk ? (
                        <span className="risk-tag">
                          {RISK_LABEL[session.overall_risk] || session.overall_risk}
                        </span>
                      ) : null}
                    </div>
                    <p className="session-date">
                      {formatDate(session.created_at)}
                    </p>
                  </div>
                  <Icon name="chevron_right" className="subject-chevron" />
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
