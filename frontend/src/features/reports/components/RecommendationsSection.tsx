import React from "react";
import { SurfaceCard } from "../../../shared/components/ui";

interface RecommendationsSectionProps {
  recommendations: string[];
}

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  recommendations,
}) => {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <section className="report-recommendations-section">
      <h2 className="section-title">行动建议</h2>
      <SurfaceCard variant="lowest" padding="medium">
        <ul className="report-findings-list">
          {recommendations.map((rec, i) => (
            <li key={i} className="report-finding-item">
              <span className="report-finding-dot">•</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </section>
  );
};
