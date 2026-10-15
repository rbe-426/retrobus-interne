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
  'Le planning est prévisionnel, surtout pour les prévisions.',
  'Le dépôt confirme que tout est sous contrôle. Le contrôle cherche encore le dépôt.',
  'La clé était dans la poche. La bonne poche reste à déterminer.',
  'Le bus a entendu le réveil. Il a choisi de ne pas répondre.',
  'Le prochain départ est imminent depuis maintenant vingt minutes.',
  'Tout est prêt pour le départ, sauf ce qui sert au départ.',
  'Le rétroviseur voit derrière. Le planning, lui, regarde ailleurs.',
  'Un bruit a été identifié : c’est le bruit que personne n’a encore identifié.',
  'La ligne fonctionne normalement selon une définition très personnelle de normalement.',
  'Le café est chaud, le bus aussi. On surveille les deux.',
] as const;

const RBE_BUSES = [
  { model: 'Mercedes-Benz Citaro 1', parc: '920', engine: 'OM906hLA', status: '🟢 Ça roule.', delay: '+7 minutes', reason: 'On ne sait pas.' },
  { model: 'Mercedes-Benz O 405 N', parc: 'RBE-405', engine: 'OM447h', status: '🟡 Sous surveillance.', delay: '+3 minutes', reason: 'Le dépôt est loin.' },
  { model: 'Renault Agora S', parc: 'RBE-AGORA', engine: 'MIDR 06.20.45', status: '🟢 Prêt au départ.', delay: 'À l’heure', reason: 'Fait exceptionnel.' },
  { model: 'Heuliez GX 317', parc: 'RBE-317', engine: 'Renault MIDR', status: '🟡 En observation.', delay: '+5 minutes', reason: 'Une vérification de routine qui a rencontré une autre vérification.' },
  { model: 'Irisbus Citelis', parc: 'RBE-CIT', engine: 'Cursor 8', status: '🟢 Opérationnel.', delay: '+2 minutes', reason: 'Le café a été servi à l’heure.' },
  { model: 'Setra S 315', parc: 'RBE-315', engine: 'OM457', status: '🟠 Échauffement en cours.', delay: '+11 minutes', reason: 'Le véhicule voulait profiter du paysage.' },
  { model: 'Renault PR 100', parc: 'RBE-PR', engine: 'MIDR', status: '🟢 Prêt à partir.', delay: 'Horaire historique', reason: 'Il connaît le trajet par cœur.' },
  { model: 'Mercedes-Benz O 405', parc: 'RBE-405', engine: 'OM447', status: '🟡 À confirmer.', delay: '+4 minutes', reason: 'Le tableau de bord a demandé une seconde opinion.' },
  { model: 'Iveco Urbanway', parc: 'RBE-URB', engine: 'Cursor 9', status: '🟢 Service assuré.', delay: '+1 minute', reason: 'Personne n’a prononcé le mot panne.' },
  { model: 'Van Hool A300', parc: 'RBE-A300', engine: 'DAF', status: '🟠 En discussion.', delay: '+8 minutes', reason: 'Le bus et le planning ne sont pas encore d’accord.' },
] as const;

