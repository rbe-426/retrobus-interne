# 🎯 Normalisation des Rôles Utilisateur

## Vue d'ensemble

Pour éviter les incohérences et les appels différents de rôles à travers le site, un système centralisé a été mis en place utilisant le hook `useUserRoles()`.

## ✅ Solution: useUserRoles() Hook

### Utilisation simple

```jsx
import { useUserRoles } from '../hooks/useUserRoles';

function MyComponent() {
  const { roles, hasRole, hasAdminAccess, hasFinanceAccess, canCreateVehicle } = useUserRoles();

  if (!hasAdminAccess()) {
    return <Alert>Accès admin requis</Alert>;
  }

  return <div>Admin dashboard</div>;
}
```

### API complète

#### `roles: string[]`
Tableau des rôles normalisés de l'utilisateur.
```jsx
const { roles } = useUserRoles();
console.log(roles); // ['ADMIN', 'VOLUNTEER']
```

#### `hasRole(role | roles[]): boolean`
Vérifie si l'utilisateur a un ou plusieurs rôles spécifiques.
```jsx
const { hasRole } = useUserRoles();
hasRole('ADMIN'); // true/false
hasRole(['ADMIN', 'PRESIDENT']); // true si au moins un match
```

#### `hasAdminAccess(): boolean`
Vérifie si l'utilisateur a accès à l'administration (ADMIN, PRESIDENT, VICE_PRESIDENT, TRESORIER, SECRETAIRE_GENERAL).
```jsx
const { hasAdminAccess } = useUserRoles();
if (hasAdminAccess()) { /* ... */ }
```

#### `hasFinanceAccess(): boolean`
Vérifie si l'utilisateur peut gérer les finances (ADMIN, PRESIDENT, VICE_PRESIDENT, TRESORIER).
```jsx
const { hasFinanceAccess } = useUserRoles();
if (hasFinanceAccess()) { /* accès gestion des notes de frais */ }
```

#### `canCreateVehicle(): boolean`
Vérifie si l'utilisateur peut créer des véhicules (ADMIN, PRESIDENT, VICE_PRESIDENT, VOLUNTEER).
```jsx
const { canCreateVehicle } = useUserRoles();
if (canCreateVehicle()) { /* formulaire création */ }
```

#### `isAdmin(): boolean`
Vérifie si l'utilisateur est admin.
```jsx
const { isAdmin } = useUserRoles();
if (isAdmin()) { /* ... */ }
```

## 📋 Rôles disponibles

### Rôles principaux
- **ADMIN**: Administrateur système
- **VOLUNTEER**: Bénévole
- **DRIVER**: Conducteur
- **MEMBER**: Membre (défaut)

### Rôles hérités (compatibilité)
- **PRESIDENT**: Président
- **VICE_PRESIDENT**: Vice-président
- **TRESORIER**: Trésorier
- **SECRETAIRE_GENERAL**: Secrétaire général

## 🔄 Groupes de rôles

### ADMIN_ROLES
Rôles ayant accès complet à l'administration:
- ADMIN
- PRESIDENT
- VICE_PRESIDENT
- TRESORIER
- SECRETAIRE_GENERAL

### FINANCE_ADMIN_ROLES
Rôles pouvant gérer les finances:
- ADMIN
- PRESIDENT
- VICE_PRESIDENT
- TRESORIER

### VEHICLE_CREATOR_ROLES
Rôles pouvant créer des véhicules:
- ADMIN
- PRESIDENT
- VICE_PRESIDENT
- VOLUNTEER

## 🔄 Migration des anciennes pages

### ❌ AVANT (Non standardisé)
```jsx
// Page A: Récupère les rôles du contexte
const { roles } = useUser();
if (roles?.some(r => ['ADMIN', 'PRESIDENT'].includes(r))) { /* ... */ }

// Page B: Récupère depuis user.role (string)
const { user } = useUser();
if (user?.role === 'ADMIN') { /* ... */ }

// Page C: Fait des conversions manuelles
const roles = Array.isArray(user.roles) ? user.roles : [user.role];
const isAdmin = roles.includes('ADMIN');
```

### ✅ APRÈS (Standardisé)
```jsx
// Partout la même approche
import { useUserRoles } from '../hooks/useUserRoles';

const { hasAdminAccess } = useUserRoles();
if (hasAdminAccess()) { /* ... */ }
```

## 📚 Pages déjà migrées

- ✅ `ExpenseReportsManagement.jsx` - Utilise `hasFinanceAccess()`
- ✅ `FinanceNew.jsx` - Utilise `hasFinanceAccess()`
- ✅ `SiteManagement.jsx` - Utilise `hasAdminAccess()`
- ✅ `RetroDemandes.jsx` - Utilise `hasRole()` et `hasAdminAccess()`

## 🚀 Bénéfices

1. **Cohérence**: Un seul way de vérifier les rôles
2. **Normalisation**: Tous les rôles sont normalisés automatiquement
3. **Maintenabilité**: Changer les règles de rôles au même endroit
4. **Moins de bugs**: Pas de conversions manuelles différentes par page
5. **Performance**: Cache des rôles normalisés

## 🔧 Extending

Pour ajouter une nouvelle vérification de rôles:

```jsx
// Dans useUserRoles.js
export function useUserRoles() {
  // ...
  const canManageUsers = () => {
    return hasRole(['ADMIN', 'PRESIDENT']);
  };

  return {
    // ...
    canManageUsers
  };
}

// Utilisation
const { canManageUsers } = useUserRoles();
```
