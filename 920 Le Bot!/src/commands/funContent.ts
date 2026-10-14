export const RBE_PHRASES = [
  'Le 920 est prêt, mais personne ne sait où sont les clés.',
  'Après expertise, il apparaît que le problème venait effectivement du bus.',
  'Le véhicule est immobilisé jusqu’à nouvel ordre.',
  'Quelqu’un a vu le responsable du dépôt ?',
  'Ça devait prendre cinq minutes.',
  'Le bus est à l’heure. Le tableau horaire n’a simplement pas reçu l’information.',
  'Au dépôt, chaque clé a une serrure préférée. Aucune ne nous l’a communiquée.',
  'Le 920 ne tombe jamais en panne : il improvise un arrêt technique.',
  'La ligne est fluide, sauf aux endroits où elle ne l’est pas.',
  'Le conducteur est prêt. Le bus négocie encore.',
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
  { fault: 'Clignotant philosophe', diagnosis: 'Il indique une direction, mais laquelle reste un débat.', confidence: '27 %' },
  { fault: 'Portière susceptible', diagnosis: 'Elle ne s’ouvre qu’après une demande formulée avec diplomatie.', confidence: '63 %' },
  { fault: 'Retard préventif', diagnosis: 'Le véhicule prend de l’avance sur son prochain retard.', confidence: '91 %' },
  { fault: 'Siège en réunion', diagnosis: 'Il grince pour faire entendre son point de vue.', confidence: '38 %' },
] as const;

const RBE_DESTINIES = [
  'Tu vas monter dans un bus qui n’est pas le bon. Bonne chance.',
  'Tu vas trouver les clés du 920. Puis oublier où tu les as posées.',
  'Un véhicule sera prêt à l’heure. Personne ne saura pourquoi.',
  'Tu vas entendre « ça devait prendre cinq minutes » aujourd’hui.',
  'Une clé va apparaître juste après que tu en auras commandé une nouvelle.',
  'Le prochain bus sera le bon. Le bon sens de circulation, c’est une autre question.',
  'Quelqu’un dira « il fait un bruit depuis hier » sans préciser lequel.',
  'Une journée sans imprévu est possible. Pas aujourd’hui, mais possible.',
] as const;

const RBE_DRAWS = [
  'Le 920 part en premier. C’est une décision totalement objective.',
  'Le prochain café est offert par la personne qui a oublié les clés.',
  'Le véhicule gagnant est celui qui démarre du premier coup.',
  'Le dépôt gagne une minute de tranquillité. Profitez-en.',
] as const;

const RARITIES = [
  { name: 'Commun', chance: 60, color: '⚪', rewards: ['Un ticket de bus imaginaire', 'Une clé presque identifiée', 'Un café de dépôt'] },
  { name: 'Rare', chance: 25, color: '🔵', rewards: ['Un bus prêt du premier coup', 'Une fiche horaire à jour', 'Un outil rangé à sa place'] },
  { name: 'Épique', chance: 10, color: '🟣', rewards: ['Un départ parfaitement à l’heure', 'La bonne clé du premier essai', 'Un diagnostic sans « faut regarder »'] },
  { name: 'Légendaire', chance: 4, color: '🟠', rewards: ['Une journée sans imprévu', 'Un véhicule qui démarre avant le café'] },
  { name: 'Mythique', chance: 1, color: '🌟', rewards: ['Le bus et les clés sont prêts en même temps'] },
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
    { motivation: '93 %', patience: '42 %', knowledge: '88 %', punctuality: '51 %', verdict: '✅ VALIDÉ, SOUS RÉSERVE DE RETROUVER LES CLÉS' },
    { motivation: '38 %', patience: '91 %', knowledge: '72 %', punctuality: '86 %', verdict: '⚠️ CONTRE-VISITE APRÈS UNE PAUSE CAFÉ' },
    { motivation: '76 %', patience: '67 %', knowledge: '99 %', punctuality: '34 %', verdict: '✅ APTE, MAIS LE BUS A DES QUESTIONS' },
    { motivation: '55 %', patience: '58 %', knowledge: '63 %', punctuality: '97 %', verdict: '⚠️ VALIDÉ À CONDITION DE PARTIR MAINTENANT' },
  ] as const;
  const score = pickRandom(scores, random);
  return `🔍 **CONTRÔLE TECHNIQUE RBE**\n\nMotivation : ${score.motivation}\nPatience : ${score.patience}\nConnaissance bus : ${score.knowledge}\nPonctualité : ${score.punctuality}\n\nAvis :\n${score.verdict}`;
}

export function formatDiagnostic(symptom: string, random = Math.random): string {
  const details = RBE_DIAGNOSTICS[symptom] ?? RBE_DIAGNOSTICS.voyant;
  const causes = [
    details,
    [details[1], 'Le véhicule a peut-être lu la procédure, mais pas jusqu’au bout.'],
    ['Une pièce demande une pause réglementaire.', details[0]],
    ['Le symptôme est connu du dépôt, mais pas encore de la pièce concernée.', details[1]],
  ];
  return `🔧 **DIAGNOSTIC RBE — HUMORISTIQUE**\n\nSymptôme : ${symptom}\n\nCauses possibles :\n• ${pickRandom(causes, random)[0]}\n• ${pickRandom(causes, random)[1]}\n\nConclusion :\n👉 ${pickRandom(['Faut regarder.', 'Faire contrôler le véhicule par un professionnel.', 'Ne pas démonter au hasard.', 'Noter le symptôme avant qu’il ne change d’avis.', 'Consulter la documentation technique, puis le café.'], random)}`;
}

export function formatDraw(random = Math.random): string {
  let roll = Math.max(0, Math.min(0.999_999, random())) * 100;
  const rarity = RARITIES.find((entry) => {
    roll -= entry.chance;
    return roll < 0;
  }) ?? RARITIES[0];
  const reward = pickRandom(rarity.rewards, random);
  const flavor = pickRandom(RBE_DRAWS, random);
  return `🎰 **TIRAGE RBE**\n\n${rarity.color} Rareté : ${rarity.name} (${rarity.chance} %)\n🎁 ${reward}\n\n${flavor}`;
}

export function formatHelp(): string {
  return [
    '🚌 **920 LE BOT — AIDE DES COMMANDES**',
    '',
    '**RBE**',
    '`/920 phrase` · Une phrase du dépôt',
    '`/920 bus` · Tirage d’un véhicule RBE',
    '`/920 panne` · Panne humoristique',
    '`/920 diagnostic` · Diagnostic humoristique',
    '`/920 destin` · Le destin du jour',
    '`/920 controle` · Contrôle technique humoristique',
    '`/920 tirage` · Récompense à rareté variable',
    '`/920 ecouter [ambiance]` · Suggestion musicale',
    '`/920 anniversaire` · Anniversaires du serveur',
    '',
    '**Utilitaires**',
    '`/920 help` · Afficher cette aide',
    '`/920 about` · À propos du bot',
    '`/920 ping` · Vérifier sa latence',
    '`/920 updatelog` · Nouveautés récentes',
    '',
    '**Modération**',
    '`/920 kick`, `/920 mute`, `/920 unmute`',
    '`/920 ban`, `/920 tempban`, `/920 unban`',
    '',
    'Les commandes de modération restent soumises aux permissions Discord.',
  ].join('\n');
}