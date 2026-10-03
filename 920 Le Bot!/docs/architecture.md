# Architecture initiale

`920 Le Bot !` est un processus Node.js autonome : Discord est le service principal et l'URBEX est son interface d'administration future.

## Phase 1

- Client `discord.js` limité à l'intent `Guilds`.
- Registre modulaire des commandes, avec le préfixe slash unique `/920` et les sous-commandes `ping`, `about` et `anniversaire`.
- Script d'enregistrement local des commandes de test : `npm run deploy:commands`.
- Endpoint non authentifié `GET /health` destiné au monitoring.
- Démarrage en mode `standby` sans token Discord : utile pour valider le service sans exposer de secret.

## Intégration URBEX future

1. Ajouter une carte MyRBE `bot920` pointant vers une page URBEX protégée.
2. Ajouter des permissions dédiées au bot au système existant, plutôt que des comptes séparés.
3. Ajouter des routes protégées dans l'API RBE pour administrer le bot.
4. Valider séparément toute migration Prisma avant d'ajouter les tables opérationnelles du bot.

Le bot ne doit jamais accepter les JWT URBEX directement comme une autorisation Discord. Les échanges inter-services devront être authentifiés avec un mécanisme dédié.