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
  { fault: 'Pédale d’embrayage diplomate', diagnosis: 'Elle cherche un compromis entre le bus et le conducteur.', confidence: '46 %' },
  { fault: 'Chauffage à la demande', diagnosis: 'Il s’active uniquement quand quelqu’un a oublié sa veste.', confidence: '58 %' },
  { fault: 'Gyrophare introverti', diagnosis: 'Il clignote en secret, sans prévenir personne.', confidence: '31 %' },
  { fault: 'Girouette indécise', diagnosis: 'Elle affiche une destination différente à chaque démarrage.', confidence: '77 %' },
  { fault: 'Frein à main philosophe', diagnosis: 'Il se demande si l’immobilité est un choix ou une fatalité.', confidence: '41 %' },
  { fault: 'Pneu en grève', diagnosis: 'Il revendique de meilleures conditions de roulage.', confidence: '88 %' },
  { fault: 'Boîte de vitesses lunatique', diagnosis: 'Elle passe les rapports selon l’humeur du jour.', confidence: '54 %' },
  { fault: 'Plafonnier confidentiel', diagnosis: 'Il éclaire uniquement ce qui n’a aucun intérêt.', confidence: '22 %' },
  { fault: 'Tableau de bord théâtral', diagnosis: 'Tous les voyants s’allument pour la mise en scène.', confidence: '69 %' },
  { fault: 'Démarreur en retard', diagnosis: 'Il arrive toujours juste après qu’on a abandonné l’idée de partir.', confidence: '73 %' },
  { fault: 'Circuit d’air rancunier', diagnosis: 'Il se souvient de la dernière fois où on l’a ignoré.', confidence: '36 %' },
  { fault: 'Barre de maintien curieuse', diagnosis: 'Elle se desserre pour voir ce qui se passe en dessous.', confidence: '49 %' },
] as const;

const BREAKDOWN_SEVERITIES = [
  {
    label: '🟢 Bénin',
    actions: ['Ignorer poliment et surveiller du coin de l’œil.', 'Ajouter un « à voir » sur la liste de l’atelier.', 'Prendre un café et refaire le tour du bus.'],
    delays: ['5 minutes (au sens RBE)', 'Le temps d’un café', 'Avant la fin de la pause'],
  },
  {
    label: '🟠 À surveiller',
    actions: ['Demander un deuxième avis, idéalement avec une clé à molette.', 'Prévenir l’atelier avant que le bus ne le fasse lui-même.', 'Écouter attentivement le bruit, puis se disputer sur son origine.'],
    delays: ['Une petite heure', 'Après la prochaine réunion', 'Entre deux « je regarde ça »'],
  },
  {
    label: '🔴 Sérieux',
    actions: ['Ouvrir le capot et réunir le comité des experts.', 'Appeler le référent technique et lui offrir un café.', 'Sortir la lampe torche, le carnet et un peu d’optimisme.'],
    delays: ['Une demi-journée', 'Jusqu’à la prochaine sortie', 'Quand la pièce sera retrouvée'],
  },
] as const;

const BREAKDOWN_WITNESSES = [
  'Un bénévole qui passait par là',
  'Le chauffeur du jour',
  'Le mécanicien qui n’a rien dit',
  'Quelqu’un du groupe de discussion',
  'Le voyant lui-même',
  'Un expert auto-proclamé',
] as const;

export type CardRarity = 'COMMUN' | 'RARE' | 'EPIQUE' | 'LEGENDAIRE' | 'MYTHIQUE';

export interface RBECollectibleCard {
  id: string;
  name: string;
  rarity: CardRarity;
  description: string;
  series?: string;
}

