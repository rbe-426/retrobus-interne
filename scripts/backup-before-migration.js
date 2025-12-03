#!/usr/bin/env node

/**
 * Backup script - Saves all data before migration
 * This allows us to reset the database and reimport data without losing information
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backupDatabase() {
  try {
    console.log('🔄 Starting database backup before migration...');

    const backup = {
      timestamp: new Date().toISOString(),
      version: 1,
      tables: {}
    };

    // Backup retro_request and related tables
    console.log('📋 Backing up retro_request...');
    backup.tables.retro_request = await prisma.retro_request.findMany({
      include: {
        retro_request_file: true,
        retro_request_status_log: true,
        financial_documents: true
      }
    });

    console.log('📋 Backing up members...');
    backup.tables.members = await prisma.members.findMany();

    console.log('📋 Backing up financial_documents...');
    backup.tables.financial_documents = await prisma.financial_documents.findMany();

    console.log('📋 Backing up retro_request_file...');
    backup.tables.retro_request_file = await prisma.retro_request_file.findMany();

    console.log('📋 Backing up retro_request_status_log...');
    backup.tables.retro_request_status_log = await prisma.retro_request_status_log.findMany();

    // Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Save backup file with timestamp
    const backupFile = path.join(backupDir, `backup-${new Date().getTime()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log(`✅ Backup saved to: ${backupFile}`);
    console.log(`📊 Backup stats:`);
    console.log(`  - retro_request: ${backup.tables.retro_request.length} records`);
    console.log(`  - members: ${backup.tables.members.length} records`);
    console.log(`  - financial_documents: ${backup.tables.financial_documents.length} records`);
    console.log(`  - retro_request_file: ${backup.tables.retro_request_file.length} records`);
    console.log(`  - retro_request_status_log: ${backup.tables.retro_request_status_log.length} records`);

    // Also save as "latest" for easy restoration
    const latestFile = path.join(backupDir, 'backup-latest.json');
    fs.writeFileSync(latestFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Latest backup saved to: ${latestFile}`);

    return backupFile;
  } catch (e) {
    console.error('❌ Backup error:', e.message);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

// Run backup
backupDatabase()
  .then(file => {
    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 Restore file: ${file}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Backup failed:', error);
    process.exit(1);
  });
