import { useCallback, useEffect, useState } from 'react';
import { useMediaQuery } from './useMediaQuery';

const THEME_KEY = 'sunsetrise-theme';

export type Theme = 'light' | 'dark';

/**
 * Theme: a manual choice (localStorage) takes priority over the system one
 * (prefers-color-scheme). Applied via data-theme on documentElement (see tokens.css).
 * Shared by every page (App and MoonApp) so both look identical.
 */
export function useTheme(): readonly [Theme, () => void] {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [override, setOverride] = useState<Theme | null>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  });

  const theme: Theme = override ?? (systemDark ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setOverride((prev) => {
      const current: Theme = prev ?? (systemDark ? 'dark' : 'light');
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* localStorage unavailable (private mode) — ignore */
      }
      return next;
    });
  }, [systemDark]);

  return [theme, toggle] as const;
}