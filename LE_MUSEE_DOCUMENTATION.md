# Le Musée - Documentation Technique

## Vue d'ensemble

"Le Musée" est une section sécurisée de l'application RBE avec un système d'authentification séparé et indépendant du système principal. Cette séparation garantit une sécurité optimale.

## Architecture

### Frontend
- **Page principale**: `Interne/src/pages/LeMusee.jsx`
- **Modal d'authentification**: `Interne/src/components/MuseeLoginModal.jsx`
- **Route**: `/lemusee` (accessible depuis MyRBE)
- **Design**: Thème noir avec le logo "RBE | Le Musée"

### Backend
- **Routes API**: `Interne/api/src/routes/musee.routes.js`
- **Base URL**: `/api/musee`

### Endpoints API

#### `POST /api/musee/login`
Authentification pour accéder au Musée.

**Body**:
```json
{
  "username": "admin.musee",
  "password": "MuseeRBE2026!"
}
```

**Response (succès)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "musee-1",
    "username": "admin.musee",
    "role": "admin"
  }
}
```

#### `GET /api/musee/verify`
Vérifier la validité d'un token.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "valid": true,
  "user": {
    "id": "musee-1",
    "username": "admin.musee",
    "role": "admin",
    "type": "musee"
  }
}
```

#### `GET /api/musee/audit-logs`
Récupérer les logs d'audit (admin uniquement).

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "logs": [
    {
      "timestamp": "2026-08-20T12:00:00.000Z",
      "username": "admin.musee",
      "action": "LOGIN",
      "success": true,
      "ip": "127.0.0.1"
    }
  ]
}
```

#### `POST /api/musee/change-password`
Changer le mot de passe d'un utilisateur.

**Headers**:
```
Authorization: Bearer <token>
```

**Body**:
```json
{
  "currentPassword": "ancien_mot_de_passe",
  "newPassword": "nouveau_mot_de_passe"
}
```

## Configuration

### Variables d'environnement

Fichier: `Interne/api/.env`

```env
# Secret JWT spécifique pour Le Musée
MUSEE_JWT_SECRET=rbe-musee-secret-jwt-key-change-in-production-2026-secure
```

⚠️ **IMPORTANT**: Changez cette clé en production avec une valeur aléatoire forte.

### Utilisateurs par défaut

Le système utilise actuellement une base de données en mémoire avec un utilisateur par défaut:

- **Username**: `admin.musee`
- **Password**: `MuseeRBE2026!`

⚠️ **À faire**: Migrer vers Prisma avec une table dédiée `musee_users`.

## Sécurité

### Caractéristiques de sécurité

1. **Authentification séparée**: Système JWT indépendant avec un secret différent
2. **Tokens distincts**: Les tokens du Musée ont un type `musee` et ne peuvent pas être utilisés avec d'autres endpoints
3. **Durée de session**: Tokens valides pendant 8 heures
4. **Logs d'audit**: Toutes les tentatives de connexion sont enregistrées avec IP et résultat
5. **Hashage bcrypt**: Mots de passe hashés avec bcrypt (10 rounds)
6. **Rate limiting**: Hérite du rate limiting global de l'application

### Logs d'audit

Tous les événements sont loggés:
- Tentatives de connexion (succès/échec)
- Raisons d'échec (utilisateur introuvable, mot de passe invalide, etc.)
- Vérification de tokens
- Changements de mot de passe
- Adresse IP de chaque requête

Les logs sont accessibles via l'endpoint `/api/musee/audit-logs` (admin uniquement).

## Génération de nouveaux utilisateurs

Pour ajouter un nouvel utilisateur:

1. Générer le hash du mot de passe avec le script:
```powershell
cd Interne\api
node scripts\generate-musee-password.mjs "VotreMotDePasse"
```

2. Ajouter l'utilisateur dans `musee.routes.js`:
```javascript
const museeUsers = [
  {
    id: 'musee-1',
    username: 'admin.musee',
    passwordHash: '$2b$10$...', // Hash généré
    role: 'admin',
    createdAt: new Date()
  },
  {
    id: 'musee-2',
    username: 'nouveau.utilisateur',
    passwordHash: '$2b$10$...', // Hash généré
    role: 'viewer',
    createdAt: new Date()
  }
];
```

## Migration vers Prisma (TODO)

Pour une implémentation en production, créer une table dédiée:

```prisma
model MuseeUser {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  role         String   @default("viewer")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastLogin    DateTime?
  
  @@map("musee_users")
}
```

## Accès à la fonctionnalité

1. Se connecter à l'application RBE principale
2. Aller dans **MyRBE**
3. Cliquer sur la carte **"Le Musée"** (fond noir avec badge 🔒 Sécurisé)
4. S'authentifier avec les identifiants dédiés au Musée

## Tests

Pour tester l'authentification:

```javascript
// Test de connexion
const response = await fetch('http://localhost:3001/api/musee/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin.musee',
    password: 'MuseeRBE2026!'
  })
});

const { token } = await response.json();

// Test de vérification
const verifyResponse = await fetch('http://localhost:3001/api/musee/verify', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Déploiement

### Checklist avant production

- [ ] Changer `MUSEE_JWT_SECRET` avec une valeur aléatoire forte
- [ ] Changer le mot de passe par défaut
- [ ] Migrer vers une table Prisma dédiée
- [ ] Implémenter la rotation des tokens
- [ ] Ajouter un système de réinitialisation de mot de passe
- [ ] Configurer un stockage persistant des logs d'audit
- [ ] Implémenter un rate limiting spécifique pour les endpoints du Musée
- [ ] Ajouter une authentification à deux facteurs (2FA)

## Support

Pour toute question ou problème, contacter l'équipe technique RBE.
