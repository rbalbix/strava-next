import { useToast } from '../contexts/ToastContext';
import styles from '../styles/components/Toast.module.css';

export default function Toast() {
  const { toast } = useToast();

  if (!toast) return null;

  const isError = toast.variant === 'error';
  const role = isError ? 'alert' : 'status';
  const live = isError ? 'assertive' : 'polite';

  return (
    <div className={styles.toastContainer} role={role} aria-live={live}>
      <div className={`${styles.toast} ${styles[toast.variant]}`}>
        {toast.message}
      </div>
    </div>
  );
}
