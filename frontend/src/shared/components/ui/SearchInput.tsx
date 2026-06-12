import type { ChangeEvent, KeyboardEvent } from "react";
import { Icon } from "../Icon";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function SearchInput({
  placeholder = "",
  value = "",
  onChange,
  onSubmit,
  className = "",
  ariaLabel,
}: SearchInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && onSubmit) {
      onSubmit(value);
    }
  };

  return (
    <div className={`search-input-wrapper ${className}`}>
      <Icon name="search" className="search-icon" />
      <input
        type="search"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel ?? placeholder}
      />
    </div>
  );
}
