import { useEffect, useState } from "react";
import { apiClient } from "../../../shared/api/client";
import type { LlmAnalysisResponse } from "../../../shared/types/api";
import { Icon, SurfaceCard } from "../../../shared/components/ui";

interface Props {
  sessionId: string;
}

export function AiAnalysisCard({ sessionId }: Props) {
  const [data, setData] = useState<LlmAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    apiClient
      .getLlmAnalysis(sessionId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "AI 分析加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <SurfaceCard variant="lowest" padding="medium" className="ai-analysis-card">
        <div className="ai-analysis-header">
          <Icon name="psychology" />
          <h3>AI 分析</h3>
        </div>
        <div className="ai-analysis-skeleton">
          <div className="skeleton-line skeleton-line-short" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line-medium" />
        </div>
      </SurfaceCard>
    );
  }

  if (error) {
    const isNotConfigured = error.includes("not configured") || error.includes("503");
    return (
      <SurfaceCard variant="lowest" padding="medium" className="ai-analysis-card">
        <div className="ai-analysis-header">
          <Icon name="psychology" />
          <h3>AI 分析</h3>
          <span className="ai-badge ai-badge-inactive">
            {isNotConfigured ? "未配置" : "暂不可用"}
          </span>
        </div>
        <p className="ai-analysis-muted">
          {isNotConfigured
            ? "配置 LLM_API_KEY 后可使用 AI 深度解读筛查结果。"
            : error}
        </p>
        {!isNotConfigured && (
          <button
            className="ai-retry-btn"
            onClick={() => {
              setError("");
              setLoading(true);
              apiClient
                .getLlmAnalysis(sessionId)
                .then(setData)
                .catch((err) =>
                  setError(err instanceof Error ? err.message : "重试失败"),
                )
                .finally(() => setLoading(false));
            }}
          >
            <Icon name="refresh" /> 重试
          </button>
        )}
      </SurfaceCard>
    );
  }

  if (!data) return null;

  const sections: { key: string; label: string; content: string | null | undefined }[] = [
    { key: "summary", label: "核心解读", content: data.enhanced_summary },
    { key: "context", label: "临床意义", content: data.clinical_context },
    { key: "narrative", label: "风险分析", content: data.risk_narrative },
  ];

  return (
    <SurfaceCard variant="lowest" padding="medium" className="ai-analysis-card">
      <button
        className="ai-analysis-header"
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? "ai-analysis-body" : undefined}
        onClick={() => setExpanded(!expanded)}
      >
        <Icon name="psychology" />
        <h3>AI 分析</h3>
        <span className="ai-badge ai-badge-active">AI</span>
        <span className="ai-expand-toggle" aria-label={expanded ? "收起AI分析" : "展开AI分析"}>
          <Icon name={expanded ? "expand_less" : "expand_more"} />
        </span>
      </button>

      {expanded && (
        <div id="ai-analysis-body" className="ai-analysis-body">
          {sections.map(
            (s) =>
              s.content && (
                <div key={s.key} className="ai-analysis-section">
                  <h4 className="ai-section-title">{s.label}</h4>
                  <p>{s.content}</p>
                </div>
              ),
          )}

          {data.suggestions.length > 0 && (
            <div className="ai-analysis-section">
              <h4 className="ai-section-title">建议</h4>
              <ul className="report-findings-list">
                {data.suggestions.map((s, i) => (
                  <li key={i} className="report-finding-item">
                    <span className="report-finding-dot">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.limitations.length > 0 && (
            <div className="ai-analysis-section">
              <h4 className="ai-section-title">局限性</h4>
              <ul className="report-findings-list">
                {data.limitations.map((l, i) => (
                  <li key={i} className="report-finding-item">
                    <span className="report-finding-dot">•</span>
                    <span className="ai-limitation-text">{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </SurfaceCard>
  );
}
