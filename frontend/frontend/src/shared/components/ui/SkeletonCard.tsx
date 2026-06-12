import { SurfaceCard } from "./SurfaceCard";
import { Skeleton } from "./Skeleton";

interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <SurfaceCard variant="lowest" padding="medium">
      <div className="skeleton-card">
        <Skeleton width="60%" height="1rem" />
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} width={i === lines - 1 ? "40%" : "100%"} />
        ))}
      </div>
    </SurfaceCard>
  );
}
