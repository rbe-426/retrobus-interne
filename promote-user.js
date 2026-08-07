#!/usr/bin/env node
/**
 * Script pour promouvoir un utilisateur en admin
 * Usage: node promote-user.js <userId> <newRole>
 */

import prisma from './api/src/prisma-client.js';

const adminRoles = ['ADMIN', 'PRESIDENT', 'VICE_PRESIDENT', 'TRESORIER', 'SECRETAIRE_GENERAL'];

async function promoteUser() {
  const [nodeCmd, scriptPath, userId, newRole = 'ADMIN'] = process.argv;
  
  if (!userId) {
    console.log(`❌ Usage: node promote-user.js <userId> [newRole]`);
    console.log(`\n📋 Rôles disponibles: ${adminRoles.join(', ')}`);
    process.exit(1);
  }

  if (!adminRoles.includes(newRole)) {
    console.log(`❌ Rôle invalide: ${newRole}`);
    console.log(`✅ Rôles disponibles: ${adminRoles.join(', ')}`);
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log(`❌ Utilisateur avec ID ${userId} non trouvé`);
      process.exit(1);
    }

    console.log(`\n📝 Utilisateur avant:
  Email: ${user.email}
  Rôle: ${user.role}
`);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    });

    console.log(`✅ Utilisateur promu:
  Email: ${updated.email}
  Nouveau rôle: ${updated.role}
`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

promoteUser();
