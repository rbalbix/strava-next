export type Equipment = {
  id: string;
  caption: string;
  show: string;
  distance?: number;
  movingTime?: number;
  date?: string;
  isRegistered?: boolean;
};

export const Equipments = {
  Lubrification: { id: 'lub', caption: 'lubrificação:', show: 'Lubrificação' },
  Review: { id: 'review', caption: 'revisão completa:', show: 'Revisão' },
  Clean: { id: 'clean', caption: 'lavagem completa:', show: 'Lavagem' },

  SuspensionReview: {
    id: 'suspareview',
    caption: 'suspensão (rev.):',
    show: 'Suspensão (rev.)',
  },
  ShockReview: {
    id: 'shockreview',
    caption: 'shock (rev.):',
    show: 'Shock (rev.)',
  },
  Suspension: {
    id: 'suspension',
    caption: 'suspensão:',
    show: 'Suspensão (nova)',
  },
  Shock: {
    id: 'newshock',
    caption: 'shock:',
    show: 'Shock (novo)',
  },
  SuspensionKit: {
    id: 'suspakit',
    caption: 'suspensão (kit):',
    show: 'Suspensão (kit)',
  },
  ShockKit: {
    id: 'shockkit',
    caption: 'shock (kit):',
    show: 'Shock (kit)',
  },

  Tires: { id: 'tires', caption: 'Pneus (par):', show: 'Pneus (par)' },
  Fronttire: {
    id: 'fronttire',
    caption: 'pneu[frente]:',
    show: 'Pneu dianteiro',
  },
  Reartire: {
    id: 'reartire',
    caption: 'pneu[traseiro]:',
    show: 'Pneu traseiro',
  },
  Tube: { id: 'tubes', caption: 'Câmaras (par):', show: 'Câmaras (par)' },
  Tubeless: { id: 'tubeless', caption: 'tubeless:', show: 'Selante' },
  FrontTube: {
    id: 'fronttube',
    caption: 'câmara[frente]:',
    show: 'Câmara dianteira',
  },
  RearTube: {
    id: 'reartube',
    caption: 'câmara[traseira]:',
    show: 'Câmara traseira',
  },

  Stem: { id: 'stem', caption: 'mesa:', show: 'Avanço' },
  Handlebar: { id: 'handlebar', caption: 'guidão:', show: 'Guidão' },
  Wheelset: { id: 'wheelset', caption: 'Rodas (par):', show: 'Rodas (par)' },
  FrontWheel: {
    id: 'frontwheel',
    caption: 'roda[frente]:',
    show: 'Roda dianteira',
  },
  RearWheel: {
    id: 'rearwheel',
    caption: 'roda[traseira]:',
    show: 'Roda traseira',
  },

  // Rolamentos — inspeção de calendário (6 meses / 3.000 mi, Park Tool).
  Headset: {
    id: 'headset',
    caption: 'direção:',
    show: 'Rolamento de direção',
  },
  Hubs: { id: 'hubs', caption: 'cubos:', show: 'Rolamento de cubo' },
  // Rolamentos de pivô do quadro (full-suspension) — mesmo grupo de
  // rolamentos de headset/hubs.
  Pivots: { id: 'pivots', caption: 'pivôs:', show: 'Pivôs' },

  Brake: { id: 'brakes', caption: 'Pastilhas (par):', show: 'Pastilhas (par)' },
  FrontBrake: {
    id: 'frontbrake',
    caption: 'pastilha dianteira:',
    show: 'Pastilha dianteira',
  },
  RearBrake: {
    id: 'rearbrake',
    caption: 'pastilha traseira:',
    show: 'Pastilha traseira',
  },

  Disks: { id: 'disks', caption: 'Discos (par):', show: 'Discos (par)' },
  FrontDisk: {
    id: 'frontdisk',
    caption: 'disco[frente]:',
    show: 'Disco dianteiro',
  },
  RearDisk: {
    id: 'reardisk',
    caption: 'disco[traseiro]:',
    show: 'Disco traseiro',
  },

  Calipers: {
    id: 'calipers',
    caption: 'calipers (par):',
    show: 'Calipers (par)',
  },
  FrontCaliper: {
    id: 'frontcaliper',
    caption: 'caliper[frente]:',
    show: 'Caliper dianteiro',
  },
  RearCaliper: {
    id: 'rearcaliper',
    caption: 'caliper[traseiro]:',
    show: 'Caliper traseiro',
  },

  // Ação de manutenção de calendário (DOT 6–12m / mineral 12–24m) — caption
  // deliberadamente SEM a palavra 'freio' (é sinônimo de `brakes` = pastilhas
  // e marcaria as pastilhas junto numa sangria).
  Bleed: { id: 'bleed', caption: 'sangria:', show: 'Sangria de freio' },

  Levers: {
    id: 'levers',
    caption: 'manetes (par):',
    show: 'Manetes (par)',
  },
  LeftLever: {
    id: 'leftlever',
    caption: 'manete[esquerda]:',
    show: 'Manete esquerda',
  },
  RightLever: {
    id: 'rightlever',
    caption: 'manete[direita]:',
    show: 'Manete direita',
  },

  STIs: {
    id: 'stis',
    caption: 'STI (par):',
    show: 'STI (par)',
  },
  LeftSTI: {
    id: 'leftsti',
    caption: 'STI[esquerda]:',
    show: 'STI esquerda',
  },
  RightSTI: {
    id: 'rightsti',
    caption: 'STI[direita]:',
    show: 'STI direita',
  },

  Tape: { id: 'tape', caption: 'fita:', show: 'Fita do guidão' },
  Grip: { id: 'grip', caption: 'manopla:', show: 'Manopla' },
  Dropper: {
    id: 'dropper',
    caption: 'canote:',
    show: 'Canote (retrátil ou não)',
  },
  // Revisão do canote (selos/buchas) — espelho de suspareview/shockreview.
  // Sem sinônimo: 'canote' é do dropper (troca ≠ revisão) e 'review' só
  // registra com token isolado (guard de noteCodes), como os outros *review.
  SeatpostReview: {
    id: 'seatpostreview',
    caption: 'canote (rev.):',
    show: 'Canote (rev.)',
  },
  Saddle: { id: 'saddle', caption: 'selim:', show: 'Selim' },

  Pedal: { id: 'pedal', caption: 'pedal:', show: 'Pedais' },
  Chain: { id: 'chain', caption: 'corrente:', show: 'Corrente' },
  BottomBracket: { id: 'bb', caption: 'central:', show: 'Movimento central' },

  Cassette: { id: 'cassette', caption: 'cassete:', show: 'Cassete' },
  Crankset: { id: 'crankset', caption: 'pedivela:', show: 'Pedivela' },
  PowerMeter: {
    id: 'powermeter',
    caption: 'potenciômetro:',
    show: 'Potenciômetro',
  },
  // id PT ('coroa'): um id 'chainring' casaria com `chain` por substring
  // ('chain' está dentro de 'chainring') e marcaria a corrente junto.
  Chainring: { id: 'coroa', caption: 'coroa:', show: 'Coroa' },
  // id 'guide' (não 'chainguide'): a forma EN conteria 'chain' por
  // substring e marcaria a corrente junto. Sem sinônimo: 'guia' é
  // substring de 'guidão' — a cobertura PT vem da sugestão de código
  // (nearestCode: 'guia' → 'guide').
  Guide: {
    id: 'guide',
    caption: 'guia de corrente:',
    show: 'Guia de corrente',
  },
  FrontDerailleur: {
    id: 'frontderailleur',
    caption: 'câmbio[dianteiro]:',
    show: 'Câmbio dianteiro',
  },
  RearDerailleur: {
    id: 'rearderailleur',
    caption: 'câmbio[traseiro]:',
    show: 'Câmbio traseiro',
  },
  Pulley: {
    id: 'pulley',
    caption: 'roldanas do câmbio',
    show: 'Roldanas do câmbio',
  },
  Shifter: {
    id: 'rearshifter',
    caption: 'shifter[traseiro]:',
    show: 'Trocador traseiro',
  },
  // id EN 'cables' (não 'shiftercables' — continha 'shifter', sinônimo de
  // rearshifter, e registraria o trocador junto).
  Cables: {
    id: 'cables',
    caption: 'cabos:',
    show: 'Cabos de câmbio',
  },

  // Luz em par + frente/trás — espelho de brakes/tires: o par é um id só
  // ('lights') e os singles usam [frente]/[traseira]. Colisão verificada:
  // 'frontlight'/'rearlight' NÃO contêm 'lights' (sem o 's'), então marcar
  // um lado não registra o par — e nenhum termo do vocabulário prévio
  // contém o fragmento 'light'.
  // 'luz' (3 letras) fica de fora dos sinônimos pela regra D14 de ≥4;
  // 'luzes' cobre o par (forma do caption).
  Lights: { id: 'lights', caption: 'Luzes (par):', show: 'Luzes (par)' },
  FrontLight: {
    id: 'frontlight',
    caption: 'luz[frente]:',
    show: 'Luz dianteira',
  },
  RearLight: {
    id: 'rearlight',
    caption: 'luz[traseira]:',
    show: 'Luz traseira',
  },
  // Sinônimo hifenizado de propósito: normalizeNote preserva o hífen, então
  // a forma do caption ('e-bike') não casa sozinha com o id ('ebike').
  // 'e-bike' não colide com nenhum termo existente (não há hífens no
  // vocabulário) e 'bike' não é termo de equipamento.
  EBike: { id: 'ebike', caption: 'e-bike:', show: 'E-bike' },

  Helmet: {
    id: 'helmet',
    caption: 'capacete:',
    show: 'Capacete',
  },
  Shoes: {
    id: 'shoes',
    caption: 'sapatilha:',
    show: 'Sapatilha',
  },
  Freehub: {
    id: 'freehub',
    caption: 'freehub:',
    show: 'Freehub',
  },
};

