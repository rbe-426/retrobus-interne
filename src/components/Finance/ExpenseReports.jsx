import React, { useState, useEffect } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, useToast, Table, Thead, Tbody,
  Tr, Th, Td, Alert, AlertIcon, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel, Input,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Textarea, useDisclosure, Spinner, Flex, SimpleGrid,
  Stepper, Step, StepIndicator, StepStatus, StepIcon, StepNumber,
  StepTitle, StepDescription, StepSeparator
} from "@chakra-ui/react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { FiPlus, FiTrash2, FiDownload } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";
import "../../leaflet-custom.css";

const EXPENSE_REPORT_TYPES = [
  "Note de frais avec justificatif",
  "Demande d'avance sur frais",
  "Frais de déplacement"
];

const DEFAULT_EXPENSE_REPORT_TYPE = EXPENSE_REPORT_TYPES[0];

const EXPENSE_REPORT_TYPE_COLORS = {
  "Note de frais avec justificatif": "green",
  "Demande d'avance sur frais": "orange",
  "Frais de déplacement": "blue"
};

const EXPENSE_REPORT_TYPE_DETAILS = {
  "Note de frais avec justificatif": {
    description: "Remboursement d'une dépense déjà engagée.",
    hint: "Facture, reçu ou justificatif obligatoire.",
    descriptionPlaceholder: "Ex: Achat fournitures bureau",
    notesPlaceholder: "Fournisseur, contexte, centre de coût...",
    attachmentLabel: "Pièce justificative",
    attachmentHelp: "Formats acceptés: PDF, JPG, PNG"
  },
  "Demande d'avance sur frais": {
    description: "Demande de versement avant une dépense prévue.",
    hint: "Indiquez le motif et le montant estimé.",
    descriptionPlaceholder: "Ex: Avance carburant déplacement salon",
    notesPlaceholder: "Date prévue, motif, estimation détaillée...",
    attachmentLabel: "Document prévisionnel",
    attachmentHelp: "Optionnel: devis, ordre de mission ou estimation"
  },
  "Frais de déplacement": {
    description: "Déclaration liée à un trajet ou une mission.",
    hint: "Précisez le trajet, la mission et les frais associés.",
    descriptionPlaceholder: "Ex: Déplacement Massy - Évry",
    notesPlaceholder: "Trajet, kilomètres, mission, véhicule utilisé...",
    attachmentLabel: "Justificatif de déplacement",
    attachmentHelp: "Optionnel: ticket, péage, parking, ordre de mission"
  }
};

const NDF_WIZARD_STEPS = [
  { title: "Choix", description: "Type de note" },
  { title: "Saisie", description: "Montant et date" },
  { title: "Pièces", description: "Notes et justificatif" },
  { title: "Validation", description: "Récapitulatif" }
];

const TRAVEL_NDF_WIZARD_STEPS = [
  { title: "Choix", description: "Type de note" },
  { title: "Mission", description: "Nom et date" },
  { title: "Kilomètres", description: "Adresses et trajet" },
  { title: "Validation", description: "Récapitulatif" }
];

const KILOMETRIC_RATE_LABEL = "À définir plus tard";
const DEFAULT_MAP_CENTER = [48.8566, 2.3522];

const createEmptyTravelRoute = () => ({
  points: [],
  geometry: [],
  distanceKm: null,
  durationMin: null,
  source: null,
  roundTrip: false
});

const createDefaultTravelAddresses = () => ["", ""];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});

const mapStartIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const mapEndIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

function MileageMapBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [36, 36] });
    }
  }, [points, map]);

  return null;
}

function MileageRouteMap({ route }) {
  const points = route.points?.filter(Boolean).map(point => [point.lat, point.lng]) || [];
  const center = points[0] || DEFAULT_MAP_CENTER;

  return (
    <Box h={{ base: "320px", lg: "430px" }} borderRadius="lg" overflow="hidden" border="1px solid" borderColor="gray.200">
      <MapContainer center={center} zoom={points.length ? 11 : 7} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {route.geometry?.length > 0 && (
          <Polyline positions={route.geometry} color="#3b82f6" weight={5} opacity={0.9} />
        )}
        {route.points?.map((point, index) => {
          const isStart = index === 0;
          const isEnd = index === route.points.length - 1;

          return (
          <Marker key={`${point.lat}-${point.lng}-${index}`} position={[point.lat, point.lng]} icon={isStart ? mapStartIcon : isEnd ? mapEndIcon : undefined}>
            <Popup>{isStart ? "Départ" : isEnd ? "Arrivée" : `Étape ${index + 1}`}<br />{point.label}</Popup>
          </Marker>
          );
        })}
        <MileageMapBounds points={points} />
      </MapContainer>
    </Box>
  );
}

