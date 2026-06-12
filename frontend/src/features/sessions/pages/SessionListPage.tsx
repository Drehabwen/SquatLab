import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import type {
  ProtocolType,
  ScreeningSessionSummary,
} from "../../../shared/types/api";
import {
  Button,
  EmptyState,
  Icon,
  SkeletonList,
  SurfaceCard,
} from "../../../shared/components/ui";

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "in_progress", label: "进行中" },
  { key: "pending_recapture", label: "需重采" },
  { key: "pending_review", label: "待审核" },
  { key: "pending_report", label: "待报告" },
  { key: "completed", label: "已完成" },
];

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

const PROTOCOL_LABEL: Record<string, string> = {
  static_posture: "静态姿势",
  adams_forward_bend: "Adams前屈",
  squat: "深蹲",
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

export function SessionListPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ScreeningSessionSummary[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .listScreeningSessions()
      .then((data) => {
        if (active) setSessions(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered =
    activeTab === "all"
      ? sessions
      : sessions.filter((s) => s.status === activeTab);

  return (
    <div className="sessions-page page-stack">
      <section className="page-header">
        <h1 className="page-title">筛查会话</h1>
        <p className="page-subtitle">管理筛查会话与进度跟踪</p>
      </section>

      <div className="page-actions">
        <Button
          variant="primary"
          icon="add"
          onClick={() => navigate("/sessions/new")}
        >
          新建筛查
        </Button>
      </div>

      <div className="tab-bar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-item ${activeTab === tab.key ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === "all" && sessions.length > 0 ? (
              <span className="tab-count">{sessions.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error}</p>
          </div>
        </SurfaceCard>
      ) : sessions.length === 0 ? (
        <SurfaceCard variant="lowest" padding="large">
          <EmptyState
            icon="fitness_center"
            title="暂无筛查会话"
            description="创建第一个筛查会话以开始评估"
            action={
              <Button
                variant="secondary"
                icon="add"
                onClick={() => navigate("/sessions/new")}
              >
                新建筛查
              </Button>
            }
          />
        </SurfaceCard>
      ) : filtered.length === 0 ? (
        <SurfaceCard variant="lowest" padding="medium">
          <p className="section-caption">当前筛选条件下无会话</p>
        </SurfaceCard>
      ) : (
        <div className="session-list list-stagger">
          {filtered.map((session) => (
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
                        {RISK_LABEL[session.overall_risk] || session.overall_risk}
                      </span>
                    ) : null}
                    <span className="session-date">
                      {session.completed_protocols?.length ?? 0} 协议完成
                    </span>
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
    </div>
  );
}
