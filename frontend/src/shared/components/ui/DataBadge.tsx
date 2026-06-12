import { Icon } from "../Icon";

interface DataBadgeProps {
  icon?: string;
  label: string;
  value: string | number;
  variant?: "primary" | "secondary" | "success" | "warning" | "error";
}

export function DataBadge({
  icon,
  label,
  value,
  variant = "primary",
}: DataBadgeProps) {
  return (
    <div className={`data-badge data-badge-${variant}`}>
      {icon ? <Icon name={icon} className="data-badge-icon" /> : null}
      <span className="data-badge-label">{label}</span>
      <span className="data-badge-value">{value}</span>
    </div>
  );
}
