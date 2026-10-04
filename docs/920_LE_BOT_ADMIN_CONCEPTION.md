# 920 Le Bot ! - Conception du centre d'administration URBEX

## 1. Objet et principe de livraison

Ce document définit le centre d'administration de `920 Le Bot !` dans URBEX. Il remplace le modèle actuel de configuration globale, composé majoritairement d'interrupteurs, par des modules réellement administrables et exécutés par le bot Discord.

Un module est terminé seulement lorsque les éléments suivants existent ensemble :

1. données persistées par serveur Discord ;
2. API URBEX protégée et validée ;
3. exécution effective dans le bot ;
4. interface de configuration, prévisualisation et retour d'erreur ;
5. journal d'audit ;
6. tests de validation du comportement et des permissions.

Le panel n'est jamais une source d'autorité Discord directe : URBEX appelle l'API RBE avec son JWT et ses permissions internes ; le bot interroge l'API avec `x-bot920-service-token`. Le bot reste le seul processus à exécuter des actions Discord.

## 2. Etat initial et décision d'architecture

### Etat initial constaté

- `Bot920Management.jsx` contient la navigation, une vue de santé et plusieurs écrans de démonstration.
- `Bot920ConfigurationPanel.jsx` stocke un JSON global `Bot920Configuration` : identité, commandes, accueil, logs, fun, plugins et AutoMod simplifié.
- L'API persiste ce JSON dans `Bot920Configuration`; ce format est utile comme compatibilité transitoire mais insuffisant pour les configurations multiples et l'historique.
- Le runtime exécute réellement les sous-commandes `/920`, l'accueil simple, l'AutoMod anti-spam/liens/raid et les bans temporaires.
- Les données métier déjà disponibles sont les anniversaires Discord et les bans temporaires.

### Décisions structurantes

- Toute donnée opérationnelle est **scopée par `guildId`**. Aucune configuration fonctionnelle ne doit rester globale sous l'identifiant `default`.
- Les IDs Discord sont stockés comme `String` et ne sont jamais demandés à la main dans l'interface : l'API de découverte fournit salons, catégories, rôles et membres du serveur sélectionné.
- Les règles à listes (logs, filtres, automatisations, récompenses) sont des lignes de base de données, non des tableaux opaques dans un JSON.
- Chaque modification crée un audit avant/après. Les actions Discord critiques ont une confirmation explicite.
- Le bot recharge les configurations publiées avec une version par serveur, invalide son cache après publication et conserve le dernier cache connu si l'API est indisponible.

## 3. Arborescence du panel

```text
920 Le Bot !
├── Vue d'ensemble
├── Serveur et accès
│   ├── Général
│   ├── Etat Discord et permissions
│   ├── Rôles d'administration URBEX
│   └── Audit du panel
├── Modération
│   ├── Centre de sanctions
│   ├── Profils de sanction
│   ├── Historique
│   └── AutoMod
├── Communauté
│   ├── Bienvenue et départ
│   ├── Rôles
│   ├── Niveaux et XP
│   ├── Suggestions
│   └── Fun
├── Assistance
│   ├── Tickets
│   ├── Messages et embeds
│   ├── Rappels
│   └── Liens sociaux / RSS
├── Engagement
│   ├── Sondages
│   ├── Giveaways
│   └── Annonces programmées
├── Automatisations
│   ├── Règles
│   ├── Exécutions
│   └── Variables et modèles
├── Commandes
│   ├── Catalogue /920
│   ├── Sous-commandes
│   └── Permissions et cooldowns
├── Journaux
│   ├── Routage des logs
│   ├── Prévisualisation
│   └── Historique technique
└── Statistiques
    ├── Activité
    ├── Modération
    ├── Tickets
    └── Commandes
```

La barre supérieure contient toujours : sélecteur de serveur, statut Discord, version de configuration, bouton `Publier`, date de dernière publication et badge des erreurs de permissions. Chaque écran a `Enregistrer un brouillon`, `Réinitialiser`, et, lorsqu'il a un impact runtime, `Publier`.

## 4. Modules fonctionnels

### 4.1 Vue d'ensemble

