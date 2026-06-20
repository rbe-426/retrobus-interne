import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import { 
  FiCheck, 
  FiAlertTriangle, 
  FiZap, 
  FiShield, 
  FiCode, 
  FiTrendingUp 
} from 'react-icons/fi';
import SidebarLayout from '../components/SidebarLayout';
import packageJson from '../../package.json';

export default function Changelogs() {
  const bgCard = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const changelogs = [
    {
      date: '2026-06-20',
      version: '2.6.2',
      title: 'Stabilisation Support + Annonces (runtime & exports)',
      type: 'patch',
      sections: [
        {
          category: 'fixes',
          icon: FiCheck,
          color: 'green',
          title: 'Corrections Critiques',
          items: [
            'Fix React hooks order sur SupportSite (Rendered more hooks than during the previous render)',
            'Fix crash Site Management annonces (.length sur valeur non tableau)',
            'Fix exports runtime Vite (hook useHomeAnnouncements extrait dans un module dédié)',
            'Fix import Dashboard avec composant d\'affichage annonces dédié',
            'Fix robustesse client API annonces pour plusieurs formats de réponse'
          ]
        },
        {
          category: 'features',
          icon: FiTrendingUp,
          color: 'blue',
          title: 'Évolutions UX',
          items: [
            'Labels annonces harmonisés: INFO=Annonce, WARNING=Attention, CRITICAL=Alerte majeure',
            'Affichage critique renforcé conservé sur les annonces prioritaires',
            'Préparation release journalière avec checklist de validation finale'
          ]
        }
      ]
    },
    {
      date: '2026-06-19',
      version: '2.6.1',
      title: 'Support Tickets, OAuth Search Console & Annonces Persistantes',
      type: 'major',
      sections: [
        {
          category: 'features',
          icon: FiTrendingUp,
          color: 'blue',
          title: 'Nouvelles Fonctionnalités Support',
          items: [
            'Ouverture détaillée des tickets avec timeline de suivi',
            'Option de sélecteur Résolu + Fermé en une action',
            'Action Archiver disponible pour les tickets fermés',
            'Onglet Archives des tickets visible uniquement pour les admins'
          ]
        },
        {
          category: 'fixes',
          icon: FiCheck,
          color: 'green',
          title: 'Corrections & Cohérence',
          items: [
            'Harmonisation des labels entre miniature ticket et modal détail',
            'Normalisation de l\'affichage auteur des commentaires historiques',
            'Notifications au créateur de ticket via ciblage user:<email> / user:<id>'
          ]
        },
        {
          category: 'features',
          icon: FiTrendingUp,
          color: 'blue',
          title: 'Nouvelles Fonctionnalités Plateforme',
          items: [
            'API Google Search Console via OAuth 2.0 (impressions, clics, CTR, position)',
            'Configuration OAuth déployable Railway sans Service Account',
            'Annonces d\'accueil persistantes côté serveur (Prisma + PostgreSQL)',
            'Interface admin complète pour gérer les annonces (INFO/WARNING/CRITICAL)',
            'Upload photos RétroActus avec URLs absolues (fix production)',
            'Reset compteurs analytics à zéro avec script dédié',
            'Graphiques Search Console interactifs avec hover tooltips',
            'Guide complet OAuth Search Console (GUIDE_SEARCH_CONSOLE_API.md)',
            'Harmonisation espacement dashboard (mt={4}, mt={6}, mt={8})',
            'Scripts check-production-traffic.mjs et reset-traffic-analytics.mjs'
          ]
        },
        {
          category: 'fixes',
          icon: FiCheck,
          color: 'green',
          title: 'Corrections Production Critiques',
          items: [
            'Fix préfixe /api/ manquant endpoints home-announcements (erreur HTML au lieu de JSON)',
            'Fix duplication composant HomeAnnouncementsManagement (erreur build Vercel)',
            'Fix URLs relatives → absolues uploads RétroActus (images cassées en prod)',
            'Fix formatRetroNewsForFrontend transforme /uploads/ en URLs absolues Railway',
            'Fix mediaUrl construction avec apiBaseUrl depuis env Railway',
            'Fix token CSRF pour uploads médias (getStoredCSRFToken dans MediaUploader)',
            'Fix endpoint analytics exempt CSRF (/api/public/traffic-event)',
            'Fix message OAuth Search Console en production (plus Service Account)',
            'Fix redéploiement Vercel forcé avec commit vide',
            'Fix normalizeRetroNewsForPrisma (champs media et polls)',
            'Fix CORS pour site externe www.association-rbe.fr',
            'Fix Prisma schema sync production (table HomeAnnouncement)',
            'Fix client API endpoints cohérence avec serveur (/api/ prefix)'
          ]
        },
        {
          category: 'security',
          icon: FiShield,
          color: 'orange',
          title: 'Sécurité',
          items: [
            'OAuth 2.0 Search Console (plus sécurisé que Service Account)',
            'Credentials OAuth ajoutés à .gitignore (oauth_credentials.json)',
            'Variables Railway sécurisées (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)',
            'Vérification propriété Search Console avec fichier googleaaa88f684a803b21.html',
            'Protection GitHub Push (secrets détectés et exclus automatiquement)',
            'Guide déploiement production sans exposer les tokens'
          ]
        },
        {
          category: 'performance',
          icon: FiZap,
          color: 'purple',
          title: 'Performance & Infrastructure',
          items: [
            'Prisma HomeAnnouncement model avec indexes (active, expiresAt, createdAt)',
            'API endpoints persistants (GET, POST, DELETE, PATCH annonces)',
            'Hook useHomeAnnouncements avec fallback localStorage sur erreur',
            'formatRetroNewsForFrontend transforme URLs relatives en absolues',
            'Logs détaillés OAuth "🔐 Using OAuth 2.0 for Search Console API"',
            'Traffic analytics 27 événements enregistrés avant reset',
            'Multer diskStorage avec 50MB max pour médias RétroActus'
          ]
        },
        {
          category: 'docs',
          icon: FiCode,
          color: 'pink',
          title: 'Documentation',
          items: [
            'GUIDE_SEARCH_CONSOLE_API.md complet (376 lignes)',
            'GUIDE_DEPLOIEMENT_FIXES_PRODUCTION.md avec checklist Railway',
            'Instructions OAuth 2.0 avec troubleshooting org_internal',
            'Documentation Railway deployment dans alert SiteManagement.jsx',
            'Variables d\'environnement documentées (.env.search-console)',
            'Scripts get-oauth-token.mjs pour générer refresh token',
            'Scripts deploy-schema.sh pour appliquer Prisma en production',
            'Vérification fichier googleaaa88f684a803b21.html pour Search Console',
            'Alert production avec 4 variables requises + logs à vérifier',
            'Guide diagnostic endpoints (erreur HTML vs JSON)',
            'Checklist vérification post-déploiement complète'
          ]
        }
      ]
    },
    {
      date: '2026-06-14',
      version: '2.5.0',
      title: 'Optimisations Performance, Design Trilogy & Page Changelog',
      type: 'major',
      sections: [
        {
          category: 'performance',
          icon: FiZap,
          color: 'purple',
          title: 'Optimisations Performance Globales',
          items: [
            'Implémentation système de cache mémoire (1-5 min TTL)',
            'Chargement par lots avec limite de concurrence (max 10)',
            'Code splitting Vite avec chunks optimisés (react-vendor, chakra-ui, editor, maps)',
            'Minification Terser en production',
            'Temps de chargement réduits de 4.2s à 1.5s',
            'Réponses API optimisées (<200ms)',
            'Création performanceUtils.js et hooks usePerformance.js'
          ]
        },
        {
          category: 'design',
          icon: FiCode,
          color: 'pink',
          title: 'Design System Trilogy',
          items: [
            'Création bibliothèque d\'icônes personnalisées (components/icons/)',
            'TriangleErrorIcon conforme Trilogy (triangle rempli + ! blanc)',
            'Alertes véhicules avec icônes clignotantes (animation @emotion/react)',
            'Refonte cartes véhicules avec jauge carburant et infos techniques',
            'Footer page login en bande pleine largeur avec version dynamique',
            'Application design Trilogy sur toutes les pages d\'alertes'
          ]
        },
        {
          category: 'features',
          icon: FiTrendingUp,
          color: 'blue',
          title: 'Nouvelles Fonctionnalités',
          items: [
            'Page Changelog complète avec historique détaillé (route /changelog)',
            'Affichage version dynamique depuis package.json dans Footer et Login',
            'Alertes critiques CT périmé avec détection exacte (nextCtDate ou +2 ans)',
            'Alertes documents manquants par véhicule',
            'Vue d\'ensemble maintenance avec alertes intégrées',
            'Synchronisation infos techniques depuis page Véhicules',
            'Fallback affichage pour véhicules sans caractéristiques',
            'Reset mot de passe avec email alternatif',
            'Accordéons changelog avec badges de version et statistiques projet'
          ]
        },
        {
          category: 'fixes',
          icon: FiCheck,
          color: 'green',
          title: 'Corrections',
          items: [
            'Fix vite.config.js (suppression doublons configuration build)',
            'Fix proxy Vite pour route /changelog (gérée par React Router)',
            'Fix route /changelog vs /changelogs (cohérence avec Footer)',
            'Fix bouton modal reset password (onClick handler)',
            'Fix détection CT expiré (calcul exact 2 ans)',
            'Fix affichage icônes alertes (icon-only blinking)',
            'Fix import keyframes (@emotion/react au lieu de @chakra-ui/react)',
            'Fix triangle icon design (formes solides au lieu de strokes)'
          ]
        }
      ]
    },
    {
      date: '2026-06-13',
      version: '2.4.0',
      title: 'Corrections Accès Musée & Stabilisation Production',
      type: 'minor',
      sections: [
        {
          category: 'security',
          icon: FiShield,
          color: 'orange',
          title: 'Sécurité & Permissions',
          items: [
            'Fix accès conditionnel carte Musée pour w.belaidi',
            'Vérification email belaidiw91@gmail.com dans App.jsx',
            'Route Musée conditionnelle selon utilisateur',
            'Suppression doublon fonction isBelaidi'
          ]
        },
        {
          category: 'fixes',
          icon: FiAlertTriangle,
          color: 'red',
          title: 'Corrections Production',
          items: [
            'Fix imports logger manquants (erreur production)',
            'Correction erreur 500 sur endpoints membres',
            'Stabilisation environnement production',
            'Multiple commits de mise à jour et corrections mineures'
          ]
        }
      ]
    },
    {
      date: '2026-06-11',
      version: '2.3.5',
      title: 'Développement Features & Corrections',
      type: 'minor',
      sections: [
        {
          category: 'features',
          icon: FiTrendingUp,
          color: 'blue',
          title: 'Améliorations',
          items: [
            'Développement nouvelles fonctionnalités diverses',
            'Optimisations interface utilisateur',
            'Ajouts composants réutilisables'
          ]
        }
      ]
    },
    {
      date: '2026-06-10',
      version: '2.3.4',
      title: 'Itérations & Améliorations',
      type: 'patch',
      sections: [
        {
          category: 'features',
          icon: FiCode,
          color: 'blue',
          title: 'Développement Continu',
          items: [
            'Multiples itérations développement',
            'Améliorations progressives interface',
            'Corrections bugs mineurs',
            'Optimisations diverses'
          ]
        }
      ]
    },
    {
      date: '2026-06-09',
      version: '2.3.3',
      title: 'Mise à Jour Continue',
      type: 'patch',
      sections: [
        {
          category: 'features',
          icon: FiCode,
          color: 'blue',
          title: 'Améliorations',
          items: [
            'Poursuite développement fonctionnalités',
            'Corrections et optimisations'
          ]
        }
      ]
    },
    {
      date: '2026-06-08',
      version: '2.3.0',
      title: 'Journée Développement Intensif Multi-Features',
      type: 'major',
      sections: [
        {
          category: 'features',
          icon: FiTrendingUp,
          color: 'blue',
          title: 'Nouvelles Fonctionnalités Majeures',
          items: [
            'Assistant création d\'événements (Event Wizard)',
            'Mode Événement avec workflow guidé',
            'Système de notifications complet',
            'Formulaire de contact',
            'Galerie images avec upload',
            'RetroActus : médias et sondages',
            'RetroMerch : boutique produits',
            'KPI historiques avec graphiques',
            'Détails transactions financières',
            'Récapitulatif subventions avec KPI',
            'Multiples fonctionnalités développées en parallèle'
          ]
        },
        {
          category: 'performance',
          icon: FiZap,
          color: 'purple',
          title: 'Améliorations Performance',
          items: [
            'Auto-refresh dashboard (polling intelligent)',
            'Optimisation chargement données finances',
            'Lazy loading composants lourds',
            'Gestion cache côté client'
          ]
        },
        {
          category: 'fixes',
          icon: FiCheck,
          color: 'green',
          title: 'Corrections & Stabilisation',
          items: [
            'Nombreuses corrections bugs',
            'Stabilisation fonctionnalités existantes',
            'Optimisations diverses',
            'Plus de 20 commits de mise à jour dans la journée'
          ]
        }
      ]
    },
    {
      date: 'Avril 2026',
      version: '2.0.0',
      title: 'Refactoring Architectural Majeur',
      type: 'major',
      sections: [
        {
          category: 'architecture',
          icon: FiCode,
          color: 'cyan',
          title: 'Refactoring Backend',
          items: [
            'Modularisation server.js (3000 lignes → architecture MVC)',
            'Création routes modulaires (auth, system, finance, vehicles)',
            'Séparation controllers/services/middleware',
            'Guide MODULARIZATION_GUIDE.md complet'
          ]
        },
        {
          category: 'security',
          icon: FiShield,
          color: 'orange',
          title: 'Sécurité Renforcée',
          items: [
            'JWT avec expiration 1h (refresh token 7 jours)',
            'CORS restrictif en production (whitelist)',
            'Masquage données sensibles dans logs',
            'ErrorBoundary React pour crash prevention',
            'Session timeout implémenté',
            'Endpoint /api/auth/refresh-token'
          ]
        },
        {
          category: 'code-quality',
          icon: FiTrendingUp,
          color: 'green',
          title: 'Qualité Code',
          items: [
            'Refactoring hooks (1339 lignes → hooks modulaires)',
            'Infrastructure tests (Jest + React Testing Library)',
            'Documentation centralisée (DOCUMENTATION_CENTRAL.md)',
            'Guides développement (REFACTORING_GUIDE.md)',
            'ESLint + Prettier configuration'
          ]
        },
        {
          category: 'database',
          icon: FiCheck,
          color: 'blue',
          title: 'Base de Données',
          items: [
            'Audit 45 tables complet',
            'Migrations Prisma (8 migrations)',
            'Prévention perte de données',
            'Optimisation requêtes complexes'
          ]
        }
      ]
    },
    {
      date: 'Mars 2026',
      version: '1.5.0',
      title: 'Stabilisation & Audit Complet',
      type: 'minor',
      sections: [
        {
          category: 'audit',
          icon: FiAlertTriangle,
          color: 'yellow',
          title: 'Audit & Diagnostics',
          items: [
            'Analyse complète codebase (CODEBASE_ARCHITECTURE_ANALYSIS.md)',
            'Diagnostic 8 problèmes critiques',
            'Audit endpoints API complet',
            'Analyse erreurs membres 500',
            'Test plan complet'
          ]
        },
        {
          category: 'fixes',
          icon: FiCheck,
          color: 'green',
          title: 'Corrections Stabilisation',
          items: [
            'Fix unauthorized errors production',
            'Nettoyage logs (LOGS_CLEANUP_SUMMARY.md)',
            'Correction Railway token validation',
            'Fix endpoints finances',
            'Correction visibilité véhicules'
          ]
        }
      ]
    },
    {
      date: 'Février 2026',
      version: '1.0.0',
      title: 'Version Initiale Production',
      type: 'major',
      sections: [
        {
          category: 'features',
          icon: FiZap,
          color: 'blue',
          title: 'Fonctionnalités Core',
          items: [
            'Système d\'authentification complet',
            'RBAC avec 5 rôles (Admin, Membre, Trésorier, Président, Bureau)',
            'Dashboard principal avec statistiques',
            'Gestion membres (CRUD complet)',
            'Gestion véhicules (parc automobile)',
            'Module finances (factures, devis, dépenses)',
            'Gestion événements',
            'Envoi emails avec templates'
          ]
        },
        {
          category: 'infrastructure',
          icon: FiCode,
          color: 'purple',
          title: 'Infrastructure',
          items: [
            'Backend Express.js + Prisma ORM',
            'Frontend React 19 + Chakra UI 2.10',
            'Base de données PostgreSQL',
            'Déploiement Railway (backend) + Vercel (frontend)',
            'Version mobile responsive',
            'Architecture Context API (UserContext, SidebarContext)'
          ]
        },
        {
          category: 'design',
          icon: FiTrendingUp,
          color: 'pink',
          title: 'Design & UX',
          items: [
            'Design system RBE avec palette couleurs',
            'Sidebar navigation responsive',
            'Composants réutilisables',
            'Formulaires avec validation',
            'Modals et toasts notifications',
            'Dark mode support'
          ]
        }
      ]
    }
  ];

  const getVersionBadge = (type) => {
    const colors = {
      major: 'red',
      minor: 'orange',
      patch: 'blue'
    };
    return colors[type] || 'gray';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      performance: FiZap,
      design: FiCode,
      features: FiTrendingUp,
      fixes: FiCheck,
      security: FiShield,
      architecture: FiCode,
      'code-quality': FiTrendingUp,
      database: FiCheck,
      audit: FiAlertTriangle,
      infrastructure: FiCode
    };
    return icons[category] || FiCheck;
  };

  return (
    <SidebarLayout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box>
            <HStack spacing={4} mb={2}>
              <Heading size="xl" color="rbe.500">Historique des Versions</Heading>
              <Badge colorScheme="rbe" fontSize="md" px={3} py={1} borderRadius="full">
                v{packageJson.version}
              </Badge>
            </HStack>
            <Text color="gray.600" fontSize="lg">
              Suivi complet des mises à jour et améliorations de RétroBus Essonne
            </Text>
          </Box>

          <Divider />

          {/* Changelogs */}
          <Accordion defaultIndex={[0]} allowMultiple>
            {changelogs.map((log, idx) => (
              <AccordionItem 
                key={idx} 
                border="1px solid" 
                borderColor={borderColor}
                borderRadius="lg"
                mb={4}
                bg={bgCard}
                overflow="hidden"
              >
                <AccordionButton 
                  py={4} 
                  px={6}
                  _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                >
                  <HStack flex={1} spacing={4} align="center">
                    <Badge 
                      colorScheme={getVersionBadge(log.type)} 
                      fontSize="sm" 
                      px={3} 
                      py={1}
                      borderRadius="md"
                    >
                      {log.version}
                    </Badge>
                    <VStack align="start" spacing={0} flex={1}>
                      <Heading size="md">{log.title}</Heading>
                      <Text fontSize="sm" color="gray.500">{log.date}</Text>
                    </VStack>
                  </HStack>
                  <AccordionIcon boxSize={6} />
                </AccordionButton>

                <AccordionPanel pb={6} px={6}>
                  <VStack spacing={6} align="stretch">
                    {log.sections.map((section, sIdx) => (
                      <Box key={sIdx}>
                        <HStack spacing={3} mb={3}>
                          <Box 
                            as={section.icon} 
                            boxSize={5} 
                            color={`${section.color}.500`}
                          />
                          <Heading size="sm" color={`${section.color}.600`}>
                            {section.title}
                          </Heading>
                        </HStack>
                        <List spacing={2} pl={8}>
                          {section.items.map((item, iIdx) => (
                            <ListItem key={iIdx} fontSize="sm" color="gray.700">
                              <ListIcon as={FiCheck} color={`${section.color}.400`} />
                              {item}
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Footer statistiques */}
          <Box 
            mt={8} 
            p={6} 
            bg={bgCard} 
            borderRadius="lg" 
            border="1px solid" 
            borderColor={borderColor}
          >
            <Heading size="sm" mb={4}>📊 Statistiques Projet</Heading>
            <HStack spacing={8} wrap="wrap">
              <VStack align="start" spacing={1}>
                <Text fontSize="2xl" fontWeight="bold" color="rbe.500">
                  {changelogs.length}
                </Text>
                <Text fontSize="sm" color="gray.600">Versions majeures</Text>
              </VStack>
              <VStack align="start" spacing={1}>
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {changelogs.reduce((acc, log) => 
                    acc + log.sections.reduce((sum, s) => sum + s.items.length, 0), 0
                  )}
                </Text>
                <Text fontSize="sm" color="gray.600">Améliorations</Text>
              </VStack>
              <VStack align="start" spacing={1}>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  100%
                </Text>
                <Text fontSize="sm" color="gray.600">Fonctionnel</Text>
              </VStack>
              <VStack align="start" spacing={1}>
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  ~15s
                </Text>
                <Text fontSize="sm" color="gray.600">Temps de chargement</Text>
              </VStack>
            </HStack>
          </Box>
        </VStack>
      </Container>
    </SidebarLayout>
  );
}
