#!/usr/bin/env node

/**
 * Script de restauration des données après migration
 * Restaure toutes les tables à partir du fichier de backup
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreData() {
  try {
    console.log('📦 Démarrage de la restauration des données...\n');

    const backupDir = path.join(process.cwd(), 'backups');
    
    // Trouver le fichier de backup le plus récent
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json') && f !== 'backup-stats.json')
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error('❌ Aucun fichier de backup trouvé dans', backupDir);
      process.exit(1);
    }

    const latestBackupFile = path.join(backupDir, files[0]);
    console.log(`📂 Utilisation du backup: ${files[0]}\n`);

    const backupData = JSON.parse(fs.readFileSync(latestBackupFile, 'utf-8'));

    // 1. Restaurer les members
    console.log('💾 Restauration des members...');
    for (const member of backupData.members) {
      try {
        await prisma.members.upsert({
          where: { id: member.id },
          update: member,
          create: member
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur restauration member ${member.id}:`, e.message);
      }
    }
    console.log(`   ✅ ${backupData.members.length} membres restaurés`);

    // 2. Restaurer les retro_request
    console.log('💾 Restauration des retro_request...');
    for (const request of backupData.retro_request) {
      try {
        // S'assurer que userId existe dans members
        const member = await prisma.members.findUnique({
          where: { id: request.userId }
        });

        if (!member) {
          console.warn(`   ⚠️ Membre ${request.userId} introuvable pour demande ${request.id}`);
          continue;
        }

        await prisma.retro_request.upsert({
          where: { id: request.id },
          update: request,
          create: request
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur restauration demande ${request.id}:`, e.message);
      }
    }
    console.log(`   ✅ ${backupData.retro_request.length} demandes restaurées`);

    // 3. Restaurer les retro_request_file
    console.log('💾 Restauration des retro_request_file...');
    for (const file of backupData.retro_request_file) {
      try {
        await prisma.retro_request_file.upsert({
          where: { id: file.id },
          update: file,
          create: file
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur restauration fichier ${file.id}:`, e.message);
      }
    }
    console.log(`   ✅ ${backupData.retro_request_file.length} fichiers restaurés`);

    // 4. Restaurer les retro_request_status_log
    console.log('💾 Restauration des retro_request_status_log...');
    for (const log of backupData.retro_request_status_log) {
      try {
        await prisma.retro_request_status_log.upsert({
          where: { id: log.id },
          update: log,
          create: log
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur restauration log ${log.id}:`, e.message);
      }
    }
    console.log(`   ✅ ${backupData.retro_request_status_log.length} logs restaurés`);

    // 5. Restaurer les vehicle_maintenance
    console.log('💾 Restauration des vehicle_maintenance...');
    for (const maintenance of backupData.vehicle_maintenance) {
      try {
        await prisma.vehicle_maintenance.upsert({
          where: { id: maintenance.id },
          update: maintenance,
          create: maintenance
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur restauration maintenance ${maintenance.id}:`, e.message);
      }
    }
    console.log(`   ✅ ${backupData.vehicle_maintenance.length} maintenances restaurées`);

    // 6. Restaurer les usage
    console.log('💾 Restauration des usage...');
    for (const usage of backupData.usage) {
      try {
        await prisma.usage.upsert({
          where: { id: usage.id },
          update: usage,
          create: usage
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur restauration usage ${usage.id}:`, e.message);
      }
    }
    console.log(`   ✅ ${backupData.usage.length} usages restaurés`);

    console.log('\n🎉 Restauration complète terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la restauration:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

restoreData();
