# Backup - Structure avant généralisation du thème
Date: 2026-01-04

## État avant changements

### Header.jsx
- Structure: 2 colonnes (gradient coloré + logo à gauche, actions à droite)
- Gradient: Colors WIN (red, yellow, green, blue)
- Logo: 52px (mobile), 110px (desktop), positioned absolute left: 3-5
- Actions: absolutement positionnées à droite
- Hauteur: 56px (mobile), 80px (desktop)
- Responsive avec isMobile breakpoint

### Pages principales
- MyRBE: VStack spacing={2}, py={2}, gris clair
- DashboardHome: spacing réduit, footer color (gray.900)
- PageLayout: py={{base:2,md:4}}
- Footer: gray.900, py={6}, mt={4}

### Palette
- RBE: #d30c4c (couleur officielle)
- Gray.900: #0f172a (dark)
- Gradient actuel: Coloré (WIN colors)

### Points clés à sauvegarder
- Logique de flashes/announcements (toasts)
- Gestion de l'inactivité (10 minutes)
- Menu mobile (navDrawer)
- Navigation dynamique

## Nouveaux designs à appliquer

### Header nouveau
- Gris.900 uniforme (pas de gradient coloré)
- 120px fixe (ou responsive 80px base / 120px md)
- Logo fixe à gauche (ml: base 3, md 5)
- Navigation centrée (Dashboard, MyRBE, Véhicules, Événements)
- Infos user à droite (Admin badge + nom)
- Police menus: fontSize="lg"

### Généralisation
- Icones: gris.600 (pas de couleurs vives)
- Titres: color="black" (noir brut)
- Spacing: réduit (py={2-4}, spacing={2-3})
- Alerts: stylisées selon thème RBE

## Plan de rollback
1. Révert Header.jsx à version actuelle
2. Révert PageLayout.jsx
3. Révert Footer styling
4. Nettoyer route /test-theme si non désiré
