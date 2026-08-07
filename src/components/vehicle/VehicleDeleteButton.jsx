/**
 * Composant pour la suppression d'un véhicule
 * Affiche un bouton avec une modale de confirmation
 */

import React, { useState } from 'react';
import {
  Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, 
  ModalFooter, ModalCloseButton, useDisclosure, useToast, Text, VStack,
  Box, HStack
} from '@chakra-ui/react';
import { FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function VehicleDeleteButton({ parc, marque, modele, onSuccess }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const expectedConfirmText = `DELETE ${parc}`;

  const handleDelete = async () => {
    if (confirmText !== expectedConfirmText) {
      toast({
        status: 'error',
        title: 'Confirmation incorrecte',
        description: `Veuillez taper exactement: ${expectedConfirmText}`
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/vehicles/${parc}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur lors de la suppression');
      }

      toast({
        status: 'success',
        title: 'Véhicule supprimé',
        description: `Le véhicule ${parc} a été supprimé avec succès`,
        duration: 3000
      });

      onClose();
      setConfirmText('');

      // Rediriger après un court délai
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else navigate('/dashboard/vehicules');
      }, 500);
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        status: 'error',
        title: 'Erreur suppression',
        description: error.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        leftIcon={<FiTrash2 />}
        colorScheme="red"
        variant="outline"
        onClick={onOpen}
        size="sm"
      >
        Supprimer ce véhicule
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
        <ModalOverlay backdropFilter="blur(5px)" />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={2} color="red.600">
              <FiAlertTriangle size={24} />
              <Text>Supprimer le véhicule?</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton isDisabled={isDeleting} />

          <ModalBody>
            <VStack align="stretch" spacing={4}>
              {/* Avertissement */}
              <Box bg="red.50" p={3} borderRadius="md" borderLeft="4px" borderColor="red.500">
                <Text fontWeight="600" color="red.700" mb={2}>
                  ⚠️ Action irréversible
                </Text>
                <Text fontSize="sm" color="red.600">
                  Cette action ne peut pas être annulée. Le véhicule {parc} ({marque} {modele}) et toutes ses données seront supprimés définitivement.
                </Text>
              </Box>

              {/* Données du véhicule */}
              <Box bg="gray.50" p={3} borderRadius="md">
                <Text fontWeight="600" fontSize="sm" mb={2}>Véhicule à supprimer:</Text>
                <VStack align="stretch" spacing={1} fontSize="sm">
                  <Text><strong>Parc:</strong> {parc}</Text>
                  <Text><strong>Marque:</strong> {marque || 'Non défini'}</Text>
                  <Text><strong>Modèle:</strong> {modele || 'Non défini'}</Text>
                </VStack>
              </Box>

              {/* Confirmation textuelle */}
              <Box>
                <Text fontWeight="600" fontSize="sm" mb={2}>
                  Pour confirmer, tapez: <code style={{ 
                    background: '#f0f0f0', 
                    padding: '2px 6px', 
                    borderRadius: '3px',
                    fontWeight: 'bold'
                  }}>{expectedConfirmText}</code>
                </Text>
                <input
                  type="text"
                  placeholder={expectedConfirmText}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                  disabled={isDeleting}
                  autoFocus
                />
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button
                variant="outline"
                onClick={onClose}
                isDisabled={isDeleting}
              >
                Annuler
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDelete}
                isLoading={isDeleting}
                loadingText="Suppression..."
                isDisabled={confirmText !== expectedConfirmText}
              >
                Supprimer définitivement
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
