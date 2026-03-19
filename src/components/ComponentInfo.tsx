import { useContext, useEffect, useState } from 'react';
import { FaMedapps } from 'react-icons/fa';

import { Equipment, Equipments } from '../services/equipment';

import { Divider } from '@mui/material';
import { MdClose } from 'react-icons/md';
import { AuthContext } from '../contexts/AuthContext';
import { copyTextToClipboard } from '../services/utils';
import cardStyles from '../styles/components/Card.module.css';
import styles from '../styles/components/Footer.module.css';

export default function ComponentInfo() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { closeModal } = useContext(AuthContext);

  useEffect(() => {
    if (Equipments) setEquipment(Object.values(Equipments));
  }, []);

  useEffect(() => {
    if (!copiedCode) return;
    const timer = window.setTimeout(() => setCopiedCode(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copiedCode]);

  const handleCopyCode = (code: string) => {
    copyTextToClipboard(code);
    setCopiedCode(code);
  };

  return (
    <main className={cardStyles.athleteStatInfoContent}>
      <header>
        <div className={cardStyles.athleteStatInfoTitle}>
          <div>
            <span className={cardStyles.athleteStatInfoTitleIcon}>
              <FaMedapps color='var(--stat-icon)' />
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
              <MdClose />
            </button>
          </div>
        </div>
      </header>
      <section>
        <div className={styles.orientationRow}>
          Para controlar um componente do equipamento deve-se escrever seu
          código no campo &apos;OBSERVAÇÕES PRIVADAS&apos; e incluir um * no título da
          Atividade.
        </div>
        <div className={styles.copyHint} aria-live='polite'>
          {copiedCode ? `Copiado: ${copiedCode}` : 'Clique no código para copiar.'}
        </div>
        <table className={styles.footerEquipmentTable}>
          <thead>
            <tr>
              <th>Componente</th>
              <th>Código</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map((e) => {
              return (
                <tr key={e.id}>
                  <td>{e.show}</td>
                  <td>
                    <button
                      type='button'
                      className={styles.copyButton}
                      onClick={() => handleCopyCode(e.id)}
                      aria-label={`Copiar codigo ${e.id}`}
                      data-active={copiedCode === e.id ? 'true' : 'false'}
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

      <Divider className={styles.dividerFooter} />
    </main>
  );
}
