import React from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  useColorModeValue
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';

const PageLayout = ({ 
  title, 
  subtitle, 
  breadcrumbs = [], 
  children, 
  headerActions,
  bgGradient,
  maxW = "container.xl",
  // Styling overrides (optional)
  titleSize = "2xl",
  titleWeight = "800",
  // Header rendering variant: 'full' (default) or 'card' like Dashboard
  headerVariant = 'full'
}) => {
  const headerBg = useColorModeValue(
    bgGradient || "linear(to-r, rbe.600, rbe.800)",
    "linear(to-r, rbe.700, rbe.900)"
  );

  return (
    <Box minH="100vh" fontFamily="Montserrat, system-ui, sans-serif">
      {/* Header */}
      {headerVariant === 'full' ? (
        <Box
          bgGradient={headerBg}
          color="white"
          py={{ base: 6, md: 8 }}
          position="relative"
          overflow="hidden"
        >
          {/* Effet de profondeur */}
          <Box
            position="absolute"
            inset={0}
            bgGradient="radial(circle at 30% 30%, whiteAlpha.200, transparent 50%)"
            pointerEvents="none"
          />

          <Container maxW={maxW} position="relative">
            <VStack spacing={6} align="stretch">
              {/* Breadcrumb */}
              {breadcrumbs.length > 0 && (
                <Breadcrumb 
                  separator={<FiChevronRight color="whiteAlpha.700" />}
                  color="whiteAlpha.800"
                  fontSize="sm"
                >
                  {breadcrumbs.map((crumb, index) => (
                    <BreadcrumbItem key={index}>
                      <BreadcrumbLink 
                        as={RouterLink} 
                        to={crumb.href}
                        _hover={{ color: "white" }}
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  ))}
                </Breadcrumb>
              )}

              {/* Titre et sous-titre */}
              <VStack spacing={2} textAlign="center">
                <Heading 
                  as="h1" 
                  size={titleSize}
                  fontWeight={titleWeight}
                  letterSpacing="-0.025em"
                  textShadow="0 2px 4px rgba(0,0,0,0.1)"
                >
                  {title}
                </Heading>

                {subtitle && (
                  <Text 
                    fontSize={{ base: "lg", md: "xl" }} 
                    opacity={0.9}
                    maxW="2xl"
                    lineHeight="relaxed"
                  >
                    {subtitle}
                  </Text>
                )}

                {headerActions && (
                  <Box pt={4}>
                    {headerActions}
                  </Box>
                )}
              </VStack>
            </VStack>
          </Container>
        </Box>
      ) : (
        <Container maxW={maxW} py={{ base: 3, md: 4 }}>
          {/* Breadcrumb au-dessus de la carte */}
          {breadcrumbs.length > 0 && (
            <Breadcrumb 
              separator={<FiChevronRight />}
              color={useColorModeValue("gray.600", "gray.300")}
              fontSize="sm"
              mb={4}
            >
              {breadcrumbs.map((crumb, index) => (
                <BreadcrumbItem key={index}>
                  <BreadcrumbLink as={RouterLink} to={crumb.href}>
                    {crumb.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              ))}
            </Breadcrumb>
          )}

          {/* Carte gradient façon Dashboard */}
          <Box
            bgGradient={headerBg}
            color="white"
            p={{ base: 6, md: 8 }}
            borderRadius="xl"
            textAlign="center"
            boxShadow="lg"
          >
            <Heading as="h1" size={titleSize} fontWeight={titleWeight} letterSpacing="-0.02em">
              {title}
            </Heading>
            {subtitle && (
              <Text mt={2} opacity={0.9} fontSize={{ base: 'md', md: 'lg' }}>
                {subtitle}
              </Text>
            )}
            {headerActions && (
              <Box pt={4}>
                {headerActions}
              </Box>
            )}
          </Box>
        </Container>
      )}

      {/* Contenu principal */}
      <Container maxW={maxW} py={{ base: 2, md: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

export default PageLayout;