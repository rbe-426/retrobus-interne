/**
 * EventHeader.jsx
 * 
 * Header spécial pour le mode événement
 * Design différent du header normal, plus visuel et accrocheur
 */

import React from 'react';
import {
  Box, Container, Flex, HStack, VStack, Text, Image,
  Button, IconButton, useColorModeValue, Badge, Menu,
  MenuButton, MenuList, MenuItem, Avatar, Heading,
  Divider, Icon
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { 
  FiCalendar, FiMapPin, FiUser, FiLogOut, FiSettings,
  FiHome, FiMenu, FiX, FiClock
} from 'react-icons/fi';
import { useUser } from '../context/UserContext';
import { getEventModeConfig, EVENT_TYPES } from '../utils/eventModeConfig';

export default function EventHeader() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [eventConfig, setEventConfig] = React.useState(null);

  const bgGradient = useColorModeValue(
    'linear(to-r, orange.500, red.500)',
    'linear(to-r, orange.600, red.600)'
  );
  const textColor = 'white';
  const accentColor = useColorModeValue('yellow.300', 'yellow.200');

  React.useEffect(() => {
    const config = getEventModeConfig();
    setEventConfig(config);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const event = eventConfig?.event || {};
  const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.CUSTOM;

  // Formater les dates
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <Box
      bgGradient={bgGradient}
      color={textColor}
      boxShadow="lg"
      position="sticky"
      top="0"
      zIndex="1000"
    >
      {/* Bande supérieure avec info événement */}
      <Box bg="rgba(0,0,0,0.2)" py={2}>
        <Container maxW="container.xl">
          <Flex align="center" justify="space-between" fontSize="sm">
            <HStack spacing={6}>
              <HStack spacing={2}>
                <Icon as={FiCalendar} />
                <Text fontWeight="medium">
                  {formatDate(eventConfig?.startDate)}
                  {eventConfig?.endDate && eventConfig.startDate !== eventConfig.endDate && 
                    ` - ${formatDate(eventConfig?.endDate)}`
                  }
                </Text>
              </HStack>
              
              {event.location && (
                <HStack spacing={2}>
                  <Icon as={FiMapPin} />
                  <Text>{event.location}</Text>
                </HStack>
              )}
            </HStack>

            {/* User menu */}
            <HStack spacing={4}>
              {user && (
                <Menu>
                  <MenuButton
                    as={Button}
                    size="sm"
                    variant="ghost"
                    color={textColor}
                    _hover={{ bg: 'whiteAlpha.200' }}
                    _active={{ bg: 'whiteAlpha.300' }}
                  >
                    <HStack spacing={2}>
                      <Avatar size="xs" name={user.firstName || user.email} />
                      <Text>{user.firstName || user.email}</Text>
                    </HStack>
                  </MenuButton>
                  <MenuList color="gray.800">
                    <MenuItem icon={<FiUser />} onClick={() => navigate('/adhesion')}>
                      Mon profil
                    </MenuItem>
                    <MenuItem icon={<FiSettings />} onClick={() => navigate('/dashboard/home')}>
                      Dashboard
                    </MenuItem>
                    <Divider />
                    <MenuItem icon={<FiLogOut />} onClick={handleLogout}>
                      Déconnexion
                    </MenuItem>
                  </MenuList>
                </Menu>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Header principal avec titre événement */}
      <Container maxW="container.xl" py={6}>
        <Flex align="center" justify="space-between">
          {/* Logo + Titre événement */}
          <HStack spacing={4} flex="1">
            {event.logo ? (
              <Image 
                src={event.logo} 
                alt="Logo événement" 
                h="60px" 
                objectFit="contain"
              />
            ) : (
              <Box
                fontSize="4xl"
                bg="whiteAlpha.200"
                borderRadius="lg"
                p={3}
              >
                {eventType.icon}
              </Box>
            )}
            
            <VStack align="flex-start" spacing={0}>
              <Badge 
                colorScheme="yellow" 
                fontSize="xs" 
                mb={1}
                px={2}
                py={1}
                borderRadius="full"
              >
                {eventType.label}
              </Badge>
              <Heading 
                size="lg" 
                color={textColor}
                textShadow="0 2px 4px rgba(0,0,0,0.2)"
              >
                {event.name || 'Événement RétroBus Essonne'}
              </Heading>
              {event.description && (
                <Text 
                  fontSize="sm" 
                  color="whiteAlpha.900"
                  maxW="600px"
                  noOfLines={1}
                >
                  {event.description}
                </Text>
              )}
            </VStack>
          </HStack>

          {/* Actions rapides */}
          <HStack spacing={3} display={{ base: 'none', md: 'flex' }}>
            <Button
              as={RouterLink}
              to="/dashboard/home"
              leftIcon={<FiHome />}
              variant="solid"
              bg="whiteAlpha.200"
              color={textColor}
              _hover={{ bg: 'whiteAlpha.300' }}
            >
              Dashboard
            </Button>
            
            {eventConfig?.registration?.enabled && (
              <Button
                colorScheme="yellow"
                size="lg"
                fontWeight="bold"
                boxShadow="xl"
                _hover={{ transform: 'scale(1.05)' }}
                transition="all 0.2s"
              >
                S'inscrire à l'événement
              </Button>
            )}
          </HStack>

          {/* Menu mobile */}
          <IconButton
            icon={mobileMenuOpen ? <FiX /> : <FiMenu />}
            variant="ghost"
            color={textColor}
            display={{ base: 'flex', md: 'none' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            _hover={{ bg: 'whiteAlpha.200' }}
          />
        </Flex>
      </Container>

      {/* Menu mobile déroulant */}
      {mobileMenuOpen && (
        <Box
          display={{ base: 'block', md: 'none' }}
          bg="rgba(0,0,0,0.3)"
          py={4}
        >
          <Container maxW="container.xl">
            <VStack spacing={2} align="stretch">
              <Button
                as={RouterLink}
                to="/dashboard/home"
                leftIcon={<FiHome />}
                variant="ghost"
                color={textColor}
                justifyContent="flex-start"
                _hover={{ bg: 'whiteAlpha.200' }}
              >
                Dashboard
              </Button>
              
              {eventConfig?.registration?.enabled && (
                <Button
                  colorScheme="yellow"
                  justifyContent="flex-start"
                >
                  S'inscrire à l'événement
                </Button>
              )}
            </VStack>
          </Container>
        </Box>
      )}
    </Box>
  );
}
