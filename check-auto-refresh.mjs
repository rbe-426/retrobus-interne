#!/usr/bin/env node

/**
 * Test de vérification: Auto-refresh Finance Dashboard
 * Vérifie que les données se mettent à jour automatiquement
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== DIAGNOSTIC AUTO-REFRESH DASHBOARD ===\n');

// 1. Vérifier FinanceNew.jsx
console.log('✓ Vérification FinanceNew.jsx...');
const financeNewPath = path.join(__dirname, 'src/pages/FinanceNew.jsx');
const financeNewContent = fs.readFileSync(financeNewPath, 'utf8');

const checks = [
  {
    name: 'useEffect sur activeMainSection',
    pattern: /useEffect\(\(\) => \{\s*loadFinanceData\(\);\s*\}, \[activeMainSection, loadFinanceData\]\);/,
    found: false
  },
  {
    name: 'setInterval 30 secondes',
    pattern: /setInterval\(\(\) => \{\s*loadFinanceData\(\);\s*\}, 30000\);/,
    found: false
  },
  {
    name: 'clearInterval cleanup',
    pattern: /return \(\) => clearInterval\(interval\);/,
    found: false
  }
];

checks.forEach(check => {
  if (check.pattern.test(financeNewContent)) {
    console.log(`  ✅ ${check.name}`);
    check.found = true;
  } else {
    console.log(`  ❌ ${check.name}`);
  }
});

// 2. Vérifier Dashboard.jsx
console.log('\n✓ Vérification Dashboard.jsx...');
const dashboardPath = path.join(__dirname, 'src/components/Finance/Dashboard.jsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const dashboardChecks = [
  {
    name: 'Import loadFinanceData',
    pattern: /const \{ stats, balance, transactions, scheduledOperations, loading, loadFinanceData \}/,
    found: false
  },
  {
    name: 'Bouton Refresh',
    pattern: /onClick={loadFinanceData}/,
    found: false
  },
  {
    name: 'Frequency multipliers',
    pattern: /frequencyMultiplier/,
    found: false
  }
];

dashboardChecks.forEach(check => {
  if (check.pattern.test(dashboardContent)) {
    console.log(`  ✅ ${check.name}`);
    check.found = true;
  } else {
    console.log(`  ❌ ${check.name}`);
  }
});

// 3. Vérifier useFinanceData.js
console.log('\n✓ Vérification useFinanceData.js...');
const hookPath = path.join(__dirname, 'src/hooks/useFinanceData.js');
const hookContent = fs.readFileSync(hookPath, 'utf8');

const hookChecks = [
  {
    name: 'Fonction loadFinanceData',
    pattern: /loadFinanceData|const.*useCallback/,
    found: false
  },
  {
    name: 'Return loadFinanceData dans hook',
    pattern: /return \{[\s\S]*\};/,
    found: false
  }
];

hookChecks.forEach(check => {
  if (check.pattern.test(hookContent)) {
    console.log(`  ✅ ${check.name}`);
    check.found = true;
  } else {
    console.log(`  ❌ ${check.name}`);
  }
});

// 4. Vérifier api/server.js
console.log('\n✓ Vérification api/server.js...');
const serverPath = path.join(__dirname, 'api/src/server.js');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');

  const serverChecks = [
    {
      name: 'GET /api/finance/transactions',
      pattern: /state\.transactions/,
      found: false
    },
    {
      name: 'POST /api/finance/transactions',
      pattern: /state\.transactions\.unshift|state\.transactions\.push/,
      found: false
    }
  ];

  serverChecks.forEach(check => {
    if (check.pattern.test(serverContent)) {
      console.log(`  ✅ ${check.name}`);
      check.found = true;
    } else {
      console.log(`  ❌ ${check.name}`);
    }
  });

  const allChecks = [...checks, ...dashboardChecks, ...hookChecks, ...serverChecks];
  const passedChecks = allChecks.filter(c => c.found).length;

  console.log('\n=== RÉSUMÉ ===');
  console.log(`✅ ${passedChecks}/${allChecks.length} vérifications réussies`);

  if (passedChecks === allChecks.length) {
    console.log('\n✅ Auto-refresh correctement implémenté!');
    console.log('\nMécanismes actifs:');
    console.log('  1️⃣  Refresh automatique au changement de section');
    console.log('  2️⃣  Polling toutes les 30 secondes');
    console.log('  3️⃣  Bouton Rafraîchir manuel sur Dashboard');
  }
} else {
  console.log('  ⚠️  api/server.js non trouvé');
}
