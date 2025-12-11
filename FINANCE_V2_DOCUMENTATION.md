# Finance v2 - Documentation Complète

## Vue d'ensemble

La nouvelle version de la gestion financière (`FinanceNew`) offre une architecture modulaire et extensible avec les fonctionnalités suivantes :

### ✨ Nouveaux Onglets

#### 1. **Mes Notes de Frais** (`ExpenseReports.jsx`)
- **Accessible à** : Tous les utilisateurs
- **Fonctionnalités** :
  - Déposer une note de frais avec montant, description, date
  - Ajouter une pièce justificative (PDF, JPG, PNG)
  - Voir l'historique de ses notes
  - Supprimer les notes en attente
  - Suivre l'état (En attente, Approuvée, Payée, Rejetée)

**Exemple d'utilisation** :
```jsx
import ExpenseReports from '@/components/Finance/ExpenseReports';

<ExpenseReports />
```

#### 2. **Gestion des Notes de Frais** (`ExpenseReportsManagement.jsx`)
- **Accessible à** : Président, Vice-Président, Trésorier UNIQUEMENT
- **Fonctionnalités** :
  - Voir toutes les notes déposées par les collaborateurs
  - Approuver une note (PENDING → APPROVED)
  - Marquer comme payée (APPROVED → PAID)
  - Rejeter une note (PENDING → REJECTED)
  - Filtrer par statut
  - Voir les statistiques (total en attente, approuvé, payé)
  - Accès aux pièces justificatives

**Protection d'accès** :
```jsx
const hasAccess = currentUser?.roles?.some(role =>
  ["PRESIDENT", "VICE_PRESIDENT", "TRESORIER"].includes(role)
);

if (!hasAccess) {
  return <Alert status="error">Accès refusé</Alert>;
}
```

#### 3. **Simulations Financières** (`Simulations.jsx`)
- **Accessible à** : Tous les utilisateurs
- **Fonctionnalités** :
  - Créer des scénarios de trésorerie
  - Définir des hypothèses (nom, description, période)
  - Ajouter des recettes avec fréquence (Mensuel, Trimestriel, Annuel, Ponctuel)
  - Ajouter des dépenses avec fréquence
  - Exécuter la simulation (projection 12 mois)
  - Voir l'évolution mensuelle
  - Télécharger le rapport PDF

**Flux de simulation** :
1. Créer un scénario → BROUILLON
2. Ajouter recettes/dépenses → COMPLET
3. Exécuter la simulation → Voir résultats
4. Télécharger le PDF

#### 4. **Opérations Programmées - REFACTORISÉ** (`ScheduledOperations.jsx`)
- **Refactorisation** : Affichage par cartes avec **courbes de progression**
- **Fonctionnalités** :
  - Affichage visuel avec indicateurs de couleur
  - Progression basée sur montant total OU nombre de paiements annuels
  - Couleurs :
    - 🔴 Rouge (0-40%) : Commence à peine
    - 🟠 Orange (40-75%) : En cours
    - 🟢 Vert (75-100%) : Presque complété/Complété
    - ⚪ Gris : Progression inconnue

**Vue de progression** :
```
┌─────────────────────────────────────┐
│ Loyer du siège                      │
│ 🔴 DÉPENSE • Mensuel               │
├─────────────────────────────────────┤
│ Montant: 1 200,00 €                 │
│ Prochaine date: 15/12/2025          │
│                                      │
│ Progression: [███░░░░░░░░░░░░] 35%  │
│                                      │
│ Montant total: 6 000,00 €           │
│ Payé: 2 100,00 €                    │
│ Restant: 3 900,00 €                 │
└─────────────────────────────────────┘
```

---

## Utilitaires & Fonctions Réutilisables

### `financeCalculations.js`

#### Calcul de Progression
```javascript
import { calculateOperationProgress, getProgressColor } from '@/utils/financeCalculations';

const operation = { totalAmount: 1000, remainingTotalAmount: 250 };
const progress = calculateOperationProgress(operation); // 0.75 (75%)
const color = getProgressColor(progress); // "#22863a" (vert)
```

#### Statistiques Opérations
```javascript
import { calculateScheduledOperationStats } from '@/utils/financeCalculations';

const stats = calculateScheduledOperationStats(operations);
// {
//   activeCount: 5,
//   monthlyImpact: -1200,
//   totalPending: 5400,
//   monthlyRecettes: 800,
//   monthlyDepenses: 2000
// }
```

#### Simulations Financières
```javascript
import { runFinancialSimulation } from '@/utils/financeCalculations';

const scenario = {
  totalMonthlyIncome: 5000,
  totalMonthlyExpenses: 3000
};

const results = runFinancialSimulation(scenario, 10000, 12);
// Retourne: {
//   startingBalance: 10000,
//   finalBalance: 34000,
//   monthlyNet: 2000,
//   totalChange: 24000,
//   projection: [...],
//   summary: { isPositive: true, breakEvenMonth: null }
// }
```

