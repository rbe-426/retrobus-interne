import React, { useMemo } from "react";
import {
  SimpleGrid,
  VStack,
  Text,
  Button,
  HStack,
  Box,
  useColorModeValue,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Heading,
  Badge,
  Spinner,
  Container
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import {
  FiDollarSign, FiPlus, FiCalendar, FiUsers, FiPackage,
  FiMail, FiGlobe, FiInbox, FiLifeBuoy, FiTool,
  FiTruck, FiShoppingCart, FiAlertCircle, FiAward, FiShoppingBag
} from "react-icons/fi";
import { FaPaintBrush } from "react-icons/fa";
import { useUser } from "../context/UserContext";
import { canAccess, RESOURCES } from "../lib/permissions";
import { useUserPermissions } from "../hooks/useUserPermissions";
import PageLayout from '../components/Layout/PageLayout';
import ModernCard from '../components/Layout/ModernCard';

const cards = [
  {
    title: "Le Musée",
    description: "",
    to: "/dashboard/rbe-lemusee",
    icon: null,
    titleImageSrc: "/myrbe_lemusee.png",
    titleImageAlt: "Le Musée",
    titleImageHeight: "62px",
    titleImageScale: 1.7,
    titleImageOffsetX: 0,
    titleImageOffsetY: 3,
    color: "gray",
    resource: null,
    cardAccess: true,
    cardProps: {
      bg: "black",
      borderColor: "gray.700",
      _hover: {
        transform: "translateY(-4px)",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.35), 0 10px 10px -5px rgba(0,0,0,0.25)",
        borderColor: "gray.500"
      }
    }
  },
  {
    title: "Trilogy RBE",
    description: "Aperçu du thème complet et éléments graphiques",
    to: "/dashboard/trilogy-rbe",
    icon: FaPaintBrush,
    color: "rbe",
    resource: null,
    cardAccess: true
  },
  {
    title: "RétroBus",
    description: "Suivi complet du parc, entretiens et pointages",
    to: "/dashboard/retrobus",
    icon: FiTool,
    color: "teal",
    resource: "VEHICLES",
    cardAccess: true,
    badge: { label: "Workspace", color: "teal" }
  },
  {
    title: "Gestion Financière",
    description: "Recettes, dépenses et opérations programmées",
    to: "/admin/finance-v2",
    icon: FiDollarSign,
    color: "rbe",
    resource: "FINANCE",
    cardAccess: true
  },
  {
    title: "Gestion des Événements",
    description: "Création, planification et suivi",
    to: "/dashboard/events-management",
    icon: FiCalendar,
    color: "green",
    resource: "EVENTS",
    cardAccess: true
  },
  {
    title: "Gestion RH",
    description: "Adhérents, stagiaires, cotisations et documents",
    to: "/dashboard/members-management",
    icon: FiUsers,
    color: "blue",
    resource: "MEMBERS",
    cardAccess: true
  },
  {
    title: "Gestion des Stocks",
    description: "Inventaire et matériel de l'association",
    to: "/dashboard/stock-management",
    icon: FiPackage,
    color: "yellow",
    resource: "STOCK",
    cardAccess: true
  },
  {
    title: "Gestion RétroMerch",
    description: "Boutique en ligne, produits et commandes",
    to: "/dashboard/retromerch",
    icon: FiShoppingBag,
    color: "red",
    resource: "RETROMERCH",
    cardAccess: true
  },
  {
    title: "Gestion Newsletter",
    description: "Abonnés et campagnes d'envoi",
    to: "/dashboard/newsletter",
    icon: FiMail,
    color: "purple",
    resource: "NEWSLETTER",
    cardAccess: true
  },
  {
    title: "Gestion du Site",
    description: "Changelog, contenu et mise à jour",
    to: "/dashboard/site-management",
    icon: FiGlobe,
    color: "pink",
    resource: "SITE_MANAGEMENT",
    cardAccess: true
  },
  {
    title: "RétroSupport",
    description: "Tickets: incidents, bugs et améliorations",
    to: "/dashboard/support",
    icon: FiLifeBuoy,
    color: "cyan",
    resource: "RETROSUPPORT",
    cardAccess: true
  },
  {
    title: "Planning partagés",
    description: "Événements et disponibilités pour les entretiens",
    to: "/dashboard/planning-rbe",
    icon: FiCalendar,
    color: "orange",
    cardAccess: false  // Visible par tous, pas de ressource
  }
];

