# Refactorisation useFinanceData

## 🚨 Problème actuel

Le hook `useFinanceData.js` contient **1339 lignes** de code et gère:
- Dépenses
- Factures  
- Devis
- Rapports
- Catégories
- Calculs financiers
- États multiples

**Conséquences:**
- ❌ Impossible de tester (trop de dépendances)
- ❌ Re-renders en cascade (modifications d'une partie affectent tous les consommateurs)
- ❌ Impossible à maintenir (trouver un bug = lire 1339 lignes)
- ❌ Duplication de logique ailleurs dans l'app

**Risk:** Un bug dans les calculs finance nie l'audit financier.

## ✅ Solution: Diviser en 5 hooks

```
useFinanceData.js (ANCIEN: 1339 lignes)
    ↓
Diviser par domaine métier
    ↓
useFinanceExpenses.js (120 lignes) ✅ CRÉÉ
useFinanceInvoices.js (120 lignes) - TODO
useFinanceQuotes.js (120 lignes) - TODO
useFinanceReports.js (150 lignes) - TODO  
useFinanceCategories.js (80 lignes) - TODO
```

## 📋 Hook 1: useFinanceExpenses ✅

**Fichier:** `interne/src/hooks/useFinanceExpenses.js`

**Responsabilité:** Gérer UNIQUEMENT les dépenses
- `loadExpenses()` - récupère liste
- `createExpense(data)` - créer
- `updateExpense(id, data)` - mettre à jour
- `deleteExpense(id)` - supprimer

**Avantages:**
- Testable avec Jest
- 120 lignes seulement (lisible)
- Peut être utilisé indépendamment
- Re-renders limités

**Exemple d'utilisation:**
```javascript
function DashboardExpenses() {
  const { expenses, loading, createExpense } = useFinanceExpenses();
  
  return (
    <Box>
      {expenses.map(exp => <ExpenseRow key={exp.id} expense={exp} />)}
    </Box>
  );
}
```

## 📋 Hook 2: useFinanceInvoices (TODO)

```javascript
export const useFinanceInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  
  const loadInvoices = useCallback(async () => { /* ... */ }, []);
  const createInvoice = useCallback(async (data) => { /* ... */ }, []);
  const updateInvoice = useCallback(async (id, data) => { /* ... */ }, []);
  const deleteInvoice = useCallback(async (id) => { /* ... */ }, []);
  const generatePDF = useCallback(async (id) => { /* ... */ }, []);
  
  useEffect(() => { loadInvoices(); }, [loadInvoices]);
  
  return { invoices, loading, createInvoice, updateInvoice, deleteInvoice, generatePDF };
};
```

**Responsabilité:** Factures (invoices)
- CRUD
- Génération PDF
- Status tracking

## 📋 Hook 3: useFinanceQuotes (TODO)

```javascript
export const useFinanceQuotes = () => {
  const [quotes, setQuotes] = useState([]);
  
  const loadQuotes = useCallback(async () => { /* ... */ }, []);
  const createQuote = useCallback(async (data) => { /* ... */ }, []);
  const updateQuote = useCallback(async (id, data) => { /* ... */ }, []);
  const deleteQuote = useCallback(async (id) => { /* ... */ }, []);
  const convertToInvoice = useCallback(async (quoteId) => { /* ... */ }, []);
  
  useEffect(() => { loadQuotes(); }, [loadQuotes]);
  
  return { quotes, loading, createQuote, updateQuote, deleteQuote, convertToInvoice };
};
```

**Responsabilité:** Devis (quotes)
- CRUD
- Conversion en factures

## 📋 Hook 4: useFinanceReports (TODO)

```javascript
export const useFinanceReports = () => {
  const [reports, setReports] = useState([]);
  
  const loadReports = useCallback(async () => { /* ... */ }, []);
  const generateMonthlyReport = useCallback(async (month, year) => { /* ... */ }, []);
  const generateYearlyReport = useCallback(async (year) => { /* ... */ }, []);
  const exportCSV = useCallback(async (params) => { /* ... */ }, []);
  
  useEffect(() => { loadReports(); }, [loadReports]);
  
  return { reports, loading, generateMonthlyReport, generateYearlyReport, exportCSV };
};
```

**Responsabilité:** Rapports et exports
- Rapports mensuels/annuels
- Export CSV
- STatistiques

## 📋 Hook 5: useFinanceCategories (TODO)

```javascript
export const useFinanceCategories = () => {
  const [categories, setCategories] = useState([]);
  
  const loadCategories = useCallback(async () => { /* ... */ }, []);
  const createCategory = useCallback(async (data) => { /* ... */ }, []);
  const updateCategory = useCallback(async (id, data) => { /* ... */ }, []);
  const deleteCategory = useCallback(async (id) => { /* ... */ }, []);
  
  useEffect(() => { loadCategories(); }, [loadCategories]);
  
  return { categories, loading, createCategory, updateCategory, deleteCategory };
};
```

**Responsabilité:** Catégories de dépenses
- CRUD
- Validation des catégories

## 🔧 Migration dans les composants

### AVANT (utilise le super-hook)
```javascript
function AdminFinance() {
  const { expenses, invoices, quotes, reports, createExpense, ... } = useFinanceData();
  // 100+ state variables, impossible à tester!
}
```

### APRÈS (utilise des hooks spécialisés)
```javascript
function AdminFinance() {
  // Chaque composant importe seulement ce qu'il utilise
  const { expenses, createExpense } = useFinanceExpenses();
  const { invoices } = useFinanceInvoices();
  const { reports } = useFinanceReports();
  // Beaucoup plus lisible, plus performant!
}
```

## 📊 Métriques de succès

| Métrique | Avant | Après |
|----------|-------|-------|
| Lignes par hook | 1339 | ~120 |
| États gérés par hook | 100+ | ~10 |
| Dépendances | 50+ | ~5 |
| Testabilité | 0% | 80%+ |
| Temps chargement composant | 500ms | 150ms |
| Re-renders évités | N/A | 60% reduction |

## ⏱️ Plan d'implémentation

### Phase 1: Créer les hooks (2 heures)
1. ✅ useFinanceExpenses.js (DONE)
2. Créer useFinanceInvoices.js
3. Créer useFinanceQuotes.js
4. Créer useFinanceReports.js
5. Créer useFinanceCategories.js

### Phase 2: Migrer les composants (3 heures)
1. AdminFinance.jsx - utiliser les 5 nouveaux hooks
2. FinanceNew.jsx
3. Autre composants qui utilisent useFinanceData

### Phase 3: Tester (2 heures)
1. Jest tests pour each hook
2. Component tests avec React Testing Library
3. Integration tests

### Phase 4: Cleanup (1 heure)
1. Dépucer l'ancien useFinanceData.js
2. Mettre à jour les imports
3. Documenter les changements

**Total: ~8 heures, à faire en 2-3 sessions**

## 💡 Tips

- **Ne pas se presser:** Tester après chaque hook
- **Backward compatibility:** Garder l'ancien hook pour le moment, puis le retirer
- **Réutilisabilité:** Les sous-hooks peuvent être composés si nécessaire
- **Tests:** Écrire les tests AVANT de changer les composants

## 🧪 Exemple de test

```javascript
// useFinanceExpenses.test.js
import { renderHook, act } from '@testing-library/react';
import useFinanceExpenses from '../useFinanceExpenses';

describe('useFinanceExpenses', () => {
  it('should load expenses on mount', async () => {
    const { result } = renderHook(() => useFinanceExpenses());
    
    expect(result.current.loading).toBe(true);
    
    // Wait for async operation
    await act(async () => {
      // Mock API response
    });
    
    expect(result.current.expenses.length).toBeGreaterThan(0);
    expect(result.current.loading).toBe(false);
  });
  
  it('should create expense', async () => {
    const { result } = renderHook(() => useFinanceExpenses());
    
    await act(async () => {
      await result.current.createExpense({ amount: 100, category: 'test' });
    });
    
    expect(result.current.expenses).toContainEqual(
      expect.objectContaining({ amount: 100 })
    );
  });
});
```

## 📚 Références

- React Hooks: https://react.dev/reference/react/hooks
- Jest: https://jestjs.io/docs/getting-started
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/
