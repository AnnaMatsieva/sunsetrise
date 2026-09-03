import { CATEGORIES } from '../../constants/categories';
import { STRINGS } from '../../i18n/strings';
import styles from './Legend.module.css';

const t = STRINGS;

export function Legend(): JSX.Element {
  return (
    <section className={styles.legend} aria-label={t.legend.label}>
      <h3 className={styles.title}>{t.legend.titleScale}</h3>
      <ul className={styles.scale}>
        {CATEGORIES.map((c) => (
          <li key={c.category} className={styles.item} data-cat={c.category.toLowerCase()}>
            <span className={styles.swatch} data-cat={c.category.toLowerCase()} aria-hidden="true" />
            <span className={styles.label}>{t.categories[c.category].label}</span>
            <span className={styles.hint}>{t.categories[c.category].hint}</span>
          </li>
        ))}
      </ul>
      <h3 className={styles.title}>{t.legend.titleHow}</h3>
      <ul className={styles.science}>
        {t.legend.science.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p className={styles.attr}>
        {t.legend.attr}
        <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> (CC-BY 4.0).{' '}
        <a
          href="https://open-meteo.com/en/docs/air-quality-api"
          target="_blank"
          rel="noreferrer"
        >
          Air quality &amp; pollen
        </a>
        : CAMS via Open-Meteo.
      </p>
    </section>
  );
}