export const Equipments = {
  Lubrification: { id: 'lub', caption: 'lubrificada a:', show: 'Lubrificação' },
  Review: { id: 'review', caption: 'revisada a:', show: 'Revisão' },
  Clean: { id: 'clean', caption: 'lavada a:', show: 'Lavagem' },

  SuspensionReview: {
    id: 'suspareview',
    caption: 'suspa revisada a:',
    show: 'Revisão da suspa',
  },
  ShockReview: {
    id: 'shockreview',
    caption: 'shock revisado a:',
    show: 'Revisão do shock',
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
    id: 'suspensionkit',
    caption: 'kit de suspensão:',
    show: 'Kit de Suspensão',
  },
  ShockKit: {
    id: 'shockkit',
    caption: 'kit de shock:',
    show: 'Kit de Shock',
  },

  Tires: { id: 'tires', caption: 'par de pneus:', show: 'Par de pneus' },
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
  Tube: { id: 'tubes', caption: 'par de câmaras:', show: 'Par de câmaras' },
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
  Wheelset: { id: 'wheelset', caption: 'par de rodas:', show: 'Par de rodas' },
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

  Break: { id: 'breaks', caption: 'par de freios:', show: 'Par de freios' },
  FrontBreak: {
    id: 'frontbreak',
    caption: 'freio[frente]:',
    show: 'Freio dianteiro',
  },
  RearBreak: {
    id: 'rearbreak',
    caption: 'freio[traseiro]:',
    show: 'Freio traseiro',
  },

  Disks: { id: 'disks', caption: 'par de discos:', show: 'Par de discos' },
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
    caption: 'par de caliper:',
    show: 'Par de calipers',
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

  Levers: {
    id: 'levers',
    caption: 'par de manetes:',
    show: 'Par de manetes',
  },
  LeftLever: {
    id: 'leftlever',
    caption: 'manete[esquerda]:',
    show: 'Manete esquerda',
  },
  RightLever: {
    id: 'rightlever',
    caption: 'Manete[direita]:',
    show: 'Manete direita',
  },

  STIs: {
    id: 'stis',
    caption: 'par de STI:',
    show: 'Par de STI',
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
  Saddle: { id: 'saddle', caption: 'selim:', show: 'Selim' },

  Pedal: { id: 'pedal', caption: 'pedal:', show: 'Pedais' },
  Chain: { id: 'chain', caption: 'corrente:', show: 'Corrente' },
  BottomBracket: { id: 'bb', caption: 'central:', show: 'Movimento central' },

  Cassette: { id: 'cassette', caption: 'cassete:', show: 'Cassete' },
  Crankset: { id: 'crankset', caption: 'pedivela:', show: 'Pedivela' },
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
};

export type Equipment = {
  id: string;
  caption: string;
  show: string;
  distance?: number;
  movingTime?: number;
  date?: string;
  isRegistered?: boolean;
};
