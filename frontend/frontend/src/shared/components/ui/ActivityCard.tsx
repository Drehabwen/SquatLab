import { Icon } from "../Icon";

interface ActivityCardProps {
  title: string;
  date: string;
  duration: string;
  icon: string;
  stats?: {
    label: string;
    value: string;
  }[];
  chartData?: number[];
}

export function ActivityCard({
  title,
  date,
  duration,
  icon,
  stats = [],
  chartData,
}: ActivityCardProps) {
  return (
    <div className="activity-card">
      <div className="activity-card-header">
        <div className="activity-card-icon">
          <Icon name={icon} />
        </div>
        <div className="activity-card-info">
          <h5 className="activity-card-title">{title}</h5>
          <p className="activity-card-meta">
            {date} • {duration}
          </p>
        </div>
      </div>

      {chartData && chartData.length > 0 && (
        <div className="activity-card-chart">
          <div className="chart-bars">
            {chartData.map((value, index) => (
              <div
                key={index}
                className="chart-bar"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {stats.length > 0 && (
        <div className="activity-card-stats">
          {stats.map((stat, index) => (
            <span key={index} className="activity-card-stat">
              {stat.label}: <strong>{stat.value}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
