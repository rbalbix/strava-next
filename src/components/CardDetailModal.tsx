import { useCallback, useContext, useEffect, useState, useRef } from 'react';
import { MdClose, MdOutlineSaveAlt } from 'react-icons/md';
import { ClipLoader } from 'react-spinners';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type {
  EquipmentThresholds,
  ThresholdEntry,
  ThresholdUnit,
} from '../contracts/api';
import { apiClient, getHttpStatus } from '../lib/apiClient';
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
  // Estado "salvando" do D16 (design 2026-11-07): um booleano único cobre os
  // três gatilhos de saveThreshold (clique duplo, Enter e clique+Enter) — o
  // guard no início da função é quem impede a segunda requisição.
  const [saving, setSaving] = useState(false);

  // Refs para os inputs
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Refs para os segmentos do seletor de unidade (foco após a seta do teclado)
  const unitRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { signOut, openModal } = useContext(AuthContext);

  // 401 = a sessão acabou (§8.13 do plano): o mesmo caminho do 401 do
  // dashboard (§8.10) — `signOut` limpa o estado transitório, zera a modal e
  // pousa na landing. Um modal aberto sem limites seria uma tela quebrada
  // (pareceria dado sumido, não sessão revogada); a única saída para "sessão
  // encerrada" é a landing, nunca um cache vazio. O `ref` garante uma única
  // chamada mesmo com a carga e o salvamento falhando em paralelo (ou o
  // efeito rodando em dobro no StrictMode do desenvolvimento).
  const sessionEndedRef = useRef(false);
  const endSessionOnUnauthorized = useCallback(
    (error: unknown): boolean => {
      if (getHttpStatus(error) !== 401) return false;
      if (!sessionEndedRef.current) {
        sessionEndedRef.current = true;
        signOut();
      }
      return true;
    },
    [signOut],
  );

  // Carrega thresholds do backend
  useEffect(() => {
    let mounted = true;
    apiClient
      .getEquipmentThresholds()
      .then((res) => {
        if (!mounted) return;
        setThresholds(res || {});
      })
      .catch((err) => {
        // 401 encerra a sessão (§8.13); as demais falhas transitórias
        // continuam silenciosas — o modal abre sem limites e a próxima
        // abertura tenta de novo (§8.10: falha transitória não desloga).
        endSessionOnUnauthorized(err);
      });

    return () => {
      mounted = false;
    };
  }, [endSessionOnUnauthorized]);

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

  async function saveThreshold(equipmentId: string, caption: string) {
    // D16: enquanto a gravação está em voo, novos acionamentos são ignorados
    // (clique duplo / Enter duplo / clique+Enter) — uma única requisição.
    if (saving) return;
    const raw = inputs[equipmentId];
    const value = raw === '' ? 0 : Number(raw);
    const unit = unitInputs[equipmentId] ?? 'km';
    setSaving(true);
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
      // Toast de sucesso identifica componente, valor e unidade (ajuste do
      // proprietário em 2026-11-08): "Limite salvo [corrente: 150 km]". As
      // legendas de equipment.ts já terminam com ":" — remove antes de
      // reinserir o separador, senão a mensagem fica com dois dois-pontos.
      const label = caption.replace(/:\s*$/, '');
      showToast(
        value > 0
          ? `Limite salvo [${label}: ${value} ${unit}]`
          : 'Limite removido',
        'success',
      );

      // Apenas esconde o editor, NÃO limpa o input
      setVisibleEditorId(null);
    } catch (err) {
      // 401 na gravação é a mesma sessão encerrada (§8.13): em vez do toast
      // de falha — que sugeriria um problema do usuário — a landing. Os
      // demais erros (rede, 5xx) mantêm o toast com retry manual.
      if (!endSessionOnUnauthorized(err)) {
        showToast('Falha ao salvar limite', 'error');
      }
    } finally {
      // Sucesso, falha ou caminho 401 (§8.13) — o estado sempre volta a
      // normal; com signOut real a modal já desmontou e o setState é inócuo.
      setSaving(false);
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
    caption: string,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveThreshold(equipmentId, caption);
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
        {/* D15: gear sem nenhuma atividade — a mensagem e o botão aparecem
            dentro do modal, como nos demais cards (os stats zerados do
            header continuam visíveis). */}
        {count === 0 ? (
          <div className={styles.emptyState}>
            <p>Não há atividades registradas no Strava.</p>
            <button type='button' onClick={() => openModal('info')}>
              Ver como funciona
            </button>
          </div>
        ) : isBikeActivity && equipments.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              Você ainda não registrou manutenção para nenhum componente da
              sua bike
            </p>
            <button type='button' onClick={() => openModal('info')}>
              Ver como funciona
            </button>
          </div>
        ) : (
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
                              readOnly={saving}
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
                              onKeyDown={(ev) =>
                                handleInputKeyDown(e.id, e.caption, ev)
                              }
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
                              onClick={() => saveThreshold(e.id, e.caption)}
                              aria-label='Salvar limite'
                              aria-disabled={saving}
                              aria-busy={saving}
                            >
                              {/* A largura é fixa no CSS (.thresholdRow >
                                  button): os dois estados têm a mesma caixa
                                  e o conteúdo fica centralizado como antes. */}
                              {saving ? (
                                <ClipLoader
                                  size={16}
                                  color='var(--gl-surface-card)'
                                  cssOverride={{ boxSizing: 'border-box' }}
                                />
                              ) : (
                                <MdOutlineSaveAlt size={20} />
                              )}
                            </button>
                          </div>
                        </label>
                      </div>
                    )}
                  </CardItem>
                );
              })}
          </ul>
        )}
      </main>
    </div>
  );
}