const RBE_BREAKDOWNS = [
  { fault: 'Inconnu', diagnosis: 'Bah... faut regarder.', confidence: '12 %' },
  { fault: 'Voyant qui voulait participer', diagnosis: 'Un diagnostic s’impose. Ou un café.', confidence: '34 %' },
  { fault: 'Bruit non contractuel', diagnosis: 'C’est probablement normal. Probablement.', confidence: '48 %' },
  { fault: 'Clignotant philosophe', diagnosis: 'Il indique une direction, mais laquelle reste un débat.', confidence: '27 %' },
  { fault: 'Portière susceptible', diagnosis: 'Elle ne s’ouvre qu’après une demande formulée avec diplomatie.', confidence: '63 %' },
  { fault: 'Retard préventif', diagnosis: 'Le véhicule prend de l’avance sur son prochain retard.', confidence: '91 %' },
  { fault: 'Siège en réunion', diagnosis: 'Il grince pour faire entendre son point de vue.', confidence: '38 %' },
  { fault: 'Essuie-glace nostalgique', diagnosis: 'Il fonctionne surtout quand il se rappelle pourquoi il est là.', confidence: '52 %' },
  { fault: 'Klaxon timide', diagnosis: 'Il préfère envoyer un courrier plutôt que se manifester.', confidence: '29 %' },
  { fault: 'Compteur optimiste', diagnosis: 'Il affiche une vitesse à laquelle le bus réfléchit encore.', confidence: '44 %' },
  { fault: 'Porte en télétravail', diagnosis: 'Elle est techniquement présente, mais pas disponible.', confidence: '71 %' },
  { fault: 'Rétroviseur observateur', diagnosis: 'Il a tout vu, mais refuse de témoigner sans café.', confidence: '66 %' },
  { fault: 'Planning en avance', diagnosis: 'Le départ est prévu avant que le véhicule soit arrivé.', confidence: '19 %' },
  { fault: 'Batterie en pause', diagnosis: 'Elle recharge ses idées avant de relancer le moteur.', confidence: '57 %' },
  { fault: 'Voyant saisonnier', diagnosis: 'Il ne s’allume qu’en présence d’un mécanicien.', confidence: '83 %' },
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
  'Tu vas retrouver une pièce dont personne ne se souvenait avoir perdu.',
  'Le bus arrivera juste après le message « il est où ? ».',
  'Un outil va changer de caisse sans prévenir son équipe.',
  'Le prochain contrôle révélera une anomalie parfaitement bien cachée.',
  'La météo sera idéale pour tester les essuie-glaces.',
  'Tu vas entendre « c’est juste un petit réglage » avant une longue réunion.',
  'Le trajet sera calme. Le groupe de discussion, beaucoup moins.',
  'Une solution simple va apparaître après la troisième solution compliquée.',
] as const;

const RBE_DRAWS = [
  'Le 920 part en premier. C’est une décision totalement objective.',
  'Le prochain café est offert par la personne qui a oublié les clés.',
  'Le véhicule gagnant est celui qui démarre du premier coup.',
  'Le dépôt gagne une minute de tranquillité. Profitez-en.',
  'Le tirage recommande une pause café, validée par une commission imaginaire.',
  'Carte bonus : le véhicule démarre avant que quelqu’un dise « essaye encore ».',
  'La chance sourit au dépôt. Elle a juste oublié les clés.',
  'Un départ sans discussion est prévu. Sous réserve de discussion.',
  'Le prochain imprévu a été déplacé à une date ultérieure non précisée.',
  'Récompense : cinq minutes de calme, non cumulables avec le groupe WhatsApp.',
  'Le planning annonce une journée normale. Le planning est très courageux.',
  'Le bus valide ce tirage, sous réserve de démarrer.',
] as const;

export type CardRarity = 'COMMUN' | 'RARE' | 'EPIQUE' | 'LEGENDAIRE' | 'MYTHIQUE';

export interface RBECollectibleCard {
  id: string;
  name: string;
  rarity: CardRarity;
  description: string;
}

export const CARD_RARITIES: Record<CardRarity, { label: string; chance: number; icon: string }> = {
  COMMUN: { label: 'Commun', chance: 60, icon: '⚪' },
  RARE: { label: 'Rare', chance: 25, icon: '🔵' },
  EPIQUE: { label: 'Épique', chance: 10, icon: '🟣' },
  LEGENDAIRE: { label: 'Légendaire', chance: 4, icon: '🟠' },
  MYTHIQUE: { label: 'Mythique', chance: 1, icon: '🌟' },
};

