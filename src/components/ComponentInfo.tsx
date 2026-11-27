import { useContext } from 'react';
import { FaMedapps } from 'react-icons/fa';

import { orderedEquipments } from '../services/equipment';

import { MdClose } from 'react-icons/md';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { copyTextToClipboard } from '../utils/clipboard';
import cardStyles from '../styles/components/Card.module.css';
import styles from '../styles/components/Footer.module.css';

export default function ComponentInfo() {
  const { closeModal } = useContext(AuthContext);
  const { showToast } = useToast();

  const handleCopyCode = async (code: string) => {
    // P4: o utilitário devolve o resultado — antes o toast "Copiado"
    // aparecia mesmo quando a cópia falhava (permissão negada).
    const copied = await copyTextToClipboard(code);
    showToast(
      copied ? `Copiado: ${code}` : `Não foi possível copiar ${code}`,
      copied ? 'success' : 'error',
    );
  };

  return (
    <div className={cardStyles.athleteStatInfoContent}>
      <header>
        <div className={cardStyles.athleteStatInfoTitle}>
          <div>
            <span className={cardStyles.athleteStatInfoTitleIcon}>
              <FaMedapps
                color='var(--stat-icon)'
                aria-hidden='true'
                focusable='false'
              />
            </span>
            <h2
              id='modal-title-equipments'
              className={cardStyles.athleteStatInfoHeading}
            >
              Componentes:
            </h2>
          </div>
          <div>
            <button
              type='button'
              onClick={closeModal}
              className={styles.closeButton}
              aria-label='Fechar componentes'
            >
              <MdClose aria-hidden='true' focusable='false' />
            </button>
          </div>
        </div>
      </header>
      <section>
        <div className={styles.orientationRow} id='modal-desc-equipments'>
          Para controlar um componente do equipamento deve-se escrever seu
          código no campo <strong>&apos;OBSERVAÇÕES PRIVADAS&apos;</strong> e
          incluir um * no título da Atividade.
        </div>
        <div className={styles.copyHint}>Clique no código para copiar.</div>
        <table className={styles.footerEquipmentTable}>
          <thead>
            <tr>
              <th>Componente</th>
              <th>Código</th>
            </tr>
          </thead>
          <tbody>
            {/* orderedEquipments é constante do catálogo: o useState+effect
                anterior só acrescentava um render vazio (P3). */}
            {orderedEquipments.map((e) => {
              return (
                <tr key={e.id}>
                  <td>{e.show}</td>
                  <td>
                    <button
                      type='button'
                      className={styles.copyButton}
                      onClick={() => void handleCopyCode(e.id)}
                      aria-label={`Copiar código ${e.id}`}
                    >
                      {e.id}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <hr className={styles.dividerFooter} />
    </div>
  );
}
