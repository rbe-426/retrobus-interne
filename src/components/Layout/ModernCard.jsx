import React from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Icon,
  Image,
  Box,
  HStack,
  VStack,
  Badge,
  useColorModeValue
} from '@chakra-ui/react';

const ModernCard = ({ 
  title, 
  description, 
  icon, 
  titleImageSrc,
  titleImageAlt = 'Titre',
  titleImageHeight = '34px',
  titleImageScale = 1,
  titleImageOffsetX = 0,
  titleImageOffsetY = 0,
  badge,
  children,
  variant = "modern",
  color = "gray",
  onClick,
  ...props 
}) => {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverShadow = useColorModeValue(
    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)"
  );

  return (
    <Card
      variant={variant}
      bg={cardBg}
      borderColor={borderColor}
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
      _hover={onClick ? {
        boxShadow: hoverShadow,
        transform: "translateY(-4px)",
        borderColor: `${color}.300`
      } : {}}
      transition="all 0.3s ease-out"
      {...props}
    >
      {(title || icon || badge) && (
        <CardHeader pb={description ? 3 : 6}>
          <HStack justify="space-between" align="start">
            <HStack spacing={3} flex={1}>
              {icon && (
                <Icon 
                  as={icon} 
                  color={`${color}.600`} 
                  boxSize={6}
                  flexShrink={0}
                />
              )}
              <VStack align="start" spacing={1} flex={1}>
                {titleImageSrc ? (
                  <Box h={titleImageHeight} w="100%" position="relative" overflow="hidden">
                    <Image
                      src={titleImageSrc}
                      alt={titleImageAlt}
                      position="absolute"
                      top="50%"
                      left="50%"
                      h={titleImageHeight}
                      objectFit="contain"
                      transform={`translate(calc(-50% + ${titleImageOffsetX}px), calc(-50% + ${titleImageOffsetY}px)) scale(${titleImageScale})`}
                      transformOrigin="center"
                      maxW="none"
                    />
                  </Box>
                ) : (
                  <Heading size="md" color="gray.700" fontWeight="600">
                    {title}
                  </Heading>
                )}
                {description && (
                  <Text variant="description" fontSize="sm">
                    {description}
                  </Text>
                )}
              </VStack>
            </HStack>
            {badge && (
              <Badge colorScheme={badge.color || color} variant="subtle">
                {badge.label}
              </Badge>
            )}
          </HStack>
        </CardHeader>
      )}
      
      {children && (
        <CardBody pt={title ? 0 : 6}>
          {children}
        </CardBody>
      )}
    </Card>
  );
};

export default ModernCard;