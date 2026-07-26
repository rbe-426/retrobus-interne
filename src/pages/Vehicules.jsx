// src/pages/Vehicules.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Box, Heading, Input, SimpleGrid, Card, CardHeader, CardBody,
  Text, Badge, HStack, Spinner, Center, Button, Flex, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Image, VStack, Container
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { FiEdit, FiPlus, FiGrid } from 'react-icons/fi';
import { apiClient } from '../api/config.js'; // Import direct du client API

const MOBILE_POINTAGE_BASE = (import.meta.env.VITE_MOBILE_POINTAGE_BASE || 'https://www.retrobus-interne.fr').replace(/\/+$/, '');
const VEHICLES_CACHE_KEY = 'urbex:vehicules:list';
const VEHICLES_CACHE_TTL_MS = 10 * 60 * 1000;

const Vehicules = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [q, setQ] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const toast = useToast();
  const qrCanvasRef = useRef(null);

  const fetchList = useCallback(async (signal, options = {}) => {
    const { showLoading = true } = options;
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await apiClient.get('/vehicles', { signal });
      // L'endpoint retourne { vehicles: [...] }, on déstructure
      const vehicles = response.vehicles || response || [];
      const normalizedVehicles = Array.isArray(vehicles) ? vehicles : [];
      setData(normalizedVehicles);

      try {
        sessionStorage.setItem(
          VEHICLES_CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), data: normalizedVehicles })
        );
      } catch {
        // Ignore cache write errors
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        setData([]);
        toast({ 
          status: "error", 
          title: "Impossible de charger la liste",
          description: e.message
        });
      }
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [toast, data.length]);

  useEffect(() => {
    let hasFreshCache = false;

    try {
      const cachedRaw = sessionStorage.getItem(VEHICLES_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        const isFresh = cached?.timestamp && (Date.now() - cached.timestamp < VEHICLES_CACHE_TTL_MS);
        if (isFresh && Array.isArray(cached?.data) && cached.data.length > 0) {
          hasFreshCache = true;
          setData(cached.data);
          setLoading(false);
          setHasLoadedOnce(true);
        }
      }
    } catch {
      // Ignore cache read errors
    }

    const controller = new AbortController();
    fetchList(controller.signal, { showLoading: !hasFreshCache });
    return () => {
      controller.abort();
    };
  }, [fetchList]);

  const filtered = useMemo(() => {
    return data.filter(v => {
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return [v.parc, v.modele, v.marque, v.immat]
        .filter(Boolean)
        .some(field => field.toLowerCase().includes(needle));
    });
  }, [data, q]);

  const handleQRShow = (vehicle) => {
    setSelectedVehicle(vehicle);
    setQrModalOpen(true);
  };

  const downloadQR = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL();
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${selectedVehicle?.parc || 'vehicle'}.png`;
      a.click();
    }
  };

  return (
    <Box p={{ base: 3, md: 4, lg: 6 }}>
      <Flex 
        direction={{ base: 'column', md: 'row' }} 
        justify="space-between" 
        align={{ base: 'stretch', md: 'center' }} 
        mb={{ base: 4, md: 6 }}
        gap={{ base: 3, md: 0 }}
      >
        <VStack align="start" spacing={1}>
          <Heading color="black" size={{ base: "md", md: "lg" }}>🚘 Véhicules</Heading>
          <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">
            Créez, consultez et configurez le parc de véhicules de l'association
          </Text>
        </VStack>
        <Button
          as={RouterLink}
          to="/dashboard/vehicules/ajouter"
          leftIcon={<FiPlus />}
          colorScheme="rbe"
          size={{ base: "sm", md: "md" }}
          w={{ base: "full", md: "auto" }}
        >
          Ajouter un véhicule
        </Button>
      </Flex>

      <Box mb={{ base: 4, md: 6 }}>
        <Input
          placeholder="Rechercher par parc, modèle, marque ou immatriculation..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxW={{ base: "full", md: "400px" }}
          size={{ base: "sm", md: "md" }}
          borderColor="gray.200"
        />
      </Box>

      {loading ? (
        <Container maxW="container.xl" h="60vh" display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={4}>
            <Spinner size="xl" color="rbe.500" thickness="4px" />
            <Heading size="2xl" color="black" textAlign="center">
              Chargement des véhicules...
            </Heading>
            <Text fontSize="lg" fontStyle="italic" color="gray.600">
              On essaie de les garer mais Nour ne sais pas faire de créneaux...
            </Text>
          </VStack>
        </Container>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing={{ base: 3, md: 4 }}>
          {filtered.map((vehicle) => (
            <Card key={vehicle.parc} shadow="sm" borderColor="gray.200" borderWidth="1px">
              <CardHeader pb={2}>
                <HStack justify="space-between">
                  <Heading size={{ base: "xs", md: "sm" }} color="black">{vehicle.parc}</Heading>
                  <Badge colorScheme={vehicle.etat === 'disponible' ? 'green' : 'orange'} fontSize={{ base: "2xs", md: "xs" }}>
                    {vehicle.etat}
                  </Badge>
                </HStack>
              </CardHeader>
              {vehicle.thumbnailImage && (
                <Box px={{ base: 3, md: 4 }} pt={2}>
                  <Image
                    src={vehicle.thumbnailImage}
                    alt={vehicle.modele}
                    loading="lazy"
                    decoding="async"
                    htmlWidth={960}
                    htmlHeight={640}
                    w="100%"
                    h={{ base: "100px", md: "120px" }}
                    objectFit="cover"
                    borderRadius="md"
                    mb={2}
                  />
                </Box>
              )}
              <CardBody pt={vehicle.thumbnailImage ? 2 : 0} px={{ base: 3, md: 4 }}>
                <VStack align="start" spacing={2}>
                  <HStack spacing={2} align="center" flexWrap="wrap">
                    <Text fontSize={{ base: "xs", md: "sm" }}><strong>Modèle:</strong> {vehicle.modele || 'Non spécifié'}</Text>
                    {vehicle.type && (
                      <Badge colorScheme="cyan" fontSize="2xs">
                        {vehicle.type}
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize={{ base: "xs", md: "sm" }}><strong>Marque:</strong> {vehicle.marque || 'Non spécifiée'}</Text>
                  {vehicle.immat && <Text fontSize={{ base: "xs", md: "sm" }}><strong>Immat:</strong> {vehicle.immat}</Text>}
                  
                  <HStack spacing={2} pt={{ base: 2, md: 4 }} w="100%">
                    <Button
                      as={RouterLink}
                      to={`/dashboard/vehicules/${vehicle.parc}/edit`}
                      leftIcon={<FiEdit />}
                      size={{ base: "xs", md: "sm" }}
                      flex={1}
                      colorScheme="blue"
                    >
                      Éditer
                    </Button>
                    <Button
                      leftIcon={<FiGrid />}
                      size={{ base: "xs", md: "sm" }}
                      onClick={() => handleQRShow(vehicle)}
                    >
                      QR
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {filtered.length === 0 && !loading && hasLoadedOnce && (
        <Center py={20}>
          <Text color="gray.500">Aucun véhicule trouvé</Text>
        </Center>
      )}

      {/* Modal QR Code */}
      <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>QR Code - {selectedVehicle?.parc}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Box ref={qrCanvasRef}>
                <QRCodeCanvas
                  value={`${MOBILE_POINTAGE_BASE}/mobile/v/${encodeURIComponent(selectedVehicle?.parc || '')}`}
                  size={200}
                  level="M"
                />
              </Box>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                {`${MOBILE_POINTAGE_BASE}/mobile/v/${encodeURIComponent(selectedVehicle?.parc || '')}`}
              </Text>
              <Button onClick={downloadQR} colorScheme="blue">
                Télécharger
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Vehicules;
