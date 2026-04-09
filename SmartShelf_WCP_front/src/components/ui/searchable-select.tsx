import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SearchableOption {
  value: string;
  label: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  value: string;
  options: Array<string | SearchableOption>;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  emptyMessage?: string;
  renderOption?: (value: string) => string;
  inputClassName?: string;
  locale?: string;
  isLoading?: boolean;
}

const SearchableSelect = ({
  value,
  options,
  onValueChange,
  placeholder,
  disabled = false,
  emptyMessage = 'No results found',
  renderOption,
  inputClassName,
  locale,
  isLoading = false,
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedOptions = useMemo(
    () =>
      options.map((option) =>
        typeof option === 'string'
          ? { value: option, label: renderOption ? renderOption(option) : option, keywords: [] }
          : option,
      ),
    [options, renderOption],
  );
  const selectedOption = normalizedOptions.find((option) => option.value === value);

  useEffect(() => {
    setQuery(selectedOption?.label ?? '');
  }, [selectedOption]);

  const filteredOptions = useMemo(() => {
    const collator = new Intl.Collator(locale, { sensitivity: 'base' });
    const normalizedQuery = locale
      ? query.trim().toLocaleLowerCase(locale)
      : query.trim().toLocaleLowerCase();
    return [...normalizedOptions]
      .sort((left, right) => collator.compare(left.label, right.label))
      .filter((option) => {
        if (!normalizedQuery) {
          return true;
        }
        const haystacks = [option.label, ...(option.keywords ?? [])].map((item) =>
          locale ? item.toLocaleLowerCase(locale) : item.toLocaleLowerCase(),
        );
        return haystacks.some((item) => item.startsWith(normalizedQuery) || item.includes(normalizedQuery));
      });
  }, [locale, normalizedOptions, query]);

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setIsOpen(false);
              setQuery(selectedOption?.label ?? '');
            }, 120);
          }}
          className={cn(
            'flex h-12 w-full rounded-xl border border-border bg-surface-muted px-4 py-3 pr-10 text-sm text-text-primary',
            'outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-50',
            inputClassName,
          )}
        />
        <ChevronDown
          size={16}
          className={cn(
            'pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </div>

      {isOpen && !disabled ? (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-black/10">
          {isLoading ? (
            <div className="px-3 py-3 text-sm text-text-muted">{placeholder}...</div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onValueChange(option.value);
                    setQuery(option.label);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors',
                    isSelected ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-primary hover:bg-background',
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected ? <Check size={16} /> : null}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-text-muted">{emptyMessage}</div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export { SearchableSelect };