#### Validations
```javascript
import { FinanceValidations } from '@/utils/financeCalculations';

const error = FinanceValidations.validateAmount(-100);
// "Le montant doit être positif"

const error2 = FinanceValidations.validateTransaction({
  type: 'CREDIT',
  amount: 'abc',
  description: 'Test'
});
// { amount: "Montant invalide" }
```

#### Permissions
```javascript
import { FinancePermissions } from '@/utils/financeCalculations';

const canManage = FinancePermissions.canManageExpenseReports(['TRESORIER']);
// true

const canModify = FinancePermissions.canModifyBalance(['MEMBER']);
// false
```

---

## Structure des Données

### Transaction
```typescript
{
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  category: string;
  date: string; // ISO date
  createdAt: string;
  userId?: string;
}
```

### Opération Programmée
```typescript
{
  id: string;
  type: 'SCHEDULED_PAYMENT' | 'SCHEDULED_CREDIT';
  amount: number;
  description: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'SEMI_ANNUAL' | 'WEEKLY' | 'ONE_SHOT';
  nextDate: string; // ISO date
  totalAmount?: number; // Montant total à amortir
  remainingTotalAmount?: number;
  isActive: boolean;
  plannedCountYear?: number; // Paiements prévus cette année
  remainingCountYear?: number;
  estimatedEndDate?: string;
}
```

### Note de Frais
```typescript
{
  id: string;
  description: string;
  amount: number;
  date: string; // ISO date
  notes?: string;
  attachment?: string; // URL de la pièce
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  userId: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Scénario de Simulation
```typescript
{
  id: string;
  name: string;
  description: string;
  projectionMonths: number;
  incomeItems: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    frequency: string;
  }>;
  expenseItems: Array<{...}>;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  monthlyNet: number;
  itemsCount: number;
}
```

---

## Intégration dans FinanceNew

```jsx
import FinanceNew from '@/pages/FinanceNew';

// FinanceNew gère automatiquement :
// - Affichage des onglets basés sur les rôles
// - Chargement des données
// - Passage du contexte utilisateur

<FinanceNew />
```

Les sections sont créées dynamiquement :
```javascript
const sections = [
  { id: "dashboard", label: "Tableau de bord", icon: FiBarChart, render: () => <FinanceDashboard /> },
  { id: "transactions", label: "Transactions", icon: FiCreditCard, render: () => <FinanceTransactions /> },
  { id: "scheduled", label: "Opérations programmées", icon: FiCalendar, render: () => <FinanceScheduledOps /> },
  { id: "expense-reports", label: "Mes notes de frais", icon: FiShoppingCart, render: () => <ExpenseReports /> },
  
  // Conditionnel : Gestion des notes seulement pour les managers
  ...(hasExpenseReportsManagementAccess ? [{
    id: "expense-management",
    label: "Gestion des notes",
    icon: FiShoppingCart,
    render: () => <ExpenseReportsManagement currentUser={currentUser} />
  }] : []),
  
  { id: "simulations", label: "Simulations", icon: FiActivity, render: () => <Simulations /> },
  { id: "reports", label: "Rapports & KPI", icon: FiTrendingUp, render: () => <FinanceReports /> },
  { id: "settings", label: "Paramètres", icon: FiSettings, render: () => <FinanceSettings /> }
];
```

---

## Points Clés d'Architecture

### 1. Séparation des Responsabilités
- **FinanceNew** = routeur/shell
- **Composants Finance/** = logique métier isolée
- **useFinanceData()** = gestion d'état centralisée
- **financeCalculations.js** = logique réutilisable

### 2. Contrôle d'Accès
- Vérifié au niveau du composant (page)
- Deux niveaux: TOUS (ExpenseReports) vs ADMIN (ExpenseReportsManagement)
- Utilise `currentUser?.roles`

### 3. Progressions Visuelles
- Basées sur `calculateOperationProgress()`
- Couleurs dérivées de `getProgressColorScheme()`
- Support montant total ET plan annuel

### 4. Extensibilité
- Ajouter un nouveau composant: créer `Finance/NewFeature.jsx`
- Ajouter une section: ajouter objet dans `sections[]`
- Ajouter une fonction: ajouter dans `financeCalculations.js`

---

## Prochaines Évolutions Possibles

- [ ] Import/export CSV transactions
- [ ] Alertes sur solde négatif
- [ ] Graphiques de tendance
- [ ] Export automatique des rapports
- [ ] Intégration bancaire
- [ ] Multi-devise
- [ ] Budgets par catégorie
- [ ] Rapprochement bancaire

---

## Support & Maintenance

Tous les composants utilisent les mêmes patterns :
- `useToast()` pour notifications
- `useDisclosure()` pour modals
- `useFinanceData()` pour requêtes API
- Validation centralisée avec `FinanceValidations`

Pour ajouter une fonctionnalité, suivre le pattern existant ! 🎯