const SERIES_DEPOT = 'Le dépôt RBE';
const SERIES_SORTIES = 'Sorties & rassemblements';

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
  { id: 'sandwich-convoi', name: 'Le sandwich du convoi', rarity: 'COMMUN', series: SERIES_SORTIES, description: 'Partagé en trois, déjà réclamé par quatre.' },
  { id: 'cones-balisage', name: 'Les cônes de balisage', rarity: 'COMMUN', series: SERIES_SORTIES, description: 'Posés pour délimiter la zone. Quelqu’un les a pris pour des chapeaux.' },
  { id: 'thermos-matin', name: 'Le thermos du matin', rarity: 'COMMUN', series: SERIES_SORTIES, description: 'Contient du café. Probablement. En tout cas, c’est chaud.' },
  { id: 'rouleau-gaffer', name: 'Le rouleau de gaffer', rarity: 'COMMUN', series: SERIES_SORTIES, description: 'Répare tout, sauf l’orgueil du bus qui vient de lâcher.' },
  { id: 'chaise-pliante', name: 'La chaise pliante', rarity: 'COMMUN', series: SERIES_SORTIES, description: 'Indispensable au rassemblement. Disparaît dès qu’on se lève.' },
  { id: 'autocollant-rbe', name: 'L’autocollant RBE', rarity: 'COMMUN', series: SERIES_SORTIES, description: 'Collé sur un pare-brise, une gourde et une caisse à outils.' },
  { id: 'photo-de-groupe', name: 'La photo de groupe réussie', rarity: 'RARE', series: SERIES_SORTIES, description: 'Tout le monde a les yeux ouverts. Le bus aussi.' },
  { id: 'place-reservee', name: 'La place de parking réservée', rarity: 'RARE', series: SERIES_SORTIES, description: 'Elle est libre. Elle est même au bon endroit.' },
  { id: 'checklist-sortie', name: 'La check-list de sortie cochée', rarity: 'RARE', series: SERIES_SORTIES, description: 'Chaque case est cochée, y compris celle que personne ne comprenait.' },
  { id: 'megaphone-rassemblement', name: 'Le mégaphone du rassemblement', rarity: 'RARE', series: SERIES_SORTIES, description: 'Audible jusqu’au bout du parc, et dans la tente d’à côté.' },
  { id: 'barnum-premier-coup', name: 'Le barnum monté du premier coup', rarity: 'RARE', series: SERIES_SORTIES, description: 'La notice est restée dans le sac, par pure politesse.' },
  { id: 'gps-obeissant', name: 'Le GPS obéissant', rarity: 'RARE', series: SERIES_SORTIES, description: 'A proposé le bon chemin, sans passer par le pont interdit aux bus.' },
  { id: 'convoi-groupe', name: 'Le convoi groupé', rarity: 'EPIQUE', series: SERIES_SORTIES, description: 'Tous les véhicules se suivent, dans l’ordre prévu, à distance raisonnable.' },
  { id: 'client-ravi', name: 'Le client ravi', rarity: 'EPIQUE', series: SERIES_SORTIES, description: 'Il a dit « merci » avant même de recevoir la facture.' },
  { id: 'repas-sans-file', name: 'Le repas sans file d’attente', rarity: 'EPIQUE', series: SERIES_SORTIES, description: 'Quarante couverts, un seul service, zéro « il en reste ? ».' },
  { id: 'meteo-clemente', name: 'La météo clémente', rarity: 'EPIQUE', series: SERIES_SORTIES, description: 'Le bulletin annonçait de la pluie. Le ciel a changé d’avis par solidarité.' },
  { id: 'devis-signe-premier-coup', name: 'Le devis signé du premier coup', rarity: 'LEGENDAIRE', series: SERIES_SORTIES, description: 'Aucune modification demandée. Le client n’a même pas négocié la remise.' },
  { id: 'plein-avant-depart', name: 'Le plein fait avant le départ', rarity: 'LEGENDAIRE', series: SERIES_SORTIES, description: 'Le réservoir était déjà plein. Le carnet de bord le confirme.' },
  { id: 'bus-brille-ceremonie', name: 'Le bus qui brille à la cérémonie', rarity: 'LEGENDAIRE', series: SERIES_SORTIES, description: 'Lavé le matin, ciré à midi, intact à l’arrivée.' },
  { id: 'facture-payee-jour-j', name: 'La facture payée le jour même', rarity: 'MYTHIQUE', series: SERIES_SORTIES, description: 'Le virement est arrivé avant que la comptabilité ait fini son café.' },
];

