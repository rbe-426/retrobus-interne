/**
 * VehiculeEdit.jsx
 * 
 * Page pour éditer un véhicule existant y compris:
 * - Les infos générales
 * - L'image de fond (backgroundImage)
 * - La visibilité publique (isPublic)
 * - La galerie de photos
 * - Les caractéristiques
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Heading, VStack, Input, Textarea, Button, SimpleGrid, Text, useToast,
  FormControl, FormLabel, Switch, HStack, Divider, Card, CardBody,
  Spinner, Center, Alert, AlertIcon, Image as ChakraImage, IconButton
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiX } from 'react-icons/fi';
import GalleryManager from '../components/vehicle/GalleryManager.jsx';
import CaracteristiquesEditor from '../components/vehicle/CaracteristiquesEditor.jsx';
import VehicleTechnicalInfoEditor from '../components/vehicle/VehicleTechnicalInfoEditor.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

  // Charger le véhicule
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/vehicles/${parc}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) {
          throw new Error('Véhicule non trouvé');
        }

        const vehicleData = await response.json();
        setData({
          ...vehicleData,
          caracteristiques: vehicleData.caracteristiques || [],
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
        toast({ status: 'error', title: 'Erreur', description: 'Impossible de charger le véhicule' });
        navigate('/dashboard/vehicules');
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

  const handleBackgroundImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Lire le fichier comme BASE64
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target.result;
      setBackgroundImagePreview(dataUri);
      updateField('backgroundImage', dataUri);
      toast({ status: 'success', title: 'Image de fond sélectionnée' });
    };
    reader.onerror = () => {
      toast({ status: 'error', title: 'Erreur lecture fichier' });
    };
    reader.readAsDataURL(file);
  };

  const handleThumbnailImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target.result;
      setThumbnailImagePreview(dataUri);
      updateField('thumbnailImage', dataUri);
      toast({ status: 'success', title: 'Image miniature sélectionnée' });
    };
    reader.onerror = () => {
      toast({ status: 'error', title: 'Erreur lecture fichier' });
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/vehicles/${parc}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
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
          caracteristiques: data.caracteristiques,
          isPublic: data.isPublic
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur modification');
      }

      toast({ 
        status: 'success', 
        title: 'Véhicule mis à jour',
        description: `Le véhicule ${parc} a été modifié avec succès`
      });
      
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

        {/* Bloc Caractéristiques additionnelles */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">📋 Caractéristiques additionnelles</Heading>
              <CaracteristiquesEditor 
                value={data.caracteristiques || []}
                onChange={v => updateField('caracteristiques', v)}
              />
            </VStack>
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
