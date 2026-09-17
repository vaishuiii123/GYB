import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import "./SearchableSelect.css";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  id?: string;
  value: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  onChange: (value: string) => void;
};

export default function SearchableSelect({
  id,
  value,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled = false,
  emptyMessage = "No matches",
  onChange,
}: SearchableSelectProps) {
  const autoId = useId();
  const triggerId = id || autoId;
  const listId = `${triggerId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selectedLabel = useMemo(() => {
    if (!value) {
      return placeholder;
    }
    return options.find((option) => option.value === value)?.label || placeholder;
  }, [options, placeholder, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setHighlight(0);
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) =>
        filtered.length === 0 ? 0 : Math.min(index + 1, filtered.length - 1)
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) {
        selectOption(option.value);
      }
    }
  };

  return (
    <div
      className={`searchable-select${open ? " is-open" : ""}${
        disabled ? " is-disabled" : ""
      }`}
      ref={rootRef}
    >
      <button
        type="button"
        id={triggerId}
        className="searchable-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
          }
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span
          className={`searchable-select-value${
            value ? "" : " is-placeholder"
          }`}
        >
          {selectedLabel}
        </span>
        <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
      </button>

      {open && !disabled ? (
        <div className="searchable-select-menu" role="presentation">
          <div className="searchable-select-search">
            <Search size={15} strokeWidth={2.2} aria-hidden />
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
            />
          </div>
          <ul id={listId} className="searchable-select-list" role="listbox">
            <li role="option" aria-selected={value === ""}>
              <button
                type="button"
                className={`searchable-select-option${
                  value === "" ? " is-selected" : ""
                }`}
                onClick={() => selectOption("")}
              >
                {placeholder}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="searchable-select-empty">{emptyMessage}</li>
            ) : (
              filtered.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <button
                    type="button"
                    className={`searchable-select-option${
                      option.value === value ? " is-selected" : ""
                    }${index === highlight ? " is-highlight" : ""}`}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => selectOption(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
