import { Button } from "./Button";
import { Icon } from "../Icon";

interface InsightCardProps {
  icon?: string;
  iconBg?: "primary" | "secondary" | "tertiary";
  title: string;
  description: string;
  action?: {
    label: string;
    icon?: string;
    onClick?: () => void;
    to?: string;
    href?: string;
  };
  variant?: "default" | "dashed";
}

export function InsightCard({
  icon = "tips_and_updates",
  iconBg = "primary",
  title,
  description,
  action,
  variant = "default",
}: InsightCardProps) {
  return (
    <div className={`insight-card insight-card-${variant}`}>
      <div className="insight-card-content">
        <div className={`insight-card-icon icon-bg-${iconBg}`}>
          <Icon name={icon} />
        </div>
        <div className="insight-card-text">
          <h4 className="insight-card-title">{title}</h4>
          <p className="insight-card-description">{description}</p>
          {action && (action.onClick || action.to || action.href) ? (
            <Button
              variant="ghost"
              size="small"
              className="insight-card-action"
              onClick={action.onClick}
              to={action.to}
              href={action.href}
              icon={action.icon}
              iconPosition="right"
            >
              {action.label}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
