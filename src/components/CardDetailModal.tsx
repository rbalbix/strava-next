import { useEffect, useState, useRef } from 'react';
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
  const [visibleEditorId, setVisibleEditorId] = useState<string | null>(null);
  const [exitingEditorId, setExitingEditorId] = useState<string | null>(null);

  // Refs para os inputs
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Carrega thresholds do backend
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

  // Sincroniza inputs com thresholds sempre que thresholds mudar
  useEffect(() => {
    const newInputs: Record<string, string> = {};

    if (thresholds && gearStat.id) {
      const gearThresholds = thresholds[gearStat.id];
      if (gearThresholds) {
        Object.entries(gearThresholds).forEach(([equipmentId, value]) => {
          if (value && value > 0) {
            newInputs[equipmentId] = value.toString();
          }
        });
      }
    }

    setInputs((prev) => ({
      ...newInputs,
      ...prev,
    }));
  }, [thresholds, gearStat.id]);

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
      showToast(value > 0 ? 'Limite salvo' : 'Limite removido', 'success');

      // Fecha com animação
      closeEditor(equipmentId);
    } catch (err) {
      showToast('Falha ao salvar limite', 'error');
    }
  }

  // Função para fechar com animação
  const closeEditor = (equipmentId: string) => {
    setExitingEditorId(equipmentId);
    setTimeout(() => {
      setVisibleEditorId(null);
      setExitingEditorId(null);
    }, 600); // Deve bater com o tempo do CSS (0.6s)
  };

  // Função para toggle do editor
  const toggleEditor = (equipmentId: string, currentThreshold?: number) => {
    if (visibleEditorId === equipmentId) {
      closeEditor(equipmentId);
    } else {
      // Se outro estava saindo, limpa imediatamente
      setExitingEditorId(null);
      setVisibleEditorId(equipmentId);

      // Garante que o input tenha o valor atual
      const currentValue =
        currentThreshold && currentThreshold > 0
          ? currentThreshold.toString()
          : '';
      setInputs((s) => ({
        ...s,
        [equipmentId]: currentValue,
      }));

      // Foca no input após abrir (delay para garantir renderização)
      setTimeout(() => {
        inputRefs.current[equipmentId]?.focus();
      }, 50);
    }
  };

  // Função para lidar com Enter no input
  const handleInputKeyDown = (
    equipmentId: string,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveThreshold(equipmentId);
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
              const isVisible = visibleEditorId === e.id;
              const isExiting = exitingEditorId === e.id;

              return (
                <CardItem
                  key={e.id}
                  equipment={e}
                  distance={distance}
                  movingTime={movingTime}
                  thresholdKm={current}
                  onToggleEditor={() => toggleEditor(e.id, current)}
                  isEditorVisible={isVisible}
                >
                  {(isVisible || isExiting) && (
                    <div
                      className={`${styles.thresholdEditor} ${isExiting ? styles.exiting : ''}`}
                    >
                      <label>
                        <div className={styles.thresholdRow}>
                          <input
                            ref={(el) => {
                              inputRefs.current[e.id] = el;
                            }}
                            type='number'
                            min={0}
                            step={100}
                            value={
                              inputs[e.id] ??
                              (current && current > 0 ? current : '')
                            }
                            onChange={(ev) =>
                              setInputs((s) => ({
                                ...s,
                                [e.id]: ev.target.value,
                              }))
                            }
                            onKeyDown={(ev) => handleInputKeyDown(e.id, ev)}
                            placeholder='Limite (km)'
                            autoFocus
                          />
                          <button
                            type='button'
                            onClick={() => saveThreshold(e.id)}
                            aria-label='Salvar limite'
                          >
                            <MdOutlineSaveAlt size={24} />
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
