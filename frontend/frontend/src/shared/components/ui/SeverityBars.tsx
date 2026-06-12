import type { SeverityLevel } from "../../types/api";

const AXIS_LABEL: Record<string, string> = {
  shoulder: "肩部",
  hip: "骨盆",
  trunk: "躯干",
};

const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  none: "var(--color-success)",
  mild: "var(--color-warning)",
  moderate: "var(--color-secondary)",
  severe: "var(--color-danger)",
};

const SEVERITY_TEXT: Record<SeverityLevel, string> = {
  none: "正常",
  mild: "轻度",
  moderate: "中度",
  severe: "重度",
};

const AXIS_ORDER = ["shoulder", "hip", "trunk"] as const;

interface SeverityBarsProps {
  grades: Record<string, SeverityLevel>;
  className?: string;
}

export function SeverityBars({ grades, className }: SeverityBarsProps) {
  return (
    <div className={`severity-bars ${className ?? ""}`}>
      {AXIS_ORDER.map((axis) => {
        const level: SeverityLevel = grades[axis] ?? "none";
        const color = SEVERITY_COLOR[level];
        const width = level === "none" ? 25 : level === "mild" ? 50 : level === "moderate" ? 75 : 100;
        return (
          <div key={axis} className="severity-bar-row">
            <span className="severity-bar-label">{AXIS_LABEL[axis]}</span>
            <div className="severity-bar-track">
              <div
                className="severity-bar-fill"
                style={{ width: `${width}%`, backgroundColor: color }}
              />
            </div>
            <span className="severity-bar-value" style={{ color }}>
              {SEVERITY_TEXT[level]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