const normalizeSearchText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const expandAddressKeywords = (address) => {
  let expanded = address.trim();
  const normalized = normalizeSearchText(address);

  expanded = expanded
    .replace(/\bmcdo\b/gi, "McDonald's")
    .replace(/\bmcdonalds\b/gi, "McDonald's")
    .replace(/\bevry\b/gi, "Évry-Courcouronnes")
    .replace(/\bevry courcouronnes\b/gi, "Évry-Courcouronnes");

  const contextualQueries = [];

  if ((normalized.includes("mcdo") || normalized.includes("mcdonald")) && normalized.includes("massy")) {
    contextualQueries.push("McDonald's Massy centre");
  }

  if (normalized.includes("carrefour") && normalized.includes("evry")) {
    contextualQueries.push("Carrefour Le Spot Boulevard Valéry Giscard d'Estaing Évry-Courcouronnes");
  }

  return Array.from(new Set([
    address.trim(),
    expanded,
    `${expanded}, France`,
    ...contextualQueries
  ].filter(Boolean)));
};

const scoreGeocodeResult = (result, query) => {
  const haystack = normalizeSearchText([
    result.display_name,
    result.name,
    result.type,
    result.class,
    result.category
  ].filter(Boolean).join(" "));
  const tokens = normalizeSearchText(query).split(/\s+/).filter(token => token.length > 1);
  const tokenScore = tokens.reduce((score, token) => score + (haystack.includes(token) ? 4 : 0), 0);
  const importanceScore = Number(result.importance || 0) * 10;
  const poiScore = ["amenity", "shop", "tourism", "office", "leisure"].includes(result.class) ? 3 : 0;

  return tokenScore + importanceScore + poiScore;
};

const geocodeAddress = async (address) => {
  const queries = expandAddressKeywords(address);
  const results = [];

  for (const query of queries) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=8&addressdetails=1&extratags=1&namedetails=1&countrycodes=fr&q=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/json", "Accept-Language": "fr" }
    });

    if (!response.ok) throw new Error("Géocodage indisponible");

    const queryResults = await response.json();
    results.push(...queryResults.map(result => ({ ...result, query })));
  }

  if (!results?.length) throw new Error(`Adresse introuvable: ${address}`);

  const uniqueResults = Array.from(
    new Map(results.map(result => [`${result.lat},${result.lon}`, result])).values()
  );
  const bestResult = uniqueResults.sort((a, b) => scoreGeocodeResult(b, b.query) - scoreGeocodeResult(a, a.query))[0];

  return {
    label: bestResult.display_name,
    lat: Number(bestResult.lat),
    lng: Number(bestResult.lon),
    query: bestResult.query
  };
};

