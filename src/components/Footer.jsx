import React from 'react';
import {
  Box,
  Container,
  SimpleGrid,
  Text,
  Link,
  VStack,
  HStack,
  Divider,
  useColorModeValue,
  Icon,
  Image,
  useMediaQuery
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin, FiExternalLink } from 'react-icons/fi';
import logo from '../assets/rbe_footer.jpg';

export default function Footer() {
  const bgColor = useColorModeValue('gray.900', 'gray.950');
  const borderColor = useColorModeValue('gray.700', 'gray.800');
  const textColor = useColorModeValue('gray.300', 'gray.400');
  const hoverColor = useColorModeValue('rbe.500', 'rbe.400');
  const currentYear = new Date().getFullYear();
  
  // Détection mobile
  const [isMobile] = useMediaQuery("(max-width: 768px)");

  const LinkItem = ({ icon, label, href, external = false }) => (
    <HStack 
      spacing={2} 
      as={Link} 
      href={href} 
      target={external ? "_blank" : undefined} 
      rel={external ? "noopener noreferrer" : undefined} 
      _hover={{ color: hoverColor, transition: 'color 0.2s' }}
      minH={isMobile ? "44px" : "auto"}
      alignItems="center"
    >
      <Icon as={icon} boxSize={isMobile ? 5 : 4} />
      <Text fontSize={isMobile ? "xs" : "sm"}>{label}</Text>
      {external && <Icon as={FiExternalLink} boxSize={isMobile ? 3 : 3} />}
    </HStack>
  );

  return (
    <Box
      as="footer"
      bg={bgColor}
      borderTop="1px solid"
      borderColor={borderColor}
      color={textColor}
      py={isMobile ? 6 : 4}
      mt={isMobile ? 2 : 4}
      px={isMobile ? 3 : undefined}
      _active={{ bg: bgColor }}
      _focus={{ bg: bgColor }}
      userSelect="none"
      position="relative"
    >
      {/* Logo positionné à gauche en dehors du container */}
      {!isMobile && (
        <VStack 
          position="absolute"
          left={8}
          top="50%"
          transform="translateY(-50%)"
          align="start"
          spacing={2}
        >
          <Image 
            src={logo} 
            alt="RétroBus Essonne" 
            h="50px"
            w="auto" 
            objectFit="contain"
          />
          <Text fontSize="xs" color="gray.500">
            v2.2.0 • Build {new Date().toISOString().split('T')[0]}
          </Text>
        </VStack>
      )}

      <Container maxW="6xl" px={isMobile ? 2 : undefined}>
        {/* Logo sur mobile */}
        {isMobile && (
          <VStack align="center" spacing={2} mb={6}>
            <Image 
              src={logo} 
              alt="RétroBus Essonne" 
              h="50px"
              w="auto" 
              objectFit="contain"
            />
            <Text fontSize="xs" color="gray.500">
              v2.2.0 • Build {new Date().toISOString().split('T')[0]}
            </Text>
          </VStack>
        )}

        {/* Layout moderne */}
        <Box mb={isMobile ? 6 : 4} pl={{ base: 0, lg: '300px' }}>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={isMobile ? 6 : 6} mb={isMobile ? 4 : 0}>
              {/* À propos */}
              <VStack align="start" spacing={isMobile ? 3 : 2}>
                <Text fontSize={isMobile ? "sm" : "md"} fontWeight="bold" color="white">
                  À propos
                </Text>
                <Text fontSize={isMobile ? "xs" : "sm"} lineHeight="relaxed">
                  Plateforme de gestion interne pour l'association RétroBus Essonne.
                </Text>
                <Link 
                  href="https://association-rbe.fr" 
                  target="_blank"
                  rel="noopener noreferrer"
                  _hover={{ color: hoverColor }} 
                  fontSize={isMobile ? "xs" : "sm"}
                  fontWeight="bold"
                  minH={isMobile ? "44px" : "auto"}
                  display="flex"
                  alignItems="center"
                >
                  Site Public <Icon as={FiExternalLink} boxSize={3} ml={1} display="inline" />
                </Link>
              </VStack>

              {/* Contact */}
              <VStack align="start" spacing={isMobile ? 3 : 2}>
                <Text fontSize={isMobile ? "sm" : "md"} fontWeight="bold" color="white">
                  Contact
                </Text>
                <LinkItem
                  icon={FiMail}
                  label="Email"
                  href="mailto:association.rbe@gmail.com"
                />
                <LinkItem
                  icon={FiPhone}
                  label="Téléphone"
                  href="tel:+33XXXXXXXXX"
                />
                <LinkItem
                  icon={FiMapPin}
                  label="Essonne, France"
                  href="https://maps.google.com"
                  external
                />
              </VStack>

              {/* Ressources + Réseaux sociaux */}
              <VStack align="start" spacing={isMobile ? 3 : 2}>
                <Text fontSize={isMobile ? "sm" : "md"} fontWeight="bold" color="white">
                  Liens rapides
                </Text>
                <Link href="/dashboard/support" _hover={{ color: hoverColor }} fontSize={isMobile ? "xs" : "sm"} minH={isMobile ? "44px" : "auto"} display="flex" alignItems="center">
                  Support
                </Link>
                <Link href="/changelog" _hover={{ color: hoverColor }} fontSize={isMobile ? "xs" : "sm"} target="_blank" minH={isMobile ? "44px" : "auto"} display="flex" alignItems="center">
                  Changelog
                </Link>
                <Link href="/statuts.pdf" _hover={{ color: hoverColor }} fontSize={isMobile ? "xs" : "sm"} target="_blank" minH={isMobile ? "44px" : "auto"} display="flex" alignItems="center">
                  Statuts
                </Link>
                
                <Text fontSize={isMobile ? "sm" : "md"} fontWeight="bold" color="white" mt={2}>
                  Nous Suivre
                </Text>
                <HStack spacing={isMobile ? 4 : 3} wrap="wrap">
                  {/* Facebook */}
                  <Link
                    href="https://www.facebook.com/AssociationRBE/"
                    target="_blank"
                    rel="noopener noreferrer"
                    _hover={{ color: hoverColor }}
                    aria-label="Facebook"
                    minH={isMobile ? "44px" : "auto"}
                    minW={isMobile ? "44px" : "auto"}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <svg width={isMobile ? "20" : "18"} height={isMobile ? "20" : "18"} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </Link>
                  {/* Instagram */}
                  <Link
                    href="https://www.instagram.com/asso.rbe/"
                    target="_blank"
                    rel="noopener noreferrer"
                    _hover={{ color: hoverColor }}
                    aria-label="Instagram"
                    minH={isMobile ? "44px" : "auto"}
                    minW={isMobile ? "44px" : "auto"}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <svg width={isMobile ? "20" : "18"} height={isMobile ? "20" : "18"} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0m5.894 10.797c.042.796.042 1.6.042 2.404 0 4.885-3.729 8.948-8.948 8.948-1.781 0-3.439-.538-4.83-1.456.494.058 1.001.088 1.519.088 1.477 0 2.836-.49 3.921-1.316-1.378-.025-2.539-.928-2.94-2.168.192.036.384.056.579.056.287 0 .568-.04.837-.116-1.44-.29-2.522-1.555-2.522-3.079 0-.025 0-.049.001-.074.426.234.917.375 1.441.39-.844-.564-1.401-1.529-1.401-2.621 0-.577.156-1.118.428-1.583 1.55 1.9 3.86 3.15 6.46 3.283-.053-.224-.08-.457-.08-.696 0-1.686 1.366-3.053 3.053-3.053.879 0 1.672.368 2.228.959.695-.136 1.35-.39 1.94-.74-.228.712-.712 1.31-1.343 1.688.617-.072 1.206-.237 1.755-.48-.41.614-.927 1.151-1.52 1.581"/>
                    </svg>
                  </Link>
                  {/* Discord */}
                  <Link
                    href="https://discord.gg/retrobus-essonne"
                    target="_blank"
                    rel="noopener noreferrer"
                    _hover={{ color: hoverColor }}
                    aria-label="Discord"
                    minH={isMobile ? "44px" : "auto"}
                    minW={isMobile ? "44px" : "auto"}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <svg width={isMobile ? "20" : "18"} height={isMobile ? "20" : "18"} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.3671C18.7975 3.6368 17.1428 3.12937 15.4348 2.85752C15.2767 2.82934 15.1206 2.90187 15.0828 3.06231C14.8565 3.81928 14.5893 4.50655 14.2743 5.11457C12.4471 4.84453 10.6291 4.84453 8.87041 5.11457C8.55528 4.50655 8.27816 3.81928 8.05224 3.06231C8.01473 2.90322 7.85915 2.82934 7.7012 2.85752C6.00327 3.12585 4.35852 3.63328 2.95845 4.3671C2.80503 4.4526 2.71309 4.60584 2.75369 4.75701C5.4865 9.17025 10.4038 12.7926 15.693 13.5247C15.8546 13.5426 16.0067 13.4126 16.0424 13.265C16.3106 12.1845 16.8286 11.1503 17.5749 10.2741C17.7634 10.0771 18.0853 10.0771 18.2738 10.2741C19.7381 11.9699 20.8575 14.0749 21.4766 16.2115C21.5124 16.3667 21.6645 16.4967 21.826 16.4788C22.6563 16.3891 23.4605 16.1965 24.2181 15.9215C24.3706 15.8619 24.4599 15.7035 24.4226 15.5538C23.7645 12.6849 22.5768 10.0347 20.6694 7.96704C20.5249 7.8124 20.3625 7.69547 20.317 7.5504C20.4328 6.85501 20.5464 6.15474 20.5464 5.4504C20.5464 2.1215 18.1239 -0.534702 15.1707 -0.534702C12.2175 -0.534702 9.795 2.1215 9.795 5.4504C9.795 6.15474 9.9086 6.85501 10.0244 7.5504C9.9789 7.69547 9.8165 7.8124 9.672 7.96704C7.76455 10.0347 6.57681 12.6849 5.91874 15.5538C5.88147 15.7035 5.97078 15.8619 6.12328 15.9215C6.88089 16.1965 7.68506 16.3891 8.51538 16.4788C8.67688 16.4967 8.829 16.3667 8.86514 16.2115C9.48427 14.0749 10.6037 11.9699 12.068 10.2741C12.2565 10.0771 12.5784 10.0771 12.7669 10.2741C13.5133 11.1503 14.0313 12.1845 14.2994 13.265C14.335 13.4126 14.4871 13.5426 14.6487 13.5247C19.9376 12.7926 24.8549 9.17025 27.5877 4.75701C27.6283 4.60584 27.5364 4.4526 27.383 4.3671Z"/>
                    </svg>
                  </Link>
                </HStack>
              </VStack>
            </SimpleGrid>
          </Box>

        {/* Divider */}
        <Divider my={isMobile ? 6 : 4} borderColor={borderColor} />

        {/* Bottom section */}
        <VStack spacing={isMobile ? 3 : 2} align="stretch">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={isMobile ? 4 : 3} fontSize={isMobile ? "2xs" : "xs"}>
            <Text textAlign={isMobile ? "center" : "left"}>
              © {currentYear} RétroBus Essonne. Tous droits réservés.
            </Text>
            <HStack justify={{ base: 'center', md: 'end' }} spacing={isMobile ? 3 : 4} wrap="wrap">
              <Link as={RouterLink} to="/mentions-legales" _hover={{ color: hoverColor }} minH={isMobile ? "44px" : "auto"} display="flex" alignItems="center">
                Mentions légales
              </Link>
              <Link as={RouterLink} to="/rgpd" _hover={{ color: hoverColor }} minH={isMobile ? "44px" : "auto"} display="flex" alignItems="center">
                RGPD
              </Link>
              <Link href="/dashboard/support" _hover={{ color: hoverColor }} minH={isMobile ? "44px" : "auto"} display="flex" alignItems="center">
                Support
              </Link>
            </HStack>
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
}
