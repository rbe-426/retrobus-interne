#!/usr/bin/env node

/**
 * Script complet de migration avec backup et restauration
 * 1. Sauvegarde les données
 * 2. Fait la migration avec reset
 * 3. Restaure les données
 */

import { spawn } from 'child_process';
import path from 'path';

function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n📍 ${description}...\n`);
    
    const proc = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${description} échoué avec le code ${code}`));
      } else {
        console.log(`✅ ${description} terminé\n`);
        resolve();
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Erreur lors de ${description}: ${err.message}`));
    });
  });
}

async function runMigration() {
  try {
    console.log('=====================================');
    console.log('  🚀 Migration complète de la BD');
    console.log('=====================================\n');

    // Étape 1: Backup des données
    await runCommand('node', ['backup-data.js'], '📦 Sauvegarde des données');

    // Étape 2: Migration avec reset
    await runCommand(
      'npx',
      ['prisma', 'migrate', 'deploy'],
      '🔄 Exécution de la migration Prisma'
    );

    // Étape 3: Restauration des données
    await runCommand('node', ['restore-data.js'], '📥 Restauration des données');

    console.log('\n=====================================');
    console.log('  ✅ Migration terminée avec succès!');
    console.log('=====================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    console.log('\n⚠️  Vérifiez que:');
    console.log('   1. La variable DATABASE_URL est définie');
    console.log('   2. Vous êtes dans le répertoire api/');
    console.log('   3. Les fichiers backup-data.js et restore-data.js existent\n');
    process.exit(1);
  }
}

runMigration();
