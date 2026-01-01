#!/usr/bin/env node

/**
 * Script de nettoyage des logs
 * Supprime tous les console.log/warn inutiles, garde seulement les erreurs
 */

import fs from 'fs';
import path from 'path';

const filePath = './api/src/server.js';
let content = fs.readFileSync(filePath, 'utf-8');
const originalLength = content.split('\n').length;

// Patterns à supprimer (garder seulement les console.error)
const patterns = [
  // console.log avec les checks de prefix
  { regex: /\s+console\.log\(`🔐.*?\n/g, replacement: '' },
  { regex: /\s+console\.log\(`✅.*?\n/g, replacement: '' },
  { regex: /\s+console\.log\(`📨.*?\n/g, replacement: '' },
  { regex: /\s+console\.log\(`\s*✅.*?\n/g, replacement: '' },
  { regex: /\s+console\.log\('✅.*?\n/g, replacement: '' },
  
  // console.warn avec warning emoji
  { regex: /\s+console\.warn\('⚠️.*?\n/g, replacement: '' },
  
  // console.log avec les logs de debug
  { regex: /\s+console\.log\('✨.*?\n/g, replacement: '' },
  { regex: /\s+console\.log\('ℹ️.*?\n/g, replacement: '' },
  { regex: /\s+console\.log\('📝.*?\n/g, replacement: '' },
  { regex: /\s+console\.log\('📌.*?\n/g, replacement: '' },
  { regex: /\s+console\.log\('📦.*?\n/g, replacement: '' },
];

// Appliquer les remplacements
patterns.forEach(({ regex, replacement }) => {
  content = content.replace(regex, replacement);
});

// Supprimer les lines vides après suppressions
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

fs.writeFileSync(filePath, content, 'utf-8');

const newLength = content.split('\n').length;
console.log(`✅ Logs nettoyés!`);
console.log(`   Avant: ${originalLength} lignes`);
console.log(`   Après: ${newLength} lignes`);
console.log(`   Supprimées: ${originalLength - newLength} lignes`);
