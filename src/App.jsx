import React, { useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Box, Center, Spinner, VStack, Text } from "@chakra-ui/react";
import { useUser } from "./context/UserContext";
import { SidebarProvider } from "./context/SidebarContext";
import { fetchCSRFToken } from "./lib/csrfClient";
import logger from "./utils/logger";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import PermissionProtectedRoute from "./components/PermissionProtectedRoute";
import PrestataireLimitedRoute from "./components/PrestataireLimitedRoute";
import RequireCreator from "./components/RequireCreator";
import ExternalRetromailRedirect from "./components/ExternalRetromailRedirect";
import { RESOURCES } from "./lib/permissions";

const lazyWithRetry = (factory, cacheKey) =>
  lazy(async () => {
    const shouldRetry = !sessionStorage.getItem(cacheKey);
    try {
      const module = await factory();
      sessionStorage.removeItem(cacheKey);
      return module;
    } catch (error) {
      const message = String(error?.message || '');
      const isChunkLoadIssue =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed') ||
        message.includes('Loading chunk');

      if (isChunkLoadIssue && shouldRetry) {
        sessionStorage.setItem(cacheKey, '1');
        window.location.reload();
        return new Promise(() => {});
      }

      throw error;
    }
  });

// Composant de chargement réutilisable
const PageLoader = () => (
  <Center h="100vh">
    <VStack spacing={4}>
      <Spinner size="xl" color="rbe.500" thickness="4px" />
      <Text fontSize="lg" color="gray.600">Chargement...</Text>
    </VStack>
  </Center>
);

