import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import type {
  ScreeningSessionSummary,
  SubjectResponse,
} from "../../../shared/types/api";
import { Button, Icon, SkeletonCard, SkeletonList, SurfaceCard } from "../../../shared/components/ui";

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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ScreeningSessionSummary[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    
    const fetchData = async () => {
      try {
        const [sessionData, subjectData] = await Promise.all([
          apiClient.listScreeningSessions(),
          apiClient.listSubjects(),
        ]);
        if (!controller.signal.aborted) {
          setSessions(sessionData);
          setSubjects(subjectData);
          setLoading(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Dashboard load error:", err);
          setError(err instanceof Error ? err.message : "加载数据失败，请检查网络连接");
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      controller.abort();
    };
  }, []);

  const activeSessions = sessions.filter(
    (s) =>
      s.status === "in_progress" ||
      s.status === "pending_recapture" ||
      s.status === "pending_review",
  );
  const pendingReviewCount = sessions.filter(
    (s) => s.status === "pending_review" || s.status === "pending_report",
  ).length;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekCount = sessions.filter(
    (s) => new Date(s.created_at) >= weekStart,
  ).length;

  return (
    <div className="dashboard-page page-stack">
      <section className="page-header">
        <h1 className="page-title">概览</h1>
        <p className="page-subtitle">青跃智衡 — AI姿态与动作筛查系统</p>
      </section>

      {loading ? (
        <>
          <div className="dashboard-stats">
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
          </div>
          <section className="dashboard-active-section">
            <h2 className="section-title">活跃会话</h2>
            <SkeletonList count={2} />
          </section>
        </>
      ) : error ? (
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error}</p>
          </div>
        </SurfaceCard>
      ) : (
        <>
          <div className="page-actions">
            <Button
              variant="primary"
              size="large"
              icon="add"
              onClick={() => navigate("/sessions/new")}
            >
              新建筛查
            </Button>
            <Button
              variant="secondary"
              size="large"
              icon="upload"
              onClick={() => navigate("/import")}
            >
              批量导入
            </Button>
          </div>

          <div className="dashboard-stats list-stagger">
            <SurfaceCard variant="lowest" padding="medium">
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "2rem", fontWeight: 700 }}>
                  {sessions.length}
                </p>
                <p className="section-caption">总筛查数</p>
              </div>
            </SurfaceCard>
            <SurfaceCard variant="lowest" padding="medium">
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "2rem", fontWeight: 700 }}>
                  {thisWeekCount}
                </p>
                <p className="section-caption">本周筛查</p>
              </div>
            </SurfaceCard>
            <SurfaceCard variant="lowest" padding="medium">
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color:
                      pendingReviewCount > 0
                        ? "var(--color-warning)"
                        : undefined,
                  }}
                >
                  {pendingReviewCount}
                </p>
                <p className="section-caption">待审核</p>
              </div>
            </SurfaceCard>
          </div>

          <section className="dashboard-active-section">
            <h2 className="section-title">
              活跃会话
              {activeSessions.length > 0 ? (
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.8rem",
                    fontWeight: 400,
                  }}
                >
                  ({activeSessions.length})
                </span>
              ) : null}
            </h2>
            {activeSessions.length === 0 ? (
              <SurfaceCard variant="lowest" padding="medium">
                <p className="section-caption">暂无活跃会话</p>
              </SurfaceCard>
            ) : (
              <div className="session-list list-stagger">
                {activeSessions.slice(0, 5).map((session) => (
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
                          {session.subject_display_name}
                        </p>
                        <div className="session-meta">
                          <span
                            className={`status-badge status-${session.status}`}
                          >
                            {STATUS_LABEL[session.status] || session.status}
                          </span>
                          {session.overall_risk ? (
                            <span className="risk-tag">
                              {RISK_LABEL[session.overall_risk] ||
                                session.overall_risk}
                            </span>
                          ) : null}
                        </div>
                        <p className="session-date">
                          {formatDate(session.created_at)}
                        </p>
                      </div>
                      <Icon
                        name="chevron_right"
                        className="subject-chevron"
                      />
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-subjects-section">
            <h2 className="section-title">
              受试者
              {subjects.length > 0 ? (
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.8rem",
                    fontWeight: 400,
                  }}
                >
                  ({subjects.length})
                </span>
              ) : null}
            </h2>
            {subjects.length === 0 ? (
              <SurfaceCard variant="lowest" padding="medium">
                <p className="section-caption">
                  暂无受试者 —
                  <button
                    className="back-button"
                    type="button"
                    onClick={() => navigate("/subjects/new")}
                    style={{ display: "inline", marginLeft: "0.25rem" }}
                  >
                    新建受试者
                  </button>
                </p>
              </SurfaceCard>
            ) : (
              <div className="subject-list list-stagger">
                {subjects.slice(0, 5).map((subject) => (
                  <SurfaceCard
                    key={subject.subject_id}
                    variant="lowest"
                    padding="medium"
                    onClick={() =>
                      navigate(
                        `/subjects/${encodeURIComponent(subject.subject_id)}`,
                      )
                    }
                  >
                    <div className="subject-card-content">
                      <div className="subject-info">
                        <h3 className="subject-name">
                          {subject.display_name}
                        </h3>
                        <p className="subject-meta">
                          {subject.sex === "female"
                            ? "女"
                            : subject.sex === "male"
                              ? "男"
                              : "—"}
                          {subject.age ? ` · ${subject.age}岁` : ""}
                          {subject.height_cm
                            ? ` · ${subject.height_cm}cm`
                            : ""}
                        </p>
                      </div>
                      <Icon
                        name="chevron_right"
                        className="subject-chevron"
                      />
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
