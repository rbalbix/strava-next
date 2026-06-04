import { MdClose } from 'react-icons/md';
import { locale } from '../utils/format';
import styles from '../styles/components/ThresholdAlertModal.module.css';

type ThresholdAlertItem = {
  gearId: string;
  gearName: string;
  equipmentId: string;
  label: string;
  distanceKm: number;
  thresholdKm: number;
  state: 'normal' | 'warning' | 'overdue';
};

interface ThresholdAlertModalProps {
  items: ThresholdAlertItem[];
  onClose: () => void;
  onViewEquipment: (gearId: string) => void;
}

export default function ThresholdAlertModal({
  items,
  onClose,
  onViewEquipment,
}: ThresholdAlertModalProps) {
  return (
    <div className={styles.alertModalContainer}>
      <header className={styles.header}>
        <div>
          <h2 id='modal-title-threshold-alert' className={styles.title}>
            Equipamentos ultrapassaram o limite
          </h2>
          <p id='modal-desc-threshold-alert' className={styles.description}>
            Revise o equipamento abaixo e ajuste o limite se necessário.
          </p>
        </div>
        <button
          type='button'
          onClick={onClose}
          className={styles.closeButton}
          aria-label='Fechar alerta de limite'
        >
          <MdClose aria-hidden='true' focusable='false' />
        </button>
      </header>

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Nenhum equipamento atrasado no momento.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li
              key={`${item.gearId}-${item.equipmentId}`}
              className={styles.item}
            >
              <div className={styles.details}>
                <strong>{item.gearName}</strong>
                <span className={styles.equipmentLabel}>{item.label}</span>
                <span className={styles.metrics}>
                  {locale.format(',.2f')(item.distanceKm)} km /{' '}
                  {locale.format(',.2f')(item.thresholdKm)} km
                </span>
              </div>
              <button
                type='button'
                className={styles.viewButton}
                onClick={() => onViewEquipment(item.gearId)}
              >
                Ver equipamento
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className={styles.footer}>
        <button type='button' className={styles.closeAction} onClick={onClose}>
          Fechar
        </button>
      </footer>
    </div>
  );
}
