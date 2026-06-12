import React from "react";
import { Icon, PsiGauge, SeverityBars, SurfaceCard } from "../../../shared/components/ui";
import { SeverityLevel } from "../../../shared/types/api";

interface PsiRiskSectionProps {
  psiScore: number | null | undefined;
  overallRisk: string;
  nextAction: string;
  severityGrades?: Record<string, SeverityLevel> | null;
}

const RISK_LABEL: Record<string, string> = {
  low: "低风险",
  attention: "需关注",
  review_required: "需审核",
  recapture_needed: "需重采",
};

const RISK_CLASS: Record<string, string> = {
  low: "risk-low",
  attention: "risk-attention",
  review_required: "risk-review_required",
  recapture_needed: "risk-recapture_needed",
};

const NEXT_ACTION_LABEL: Record<string, string> = {
  pass: "通过",
  retest_later: "建议复测",
  recapture: "需重新采集",
  manual_review: "需人工审核",
  professional_evaluation: "建议专业评估",
};

export const PsiRiskSection: React.FC<PsiRiskSectionProps> = ({
  psiScore,
  overallRisk,
  nextAction,
  severityGrades,
}) => {
  const riskClass = RISK_CLASS[overallRisk] || "";

  return (
    <section className="report-risk-section">
      <div className="report-hero-grid">
        {psiScore != null && (
          <SurfaceCard variant="high" padding="large" className="report-psi-card">
            <PsiGauge score={psiScore} size="medium" />
            <p className="section-caption" style={{ textAlign: "center", marginTop: "0.5rem" }}>
              姿势对称指数 (PSI)
            </p>
          </SurfaceCard>
        )}
        <SurfaceCard variant="high" padding="large">
          <div className="report-risk-card">
            <Icon name="shield" />
            <p className={`report-risk-level ${riskClass}`}>
              {RISK_LABEL[overallRisk] || overallRisk}
            </p>
            <p className="section-caption">综合风险评估</p>
            <div style={{ marginTop: "0.75rem" }}>
              <span className="risk-tag">
                {NEXT_ACTION_LABEL[nextAction] || nextAction}
              </span>
            </div>
          </div>
        </SurfaceCard>
      </div>
      {severityGrades && Object.keys(severityGrades).length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <SurfaceCard variant="lowest" padding="medium">
            <h3 className="section-title" style={{ marginBottom: "0.75rem" }}>三轴严重度评估</h3>
            <SeverityBars grades={severityGrades} />
          </SurfaceCard>
        </div>
      )}
    </section>
  );
};
