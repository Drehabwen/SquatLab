import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import type {
  ProtocolType,
  SubjectResponse,
} from "../../../shared/types/api";
import { Button, Icon, SurfaceCard } from "../../../shared/components/ui";

const ALL_PROTOCOLS: { key: ProtocolType; label: string; desc: string }[] = [
  {
    key: "static_posture",
    label: "静态姿势评估",
    desc: "正面站立，评估肩高差、骨盆倾斜、躯干侧移",
  },
  {
    key: "adams_forward_bend",
    label: "Adams 前屈测试",
    desc: "缓慢前屈，评估胸椎和腰椎的不对称",
  },
  {
    key: "squat",
    label: "深蹲动作评估",
    desc: "动态深蹲，评估深度、稳定性、对称性",
  },
];

export function SessionCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSubjectId = searchParams.get("subjectId") || "";

  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(preselectedSubjectId);
  const [selectedProtocols, setSelectedProtocols] = useState<Set<ProtocolType>>(
    new Set(ALL_PROTOCOLS.map((p) => p.key)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .listSubjects()
      .then(setSubjects)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load subjects");
      });
  }, []);

  function toggleProtocol(protocol: ProtocolType) {
    setSelectedProtocols((prev) => {
      const next = new Set(prev);
      if (next.has(protocol)) {
        if (next.size > 1) next.delete(protocol);
      } else {
        next.add(protocol);
      }
      return next;
    });
  }

  async function handleCreate() {
    if (!selectedSubjectId || selectedProtocols.size === 0) return;
    setLoading(true);
    setError("");
    try {
      const session = await apiClient.createScreeningSession({
        subject_id: selectedSubjectId,
        protocols: [...selectedProtocols],
      });
      navigate(
        `/sessions/${encodeURIComponent(session.session_id)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sessions-create-page page-stack">
      <section className="page-header">
        <button
          className="back-button"
          type="button"
          onClick={() => navigate("/sessions")}
        >
          <Icon name="arrow_back" />
          <span>返回</span>
        </button>
        <h1 className="page-title">新建筛查</h1>
        <p className="page-subtitle">选择受试者和筛查协议</p>
      </section>

      {error ? (
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error}</p>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="create-steps">
        <div className="create-step">
          <p className="create-step-header">1. 选择受试者</p>
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
            <div className="subject-list">
              {subjects.map((subject) => (
                <SurfaceCard
                  key={subject.subject_id}
                  variant={
                    selectedSubjectId === subject.subject_id
                      ? "high"
                      : "lowest"
                  }
                  padding="medium"
                  onClick={() => setSelectedSubjectId(subject.subject_id)}
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
                    {selectedSubjectId === subject.subject_id ? (
                      <Icon
                        name="check_circle"
                        className="subject-chevron"
                      />
                    ) : null}
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}
        </div>

        <div className="create-step">
          <p className="create-step-header">2. 选择筛查协议</p>
          <div className="protocol-checkbox-list">
            {ALL_PROTOCOLS.map((protocol) => (
              <label
                key={protocol.key}
                className="protocol-checkbox"
              >
                <input
                  type="checkbox"
                  checked={selectedProtocols.has(protocol.key)}
                  onChange={() => toggleProtocol(protocol.key)}
                />
                <div className="protocol-checkbox-label">
                  <span className="subject-name">{protocol.label}</span>
                  <span className="protocol-status-text">
                    {protocol.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="form-actions">
        <Button
          variant="secondary"
          type="button"
          onClick={() => navigate("/sessions")}
        >
          取消
        </Button>
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={!selectedSubjectId || selectedProtocols.size === 0 || loading}
          loading={loading}
        >
          创建筛查会话
        </Button>
      </div>
    </div>
  );
}
