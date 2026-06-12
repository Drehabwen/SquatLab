import { Icon } from "../Icon";

interface RecordItemProps {
  title: string;
  date: string;
  time?: string;
  type?: string;
  count?: number;
  score?: number;
  countLabel?: string;
  scoreLabel?: string;
  scoreTrend?: "up" | "down" | "neutral";
  onClick?: () => void;
}

export function RecordItem({
  title,
  date,
  time,
  type,
  count,
  score,
  countLabel,
  scoreLabel,
  scoreTrend = "neutral",
  onClick,
}: RecordItemProps) {
  const metadata = [type, time].filter(Boolean).join(" / ");

  return (
    <button type="button" className="record-item" onClick={onClick}>
      <div className="record-item-left">
        <div className="record-item-icon">
          <Icon name="calendar_today" />
        </div>
        <div className="record-item-info">
          <p className="record-item-title">{title}</p>
          <p className="record-item-date">{date}</p>
          {metadata ? <p className="record-item-type">{metadata}</p> : null}
        </div>
      </div>
      <div className="record-item-right">
        {count !== undefined ? (
          <div className="record-item-stat hidden-sm">
            <p className="record-item-stat-label">{countLabel}</p>
            <p className="record-item-stat-value">{count}</p>
          </div>
        ) : null}
        {score !== undefined ? (
          <div className="record-item-score">
            <p className="record-item-stat-label">{scoreLabel}</p>
            <div className="record-item-score-wrapper">
              <span className="record-item-score-value">{score}</span>
              {scoreTrend !== "neutral" ? (
                <Icon
                  name={scoreTrend === "up" ? "trending_up" : "trending_down"}
                  className={`record-item-trend ${scoreTrend === "up" ? "trend-up" : "trend-down"}`}
                />
              ) : null}
            </div>
          </div>
        ) : null}
        <Icon name="chevron_right" className="record-item-chevron" />
      </div>
    </button>
  );
}