const CARD_INTROS: Record<CardRarity, readonly string[]> = {
  COMMUN: ['🎴 **CARTE RAMASSÉE PRÈS DU DÉPÔT**', '🎴 **CARTE TROUVÉE AU FOND D’UN TIROIR**', '🎴 **NOUVELLE CARTE RBE**', '🎴 **CARTE SORTIE DE LA POCHE DU GILET**'],
  RARE: ['✨ **BELLE TROUVAILLE RBE**', '✨ **CARTE RARE REPÉRÉE**', '✨ **UNE CARTE QUI SORT DU LOT**'],
  EPIQUE: ['🟣 **CARTE ÉPIQUE : LE DÉPÔT RETIENT SON SOUFFLE**', '🟣 **CARTE ÉPIQUE : QUELQU’UN VA EN PARLER AU CAFÉ**', '🟣 **CARTE ÉPIQUE SORTIE DE NULLE PART**'],
  LEGENDAIRE: ['🟠 **CARTE LÉGENDAIRE : QUELQU’UN A PRIS UNE PHOTO**', '🟠 **CARTE LÉGENDAIRE : LA RADIO DU DÉPÔT S’EST TUE**', '🟠 **CARTE LÉGENDAIRE : LES ANCIENS HOCHENT LA TÊTE**'],
  MYTHIQUE: ['🌟 **CARTE MYTHIQUE : LE DÉPÔT EST SILENCIEUX**', '🌟 **CARTE MYTHIQUE : ON CROYAIT QUE ÇA N’EXISTAIT PAS**', '🌟 **CARTE MYTHIQUE : PERSONNE N’OSE RESPIRER**'],
};

const CARD_CONDITIONS: Record<CardRarity, readonly string[]> = {
  COMMUN: ['un peu cornée', 'tachée de café', 'corrigée au stylo', 'légèrement graisseuse', 'retrouvée sous un siège', 'pliée en quatre dans une poche'],
  RARE: ['propre, à peu de chose près', 'gardée dans une pochette', 'à peine froissée', 'signée d’un collègue à identité inconnue'],
  EPIQUE: ['sous pochette rigide', 'sans une trace de café', 'rangée dans le bon classeur', 'validée par deux collègues'],
  LEGENDAIRE: ['encadrée par le dépôt', 'sous plastique, évidemment', 'tamponnée « conforme »', 'photographiée sous tous les angles'],
  MYTHIQUE: ['conservée dans le coffre à clés', 'dédicacée par tout le dépôt', 'présentée sur un coussin', 'jamais touchée, jamais pliée'],
};

const CARD_FLAVORS: Record<CardRarity, readonly string[]> = {
  COMMUN: [
    'Le dépôt ne change pas d’avis : c’est une trouvaille honnête.',
    'Rien d’exceptionnel, mais personne ne l’a perdue cette fois.',
    'Une carte de plus pour la caisse. Elle sera rangée au mauvais endroit.',
    'Utile, discrète, et déjà introuvable demain.',
  ],
  RARE: [
    'Une carte qui sort du lot, ce qui n’arrive pas tous les jours.',
    'Le dépôt hoche la tête avec respect, puis retourne au café.',
    'Pas courante, pas banale. Elle mérite une pochette.',
    'Quelqu’un va forcément dire « je l’avais, mais je l’ai prêtée ».',
  ],
  EPIQUE: [
    'Le dépôt a arrêté de parler. Une rareté en soi.',
    'On va en parler jusqu’à la prochaine panne.',
    'Elle ne devrait pas exister, et pourtant elle est là.',
    'Les témoins n’y croient pas, mais la carte, si.',
  ],
  LEGENDAIRE: [
    'Les anciens vont dire qu’ils l’avaient déjà vue.',
    'La radio du dépôt vient d’annoncer la nouvelle à tout le monde.',
    'Il faudra une photo. Et un témoin. Peut-être deux.',
    'Une légende vivante, qui tient dans la poche. Ne la perds pas.',
  ],
  MYTHIQUE: [
    'Le dépôt est calme. Trop calme. C’est la preuve que la carte est réelle.',
    'Cette carte existe-t-elle vraiment ? Le registre confirme que oui.',
    'Il faut la montrer à tout le monde, avant qu’elle change d’avis.',
    'Les anciens ont des frissons, et ce n’est pas la clim.',
  ],
};

export interface CardDrawProgress {
  discovered: number;
  total: number;
  quantity: number;
}

const FIRST_CARD_LINES = [
  '📚 Ton Pokédex est lancé. La première page est écrite, sans fautes.',
  '📚 Première carte au classeur ! Les suivantes vont rapidement chercher leur place.',
  '📚 Le Pokédex vient de s’ouvrir. Le dépôt prépare déjà les prochaines pochettes.',
];

const DUPLICATE_LINES = [
  (quantity: number) => `📚 Tu en possèdes maintenant **${quantity} exemplaires**. Le dépôt appelle ça « un double pour les clés ».`,
  (quantity: number) => `📚 Exemplaire n°${quantity} : tu devrais ouvrir un rayon.`,
];

