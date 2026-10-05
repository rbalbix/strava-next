import { MdClose } from 'react-icons/md';
import { IoBuildOutline } from 'react-icons/io5';
import type { ThresholdUnit } from '../contracts/api';
import { formatThresholdValue } from '../utils/thresholds';
import styles from '../styles/components/ThresholdAlertModal.module.css';

type ThresholdAlertItem = {
  gearId: string;
  gearName: string;
  equipmentId: string;
  label: string;
  current: number;
  limit: number;
  unit: ThresholdUnit;
  state: 'normal' | 'warning' | 'overdue';
};

interface ThresholdAlertModalProps {
  items: ThresholdAlertItem[];
  onClose: () => void;
  onViewEquipment: (gearId: string) => void;
}

// Utilitários fora do componente para melhor performance
const isValidThreshold = (value: number): boolean => {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    isFinite(value) &&
    value !== null &&
    value !== undefined &&
    value > 0
  );
};

const isValidItem = (item: ThresholdAlertItem): boolean => {
  return isValidThreshold(item.limit);
};

const groupItemsByGear = (items: ThresholdAlertItem[]) => {
  // Map (e não objeto literal): preserva a ordem de inserção dos grupos.
  // Em objeto, ids numéricos da Strava enumeram primeiro em ordem crescente
  // (chaves inteiras em JS), reordenando os grupos contra a ordem do dashboard.
  const groups = new Map<
    string,
    { gearId: string; gearName: string; equipments: ThresholdAlertItem[] }
  >();

  items.forEach((item) => {
    const group = groups.get(item.gearId);
    if (group) {
      group.equipments.push(item);
    } else {
      groups.set(item.gearId, {
        gearId: item.gearId,
        gearName: item.gearName,
        equipments: [item],
      });
    }
  });

  return groups;
};

export default function ThresholdAlertModal({
  items,
  onClose,
  onViewEquipment,
}: ThresholdAlertModalProps) {
  // Filtra itens válidos
  const validItems = items.filter(isValidItem);

  // Agrupa os itens válidos
  const groupedItems = groupItemsByGear(validItems);

  const hasValidItems = groupedItems.size > 0;

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

      {!hasValidItems ? (
        <div className={styles.emptyState}>
          <p>Nenhum equipamento com limite configurado no momento.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {Array.from(groupedItems.values()).map((group) => (
            <li key={group.gearId} className={styles.gearGroup}>
              <strong className={styles.gearName}>{group.gearName}</strong>
              <div className={styles.equipmentsList}>
                {group.equipments.map((item) => (
                  <div
                    key={`${item.gearId}-${item.equipmentId}`}
                    className={styles.item}
                    onClick={() => onViewEquipment(item.gearId)}
                    role='button'
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      // role='button' num div precisa da ativação por
                      // teclado (Enter/Espaço) — WCAG 2.1.1.
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        onViewEquipment(item.gearId);
                      }
                    }}
                    aria-label={`Ver detalhes de ${item.label} do equipamento ${item.gearName}`}
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
                            {formatThresholdValue(item.current, item.unit)}
                          </span>{' '}
                          / {formatThresholdValue(item.limit, item.unit)}
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
