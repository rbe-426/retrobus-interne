/* Édition d'un véhicule existant */
import React, { useEffect, useState } from 'react';
import {
  Box, Heading, VStack, Input, Textarea, Button, SimpleGrid, Text, useToast, 
  HStack, Card, CardBody, Spinner, Center, FormControl, FormLabel
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import GalleryManager from '../components/vehicle/GalleryManager.jsx';
import CaracteristiquesEditor from '../components/vehicle/CaracteristiquesEditor.jsx';
import VehicleTechnicalInfoEditor from '../components/vehicle/VehicleTechnicalInfoEditor.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function VehiculeAdd() {
  const { parc } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/vehicles/${parc}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => {
        if (!r.ok) throw new Error('Véhicule introuvable');
        return r.json();
      })
      .then(vehicle => {
        // Assurer que gallery est un tableau (au cas où elle serait une chaîne JSON)
        if (vehicle && vehicle.gallery && typeof vehicle.gallery === 'string') {
          try {
            vehicle.gallery = JSON.parse(vehicle.gallery);
          } catch (e) {
            vehicle.gallery = [];
            console.warn('Impossible de parser gallery:', e);
          }
        }
        setData(vehicle);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erreur chargement:', error);
        toast({ status: 'error', title: 'Véhicule introuvable' });
        setLoading(false);
      });
  }, [parc, toast]);

  const updateField = (f, v) => {
    setData(d => d ? { ...d, [f]: v } : null);
  };

  const save = async () => {
    if (!data) return;
    
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
          subtitle: data.subtitle,
          etat: data.etat,
          immat: data.immat,
          energie: data.energie,
          miseEnCirculation: data.miseEnCirculation,
          description: data.description,
          history: data.history,
          caracteristiques: data.caracteristiques,
          // 🔴 NE PAS envoyer gallery ici - elle est gérée par GalleryManager via POST /gallery
          // gallery: data.gallery,
          isPublic: data.isPublic || false
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur sauvegarde');
      }

      toast({ status: 'success', title: 'Modifications enregistrées' });
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({ status: 'error', title: 'Erreur sauvegarde', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Center p={8}>
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text>Chargement du véhicule...</Text>
        </VStack>
      </Center>
    );
  }

  if (!data) {
    return (
      <Box p={8}>
        <VStack spacing={4}>
          <Heading color="red.600">Erreur</Heading>
          <Text>Impossible de charger le véhicule {parc}</Text>
          <Button onClick={() => navigate('/dashboard/vehicules')}>
            Retour à la liste
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={8}>
      <HStack mb={6}>
        <Button
          leftIcon={<FiArrowLeft />}
          variant="outline"
          onClick={() => navigate('/dashboard/vehicules')}
        >
          Retour
        </Button>
        <Heading>✏️ Édition - Véhicule {parc}</Heading>
      </HStack>

      <VStack align="stretch" spacing={6}>
        {/* Bloc identité */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">📋 Identité du véhicule</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel fontWeight="600">Marque</FormLabel>
                  <Input 
                    value={data.marque || ''} 
                    onChange={e => updateField('marque', e.target.value)}
                    placeholder="ex: Mercedes-Benz"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontWeight="600">Modèle</FormLabel>
                  <Input 
                    value={data.modele || ''} 
                    onChange={e => updateField('modele', e.target.value)}
                    placeholder="ex: Citaro"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontWeight="600">Sous-titre</FormLabel>
                  <Input 
                    value={data.subtitle || ''} 
                    onChange={e => updateField('subtitle', e.target.value)}
                    placeholder="ex: Un grand classique"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontWeight="600">Immatriculation</FormLabel>
                  <Input 
                    value={data.immat || ''} 
                    onChange={e => updateField('immat', e.target.value)}
                    placeholder="ex: FG-920-RE"
                  />
                </FormControl>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Bloc informations techniques */}
        <Card>
          <CardBody>
            <VehicleTechnicalInfoEditor 
              data={data}
              onUpdate={updateField}
            />
          </CardBody>
        </Card>

        {/* Bloc descriptions */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">📝 Descriptions</Heading>
              
              <FormControl>
                <FormLabel fontWeight="600">Description générale</FormLabel>
                <Textarea 
                  rows={4}
                  value={data.description || ''} 
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="Description générale du véhicule..."
                />
              </FormControl>

              <FormControl>
                <FormLabel fontWeight="600">Historique</FormLabel>
                <Textarea 
                  rows={5}
                  value={data.history || ''} 
                  onChange={e => updateField('history', e.target.value)}
                  placeholder="Historique, anecdotes, restaurations..."
                />
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Bloc caractéristiques */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">📋 Caractéristiques additionnelles</Heading>
              <CaracteristiquesEditor
                value={data.caracteristiques || []}
                onChange={list => updateField('caracteristiques', list)}
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
                onChange={gal => updateField('gallery', gal)}
                uploadEndpoint={`${API_BASE}/vehicles/${parc}/gallery`}
                deleteEndpoint={`${API_BASE}/vehicles/${parc}/gallery`}
                authHeader={`Bearer ${localStorage.getItem('token')}`}
              />
            </VStack>
          </CardBody>
        </Card>

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
            loadingText="Enregistrement..."
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