export const RBE_CARD_CATALOG: readonly RBECollectibleCard[] = [
  { id: 'citaro-920', name: 'Le Citaro 920', rarity: 'COMMUN', description: 'Le véhicule qui porte le numéro du bot avec une fierté mesurée.' },
  { id: 'cle-depot', name: 'La clé du dépôt', rarity: 'COMMUN', description: 'Elle ouvre probablement quelque chose. On cherche encore quoi.' },
  { id: 'cafe-conducteur', name: 'Le café du conducteur', rarity: 'COMMUN', description: 'Niveau de carburant humain : rétabli.' },
  { id: 'ticket-imaginaire', name: 'Le ticket imaginaire', rarity: 'COMMUN', description: 'Valable sur une ligne qui n’existe que dans le planning.' },
  { id: 'gilet-fluo', name: 'Le gilet haute visibilité', rarity: 'COMMUN', description: 'Visible de tous, sauf de la personne qui le cherche.' },
  { id: 'plan-depot', name: 'Le plan du dépôt', rarity: 'COMMUN', description: 'Indique où chercher les clés, sauf quand le plan a été déplacé.' },
  { id: 'bouchon-air', name: 'Le bouchon d’air', rarity: 'COMMUN', description: 'Petit, indispensable, et toujours absent au mauvais moment.' },
  { id: 'balai-essuie-glace', name: 'Le balai d’essuie-glace', rarity: 'COMMUN', description: 'Prêt à travailler dès la première goutte.' },
  { id: 'marteau-controle', name: 'Le marteau du contrôle', rarity: 'COMMUN', description: 'A déjà entendu tous les bruits du parc.' },
  { id: 'gourde-atelier', name: 'La gourde de l’atelier', rarity: 'COMMUN', description: 'Retrouvée à côté d’un outil qui n’était pas à elle.' },
  { id: 'gants-mecanique', name: 'Les gants de mécanique', rarity: 'COMMUN', description: 'Propres au début de la journée. C’est déjà ça.' },
  { id: 'planning-crayon', name: 'Le planning au crayon', rarity: 'COMMUN', description: 'Prévisionnel, modifiable et légèrement optimiste.' },
  { id: 'badge-depot', name: 'Le badge du dépôt', rarity: 'COMMUN', description: 'Fonctionne toujours mieux quand quelqu’un regarde.' },
  { id: 'cle-plate', name: 'La clé plate', rarity: 'COMMUN', description: 'La bonne taille existe. Elle est probablement dans l’autre caisse.' },
  { id: 'lampe-atelier', name: 'La lampe d’atelier', rarity: 'COMMUN', description: 'Éclaire tout, sauf l’endroit où la panne se cache.' },
  { id: 'fiche-horaire', name: 'La fiche horaire', rarity: 'RARE', description: 'À jour depuis au moins quelques minutes.' },
  { id: 'outil-range', name: 'L’outil bien rangé', rarity: 'RARE', description: 'Retrouvé exactement là où il avait été posé.' },
  { id: 'panneau-arret', name: 'Le panneau d’arrêt', rarity: 'RARE', description: 'Il indique un arrêt. Pour le départ, voir le prochain épisode.' },
  { id: 'clef-dynamometrique', name: 'La clé dynamométrique', rarity: 'RARE', description: 'Réglée au bon couple et remise dans sa boîte.' },
  { id: 'registre-entretien', name: 'Le registre d’entretien', rarity: 'RARE', description: 'Une ligne vient d’être ajoutée sans tache de café.' },
  { id: 'radio-atelier', name: 'La radio de l’atelier', rarity: 'RARE', description: 'Capte trois stations et toutes les nouvelles du dépôt.' },
  { id: 'retroviseur-neuf', name: 'Le rétroviseur réglé', rarity: 'RARE', description: 'Tout est visible, y compris le collègue qui cherchait la clé.' },
  { id: 'ticket-valide', name: 'Le ticket parfaitement composté', rarity: 'RARE', description: 'Un bip net. Tout le monde l’a entendu.' },
  { id: 'caisse-identifiee', name: 'La caisse à outils étiquetée', rarity: 'RARE', description: 'Chaque outil a une place. Une photo en témoigne.' },
  { id: 'itineraire-lisible', name: 'L’itinéraire sans détour', rarity: 'RARE', description: 'Le trajet prévu et le trajet suivi sont identiques.' },
  { id: 'essuie-glace-synchronise', name: 'Les essuie-glaces synchronisés', rarity: 'RARE', description: 'Ils vont au même rythme et sont d’accord sur le sens.' },
  { id: 'radio-depot-claire', name: 'Le message radio compris du premier coup', rarity: 'RARE', description: 'Confirmation reçue, sans demande de répétition.' },
  { id: 'gx317', name: 'Le GX 317', rarity: 'RARE', description: 'Un classique du parc, fidèle à sa feuille de route.' },
  { id: 'citaro-premier-coup', name: 'Le démarrage immédiat', rarity: 'EPIQUE', description: 'Le moteur a démarré avant la fin du premier café.' },
  { id: 'diagnostic-clair', name: 'Le diagnostic limpide', rarity: 'EPIQUE', description: 'La panne a un nom, une cause et une fiche. Incroyable.' },
  { id: 'depart-sans-retard', name: 'Le départ sans retard', rarity: 'EPIQUE', description: 'Le bus, l’équipage et l’horaire étaient prêts ensemble.' },
  { id: 'caisse-complete', name: 'La caisse complète', rarity: 'EPIQUE', description: 'Aucun outil manquant après une intervention.' },
  { id: 'voyant-eteint', name: 'Le voyant éteint', rarity: 'EPIQUE', description: 'Éteint pour la bonne raison, diagnostic à l’appui.' },
  { id: 'planning-respecte', name: 'Le planning respecté', rarity: 'EPIQUE', description: 'La réalité a suivi le document sans négociation.' },
  { id: 'bus-propre', name: 'Le bus impeccable', rarity: 'EPIQUE', description: 'Propre dedans, dehors, et même sur la photo.' },
  { id: 'cle-retrouvee', name: 'La clé retrouvée', rarity: 'EPIQUE', description: 'Retrouvée avant d’avoir commandé son double.' },
  { id: 'controle-sans-remarque', name: 'Le contrôle sans remarque', rarity: 'EPIQUE', description: 'Le rapport est terminé avant que le café refroidisse.' },
  { id: 'voyage-sans-incident', name: 'Le voyage sans incident', rarity: 'EPIQUE', description: 'Départ, trajet et retour sans événement imprévu.' },
  { id: 'cle-du-bon-bus', name: 'La bonne clé du premier coup', rarity: 'LEGENDAIRE', description: 'Une relique recherchée depuis des générations de conducteurs.' },
  { id: 'depart-a-heure', name: 'Le départ à l’heure', rarity: 'LEGENDAIRE', description: 'Tout était prêt au même moment. Les témoins sont encore émus.' },
  { id: 'arrivee-en-avance', name: 'L’arrivée en avance', rarity: 'LEGENDAIRE', description: 'Le véhicule est arrivé avant l’heure, sans brûler d’étape.' },
  { id: 'panne-resolue', name: 'La panne résolue au premier diagnostic', rarity: 'LEGENDAIRE', description: 'La cause était bien celle annoncée par le premier outil.' },
  { id: 'tournee-parfaite', name: 'La tournée parfaite', rarity: 'LEGENDAIRE', description: 'Tous les arrêts, aucun détour, et le planning validé.' },
  { id: 'dernier-outil', name: 'Le dernier outil retrouvé', rarity: 'LEGENDAIRE', description: 'Il était dans la caisse prévue. Le registre avait raison.' },
  { id: 'depot-synchronise', name: 'Le dépôt parfaitement synchronisé', rarity: 'LEGENDAIRE', description: 'Tout le monde savait où aller et avec quelle clé.' },
  { id: 'jour-sans-imprevu', name: 'La journée sans imprévu', rarity: 'MYTHIQUE', description: 'Le dépôt a connu une journée parfaitement calme. Une fois.' },
  { id: 'bus-et-cles-prets', name: 'Bus et clés prêts en même temps', rarity: 'MYTHIQUE', description: 'Une rencontre rarissime entre le bon véhicule et la bonne clé.' },
  { id: 'planning-inchange', name: 'Le planning inchangé', rarity: 'MYTHIQUE', description: 'La journée entière s’est déroulée comme prévu.' },
  { id: 'cafe-sans-refroidir', name: 'Le café chaud jusqu’à la dernière gorgée', rarity: 'MYTHIQUE', description: 'Aucune urgence, aucun appel radio, juste le café.' },
  { id: 'mecanique-sans-surprise', name: 'La mécanique sans surprise', rarity: 'MYTHIQUE', description: 'Le capot s’est refermé et aucun outil n’est resté dedans.' },
];

