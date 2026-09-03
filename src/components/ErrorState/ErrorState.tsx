import { STRINGS } from '../../i18n/strings';
import styles from './ErrorState.module.css';

const t = STRINGS;

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps): JSX.Element {
  return (
    <div className={styles.box} role="alert">
      <p className={styles.msg}>{message}</p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          {t.error.retry}
        </button>
      )}
    </div>
  );
}