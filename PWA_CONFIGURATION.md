# 📱 Configuration PWA - RétroBus Essonne (Interne)

## ✅ Configuration Complète

Le site interne RétroBus Essonne est maintenant configuré comme une **Progressive Web App (PWA)** compatible Android et iPhone.

---

## 📋 Fichiers Créés/Modifiés

### 1. **manifest.json** ✅
- **Emplacement** : `public/manifest.json`
- **Configuration** :
  - Nom : "RétroBus Essonne"
  - Nom court : "RBE"
  - Display : standalone (mode app)
  - Start URL : "/"
  - Theme color : `#d30c4c` (rouge RBE)
  - Background color : `#0f172a` (bleu foncé)

### 2. **Icônes PWA** ✅
- **Emplacement** : `public/icons/`
- **Fichiers** :
  - `icon-192.png` (192x192px)
  - `icon-512.png` (512x512px)
  - `icon-maskable-512.png` (512x512px, adaptable)

⚠️ Les icônes actuelles sont des copies de `univers_rbe.png`. Pour une optimisation parfaite, redimensionnez-les aux bonnes dimensions.

### 3. **Service Worker** ✅
- **Emplacement** : `public/service-worker.js`
- **Fonctionnalités** :
  - Cache des ressources statiques
  - Mode offline (cache-first pour assets, network-first pour pages)
  - Mise à jour automatique toutes les heures
  - Ignore les requêtes API (toujours en réseau)

### 4. **HTML Meta Tags** ✅
- **Fichier** : `index.html`
- **Balises ajoutées** :
  - `<link rel="manifest">` - Android PWA
  - `<meta name="theme-color">` - Couleur barre Android
  - `<meta name="mobile-web-app-capable">` - Android
  - `<meta name="apple-mobile-web-app-capable">` - iOS
  - `<meta name="apple-mobile-web-app-title">` - iOS
  - `<meta name="apple-mobile-web-app-status-bar-style">` - iOS
  - `<link rel="apple-touch-icon">` - Icône iOS

### 5. **Enregistrement Service Worker** ✅
- **Fichier** : `src/main.jsx`
- Enregistrement automatique au chargement
- Logs console pour debug
- Mise à jour périodique

---

## 🚀 Installation sur Mobile

### 📱 Android (Chrome, Edge, Samsung Internet)

1. **Ouvrir le site** : `https://www.retrobus-interne.fr`
2. **Menu navigateur** (⋮) → **Ajouter à l'écran d'accueil** ou **Installer l'application**
3. **Confirmer** l'installation
4. L'icône RBE apparaît sur l'écran d'accueil
5. **Lancer** l'app = mode plein écran, sans barre d'adresse

**Alternative** : Une bannière d'installation peut apparaître automatiquement après quelques visites.

### 🍎 iPhone/iPad (Safari)

1. **Ouvrir le site** dans Safari : `https://www.retrobus-interne.fr`
2. **Taper** sur le bouton **Partager** (icône avec flèche vers le haut)
3. **Défiler** et sélectionner **"Sur l'écran d'accueil"**
4. **Modifier** le nom si souhaité (RétroBus Essonne)
5. **Ajouter**
6. L'icône RBE apparaît sur l'écran d'accueil
7. **Lancer** l'app = mode plein écran

---

## 🧪 Test et Vérification

### 1. Test Local

```powershell
cd C:\Dev\RETROBUS_ESSONNE\interne
npm run dev
```

Ouvrir `http://localhost:5173` et vérifier dans la console :
```
✅ Service Worker enregistré: http://localhost:5173/
```

### 2. Test dans Chrome DevTools

1. **Ouvrir DevTools** (F12)
2. **Onglet Application**
3. **Manifest** : Vérifier les infos (nom, icônes, couleurs)
4. **Service Workers** : Vérifier l'enregistrement
5. **Storage** : Vérifier le cache

### 3. Test Lighthouse

1. **DevTools** → **Lighthouse**
2. Sélectionner **Progressive Web App**
3. **Générer le rapport**
4. Score cible : **90+/100**

### 4. Test sur Mobile

#### Android (Chrome Remote Debugging)
1. Connecter le téléphone en USB
2. Chrome → `chrome://inspect`
3. Ouvrir le site sur le mobile
4. Inspecter et vérifier les logs

#### iOS (Safari Web Inspector)
1. iPhone → Réglages → Safari → Avancé → Inspecteur Web (activer)
2. Mac → Safari → Développement → [Votre iPhone]
3. Ouvrir le site et inspecter

---

## 🎨 Personnalisation des Icônes

### Option 1 : Redimensionner avec un outil en ligne (Recommandé)

1. **Aller sur** : https://squoosh.app/ ou https://www.iloveimg.com/resize-image
2. **Uploader** : `public/univers_rbe.png`
3. **Redimensionner** :
   - 192x192px → Sauvegarder comme `icon-192.png`
   - 512x512px → Sauvegarder comme `icon-512.png`
   - 512x512px (avec padding 10%) → `icon-maskable-512.png`
4. **Remplacer** les fichiers dans `public/icons/`

### Option 2 : Avec ImageMagick (Terminal)

