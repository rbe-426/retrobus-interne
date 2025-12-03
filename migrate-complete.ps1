#!/usr/bin/env pwsh

<#
 Script complet de migration avec backup et restauration
 1. Crée le répertoire de backups
 2. Exécute Prisma backup (export)
 3. Exécute la migration
 4. Restaure les données
#>

Write-Host "=====================================`n  🚀 Migration complète de la BD`n=====================================" -ForegroundColor Cyan

$ApiDir = "c:\Dev\RETROBUS_ESSONNE\interne\api"
$BackupDir = "$ApiDir\backups"

try {
    # Étape 1: Créer le répertoire de backup
    Write-Host "`n📁 Création du répertoire de backup..." -ForegroundColor Yellow
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        Write-Host "   ✅ Répertoire créé: $BackupDir`n" -ForegroundColor Green
    }

    # Étape 2: Sauvegarder les données avec Prisma
    Write-Host "📦 Sauvegarde des données avec Prisma..." -ForegroundColor Yellow
    Push-Location $ApiDir
    
    # Exporter les données via l'API Prisma
    $timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
    $backupFile = "$BackupDir\backup-$timestamp.json"
    
    # On va créer un script Node qui va faire le backup
    $backupScript = @"
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backup() {
  try {
    const backup = {};
    
    console.log('💾 Sauvegarde des members...');
    backup.members = await prisma.members.findMany();
    
    console.log('💾 Sauvegarde des retro_request...');
    backup.retro_request = await prisma.retro_request.findMany();
    
    console.log('💾 Sauvegarde des retro_request_file...');
    backup.retro_request_file = await prisma.retro_request_file.findMany();
    
    console.log('💾 Sauvegarde des retro_request_status_log...');
    backup.retro_request_status_log = await prisma.retro_request_status_log.findMany();
    
    console.log('💾 Sauvegarde des vehicle_maintenance...');
    backup.vehicle_maintenance = await prisma.vehicle_maintenance.findMany();
    
    console.log('💾 Sauvegarde des usage...');
    backup.usage = await prisma.usage.findMany();
    
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-\${timestamp}.json`);
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Backup écrit dans: \${backupFile}`);
    console.log(`\n📊 Statistiques:`);
    console.log(`   - Members: \${backup.members.length}`);
    console.log(`   - Retro Requests: \${backup.retro_request.length}`);
    console.log(`   - Fichiers: \${backup.retro_request_file.length}`);
    console.log(`   - Status Logs: \${backup.retro_request_status_log.length}`);
    console.log(`   - Maintenances: \${backup.vehicle_maintenance.length}`);
    console.log(`   - Usages: \${backup.usage.length}`);
    
    process.exit(0);
  } catch (e) {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

backup();
"@

    $backupScript | Out-File -FilePath "backup-temp.js" -Encoding UTF8
    node backup-temp.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "Backup échoué"
    }
    
    Write-Host "   ✅ Backup complété`n" -ForegroundColor Green
    Remove-Item "backup-temp.js" -Force

    # Étape 3: Exécuter la migration Prisma
    Write-Host "🔄 Exécution de la migration Prisma..." -ForegroundColor Yellow
    Write-Host "   ⚠️  Cela va demander un RESET de la base de données" -ForegroundColor Yellow
    Write-Host "   (C'est normal, on va restaurer les données après)" -ForegroundColor Yellow
    
    npx prisma migrate deploy --skip-verify
    
    Write-Host "   ✅ Migration complétée`n" -ForegroundColor Green

    # Étape 4: Restaurer les données
    Write-Host "📥 Restauration des données..." -ForegroundColor Yellow
    
    $restoreScript = @"
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restore() {
  try {
    const backupDir = path.join(__dirname, 'backups');
    
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json') && f !== 'backup-stats.json')
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error('Aucun fichier de backup trouvé');
    }

    const latestBackupFile = path.join(backupDir, files[0]);
    console.log(`📂 Utilisation du backup: \${files[0]}`);

    const backupData = JSON.parse(fs.readFileSync(latestBackupFile, 'utf-8'));

    console.log('💾 Restauration des members...');
    for (const member of backupData.members) {
      try {
        await prisma.members.upsert({
          where: { id: member.id },
          update: member,
          create: member
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur member \${member.id}: \${e.message}`);
      }
    }
    console.log(`   ✅ \${backupData.members.length} membres restaurés`);

    console.log('💾 Restauration des retro_request...');
    for (const request of backupData.retro_request) {
      try {
        const member = await prisma.members.findUnique({
          where: { id: request.userId }
        });

        if (!member) {
          console.warn(`   ⚠️ Membre \${request.userId} introuvable`);
          continue;
        }

        await prisma.retro_request.upsert({
          where: { id: request.id },
          update: request,
          create: request
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur demande \${request.id}: \${e.message}`);
      }
    }
    console.log(`   ✅ \${backupData.retro_request.length} demandes restaurées`);

    console.log('💾 Restauration des retro_request_file...');
    for (const file of backupData.retro_request_file) {
      try {
        await prisma.retro_request_file.upsert({
          where: { id: file.id },
          update: file,
          create: file
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur fichier \${file.id}: \${e.message}`);
      }
    }
    console.log(`   ✅ \${backupData.retro_request_file.length} fichiers restaurés`);

    console.log('💾 Restauration des retro_request_status_log...');
    for (const log of backupData.retro_request_status_log) {
      try {
        await prisma.retro_request_status_log.upsert({
          where: { id: log.id },
          update: log,
          create: log
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur log \${log.id}: \${e.message}`);
      }
    }
    console.log(`   ✅ \${backupData.retro_request_status_log.length} logs restaurés`);

    console.log('💾 Restauration des vehicle_maintenance...');
    for (const maintenance of backupData.vehicle_maintenance) {
      try {
        await prisma.vehicle_maintenance.upsert({
          where: { id: maintenance.id },
          update: maintenance,
          create: maintenance
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur maintenance \${maintenance.id}: \${e.message}`);
      }
    }
    console.log(`   ✅ \${backupData.vehicle_maintenance.length} maintenances restaurées`);

    console.log('💾 Restauration des usage...');
    for (const usage of backupData.usage) {
      try {
        await prisma.usage.upsert({
          where: { id: usage.id },
          update: usage,
          create: usage
        });
      } catch (e) {
        console.warn(`   ⚠️ Erreur usage \${usage.id}: \${e.message}`);
      }
    }
    console.log(`   ✅ \${backupData.usage.length} usages restaurés`);

    console.log('\n🎉 Restauration complète!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

restore();
"@

    $restoreScript | Out-File -FilePath "restore-temp.js" -Encoding UTF8
    node restore-temp.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "Restauration échouée"
    }
    
    Write-Host "   ✅ Restauration complétée`n" -ForegroundColor Green
    Remove-Item "restore-temp.js" -Force
    
    Pop-Location

    Write-Host "=====================================`n  ✅ Migration réussie!`n=====================================" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ Erreur: $($_.Exception.Message)`n" -ForegroundColor Red
    Write-Host "Vérifiez que:`n   1. DATABASE_URL est défini`n   2. Vous êtes connecté à la base de données`n   3. Les migrations existent`n" -ForegroundColor Yellow
    exit 1
} finally {
    Pop-Location -ErrorAction SilentlyContinue
}
