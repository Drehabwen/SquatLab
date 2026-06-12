import { useEffect, useState, type CSSProperties } from "react";

export type GaugeSize = "small" | "medium" | "large";

function sizeProps(size: GaugeSize) {
  switch (size) {
    case "small":
      return { dim: 120, stroke: 8, fontSize: 28, labelSize: 12 };
    case "medium":
      return { dim: 180, stroke: 10, fontSize: 42, labelSize: 14 };
    case "large":
      return { dim: 240, stroke: 12, fontSize: 56, labelSize: 16 };
  }
}

function gaugeColor(score: number) {
  if (score >= 85) return "var(--color-success)";
  if (score >= 70) return "var(--color-warning)";
  return "var(--color-danger)";
}

function levelLabel(score: number) {
  if (score >= 85) return "良好";
  if (score >= 70) return "需关注";
  return "需评估";
}

interface PsiGaugeProps {
  score: number | null | undefined; // 0-100, null/undefined = don't render
  size?: GaugeSize;
  className?: string;
  style?: CSSProperties;
}

export function PsiGauge({
  score,
  size = "medium",
  className,
  style,
}: PsiGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score ?? 0));
  const targetScore = Math.round(clampedScore);

  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (score == null) return;
    const target = Math.round(Math.max(0, Math.min(100, score)));
    // Skip animation if already at target (e.g. mounting with score=0)
    if (target === 0) {
      setDisplayScore(0);
      return;
    }
    const duration = 800;
    const start = performance.now();
    let rafId: number;
    const animate = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [score]);

  if (score == null) return null;

  const { dim, stroke, fontSize, labelSize } = sizeProps(size);
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Prevent strokeLinecap="round" overlap when arc is nearly full
  const arcOffset = clampedScore >= 99.5 ? circumference * 0.005 : 0;
  const dashOffset = circumference * (1 - clampedScore / 100) + arcOffset;
  const linecap = clampedScore >= 99.5 ? ("butt" as const) : ("round" as const);
  const color = gaugeColor(clampedScore);

  return (
    <div
      className={`psi-gauge ${className ?? ""}`}
      style={{
        width: dim,
        height: dim,
        ...style,
      }}
      title={`姿势对称指数: ${targetScore}`}
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        className="psi-gauge-svg"
      >
        {/* Background ring */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-variant, #e2e8f0)"
          strokeWidth={stroke}
          className="psi-gauge-bg"
        />
        {/* Progress ring */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap={linecap}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          className="psi-gauge-arc"
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="psi-gauge-center">
        <span className="psi-gauge-value" style={{ fontSize, color }}>
          {displayScore}
        </span>
        <span className="psi-gauge-label" style={{ fontSize: labelSize }}>
          {levelLabel(clampedScore)}
        </span>
      </div>
    </div>
  );
}
