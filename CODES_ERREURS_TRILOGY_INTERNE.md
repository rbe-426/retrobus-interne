# CODES ERREURS TRILOGY - SITE INTERNE RETROBUS ESSONNE

Version: 2.6.0
Date: 2026-06-19
Portee: Frontend interne + API interne + integrations (Railway, Vercel, Search Console)

## 1) Format standard Trilogy

Format popup recommande:
- [CODE] Message court
- Signification: explication metier/technique
- Action: quoi faire immediatement

Exemple:
- [RBE-API-404] Ressource introuvable
- Signification: endpoint invalide ou identifiant absent
- Action: verifier URL, id, droits, environnement

## 2) Prefixes officiels

- RBE-AUTH-xxx: authentification/session
- RBE-SEC-xxx: securite (CSRF, autorisations)
- RBE-API-xxx: erreurs API/route/reponse
- RBE-REQ-xxx: requete invalide (payload)
- RBE-VAL-xxx: validation metier
- RBE-DATA-xxx: conflit/contraintes donnees
- RBE-RATE-xxx: limitation anti-abus
- RBE-SRV-xxx: erreur serveur interne
- RBE-NET-xxx: reseau/connectivite/CORS
- RBE-UPL-xxx: upload/media/fichiers
- RBE-CLI-xxx: erreur client frontend
- RBE-EXT-xxx: services externes (Google, SMTP)

## 3) Catalogue principal (popups)

### A) Authentification / session

- RBE-AUTH-401
  - Message: Authentification invalide ou expiree
  - Signification: token absent/expire ou session invalide
  - Action: se reconnecter

- RBE-AUTH-403
  - Message: Acces refuse
  - Signification: role/permissions insuffisants
  - Action: verifier role, permissions et route

- RBE-AUTH-LOGIN-001
  - Message: Identifiants invalides
  - Signification: email/matricule ou mot de passe incorrect
  - Action: verifier identifiants, reset mot de passe

- RBE-AUTH-PWD-001
  - Message: Changement mot de passe obligatoire
  - Signification: compte en mode mot de passe temporaire
  - Action: redirection force-password-change

### B) Securite

- RBE-SEC-403-CSRF-MISSING
  - Message: Jeton CSRF manquant
  - Signification: token non present dans header mutation
  - Action: refresh session, relogin

- RBE-SEC-403-CSRF-INVALID
  - Message: Jeton CSRF invalide
  - Signification: token expire ou incoherent
  - Action: relogin, regenaration token

- RBE-SEC-CORS-001
  - Message: Requete bloquee (CORS/NotSameOrigin)
  - Signification: origine non autorisee ou header CORP/CORS absent
  - Action: verifier headers API /uploads et allowedOrigins

### C) API / routage / format

- RBE-API-404
  - Message: Ressource introuvable
  - Signification: endpoint inexistant ou id introuvable
  - Action: verifier route, prexif /api, uuid/id

- RBE-API-HTML-001
  - Message: Reponse HTML au lieu de JSON
  - Signification: rewrite/proxy/config route web-api incorrecte
  - Action: verifier vercel.json, base URL API

- RBE-API-JSON-001
  - Message: Reponse JSON invalide
  - Signification: payload reponse corrompu/tronque
  - Action: verifier logs backend et serialisation

- RBE-API-RAW-001
  - Message: Reponse inattendue du serveur
  - Signification: content-type non gere
  - Action: verifier endpoint et middleware

### D) Requetes / validation / donnees

- RBE-REQ-400
  - Message: Requete invalide
  - Signification: champs manquants ou format invalide
  - Action: verifier body, params, query

- RBE-VAL-422
  - Message: Validation metier echouee
  - Signification: regles metier non respectees
  - Action: corriger les champs concernes

- RBE-DATA-409
  - Message: Conflit de donnees
  - Signification: doublon (email, matricule, etc.) ou contrainte unique
  - Action: corriger valeur conflictuelle

### E) Reseau / disponibilite

- RBE-NET-000
  - Message: Incident reseau
  - Signification: API inaccessible, DNS, timeout reseau, CORS
  - Action: verifier connectivite et statut API

