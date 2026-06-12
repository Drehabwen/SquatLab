import { Icon } from "../Icon";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: string;
  variant?: "default" | "highlight" | "accent";
}

export function StatCard({
  label,
  value,
  unit,
  trend,
  trendValue,
  icon,
  variant = "default",
}: StatCardProps) {
  const trendIcon = trend ? (trend === "up" ? "trending_up" : trend === "down" ? "trending_down" : "trending_flat") : null;

  return (
    <div className={`stat-card stat-card-${variant}`}>
      <div className="stat-card-header">
        {icon && (
          <div className="stat-card-icon-wrapper">
            <Icon name={icon} className="stat-card-icon" />
          </div>
        )}
        <span className="stat-card-label">{label}</span>
      </div>
      <div className="stat-card-value-wrapper">
        <span className="stat-card-value">{value}</span>
        {unit && <span className="stat-card-unit">{unit}</span>}
      </div>
      {trend && trendValue && trendIcon && (
        <div className={`stat-card-trend stat-card-trend-${trend}`}>
          <Icon name={trendIcon} className="trend-icon" />
          <span className="trend-value">{trendValue}</span>
        </div>
      )}
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string | number;
}

export function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="mini-stat">
      <p className="mini-stat-label">{label}</p>
      <p className="mini-stat-value">{value}</p>
    </div>
  );
}