// Ordem de exibição alfabética pelo nome mostrado na tela (show), com locale
// pt-BR para tratar acentos e caixa. Uso: modal "Componentes"
// (ComponentInfo.tsx). Não mexe no objeto Equipments — noteCodes.ts e
// statistics.ts seguem com a ordem de declaração.
export const orderedEquipments: Equipment[] = Object.values(Equipments)
  .slice()
  .sort((a, b) => a.show.localeCompare(b.show, 'pt-BR'));

const equipmentsById: ReadonlyMap<string, Equipment> = new Map(
  Object.values(Equipments).map((equipment) => [equipment.id, equipment]),
);

/**
 * Rótulo atual (caption) de um equipment, resolvido em tempo de render.
 *
 * O cache do dashboard (Redis/localStorage) guarda uma cópia do `caption`
 * feita no momento do recompute — um rename de rótulo só chegava à tela
 * quando as estatísticas eram reprocessadas (ou seja: o card antigo ficava
 * visível até alguém tocar numa nota de atividade). Resolvendo pelo `id`
 * aqui, a renomeação vale no primeiro render, sem esperar o recompute.
 *
 * Preferência: catálogo vigente → caption gravado no cache (id fora do
 * catálogo, dados legados) → o próprio id (último recurso).
 */
export function resolveCaption(equipment: {
  id: string;
  caption?: string;
}): string {
  return (
    equipmentsById.get(equipment.id)?.caption ??
    equipment.caption ??
    equipment.id
  );
}

