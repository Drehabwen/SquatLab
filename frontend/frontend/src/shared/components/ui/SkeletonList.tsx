import { SkeletonCard } from "./SkeletonCard";

interface SkeletonListProps {
  count?: number;
}

export function SkeletonList({ count = 3 }: SkeletonListProps) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </div>
  );
}