- RBE-NET-408
  - Message: Delai depasse
  - Signification: requete trop longue
  - Action: reessayer ou optimiser endpoint

- RBE-RATE-429
  - Message: Trop de requetes
  - Signification: limite anti-abus active
  - Action: patienter puis reessayer

### F) Serveur

- RBE-SRV-500
  - Message: Erreur interne serveur
  - Signification: exception backend
  - Action: consulter logs Railway

- RBE-SRV-503
  - Message: Service indisponible
  - Signification: backend indisponible/maintenance
  - Action: verifier deploiement et DB

### G) Upload / medias

- RBE-UPL-408
  - Message: Upload timeout
  - Signification: fichier trop lourd ou reseau lent
  - Action: compresser/retenter

- RBE-UPL-413
  - Message: Fichier trop volumineux
  - Signification: depassement limite multer
  - Action: reduire la taille du fichier

- RBE-UPL-415
  - Message: Type de fichier non supporte
  - Signification: mime type non autorise
  - Action: utiliser JPG/PNG/GIF/WEBP/MP4/WEBM

### H) Integrations externes

- RBE-EXT-GSC-401
  - Message: Token Google invalide
  - Signification: refresh token expire/revoque
  - Action: regenerer refresh token OAuth

- RBE-EXT-GSC-403
  - Message: Acces Search Console refuse
  - Signification: compte non autorise sur la property
  - Action: ajouter le compte dans Search Console

- RBE-EXT-SMTP-500
  - Message: Echec envoi email
  - Signification: config SMTP invalide ou indisponible
  - Action: verifier variables NOREPLY/SMTP

## 4) Domaines metier et erreurs frequentes

### Site Management / Permissions
- User not found sur UUID: mismatch members vs site_users
- 404 permissions route: route absente ou source incorrecte
- Promotion admin persistante: permissions non nettoyees apres downgrade

Codes conseilles:
- RBE-PERM-404-USER
- RBE-PERM-404-ROUTE
- RBE-PERM-409-ROLE

### Support / Tickets
- Tickets invisibles: frontend sur mauvais endpoint
- Statut ticket non modifiable: role non admin-like

Codes conseilles:
- RBE-TKT-404-ENDPOINT
- RBE-TKT-403-STATUS
- RBE-TKT-500-SYNC

### Auth / Mot de passe temporaire
- Temp password non force: site_users non synchronise avec member linked

Codes conseilles:
- RBE-AUTH-PWD-002
- RBE-AUTH-LINK-404

### Medias / RetroActus
- NotSameOrigin: headers CORP/CORS manquants
- URLs http en https: mixed content

Codes conseilles:
- RBE-UPL-CORS-001
- RBE-UPL-MIXED-001

## 5) Matrice HTTP -> code Trilogy

- 400 -> RBE-REQ-400
- 401 -> RBE-AUTH-401
- 403 -> RBE-AUTH-403 ou RBE-SEC-403-CSRF-*
- 404 -> RBE-API-404
- 409 -> RBE-DATA-409
- 422 -> RBE-VAL-422
- 429 -> RBE-RATE-429
- 500 -> RBE-SRV-500
- 503 -> RBE-SRV-503

## 6) Regles UX popup Trilogy

Chaque popup erreur doit contenir:
- Code
- Message court
- Signification
- Action recommandee

Exemple template popup:
- Titre: Erreur operation
- Description:
  [RBE-API-404] Ressource introuvable
  Signification: endpoint ou identifiant absent.
  Action: verifier l identifiant puis reessayer.

## 7) Checklist de diagnostic rapide

1. Identifier le code Trilogy affiche.
2. Verifier HTTP status et endpoint.
3. Verifier role utilisateur et permissions.
4. Verifier token JWT + CSRF.
5. Verifier logs Railway (API) et Vercel (frontend).
6. Verifier coherence site_users <-> members.
7. Reproduire en local avec meme payload.

## 8) Gouvernance

- Toute nouvelle erreur doit recevoir un code Trilogy avant mise en production.
- Interdiction des messages generiques sans code en popup.
- Les codes doivent etre stables et documentes dans ce fichier.
