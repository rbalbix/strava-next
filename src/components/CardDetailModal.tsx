import { useEffect, useState, useRef } from 'react';
import { MdClose, MdOutlineSaveAlt } from 'react-icons/md';
import { useToast } from '../contexts/ToastContext';
import type {
  EquipmentThresholds,
  ThresholdEntry,
  ThresholdUnit,
} from '../contracts/api';
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
  const [unitInputs, setUnitInputs] = useState<Record<string, ThresholdUnit>>(
    {},
  );
  const [visibleEditorId, setVisibleEditorId] = useState<string | null>(null);

  // Refs para os inputs
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Refs para os segmentos do seletor de unidade (foco após a seta do teclado)
  const unitRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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
        Object.entries(gearThresholds).forEach(([equipmentId, entry]) => {
          if (entry && entry.value > 0) {
            newInputs[equipmentId] = entry.value.toString();
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
    const unit = unitInputs[equipmentId] ?? 'km';
    try {
      const updated = await apiClient.saveEquipmentThreshold({
        gearId: gearStat.id,
        equipmentId,
        thresholdKm: value,
        unit,
      });
      setThresholds(updated || {});
      sessionStorage.setItem(
        'equipmentThresholds',
        JSON.stringify(updated || {}),
      );
      showToast(value > 0 ? 'Limite salvo' : 'Limite removido', 'success');

      // Apenas esconde o editor, NÃO limpa o input
      setVisibleEditorId(null);
    } catch (err) {
      showToast('Falha ao salvar limite', 'error');
    }
  }

  // Função para toggle do editor
  const toggleEditor = (equipmentId: string, entry?: ThresholdEntry) => {
    if (visibleEditorId === equipmentId) {
      setVisibleEditorId(null);
    } else {
      setVisibleEditorId(equipmentId);

      // Pré-preenche valor e unidade do limite salvo (km quando não há limite)
      const hasLimit = Boolean(entry && entry.value > 0);
      setInputs((s) => ({
        ...s,
        [equipmentId]: hasLimit ? String(entry!.value) : '',
      }));
      setUnitInputs((s) => ({
        ...s,
        [equipmentId]: hasLimit ? entry!.unit : 'km',
      }));

      // Foca no input após abrir (delay para garantir renderização)
      setTimeout(() => {
        inputRefs.current[equipmentId]?.focus();
      }, 50);
    }
  };

  // Troca de unidade mantém o valor digitado no campo: ele passa a valer na
  // unidade recém-escolhida, sempre visível ao lado do campo (inspeção
  // visual — a limpeza automática foi removida)
  const handleUnitChange = (equipmentId: string, unit: ThresholdUnit) => {
    setUnitInputs((s) => ({
      ...s,
      [equipmentId]: unit,
    }));
  };

  // Navegação por setas no seletor km|h (semântica de radio-group)
  const handleUnitKeyDown = (
    equipmentId: string,
    active: ThresholdUnit,
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      return;
    }
    e.preventDefault();
    const next: ThresholdUnit = active === 'km' ? 'h' : 'km';
    handleUnitChange(equipmentId, next);
    unitRefs.current[`${equipmentId}:${next}`]?.focus();
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
                      ? 'var(--gl-status-normal)'
                      : 'var(--icon-bike-road)',
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
              const currentValue = current?.value;
              const isEditorVisible = visibleEditorId === e.id;
              const activeUnit = unitInputs[e.id] ?? current?.unit ?? 'km';

              return (
                <CardItem
                  key={e.id}
                  equipment={e}
                  distance={distance}
                  movingTime={movingTime}
                  threshold={current}
                  onToggleEditor={() => toggleEditor(e.id, current)}
                  isEditorVisible={isEditorVisible}
                >
                  {isEditorVisible && (
                    <div className={styles.thresholdEditor}>
                      <label>
                        <div className={styles.thresholdRow}>
                          <input
                            ref={(el) => {
                              inputRefs.current[e.id] = el;
                            }}
                            type='number'
                            aria-label={`Limite de ${e.caption}`}
                            min={0}
                            step={activeUnit === 'h' ? 1 : 100}
                            value={
                              inputs[e.id] ??
                              (currentValue && currentValue > 0
                                ? currentValue
                                : '')
                            }
                            onChange={(ev) =>
                              setInputs((s) => ({
                                ...s,
                                [e.id]: ev.target.value,
                              }))
                            }
                            onKeyDown={(ev) => handleInputKeyDown(e.id, ev)}
                            placeholder='Limite'
                            autoFocus
                          />
                          {/* Padrão de grupos de opções deste app (primeiro do
                              tipo): contêiner `role="radiogroup"`, segmentos
                              `role="radio"` com `aria-checked`, tabindex móvel
                              (só o ativo entra no Tab) e setas que alternam o
                              segmento e levam o foco junto. */}
                          <div
                            className={styles.unitSelector}
                            role='radiogroup'
                            aria-label='Unidade do limite'
                          >
                            {(['km', 'h'] as ThresholdUnit[]).map((unit) => (
                              <button
                                key={unit}
                                type='button'
                                role='radio'
                                aria-checked={activeUnit === unit}
                                tabIndex={activeUnit === unit ? 0 : -1}
                                ref={(el) => {
                                  unitRefs.current[`${e.id}:${unit}`] = el;
                                }}
                                onClick={() => handleUnitChange(e.id, unit)}
                                onKeyDown={(ev) =>
                                  handleUnitKeyDown(e.id, activeUnit, ev)
                                }
                              >
                                {unit}
                              </button>
                            ))}
                          </div>
                          <button
                            type='button'
                            onClick={() => saveThreshold(e.id)}
                            aria-label='Salvar limite'
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
