export const RBE_PHRASES = [
  'Le 920 est prêt, mais personne ne sait où sont les clés.',
  'Après expertise, il apparaît que le problème venait effectivement du bus.',
  'Le véhicule est immobilisé jusqu’à nouvel ordre.',
  'Quelqu’un a vu le responsable du dépôt ?',
  'Ça devait prendre cinq minutes.',
] as const;

const RBE_BUSES = [
  { model: 'Mercedes-Benz Citaro 1', parc: '920', engine: 'OM906hLA', status: '🟢 Ça roule.', delay: '+7 minutes', reason: 'On ne sait pas.' },
  { model: 'Mercedes-Benz O 405 N', parc: 'RBE-405', engine: 'OM447h', status: '🟡 Sous surveillance.', delay: '+3 minutes', reason: 'Le dépôt est loin.' },
  { model: 'Renault Agora S', parc: 'RBE-AGORA', engine: 'MIDR 06.20.45', status: '🟢 Prêt au départ.', delay: 'À l’heure', reason: 'Fait exceptionnel.' },
] as const;

const RBE_BREAKDOWNS = [
  { fault: 'Inconnu', diagnosis: 'Bah... faut regarder.', confidence: '12 %' },
  { fault: 'Voyant qui voulait participer', diagnosis: 'Un diagnostic s’impose. Ou un café.', confidence: '34 %' },
  { fault: 'Bruit non contractuel', diagnosis: 'C’est probablement normal. Probablement.', confidence: '48 %' },
] as const;

const RBE_DESTINIES = [
  'Tu vas monter dans un bus qui n’est pas le bon. Bonne chance.',
  'Tu vas trouver les clés du 920. Puis oublier où tu les as posées.',
  'Un véhicule sera prêt à l’heure. Personne ne saura pourquoi.',
  'Tu vas entendre « ça devait prendre cinq minutes » aujourd’hui.',
] as const;

const RBE_DRAWS = [
  'Le 920 part en premier. C’est une décision totalement objective.',
  'Le prochain café est offert par la personne qui a oublié les clés.',
  'Le véhicule gagnant est celui qui démarre du premier coup.',
  'Le dépôt gagne une minute de tranquillité. Profitez-en.',
] as const;

const RBE_DIAGNOSTICS: Record<string, readonly string[]> = {
  bruit: ['Une fixation, un raccord ou un élément qui souhaite se faire entendre.', 'Conseil RBE : écouter, localiser, puis demander à quelqu’un d’autre d’écouter.'],
  fumee: ['Possiblement une combustion qui prend ses aises.', 'Conclusion : ne pas présenter ce résultat comme un diagnostic mécanique.'],
  fuite: ['Un fluide a décidé de poursuivre sa carrière ailleurs.', 'Conclusion : il faut localiser la fuite avant toute réparation.'],
  voyant: ['Le tableau de bord souhaite manifestement communiquer.', 'Conclusion : lire le code défaut avec l’outil adapté.'],
  pertepuissance: ['Le moteur semble prendre une journée plus calme.', 'Conclusion : contrôle professionnel recommandé.'],
};

export function pickRandom<T>(items: readonly T[], random = Math.random): T {
  return items[Math.floor(random() * items.length)]!;
}

export function formatPhrase(random = Math.random): string {
  return `🚌 **PHRASE RBE**\n\n« ${pickRandom(RBE_PHRASES, random)} »`;
}

export function formatBus(random = Math.random): string {
  const bus = pickRandom(RBE_BUSES, random);
  return `🚌 **BUS TIRÉ AU SORT**\n\n**${bus.model}**\nParc : ${bus.parc}\nMotorisation : ${bus.engine}\n\nÉtat : ${bus.status}\nRetard : ${bus.delay}\nMotif : ${bus.reason}`;
}

export function formatBreakdown(random = Math.random): string {
  const breakdown = pickRandom(RBE_BREAKDOWNS, random);
  return `⚠️ **PANNE DÉTECTÉE**\n\nVéhicule : Citaro 920\nDéfaut : ${breakdown.fault}\nDiagnostic : « ${breakdown.diagnosis} »\nNiveau de confiance : ${breakdown.confidence}`;
}

export function formatDestiny(random = Math.random): string {
  return `🔮 **LE DESTIN RBE**\n\nAujourd’hui :\n${pickRandom(RBE_DESTINIES, random)}`;
}

export function formatControl(random = Math.random): string {
  const scores = [
    { motivation: '84 %', patience: '4 %', knowledge: '97 %', punctuality: '21 %', verdict: '⚠️ CONTRE-VISITE OBLIGATOIRE' },
    { motivation: '61 %', patience: '78 %', knowledge: '83 %', punctuality: '64 %', verdict: '✅ VALIDÉ POUR UN NOUVEAU TOUR DE SERVICE' },
  ] as const;
  const score = pickRandom(scores, random);
  return `🔍 **CONTRÔLE TECHNIQUE RBE**\n\nMotivation : ${score.motivation}\nPatience : ${score.patience}\nConnaissance bus : ${score.knowledge}\nPonctualité : ${score.punctuality}\n\nAvis :\n${score.verdict}`;
}

export function formatDiagnostic(symptom: string, random = Math.random): string {
  const details = RBE_DIAGNOSTICS[symptom] ?? RBE_DIAGNOSTICS.voyant;
  return `🔧 **DIAGNOSTIC RBE — HUMORISTIQUE**\n\nSymptôme : ${symptom}\n\nCauses possibles :\n• ${details[0]}\n• ${details[1]}\n\nConclusion :\n👉 ${pickRandom(['Faut regarder.', 'Faire contrôler le véhicule par un professionnel.', 'Ne pas démonter au hasard.'], random)}`;
}

export function formatDraw(random = Math.random): string {
  return `🎰 **TIRAGE RBE**\n\n${pickRandom(RBE_DRAWS, random)}`;
}