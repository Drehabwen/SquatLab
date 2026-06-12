import React from "react";
import { SurfaceCard } from "../../../shared/components/ui";
import { CrossProtocolEvidence } from "../../../shared/types/api";

interface EvidenceSectionProps {
  evidenceList: CrossProtocolEvidence[];
}

const CONFIDENCE_LABEL: Record<string, string> = {
  low: "低置信度",
  medium: "中等置信度",
  high: "高置信度",
};

const PROTOCOL_LABEL: Record<string, string> = {
  static_posture: "静态姿势",
  adams_forward_bend: "Adams前屈",
  squat: "深蹲",
};

export const EvidenceSection: React.FC<EvidenceSectionProps> = ({ evidenceList }) => {
  if (!evidenceList || evidenceList.length === 0) return null;

  return (
    <section className="report-evidence-section">
      <h2 className="section-title">跨协议证据链</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {evidenceList.map((evidence, idx) => (
          <SurfaceCard key={idx} variant="lowest" padding="medium">
            <div className="evidence-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                  {evidence.pattern}
                </h3>
                <span className="section-caption">
                  {CONFIDENCE_LABEL[evidence.confidence] || evidence.confidence}
                </span>
              </div>
              <div style={{ marginTop: "0.25rem" }}>
                {evidence.direction ? (
                  <span className="section-caption">
                    方向: {evidence.direction} ·{" "}
                  </span>
                ) : null}
                <span className="section-caption">
                  来源协议:{" "}
                  {evidence.protocols
                    .map((p) => PROTOCOL_LABEL[p] || p)
                    .join("、")}
                </span>
              </div>
              {evidence.evidence.length > 0 ? (
                <ul
                  className="report-findings-list"
                  style={{ marginTop: "0.5rem" }}
                >
                  {evidence.evidence.map((e, i) => (
                    <li key={i} className="report-finding-item">
                      <span className="report-finding-dot">•</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
};