const PROGRESS_LINES = [
  (discovered: number, total: number) => `📚 Pokédex : **${discovered}/${total}** cartes découvertes. Le classeur grossit.`,
  (discovered: number, total: number) => `📚 Carte n°${discovered} sur ${total}. La caisse à outils s’agrandit aussi.`,
  (discovered: number, total: number) => `📚 Pokédex à **${discovered}/${total}**. Le dépôt compte pour toi.`,
  (discovered: number, total: number) => `📚 Collection : **${discovered}/${total}**. Chaque case remplie rend un collègue jaloux.`,
];

export function formatCardProgress({ discovered, total, quantity }: CardDrawProgress, random = Math.random): string {
  if (quantity > 1) return pickRandom(DUPLICATE_LINES, random)(quantity);
  if (discovered <= 1) return pickRandom(FIRST_CARD_LINES, random);
  if (discovered >= total) return `🏆 **${discovered}/${total}** : le Pokédex est complet. Le dépôt en pleure de joie.`;
  if (total - discovered <= 3) return `📚 Plus que **${total - discovered}** carte${total - discovered > 1 ? 's' : ''} à trouver sur ${total}. La fin est proche.`;
  if (discovered * 2 >= total && (discovered - 1) * 2 < total) return `📚 **${discovered}/${total}** : la moitié du classeur est remplie. Le plus dur reste à retrouver.`;
  return pickRandom(PROGRESS_LINES, random)(discovered, total);
}

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
  bruit_inquiet: ['Une fixation, un raccord ou une pièce qui réclame son solo.', 'Conseil RBE : écouter, localiser, puis demander à une deuxième oreille de confirmer.'],
  fumee: ['Une combustion ou un fluide prend peut-être un peu trop ses aises.', 'Conclusion : arrêter si nécessaire, ventiler et identifier la source avant de repartir.'],
  fuite: ['Un fluide a décidé de poursuivre sa carrière sur le sol du dépôt.', 'Conclusion : identifier le fluide et sa provenance avant toute réparation.'],
  voyant: ['Le tableau de bord a manifestement un message important à transmettre.', 'Conclusion : relever le voyant ou le code défaut avec l’outil adapté.'],
  puissance: ['Le moteur semble avoir choisi une journée en mode économie d’énergie.', 'Conclusion : contrôler l’admission, l’alimentation et les défauts enregistrés.'],
  porte: ['Le mécanisme de porte demande peut-être un peu de diplomatie pneumatique.', 'Conclusion : sécuriser la porte, puis contrôler pression d’air, capteurs et commande.'],
  vibration: ['Une roue, une fixation ou un élément de transmission veut participer au trajet.', 'Conclusion : ne pas banaliser une vibration : localiser sa vitesse et son origine.'],
  demarrage: ['La batterie, le démarreur ou l’autorisation de démarrage fait peut-être grève.', 'Conclusion : vérifier alimentation, batterie et signaux avant d’insister.'],
  air: ['Une fuite d’air ou un compresseur particulièrement bavard cherche à se faire entendre.', 'Conclusion : contrôler la montée en pression et rechercher la fuite avant le départ.'],
  odeur: ['Un élément chauffe peut-être plus que prévu ; le nez du dépôt mérite d’être écouté.', 'Conclusion : identifier l’odeur, couper si elle évoque une surchauffe et contrôler le véhicule.'],
};

export function pickRandom<T>(items: readonly T[], random = Math.random): T {
  return items[Math.floor(random() * items.length)]!;
}

export function formatBus(random = Math.random): string {
  const bus = pickRandom(RBE_BUSES, random);
  return `🚌 **BUS TIRÉ AU SORT**\n\n**${bus.model}**\nParc : ${bus.parc}\nMotorisation : ${bus.engine}\n\nÉtat : ${bus.status}\nRetard : ${bus.delay}\nMotif : ${bus.reason}`;
}

