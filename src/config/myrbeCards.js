import {
  FiDollarSign, FiCalendar, FiUsers, FiPackage, FiMail, FiGlobe,
  FiLifeBuoy, FiTool, FiTruck, FiShoppingBag, FiVideo, FiFileText
} from 'react-icons/fi';
import { FaPaintBrush } from 'react-icons/fa';

export const MYRBE_CARDS = [
  { id: 'museum', title: 'Le Musée', description: '', to: '/lemusee', icon: null, titleImageSrc: '/myrbe_lemusee.png', titleImageAlt: 'Le Musée', titleImageHeight: '62px', titleImageScale: 1.7, titleImageOffsetX: 0, titleImageOffsetY: 3, color: 'gray', resource: null, cardAccess: true, cardProps: { bg: 'black', borderColor: 'gray.700', _hover: { transform: 'translateY(-4px)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.35), 0 10px 10px -5px rgba(0,0,0,0.25)', borderColor: 'gray.500' } } },
  { id: 'trilogy', title: 'Trilogy RBE', description: 'Aperçu du thème complet et éléments graphiques', to: '/accueil/myrbe/trilogy-rbe', icon: FaPaintBrush, color: 'rbe', resource: null, cardAccess: true },
  { id: 'retrobus', title: 'RétroBus', description: 'Suivi complet du parc, entretiens et pointages', to: '/accueil/myrbe/retrobus', icon: FiTool, color: 'teal', resource: 'VEHICLES', cardAccess: true, badge: { label: 'Workspace', color: 'teal' } },
  { id: 'ineo', title: 'Inéo RétroBus', description: 'Prise de service, affectation et suivi de mission', to: '/accueil/myrbe/ineo-retrobus', icon: FiTruck, color: 'rbe', resource: null, cardAccess: true, badge: { label: 'Conducteur', color: 'rbe' } },
  { id: 'finance', title: 'Gestion Financière', description: 'Recettes, dépenses et opérations programmées', to: '/accueil/myrbe/gestion-financiere', icon: FiDollarSign, color: 'rbe', resource: 'FINANCE', cardAccess: true },
  { id: 'events', title: 'Gestion des Événements', description: 'Création, planification et suivi', to: '/accueil/myrbe/gestion-evenements', icon: FiCalendar, color: 'green', resource: 'EVENTS', cardAccess: true },
  { id: 'members', title: 'Gestion RH', description: 'Adhérents, stagiaires, cotisations et documents', to: '/accueil/myrbe/gestion-rh', icon: FiUsers, color: 'blue', resource: 'MEMBERS', cardAccess: true },
  { id: 'stock', title: 'Gestion des Stocks', description: "Inventaire et matériel de l'association", to: '/accueil/myrbe/gestion-stocks', icon: FiPackage, color: 'yellow', resource: 'STOCK', cardAccess: true },
  { id: 'retromerch', title: 'Gestion RétroMerch', description: 'Boutique en ligne, produits et commandes', to: '/accueil/myrbe/retromerch', icon: FiShoppingBag, color: 'red', resource: 'RETROMERCH', cardAccess: true },
  { id: 'newsletter', title: 'Gestion Newsletter', description: "Abonnés et campagnes d'envoi", to: '/accueil/myrbe/newsletter', icon: FiMail, color: 'purple', resource: 'NEWSLETTER', cardAccess: true },
  { id: 'site', title: 'Gestion du Site', description: 'Changelog, contenu et mise à jour', to: '/accueil/myrbe/gestion-site', icon: FiGlobe, color: 'pink', resource: 'SITE_MANAGEMENT', cardAccess: true },
  { id: 'news', title: 'Actualités publiques', description: 'Rédiger et publier les articles du site externe', to: '/accueil/myrbe/actualites-publiques', icon: FiGlobe, color: 'rbe', resource: 'SITE_MANAGEMENT', requiredRole: ['ADMIN'], cardAccess: true },
  { id: 'support', title: 'RétroSupport', description: 'Tickets: incidents, bugs et améliorations', to: '/accueil/myrbe/support', icon: FiLifeBuoy, color: 'cyan', resource: 'RETROSUPPORT', cardAccess: true },
  { id: 'procedures', title: 'Procédures', description: "Référentiel des procédures de l'association", to: '/accueil/myrbe/procedures', icon: FiFileText, color: 'purple', resource: null, cardAccess: true },
  { id: 'retrostudio', title: 'RetroStudio', description: 'Planification et suivi des tournages', to: '/accueil/myrbe/retrostudio', icon: FiVideo, color: 'red', resource: 'EVENTS', cardAccess: true, badge: { label: 'Événements', color: 'red' } }
].map((card) => ({ ...card, permissionKey: `MYRBE_CARD:${card.id}` }));