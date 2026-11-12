import type { ActivityBase } from './activity';
import type { UnrecognizedCode } from '../contracts/api';
import { EquipmentSynonyms, Equipments } from './equipment';

// D14 — varredura tolerante das observações privadas (nota do design
// 2026-11-11): o registro em si passou a ser case-insensitive + sinônimos PT
// (src/services/statistics.ts); este módulo espelha a MESMA semântica para
// encontrar os tokens que NÃO registraram nada e estão a ≤2 edições de um
// código — só esses viram caso de banner. Puro: sem redis, sem rede.

export type RawUnresolvedCase = {
  activityId: number;
  gearId: string;
  startDate: string;
  word: string;
  suggestion: string;
};

const MIN_REPORT_LENGTH = 4;
const MAX_LEVENSHTEIN = 2;

/** Minúsculas + sem acentos — o case-insensitive é pedido do proprietário. */
export function normalizeNote(note: string): string {
  return note
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Palavras do texto normalizado (limites \p{L}/\p{N} ≈ \b para o nosso vocabulário). */
export function tokenizeNote(normalizedNote: string): string[] {
  return normalizedNote.match(/[\p{L}\p{N}]+/gu) ?? [];
}

type Term = {
  /** forma normalizada — é o que casa por substring e entra no Levenshtein */
  norm: string;
  /** forma crua — o que aparece na sugestão do banner (acentuada) */
  display: string;
};

function buildVocab(): {
  byEquipment: Map<string, Term[]>;
  all: Term[];
} {
  const byEquipment = new Map<string, Term[]>();
  const byNorm = new Map<string, Term>();

  const intern = (raw: string): Term | null => {
    const norm = normalizeNote(raw);
    if (!norm) return null;
    const existing = byNorm.get(norm);
    if (existing) return existing;
    const term: Term = { norm, display: raw };
    byNorm.set(norm, term);
    return term;
  };

  for (const equipment of Object.values(Equipments)) {
    const terms: Term[] = [];
    const add = (raw: string) => {
      const term = intern(raw);
      if (term && !terms.includes(term)) terms.push(term);
    };

    add(equipment.id);
    for (const synonym of EquipmentSynonyms[equipment.id] ?? []) add(synonym);
    byEquipment.set(equipment.id, terms);
  }

  return { byEquipment, all: [...byNorm.values()] };
}

const VOCAB = buildVocab();

/**
 * O registro em si (createStatistics): o vocabulário do equipamento casa por
 * SUBSTRING no texto normalizado (mesma semântica de sempre do
 * `private_note.includes(equipment.id)`), com o guard do review: a palavra
 * `review` só registra com forma isolada — `shockreview`/`suspareview`
 * sozinhos não registram review (guard de `statistics.ts:245-253`,
 * estendido às formas PT: `revisão` isolada registra).
 */
export function equipmentMatches(
  normalizedNote: string,
  tokens: string[],
  equipmentId: string,
): boolean {
  if (!normalizedNote) return false;
  const terms = VOCAB.byEquipment.get(equipmentId);
  if (!terms) return false;

  const matched = terms.some((term) => normalizedNote.includes(term.norm));
  if (!matched) return false;

  if (equipmentId === Equipments.Review.id) {
    return terms.some((term) => tokens.includes(term.norm));
  }

  return true;
}

/**
 * "Resolvido" = o token gerou um registro de verdade: algum termo de
 * algum equipamento está contido no token, honrando o guard do review
 * (espelho exato de `equipmentMatches`, só que por token).
 */
function isTokenResolved(token: string, reviewIsolated: boolean): boolean {
  for (const [equipmentId, terms] of VOCAB.byEquipment) {
    const matched = terms.some((term) => token.includes(term.norm));
    if (!matched) continue;
    if (equipmentId === Equipments.Review.id && !reviewIsolated) continue;
    return true;
  }
  return false;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;

  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  return previous[b.length];
}

/** Código/sinônimo mais próximo a ≤2 edições; desempate por distância e depois ordem alfabética. */
function nearestCode(token: string): string | null {
  let best: { distance: number; display: string } | null = null;

  for (const term of VOCAB.all) {
    const distance = levenshtein(token, term.norm);
    if (distance > MAX_LEVENSHTEIN) continue;

    if (
      best === null ||
      distance < best.distance ||
      (distance === best.distance && term.display < best.display)
    ) {
      best = { distance, display: term.display };
    }
  }

  return best?.display ?? null;
}

/**
 * Atividades com `*` no nome e observação privada que contêm um token NÃO
 * resolvido a ≤2 edições de um código — o escopo do banner (design: só o
 * que não registrou nada; `chainn` calado, `chian` reportado).
 */
export function findUnresolvedCases(
  activities: ActivityBase[],
): RawUnresolvedCase[] {
  const cases: RawUnresolvedCase[] = [];

  for (const activity of activities) {
    if (!activity.name?.includes('*')) continue;
    if (!activity.private_note) continue;

    // normalizeNote não zera string não-vazia — a guarda de nota vazia já
    // aconteceu acima.
    const normalizedNote = normalizeNote(activity.private_note);

    const tokens = tokenizeNote(normalizedNote);
    const tokenSet = new Set(tokens);
    const reviewTerms = VOCAB.byEquipment.get(Equipments.Review.id) ?? [];
    const reviewIsolated = reviewTerms.some((term) => tokenSet.has(term.norm));

    for (const token of tokens) {
      if (token.length < MIN_REPORT_LENGTH) continue;
      if (isTokenResolved(token, reviewIsolated)) continue;

      const suggestion = nearestCode(token);
      if (!suggestion) continue;

      cases.push({
        activityId: activity.id,
        gearId: activity.gear_id,
        startDate: activity.start_date_local,
        word: token,
        suggestion,
      });
    }
  }

  return cases;
}

/**
 * Casos → payload do banner: gear desconhecido é descartado (sem nome não
 * há banner), dedupe por `activityId:word` (mesma palavra em atividades
 * distintas vira duas linhas — links diferentes) e ordem: data desc, palavra
 * asc (design).
 */
export function toUnrecognizedCodes(
  cases: RawUnresolvedCase[],
  gears: { id: string; name: string }[],
): UnrecognizedCode[] {
  const nameByGearId = new Map(gears.map((gear) => [gear.id, gear.name]));
  const seen = new Set<string>();
  const codes: UnrecognizedCode[] = [];

  for (const unresolvedCase of cases) {
    const gearName = nameByGearId.get(unresolvedCase.gearId);
    if (!gearName) continue;

    const caseKey = `${unresolvedCase.activityId}:${unresolvedCase.word}`;
    if (seen.has(caseKey)) continue;
    seen.add(caseKey);

    codes.push({
      activityId: unresolvedCase.activityId,
      gearName,
      startDate: unresolvedCase.startDate,
      word: unresolvedCase.word,
      suggestion: unresolvedCase.suggestion,
    });
  }

  codes.sort(
    (a, b) =>
      b.startDate.localeCompare(a.startDate) || a.word.localeCompare(b.word),
  );

  return codes;
}
