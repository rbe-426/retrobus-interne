#!/usr/bin/env node

/**
 * Complete migration workflow:
 * 1. Backup all data
 * 2. Run Prisma migration with reset
 * 3. Restore data
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function runCommand(cmd, description) {
  console.log(`\n🔄 ${description}...`);
  console.log(`   Command: ${cmd}`);
  try {
    const output = execSync(cmd, { stdio: 'inherit', shell: 'powershell.exe' });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (e) {
    console.error(`❌ ${description} failed`);
    throw e;
  }
}

async function runMigration() {
  try {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  🔄 COMPLETE DATABASE MIGRATION WITH BACKUP & RESTORE   ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    const apiDir = path.join(process.cwd(), 'api');
    console.log(`📁 Working directory: ${apiDir}`);

    // Step 1: Backup
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 STEP 1: Backing up database...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    runCommand(`cd "${apiDir}" && node ../scripts/backup-before-migration.js`, 'Database backup');

    // Step 2: Run Prisma migration with reset
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗄️  STEP 2: Running Prisma migration (with database reset)...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    runCommand(
      `cd "${apiDir}" && npx prisma migrate dev --name add_devis_facture_columns_migration`,
      'Prisma migration'
    );

    // Step 3: Restore data
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 STEP 3: Restoring data from backup...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    runCommand(`cd "${apiDir}" && node ../scripts/restore-after-migration.js`, 'Database restore');

    // Summary
    console.log('\n\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ MIGRATION COMPLETED SUCCESSFULLY!                   ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  What was done:                                          ║');
    console.log('║  1. ✅ Backed up all database data                       ║');
    console.log('║  2. ✅ Applied Prisma schema migration with reset       ║');
    console.log('║  3. ✅ Restored all data from backup                    ║');
    console.log('║                                                          ║');
    console.log('║  Database now has:                                       ║');
    console.log('║  • devisNumber column in retro_request                   ║');
    console.log('║  • factureNumber column in retro_request                 ║');
    console.log('║  • All previous data preserved                           ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n\n❌ MIGRATION FAILED!');
    console.error('Error:', error.message);
    console.log('\nTo retry, you can:');
    console.log('1. Check the error above');
    console.log('2. Fix any issues');
    console.log('3. Run the backup script again: npm run backup-db');
    console.log('4. Run the migration: npx prisma migrate dev --name add_devis_facture_columns_migration');
    console.log('5. Restore data: npm run restore-db');
    process.exit(1);
  }
}

runMigration();
