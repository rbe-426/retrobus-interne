import React from 'react';
import {
  Box, HStack, VStack, Text, Button,
  useColorModeValue, Icon, Container, Flex
} from '@chakra-ui/react';
import { FiInfo, FiAlertTriangle, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const SEVERITY_LEVELS = {
  info: {
    bg: 'blue.50',
    bgDark: 'blue.900',
    border: 'blue.200',
    borderDark: 'blue.700',
    text: 'blue.800',
    textDark: 'blue.100',
    icon: FiInfo,
    iconColor: 'blue.500'
  },
  warning: {
    bg: 'orange.50',
    bgDark: 'orange.900',
    border: 'orange.200',
    borderDark: 'orange.700',
    text: 'orange.800',
    textDark: 'orange.100',
    icon: FiAlertTriangle,
    iconColor: 'orange.500'
  },
  success: {
    bg: 'green.50',
    bgDark: 'green.900',
    border: 'green.200',
    borderDark: 'green.700',
    text: 'green.800',
    textDark: 'green.100',
    icon: FiCheckCircle,
    iconColor: 'green.500'
  },
  critical: {
    bg: 'linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)',
    bgDark: 'linear-gradient(135deg, #63171b 0%, #3b0b0d 100%)',
    border: 'red.200',
    borderDark: 'red.700',
    text: 'red.800',
    textDark: 'red.100',
    icon: FiAlertCircle,
    iconColor: 'red.500',
    ringColor: 'rgba(229, 62, 62, 0.35)'
  }
};

function AnnouncementBanner({ announcement }) {
  const severityKey = String(announcement?.severity || 'info').toLowerCase();
  const severity = SEVERITY_LEVELS[severityKey] || SEVERITY_LEVELS.info;
  const isCritical = severityKey === 'critical';

  const bgColor = useColorModeValue(severity.bg, severity.bgDark);
  const textColor = useColorModeValue(severity.text, severity.textDark);
  const SeverityIcon = severity.icon;

  return (
    <Box
      bg={bgColor}
      borderLeft="4px solid"
      borderColor={severity.iconColor}
      padding="16px"
      marginY="12px"
      borderRadius="md"
      boxShadow={isCritical ? '0 0 0 2px rgba(229, 62, 62, 0.18), 0 10px 24px rgba(229, 62, 62, 0.22)' : 'sm'}
      animation="slideDown 0.3s ease-out"
      position="relative"
      overflow="hidden"
    >
      {isCritical && (
        <Box
          position="absolute"
          top="0"
          right="0"
          px="10px"
          py="4px"
          bg="red.600"
          color="white"
          fontSize="10px"
          fontWeight="800"
          letterSpacing="0.6px"
          borderBottomLeftRadius="md"
        >
          ALERTE MAJEURE
        </Box>
      )}
      <Flex align="flex-start" gap="12px">
        <Icon
          as={SeverityIcon}
          fontSize="20px"
          color={severity.iconColor}
          marginTop="2px"
          flexShrink={0}
          sx={isCritical ? {
            filter: `drop-shadow(0 0 6px ${severity.ringColor})`,
            animation: 'criticalPulse 1.4s ease-in-out infinite'
          } : {}}
        />

        <VStack align="flex-start" spacing="8px" flex="1">
          {announcement.title && (
            <Text fontWeight="bold" color={textColor} fontSize="md">
              {announcement.title}
            </Text>
          )}

          {announcement.message && (
            <Text color={textColor} fontSize="sm" lineHeight="1.5">
              {announcement.message}
            </Text>
          )}

          {announcement.actions && announcement.actions.length > 0 && (
            <HStack spacing="8px" marginTop="4px">
              {announcement.actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant="outline"
                  colorScheme={severityKey === 'critical' ? 'red' : severityKey === 'warning' ? 'orange' : severityKey === 'success' ? 'green' : 'blue'}
                  onClick={() => {
                    if (action.onClick) action.onClick();
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </HStack>
          )}
        </VStack>

      </Flex>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes criticalPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.88;
          }
        }
      `}</style>
    </Box>
  );
}

export default function HomeAnnouncementsDisplay({ announcements }) {
  if (!announcements || announcements.length === 0) {
    return null;
  }

  return (
    <Container maxW="container.lg" paddingX={0}>
      <VStack spacing={0} align="stretch">
        {announcements.map((announcement) => (
          <AnnouncementBanner
            key={announcement.id}
            announcement={announcement}
          />
        ))}
      </VStack>
    </Container>
  );
}