// D14 — sinônimos PT das legendas (caption/show) para o matching tolerante.
// Formas BRUTAS: a normalização (minúsculas + sem acentos) acontece no
// src/services/noteCodes.ts. Termos de UMA palavra só e ≥4 letras nos
// sinônimos — o matching é por substring e um termo curto transbordaria
// (ex.: 'sti' casaria dentro de 'distrito'). Deliberadamente sem sinônimo:
// newshock ('shock' casaria com shockreview/shockkit e registraria um shock
// novo a partir de uma revisão) e os ids com [colchetes] (fronttire etc. —
// o termo do par registra o par, comportamento decidido para 'pneu[frente]').
// Cobertura que faltar entra aqui depois, sob evidência.
// Lote 2026-11 (pesquisa de mercado) — também sem sinônimo, por colisão de
// substring: `coroa` ('chainring' conteria 'chain' e registraria a corrente)
// e `frontderailleur` ('câmbio' casaria com rearderailleur; 'dianteiro' com
// 'pneu dianteiro'). Registro desses dois = copiar o código da tabela.
// Tiers 2 e 3 (mesma pesquisa, 8 itens) — mesmas regras: ids escolhidos
// sem colisão verificada nos dois sentidos (novo ⊂ existente e existente ⊂
// novo, sobre as 91 formas normalizadas do vocabulário); exceção documentada
// é só o guard de token isolado de `review` (seatpostreview, como
// suspareview/shockreview). Análise completa por item nas entradas.
export const EquipmentSynonyms: Record<string, string[]> = {
  lub: ['lubrificação'],
  review: ['revisão'],
  clean: ['lavagem'],
  suspension: ['suspensão'],
  tires: ['pneu'],
  tubes: ['câmara'],
  tubeless: ['selante'],
  stem: ['mesa'],
  handlebar: ['guidão'],
  wheelset: ['rodas'],
  headset: ['direção'],
  hubs: ['cubo'],
  // 'pastilha' (singular) casa 'pastilhas'/'pastilha' — cobre o rótulo novo
  // dos cards; 'freio' mantido pra nota antiga/legacy.
  brakes: ['freio', 'pastilha'],
  bleed: ['sangria'],
  disks: ['disco'],
  calipers: ['caliper'],
  levers: ['manete'],
  tape: ['fita'],
  grip: ['manopla'],
  dropper: ['canote'],
  saddle: ['selim'],
  pedal: ['pedais'],
  chain: ['corrente'],
  bb: ['central'],
  cassette: ['cassete'],
  crankset: ['pedivela'],
  cables: ['cabos', 'cable'],
  rearderailleur: ['câmbio'],
  rearshifter: ['shifter'],
  helmet: ['capacete'],
  shoes: ['sapatilha'],
  pulley: ['roldana'],
  // Tiers 2 e 3 (pesquisa de mercado):
  // 'pivô'/'pivôs' — pt; 'potenciômetro' — a forma do caption copiada p/
  // a nota; 'luzes' — cobre o par de luzes (forma do caption; 'luz' fica
  // de fora pela regra de ≥4); 'e-bike' — forma do caption com hífen
  // (ver comentário na entrada).
  // Sem sinônimo: `seatpostreview` ('canote' é do dropper — troca ≠ revisão),
  // `guide` ('guia' ⊂ 'guidão' — casaria com o guidão na direção errada) e
  // os singles de luz ('[frente]'/'[traseira]' são de caption; o código é o
  // id — espelho de fronttire/rearbrake, que também não têm).
  pivots: ['pivô'],
  powermeter: ['potenciômetro'],
  lights: ['luzes'],
  ebike: ['e-bike'],
};
