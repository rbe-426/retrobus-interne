# Console mobile (APK) – référence d'interface

Sources : spécifications fonctionnelles détaillées SAEIV InEO (MAR-EXE-SAE-INEO-0020, §3.1.3, 5.1, 5.4, 5.8) et mémoire technique Operyo Phonie GSM V4 (2015_A248, §IV.4.3, IV.7, IV.8).
Captures : [console-ref/](./console-ref/) (spec p.91-92, CPA p.81-82 et 95).

Rappel du principe RétroBus : la console ne fonctionne que sur des **IMEI rattachés à un véhicule**, lui-même rattaché à une **UC**.
Équivalent NAVINEO : « VEH sur tablette Android » – pas d'IVV (écrans, bandeaux, girouette, TTS), ni USB, CAN, E/S TOR.

## 1. Structure de l'écran (3 zones, orientation paysage)

| Zone | Contenu |
|---|---|
| Bandeau supérieur (jamais recouvert) | Boutons : alarmes, messages conducteur, messages voyageurs. Voyants de défaut : liaison poste central, liaison billettique, girouette manuelle, annonce inhibée, localisation impossible. Avance/retard (vert/rouge, en min) + heure. |
| Zone principale | Colonne gauche : ligne/sous-ligne, terminus origine + heures début/fin, type de course (COM/HLP), SA (service agent), SV (service voiture), état (EN LIGNE…). Centre : synoptique vertical des arrêts (arrêt courant, prochain arrêt, prochain point horaire, horaires). Colonne droite : bouton « Départ », voyant « Conduite » (conduite souple), carte, MENU/accueil. |
| Bandeau inférieur (jamais recouvert) | Appel phonie normal (vert) / urgent (orange), signalement, annonce voyageurs, maintenance, intervention discrète. |

## 2. Cycle de vie (à reprendre pour la console)

1. **Mise sous tension = démarrage de l'app** : lecture de la config du véhicule (IMEI → véhicule → UC, profils SAEIV, révision publiée), notification au poste central. Équivaut au déclencheur « à l'allumage du véhicule » des annonces.
2. État initial **hors voiture** ; passe **en voiture** au premier mouvement hors dépôt ou à l'identification.
   - *voiture continue* : déroule les courses d'un service ; *voiture libre* : parcours choisis par l'agent.
3. **Information de service** à l'allumage : service/agent prévu ou indisponibilité du véhicule (évite d'utiliser le mauvais véhicule).
4. **Identification agent** : matricule + mot de passe éventuel ; contrôle d'existence et d'habilitation ; alerte (bloquante ou permissive selon politique).
5. **Vérification avant départ** (option) : chaque contrôle positif/négatif, commentaire, photos (tablette) ; transmise au poste central ; contrôle bloquant négatif ou expiré = véhicule inutilisable.
6. **Prise de service** (saisie du service agent ; vide = voiture libre) → réponse du poste central, motif en cas d'échec ; mode dégradé : identification locale par vraisemblance horaire.
7. **Relève** : invite de désidentification à la fin de course, puis d'identification ; relève manquée = alarme.
8. **Fin de service / mise hors tension** : l'arrêt du contact (perte de charge sur tablette) n'interrompt pas la voiture continue avant une temporisation de sauvegarde batterie ; poste central informé avant extinction.

## 3. Fonctions conducteur

- S'identifier, sélectionner service / course / parcours, finir le service, interrompre un parcours.
- Indiquer une déviation manuelle ; indiquer la présence à un arrêt si non localisé.
- Messagerie : consulter et **viser** les messages du poste central ; envoyer des **signalements** prédéfinis (bibliothèque classée par répertoires : technique, voyageurs, voirie, météo…).
- Appel phonie normal/urgent (option), **appel de détresse** discret (bouton écran, indicateur discret de progression, phase de 10 min), **demande d'intervention discrète** (symbole alterné en attente, puis accusé).
- Comptage montées/descentes (option), réglage du volume des avertissements.
- Non disponibles sur tablette : annonces voyageurs, inhibition IV, validateurs billettique, messages voyageurs prédéfinis, guidage sonore.

## 4. Informations affichées

- Heure, retard/avance (calculé à la seconde, affiché à la minute ; absent en voiture libre), service agent/voiture.
- Parcours : ligne, parcours, destination, déviation ; prochain arrêt + quai ; consigne de blocage (immédiat / prochain arrêt / arrêt désigné).
- Course : terminus origine + heure de départ, prochain point horaire, terminus destination + heure d'arrivée, départ proche/imminent/immédiat, relève à venir, liste des courses.
- Course HLP : infos de la prochaine course commerciale. Correspondances (amenants, heures estimées, annulation). Alarmes paramétrées pour le conducteur. Indicateur de conduite souple (option).

## 5. Messagerie conducteur (règles)

- Une activation = plage horaire + critères (réseau, ligne, sens, arrêts) + message + « une fois / à chaque fois » + important ou non.
- Présentation à la nouvelle identification et à chaque entrée dans les critères, **avec bip**.
- Message **important** : reste affiché jusqu'au visa. Message **normal** : disparaît au visa ou après temporisation.
- Liste triée du plus récent au plus ancien ; non visés marqués « Message non lu » ; rappel permanent s'il en reste ; une nouvelle identification efface les visas.

## 6. Mode maintenance (mot de passe dédié)

Renseigner centre d'exploitation + numéro de parc (pour RétroBus : rattachement IMEI ↔ véhicule), état des alarmes, versions des éléments (révision SAEIV publiée), tests guidés produisant un PV PDF.

## 7. Pistes pour le Gestionnaire

- Écran « Consoles » : liste IMEI ↔ véhicule ↔ UC, statut en ligne, version de l'APK et de la révision.
- Programmation de messages conducteur (plage, critères, important, une fois/à chaque fois) et bibliothèque de signalements.
- Journal des signalements, demandes d'intervention et alarmes reçus des consoles.