export default function MyRBE() {
  const alertBg = useColorModeValue("blue.50", "blue.900");
  const alertBorder = useColorModeValue("blue.500", "blue.300");
  const { user, roles, customPermissions, isAdmin, matricule } = useUser();
  const userRole = roles?.[0] || 'MEMBER';
  const { permissions: userPermissions, loading: permissionsLoading } = useUserPermissions(user?.id);
  
  // 🏛️ Le Musée accessible uniquement en dev ou pour w.belaidi (production comprise)
  const isBelaidi = (
    matricule?.toLowerCase() === 'w.belaidi' ||
    user?.username?.toLowerCase() === 'w.belaidi' ||
    user?.email?.toLowerCase().includes('w.belaidi') ||
    user?.email?.toLowerCase() === 'w.belaidi@retrobus-essonne.fr'
  );
  const canAccessMuseum = import.meta.env.DEV || isBelaidi;

  /**
   * Vérifier si une carte doit être affichée (optimisé avec useMemo)
   */
  const shouldShowCard = useMemo(() => (card) => {
    if (card.title === 'Le Musée' && !canAccessMuseum) {
      return false;
    }

    // Si la carte est masquée, ne pas l'afficher (sauf pour ADMIN)
    if (card.hidden && !isAdmin) {
      return false;
    }

    // Les ADMIN voient TOUT
    if (isAdmin) {
      return true;
    }

    // Les prestataires et partenaires ne voient que RétroSupport et RétroDemandes
    if (userRole === 'PRESTATAIRE' || userRole === 'PARTENAIRE') {
      return card.title === 'RétroSupport' || card.title === 'RétroDemandes';
    }

    // Vérifier les rôles requis
    if (card.requiredRole && !card.requiredRole.some(role => roles.includes(role))) {
      return false;
    }

    // 🔒 Vérifier si l'utilisateur a une restriction DENY pour cette ressource
    if (card.resource) {
      const isDenied = userPermissions.some(p => 
        p.resource === card.resource && p.actions && p.actions.includes('DENY')
      );
      if (isDenied) {
        return false; // Masquer la carte si accès refusé
      }
    }

    // Si la carte nécessite une autorisation d'accès (cardAccess)
    if (card.cardAccess) {
      // Vérifier d'abord les permissions individuelles pour cette carte
      const hasCardPermission = userPermissions.some(p => p.resource === card.resource && p.actions && p.actions.includes('GRANT'));
      if (hasCardPermission) {
        return true;
      }

      // Pour les PARTENAIRES, l'accès aux cartes doit être accordé individuellement
      if (userRole === 'PARTENAIRE') {
        // Les partenaires ne voient la carte que s'ils ont une permission spécifique
        return false;
      }

      // Pour les autres rôles, l'accès est autorisé par défaut (sauf si pas de permissions)
      // Vérifier si le rôle a accès à la ressource
      if (card.resource) {
        const cardPermissionMap = {
          'VEHICLES': RESOURCES.VEHICLES,
          'EVENTS': RESOURCES.EVENTS,
          'PLANNING': RESOURCES.RETROPLANNING,
          'FINANCE': RESOURCES.FINANCE,
          'MEMBERS': RESOURCES.MEMBERS,
          'STOCK': RESOURCES.STOCK,
          'NEWSLETTER': RESOURCES.NEWSLETTER,
          'SITE_MANAGEMENT': RESOURCES.SITE_MANAGEMENT,
          'RETRODEMANDES': RESOURCES.RETRODEMANDES,
          'RETROMAIL': RESOURCES.RETROMAIL,
          'RETROSUPPORT': RESOURCES.RETROSUPPORT,
          'RETROMERCH': RESOURCES.RETROMERCH,
          'PERMISSIONS_MANAGEMENT': RESOURCES.PERMISSIONS_MANAGEMENT
        };

        const requiredResource = cardPermissionMap[card.resource];
        // Les rôles standards voient les cartes si elles correspondent à leurs permissions
        return !requiredResource || canAccess(userRole, requiredResource, customPermissions);
      }
      
      // Si pas de ressource spécifiée, afficher la carte
      return true;
    }

    // Les cartes sans ressource sont toujours visibles (ex: Mon Profil)
    return true;
  }, [userRole, isAdmin, customPermissions, userPermissions, canAccessMuseum, roles]);

  // Filtrer les cartes en fonction des permissions (optimisé avec useMemo)
  const visibleCards = useMemo(() => 
    cards.filter(shouldShowCard),
    [shouldShowCard]
  );

  if (permissionsLoading) {
    return (
      <Container maxW="container.xl" h="60vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="rbe.500" thickness="4px" />
          <Heading size="2xl" color="black" textAlign="center">
            Organisation des données
          </Heading>
          <Text fontSize="lg" fontStyle="italic" color="gray.600">
            Encore un instant...
          </Text>
        </VStack>
      </Container>
    );
  }

  return (
    <PageLayout
      title="Espace MyRBE"
      subtitle="Les outils d'administration RétroBus Essonne"
      headerVariant="card"
      bgGradient="linear(to-r, rbe.600, rbe.800)"
      titleSize="lg"
      titleWeight="700"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/home" },
        { label: "MyRBE", href: "/dashboard/myrbe" }
      ]}
    >
      <VStack spacing={2} align="stretch">
        {/* Grille des fonctionnalités */}
        {visibleCards.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {visibleCards.map((card) => (
                  card.isPlaceholder ? (
                    <ModernCard
                      key={card.title}
                      title={card.title}
                      description={card.description}
                      icon={card.icon}
                      color={card.color}
                      badge={card.badge}
                      opacity={0.6}
                      cursor="not-allowed"
                      _hover={{ transform: 'none' }}
                    />
                  ) : (
                    <ModernCard
                      key={card.title}
                      title={card.title}
                      description={card.description}
                      icon={card.icon}
                      titleImageSrc={card.titleImageSrc}
                      titleImageAlt={card.titleImageAlt}
                      titleImageHeight={card.titleImageHeight}
                      titleImageScale={card.titleImageScale}
                      titleImageOffsetX={card.titleImageOffsetX}
                      titleImageOffsetY={card.titleImageOffsetY}
                      {...(card.cardProps || {})}
                      color={card.color}
                      badge={card.badge}
                      as={RouterLink}
                      to={card.to}
                    />
                  )
                ))}
              </SimpleGrid>
            ) : (
              <Box
                bg={useColorModeValue('gray.50', 'gray.900')}
                borderRadius="md"
                p={12}
                textAlign="center"
                borderWidth="2px"
                borderStyle="dashed"
                borderColor={useColorModeValue('gray.300', 'gray.600')}
              >
                <HStack justify="center" mb={3}>
                  <FiAlertCircle size={32} color="gray.600" />
                </HStack>
                <Heading size="md" mb={2} color="black">Accès limité</Heading>
                <Text color="gray.600" mb={4}>
                  Vous n'avez pas accès aux fonctionnalités de MyRBE avec votre rôle et vos permissions actuels.
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Contactez un administrateur pour demander l'accès.
                </Text>
              </Box>
            )}
        

      </VStack>
    </PageLayout>
  );
}