```powershell
# Installer ImageMagick si nécessaire
winget install ImageMagick.ImageMagick

# Redimensionner
cd C:\Dev\RETROBUS_ESSONNE\interne\public
magick convert univers_rbe.png -resize 192x192 icons/icon-192.png
magick convert univers_rbe.png -resize 512x512 icons/icon-512.png
magick convert univers_rbe.png -resize 512x512 -gravity center -extent 640x640 icons/icon-maskable-512.png
```

### Option 3 : Avec Node.js (sharp)

```bash
npm install sharp

# Créer un script
node -e "const sharp = require('sharp'); sharp('public/univers_rbe.png').resize(192, 192).toFile('public/icons/icon-192.png'); sharp('public/univers_rbe.png').resize(512, 512).toFile('public/icons/icon-512.png');"
```

---

## 🔧 Configuration Avancée

### Changer les Couleurs

**Fichier** : `public/manifest.json`

```json
{
  "theme_color": "#d30c4c",      // Couleur de la barre d'adresse (Android)
  "background_color": "#0f172a"  // Couleur de fond au lancement
}
```

**Fichier** : `index.html`

```html
<meta name="theme-color" content="#d30c4c" />
```

### Mode d'Affichage

Dans `manifest.json`, modifier `display` :

- `"standalone"` : Mode app complet (recommandé)
- `"fullscreen"` : Plein écran absolu (cache tout)
- `"minimal-ui"` : Minimal avec quelques contrôles
- `"browser"` : Comme un site web normal

### Orientation

```json
{
  "orientation": "any"  // any, portrait, landscape
}
```

---

## 📊 Fonctionnalités PWA

### ✅ Ce qui fonctionne

- ✅ **Installation** sur écran d'accueil (Android + iOS)
- ✅ **Mode standalone** (sans barre d'adresse)
- ✅ **Icône personnalisée** RBE
- ✅ **Couleurs de marque** (rouge + bleu foncé)
- ✅ **Cache offline** pour navigation basique
- ✅ **Mise à jour automatique** du service worker
- ✅ **Splash screen** au lancement (Android)

### 🚧 Limitations iOS

iOS a quelques limitations PWA :
- ❌ Pas de notifications push (iOS 16.4+)
- ❌ Pas d'accès complet aux fichiers
- ❌ Pas de partage natif complet
- ⚠️ Cache limité à 50 MB
- ⚠️ Service worker peut être tué si inactif

### 📝 À noter

- Le service worker ne fonctionne **que en HTTPS** (sauf localhost)
- Les caches sont **automatiquement nettoyés** lors des mises à jour
- Les **requêtes API** (`/api/*`) ne sont **jamais mises en cache**
- Le cache se remplit **progressivement** lors de la navigation

---

## 🐛 Dépannage

### Service Worker non enregistré

**Console** : `Service Worker registration failed`

**Solutions** :
1. Vérifier que le site est en **HTTPS**
2. Vérifier que `/service-worker.js` est accessible
3. Vérifier les **logs dans la console**
4. **Vider le cache** et recharger

```javascript
// Dans la console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  location.reload();
});
```

### Icônes ne s'affichent pas

**Solutions** :
1. Vérifier que les fichiers existent dans `/public/icons/`
2. Vérifier les chemins dans `manifest.json`
3. Vérifier la taille (192x192 et 512x512)
4. Format PNG recommandé (pas SVG pour iOS)

### App non installable

**Vérifier** :
1. ✅ Manifest valide (`/manifest.json` accessible)
2. ✅ Service worker enregistré
3. ✅ Site en HTTPS
4. ✅ Au moins 2 icônes (192 et 512)
5. ✅ `start_url` valide
6. ✅ `display: standalone`

**Chrome DevTools** → **Application** → **Manifest** pour diagnostiquer.

### Cache ne se met pas à jour

**Solution** :
```javascript
// Dans main.jsx, après l'enregistrement du SW
registration.update(); // Force la mise à jour
```

Ou **incrémenter** le nom du cache dans `service-worker.js` :
```javascript
const CACHE_NAME = 'retrobus-essonne-v2'; // v1 → v2
```

---

## 📚 Ressources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [iOS PWA Limitations](https://firt.dev/notes/pwa-ios/)
- [Manifest Generator](https://www.simicart.com/manifest-generator.html/)
- [Icon Generator](https://www.pwabuilder.com/imageGenerator)

---

## ✅ Checklist de Vérification

- [ ] `manifest.json` créé avec les bonnes couleurs
- [ ] 3 icônes créées dans `public/icons/`
- [ ] Icônes redimensionnées aux bonnes tailles
- [ ] `service-worker.js` créé et fonctionnel
- [ ] Balises HTML ajoutées dans `index.html`
- [ ] Service worker enregistré dans `main.jsx`
- [ ] Site déployé en HTTPS
- [ ] Test d'installation sur Android ✅
- [ ] Test d'installation sur iPhone ✅
- [ ] Lighthouse PWA score 90+ ✅

---

**🎉 Site RétroBus Essonne prêt pour installation mobile !**

Pour tester : https://www.retrobus-interne.fr
