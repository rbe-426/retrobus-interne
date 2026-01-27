import {
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Icon,
  Heading,
  Box,
  useColorModeValue
} from '@chakra-ui/react';

/**
 * KPI Card - Composant réutilisable pour afficher une métrique
 * Avec support des couleurs, valeurs, tendances et labels
 */
export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  colorScheme = 'blue',
  trend = null, // { value: number, isPositive: boolean }
  size = 'md', // 'sm' | 'md' | 'lg'
  onClick = null,
  isClickable = false
}) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColors = {
    blue: 'blue.500',
    green: 'green.500',
    orange: 'orange.500',
    purple: 'purple.500',
    yellow: 'yellow.500',
    cyan: 'cyan.500',
    red: 'red.500',
    gray: 'gray.500'
  };

  const iconColors = {
    blue: 'blue.500',
    green: 'green.500',
    orange: 'orange.500',
    purple: 'purple.500',
    yellow: 'yellow.500',
    cyan: 'cyan.500',
    red: 'red.500',
    gray: 'gray.500'
  };

  const sizeConfig = {
    sm: { heading: 'md', text: 'xs', icon: 4 },
    md: { heading: 'lg', text: 'sm', icon: 5 },
    lg: { heading: 'xl', text: 'md', icon: 6 }
  };

  const config = sizeConfig[size];

  return (
    <Card
      bg={cardBg}
      borderRadius="lg"
      boxShadow="sm"
      borderLeft="4px"
      borderColor={borderColors[colorScheme]}
      cursor={isClickable ? 'pointer' : 'default'}
      onClick={onClick}
      transition="all 0.3s"
      _hover={isClickable ? { boxShadow: 'md', transform: 'translateY(-2px)' } : {}}
    >
      <CardBody>
        <VStack align="start" spacing={2}>
          <HStack justify="space-between" width="100%">
            <Text
              fontSize={config.text}
              color="gray.600"
              fontWeight="600"
              maxW="80%"
              noOfLines={1}
            >
              {title}
            </Text>
            {icon && (
              <Icon
                as={icon}
                color={iconColors[colorScheme]}
                boxSize={config.icon}
              />
            )}
          </HStack>

          <Heading size={config.heading} color={iconColors[colorScheme]}>
            {value}
          </Heading>

          {subtitle && (
            <HStack spacing={2} width="100%">
              <Text fontSize={config.text} color="gray.500">
                {subtitle}
              </Text>
              {trend && (
                <Box
                  px={2}
                  py={0.5}
                  borderRadius="md"
                  bg={trend.isPositive ? 'green.50' : 'red.50'}
                  fontSize="xs"
                  fontWeight="600"
                  color={trend.isPositive ? 'green.600' : 'red.600'}
                >
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </Box>
              )}
            </HStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
