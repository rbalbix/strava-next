import { useToast } from '../contexts/ToastContext';
import styles from '../styles/components/Toast.module.css';

export default function Toast() {
  const { toast } = useToast();

  const isError = toast?.variant === 'error';
  const role = isError ? 'alert' : 'status';
  const live = isError ? 'assertive' : 'polite';

  // Região viva PERMANENTE (P3): antes o container só existia junto com a
  // mensagem — alguns leitores de tela não anunciam conteúdo que entra no
  // DOM junto com a própria região. Sem toast, o container fica vazio e
  // invisível (position: fixed).
  return (
    <div className={styles.toastContainer} role={role} aria-live={live}>
      {toast && (
        <div className={`${styles.toast} ${styles[toast.variant]}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