export function drawCollectibleCard(random = Math.random, excludedIds: readonly string[] = []): RBECollectibleCard {
  const excluded = new Set(excludedIds);
  const available = (Object.entries(CARD_RARITIES) as Array<[CardRarity, (typeof CARD_RARITIES)[CardRarity]]>)
    .map(([rarity, definition]) => ({ rarity, chance: definition.chance, cards: RBE_CARD_CATALOG.filter((card) => card.rarity === rarity && !excluded.has(card.id)) }))
    .filter((entry) => entry.cards.length > 0);
  const availableChance = available.reduce((total, entry) => total + entry.chance, 0);
  if (!availableChance) throw new Error('The member already owns every RBE card');

  let roll = Math.max(0, Math.min(0.999_999, random())) * availableChance;
  const selected = available.find((entry) => {
    roll -= entry.chance;
    return roll < 0;
  }) ?? available[available.length - 1];
  return pickRandom(selected.cards, random);
}

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
    { motivation: '88 %', patience: '73 %', knowledge: '44 %', punctuality: '82 %', verdict: '✅ VALIDÉ, LE MANUEL RESTE À PORTÉE DE MAIN' },
    { motivation: '29 %', patience: '96 %', knowledge: '91 %', punctuality: '47 %', verdict: '⚠️ CONTRE-VISITE APRÈS LE PROCHAIN CAFÉ' },
    { motivation: '67 %', patience: '32 %', knowledge: '86 %', punctuality: '93 %', verdict: '✅ APTE, MAIS LE PLANNING DOIT SUIVRE' },
    { motivation: '99 %', patience: '81 %', knowledge: '58 %', punctuality: '72 %', verdict: '✅ VALIDÉ PAR LE COLLÈGUE QUI A LES CLÉS' },
    { motivation: '43 %', patience: '88 %', knowledge: '95 %', punctuality: '39 %', verdict: '⚠️ RÉSULTAT POSITIF, HORAIRES À REVOIR' },
    { motivation: '72 %', patience: '69 %', knowledge: '77 %', punctuality: '88 %', verdict: '✅ PRÊT POUR LE SERVICE, SOUS SURVEILLANCE DU CAFÉ' },
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
  return formatCollectibleCard(drawCollectibleCard(random), pickRandom(RBE_DRAWS, random));
}

export function formatCollectibleCard(card: RBECollectibleCard, flavor = pickRandom(RBE_DRAWS)): string {
  const rarity = CARD_RARITIES[card.rarity];
  return `🎴 **NOUVELLE CARTE RBE**\n\n${rarity.icon} **${card.name}** · ${rarity.label} (${rarity.chance} %)\n${card.description}\n\n${flavor}`;
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
    '`/920 collection [membre]` · Pokédex et raretés obtenues',
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