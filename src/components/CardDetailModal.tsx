import { useEffect, useState } from 'react';
import { MdClose, MdOutlineSaveAlt } from 'react-icons/md';
import { useToast } from '../contexts/ToastContext';
import type { EquipmentThresholds } from '../contracts/api';
import { apiClient } from '../lib/apiClient';
import type { GearStats } from '../services/gear';
import styles from '../styles/components/CardDetailModal.module.css';
import { locale, secondsToHms } from '../utils/format';
import {
  getActivityVisualType,
  isBikeActivityType,
  renderActivityIcon,
} from './activity-type-visual';
import CardItem from './CardItem';
import StatCard from './StatCard';

interface CardDetailModalProps {
  gearStat: GearStats;
  onClose: () => void;
}

export default function CardDetailModal({
  gearStat,
  onClose,
}: CardDetailModalProps) {
  const { name, activityType, count, distance, movingTime, equipments } =
    gearStat;
  const visualType = getActivityVisualType(activityType);
  const isBikeActivity = isBikeActivityType(activityType);
  const { showToast } = useToast();

  const [thresholds, setThresholds] = useState<EquipmentThresholds>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});

  // Estado para controlar qual equipamento está com o editor visível
  const [visibleEditorId, setVisibleEditorId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiClient
      .getEquipmentThresholds()
      .then((res) => {
        if (!mounted) return;
        setThresholds(res || {});
      })
      .catch(() => {
        // ignore
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function saveThreshold(equipmentId: string) {
    const raw = inputs[equipmentId];
    const value = raw === '' ? 0 : Number(raw);
    try {
      const updated = await apiClient.saveEquipmentThreshold({
        gearId: gearStat.id,
        equipmentId,
        thresholdKm: value,
      });
      setThresholds(updated || {});
      sessionStorage.setItem(
        'equipmentThresholds',
        JSON.stringify(updated || {}),
      );
      showToast('Limite salvo', 'success');

      // Limpa o input e esconde o editor após salvar
      setInputs((s) => ({ ...s, [equipmentId]: '' }));
      setVisibleEditorId(null); // 👈 Esconde o editor após salvar
    } catch (err) {
      showToast('Falha ao salvar limite', 'error');
    }
  }

  // Função para toggle do editor
  const toggleEditor = (equipmentId: string) => {
    if (visibleEditorId === equipmentId) {
      setVisibleEditorId(null); // 👈 Se já está visível, esconde
    } else {
      setVisibleEditorId(equipmentId); // 👈 Mostra o editor para este equipamento
    }
  };

  return (
    <div className={styles.cardDetailModalContainer}>
      <main>
        <header>
          <div>
            <div>
              <span>
                {renderActivityIcon(
                  visualType,
                  styles.detailIcon,
                  visualType === 'run'
                    ? 'var(--orange-strava)'
                    : visualType === 'mountain-bike'
                      ? 'var(--mountain-bike-green)'
                      : 'var(--light-blue)',
                )}
              </span>
              <h2 id='modal-title-card-detail' className={styles.modalTitle}>
                {name}
              </h2>
            </div>
            <div>
              <button
                type='button'
                onClick={onClose}
                className={styles.closeButton}
                aria-label='Fechar detalhes'
              >
                <MdClose aria-hidden='true' focusable='false' />
              </button>
            </div>
          </div>
          <section>
            <div className={styles.statCardContainer}>
              <StatCard value={count} label='Atividades' icon='📊' />
              <StatCard
                value={`${locale.format(',.2f')(distance / 1000)}km`}
                label='Distância Total'
                icon='📍'
              />
              <StatCard
                value={`${secondsToHms(movingTime)}h`}
                label='Tempo Total'
                icon='⏱️'
              />
            </div>
          </section>
        </header>
        <ul className={styles.timeline}>
          {isBikeActivity &&
            equipments.map((e) => {
              const current = thresholds[gearStat.id]?.[e.id];
              const isEditorVisible = visibleEditorId === e.id;

              return (
                <CardItem
                  key={e.id}
                  equipment={e}
                  distance={distance}
                  movingTime={movingTime}
                  thresholdKm={current}
                  onToggleEditor={() => toggleEditor(e.id)} // 👈 Passa a função para o CardItem
                  isEditorVisible={isEditorVisible} // 👈 Passa o estado de visibilidade
                >
                  {/* Editor visível apenas quando isEditorVisible for true */}
                  {isEditorVisible && (
                    <div className={styles.thresholdEditor}>
                      <label>
                        <div className={styles.thresholdRow}>
                          <input
                            type='number'
                            min={0}
                            value={
                              inputs[e.id] ??
                              (current && current !== 0 ? current : '')
                            } // 👈 Não mostra 0
                            onChange={(ev) =>
                              setInputs((s) => ({
                                ...s,
                                [e.id]: ev.target.value,
                              }))
                            }
                            placeholder='Limite (km)'
                            autoFocus // 👈 Foco automático ao abrir
                          />
                          <button
                            type='button'
                            onClick={() => saveThreshold(e.id)}
                          >
                            <MdOutlineSaveAlt size={20} />
                          </button>
                        </div>
                      </label>
                    </div>
                  )}
                </CardItem>
              );
            })}
        </ul>
      </main>
    </div>
  );
}