const calculateStraightLineKm = (start, end) => {
  const earthRadiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const deltaLat = toRad(end.lat - start.lat);
  const deltaLng = toRad(end.lng - start.lng);
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculateStraightLineRouteKm = (points) => points.slice(1).reduce((sum, point, index) => {
  return sum + calculateStraightLineKm(points[index], point);
}, 0);

const fetchRoadRoute = async (points) => {
  const coordStr = points.map(point => `${point.lng},${point.lat}`).join(";");
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`);

  if (!response.ok) throw new Error("Calcul d'itinéraire indisponible");

  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("Aucun itinéraire trouvé");

  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
  };
};

/**
 * ExpenseReports - Notes de frais
 * Accessible à TOUS les utilisateurs pour déposer des notes
 */
const ExpenseReports = () => {
  const {
    expenseReports,
    createExpenseReport,
    deleteExpenseReport,
    loading,
    loadFinanceData
  } = useFinanceData();

  // Charger les données au démarrage du composant
  useEffect(() => {
    console.log('📍 ExpenseReports component mounted, loading data...');
    loadFinanceData();
  }, [loadFinanceData]);

  // Récupérer l'utilisateur courant depuis localStorage
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  })();

  // Récupérer l'email depuis le token
  const userEmail = (() => {
    try {
      const token = localStorage.getItem('token') || '';
      if (token.startsWith('stub.')) {
        const emailB64 = token.slice(5);
        return atob(emailB64);
      }
    } catch (e) {
      console.error('❌ Erreur décodage token:', e);
    }
    return currentUser.email || currentUser.id || '';
  })();

  console.log('🔍 DEBUG ExpenseReports:');
  console.log('   Token:', localStorage.getItem('token'));
  console.log('   Decoded email:', userEmail);
  console.log('   CurrentUser:', currentUser);
  console.log('   All reports:', expenseReports);
  console.log('   Reports count:', expenseReports?.length || 0);

  // Afficher les notes de l'utilisateur courant OU les notes sans userId
  const myReports = expenseReports.filter(r => {
    const matches = !r.userId || r.userId === userEmail || r.userId === currentUser.id || r.createdBy === userEmail || r.createdBy === currentUser.email;
    if (!matches) {
      console.log(`   ❌ Filtered out:`, r.description, '- userId:', r.userId, '- createdBy:', r.createdBy, '- userEmail:', userEmail);
    } else {
      console.log(`   ✅ Included:`, r.description, '- Statut:', r.status);
    }
    return matches;
  });
  console.log(`💰 ${myReports.length}/${expenseReports.length} notes de frais affichées (utilisateur: ${userEmail})`);

  const [formData, setFormData] = useState({
    type: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    attachment: null,
    travelAddresses: createDefaultTravelAddresses(),
    travelRoundTrip: false
  });
  const [activeStep, setActiveStep] = useState(0);
  const [travelRoute, setTravelRoute] = useState(createEmptyTravelRoute());
  const [travelRouteLoading, setTravelRouteLoading] = useState(false);
  const [travelRouteError, setTravelRouteError] = useState("");

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const resetForm = () => {
    setFormData({
      type: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      attachment: null,
      travelAddresses: createDefaultTravelAddresses(),
      travelRoundTrip: false
    });
    setTravelRoute(createEmptyTravelRoute());
    setTravelRouteError("");
    setTravelRouteLoading(false);
    setActiveStep(0);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    onOpen();
  };

  const handleCloseCreateModal = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetTravelRoutePreview = () => {
    setTravelRoute(createEmptyTravelRoute());
    setTravelRouteError("");
  };

  const handleTravelAddressChange = (index, value) => {
    setFormData(prev => {
      const addresses = [...prev.travelAddresses];
      addresses[index] = value;
      return { ...prev, travelAddresses: addresses };
    });
    resetTravelRoutePreview();
  };

  const handleAddTravelAddress = () => {
    setFormData(prev => ({
      ...prev,
      travelAddresses: [...prev.travelAddresses, ""]
    }));
    resetTravelRoutePreview();
  };

  const handleRemoveTravelAddress = (index) => {
    setFormData(prev => ({
      ...prev,
      travelAddresses: prev.travelAddresses.filter((_, addressIndex) => addressIndex !== index)
    }));
    resetTravelRoutePreview();
  };

  const handleToggleRoundTrip = () => {
    setFormData(prev => ({ ...prev, travelRoundTrip: !prev.travelRoundTrip }));
    resetTravelRoutePreview();
  };

  const handleAmountChange = (value) => {
    setFormData(prev => ({
      ...prev,
      amount: value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      attachment: e.target.files?.[0] || null
    }));
  };

  const selectedTypeDetails = EXPENSE_REPORT_TYPE_DETAILS[formData.type];
  const isAttachmentRequired = formData.type === "Note de frais avec justificatif";
  const isTravelExpense = formData.type === "Frais de déplacement";
  const currentWizardSteps = isTravelExpense ? TRAVEL_NDF_WIZARD_STEPS : NDF_WIZARD_STEPS;
  const cleanedTravelAddresses = formData.travelAddresses.map(address => address.trim()).filter(Boolean);

  const handleCalculateTravelRoute = async () => {
    if (cleanedTravelAddresses.length < 2) {
      toast({
        title: "Adresses requises",
        description: "Saisissez au moins deux adresses pour calculer le trajet",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setTravelRouteLoading(true);
      setTravelRouteError("");

      const geocodedPoints = await Promise.all(cleanedTravelAddresses.map(address => geocodeAddress(address)));
      const routePoints = formData.travelRoundTrip ? [...geocodedPoints, geocodedPoints[0]] : geocodedPoints;

      try {
        const roadRoute = await fetchRoadRoute(routePoints);
        setTravelRoute({ points: geocodedPoints, ...roadRoute, source: "OSRM", roundTrip: formData.travelRoundTrip });
      } catch (routeError) {
        const fallbackDistance = calculateStraightLineRouteKm(routePoints);
        setTravelRoute({
          points: geocodedPoints,
          geometry: routePoints.map(point => [point.lat, point.lng]),
          distanceKm: fallbackDistance,
          durationMin: null,
          source: "ligne droite",
          roundTrip: formData.travelRoundTrip
        });
        setTravelRouteError(`${routeError.message}. Distance indicative en ligne droite.`);
      }
    } catch (error) {
      setTravelRoute(createEmptyTravelRoute());
      setTravelRouteError(error.message || "Impossible de calculer l'itinéraire");
    } finally {
      setTravelRouteLoading(false);
    }
  };

  const validateStep = (step = activeStep) => {
    if (step === 0 && !formData.type) {
      toast({
        title: "Type requis",
        description: "Choisissez le type de note avant de continuer",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return false;
    }

    if (step === 1) {
      const amount = parseFloat(formData.amount);
      if (!formData.description || (!isTravelExpense && (Number.isNaN(amount) || amount <= 0))) {
        toast({
          title: "Champs requis",
          description: isTravelExpense ? "Nom de la mission obligatoire" : "Description et montant positif sont obligatoires",
          status: "warning",
          duration: 3000,
          isClosable: true
        });
        return false;
      }
    }

    if (step === 2 && isTravelExpense) {
      if (cleanedTravelAddresses.length < 2) {
        toast({
          title: "Adresses requises",
          description: "Saisissez au moins deux adresses pour calculer le trajet",
          status: "warning",
          duration: 3000,
          isClosable: true
        });
        return false;
      }

      if (!travelRoute.distanceKm) {
        toast({
          title: "Trajet à calculer",
          description: "Calculez l'itinéraire avant de continuer",
          status: "warning",
          duration: 3000,
          isClosable: true
        });
        return false;
      }
    }

    if (step === 2 && isAttachmentRequired && !formData.attachment) {
      toast({
        title: "Justificatif requis",
        description: "Ajoutez une facture ou un reçu pour cette note",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep()) return;
    setActiveStep(prev => Math.min(prev + 1, currentWizardSteps.length - 1));
  };

  const handlePreviousStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    const amount = isTravelExpense && !formData.amount ? 0 : parseFloat(formData.amount);

    if (!formData.type || !formData.description || (!isTravelExpense && (Number.isNaN(amount) || amount <= 0))) {
      toast({
        title: "Champs requis",
        description: isTravelExpense ? "Type et nom de mission sont obligatoires" : "Type, description et montant positif sont obligatoires",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (isAttachmentRequired && !formData.attachment) {
      toast({
        title: "Justificatif requis",
        description: "Ajoutez une facture ou un reçu pour cette note",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (isTravelExpense && !travelRoute.distanceKm) {
      toast({
        title: "Trajet à calculer",
        description: "Calculez l'itinéraire avant de déposer la note",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    const travelNotes = isTravelExpense ? [
      "[Détails kilométriques]",
      ...cleanedTravelAddresses.map((address, index) => `${index === 0 ? "Départ" : `Étape ${index + 1}`}: ${address}`),
      `Aller-retour: ${formData.travelRoundTrip ? "Oui" : "Non"}`,
      `Distance parcourue: ${travelRoute.distanceKm?.toFixed(1)} km`,
      travelRoute.durationMin ? `Durée estimée: ${Math.round(travelRoute.durationMin)} min` : null,
      `Source itinéraire: ${travelRoute.source || "OSM/OSRM"}`,
      `Indice de remboursement kilométrique: ${KILOMETRIC_RATE_LABEL}`
    ].filter(Boolean).join("\n") : "";

    const finalNotes = [formData.notes, travelNotes].filter(Boolean).join("\n\n");

    try {
      const result = await createExpenseReport({
        type: formData.type,
        description: formData.description,
        amount,
        date: formData.date,
        notes: finalNotes,
        attachment: formData.attachment
      });

      if (result) {
        toast({
          title: "Note de frais déposée",
          description: "Votre note a été enregistrée et est en attente de validation",
          status: "success",
          duration: 3000,
          isClosable: true
        });

        resetForm();
        onClose();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la note de frais",
        status: "error",
        duration: 4000,
        isClosable: true
      });
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      try {
        await deleteExpenseReport(id);
        toast({
          title: "Supprimée",
          description: "La note de frais a été supprimée",
          status: "success",
          duration: 2000,
          isClosable: true
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer la note",
          status: "error"
        });
      }
    }
  };

  const getStatusBadge = (status) => {
    // Mapper les statuts de la BD aux statuts de l'app (même que ExpenseReportsManagement)
    const statusMap = {
      'open': 'PENDING',
      'PENDING': 'PENDING',
      'approved': 'APPROVED',
      'APPROVED': 'APPROVED',
      'paid': 'PAID',
      'PAID': 'PAID',
      'closed': 'REJECTED',
      'REJECTED': 'REJECTED',
    };
    
    const normalizedStatus = statusMap[status] || 'PENDING';
    
    const statusConfig = {
      PENDING: { colorScheme: "yellow", label: "✉️ Envoyée" },
      APPROVED: { colorScheme: "blue", label: "⏳ En cours de traitement" },
      PAID: { colorScheme: "green", label: "✅ Payée" },
      REJECTED: { colorScheme: "red", label: "❌ NDF refusée" }
    };
    const config = statusConfig[normalizedStatus] || statusConfig.PENDING;
    return <Badge colorScheme={config.colorScheme}>{config.label}</Badge>;
  };

  const getTypeBadge = (type) => {
    const label = type || DEFAULT_EXPENSE_REPORT_TYPE;
    return <Badge colorScheme={EXPENSE_REPORT_TYPE_COLORS[label] || "gray"}>{label}</Badge>;
  };

  const getAttachmentUrl = (report) => report.fileUrl || report.attachmentUrl || report.attachment;

  const getAttachmentLabel = (report) => report.fileName || report.attachmentFileName || "Pièce";

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  const totalAmount = myReports.reduce((sum, r) => sum + (r.amount || 0), 0);

  const renderWizardContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <VStack align="stretch" spacing={4}>
            <Box>
              <Heading size="sm">Choix de la note</Heading>
              <Text color="gray.500" fontSize="sm">
                Sélectionnez le parcours adapté à votre demande.
              </Text>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              {EXPENSE_REPORT_TYPES.map(type => {
                const colorScheme = EXPENSE_REPORT_TYPE_COLORS[type] || "gray";
                const details = EXPENSE_REPORT_TYPE_DETAILS[type];
                const isSelected = formData.type === type;

                return (
                  <Card
                    key={type}
                    as="button"
                    type="button"
                    textAlign="left"
                    borderWidth="2px"
                    borderColor={isSelected ? `${colorScheme}.500` : "gray.200"}
                    bg={isSelected ? `${colorScheme}.50` : "white"}
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{ borderColor: `${colorScheme}.400`, transform: "translateY(-2px)", shadow: "md" }}
                    onClick={() => setFormData(prev => ({ ...prev, type }))}
                  >
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <Badge alignSelf="flex-start" colorScheme={colorScheme}>{type}</Badge>
                        <Text fontSize="sm" color="gray.700">{details.description}</Text>
                        <Text fontSize="xs" color="gray.500">{details.hint}</Text>
                      </VStack>
                    </CardBody>
                  </Card>
                );
              })}
            </SimpleGrid>
          </VStack>
        );

      case 1:
        if (isTravelExpense) {
          return (
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Box>
                  <Heading size="sm">Mission et date</Heading>
                  <Text color="gray.500" fontSize="sm">Indiquez le nom de la mission concernée par les frais kilométriques.</Text>
                </Box>
                {getTypeBadge(formData.type)}
              </HStack>

              <FormControl isRequired>
                <FormLabel>Nom de la mission</FormLabel>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Ex: Mission événement Massy"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date de la mission</FormLabel>
                <Input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                />
              </FormControl>

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Indice de remboursement kilométrique</Text>
                  <Text fontSize="sm">{KILOMETRIC_RATE_LABEL}. Le montant sera donc enregistré à 0 € pour l'instant.</Text>
                </Box>
              </Alert>
            </VStack>
          );
        }

        return (
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Box>
                <Heading size="sm">Informations de la note</Heading>
                <Text color="gray.500" fontSize="sm">Renseignez l'objet, le montant et la date.</Text>
              </Box>
              {getTypeBadge(formData.type)}
            </HStack>

            <FormControl isRequired>
              <FormLabel>Description</FormLabel>
              <Input
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={selectedTypeDetails?.descriptionPlaceholder || "Description"}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Montant (€)</FormLabel>
              <NumberInput
                value={formData.amount}
                onChange={handleAmountChange}
                precision={2}
                step={0.01}
                min={0}
              >
                <NumberInputField placeholder="0.00" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Date</FormLabel>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
              />
            </FormControl>
          </VStack>
        );

      case 2:
        if (isTravelExpense) {
          return (
            <VStack spacing={4} align="stretch">
              <Box>
                <Heading size="sm">Détails kilométriques</Heading>
                <Text color="gray.500" fontSize="sm">Saisissez les adresses, puis calculez le trajet via OpenStreetMap/OSRM.</Text>
              </Box>

              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} alignItems="stretch">
                <Card borderWidth="1px" bg="white">
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      {formData.travelAddresses.map((address, index) => (
                        <FormControl key={index} isRequired={index < 2}>
                          <HStack justify="space-between" mb={2} align="center">
                            <FormLabel mb={0}>
                              {index === 0 ? "Adresse de départ" : index === 1 ? "Deuxième adresse" : `Adresse ${index + 1}`}
                            </FormLabel>
                            <HStack spacing={2}>
                              {index === 1 && (
                                <Button
                                  size="xs"
                                  variant={formData.travelRoundTrip ? "solid" : "outline"}
                                  colorScheme="blue"
                                  onClick={handleToggleRoundTrip}
                                >
                                  Aller-retour
                                </Button>
                              )}
                              {formData.travelAddresses.length > 2 && index > 1 && (
                                <Button size="xs" variant="ghost" colorScheme="red" leftIcon={<FiTrash2 />} onClick={() => handleRemoveTravelAddress(index)}>
                                  Retirer
                                </Button>
                              )}
                            </HStack>
                          </HStack>
                          <Input
                            value={address}
                            onChange={(event) => handleTravelAddressChange(index, event.target.value)}
                            placeholder={index === 0 ? "Ex: siège RBE Corbeil" : index === 1 ? "Ex: mcdo massy, carrefour evry, mairie paris..." : "Ex: étape, lieu, commerce ou adresse"}
                          />
                        </FormControl>
                      ))}

                      <Button leftIcon={<FiPlus />} variant="outline" colorScheme="blue" onClick={handleAddTravelAddress}>
                        Ajouter une adresse
                      </Button>

                      <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <Text fontSize="sm">
                          Les recherches acceptent les mots-clés: exemple "mcdo massy" ou "carrefour evry".
                        </Text>
                      </Alert>

                      <Button colorScheme="blue" onClick={handleCalculateTravelRoute} isLoading={travelRouteLoading}>
                        Calculer l'itinéraire
                      </Button>

                      {travelRouteError && (
                        <Alert status="warning" borderRadius="md">
                          <AlertIcon />
                          <Text fontSize="sm">{travelRouteError}</Text>
                        </Alert>
                      )}

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                        <Box p={3} bg="gray.50" borderRadius="md">
                          <Text fontSize="xs" color="gray.500">Kilomètres parcourus</Text>
                          <Heading size="sm" color="blue.600">
                            {travelRoute.distanceKm ? `${travelRoute.distanceKm.toFixed(1)} km` : "À calculer"}
                          </Heading>
                          {formData.travelRoundTrip && (
                            <Text fontSize="xs" color="blue.600">Aller-retour inclus</Text>
                          )}
                        </Box>
                        <Box p={3} bg="gray.50" borderRadius="md">
                          <Text fontSize="xs" color="gray.500">Indice remboursement km</Text>
                          <Heading size="sm" color="orange.600">À définir</Heading>
                        </Box>
                      </SimpleGrid>
                    </VStack>
                  </CardBody>
                </Card>

                <Card borderWidth="1px" bg="white">
                  <CardBody>
                    <MileageRouteMap route={travelRoute} />
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      Fond OpenStreetMap, tracé calculé via OSRM lorsque disponible.
                    </Text>
                  </CardBody>
                </Card>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Notes complémentaires</FormLabel>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder={selectedTypeDetails?.notesPlaceholder || "Trajet, kilomètres, mission, véhicule utilisé..."}
                  rows={3}
                />
              </FormControl>
            </VStack>
          );
        }

        return (
          <VStack spacing={4} align="stretch">
            <Box>
              <Heading size="sm">Pièces et précisions</Heading>
              <Text color="gray.500" fontSize="sm">Ajoutez les éléments utiles au traitement.</Text>
            </Box>

            <FormControl>
              <FormLabel>Notes supplémentaires</FormLabel>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder={selectedTypeDetails?.notesPlaceholder || "Détails additionnels..."}
                rows={4}
              />
            </FormControl>

            <FormControl isRequired={isAttachmentRequired}>
              <FormLabel>{selectedTypeDetails?.attachmentLabel || "Pièce justificative"}</FormLabel>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                size="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {selectedTypeDetails?.attachmentHelp || "Formats acceptés: PDF, JPG, PNG"}
              </Text>
              {formData.attachment && (
                <Badge mt={2} colorScheme="green" alignSelf="flex-start">
                  {formData.attachment.name}
                </Badge>
              )}
            </FormControl>
          </VStack>
        );

      default:
        return (
          <VStack spacing={4} align="stretch">
            <Box>
              <Heading size="sm">Validation</Heading>
              <Text color="gray.500" fontSize="sm">Relisez la demande avant dépôt.</Text>
            </Box>

            <Card bg="gray.50" borderWidth="1px">
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between" align="start">
                    <Box>
                      <Text fontSize="xs" color="gray.500">Type</Text>
                      {getTypeBadge(formData.type)}
                    </Box>
                    <Box textAlign="right">
                      <Text fontSize="xs" color="gray.500">Montant</Text>
                      <Heading size="sm" color="green.600">{formatCurrency(parseFloat(formData.amount))}</Heading>
                    </Box>
                  </HStack>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Description</Text>
                    <Text fontWeight="semibold">{formData.description}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Date</Text>
                    <Text>{formatDate(formData.date)}</Text>
                  </Box>
                  {formData.notes && (
                    <Box>
                      <Text fontSize="xs" color="gray.500">Notes</Text>
                      <Text>{formData.notes}</Text>
                    </Box>
                  )}
                  {isTravelExpense && (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Adresses du parcours</Text>
                        <VStack align="start" spacing={1} mt={1}>
                          {cleanedTravelAddresses.map((address, index) => (
                            <Text key={`${address}-${index}`} fontSize="sm">
                              {index === 0 ? "Départ" : `Étape ${index + 1}`} · {address}
                            </Text>
                          ))}
                        </VStack>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Aller-retour</Text>
                        <Text>{formData.travelRoundTrip ? "Oui" : "Non"}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Kilomètres parcourus</Text>
                        <Text fontWeight="bold">{travelRoute.distanceKm ? `${travelRoute.distanceKm.toFixed(1)} km` : "Non calculé"}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Indice remboursement km</Text>
                        <Text fontWeight="bold">{KILOMETRIC_RATE_LABEL}</Text>
                      </Box>
                    </SimpleGrid>
                  )}
                  <Box>
                    <Text fontSize="xs" color="gray.500">Pièce jointe</Text>
                    <Text>{formData.attachment?.name || "Aucune pièce jointe"}</Text>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        );
    }
  };

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">Mes notes de frais</Heading>
          <Text color="gray.500" fontSize="sm">
            Déposez vos notes de frais en attente de validation
          </Text>
        </Box>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="green"
          onClick={handleOpenCreateModal}
          isLoading={loading}
        >
          Nouvelle note
        </Button>
      </HStack>

      {/* Statistiques personnelles */}
      {myReports.length > 0 && (
        <Card>
          <CardBody>
            <HStack spacing={8}>
              <Box>
                <Text fontSize="sm" color="gray.500">Total déposé</Text>
                <Heading size="md" color="green.600">
                  {formatCurrency(totalAmount)}
                </Heading>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500">Notes en attente</Text>
                <Heading size="md" color="yellow.600">
                  {myReports.filter(r => r.status === "open").length}
                </Heading>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500">Notes remboursées</Text>
                <Heading size="md" color="green.600">
                  {formatCurrency(
                    myReports
                      .filter(r => r.status === "reimbursed")
                      .reduce((sum, r) => sum + (r.amount || 0), 0)
                  )}
                </Heading>
              </Box>
            </HStack>
          </CardBody>
        </Card>
      )}

      {/* Liste des notes */}
      {loading ? (
        <Flex justify="center" p={8}>
          <Spinner size="lg" />
        </Flex>
      ) : myReports.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          Aucune note de frais déposée pour le moment
        </Alert>
      ) : (
        <Card>
          <CardBody p={0}>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Description</Th>
                  <Th isNumeric>Montant</Th>
                  <Th>Statut</Th>
                  <Th>Auteur</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {myReports.map(report => (
                  <Tr key={report.id}>
                    <Td>{formatDate(report.date || report.createdAt)}</Td>
                    <Td>{getTypeBadge(report.type)}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="sm">
                          {report.description}
                        </Text>
                        {report.notes && (
                          <Text fontSize="xs" color="gray.500">
                            {report.notes}
                          </Text>
                        )}
                      </VStack>
                    </Td>
                    <Td isNumeric fontWeight="bold">
                      {formatCurrency(report.amount)}
                    </Td>
                    <Td>{getStatusBadge(report.status)}</Td>
                    <Td fontSize="xs" color="gray.600">
                      {report.createdBy || 'Anon'}
                    </Td>
                    <Td>
                      {report.status === "PENDING" && (
                        <Button
                          size="xs"
                          leftIcon={<FiTrash2 />}
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDelete(report.id)}
                        >
                          Supprimer
                        </Button>
                      )}
                      {getAttachmentUrl(report) && (
                        <Button
                          size="xs"
                          leftIcon={<FiDownload />}
                          variant="ghost"
                          colorScheme="blue"
                          as="a"
                          href={getAttachmentUrl(report)}
                          target="_blank"
                        >
                          {getAttachmentLabel(report)}
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* Modal de création */}
      <Modal isOpen={isOpen} onClose={handleCloseCreateModal} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxW={{ base: "96vw", xl: "1180px" }}>
          <ModalHeader>Nouvelle note de frais</ModalHeader>
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <Stepper index={activeStep} size="sm" colorScheme="green">
                {currentWizardSteps.map((step) => (
                  <Step key={step.title}>
                    <StepIndicator>
                      <StepStatus
                        complete={<StepIcon />}
                        incomplete={<StepNumber />}
                        active={<StepNumber />}
                      />
                    </StepIndicator>
                    <Box flexShrink="0">
                      <StepTitle>{step.title}</StepTitle>
                      <StepDescription>{step.description}</StepDescription>
                    </Box>
                    <StepSeparator />
                  </Step>
                ))}
              </Stepper>

              <Box minH={{ base: "360px", lg: "520px" }}>
                {renderWizardContent()}
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseCreateModal}>
              Annuler
            </Button>
            {activeStep > 0 && (
              <Button variant="outline" mr={3} onClick={handlePreviousStep}>
                Retour
              </Button>
            )}
            {activeStep < currentWizardSteps.length - 1 ? (
              <Button colorScheme="green" onClick={handleNextStep} isDisabled={activeStep === 0 && !formData.type}>
                Continuer
              </Button>
            ) : (
              <Button
                colorScheme="green"
                onClick={handleSubmit}
                isLoading={loading}
              >
                Déposer la note
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default ExpenseReports;
