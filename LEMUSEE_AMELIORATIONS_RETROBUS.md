# Le Musée - Améliorations pour Rétrobus Essonne

## 🚀 Changements Majeurs

### 1. Remplacement des Modals par des Drawers (Layout Latéral)

#### Avant (Modal centré)
```jsx
<Modal isOpen={stockModal.isOpen} onClose={stockModal.onClose} size="xl">
  <ModalOverlay />
  <ModalContent bg="gray.900" color="white">
    <ModalHeader>Titre</ModalHeader>
    <ModalCloseButton />
    <ModalBody>
      {/* Contenu */}
    </ModalBody>
    <ModalFooter>
      {/* Boutons */}
    </ModalFooter>
  </ModalContent>
</Modal>
```

#### Après (Drawer latéral)
```jsx
<Drawer
  isOpen={stockDrawer.isOpen}
  placement='right'
  onClose={stockDrawer.onClose}
  size='lg'
>
  <DrawerOverlay />
  <DrawerContent bg="gray.900" color="white">
    <DrawerCloseButton />
    <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
      <HStack>
        <FiPackage />
        <Text>Ajouter une pièce</Text>
      </HStack>
    </DrawerHeader>

    <DrawerBody>
      {/* Formulaire organisé avec sections */}
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="sm" mb={3} color="whiteAlpha.800">Informations générales</Heading>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Nom</FormLabel>
              <Input {...} />
            </FormControl>
            {/* Autres champs */}
          </VStack>
        </Box>

        <Divider borderColor="whiteAlpha.300" />

        <Box>
          <Heading size="sm" mb={3} color="whiteAlpha.800">Localisation</Heading>
          {/* Autres sections */}
        </Box>
      </VStack>
    </DrawerBody>

    <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
      <Button variant='outline' mr={3} onClick={stockDrawer.onClose}>
        Annuler
      </Button>
      <Button colorScheme='green' leftIcon={<FiSave />} onClick={saveStockItem}>
        Enregistrer
      </Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

### Avantages du Drawer
- ✅ Plus d'espace pour les formulaires complexes
- ✅ Meilleure organisation visuelle
- ✅ Contexte conservé (on voit la liste en fond)
- ✅ Parfait pour les fiches détaillées

---

## 🚗 Nouveaux Modules Spécifiques Rétrobus Essonne

### Module 1: VÉHICULES (Collection)

**Données étendues** :
```javascript
{
  id: 1,
  nom: 'Renault TN6C',
  ref: 'VEH-001',
  annee: 1952,
  constructeur: 'Renault',
  carrossier: 'Chausson',
  etat: 'Restauré',
  fonctionnel: true,
  immatriculation: '91-AB-123',
  kmCompteur: 245000,
  dateAcquisition: '2018-03-15',
  localisation: 'Hangar A',
  commentaires: 'Ex-RATP ligne 21. Restauration complète 2020-2022.',
  derniereRevision: '2026-06-10',
  prochaineSortie: '2026-09-15'
}
```

**Interface** :
- Cartes visuelles avec photo (placeholder)
- Badge état : Restauré (vert), En restauration (orange), À restaurer (rouge)
- Badge fonctionnel : ✅ ou ❌
- Indicateur kilométrage
- Prochaine sortie programmée
- Bouton "Fiche technique complète" → Drawer latéral

**Fiche technique (Drawer)** :
- Onglets : Général / Technique / Historique / Restauration / Photos
- Onglet Général : Infos de base, immatriculation, acquisition
- Onglet Technique : Motorisation, dimensions, capacité
- Onglet Historique : Ancien propriétaire, ligne exploitée, événements marquants
- Onglet Restauration : Travaux effectués, dates, responsables, photos avant/après
- Onglet Photos : Galerie d'images

---

### Module 2: RESTAURATIONS EN COURS

**Données** :
```javascript
{
  id: 1,
  vehicule: 'Saviem S105M',
  responsable: 'Martin Dupont',
  dateDebut: '2025-09-01',
  avancement: 45,
  taches: [
    { nom: 'Démontage moteur', statut: 'Terminé' },
    { nom: 'Révision moteur', statut: 'En cours' },
    { nom: 'Carrosserie', statut: 'À faire' }
  ],
  budget: 15000,
  depenses: 6750
}
```

**Interface** :
- Cartes par véhicule en restauration
- Barre de progression (%)
- Liste des tâches avec statuts colorés
- Budget : Alloué vs Dépensé
- Timeline des travaux
- Photos de progression

**Drawer détails** :
- Journal des travaux (date, intervenant, description)
- Ajout de tâches
- Suivi du budget détaillé
- Upload de photos
- Export PDF du rapport de restauration

---

### Module 3: DOCUMENTATION TECHNIQUE

**Données** :
```javascript
{
  id: 1,
  titre: 'Manuel technique Renault TN6C',
  type: 'Manuel',
  annee: 1952,
  auteur: 'Renault Véhicules Industriels',
  pages: 248,
  emplacement: 'Biblio-A12',
  numerise: true,
  fichierPDF: '/docs/manuel_tn6c.pdf'
}
```

**Interface** :
- Bibliothèque avec filtres (Type, Année, Constructeur)
- Badge "Numérisé" si disponible en PDF
- Recherche par titre/auteur
- Tableau avec : Titre, Type, Année, Emplacement physique

**Drawer détails** :
- Prévisualisation PDF si numérisé
- Informations complètes
- Bouton de téléchargement
- Notes/annotations
- Véhicules concernés (liens)

---

### Module 4: ÉVÉNEMENTS & SORTIES

**Données** :
```javascript
{
  id: 1,
  nom: 'Journées du Patrimoine',
  date: '2026-09-15',
  vehicule: 'Renault TN6C',
  lieu: 'Musée Évry',
  type: 'Exposition statique',
  participants: ['Martin', 'Sophie', 'Jean'],
  statut: 'Confirmé',
  heureRDV: '08:00',
  heureRetour: '18:00',
  materielNecessaire: ['Bâche', 'Panneau d\'info', 'Flyers']
}
```

**Interface** :
- Vue calendrier mensuel
- Liste des événements à venir
- Filtres par type : Exposition / Sortie roulante / Visite guidée / Rallye
- Badges statut : Confirmé (vert) / En préparation (orange) / Annulé (rouge)

**Drawer détails** :
- Informations complètes de l'événement
- Véhicule(s) prévu(s)
- Liste des bénévoles participants
- Matériel nécessaire (checklist)
- Itinéraire si sortie roulante
- Contact organisateur
- Notes post-événement
- Photos de l'événement

---

### Module 5: PIÈCES & STOCK (Amélioré)

**Nouvelles catégories** :
- Pièce mécanique (moteur, transmission, freins)
- Pièce carrosserie (tôles, vitres, joints)
- Électricité (câblage, feux, tableaux de bord)
- Accessoires (tickets, uniformes, plaques)
- Signalétique (panneaux destination, logos)
- Documentation (manuels, plans, revues)
- Consommables (huile, peinture, produits)

**Champs additionnels** :
- Fournisseur
- Prix d'achat
- Véhicule compatible (liaison)
- État d'origine / État actuel
- Photos
- Besoin d'achat (alertes stock bas)

---

### Module 6: BÉNÉVOLES (Amélioré)

**Champs spécifiques** :
- Compétences techniques : Mécanique diesel / Électricité / Carrosserie / Peinture / Soudure / Tôlerie
- Compétences médiation : Visite guidée / Animation scolaire / Langues
- Année d'adhésion
- Disponibilités (jours de la semaine)
- Véhicules de prédilection
- Formations suivies
- Certifications (soudure, habilitation électrique, etc.)

---

## 🎨 Organisation des Drawers

### Structure recommandée pour chaque Drawer

```jsx
<Drawer isOpen={...} onClose={...} size="lg" placement="right">
  <DrawerOverlay />
  <DrawerContent bg="gray.900" color="white">
    <DrawerCloseButton />
    
    <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
      <HStack>
        <FiIcon />
        <VStack align="start" spacing={0}>
          <Heading size="md">Titre principal</Heading>
          <Text fontSize="sm" color="whiteAlpha.600">Sous-titre descriptif</Text>
        </VStack>
      </HStack>
    </DrawerHeader>

    <DrawerBody>
      {/* UTILISER DES TABS pour organiser */}
      <Tabs colorScheme="purple" variant="enclosed">
        <TabList>
          <Tab>Général</Tab>
          <Tab>Détails</Tab>
          <Tab>Historique</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Section 1 */}
              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">
                  Informations de base
                </Heading>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Nom</FormLabel>
                    <Input />
                  </FormControl>
                  {/* Autres champs */}
                </VStack>
              </Box>

              <Divider borderColor="whiteAlpha.300" />

              {/* Section 2 */}
              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">
                  Localisation
                </Heading>
                {/* Champs */}
              </Box>
            </VStack>
          </TabPanel>

          <TabPanel>
            {/* Contenu onglet 2 */}
          </TabPanel>

          <TabPanel>
            {/* Contenu onglet 3 */}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </DrawerBody>

    <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
      <Button variant='outline' mr={3} onClick={...onClose}>
        Annuler
      </Button>
      <Button colorScheme='green' leftIcon={<FiSave />} onClick={...}>
        Enregistrer
      </Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

