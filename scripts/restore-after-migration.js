#!/usr/bin/env node

/**
 * Restore script - Restores data after migration
 * Safely reimports backed up data with proper handling of IDs and relationships
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreDatabase(backupFile = null) {
  try {
    console.log('🔄 Starting database restore after migration...');

    // Determine which backup file to use
    let filePath = backupFile;
    if (!filePath) {
      // Use latest backup if no file specified
      const latestBackup = path.join(process.cwd(), 'backups', 'backup-latest.json');
      if (fs.existsSync(latestBackup)) {
        filePath = latestBackup;
      } else {
        // Find most recent backup
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
          throw new Error('No backups directory found');
        }
        const files = fs.readdirSync(backupDir)
          .filter(f => f.startsWith('backup-') && f.endsWith('.json') && f !== 'backup-latest.json')
          .sort()
          .reverse();
        
        if (files.length === 0) {
          throw new Error('No backup files found');
        }
        filePath = path.join(backupDir, files[0]);
      }
    }

    console.log(`📂 Using backup file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${filePath}`);
    }

    const backupData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`📅 Backup created: ${backupData.timestamp}`);

    // Restore in dependency order
    console.log('\n📥 Restoring members...');
    for (const member of (backupData.tables.members || [])) {
      try {
        await prisma.members.upsert({
          where: { id: member.id },
          update: member,
          create: member
        });
      } catch (e) {
        console.warn(`  ⚠️ Skipped member ${member.id}: ${e.message}`);
      }
    }
    console.log(`✅ Restored ${(backupData.tables.members || []).length} members`);

    console.log('\n📥 Restoring retro_request...');
    for (const request of (backupData.tables.retro_request || [])) {
      try {
        // Remove nested relations before creating
        const { retro_request_file, retro_request_status_log, financial_documents, ...requestData } = request;
        
        await prisma.retro_request.upsert({
          where: { id: request.id },
          update: requestData,
          create: requestData
        });
      } catch (e) {
        console.warn(`  ⚠️ Skipped request ${request.id}: ${e.message}`);
      }
    }
    console.log(`✅ Restored ${(backupData.tables.retro_request || []).length} retro_request records`);

    console.log('\n📥 Restoring retro_request_file...');
    for (const file of (backupData.tables.retro_request_file || [])) {
      try {
        await prisma.retro_request_file.upsert({
          where: { id: file.id },
          update: file,
          create: file
        });
      } catch (e) {
        console.warn(`  ⚠️ Skipped file ${file.id}: ${e.message}`);
      }
    }
    console.log(`✅ Restored ${(backupData.tables.retro_request_file || []).length} files`);

    console.log('\n📥 Restoring retro_request_status_log...');
    for (const log of (backupData.tables.retro_request_status_log || [])) {
      try {
        await prisma.retro_request_status_log.upsert({
          where: { id: log.id },
          update: log,
          create: log
        });
      } catch (e) {
        console.warn(`  ⚠️ Skipped log ${log.id}: ${e.message}`);
      }
    }
    console.log(`✅ Restored ${(backupData.tables.retro_request_status_log || []).length} status logs`);

    console.log('\n📥 Restoring financial_documents...');
    for (const doc of (backupData.tables.financial_documents || [])) {
      try {
        await prisma.financial_documents.upsert({
          where: { id: doc.id },
          update: doc,
          create: doc
        });
      } catch (e) {
        console.warn(`  ⚠️ Skipped document ${doc.id}: ${e.message}`);
      }
    }
    console.log(`✅ Restored ${(backupData.tables.financial_documents || []).length} financial documents`);

    console.log('\n✅ Database restore completed successfully!');

  } catch (e) {
    console.error('❌ Restore error:', e.message);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

// Get backup file from command line args if provided
const backupFile = process.argv[2];

restoreDatabase(backupFile)
  .then(() => {
    console.log('\n✅ All data restored!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Restore failed:', error);
    process.exit(1);
  });
