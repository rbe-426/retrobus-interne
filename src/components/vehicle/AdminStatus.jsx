import React, { useState, useEffect } from 'react';
import {
  Box, HStack, VStack, Badge, Tooltip, Text, Icon, useDisclosure, 
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, TimeIcon } from '@chakra-ui/icons';
import { vehicleAdminAPI } from '../../api/vehicleAdmin';
import VehicleAdministrationPanel from './AdministrationPanel';

const VehicleAdminStatus = ({ parc }) => {
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    loadStatus();
  }, [parc]);

  const loadStatus = async () => {
    try {
      setLoading(false);
      const [cgRes, assRes, ctRes, certRes] = await Promise.all([
        vehicleAdminAPI.getCarteGrise(parc).catch(() => null),
        vehicleAdminAPI.getAssurance(parc).catch(() => null),
        vehicleAdminAPI.getControleTechnique(parc).catch(() => null),
        vehicleAdminAPI.getCertificatCession(parc).catch(() => null)
      ]);

      setStatus({
        carteGrise: cgRes?.newCGPath ? 'ok' : 'missing',
        assurance: assRes?.isActive ? 'ok' : assRes?.dateValidityEnd ? 'expired' : 'missing',
        controleTechnique: ctRes?.latestCT ? (ctRes.latestCT.ctStatus === 'passed' ? 'ok' : 'warning') : 'missing',
        certificatCession: certRes?.imported ? 'ok' : 'missing'
      });
    } catch (error) {
      console.error('Error loading vehicle admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusDetails = [
    { key: 'carteGrise', label: 'CG', icon: '🚗' },
    { key: 'assurance', label: 'Assurance', icon: '🔒' },
    { key: 'controleTechnique', label: 'CT', icon: '🔧' },
    { key: 'certificatCession', label: 'Certificat', icon: '📄' }
  ];

  const getStatusColor = (statusKey) => {
    const s = status[statusKey];
    return s === 'ok' ? 'green' : s === 'warning' ? 'yellow' : s === 'expired' ? 'red' : 'gray';
  };

  const getStatusIcon = (statusKey) => {
    const s = status[statusKey];
    return s === 'ok' ? '✅' : s === 'warning' ? '⚠️' : s === 'expired' ? '❌' : '⭕';
  };

  if (loading) return null;

  return (
    <>
      <HStack spacing={2} onClick={onOpen} cursor="pointer">
        {statusDetails.map(detail => (
          <Tooltip 
            key={detail.key}
            label={detail.label}
            placement="top"
          >
            <Badge 
              colorScheme={getStatusColor(detail.key)}
              fontSize="md"
              p={2}
            >
              {detail.icon} {getStatusIcon(detail.key)}
            </Badge>
          </Tooltip>
        ))}
        <Text fontSize="xs" color="gray.500" ml={2}>Cliquer pour gérer</Text>
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Administration Véhicule {parc}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={8}>
            <VehicleAdministrationPanel parc={parc} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default VehicleAdminStatus;
