import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { getHttpStatus } from '../lib/apiClient';
import styles from '../styles/components/ErroMsg.module.css';

type Props = {
  /** Erro a exibir. Quando omitido, usa o `codeError` do AuthContext. */
  error?: unknown;
  /** Dispara uma nova tentativa. Quando omitido, o painel não mostra retry. */
  onRetry?: () => void;
};

const MESSAGES = {
  rateLimited: {
    title: 'Limite excedido',
    body: 'O Strava limita a quantidade de consultas por período. Tente novamente em alguns minutos.',
  },
  generic: {
    title: 'Não conseguimos atualizar seus dados',
    body: 'Ocorreu uma falha ao falar com o Strava. Verifique sua conexão e tente novamente.',
  },
} as const;

/**
 * Painel de erro do dashboard e da landing.
 *
 * Historicamente este componente só renderizava para `status === 429`, e só
 * existia numa branch da home inalcançável em produção — na prática o usuário
 * nunca via mensagem alguma quando a API falhava. Hoje ele é alcançável pelo
 * `Stats` trata 429 e falhas transitórias. O 401 não é uma mensagem para o
 * usuário: o fluxo de sessão decide entre recuperação automática ou landing.
 */
export default function ErroMsg({ error, onRetry }: Props) {
  const { codeError } = useContext(AuthContext);

  const status = getHttpStatus(error ?? codeError);
  const hasError = (error ?? codeError) !== undefined && (error ?? codeError) !== null;

  if (!hasError) return null;

  // Nunca mostre "sessão expirada". Sem dados anteriores, o 401 volta para a
  // landing; com dados, tenta recuperar uma vez. Em ambos os casos um painel
  // de erro só confunde e pode piscar antes da navegação.
  if (status === 401) return null;

  const message = status === 429 ? MESSAGES.rateLimited : MESSAGES.generic;

  return (
    <div className={styles.erroMsgContainer} role='alert' aria-live='assertive'>
      <div className={styles.headerContainer}>
        <h2 className={styles.erroTitle}>{message.title}</h2>
      </div>
      <p className={styles.erroBody}>{message.body}</p>
      {onRetry && (
        <div className={styles.erroActions}>
          <button
            type='button'
            onClick={onRetry}
            className={styles.retryButton}
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