---

## 📊 Navigation Mise à Jour

### Ajout de nouveaux boutons de navigation

```jsx
<SimpleGrid columns={{ base: 2, md: 3, lg: 8 }} gap={4}>
  {[
    { key: 'dashboard', label: 'Dashboard', icon: FiTrendingUp },
    { key: 'vehicles', label: 'Véhicules', icon: FiTruck },      // NOUVEAU
    { key: 'restorations', label: 'Restaurations', icon: FiTool }, // NOUVEAU
    { key: 'stock', label: 'Pièces', icon: FiPackage },
    { key: 'docs', label: 'Documentation', icon: FiBook },        // NOUVEAU
    { key: 'events', label: 'Événements', icon: FiCalendar },     // NOUVEAU (remplace planning)
    { key: 'staff', label: 'Bénévoles', icon: FiUsers },
    { key: 'floor', label: 'Espaces', icon: FiMapPin }
  ].map(module => (
    <Button
      key={module.key}
      leftIcon={<module.icon />}
      onClick={() => setActiveModule(module.key)}
      colorScheme={activeModule === module.key ? 'purple' : 'gray'}
      variant={activeModule === module.key ? 'solid' : 'outline'}
      size="md"
      color={activeModule === module.key ? 'white' : 'whiteAlpha.800'}
      borderColor="whiteAlpha.300"
      _hover={{ borderColor: 'purple.400' }}
    >
      {module.label}
    </Button>
  ))}
</SimpleGrid>
```

