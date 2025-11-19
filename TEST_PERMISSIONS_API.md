# Test API Permissions Unifiée

## Endpoints testés

### 1. GET /api/permissions/definitions
**Description**: Récupère les définitions complètes des permissions  
**Auth**: Non requis (public)  
**Réponse**: Toutes les fonctions, groupes, rôles, et permissions par défaut

```bash
curl http://localhost:3001/api/permissions/definitions
```

### 2. GET /api/users/list
**Description**: Liste tous les utilisateurs (SiteUsers + Members)  
**Auth**: Requis (Bearer token)  
**Réponse**: 
```json
{
  "timestamp": "2025-01-14T10:30:00Z",
  "count": 42,
  "users": [
    {
      "id": "user-123",
      "username": "jdoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "type": "site-user"
    }
  ]
}
```

**Test avec token**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/users/list
```

**Test avec dev token**:
```bash
curl -H "Authorization: Bearer local-dev-token-testuser" \
     http://localhost:3001/api/users/list
```

### 3. GET /api/permissions/my-permissions
**Description**: Récupère les permissions de l'utilisateur connecté  
**Auth**: Requis  
**Réponse**: Permissions de l'utilisateur actuel

```bash
curl -H "Authorization: Bearer local-dev-token-testuser" \
     http://localhost:3001/api/permissions/my-permissions
```

### 4. GET /api/permissions/user/:userId
**Description**: Récupère les permissions d'un utilisateur spécifique (admin)  
**Auth**: Requis + Admin

```bash
curl -H "Authorization: Bearer local-dev-token-admin" \
     http://localhost:3001/api/permissions/user/user-123
```

### 5. POST /api/permissions/grant
**Description**: Accorde une permission à un utilisateur (admin)  
**Auth**: Requis + Admin  
**Body**:
```json
{
  "userId": "user-123",
  "functionId": "VEHICLE_READ",
  "access": true,
  "read": true,
  "write": false,
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

```bash
curl -X POST \
     -H "Authorization: Bearer local-dev-token-admin" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "user-123",
       "functionId": "VEHICLE_READ",
       "access": true,
       "read": true,
       "write": false
     }' \
     http://localhost:3001/api/permissions/grant
```

### 6. DELETE /api/permissions/:permId
**Description**: Revoque une permission (admin)  
**Auth**: Requis + Admin

```bash
curl -X DELETE \
     -H "Authorization: Bearer local-dev-token-admin" \
     http://localhost:3001/api/permissions/perm-123
```

### 7. GET /api/permissions/audit
**Description**: Récupère l'audit trail des permissions (admin)  
**Auth**: Requis + Admin

```bash
curl -H "Authorization: Bearer local-dev-token-admin" \
     http://localhost:3001/api/permissions/audit
```

## Étapes de test complet

### 1. Vérifier que les définitions sont accessibles
```bash
curl http://localhost:3001/api/permissions/definitions | jq '.roles | length'
# Devrait afficher le nombre de rôles (ex: 10)
```

### 2. Tester l'authentification avec dev token
```bash
curl -H "Authorization: Bearer local-dev-token-testuser" \
     http://localhost:3001/api/users/list | jq '.count'
# Devrait afficher le nombre d'utilisateurs
```

### 3. Tester un endpoint admin
```bash
# Ceci devrait échouer (non-admin)
curl -H "Authorization: Bearer local-dev-token-testuser" \
     http://localhost:3001/api/permissions/my-permissions | jq '.'

# Ceci devrait fonctionner (admin ou token spécial)
curl -H "Authorization: Bearer local-dev-token-admin" \
     http://localhost:3001/api/permissions/my-permissions | jq '.'
```

## Erreurs possibles

### 401 Unauthorized
- Token absent: Ajouter `Authorization: Bearer token`
- Token invalide: Vérifier le format et la validité du token
- Token expiré: Obtenir un nouveau token

### 403 Forbidden
- Non-admin: L'utilisateur n'a pas le rôle ADMIN
- Permissions insuffisantes: Accorder la permission requise

### 404 Not Found
- Endpoint inexistant: Vérifier l'URL
- Ressource inexistante: Vérifier l'ID

### 500 Server Error
- Database unavailable: Vérifier que Prisma est initialisé
- Erreur d'implémentation: Vérifier les logs du serveur

## Intégration Frontend

### Utiliser le hook React
```javascript
import { useUnifiedPermissions } from '../hooks/useUnifiedPermissions';

export function MyComponent() {
  const { checkAccess, checkRead, checkWrite, myPermissions } = useUnifiedPermissions();
  
  // Vérifier l'accès
  if (!checkAccess('VEHICLE_READ')) {
    return <div>Accès refusé</div>;
  }
  
  return <div>Contenu autorisé</div>;
}
```

### Utiliser le composant de protection
```javascript
import { UnifiedPermissionGate } from '../components/UnifiedPermissionGate';

export function MyPage() {
  return (
    <UnifiedPermissionGate function="VEHICLE_WRITE" action="write" fallback={<div>Accès refusé</div>}>
      <VehicleEditor />
    </UnifiedPermissionGate>
  );
}
```

## Checklist

- [ ] Les définitions des permissions sont accessibles (`/api/permissions/definitions`)
- [ ] La liste des utilisateurs est accessible (`/api/users/list`)
- [ ] L'authentification avec dev tokens fonctionne
- [ ] Les endpoints admin requièrent le rôle ADMIN
- [ ] Les permissions peuvent être accordées
- [ ] Les permissions peuvent être révoquées
- [ ] Le frontend se connecte correctement
- [ ] Le hook React récupère les permissions
- [ ] Le composant de protection fonctionne

