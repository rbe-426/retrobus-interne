import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Heading, VStack, Input, Textarea, Button, SimpleGrid, Text, useToast,
  FormControl, FormLabel, Switch, HStack, Divider, Card, CardBody,
  Spinner, Center, Alert, AlertIcon, Image as ChakraImage, IconButton
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiX } from 'react-icons/fi';
import GalleryManager from '../components/vehicle/GalleryManager.jsx';
import CaracteristiquesForm from '../components/vehicle/CaracteristiquesForm.jsx';
import VehicleTechnicalInfoEditor from '../components/vehicle/VehicleTechnicalInfoEditor.jsx';
import { vehicleSchema, showValidationErrors } from '../lib/validation.js';
import { apiClient } from '../api/config.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const normalizeVehicleState = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_');
  const aliases = {
    disponible: 'disponible',
    preserve: 'preservé',
    preservee: 'preservé',
    preservé: 'preservé',
    préservé: 'preservé',
    en_restauration: 'en_restauration',
    restauration: 'en_restauration',
    en_achat: 'en_achat',
    achat: 'en_achat',
    en_panne: 'en_panne',
    panne: 'en_panne',
    immobilise: 'immobilise',
    immobilisé: 'immobilise',
    maintenance: 'maintenance',
    reforme: 'reforme',
    reformé: 'reforme',
    a_venir: 'a_venir',
    à_venir: 'a_venir'
  };
  return aliases[normalized] || value || '';
};

const normalizeVehicleEnergy = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_');
  const aliases = {
    diesel: 'diesel',
    essence: 'essence',
    electrique: 'electrique',
    électrique: 'electrique',
    gpl: 'gpl',
    hybride: 'hybride',
    autre: 'autre'
  };
  return aliases[normalized] || value || '';
};