---

## 🔧 Fonctionnalités Supplémentaires à Implémenter

### 1. Export PDF
- Fiche technique véhicule
- Rapport de restauration
- Liste d'inventaire
- Planning événements

### 2. Upload d'Images
- Photos véhicules (avant/après restauration)
- Photos événements
- Scan de documents
- Photos des pièces

### 3. Système de Tags
- Tags pour recherche rapide
- Tags véhicules : "Priorité restauration", "En état de rouler", "Pour pièces"
- Tags événements : "Public", "Privé", "Scolaire"
- Tags pièces : "Urgent", "À commander", "Stock bas"

### 4. Statistiques Dashboard
- Nombre de véhicules par état
- Progression des restaurations
- Budget consommé vs alloué
- Événements à venir ce mois
- Alertes stock bas
- Prochaines révisions techniques

### 5. Historique & Traçabilité
- Journal des modifications (qui, quand, quoi)
- Historique des sorties par véhicule
- Historique des travaux
- Traçabilité des pièces (d'où vient-elle, sur quel véhicule)

### 6. Recherche Avancée
- Recherche globale (tous modules)
- Filtres multiples
- Recherche par période
- Recherche par bénévole
- Recherche par véhicule

---

## 🎯 Ordre de Priorité d'Implémentation

### Phase 1 : Structure (FAIT ✅)
- [x] Données de démonstration
- [x] Imports des composants Drawer
- [x] États React pour nouveaux modules

### Phase 2 : Drawers Latéraux (EN COURS 🔄)
- [ ] Remplacer Modal Stock par Drawer Stock
- [ ] Remplacer Modal Staff par Drawer Staff
- [ ] Créer Drawer Véhicules avec onglets
- [ ] Créer Drawer Restaurations
- [ ] Créer Drawer Documentation
- [ ] Créer Drawer Événements

### Phase 3 : Modules d'Affichage
- [ ] Module Véhicules (cartes avec photos)
- [ ] Module Restaurations (barres de progression)
- [ ] Module Documentation (bibliothèque)
- [ ] Module Événements (calendrier)
- [ ] Améliorer module Pièces

### Phase 4 : Fonctionnalités Avancées
- [ ] Upload d'images
- [ ] Export PDF
- [ ] Recherche globale
- [ ] Statistiques Dashboard
- [ ] Système de tags

### Phase 5 : Backend API
- [ ] Tables Prisma pour nouveaux modules
- [ ] Routes API véhicules
- [ ] Routes API restaurations
- [ ] Routes API documentation
- [ ] Routes API événements
- [ ] Stockage fichiers (images, PDF)

---

## 💡 Exemple Complet : Drawer Véhicule

```jsx
<Drawer
  isOpen={vehicleDrawer.isOpen}
  placement='right'
  onClose={vehicleDrawer.onClose}
  size='xl'
>
  <DrawerOverlay />
  <DrawerContent bg="gray.900" color="white">
    <DrawerCloseButton />
    
    <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
      <HStack>
        <FiTruck fontSize="24px" />
        <VStack align="start" spacing={0}>
          <Heading size="md">
            {editingItem ? `Modifier ${editingItem.nom}` : 'Nouveau véhicule'}
          </Heading>
          <Text fontSize="sm" color="whiteAlpha.600">
            Collection Rétrobus Essonne
          </Text>
        </VStack>
      </HStack>
    </DrawerHeader>

    <DrawerBody>
      <Tabs colorScheme="purple" variant="enclosed">
        <TabList>
          <Tab><HStack><FiFileText /><Text>Général</Text></HStack></Tab>
          <Tab><HStack><FiSettings /><Text>Technique</Text></HStack></Tab>
          <Tab><HStack><FiClock /><Text>Historique</Text></HStack></Tab>
          <Tab><HStack><FiTool /><Text>Restauration</Text></HStack></Tab>
          <Tab><HStack><FiCamera /><Text>Photos</Text></HStack></Tab>
        </TabList>

        <TabPanels>
          {/* ONGLET GÉNÉRAL */}
          <TabPanel>
            <VStack spacing={6} align="stretch" pt={4}>
              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">
                  Identification
                </Heading>
                <VStack spacing={4}>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <FormControl>
                      <FormLabel>Nom du véhicule</FormLabel>
                      <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} placeholder="Renault TN6C" />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Référence</FormLabel>
                      <Input value={formData.ref || ''} onChange={(e) => setFormData({...formData, ref: e.target.value})} placeholder="VEH-001" />
                    </FormControl>
                  </Grid>

                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <FormControl>
                      <FormLabel>Année</FormLabel>
                      <NumberInput value={formData.annee || ''} onChange={(val) => setFormData({...formData, annee: val})}>
                        <NumberInputField placeholder="1952" />
                      </NumberInput>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Immatriculation</FormLabel>
                      <Input value={formData.immatriculation || ''} onChange={(e) => setFormData({...formData, immatriculation: e.target.value})} placeholder="91-AB-123" />
                    </FormControl>
                  </Grid>
                </VStack>
              </Box>

              <Divider borderColor="whiteAlpha.300" />

              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">
                  Construction
                </Heading>
                <VStack spacing={4}>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <FormControl>
                      <FormLabel>Constructeur</FormLabel>
                      <Select value={formData.constructeur || ''} onChange={(e) => setFormData({...formData, constructeur: e.target.value})}>
                        <option value="">Sélectionner...</option>
                        <option value="Renault">Renault</option>
                        <option value="Saviem">Saviem</option>
                        <option value="Berliet">Berliet</option>
                        <option value="Citroën">Citroën</option>
                        <option value="Autre">Autre</option>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Carrossier</FormLabel>
                      <Select value={formData.carrossier || ''} onChange={(e) => setFormData({...formData, carrossier: e.target.value})}>
                        <option value="">Sélectionner...</option>
                        <option value="Chausson">Chausson</option>
                        <option value="Heuliez">Heuliez</option>
                        <option value="Gruau">Gruau</option>
                        <option value="Autre">Autre</option>
                      </Select>
                    </FormControl>
                  </Grid>
                </VStack>
              </Box>

              <Divider borderColor="whiteAlpha.300" />

              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">
                  État actuel
                </Heading>
                <VStack spacing={4}>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <FormControl>
                      <FormLabel>État</FormLabel>
                      <Select value={formData.etat || ''} onChange={(e) => setFormData({...formData, etat: e.target.value})}>
                        <option value="Restauré">Restauré</option>
                        <option value="En restauration">En restauration</option>
                        <option value="À restaurer">À restaurer</option>
                        <option value="Pour pièces">Pour pièces</option>
                      </Select>
                    </FormControl>
                    <FormControl display="flex" alignItems="center" pt={8}>
                      <FormLabel htmlFor="fonctionnel" mb="0">
                        En état de rouler
                      </FormLabel>
                      <Switch id="fonctionnel" isChecked={formData.fonctionnel} onChange={(e) => setFormData({...formData, fonctionnel: e.target.checked})} colorScheme="green" />
                    </FormControl>
                  </Grid>

                  <FormControl>
                    <FormLabel>Localisation dans le musée</FormLabel>
                    <Select value={formData.localisation || ''} onChange={(e) => setFormData({...formData, localisation: e.target.value})}>
                      <option value="Hangar A">Hangar A - Véhicules</option>
                      <option value="Atelier B">Atelier B - Restauration</option>
                      <option value="Extérieur">Extérieur</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Commentaires</FormLabel>
                    <Textarea value={formData.commentaires || ''} onChange={(e) => setFormData({...formData, commentaires: e.target.value})} placeholder="Historique, particularités, travaux à prévoir..." rows={4} />
                  </FormControl>
                </VStack>
              </Box>
            </VStack>
          </TabPanel>

          {/* ONGLET TECHNIQUE */}
          <TabPanel>
            <VStack spacing={6} align="stretch" pt={4}>
              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">
                  Motorisation
                </Heading>
                <VStack spacing={4}>
                  {/* Champs moteur, puissance, carburant, etc. */}
                  <FormControl>
                    <FormLabel>Type de moteur</FormLabel>
                    <Input placeholder="Ex: Diesel 4 cylindres" />
                  </FormControl>
                </VStack>
              </Box>
            </VStack>
          </TabPanel>

          {/* ONGLET HISTORIQUE */}
          <TabPanel>
            <VStack spacing={6} align="stretch" pt={4}>
              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">
                  Provenance
                </Heading>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Date d'acquisition</FormLabel>
                    <Input type="date" value={formData.dateAcquisition || ''} onChange={(e) => setFormData({...formData, dateAcquisition: e.target.value})} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Ancien propriétaire</FormLabel>
                    <Input placeholder="Ex: RATP, SNCF, Ville de..." />
                  </FormControl>
                </VStack>
              </Box>
            </VStack>
          </TabPanel>

          {/* ONGLET RESTAURATION */}
          <TabPanel>
            <VStack spacing={6} align="stretch" pt={4}>
              <Text color="whiteAlpha.700">
                Voir module "Restaurations" pour le suivi détaillé
              </Text>
            </VStack>
          </TabPanel>

          {/* ONGLET PHOTOS */}
          <TabPanel>
            <VStack spacing={6} align="stretch" pt={4}>
              <Button leftIcon={<FiCamera />} colorScheme="blue" variant="outline">
                Ajouter des photos
              </Button>
              <Text color="whiteAlpha.600" fontSize="sm">
                Galerie à venir...
              </Text>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </DrawerBody>

    <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
      <Button variant='outline' mr={3} onClick={vehicleDrawer.onClose}>
        Annuler
      </Button>
      <Button colorScheme='green' leftIcon={<FiSave />} onClick={saveVehicle}>
        Enregistrer
      </Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

---

## 📝 Checklist d'Implémentation

### Étape 1 : Remplacer les imports
```diff
- Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
+ Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton,
```

### Étape 2 : Remplacer les useDisclosure
```diff
- const stockModal = useDisclosure();
+ const stockDrawer = useDisclosure();
```

### Étape 3 : Remplacer tous les appels
```diff
- stockModal.onOpen()
+ stockDrawer.onOpen()
```

### Étape 4 : Remplacer les composants JSX
Utiliser find & replace avec attention sur :
- `<Modal` → `<Drawer`
- `stockModal.isOpen` → `stockDrawer.isOpen`
- `stockModal.onClose` → `stockDrawer.onClose`
- Ajouter `placement='right'` et `size='lg'` aux Drawers

### Étape 5 : Ajouter les nouveaux modules
- Créer les états : `const [vehicles, setVehicles] = useState(DEMO_VEHICLES);`
- Créer les drawers : `const vehicleDrawer = useDisclosure();`
- Créer les fonctions save : `const saveVehicle = () => { ... }`
- Créer les composants d'affichage
- Créer les drawers d'édition

---

## 🎨 Design Pattern : Section dans Drawer

```jsx
<Box>
  <Heading size="sm" mb={3} color="whiteAlpha.800" display="flex" alignItems="center" gap={2}>
    <FiIcon />
    <Text>Titre de la section</Text>
  </Heading>
  <VStack spacing={4} pl={8}>
    {/* Contenu de la section */}
  </VStack>
</Box>
```

---

## 🚀 Résultat Final Attendu

### Layout Latéral
- Drawers qui s'ouvrent sur la droite
- Largeur `lg` ou `xl` selon la complexité
- Organisation en onglets pour les fiches détaillées
- Sections clairement séparées par des titres et dividers

### Modules Spécifiques RBE
- **Véhicules** : Fiche technique complète par véhicule
- **Restaurations** : Suivi de progression en temps réel
- **Documentation** : Bibliothèque technique organisée
- **Événements** : Planification des sorties et expo
- **Pièces** : Inventaire lié aux véhicules
- **Bénévoles** : Compétences techniques traçables

### UX Améliorée
- Plus d'espace pour les formulaires
- Contexte conservé (liste visible en arrière-plan)
- Navigation par onglets dans les fiches
- Sections organisées logiquement
- Visuels améliorés (badges, progress bars)

---

**Date** : 21 août 2026  
**Version** : 3.0.0 - Spécial Rétrobus Essonne  
**Statut** : Documentation prête - Implémentation en cours
