import React, { useState, useEffect } from 'react';
import {
  Box, HStack, VStack, Badge, Tooltip, Text, Icon, useDisclosure, 
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button,
  SimpleGrid, Card, CardBody, Divider
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, TimeIcon } from '@chakra-ui/icons';
import { vehicleAdminAPI } from '../../api/vehicleAdmin';
import VehicleAdministrationPanel from './AdministrationPanel';

const CT_APPOINTMENT_WARNING_DAYS = 30;

const getCtAdministrativeStatus = (latestCT, appointmentDate) => {
  if (!latestCT) return 'missing';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const appointment = appointmentDate ? new Date(appointmentDate) : null;
  const hasConformingReport = latestCT.ctStatus === 'passed' && Boolean(latestCT.attestationPath);

  if (appointment && !Number.isNaN(appointment.getTime())) {
    appointment.setHours(0, 0, 0, 0);
    const daysUntilAppointment = Math.ceil((appointment - now) / 86400000);
    const reportClosesAppointment = hasConformingReport && new Date(latestCT.ctDate) >= appointment;
    if (!reportClosesAppointment && daysUntilAppointment <= CT_APPOINTMENT_WARNING_DAYS) return 'warning';
  }

  const expirationDate = latestCT.nextCtDate
    ? new Date(latestCT.nextCtDate)
    : new Date(new Date(latestCT.ctDate).setFullYear(new Date(latestCT.ctDate).getFullYear() + 2));
  expirationDate.setHours(0, 0, 0, 0);

  if (now > expirationDate) return 'expired';
  return latestCT.ctStatus === 'passed' ? 'ok' : 'warning';
};

const VehicleAdminStatus = ({ parc }) => {
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    loadStatus();
  }, [parc]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const [cgRes, assRes, ctRes, certRes, certTempRes] = await Promise.all([
        vehicleAdminAPI.getCarteGrise(parc).catch(() => null),
        vehicleAdminAPI.getAssurance(parc).catch(() => null),
        vehicleAdminAPI.getControleTechnique(parc).catch(() => null),
        vehicleAdminAPI.getCertificatCession(parc).catch(() => null),
        vehicleAdminAPI.getCertificatTemporaire(parc).catch(() => null)
      ]);

      setStatus({
        carteGrise: cgRes?.newCGPath ? 'ok' : cgRes?.oldCGPath && certTempRes?.isActive ? 'tempCert' : 'missing',
        assurance: assRes?.isActive ? 'ok' : assRes?.dateValidityEnd ? 'expired' : 'missing',
        controleTechnique: getCtAdministrativeStatus(ctRes?.latestCT, ctRes?.appointmentDate),
        certificatCession: certRes?.imported ? 'ok' : 'missing',
        certificatTemporaire: certTempRes?.isActive ? 'ok' : 'missing'
      });
    } catch (error) {
      console.error('Error loading vehicle admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusDetails = [
    { key: 'carteGrise', label: 'Carte Grise', icon: '🚗', short: 'CG' },
    { key: 'assurance', label: 'Assurance', icon: '🔒', short: 'ASS' },
    { key: 'controleTechnique', label: 'Contrôle Technique', icon: '🔧', short: 'CT' },
    { key: 'certificatCession', label: 'Certificat Cession', icon: '📄', short: 'CERFA' }
  ];

  const getStatusColor = (statusKey) => {
    const s = status[statusKey];
    if (statusKey === 'carteGrise' && s === 'tempCert') return 'orange';
    if (statusKey === 'controleTechnique' && s === 'warning') return 'orange';
    return s === 'ok' ? 'green' : s === 'warning' ? 'yellow' : s === 'expired' ? 'red' : 'gray';
  };

  const getStatusIcon = (statusKey) => {
    const s = status[statusKey];
    if (statusKey === 'carteGrise' && s === 'tempCert') return '⏳';
    return s === 'ok' ? '✅' : s === 'warning' ? '⚠️' : s === 'expired' ? '❌' : '⭕';
  };

  const getStatusText = (statusKey) => {
    const s = status[statusKey];
    if (statusKey === 'carteGrise' && s === 'tempCert') return 'Tempor.';
    if (statusKey === 'controleTechnique' && s === 'warning') return 'Renouvellement prochainement';
    return s === 'ok' ? 'À jour' : s === 'warning' ? 'Attn.' : s === 'expired' ? 'Expiré' : 'Manquant';
  };

  if (loading) return null;

  return (
    <>
      {/* Version compacte pour la liste */}
      <HStack 
        spacing={2} 
        onClick={onOpen} 
        cursor="pointer"
        _hover={{ opacity: 0.8, transition: 'opacity 0.2s' }}
        w="full"
      >
        {statusDetails.map(detail => (
          <Tooltip 
            key={detail.key}
            label={`${detail.label}: ${getStatusText(detail.key)}`}
            placement="top"
          >
            <Badge 
              colorScheme={getStatusColor(detail.key)}
              fontSize="xs"
              px={2}
              py={1}
              borderRadius="md"
              whiteSpace="nowrap"
            >
              {detail.icon} {detail.short}
            </Badge>
          </Tooltip>
        ))}
      </HStack>

      {/* Modal avec vue détaillée améliorée */}
      <Modal isOpen={isOpen} onClose={onClose} size="5xl">
        <ModalOverlay />
        <ModalContent maxW="900px">
          <ModalHeader>
            <VStack align="start" spacing={0}>
              <Text>Administration Véhicule</Text>
              <Text fontSize="sm" color="gray.600" fontWeight="normal">Gestion des documents et statuts</Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={8}>
            {/* Vue de synthèse des statuts */}
            <Card mb={6} bg="gray.50">
              <CardBody>
                <VStack align="start" spacing={4}>
                  <Text fontWeight="bold" fontSize="lg">📋 Synthèse Administrative</Text>
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} w="full">
                    {statusDetails.map(detail => (
                      <VStack 
                        key={detail.key}
                        p={4}
                        bg="white"
                        borderRadius="md"
                        border="2px solid"
                        borderColor={getStatusColor(detail.key) + '.300'}
                        spacing={2}
                      >
                        <Text fontSize="2xl">{detail.icon}</Text>
                        <Text fontWeight="bold" textAlign="center" fontSize="sm">{detail.label}</Text>
                        <Badge 
                          colorScheme={getStatusColor(detail.key)}
                          fontSize="sm"
                          px={3}
                          py={1}
                        >
                          {getStatusIcon(detail.key)} {getStatusText(detail.key)}
                        </Badge>
                      </VStack>
                    ))}
                  </SimpleGrid>
                </VStack>
              </CardBody>
            </Card>

            <Divider my={4} />

            {/* Formulaires de gestion détaillés */}
            <VehicleAdministrationPanel parc={parc} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default VehicleAdminStatus;
