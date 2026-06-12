import { Button, SearchInput } from "../../../shared/components/ui";

interface HistoryToolbarProps {
  searchQuery: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  clearLabel: string;
}

export function HistoryToolbar({
  searchQuery,
  searchPlaceholder,
  onSearchChange,
  onClearSearch,
  clearLabel,
}: HistoryToolbarProps) {
  return (
    <section className="history-filters">
      <SearchInput
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChange={onSearchChange}
        className="search-input-flex"
        ariaLabel={searchPlaceholder}
      />
      {searchQuery ? (
        <Button variant="ghost" icon="close" onClick={onClearSearch}>
          {clearLabel}
        </Button>
      ) : null}
    </section>
  );
}
