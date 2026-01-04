import pkg from 'pg';
const { Client } = pkg;

const c = new Client({
  host: 'yamanote.proxy.rlwy.net',
  port: 18663,
  user: 'postgres',
  password: 'kufBlJfvgFQSHCnQyUgVqwGLthMXtyot',
  database: 'railway'
});

await c.connect();

console.log('📊 ===== AUDIT DONNÉES FINANCIÈRES =====\n');

// 1. Transactions
console.log('📋 TRANSACTIONS');
const transactions = await c.query(
  `SELECT id, type, amount, description, category, date::TEXT, "createdAt"::TEXT
   FROM finance_transactions 
   ORDER BY date DESC 
   LIMIT 20`
);
console.log(`   Total: ${(await c.query('SELECT COUNT(*) as count FROM finance_transactions')).rows[0].count} transactions`);
console.log('   Dernières entrées:');
transactions.rows.forEach((t, i) => {
  console.log(`   ${i+1}. [${t.type}] ${t.description}`);
  console.log(`      Montant: ${t.amount}€ | Catégorie: ${t.category} | Date: ${t.date}`);
});

// 2. Solde
console.log('\n💰 SOLDE');
try {
  const balance = await c.query(
    `SELECT id, balance, "lastModified"::TEXT as last_modified, locked
     FROM finance_balances 
     LIMIT 1`
  );
  if (balance.rows.length > 0) {
    const b = balance.rows[0];
    console.log(`   Solde actuel: ${b.balance}€`);
    console.log(`   Dernier modification: ${b.last_modified}`);
    console.log(`   Verrouillé: ${b.locked ? '✅ OUI' : '❌ NON'}`);
  }
} catch(e) {
  console.log('   ⚠️ Table solde non trouvée');
}

// 3. Notes de frais
console.log('\n📝 NOTES DE FRAIS');
const expenses = await c.query(
  `SELECT id, description, amount, status, date::TEXT, "createdAt"::TEXT
   FROM finance_expense_reports
   ORDER BY date DESC 
   LIMIT 10`
);
console.log(`   Total: ${(await c.query('SELECT COUNT(*) as count FROM finance_expense_reports')).rows[0].count} notes`);
console.log('   Récentes:');
expenses.rows.forEach((e, i) => {
  console.log(`   ${i+1}. ${e.description} - ${e.amount}€ [${e.status}]`);
  console.log(`      Date: ${e.date}`);
});

// 4. Opérations programmées
console.log('\n⏰ OPÉRATIONS PROGRAMMÉES');
const scheduled = await c.query(
  `SELECT id, type, amount, description, frequency, "isActive", "nextDate"::TEXT
   FROM finance_scheduled_operations
   WHERE "isActive" = true
   ORDER BY "nextDate" ASC
   LIMIT 10`
);
console.log(`   Total: ${(await c.query('SELECT COUNT(*) as count FROM finance_scheduled_operations WHERE "isActive" = true')).rows[0].count} actives`);
console.log('   Programmées:');
scheduled.rows.forEach((s, i) => {
  console.log(`   ${i+1}. [${s.type}] ${s.description}`);
  console.log(`      Montant: ${s.amount}€ | Fréquence: ${s.frequency} | Prochaine: ${s.nextDate}`);
});

// 5. Documents (Devis/Factures)
console.log('\n📄 DOCUMENTS (Devis/Factures)');
const docs = await c.query(
  `SELECT id, type, number, title, amount, status, "createdAt"::TEXT
   FROM finance_documents
   ORDER BY "createdAt" DESC
   LIMIT 10`
);
console.log(`   Total: ${(await c.query('SELECT COUNT(*) as count FROM finance_documents')).rows[0].count} documents`);
console.log('   Récents:');
docs.rows.forEach((d, i) => {
  console.log(`   ${i+1}. [${d.type}] ${d.number} - ${d.title}`);
  console.log(`      Montant: ${d.amount}€ | Status: ${d.status} | Date: ${d.createdAt}`);
});

// 6. Catégories
console.log('\n🏷️ CATÉGORIES');
const cats = await c.query(
  `SELECT id, name, type FROM finance_categories ORDER BY name`
);
console.log(`   ${cats.rows.length} catégories`);
cats.rows.forEach((c, i) => {
  console.log(`   ${i+1}. ${c.name} (${c.type})`);
});

// 7. Résumé statistique
console.log('\n📈 STATISTIQUES');
const stats = await c.query(`
  SELECT 
    (SELECT COALESCE(SUM(amount), 0) FROM finance_transactions WHERE type = 'CREDIT') as total_credits,
    (SELECT COALESCE(SUM(amount), 0) FROM finance_transactions WHERE type = 'DEBIT') as total_debits,
    (SELECT COALESCE(SUM(amount), 0) FROM finance_expense_reports WHERE status IN ('PENDING', 'APPROVED')) as pending_expenses,
    (SELECT COALESCE(SUM(amount), 0) FROM finance_scheduled_operations WHERE "isActive" = true) as total_scheduled
`);
const s = stats.rows[0];
console.log(`   Total Crédits: ${s.total_credits}€`);
console.log(`   Total Débits: ${s.total_debits}€`);
console.log(`   Notes en attente/approuvées: ${s.pending_expenses}€`);
console.log(`   Total Opérations programmées: ${s.total_scheduled}€`);

await c.end();
console.log('\n✅ Audit terminé!');
