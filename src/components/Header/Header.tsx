import { STRINGS } from '../../i18n/strings';
import styles from './Header.module.css';

const t = STRINGS;

export interface HeaderNavLink {
  label: string;
  href: string;
  /** The page the user is on right now. */
  active: boolean;
}

export interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  /** Page navigation (Forecast / Moon). Optional — a page may opt out. */
  nav?: HeaderNavLink[];
}

export function Header({ theme, onToggleTheme, nav }: HeaderProps): JSX.Element {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">🌅</span>
        <div>
          <h1 className={styles.title}>Sunsetrise</h1>
          <p className={styles.tagline}>{t.header.tagline}</p>
        </div>
      </div>
      <div className={styles.controls}>
        {nav && nav.length > 0 && (
          <nav className={styles.nav} aria-label={t.header.navLabel}>
            {nav.map((item) => (
              <a
                key={item.href}
                className={`${styles.navLink} ${item.active ? styles.navActive : ''}`}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
        <button
          type="button"
          className={styles.themeBtn}
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? t.header.themeLight : t.header.themeDark}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}