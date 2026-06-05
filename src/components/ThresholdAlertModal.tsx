import { MdClose } from 'react-icons/md';
import { IoBuildOutline } from 'react-icons/io5';
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
  // Agrupar itens pelo mesmo gearName
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.gearName]) {
        acc[item.gearName] = {
          gearId: item.gearId,
          gearName: item.gearName,
          equipments: [],
        };
      }
      acc[item.gearName].equipments.push(item);
      return acc;
    },
    {} as Record<
      string,
      { gearId: string; gearName: string; equipments: ThresholdAlertItem[] }
    >,
  );

  return (
    <div className={styles.alertModalContainer}>
      <header className={styles.header}>
        <div>
          <h2 id='modal-title-threshold-alert' className={styles.title}>
            Equipamentos que atingiram o limite configurado
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
          {Object.values(groupedItems).map((group) => (
            <li key={group.gearId} className={styles.gearGroup}>
              <strong className={styles.gearName}>{group.gearName}</strong>
              <div className={styles.equipmentsList}>
                {group.equipments.map((item, idx) => (
                  <div
                    key={`${item.gearId}-${item.equipmentId}`}
                    className={styles.item}
                    onClick={() => onViewEquipment(item.gearId)}
                  >
                    <div>
                      <div className={styles.labelContainer}>
                        <span className={styles.equipmentLabel}>
                          {item.label}
                        </span>
                        <IoBuildOutline
                          className={styles.icon}
                          aria-hidden='true'
                          focusable='false'
                          size={18}
                        />
                      </div>

                      <div>
                        <span className={styles.metrics}>
                          <span className={styles.limitConfigured}>
                            {locale.format(',.2f')(item.distanceKm)} km
                          </span>{' '}
                          / {locale.format(',.2f')(item.thresholdKm)} km
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