export default function VehiculeEdit() {
  const { parc } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState(null);
  const [thumbnailImagePreview, setThumbnailImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const draftKey = `vehicle_draft_${parc}`;

  // Auto-save draft to localStorage whenever data changes
  // Exclure les images base64 pour éviter de dépasser le quota localStorage
  useEffect(() => {
    if (data && parc) {
      try {
        const draftWithoutImages = {
          ...data,
          backgroundImage: data.backgroundImage?.startsWith('data:') ? null : data.backgroundImage,
          thumbnailImage: data.thumbnailImage?.startsWith('data:') ? null : data.thumbnailImage,
        };
        localStorage.setItem(draftKey, JSON.stringify(draftWithoutImages));
      } catch (e) {
        console.error('❌ Failed to save draft:', e.message);
      }
    }
  }, [data, parc]);

  // Restore draft from localStorage if saving failed
  const restoreDraftIfAvailable = () => {
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const draftData = JSON.parse(draft);
        console.log(`📥 [DRAFT RESTORE] Restored draft for parc ${parc} from localStorage`);
        return draftData;
      }
    } catch (e) {
      console.error('❌ Failed to restore draft:', e.message);
    }
    return null;
  };

  // Charger le véhicule
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        setLoading(true);
        const responseData = await apiClient.get(`/vehicles/${encodeURIComponent(parc)}`);
        const vehicleData = responseData.vehicle || responseData;
        
        // Ensure caracteristiques is always an array for the editor
        let caracteristiques = vehicleData.caracteristiques || [];
        if (typeof caracteristiques === 'string') {
          try {
            caracteristiques = JSON.parse(caracteristiques);
          } catch (e) {
            caracteristiques = [];
          }
        }
        // If it's an object (from normalizeVehicleWithCaracteristiques), extract the array
        if (caracteristiques && typeof caracteristiques === 'object' && !Array.isArray(caracteristiques)) {
          // Try to extract the original array - look for a `_raw` or similar
          // Otherwise reconstruct from the object keys
          caracteristiques = Object.entries(caracteristiques)
            .filter(([k, v]) => !k.startsWith('_') && k.length > 0)
            .map(([k, v]) => ({ label: k, value: v }))
            .slice(0, 20); // Limit to reasonable count
        }
        
        // Convertir les dates ISO (2004-04-27T00:00:00.000Z) en yyyy-MM-dd pour les inputs type="date"
        const toDateInput = (v) => v ? String(v).slice(0, 10) : '';

        setData({
          ...vehicleData,
          etat: normalizeVehicleState(vehicleData.etat),
          energie: normalizeVehicleEnergy(vehicleData.energie),
          miseEnCirculation: toDateInput(vehicleData.miseEnCirculation),
          caracteristiques: Array.isArray(caracteristiques) ? caracteristiques : [],
          gallery: vehicleData.gallery || []
        });
        
        // Afficher l'image de fond existante
        if (vehicleData.backgroundImage) {
          const bgUrl = vehicleData.backgroundImage.startsWith('http')
            ? vehicleData.backgroundImage
            : `${API_BASE}${vehicleData.backgroundImage}`;
          setBackgroundImagePreview(bgUrl);
        }

        // Afficher la miniature existante
        if (vehicleData.thumbnailImage) {
          const thumbUrl = vehicleData.thumbnailImage.startsWith('http')
            ? vehicleData.thumbnailImage
            : `${API_BASE}${vehicleData.thumbnailImage}`;
          setThumbnailImagePreview(thumbUrl);
        }
      } catch (e) {
        console.error('❌ Erreur chargement:', e);
        
        // Try to restore from draft
        const draft = restoreDraftIfAvailable();
        if (draft) {
          console.log('📥 Utilisé draft auto-sauvegardé');
          setData(draft);
          toast({ 
            status: 'warning', 
            title: 'Brouillon restauré',
            description: 'Les données précédentes ont été récupérées' 
          });
        } else {
          toast({ status: 'error', title: 'Erreur', description: 'Impossible de charger le véhicule' });
          navigate('/dashboard/vehicules');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [parc]);

  if (loading) {
    return (
      <Center h="400px">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!data) {
    return (
      <Box p={8}>
        <Alert status="error">
          <AlertIcon />
          Véhicule non trouvé
        </Alert>
      </Box>
    );
  }

  const updateField = (f, v) => {
    setData(d => {
      const updated = { ...d, [f]: v };
      // Mettre à jour la preview si c'est l'image de fond
      if (f === 'backgroundImage' && v) {
        const preview = v.startsWith('http') ? v : `${API_BASE}${v}`;
        setBackgroundImagePreview(preview);
      }
      return updated;
    });
  };

  const handleBackgroundImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log(`🔍 [UPLOAD] No background file selected`);
      return;
    }

    console.log(`🔍 [UPLOAD] Background image selected:`, {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target.result;
      console.log(`✅ [UPLOAD] Background image converted to BASE64 (${dataUri.length} bytes)`);
      console.log(`✅ [UPLOAD] Preview: ${dataUri.substring(0, 50)}...`);
      setBackgroundImagePreview(dataUri);
      updateField('backgroundImage', dataUri);
      toast({ status: 'success', title: 'Image de fond sélectionnée' });
    };
    reader.onerror = () => {
      console.error(`❌ [UPLOAD] Error reading background file`);
      toast({ status: 'error', title: 'Erreur lecture fichier' });
    };
    reader.readAsDataURL(file);
  };

  const handleThumbnailImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log(`🔍 [UPLOAD] No thumbnail file selected`);
      return;
    }

    console.log(`🔍 [UPLOAD] Thumbnail image selected:`, {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target.result;
      console.log(`✅ [UPLOAD] Thumbnail image converted to BASE64 (${dataUri.length} bytes)`);
      console.log(`✅ [UPLOAD] Preview: ${dataUri.substring(0, 50)}...`);
      setThumbnailImagePreview(dataUri);
      updateField('thumbnailImage', dataUri);
      toast({ status: 'success', title: 'Image miniature sélectionnée' });
    };
    reader.onerror = () => {
      console.error(`❌ [UPLOAD] Error reading thumbnail file`);
      toast({ status: 'error', title: 'Erreur lecture fichier' });
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    // 🔐 VALIDATION - Vérifier les données avant envoi
    const validationResult = vehicleSchema.validate(data);
    if (!validationResult.valid) {
      console.warn('❌ [VALIDATION] Erreurs détectées:', validationResult.errors);
      showValidationErrors(validationResult, toast);
      return; // Ne pas continuer si erreurs
    }
    console.log('✅ [VALIDATION] Tous les champs sont valides');

    setSaving(true);
    try {
      console.log(`\n🔍 [SAVE DEBUG] Starting save for parc: ${parc}`);
      console.log(`🔍 [SAVE DEBUG] Data keys:`, Object.keys(data || {}));
      console.log(`🔍 [SAVE DEBUG] backgroundImage length:`, data?.backgroundImage ? data.backgroundImage.length : 'null');
      console.log(`🔍 [SAVE DEBUG] thumbnailImage length:`, data?.thumbnailImage ? data.thumbnailImage.length : 'null');
      console.log(`🔍 [SAVE DEBUG] type:`, data?.type);
      
      const payload = {
        modele: data.modele,
        marque: data.marque,
        type: data.type,
        subtitle: data.subtitle,
        etat: data.etat,
        immat: data.immat,
        energie: data.energie,
        miseEnCirculation: data.miseEnCirculation,
        description: data.description,
        history: data.history,
        backgroundImage: data.backgroundImage,
        thumbnailImage: data.thumbnailImage,
        // Ensure caracteristiques is properly stringified if it's an array or object
        caracteristiques: Array.isArray(data.caracteristiques) 
          ? JSON.stringify(data.caracteristiques)
          : (typeof data.caracteristiques === 'string' ? data.caracteristiques : JSON.stringify(data.caracteristiques || [])),
        isPublic: data.isPublic
      };
      
      console.log(`🔍 [SAVE DEBUG] Sending payload, size: ${JSON.stringify(payload).length} bytes`);
      console.log(`🔍 [SAVE DEBUG] backgroundImage type:`, typeof payload.backgroundImage);
      console.log(`🔍 [SAVE DEBUG] backgroundImage preview:`, payload.backgroundImage ? payload.backgroundImage.substring(0, 50) : 'null');
      
      // Utiliser apiClient.put() au lieu de fetch() brut pour inclure automatiquement le token CSRF
      const result = await apiClient.put(`/vehicles/${parc}`, payload);
      
      console.log(`✅ [SAVE DEBUG] Response:`, result);

      toast({ 
        status: 'success', 
        title: 'Véhicule mis à jour',
        description: `Le véhicule ${parc} a été modifié avec succès`
      });
      
      // Clear draft after successful save
      try {
        localStorage.removeItem(draftKey);
        console.log(`🗑️ [DRAFT CLEANUP] Cleared draft for parc ${parc}`);
      } catch (e) {
        console.error('❌ Failed to clear draft:', e.message);
      }
      
      navigate('/dashboard/vehicules');
    } catch (e) {
      console.error('❌ Erreur sauvegarde:', e);
      toast({ 
        status: 'error', 
        title: 'Erreur sauvegarde',
        description: e.message 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={8}>
      <HStack mb={6}>
        <Button
          onClick={() => navigate('/dashboard/vehicules')}
          leftIcon={<FiArrowLeft />}
          variant="outline"
        >
          Retour
        </Button>
        <Heading>✏️ Éditer {parc}</Heading>
      </HStack>

      <VStack align="stretch" spacing={6}>
        {/* Bloc identité */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">📋 Identité du véhicule</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Numéro de parc</FormLabel>
                  <Input 
                    value={data.parc}
                    disabled
                    bg="gray.100"
                  />
                  <Text fontSize="xs" color="gray.500">Ne peut pas être modifié</Text>
                </FormControl>

                <FormControl>
                  <FormLabel>Marque</FormLabel>
                  <Input 
                    placeholder="ex: Mercedes-Benz"
                    value={data.marque || ''}
                    onChange={e => updateField('marque', e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Modèle</FormLabel>
                  <Input 
                    placeholder="ex: Citaro"
                    value={data.modele || ''}
                    onChange={e => updateField('modele', e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Type de véhicule</FormLabel>
                  <Input
                    as="select"
                    placeholder="Sélectionner le type"
                    value={data.type || ''}
                    onChange={e => updateField('type', e.target.value)}
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="Bus">Bus</option>
                    <option value="Voiture">Voiture</option>
                    <option value="Camion">Camion</option>
                    <option value="Train/Tram">Train/Tram</option>
                  </Input>
                </FormControl>

                <FormControl>
                  <FormLabel>Sous-titre</FormLabel>
                  <Input 
                    placeholder="ex: Un grand classique"
                    value={data.subtitle || ''}
                    onChange={e => updateField('subtitle', e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Immatriculation</FormLabel>
                  <Input 
                    placeholder="ex: FG-920-RE"
                    value={data.immat || ''}
                    onChange={e => updateField('immat', e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>État</FormLabel>
                  <Input 
                    placeholder="ex: Disponible, Préservé, En restauration..."
                    value={data.etat || ''}
                    onChange={e => updateField('etat', e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Énergie</FormLabel>
                  <Input 
                    placeholder="ex: Diesel"
                    value={data.energie || ''}
                    onChange={e => updateField('energie', e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Mise en circulation</FormLabel>
                  <Input 
                    type="date"
                    value={data.miseEnCirculation || ''}
                    onChange={e => updateField('miseEnCirculation', e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Bloc image miniature */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">🖼️ Image miniature de la carte</Heading>
              
              <FormControl>
                <FormLabel>Image de la carte véhicule</FormLabel>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Cette image s'affichera sur la carte dans la liste des véhicules
                </Text>
                <HStack spacing={4}>
                  <Button
                    colorScheme="blue"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Sélectionner une image
                  </Button>
                  {thumbnailImagePreview && (
                    <IconButton
                      icon={<FiX />}
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      onClick={() => {
                        setThumbnailImagePreview(null);
                        updateField('thumbnailImage', null);
                      }}
                      aria-label="Supprimer l'image"
                    />
                  )}
                </HStack>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailImageUpload}
                  display="none"
                />
              </FormControl>

              {thumbnailImagePreview && (
                <Box borderRadius="md" overflow="hidden" border="1px solid" borderColor="gray.200">
                  <ChakraImage
                    src={thumbnailImagePreview}
                    alt="Aperçu miniature"
                    w="100%"
                    h="180px"
                    objectFit="cover"
                  />
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Bloc image de fond */}
        <Card bg="purple.50" borderWidth={2} borderColor="purple.200">
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">🖼️ Image de fond (affichée publiquement)</Heading>
              
              {backgroundImagePreview && (
                <Box
                  position="relative"
                  borderRadius="md"
                  overflow="hidden"
                  bg="gray.200"
                  h="300px"
                >
                  <ChakraImage
                    src={backgroundImagePreview}
                    alt="Image de fond"
                    w="100%"
                    h="100%"
                    objectFit="cover"
                  />
                  <Button
                    position="absolute"
                    top={2}
                    right={2}
                    size="sm"
                    colorScheme="red"
                    onClick={() => updateField('backgroundImage', null)}
                    leftIcon={<FiX />}
                  >
                    Supprimer
                  </Button>
                </Box>
              )}

              <FormControl>
                <FormLabel>Télécharger une image de fond</FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageUpload}
                  p={2}
                />
                <Text fontSize="xs" color="gray.600" mt={2}>
                  💡 Cette image s'affiche en arrière-plan sur le site public. Format recommandé: 1920x1080px
                </Text>
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Bloc textes */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">📝 Descriptions</Heading>
              
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea 
                  rows={4}
                  placeholder="Description générale du véhicule..."
                  value={data.description || ''}
                  onChange={e => updateField('description', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Historique</FormLabel>
                <Textarea 
                  rows={5}
                  placeholder="Historique, anecdotes, restaurations..."
                  value={data.history || ''}
                  onChange={e => updateField('history', e.target.value)}
                />
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Bloc caractéristiques */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">⚙️ Caractéristiques techniques</Heading>
              <VehicleTechnicalInfoEditor 
                data={data}
                onUpdate={updateField}
              />
            </VStack>
          </CardBody>
        </Card>

        {/* Bloc caractéristiques additionnelles */}
        <Card bg="orange.50" borderWidth={2} borderColor="orange.200">
          <CardBody>
            <CaracteristiquesForm 
              value={data.caracteristiques || []}
              onChange={v => updateField('caracteristiques', v)}
              editable={true}
            />
          </CardBody>
        </Card>

        {/* Bloc galerie */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">🖼️ Galerie photos</Heading>
              <GalleryManager 
                value={data.gallery || []}
                onChange={v => updateField('gallery', v)}
                uploadEndpoint={`${API_BASE}/vehicles/${parc}/gallery`}
                deleteEndpoint={`${API_BASE}/vehicles/${parc}/gallery`}
                authHeader={`Bearer ${localStorage.getItem('token')}`}
              />
            </VStack>
          </CardBody>
        </Card>

        {/* Bloc publication */}
        <Card bg="green.50">
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">🌐 Publication sur le site public</Heading>
              
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1}>
                  Afficher ce véhicule sur le site public
                </FormLabel>
                <Switch 
                  isChecked={data.isPublic || false}
                  onChange={e => updateField('isPublic', e.target.checked)}
                  size="lg"
                  colorScheme="green"
                />
              </FormControl>

              <Text fontSize="sm" color="gray.600">
                {data.isPublic 
                  ? '✅ Ce véhicule est visible publiquement sur https://retrobus-essonne.fr' 
                  : '🔒 Ce véhicule n\'est visible que par les administrateurs'}
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Divider />

        {/* Boutons d'action */}
        <HStack spacing={4} justify="flex-end">
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard/vehicules')}
          >
            Annuler
          </Button>
          <Button
            colorScheme="blue"
            leftIcon={<FiSave />}
            isLoading={saving}
            loadingText="Sauvegarde..."
            onClick={save}
            size="lg"
          >
            Enregistrer les modifications
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
