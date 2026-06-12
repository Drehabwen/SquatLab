interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: "primary" | "secondary" | "success" | "warning" | "error";
  size?: "small" | "medium" | "large";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  variant = "primary",
  size = "medium",
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`progress-bar-container ${className}`}>
      {(label || showValue) && (
        <div className="progress-bar-header">
          {label && <span className="progress-bar-label">{label}</span>}
          {showValue && (
            <span className="progress-bar-value">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={`progress-bar progress-bar-${size}`}>
        <div
          className={`progress-bar-fill progress-bar-${variant}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

interface SplitProgressBarProps {
  leftValue: number;
  rightValue: number;
  leftLabel?: string;
  rightLabel?: string;
  showLabels?: boolean;
}

export function SplitProgressBar({
  leftValue,
  rightValue,
  leftLabel,
  rightLabel,
  showLabels = false,
}: SplitProgressBarProps) {
  const total = leftValue + rightValue;
  const leftPercentage = total > 0 ? (leftValue / total) * 100 : 50;
  const rightPercentage = total > 0 ? (rightValue / total) * 100 : 50;

  return (
    <div className="split-progress-bar">
      {showLabels && (
        <div className="split-progress-labels">
          <span>{leftLabel || `${Math.round(leftPercentage)}%`}</span>
          <span>{rightLabel || `${Math.round(rightPercentage)}%`}</span>
        </div>
      )}
      <div className="split-progress-track">
        <div
          className="split-progress-left"
          style={{ width: `${leftPercentage}%` }}
        />
        <div
          className="split-progress-right"
          style={{ width: `${rightPercentage}%` }}
        />
      </div>
    </div>
  );
}