// ⚡ Lazy loading des pages pour améliorer le temps de chargement initial
// Seules les pages visitées sont chargées, réduisant le bundle JS de 80%+
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardHome = lazy(() => import("./pages/DashboardHome"));
const MyRBE = lazy(() => import("./pages/MyRBE"));
const MyRBEActions = lazy(() => import("./pages/MyRBEActions"));
const AdminFinance = lazy(() => import("./pages/AdminFinance"));
const FinanceNew = lazy(() => import("./pages/FinanceNew"));
const NDF = lazy(() => import("./pages/NDF"));
const Vehicules = lazyWithRetry(() => import("./pages/Vehicules"), 'retry:vehicules:chunk');
const VehiculeShow = lazy(() => import("./pages/VehiculeShow"));
const VehiculeCreate = lazy(() => import("./pages/VehiculeCreate"));
const VehiculeEdit = lazy(() => import("./pages/VehiculeEdit"));
const RetroBus = lazy(() => import("./pages/RetroBus"));
const EventsManagement = lazy(() => import("./pages/EventsManagement"));
const EventsCreation = lazy(() => import("./pages/EventsCreation"));
const TestEventsPage = lazy(() => import("./pages/TestEventsPage"));
const SiteManagement = lazy(() => import("./pages/SiteManagement"));
const StockManagement = lazy(() => import("./pages/StockManagement"));
const FlashManagement = lazy(() => import("./pages/FlashManagement"));
const Adhesion = lazy(() => import("./pages/Adhesion"));
const Login = lazy(() => import("./pages/Login"));
const ForcePasswordChange = lazy(() => import("./pages/ForcePasswordChange"));
const MobileVehicle = lazy(() => import("./pages/MobileVehicle"));
const Retromail = lazy(() => import("./pages/Retromail"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const NewsletterCampaigns = lazy(() => import("./pages/NewsletterCampaigns"));
const Members = lazy(() => import("./pages/Members"));
const MembersManagement = lazy(() => import("./pages/MembersManagement"));
const SupportSite = lazy(() => import("./pages/SupportSite"));
const RetroMerch = lazy(() => import("./pages/RetroMerch"));
const RetroPlanning = lazy(() => import("./pages/RetroPlanning"));
const SharedPlanning = lazy(() => import("./pages/PlanningRBE"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const AttendanceManager = lazy(() => import("./pages/AttendanceManager"));
const RetroDemandes = lazy(() => import("./pages/RetroDemandes"));
const EchancierPage = lazy(() => import("./pages/EchancierPage"));
const ThemeShowcase = lazy(() => import("./pages/ThemeShowcase"));
const TrilogyRBE = lazy(() => import("./pages/TrilogyRBE"));
const TrilogyRBEExterne = lazy(() => import("./pages/TrilogyRBEExterne"));
const TrilogyRBERessourcery = lazy(() => import("./pages/TrilogyRBERessourcery"));
const SubventionCampaign = lazy(() => import("./pages/SubventionCampaign"));
const SubventionCampaignAdmin = lazy(() => import("./pages/SubventionCampaignAdmin"));
const PermissionsManager = lazy(() => import("./components/PermissionsManager"));
const AdhesionManagement = lazy(() => import("./pages/AdhesionManagement"));
const EventCreationWizardPage = lazy(() => import("./pages/EventCreationWizardPage"));
const EventWizardDemoPage = lazy(() => import("./pages/EventWizardDemoPage"));
const AccountsManagement = lazy(() => import("./pages/AccountsManagement"));
const EventModeManager = lazy(() => import("./pages/EventModeManager"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const RGPD = lazy(() => import("./pages/RGPD"));
const Changelogs = lazy(() => import("./pages/Changelogs"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const TeamRBE = lazy(() => import("./pages/TeamRBE"));
const LumistudioLaunch = lazy(() => import("./pages/LumistudioLaunch"));
const RetroStudio = lazy(() => import("./pages/RetroStudio"));

export default function App() {
  const { isAuthenticated, user, matricule } = useUser();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);
  
  // Debug: afficher la route actuelle
  logger.route('Current route:', location.pathname);
  
  // 🏛️ Le Musée accessible uniquement en dev ou pour w.belaidi
  const isBelaidi = (
    matricule?.toLowerCase() === 'w.belaidi' ||
    user?.username?.toLowerCase() === 'w.belaidi' ||
    user?.email?.toLowerCase() === 'belaidiw91@gmail.com' ||
    user?.email?.toLowerCase() === 'w.belaidi@retrobus-essonne.fr'
  );
  const canAccessMuseum = import.meta.env.DEV || isBelaidi;
  
  const isRetromailWorkspace = location.pathname === '/auth/rmail/login' || location.pathname === '/myrbe/retromail';
  const showHeader = isAuthenticated && location.pathname !== '/login' && !isRetromailWorkspace;

  // 🔐 Initialize CSRF token after user authenticates (deferred from login to avoid interference)
  useEffect(() => {
    if (isAuthenticated && location.pathname !== '/login') {
      fetchCSRFToken()
        .then(() => logger.csrf('Token fetched after authentication'))
        .catch(err => console.error('❌ CSRF token fetch failed (non-blocking):', err.message));
    }
  }, [isAuthenticated, location.pathname]);

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <Box display="flex" flexDirection="column" minH="100vh">
          {showHeader && <Header />}
          <Box flex="1">
            <Suspense fallback={<PageLoader />}>
              <Routes>
        {/* Route de connexion */}
        <Route path="/login" element={<Login />} />
        
        {/* Route de changement de mot de passe obligatoire */}
        <Route path="/force-password-change" element={<ProtectedRoute><ForcePasswordChange /></ProtectedRoute>} />
        
        {/* Route de test du thème */}
        <Route path="/test-theme" element={<ThemeShowcase />} />
        
        {/* Routes du dashboard principal */}
        <Route path="/dashboard/home" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
  <Route path="/dashboard/myrbe" element={<ProtectedRoute><MyRBE /></ProtectedRoute>} />
  <Route path="/dashboard/myrbe/:parc" element={<ProtectedRoute><MyRBEActions /></ProtectedRoute>} />
  <Route path="/dashboard/trilogy-rbe" element={<ProtectedRoute><TrilogyRBE /></ProtectedRoute>} />
  <Route path="/dashboard/trilogy-rbe/externe" element={<ProtectedRoute><TrilogyRBEExterne /></ProtectedRoute>} />
  <Route path="/dashboard/trilogy-rbe/ressourcery" element={<ProtectedRoute><TrilogyRBERessourcery /></ProtectedRoute>} />
        
        {/* 📋 RétroDemandes - Demandes unifiées avec contrôle d'accès */}
        <Route path="/dashboard/retro-demandes" element={<ProtectedRoute><RetroDemandes /></ProtectedRoute>} />
        
        {/* 👥 Gestion des Adhésions - DÉSACTIVÉE */}
        {/* <Route path="/dashboard/adhesion-management" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PRESIDENT']}><AdhesionManagement /></RoleProtectedRoute>} /> */}
        
        {/* 🏛️ Le Musée (dev ou w.belaidi uniquement) */}
        {canAccessMuseum && (
          <Route path="/dashboard/rbe-lemusee" element={<ProtectedRoute><SubventionCampaign /></ProtectedRoute>} />
        )}
        <Route path="/dashboard/admin/subventions" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PRESIDENT']}><SubventionCampaignAdmin /></RoleProtectedRoute>} />
        
        {/* 💰 Route gestion financière */}
        <Route path="/admin/finance" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><AdminFinance /></RoleProtectedRoute>} />
        <Route path="/admin/finance-v2" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PRESIDENT', 'TRESORIER']}><FinanceNew /></RoleProtectedRoute>} />
        <Route path="/dashboard/ndf" element={<ProtectedRoute><NDF /></ProtectedRoute>} />
        
        {/* 🚗 Routes des véhicules */}
        <Route path="/dashboard/retrobus" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><RetroBus /></RoleProtectedRoute>} />
        <Route path="/myrbe/lumistudio" element={<ProtectedRoute><LumistudioLaunch /></ProtectedRoute>} />
        <Route path="/myrbe/retrostudio" element={<ProtectedRoute><RetroStudio /></ProtectedRoute>} />
        <Route path="/echancier" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><EchancierPage /></RoleProtectedRoute>} />
        <Route path="/dashboard/vehicules" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><Vehicules /></RoleProtectedRoute>} />
        <Route path="/dashboard/vehicules/ajouter" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><RequireCreator><VehiculeCreate /></RequireCreator></RoleProtectedRoute>} />
        <Route path="/dashboard/vehicules/:parc/edit" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><VehiculeEdit /></RoleProtectedRoute>} />
        <Route path="/dashboard/vehicules/:parc" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><VehiculeShow /></RoleProtectedRoute>} />
        
        {/* 📅 Routes des événements */}
        <Route path="/dashboard/evenements" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><EventsCreation /></RoleProtectedRoute>} />
        <Route path="/dashboard/events-management" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><EventsManagement /></RoleProtectedRoute>} />
        <Route path="/dashboard/events-creation" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><EventsCreation /></RoleProtectedRoute>} />
        <Route path="/dashboard/events/wizard-create" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><EventCreationWizardPage /></RoleProtectedRoute>} />
        <Route path="/dashboard/test-wizard-demo" element={<RoleProtectedRoute><EventWizardDemoPage /></RoleProtectedRoute>} />
        {/* Route de test pour diagnostiquer */}
        <Route path="/dashboard/test-events" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><TestEventsPage /></RoleProtectedRoute>} />
        
        {/* 🌐 Gestion du site et contenu */}
        <Route path="/dashboard/planning-rbe" element={<ProtectedRoute><SharedPlanning /></ProtectedRoute>} />
        <Route path="/dashboard/site-management" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><PermissionProtectedRoute resource={RESOURCES.SITE_MANAGEMENT}><SiteManagement /></PermissionProtectedRoute></RoleProtectedRoute>} />
        {/* Route flash-management désactivée - remplacée par RétroMail */}
        {/* <Route path="/dashboard/flash-management" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><FlashManagement /></RoleProtectedRoute>} /> */}
        {/* 🛒 RétroMerch (administration) */}
        <Route path="/dashboard/retromerch" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><RetroMerch /></RoleProtectedRoute>} />
        
        {/* 📦 Gestion des stocks */}
        <Route path="/dashboard/stock-management" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><StockManagement /></RoleProtectedRoute>} />
        
        {/* 👥 Gestion des membres */}
        <Route path="/dashboard/members-management" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><MembersManagement /></RoleProtectedRoute>} />
        <Route path="/dashboard/accounts-management" element={<RoleProtectedRoute allowedRoles={['ADMIN']}><AccountsManagement /></RoleProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
        <Route path="/adhesion" element={<ProtectedRoute><Adhesion /></ProtectedRoute>} />
        
        {/* 🔐 Gestion des permissions */}
        <Route path="/dashboard/permissions" element={<RoleProtectedRoute allowedRoles={['ADMIN']}><PermissionsManager /></RoleProtectedRoute>} />
        {/* Redirection vers le nouvel onglet dans Site Management */}
        <Route path="/dashboard/permissions-management" element={<Navigate to="/dashboard/site-management" replace />} />
        
        {/* 📧 Communication */}
        <Route path="/dashboard/newsletter" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><Newsletter /></RoleProtectedRoute>} />
        <Route path="/dashboard/newsletter-campaigns" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><NewsletterCampaigns /></RoleProtectedRoute>} />
        
        {/* 🎪 Mode Événement (site externe) */}
        <Route path="/dashboard/event-mode" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PRESIDENT']}><EventModeManager /></RoleProtectedRoute>} />
        <Route path="/dashboard/retroplanning" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><PermissionProtectedRoute resource={RESOURCES.RETROPLANNING}><RetroPlanning /></PermissionProtectedRoute></RoleProtectedRoute>} />
        <Route path="/planning/attendance/:eventId/:memberId" element={<AttendancePage />} />
        <Route path="/planning/my-invitations" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><PermissionProtectedRoute resource={RESOURCES.RETROPLANNING_RESPOND}><AttendanceManager /></PermissionProtectedRoute></RoleProtectedRoute>} />
        <Route path="/dashboard/support" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><PermissionProtectedRoute resource={RESOURCES.RETROSUPPORT}><SupportSite /></PermissionProtectedRoute></RoleProtectedRoute>} />
        <Route path="/retromail" element={<ExternalRetromailRedirect />} />
        <Route path="/red/retromail" element={<Navigate to="/auth/rmail/login" replace />} />
        <Route path="/auth/rmail/login" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><Retromail /></RoleProtectedRoute>} />
        <Route path="/myrbe/retromail" element={<RoleProtectedRoute deniedRoles={['CLIENT', 'GUEST']}><Retromail /></RoleProtectedRoute>} />
        
        {/* � Pages légales */}
        <Route path="/mentions-legales" element={<ProtectedRoute><MentionsLegales /></ProtectedRoute>} />
        <Route path="/rgpd" element={<ProtectedRoute><RGPD /></ProtectedRoute>} />        
        {/* 📝 Historique */}
        <Route path="/changelog" element={<ProtectedRoute><Changelogs /></ProtectedRoute>} />        
        {/* 👥 Gestion de l'équipe */}
        <Route path="/dashboard/team-management" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PRESIDENT']}><TeamManagement /></RoleProtectedRoute>} />
        <Route path="/dashboard/team-rbe" element={<ProtectedRoute><TeamRBE /></ProtectedRoute>} />

        {/* 📱 Version mobile */}
        <Route path="/vehicules/administratif/rbep/:vehicleReference" element={<MobileVehicle />} />
        <Route path="/mobile/v/:parc" element={<MobileVehicle />} />
        <Route path="/dashboard/mobile/v/:parc" element={<ProtectedRoute><MobileVehicle /></ProtectedRoute>} />
        <Route path="/dashboard/mobile/:parc" element={<ProtectedRoute><MobileVehicle /></ProtectedRoute>} />
        
        {/* Route par défaut - redirige vers le dashboard home */}
        <Route path="/" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </Box>
          {showHeader && <Footer />}
        </Box>
      </SidebarProvider>
    </ErrorBoundary>
  );
}