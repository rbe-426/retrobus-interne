# 🎯 PHASE 2 - Migration Priority List

**Files that need to be updated to use new centralized auth/api system**

Generated: November 20, 2025

---

## 🔴 CRITICAL PRIORITY (Fix First)

These files are used frequently and have the most direct localStorage/auth issues:

1. **AdminFinance.jsx** (4545 lines!)
   - Uses: `localStorage.getItem('token')` 20+ times
   - Problem: Direct token access everywhere
   - Impact: Finance module broken until fixed

2. **SiteManagement.jsx**
   - Uses: Direct token + buildPathCandidates
   - Impact: Site config management broken

3. **MyRBEActions.jsx** (500+ lines)
   - Uses: localStorage for pointages + token
   - Impact: Vehicle actions system affected

4. **EventsHub.jsx**
   - Uses: fetchJson + localStorage token
   - Impact: Events management affected

---

## 🟠 HIGH PRIORITY (Fix Soon)

Core components with significant impact:

### API/Data Files
- **src/api/config.js** - Has auth headers building
- **src/api/finance.js** - Direct auth handling
- **src/api/members.js** - Direct token usage
- **src/apiClient.js** ✅ ALREADY FIXED

### Pages
- **LoginManagement.jsx** - Uses fetchJson, apiClient.get
- **MembersManagement.jsx** - Uses fetchJson + token
- **Evenements.jsx** - fetchJson + token
- **EventsCreation.jsx** - fetchJson + token
- **AdminGeneral.jsx** - Direct token access
- **ApiDiagnostics.jsx** - Diagnostic page, uses token

### Components
- **NotificationCenter.jsx** - Direct token usage
- **PermissionsManager.jsx** - Multiple permission hooks
- **VehicleSelector.jsx** - Direct token
- **CreateMemberWithLogin.jsx** - Auth flow

---

## 🟡 MEDIUM PRIORITY (Fix After High)

Important but less frequently used:

- **Adhesion.jsx**
- **ForcePasswordChange.jsx**
- **SupportSite.jsx**
- **VehicleDelete.jsx** (component)

---

## 📊 Statistics

| Category | Count | Status |
|----------|-------|--------|
| Direct localStorage.getItem('token') | 20+ files | ❌ Needs fixing |
| Using fetchJson | 15+ files | ❌ Needs fixing |
| Using buildPathCandidates | 10+ files | ❌ Needs fixing |
| Multiple permission hooks | 5+ files | ❌ Needs fixing |
| Already migrated | 2 files | ✅ authService.js, apiClient.js |

---

## ✅ Migration Checklist by File

### Each file migration should include:
- [ ] Replace `localStorage.getItem('token')` → use `apiClient` directly
- [ ] Replace `fetchJson` → use `apiClient.get/post/patch/delete`
- [ ] Replace `buildPathCandidates` → use `apiClient` (handles internally)
- [ ] Replace `usePermissions + useFunctionPermissions` → `usePermissions.unified`
- [ ] Replace `import { login } from '../api/auth.js'` → `import { login } from '../api/authService.js'`
- [ ] Test component after changes
- [ ] Commit with message: `Migrate: ComponentName to new auth/api system`

---

## 🚀 Suggested Migration Order

1. **Start with utility functions**:
   - `src/api/config.js`
   - `src/api/members.js`
   - `src/api/finance.js`

2. **Then core components**:
   - `NotificationCenter.jsx` (used everywhere)
   - `PermissionsManager.jsx` (permissions system)

3. **Then pages** (start with less critical):
   - `ApiDiagnostics.jsx` (diagnostic only)
   - `Adhesion.jsx` (low traffic)
   - `LoginManagement.jsx` (important but isolated)

4. **Then major pages**:
   - `MembersManagement.jsx`
   - `EventsHub.jsx` + `EventsCreation.jsx`
   - `AdminGeneral.jsx`

5. **Finally critical pages** (tackle last, most complex):
   - `MyRBEActions.jsx` (complex local storage usage)
   - `SiteManagement.jsx` (complex form + API)
   - **AdminFinance.jsx** (biggest, most complex - do last!)

---

## 💡 Tips for Each File

### For `localStorage.getItem('token')` → Use apiClient
```javascript
// ❌ OLD
const token = localStorage.getItem('token');
fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

// ✅ NEW
import { apiClient } from '../apiClient.js';
await apiClient.get(url);
```

### For `fetchJson` → Use apiClient
```javascript
// ❌ OLD
import { fetchJson } from '../apiClient.js';
const data = await fetchJson('/api/data', { method: 'GET' });

// ✅ NEW
import { apiClient } from '../apiClient.js';
const data = await apiClient.get('/api/data');
```

### For permission hooks
```javascript
// ❌ OLD
import { usePermissions } from '../hooks/usePermissions.js';
import { useFunctionPermissions } from '../hooks/useFunctionPermissions.js';
const perms = usePermissions(userId);
const funcs = useFunctionPermissions(userId);

// ✅ NEW
import { usePermissions } from '../hooks/usePermissions.unified.js';
const { hasPermission, hasFunction } = usePermissions(userId);
```

---

## 📝 Template for Commit Messages

When committing migrations:

```
Migrate: [FileName] to centralized auth/api system

- Replace localStorage.getItem('token') with apiClient
- Replace fetchJson with apiClient.get/post/patch/delete
- Replace buildPathCandidates with apiClient paths
- Replace usePermissions hooks with unified version
- Update imports to use authService

Fixes inconsistent auth/api calls
Improves type safety and error handling
```

---

## ⚠️ Testing After Migration

For each file migrated:

1. **Build**: `npm run build` - should succeed
2. **Dev**: `npm run dev` - no console errors
3. **Functionality**: Test the actual feature
   - If auth-related: test login/logout
   - If data-related: test API calls
   - If permissions: test permission checks
4. **Console**: Check for new debug logs (🔗 GET, 📤 POST, etc.)

---

## 🎯 Phase 2 Completion Criteria

✅ Phase 2 is complete when:
- [ ] All 20+ files with direct localStorage.getItem migrated
- [ ] All fetchJson calls replaced with apiClient
- [ ] All permission hooks consolidated
- [ ] Build succeeds: `npm run build`
- [ ] Dev mode has no console errors: `npm run dev`
- [ ] All git commits pushed to main

---

**Estimated Effort**: 3-4 hours for complete migration

**Starting Point**: See MIGRATION_GUIDE.md for patterns

**Questions**: Check CLEANUP_PHASE1_SUMMARY.md for architecture overview
