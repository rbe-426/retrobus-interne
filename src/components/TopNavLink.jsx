import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Link, Flex } from '@chakra-ui/react';
import React from 'react';
import { useUser } from '../context/UserContext';
import { canAccess, RESOURCES } from '../lib/permissions';

/**
 * Lien de navigation top bar
 * - Ajoute un style actif si l'URL commence par la cible
 * - Accessible (aria-current)
 */
export default function TopNavLink({ to, exact = false, children }) {
  const { pathname } = useLocation();

  const isActive = exact
    ? pathname === to
    : pathname === to || pathname.startsWith(to + '/');

  return (
    <Link
      as={RouterLink}
      to={to}
      color={isActive ? "var(--rbe-red)" : "gray.600"}
      fontWeight={isActive ? "bold" : "normal"}
      textDecoration="none"
      position="relative"
      _hover={{
        color: "var(--rbe-red)",
        textDecoration: "none"
      }}
      _after={isActive ? {
        content: '""',
        position: "absolute",
        bottom: "-8px",
        left: 0,
        right: 0,
        height: "2px",
        bg: "var(--rbe-red)",
        borderRadius: "1px"
      } : {}}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

export function Navigation() {
  const { user, customPermissions } = useUser();
  const userRole = user?.role || 'MEMBER';

  // Déterminer les liens disponibles en fonction des permissions (y compris individuelles)
  const canAccessHome = canAccess(userRole, RESOURCES.SITE_MANAGEMENT, customPermissions);
  const canAccessVehicles = canAccess(userRole, RESOURCES.VEHICLES, customPermissions);
  const canAccessEvents = canAccess(userRole, RESOURCES.EVENTS, customPermissions);
  const canAccessMyRBE = canAccess(userRole, RESOURCES.MYRBE, customPermissions);
  const canAccessRetroMerch = canAccess(userRole, RESOURCES.NEWSLETTER, customPermissions); // Using NEWSLETTER as proxy for general access
  const canAccessRétroPlanning = canAccess(userRole, RESOURCES.RETROPLANNING, customPermissions);
  const canAccessRétroSupport = canAccess(userRole, RESOURCES.RETROSUPPORT, customPermissions);

  // Si c'est un prestataire, montrer UNIQUEMENT RétroPlanning et RétroSupport
  if (userRole === 'PRESTATAIRE') {
    return (
      <Flex bg="white" gap={{ base: 4, md: 8 }} justify="center" align="center" py={3}>
        {canAccessRétroPlanning && <TopNavLink to="/dashboard/retroplanning">📅 RétroPlanning</TopNavLink>}
        {canAccessRétroSupport && <TopNavLink to="/dashboard/support">🆘 RétroSupport</TopNavLink>}
      </Flex>
    );
  }

  // Si c'est un partenaire, montrer UNIQUEMENT RétroDemandes et RétroSupport
  if (userRole === 'PARTENAIRE') {
    return (
      <Flex bg="white" gap={{ base: 4, md: 8 }} justify="center" align="center" py={3}>
        <TopNavLink to="/dashboard/retro-demandes">📋 RétroDemandes</TopNavLink>
        {canAccessRétroSupport && <TopNavLink to="/dashboard/support">🆘 RétroSupport</TopNavLink>}
      </Flex>
    );
  }

  // Tous les autres rôles ont accès au menu complet (mais basé sur les permissions)
  return (
    <Flex bg="white" gap={{ base: 4, md: 8 }} justify="center" align="center" py={3}>
      {canAccessHome && <TopNavLink to="/dashboard">🏠 Accueil</TopNavLink>}
      {canAccessVehicles && <TopNavLink to="/dashboard/vehicules">🚗 Véhicules</TopNavLink>}
      {canAccessEvents && <TopNavLink to="/dashboard/evenements">📋 Événements</TopNavLink>}
      {canAccessMyRBE && <TopNavLink to="/dashboard/myrbe">📊 MyRBE</TopNavLink>}
      <TopNavLink to="/dashboard/team-rbe">Team RBE 🚌 ❤️</TopNavLink>
      {canAccessRetroMerch && <TopNavLink to="/dashboard/retromerch">🛍️ RétroMerch</TopNavLink>}
    </Flex>
  );
}
