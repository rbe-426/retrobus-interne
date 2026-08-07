/**
 * Composant réutilisable pour l'édition des caractéristiques techniques d'un véhicule
 * Utilisable en création ET édition
 * 
 * Permet de modifier:
 * - État (Disponible, Préservé, En restauration, En achat, etc.)
 * - Énergie (Diesel, Essence, Électrique, etc.)
 * - Mise en circulation (date)
 * - Immatriculation
 */

import React from 'react';
import {
  FormControl, FormLabel, Input, Select, SimpleGrid, VStack, Text, Box
} from '@chakra-ui/react';

// États possibles d'un véhicule
export const VEHICLE_STATES = [
  { value: 'disponible', label: '✅ Disponible', color: 'green' },
  { value: 'preservé', label: '🏛️ Préservé', color: 'blue' },
  { value: 'en_restauration', label: '🔧 En restauration', color: 'orange' },
  { value: 'en_achat', label: '🛒 En achat', color: 'yellow' },
  { value: 'en_panne', label: '⚠️ En panne', color: 'red' },
  { value: 'immobilise', label: '⛔ Immobilisé', color: 'red' },
  { value: 'maintenance', label: '🔩 Maintenance', color: 'orange' },
  { value: 'reforme', label: '📦 Réformé', color: 'gray' },
  { value: 'a_venir', label: '📅 À venir', color: 'gray' }
];

// Types d'énergie possibles
export const VEHICLE_ENERGY_TYPES = [
  { value: 'diesel', label: '⛽ Diesel' },
  { value: 'essence', label: '⛽ Essence' },
  { value: 'electrique', label: '⚡ Électrique' },
  { value: 'gpl', label: 'GPL' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'autre', label: 'Autre' }
];

export default function VehicleTechnicalInfoEditor({ 
  data = {},
  onUpdate = () => {},
  readOnly = false 
}) {
  const handleChange = (field, value) => {
    onUpdate(field, value);
  };

  return (
    <VStack align="stretch" spacing={6}>
      {/* Section État et Énergie */}
      <Box>
        <Text fontWeight="bold" mb={4} fontSize="lg">
          ⚙️ Informations techniques
        </Text>
        
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {/* État */}
          <FormControl>
            <FormLabel fontWeight="600">État du véhicule</FormLabel>
            <Select
              value={data.etat || 'disponible'}
              onChange={(e) => handleChange('etat', e.target.value)}
              isDisabled={readOnly}
              placeholder="Sélectionner l'état"
            >
              {VEHICLE_STATES.map(state => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </Select>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Statut du véhicule: {data.etat ? VEHICLE_STATES.find(s => s.value === data.etat)?.label : 'Non défini'}
            </Text>
          </FormControl>

          {/* Énergie */}
          <FormControl>
            <FormLabel fontWeight="600">Type d'énergie</FormLabel>
            <Select
              value={data.energie || ''}
              onChange={(e) => handleChange('energie', e.target.value)}
              isDisabled={readOnly}
              placeholder="Sélectionner l'énergie"
            >
              {VEHICLE_ENERGY_TYPES.map(energy => (
                <option key={energy.value} value={energy.value}>
                  {energy.label}
                </option>
              ))}
            </Select>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Carburant/Énergie du véhicule
            </Text>
          </FormControl>

          {/* Immatriculation */}
          <FormControl>
            <FormLabel fontWeight="600">Immatriculation</FormLabel>
            <Input
              type="text"
              placeholder="ex: FG-920-RE"
              value={data.immat || ''}
              onChange={(e) => handleChange('immat', e.target.value)}
              isReadOnly={readOnly}
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Numéro de plaque d'immatriculation
            </Text>
          </FormControl>

          {/* Mise en circulation */}
          <FormControl>
            <FormLabel fontWeight="600">Mise en circulation</FormLabel>
            <Input
              type="date"
              value={data.miseEnCirculation || ''}
              onChange={(e) => handleChange('miseEnCirculation', e.target.value)}
              isReadOnly={readOnly}
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Date de mise en service
            </Text>
          </FormControl>
        </SimpleGrid>
      </Box>

      {/* Infos supplémentaires */}
      <Box>
        <Text fontSize="xs" color="gray.600" p={3} bg="blue.50" borderRadius="md">
          ℹ️ <strong>Important:</strong> Toutes les informations techniques peuvent être modifiées à tout moment. 
          Ces données ne sont pas gelées et restent flexibles selon les besoins de gestion du parc.
        </Text>
      </Box>
    </VStack>
  );
}