- Etat connecté/déconnecté, latence, disponibilité API, version de configuration chargée et dernière synchronisation.
- Cartes : membres, messages, commandes, tickets ouverts, sanctions des 7 derniers jours et alertes AutoMod.
- Liste priorisée des actions requises : intent manquant, permission Discord manquante, rôle non gérable, canal supprimé ou configuration invalide.
- Aucun compteur ne peut être affiché comme réel sans source d'événements persistée.

### 4.2 Général et accès

- Identité : nom affiché, description `/920 about`, avatar et présence (si l'API Discord autorise la modification concernée).
- Paramètres de serveur : fuseau horaire, langue, préfixes textuels éventuels, format de date et salon de notifications d'administration.
- Diagnostic : permissions présentes/manquantes, position du rôle du bot, intents actifs, salons accessibles et webhooks invalides.
- Accès URBEX : profils `Owner`, `Administrateur`, `Modérateur`, `Staff`, `Lecture seule`; attribution aux comptes URBEX et matrice de permissions par module.

Permissions URBEX : `bot920.viewStatistics`, `bot920.manageModeration`, `bot920.manageAutomod`, `bot920.manageTickets`, `bot920.manageRoles`, `bot920.manageAutomations`, `bot920.manageMessages`, `bot920.manageEngagement`, `bot920.manageCommands`, `bot920.viewLogs`, `bot920.manageSettings`, `bot920.manageAccess`, `bot920.viewAudit`.

### 4.3 Journaux

Une règle de journal est créée pour chaque type utile. Elle définit `enabled`, salon cible, type `embed|plain`, couleur, titre, format, variables, politique de mentions, exceptions (rôles, membres, salons) et prévisualisation.

Familles :

- Membres : arrivée, départ, pseudo, avatar, rôles, statut.
- Modération : warn, timeout/mute, kick, ban, unban, suppression de sanction.
- Messages : suppression, édition, épinglage, désépinglage, suppression en masse.
- Serveur : création/suppression/modification de salon ou rôle, permissions modifiées.
- Vocal : connexion, déconnexion, déplacement, mute, deaf.
- Bot : commande exécutée, erreur de commande, erreur API, automatisation déclenchée.

Le message de log est envoyé par le bot et enregistré dans `DiscordLogEvent` avec son statut d'envoi. La prévisualisation ne déclenche jamais Discord; le bouton `Tester dans le salon` le fait, après confirmation.

### 4.4 Centre de modération

- Sanctions manuelles : warn, timeout, mute, kick, ban, softban, tempban, unban et révocation de sanction.
- Formulaire : membre Discord, action, durée, motif, note interne, DM au membre, message public, salon de log, pièces jointes éventuelles et confirmation.
- Contrôle avant exécution : permission du modérateur, permission bot, cible, hiérarchie des rôles et disponibilité du salon.
- Profils de sanction réutilisables : par exemple `Spam` = supprimer messages + warn + timeout 10 min; `Insulte` = supprimer + warn; `Raid` = timeout + alerte staff. Chaque profil possède conditions, actions séquentielles, message et escalade cumulative.
- Historique filtrable par membre, modérateur, type, période et statut; détail de la raison, durée, expirations, révocations et lien vers le log Discord.

### 4.5 AutoMod

Règles indépendantes, activables séparément : anti-spam, anti-flood, liens, invitations Discord, mentions, majuscules, mots/expressions et détection de raid.

Pour chaque règle : seuils, fenêtre temporelle, salons/rôles/membres exclus, gravité, action primaire, durée de timeout, suppression, notification utilisateur, profil de sanction, canal d'alerte et log associé.

Le filtre de mots permet créer, modifier, désactiver et supprimer une expression; il gère correspondance exacte, partielle ou expression régulière validée; niveau `faible|moyen|élevé`; action associée et exceptions.

### 4.6 Bienvenue et départ

Constructeur de message avec modes texte ou embed : titre, description, couleur, image, miniature, footer, bouton, URL, mention, salon, rôle automatique et DM optionnel.

Variables autorisées : `{user}`, `{username}`, `{user_id}`, `{server}`, `{server_id}`, `{member_count}`, `{channel}`, `{date}`, `{time}`. Elles sont listées dans un sélecteur insérable et rendues dans une prévisualisation de message Discord.

La validation vérifie salon textuel accessible, rôle éditable, permission `SendMessages`, `EmbedLinks`, `ManageRoles` si nécessaire. Les mêmes capacités existent pour le message de départ.

### 4.7 Rôles

- Autoroles à l'arrivée : rôles multiples, conditions, délai, exclusions et retrait éventuel.
- Reaction roles : message cible ou nouveau message, salon, emoji, rôle, plusieurs associations, mode cumulatif/exclusif, limite et message de confirmation.
- Button roles et select roles : libellé, style, emoji, rôles, catégories et mode exclusif.
- Rôles temporaires : attribution manuelle ou automatisée, date d'expiration, retrait et historique.
- Rôles de niveau : intégration avec les récompenses XP.

Toute modification de rôles vérifie que le rôle existe, n'est pas managé et se situe sous le rôle du bot.

### 4.8 Tickets

- Création de panneaux : titre, description, embed, image, couleur, bouton, emoji et salon de publication.
- Catégories : support, adhésion, signalement, partenariat, technique ou personnalisées; chacune définit catégorie Discord, rôles autorisés, nommage, message initial, formulaire/modal, limite par membre, permissions et salon de logs.
- Opérations : claim, close, reopen, lock, unlock, ajout/retrait de membre, transcript HTML/texte, archive et suppression différée.
- Table de suivi : état, demandeur, assigné, catégorie, dates, SLA, tags et temps de résolution.

### 4.9 Automatisations

Constructeur visuel `QUAND -> SI -> ALORS` avec brouillon et test simulé.

- Evénements : membre rejoint/quitte, message envoyé/supprimé, rôle ajouté/retiré, commande, ticket créé/fermé, niveau atteint, événement planifié.
- Conditions : rôle présent/absent, membre, salon, contenu, volume de messages, niveau, ancienneté, heure/date, statut de ticket.
- Actions : message/DM, ajouter/retirer rôle, timeout, kick, ban, suppression, créer ticket, écrire log, attente, déclencher une autre automatisation.
- Protections : ordre, actif, limite d'exécutions, anti-boucle, temps de refroidissement, exécution asynchrone et journal de chaque étape.

### 4.10 Niveaux et XP

- XP messages et vocal, minimum/maximum, cooldown, multiplicateur global, courbe, niveau maximal, exclusions salons/rôles et bonus salons/rôles.
- Classement public ou privé; réinitialisation par serveur après confirmation double.
- Récompenses : niveau, rôle ou message, durée, cumulatif/évolutif, conditions et salon d'annonce.
- Historique de gains, corrections manuelles et anti-farm.

### 4.11 Commandes

Catalogue recherché et filtré par catégorie. Chaque sous-commande `/920` expose : activation, description, permissions Discord ou rôles autorisés, cooldown global/utilisateur/salon, paramètres, réponse par défaut, visibilité et exceptions.

Les commandes de modération ne peuvent jamais contourner les permissions Discord réelles. Une désactivation retire l'accès runtime, mais toute modification de structure de slash command nécessite publication et `deploy:commands` contrôlé.

### 4.12 Messages, rappels, annonces et liens sociaux

- Bibliothèque de modèles de texte/embed, variables, boutons, menus, validation et aperçu Discord.
- Messages instantanés, sauvegardés, programmés, récurrents, avec historique d'envoi et échecs.
- Rappels personnels/serveur : cible, échéance, répétition, salon ou DM, statut et annulation.
- Liens sociaux et flux RSS : URL validée, fréquence, format de publication, salon cible, dédoublonnage et dernier élément publié.

### 4.13 Sondages, giveaways et suggestions

- Sondage : question, réponses, durée, votes multiples, anonymat, canal, fermeture planifiée et résultats.
- Giveaway : lot, gagnants, durée, conditions, rôles requis/exclus, salon, message, reroll, clôture et historique.
- Suggestions : canal de collecte, validation/refus, statuts, votes, commentaires, rôles de traitement, messages et journalisation.

### 4.14 Statistiques

Périodes `24 h`, `7 jours`, `30 jours`, `90 jours`, filtre salon et export CSV lorsque l'autorisation existe.

- Membres : total, arrivées, départs, évolution.
- Messages : jour/semaine/mois, salons actifs.
- Commandes : exécutions, taux d'erreur et classement.
- Modération : warns, timeouts, kicks, bans, règles AutoMod.
- Tickets : ouverts/fermés, volume par catégorie, temps moyen de première réponse et résolution.
- Activité : vocal, XP, automatisations et envois planifiés.

## 5. Modèle de données Prisma cible

`Bot920Configuration` actuel devient un enregistrement de migration/transitoire. Les modèles suivants sont nécessaires :

| Modèle | Champs essentiels | Relations / finalité |
|---|---|---|
| `DiscordGuild` | `id`, `name`, `iconUrl`, `lastSyncedAt`, `configVersion` | Racine de toute donnée par serveur. |
| `Bot920GuildSettings` | `guildId`, identité, timezone, locale, notificationChannelId | Paramètres généraux publiés. |
| `Bot920PanelRole` | `guildId`, `role`, `permissions`, `userId?`, `discordRoleId?` | RBAC URBEX par serveur. |
| `Bot920AuditEvent` | acteur URBEX, `guildId`, module, action, `before`, `after`, date, IP/correlationId | Journal immuable du panel. |
| `DiscordLogRule` | `guildId`, événement, salon, format, couleur, template, mentions, exceptions, actif | Routage détaillé des logs. |
| `DiscordLogEvent` | `guildId`, règle, événement, payload assaini, statut, Discord message id, date | Historique de logs et erreurs. |
| `ModerationCase` | membre, modérateur, action, raison, note, durée, statut, expiration, source | Historique unique des sanctions. |
| `ModerationPreset` / `ModerationPresetStep` | nom, conditions, actions ordonnées | Profils de sanction et escalade. |
| `AutoModRule` / `AutoModException` / `AutoModWord` | type, seuils, actions, gravité, exceptions, expression | Toutes les protections et listes de mots. |
| `WelcomeFlow` | type arrivée/départ, salon, DM, embed JSON, rôle, actif | Constructeur de bienvenue/départ. |
| `RoleMenu` / `RoleMenuItem` | type reaction/button/select, salon, message, mode, emoji, rôle | Menus de rôles. |
| `TemporaryRoleGrant` | membre, rôle, source, expiration, retiré | Rôles temporaires. |
| `TicketPanel` / `TicketCategory` / `Ticket` / `TicketParticipant` | rendu, permissions, état, assigné, transcript | Cycle de vie ticket complet. |
| `AutomationRule` / `AutomationCondition` / `AutomationAction` / `AutomationRun` | trigger, ordre, condition, action, résultat | Moteur WHEN/IF/THEN et traçabilité. |
| `LevelSettings` / `LevelReward` / `MemberExperience` / `ExperienceEvent` | courbe, bonus, niveau, gain | Niveaux, récompenses et anti-farm. |
| `CommandPolicy` | sous-commande, actif, permissions, cooldowns, exceptions | Politique runtime de `/920`. |
| `MessageTemplate` / `ScheduledMessage` / `MessageDelivery` | contenu, échéance, récurrence, état | Messages et historique d'envoi. |
| `Reminder` / `SocialFeed` / `SocialFeedDelivery` | échéance / flux / dédoublonnage | Rappels et alertes sociales. |
| `Poll` / `PollOption` / `PollVote` | questions, options, paramètres, votes | Sondages. |
| `Giveaway` / `GiveawayEntry` / `GiveawayWinner` | lot, contraintes, tirage, gagnants | Concours, rerolls et historique. |
| `Suggestion` / `SuggestionComment` | statut, votes, traitement | Système de suggestions. |
| `Bot920MetricEvent` / `Bot920MetricAggregate` | type, dimensions, date, compteurs | Statistiques sans recalcul coûteux. |

Les IDs Discord sont indexés avec `guildId`. Les règles et éléments enfants ont `createdAt`, `updatedAt`, `createdBy` et, si nécessaire, `deletedAt`. Toute suppression administrative est un soft delete sauf purge explicitement confirmée.

## 6. API nécessaire

Toutes les routes URBEX sont sous `/api/admin/bot920/guilds/:guildId` et appliquent une permission RBAC. Toutes les routes runtime sont sous `/api/bot920/guilds/:guildId` et exigent le token de service.

| Domaine | API URBEX | API bot runtime |
|---|---|---|
| Découverte Discord | `GET /discord-context` salons/rôles/membres/diagnostic | `GET /context` cache autorisé | 
| Paramètres | `GET/PUT /settings`, `POST /publish` | `GET /runtime-config?version=` |
| Logs | CRUD `/log-rules`, `POST /log-rules/:id/test`, `GET /log-events` | `POST /log-events` |
| Modération | CRUD `/moderation/cases`, `/presets`, historique | `POST /moderation/cases`, `PATCH /cases/:id` |
| AutoMod | CRUD `/automod/rules`, `/words`, `/exceptions` | `GET /automod/config`, `POST /automod/incidents` |
| Bienvenue / rôles | CRUD `/welcome-flows`, `/role-menus`, `/temporary-roles` | `GET /welcome`, `GET /role-menus`, événements attribution | 
| Tickets | CRUD `/ticket-panels`, `/ticket-categories`, `/tickets` | création, action, transcript, événement de cycle de vie |
| Automatisations | CRUD `/automation-rules`, `POST /simulate`, `GET /runs` | `GET /automation-rules`, `POST /automation-runs` |
| XP / engagement | CRUD `/level-settings`, `/rewards`, `/polls`, `/giveaways`, `/suggestions` | lectures config, événements, clôtures planifiées |
| Messages / social | CRUD `/templates`, `/scheduled-messages`, `/feeds`, `/reminders` | réclamer une tâche, signaler livraison |
| Commandes / stats | CRUD `/command-policies`, `GET /statistics` | `GET /command-policies`, `POST /metric-events` |
| Audit | `GET /audit-events` | aucun accès en écriture direct hors service contrôlé |

Les écritures valident schéma, existence et compatibilité Discord au moment de la sauvegarde. `POST /publish` effectue une validation complète, crée une version immutable et notifie le bot. Les tâches différées sont atomiquement réclamées par le bot afin d'éviter les doubles envois.

## 7. Evénements, intents et permissions Discord

### Intents

- Déjà requis : `Guilds`, `GuildMembers`, `GuildMessages`, `MessageContent`.
- A ajouter selon module : `GuildModeration`, `GuildMessageReactions`, `GuildVoiceStates`, `GuildPresences`, `GuildInvites` lorsque réellement nécessaire.
- Les intents privilégiés `GuildMembers`, `MessageContent` et `GuildPresences` sont affichés dans le diagnostic et doivent être activés dans le portail Discord.

### Permissions du bot

`ViewChannel`, `SendMessages`, `EmbedLinks`, `ReadMessageHistory`, `AddReactions`, `UseExternalEmojis`, `ManageMessages`, `ManageRoles`, `ModerateMembers`, `KickMembers`, `BanMembers`, `ManageChannels`, `ManageThreads`, `MoveMembers`, `MuteMembers`, `DeafenMembers`, `ManageWebhooks`, `AttachFiles` et `CreatePublicThreads` sont demandées uniquement par les modules concernés.

Chaque écran affiche les permissions minimales, les permissions manquantes et l'effet bloqué. Les actions sensibles contrôlent aussi la hiérarchie : le rôle du bot doit rester au-dessus du rôle ciblé.

### Evénements runtime

`GuildMemberAdd`, `GuildMemberRemove`, `GuildMemberUpdate`, `MessageCreate`, `MessageUpdate`, `MessageDelete`, `MessageBulkDelete`, `MessageReactionAdd`, `InteractionCreate`, `ChannelCreate/Update/Delete`, `RoleCreate/Update/Delete`, `GuildBanAdd/Remove`, `VoiceStateUpdate`, `GuildAuditLogEntryCreate` et événements de ticket/poll internes alimentent les modules concernés.

## 8. Composants UI URBEX

- `GuildSelector`, `DiscordChannelSelect`, `DiscordCategorySelect`, `DiscordRoleSelect`, `DiscordMemberSelect` : recherche, type, permissions, avatar/icône et états vide/inaccessible.
- `ModuleHeader` : statut, dernière publication, erreurs et actions brouillon/publier/réinitialiser.
- `DiscordEmbedEditor` + `DiscordMessagePreview` : texte, embed, image, footer, boutons, menus et variables.
- `VariablePicker`, `ExceptionEditor`, `ConditionsBuilder`, `ActionsBuilder`, `RuleSimulationDrawer`.
- `DataTable` avec recherche, filtres, tri, pagination, export et panneau de détail.
- `PermissionDiagnostic`, `BotOfflineAlert`, `ConfigurationErrorPanel`, `EmptyState` réellement orienté action.
- `ConfirmDangerModal` avec détail d'impact, cible et saisie de confirmation pour actions irréversibles.
- `AuditTimeline`, `RunTimeline`, `DeliveryHistory` et `MetricChart` avec périodes fixes.

## 9. Etats obligatoires

Tous les modules gèrent explicitement :

| Etat | Comportement |
|---|---|
| Chargement | skeleton sans valeurs fictives ; commandes désactivées. |
| Brouillon modifié | indication non publiée et protection contre navigation non enregistrée. |
| Succès | toast et nouvelle version/audit visible. |
| Erreur validation | erreur au champ et résumé accessible. |
| Erreur API | message clair, action de réessai, aucun effacement du brouillon. |
| Vide | explication + bouton de création du premier élément. |
| Bot hors ligne | lecture des réglages conservée, publication/test Discord bloqués. |
| Permission refusée | motif URBEX ou Discord précis, jamais un simple échec générique. |
| Ressource supprimée | identifiant conservé avec alerte et action de remplacement. |

## 10. Confirmations irréversibles

Confirmation obligatoire pour : ban/softban/kick depuis le panel, suppression de message Discord, suppression définitive de ticket/transcript, clôture d'un giveaway, tirage/reroll, réinitialisation XP, suppression d'une règle active, publication d'une automatisation qui exécute une sanction, envoi de test vers un salon et purge de l'historique.

La confirmation montre serveur, cible, impact, auteur, contenu éventuellement envoyé et journalise l'acceptation.

## 11. Relations entre modules

- Une règle AutoMod peut déclencher un profil de sanction, créer une `ModerationCase`, écrire les logs et alimenter les statistiques.
- Une sanction, un ticket, un giveaway ou une automatisation peut utiliser un `MessageTemplate` et un `DiscordLogRule`.
- Les récompenses de niveaux, autoroles, menus de rôles et automatisations partagent le même validateur de hiérarchie Discord.
- Les tickets, suggestions et commandes publient événements et métriques; le dashboard les agrège.
- Le moteur d'automatisation réutilise les variables, les actions de modération et les livraisons de messages, sans réimplémenter leurs règles de permission.

## 12. Ordre d'implémentation obligatoire

1. **Socle** : `DiscordGuild`, sélecteurs Discord, diagnostic de permissions, RBAC URBEX, audit, publication/version et cache runtime par guild.
2. **Logs + modération** : journalisation structurée, centre de sanctions, profils et historique. Les commandes actuelles doivent créer les mêmes `ModerationCase`.
3. **AutoMod + bienvenue** : règles normalisées, exceptions, constructeur embed/DM et prévisualisation.
4. **Rôles + tickets** : menus de rôles exécutables, rôles temporaires, panneaux de tickets et cycle de vie.
5. **Automatisations + messages planifiés** : moteur de règles avec simulation et anti-boucle.
6. **XP, suggestions, sondages, giveaways, rappels et RSS** : une verticale complète par module.
7. **Statistiques** : collecte d'événements présente dès les phases 2 à 6, tableaux et graphes livrés à la fin.

Chaque phase se termine par migration Prisma, endpoints, runtime bot, interface, tests unitaires/intégration, contrôle de permissions Discord, scénario d'échec et documentation de déploiement. Les modules restants ne doivent pas apparaître comme disponibles avant cette livraison complète.

## 13. Critères d'acceptation du panel

Un administrateur URBEX peut sélectionner son serveur, choisir des salons/rôles sans copier d'ID, créer une règle, la prévisualiser, l'enregistrer, la publier, voir son audit, constater une permission Discord manquante et vérifier son exécution dans les logs. Une simple bascule ne constitue jamais la livraison d'un module.