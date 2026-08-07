#!/usr/bin/env node

/**
 * Script de sauvegarde complète des données avant migration
 * Sauvegarde toutes les tables: members, retro_request, retro_request_file, etc.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function backupData() {
  try {
    console.log('📦 Démarrage de la sauvegarde complète des données...\n');

    const backup = {};

    // 1. Sauvegarder les members
    console.log('💾 Sauvegarde des members...');
    backup.members = await prisma.members.findMany();
    console.log(`   ✅ ${backup.members.length} membres sauvegardés`);

    // 2. Sauvegarder les retro_request
    console.log('💾 Sauvegarde des retro_request...');
    backup.retro_request = await prisma.retro_request.findMany();
    console.log(`   ✅ ${backup.retro_request.length} demandes sauvegardées`);

    // 3. Sauvegarder les retro_request_file
    console.log('💾 Sauvegarde des retro_request_file...');
    backup.retro_request_file = await prisma.retro_request_file.findMany();
    console.log(`   ✅ ${backup.retro_request_file.length} fichiers sauvegardés`);

    // 4. Sauvegarder les retro_request_status_log
    console.log('💾 Sauvegarde des retro_request_status_log...');
    backup.retro_request_status_log = await prisma.retro_request_status_log.findMany();
    console.log(`   ✅ ${backup.retro_request_status_log.length} logs de statut sauvegardés`);

    // 5. Sauvegarder les vehicle_maintenance
    console.log('💾 Sauvegarde des vehicle_maintenance...');
    backup.vehicle_maintenance = await prisma.vehicle_maintenance.findMany();
    console.log(`   ✅ ${backup.vehicle_maintenance.length} maintenances sauvegardées`);

    // 6. Sauvegarder les usage
    console.log('💾 Sauvegarde des usage...');
    backup.usage = await prisma.usage.findMany();
    console.log(`   ✅ ${backup.usage.length} usages sauvegardés`);

    // Créer le dossier de backup s'il n'existe pas
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Sauvegarder dans un fichier JSON avec timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\n✅ Sauvegarde complète écrite dans: ${backupFile}`);

    // Écrire aussi un fichier de statistiques
    const stats = {
      timestamp: new Date().toISOString(),
      tables: {
        members: backup.members.length,
        retro_request: backup.retro_request.length,
        retro_request_file: backup.retro_request_file.length,
        retro_request_status_log: backup.retro_request_status_log.length,
        vehicle_maintenance: backup.vehicle_maintenance.length,
        usage: backup.usage.length
      }
    };

    const statsFile = path.join(backupDir, 'backup-stats.json');
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
    console.log(`📊 Statistiques écrites dans: ${statsFile}\n`);

    console.log('🎉 Sauvegarde complète terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupData();
