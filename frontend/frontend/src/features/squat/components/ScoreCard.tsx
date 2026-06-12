interface ScoreCardProps {
  label: string;
  value: number;
}

export function ScoreCard({ label, value }: ScoreCardProps) {
  return (
    <div className="score-card">
      <span className="score-label">{label}</span>
      <strong className="score-value">{value}</strong>
    </div>
  );
}
