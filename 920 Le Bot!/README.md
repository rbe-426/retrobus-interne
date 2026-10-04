# 920 Le Bot !

Bot Discord officiel de RétroBus Essonne.

## Démarrage local

1. Copier `.env.example` vers `.env`.
2. Renseigner `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID` et `DISCORD_GUILD_ID` pour le serveur Discord de test.
3. Exécuter `npm run deploy:commands` pour enregistrer immédiatement `/920 ping`, `/920 about` et `/920 anniversaire` sur ce serveur.
4. Exécuter `npm run dev`.

Sans `DISCORD_TOKEN`, le service démarre en mode standby et expose `GET /health` sur le port `4300`.

## Scripts

- `npm run dev` : développement avec rechargement.
- `npm run deploy:commands` : enregistrement des commandes sur le serveur de test.
- `npm run typecheck` : vérification TypeScript.
- `npm test` : tests unitaires.
- `npm run build` : compilation de production.

## Déploiement permanent

Le bot doit être déployé comme un service Railway distinct de l'API RBE et du frontend. Railway exécute `npm start`, surveille `GET /health` et redémarre le processus en cas d'échec.

Configurer les variables `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_GUILD_ID`, `RBE_API_URL` et `BOT920_SERVICE_TOKEN` dans le service Railway du bot. Ne jamais utiliser `npm run dev` en production.

## Intégration RBE

Le bot reste autonome. Son futur panel doit être intégré à l’URBEX et utiliser l’authentification, les rôles et les permissions RBE existants. Aucune migration de base n’est incluse dans ce socle.

## Commandes Phase 1

- `/920 ping` : vérifie que le bot répond et retourne sa latence.
- `/920 about` : présente le bot officiel RBE.
- `/920 anniversaire` : sous-commande réservée pour le futur module communautaire.
- `/920 bus`, `/920 panne`, `/920 destin`, `/920 phrase` et `/920 tirage` : commandes communautaires humoristiques.
- `/920 controle` : faux contrôle technique communautaire.
- `/920 diagnostic symptome:<bruit|fumee|fuite|voyant|pertepuissance>` : contenu humoristique uniquement, jamais un diagnostic mécanique fiable.

## Anniversaires

`/920 anniversaire` ouvre un choix éphémère : consulter les anniversaires du serveur ou modifier son propre anniversaire. La liste affiche le prénom Discord, le jour et le mois ainsi que l’âge calculé ; l’année de naissance n’est jamais affichée.

Cette fonction utilise l’API RBE centrale. Configurer `RBE_API_URL` et `BOT920_SERVICE_TOKEN` dans l’environnement du bot, puis configurer le même `BOT920_SERVICE_TOKEN` dans l’environnement de l’API RBE. La migration Prisma associée est conservée dans `Interne/api/prisma/migrations` et n’est jamais exécutée automatiquement.

## Discord

L’invitation `discord.gg` identifie un serveur, pas une application Discord. Pour connecter le bot, créer ou sélectionner son application dans le portail développeur Discord, puis renseigner son token et son identifiant dans `.env`. L’invitation du bot sur le serveur doit utiliser les scopes `bot` et `applications.commands`.

## Accueil

Le module Bienvenue est configuré dans URBEX, sous `/accueil/myrbe/920lebot`. Il utilise les variables `{user}`, `{username}`, `{server}` et `{member_count}`, puis peut attribuer un rôle Discord optionnel.

L’intent privilégié **Guild Members Intent** doit être activé dans le portail développeur Discord, onglet **Bot**, pour que les arrivées de membres soient reçues. Aucun intent `Message Content` n’est utilisé.