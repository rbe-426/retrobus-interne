# 📚 Bibliothèque d'Icônes RetroBus

Guide pour créer et utiliser des icônes personnalisées dans l'application.

---

## 📁 Structure des Fichiers

```
interne/src/components/icons/
├── index.js                  # Point d'entrée - exporte toutes les icônes
├── TriangleErrorIcon.jsx    # Exemple : Triangle rouge avec !
├── BusIcon.jsx              # Vos icônes personnalisées
└── README.md                # Ce fichier
```

---

## 🎨 Format et Spécifications

### Format recommandé : **SVG en composant React**

**Taille standard :**
- ViewBox : `24x24` (recommandé) ou `32x32`
- Fichiers SVG optimisés avec [SVGOMG](https://jakearchibald.github.io/svgomg/)

**Couleurs :**
- Utiliser `currentColor` pour rendre l'icône adaptable
- Chakra UI appliquera automatiquement la couleur via la prop `color`

---

## ✨ Créer une Nouvelle Icône

### Méthode 1 : Depuis un SVG existant

1. **Optimiser votre SVG :**
   - Aller sur [SVGOMG](https://jakearchibald.github.io/svgomg/)
   - Uploader votre fichier
   - Activer "Remove viewBox" → OFF
   - Copier le code SVG optimisé

2. **Créer le composant :**

```jsx
// src/components/icons/BusIcon.jsx
import React from 'react';
import { Icon } from '@chakra-ui/react';

const BusIcon = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      d="M17 20H7V21C7 21.5523 6.55228 22 6 22H5C4.44772 22 4 21.5523 4 21V20H3V12H2V8H3V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V8H22V12H21V20H20V21C20 21.5523 19.5523 22 19 22H18C17.4477 22 17 21.5523 17 21V20ZM5 5V14H19V5H5ZM5 16V18H9V16H5ZM15 16V18H19V16H15Z"
      fill="currentColor"
    />
  </Icon>
);

export default BusIcon;
```

3. **Exporter dans index.js :**

```javascript
// src/components/icons/index.js
export { default as TriangleErrorIcon } from './TriangleErrorIcon';
export { default as BusIcon } from './BusIcon'; // ✅ Ajouter ici
```

---

### Méthode 2 : Créer un SVG personnalisé

```jsx
// Exemple : Icône maintenance (clé à molette)
import React from 'react';
import { Icon } from '@chakra-ui/react';

const MaintenanceIcon = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    {/* Forme principale */}
    <path
      d="M22 14.5L20.5 16L18 13.5L19.5 12C19.2 11.4 19 10.7 19 10C19 7.2 21.2 5 24 5V7C22.3 7 21 8.3 21 10C21 11.7 22.3 13 24 13V15C21.2 15 19 12.8 19 10Z"
      fill="currentColor"
    />
    {/* Détails */}
    <circle cx="8" cy="16" r="2" fill="currentColor" />
  </Icon>
);

export default MaintenanceIcon;
```

---

## 🚀 Utilisation dans le Code

### Import

```jsx
// Import une seule icône
import { TriangleErrorIcon } from '../components/icons';

// Import plusieurs icônes
import { TriangleErrorIcon, BusIcon, MaintenanceIcon } from '../components/icons';
```

### Utilisation avec Chakra UI

```jsx
// Taille et couleur personnalisées
<TriangleErrorIcon boxSize={6} color="red.500" />

// Responsive sizing
<BusIcon boxSize={{ base: 4, md: 6, lg: 8 }} color="blue.600" />

// Avec animation
<TriangleErrorIcon 
  boxSize={5} 
  color="red.500"
  sx={{ animation: 'pulse 2s ease-in-out infinite' }}
/>

// Dans un HStack/VStack
<HStack>
  <MaintenanceIcon boxSize={5} color="orange.500" />
  <Text>Maintenance requise</Text>
</HStack>
```

---

## 🎯 Bonnes Pratiques

### ✅ À Faire

- Utiliser `currentColor` pour la propriété `fill` ou `stroke`
- Définir un `viewBox` explicite (24x24 ou 32x32)
- Nommer les fichiers en PascalCase : `BusIcon.jsx`
- Optimiser les SVG avant de les convertir
- Documenter les icônes complexes avec des commentaires

### ❌ À Éviter

- Couleurs codées en dur (`fill="#FF0000"`)
- ViewBox manquant ou incorrect
- Chemins SVG non optimisés (trop de points)
- Fichiers trop lourds (>5KB)

---

## 📦 Bibliothèques d'Icônes Externes

Si vous n'avez pas besoin de personnalisation :

```jsx
// React Icons (déjà installé)
import { FiBus, FiTool, FiAlertTriangle } from 'react-icons/fi';

// Chakra UI Icons (déjà installé)
import { CheckIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';
```

---

## 🔗 Ressources Utiles

- **Optimiser SVG :** [SVGOMG](https://jakearchibald.github.io/svgomg/)
- **Icônes gratuites :** 
  - [Heroicons](https://heroicons.com/)
  - [Feather Icons](https://feathericons.com/)
  - [Lucide Icons](https://lucide.dev/)
- **Convertir SVG → React :** [SVGR Playground](https://react-svgr.com/playground/)
- **Documentation Chakra Icon :** [Chakra UI Icons](https://chakra-ui.com/docs/components/icon)

---

## 📝 Exemple Complet

```jsx
// src/pages/MonComposant.jsx
import React from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { TriangleErrorIcon, BusIcon } from '../components/icons';

function MonComposant() {
  return (
    <Box>
      {/* Alerte avec triangle */}
      <HStack spacing={3} p={4} bg="red.50" borderRadius="md">
        <TriangleErrorIcon boxSize={6} color="red.500" />
        <Text>Erreur critique détectée</Text>
      </HStack>

      {/* Icône bus */}
      <HStack mt={4}>
        <BusIcon boxSize={8} color="blue.600" />
        <Text fontSize="lg">920 véhicules dans le parc</Text>
      </HStack>
    </Box>
  );
}

export default MonComposant;
```

---

## ✨ Icônes Actuellement Disponibles

| Nom | Fichier | Usage |
|-----|---------|-------|
| `TriangleErrorIcon` | `TriangleErrorIcon.jsx` | Alertes d'erreur Trilogy |

**Ajoutez vos icônes ci-dessus au fur et à mesure !**