export function formatBreakdown(random = Math.random): string {
  const breakdown = pickRandom(RBE_BREAKDOWNS, random);
  const vehicle = random() < 0.4 ? 'Citaro 920' : (() => { const bus = pickRandom(RBE_BUSES, random); return `${bus.model} (${bus.parc})`; })();
  const baseConfidence = Number.parseInt(breakdown.confidence, 10);
  const confidence = Math.min(98, Math.max(3, baseConfidence + Math.round((random() - 0.5) * 24)));
  const severity = pickRandom(BREAKDOWN_SEVERITIES, random);
  return [
    '⚠️ **PANNE DÉTECTÉE**',
    '',
    `Véhicule : ${vehicle}`,
    `Défaut : ${breakdown.fault}`,
    `Diagnostic : « ${breakdown.diagnosis} »`,
    `Niveau de confiance : ${confidence} %`,
    `Gravité : ${severity.label}`,
    `Signalé par : ${pickRandom(BREAKDOWN_WITNESSES, random)}`,
    `Action conseillée : ${pickRandom(severity.actions, random)}`,
    `Délai estimé : ${pickRandom(severity.delays, random)}`,
  ].join('\n');
}

export interface FeedbackTicketSummary {
  reference: string;
  type: string;
  title: string;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

const FEEDBACK_STATUS: Record<string, string> = {
  OPEN: '🟡 À traiter',
  IN_PROGRESS: '🔵 En cours',
  RESOLVED: '🟢 Résolu',
  REJECTED: '🔴 Refusé',
};

export function formatFeedbackTickets(tickets: readonly FeedbackTicketSummary[], limit = 8): string {
  if (!tickets.length) return '📭 Tu n’as encore aucune remontée. Utilise `/920 jeremonte` pour en créer une.';
  const lines = tickets.slice(0, limit).map((ticket) => {
    const kind = ticket.type === 'INCIDENT' ? '🛠️' : '💡';
    const updated = Math.floor(new Date(ticket.updatedAt).getTime() / 1_000);
    const note = ticket.adminNote ? `\n> 💬 ${ticket.adminNote.replace(/\s+/g, ' ').slice(0, 160)}` : '';
    return `${kind} **${ticket.reference}** · ${ticket.title.slice(0, 80)}\n${FEEDBACK_STATUS[ticket.status] ?? ticket.status} · mis à jour <t:${updated}:R>${note}`;
  });
  const more = tickets.length > limit ? `\n\n… et ${tickets.length - limit} autre(s) plus ancienne(s).` : '';
  return `📋 **MES REMONTÉES (${tickets.length})**\n\n${lines.join('\n\n')}${more}`.slice(0, 2_000);
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
  return formatCollectibleCard(drawCollectibleCard(random), random);
}

export function formatCollectibleCard(card: RBECollectibleCard, random = Math.random): string {
  const rarity = CARD_RARITIES[card.rarity];
  const reference = `RBE-${String(Math.floor(random() * 9_000) + 1_000)}`;
  return [
    pickRandom(CARD_INTROS[card.rarity], random),
    '',
    `${rarity.icon} **${card.name}** · ${rarity.label} (${rarity.chance} %)`,
    card.description,
    '',
    `Série : ${card.series ?? SERIES_DEPOT} · Réf. ${reference}`,
    `État : ${pickRandom(CARD_CONDITIONS[card.rarity], random)}`,
    '',
    pickRandom(CARD_FLAVORS[card.rarity], random),
  ].join('\n');
}

export function formatHelp(): string {
  return [
    '🚌 **920 LE BOT — AIDE DES COMMANDES**',
    '',
    '**RBE**',
    '`/920 bus` · Tirage d’un véhicule RBE',
    '`/920 panne` · Panne humoristique',
    '`/920 diagnostic` · Diagnostic humoristique',
    '`/920 controle` · Contrôle technique humoristique',
    '`/920 tirage` · Récompense à rareté variable',
    '`/920 collection [membre]` · Pokédex et raretés obtenues',
    '`/920 ecouter [ambiance]` · Suggestion musicale',
    '`/920 jeremonte` · Envoyer une suggestion ou un incident',
    '`/920 maremontee` · Suivre l’avancement de mes remontées',
    '`/920 anniversaire` · Anniversaires du serveur',
    '',
    '**Utilitaires**',
    '`/920 help` · Afficher cette aide',
    '`/920 about` · À propos du bot',
    '`/920 ping` · Vérifier sa latence',
    '`/920 updatelog` · Nouveautés récentes',
    '`/920 admin roles` · Configurer les rôles modérateurs (admin/owner)',
    '',
    '**Modération**',
    '`/920 kick`, `/920 mute`, `/920 unmute`',
    '`/920 ban`, `/920 tempban`, `/920 unban`',
    '',
    'Les commandes de modération restent soumises aux permissions Discord.',
  ].join('\n');
}