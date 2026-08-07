#!/usr/bin/env node

/**
 * Script pour générer les icônes PWA à partir de l'image univers_rbe.png
 * Alternative simple : copie l'image en attendant le redimensionnement manuel
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');
const sourceImage = path.join(publicDir, 'univers_rbe.png');

// Créer le dossier icons si nécessaire
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 Génération des icônes PWA...');
console.log('');

// Pour l'instant, copier l'image source comme placeholder
// L'utilisateur devra redimensionner manuellement ou utiliser un outil
const sizes = [
  { name: 'icon-192.png', size: '192x192' },
  { name: 'icon-512.png', size: '512x512' },
  { name: 'icon-maskable-512.png', size: '512x512' }
];

console.log('⚠️  Ce script copie univers_rbe.png comme placeholder.');
console.log('   Pour une PWA complète, redimensionnez les images aux bonnes tailles :');
console.log('');

sizes.forEach(({ name, size }) => {
  const dest = path.join(iconsDir, name);
  
  if (fs.existsSync(sourceImage)) {
    fs.copyFileSync(sourceImage, dest);
    console.log(`   ✅ ${name} (${size}) créé - À REDIMENSIONNER !`);
  } else {
    console.log(`   ❌ ${name} - Image source introuvable`);
  }
});

console.log('');
console.log('📋 Pour redimensionner les images :');
console.log('');
console.log('   Option 1 - En ligne (recommandé) :');
console.log('   https://www.iloveimg.com/resize-image');
console.log('   https://squoosh.app/');
console.log('');
console.log('   Option 2 - Avec ImageMagick :');
console.log('   magick convert univers_rbe.png -resize 192x192 icons/icon-192.png');
console.log('   magick convert univers_rbe.png -resize 512x512 icons/icon-512.png');
console.log('');
console.log('   Option 3 - Avec Node.js (sharp) :');
console.log('   npm install sharp');
console.log('   // puis utiliser sharp pour redimensionner');
console.log('');
console.log('✨ Script terminé !');
