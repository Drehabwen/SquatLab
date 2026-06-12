import { Button, EmptyState } from "../../../shared/components/ui";

interface HistoryEmptyStateProps {
  hasSearchQuery: boolean;
  title: string;
  description: string;
  actionLabel: string;
  clearLabel: string;
  onClearSearch: () => void;
}

export function HistoryEmptyState({
  hasSearchQuery,
  title,
  description,
  actionLabel,
  clearLabel,
  onClearSearch,
}: HistoryEmptyStateProps) {
  return (
    <EmptyState
      icon="history"
      title={title}
      description={description}
      action={
        hasSearchQuery ? (
          <Button variant="ghost" icon="close" onClick={onClearSearch}>
            {clearLabel}
          </Button>
        ) : (
          <Button variant="primary" icon="play_arrow" to="/assessment">
            {actionLabel}
          </Button>
        )
      }
    />
  );
}
