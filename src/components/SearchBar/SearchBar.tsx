import { useEffect, useRef, useState } from 'react';
import type { GeoResult } from '../../types';
import { STRINGS } from '../../i18n/strings';
import styles from './SearchBar.module.css';

const t = STRINGS;

export interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  results: GeoResult[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string | null;
  onSelect: (result: GeoResult) => void;
}

export function SearchBar({ query, onQueryChange, results, status, error, onSelect }: SearchBarProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const blurTimer = useRef<number | null>(null);

  const showList = open && (status === 'loading' || results.length > 0 || (status === 'success' && results.length === 0));
  const listId = 'searchbar-listbox';

  useEffect(() => {
    setHighlight(-1);
  }, [query]);

  useEffect(() => {
    return () => {
      if (blurTimer.current !== null) window.clearTimeout(blurTimer.current);
    };
  }, []);

  const select = (r: GeoResult) => {
    onSelect(r);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (results.length === 0 ? -1 : (h + 1) % results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (results.length === 0 ? -1 : (h - 1 + results.length) % results.length));
    } else if (e.key === 'Enter') {
      if (highlight >= 0 && results[highlight]) {
        e.preventDefault();
        select(results[highlight]!);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        <span className={styles.icon} aria-hidden="true">🔍</span>
        <input
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={t.search.placeholder}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
        />
        {status === 'loading' && <span className={styles.spinner} aria-hidden="true" />}
      </div>

      {showList && (
        <ul className={styles.list} id={listId} role="listbox">
          {status === 'success' && results.length === 0 && (
            <li className={styles.empty}>{t.search.empty}</li>
          )}
          {results.map((r, i) => {
            const sub = [r.admin1, r.country].filter(Boolean).join(', ');
            return (
              <li key={`${r.id}-${r.latitude}-${r.longitude}`} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  className={`${styles.option} ${i === highlight ? styles.highlighted : ''}`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep focus until the click lands
                    select(r);
                  }}
                >
                  <span className={styles.name}>{r.name}</span>
                  {sub && <span className={styles.sub}>{sub}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}