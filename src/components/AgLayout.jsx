import { Badge, Box, Button, Drawer, DrawerBody, DrawerContent, DrawerOverlay, Flex, Heading, HStack, Icon, IconButton, Text, VStack, useDisclosure } from '@chakra-ui/react';
import { FiMenu, FiUsers } from 'react-icons/fi';

// Layout identique à l'administration « 920 Le Bot ! » : barre latérale sombre + en-tête blanc.
export default function AgLayout({ title = 'Assemblée générale', subtitle = 'URBEX', groups, active, onSelect, badge, children }) {
  const mobile = useDisclosure();
  const activeItem = groups.flatMap((group) => group.items).find((item) => item.id === active);
  const select = (id) => { onSelect(id); mobile.onClose(); };

  const navigation = (
    <VStack align="stretch" spacing={0} h="full">
      <Box px={5} py={5} borderBottomWidth="1px" borderColor="whiteAlpha.300">
        <HStack spacing={3}>
          <Flex w="36px" h="36px" align="center" justify="center" bg="rbe.500" color="white" borderRadius="md"><Icon as={FiUsers} boxSize={5} /></Flex>
          <Box minW={0}>
            <Heading size="sm" color="white">{title}</Heading>
            <Text fontSize="xs" color="whiteAlpha.700">{subtitle}</Text>
          </Box>
        </HStack>
      </Box>
      <VStack align="stretch" spacing={5} px={3} py={5} flex={1} overflowY="auto">
        {groups.map((group) => (
          <Box key={group.label}>
            <Text px={3} mb={2} fontSize="xs" fontWeight="700" letterSpacing="0.08em" color="whiteAlpha.600" textTransform="uppercase">{group.label}</Text>
            <VStack align="stretch" spacing={1}>
              {group.items.map((item) => {
                const isActive = item.id === active;
                return (
                  <Button key={item.id} variant="ghost" justifyContent="flex-start" minH="46px" px={3} color={isActive ? 'white' : 'whiteAlpha.800'} bg={isActive ? 'rbe.500' : 'transparent'} borderLeft="3px solid" borderLeftColor={isActive ? 'white' : 'transparent'} borderRadius="md" _hover={{ bg: isActive ? 'rbe.600' : 'whiteAlpha.200', color: 'white' }} onClick={() => select(item.id)}>
                    <HStack spacing={3} w="full" minW={0}>
                      <Icon as={item.icon} boxSize={4} flexShrink={0} />
                      <Box textAlign="left" minW={0}>
                        <Text fontSize="sm" fontWeight={isActive ? '700' : '600'} noOfLines={1}>{item.label}</Text>
                        {item.description && <Text fontSize="xs" color={isActive ? 'whiteAlpha.800' : 'whiteAlpha.600'} noOfLines={1}>{item.description}</Text>}
                      </Box>
                    </HStack>
                  </Button>
                );
              })}
            </VStack>
          </Box>
        ))}
      </VStack>
      <Box px={5} py={4} borderTopWidth="1px" borderColor="whiteAlpha.300"><Text fontSize="xs" color="whiteAlpha.600">RétroBus Essonne</Text></Box>
    </VStack>
  );

  return (
    <Flex minH="calc(100vh - 80px)" bg="gray.50" align="stretch">
      <Box display={{ base: 'none', lg: 'block' }} w="280px" flexShrink={0} bg="gray.900">
        <Box position="sticky" top="80px" h="calc(100vh - 80px)">{navigation}</Box>
      </Box>
      <Drawer isOpen={mobile.isOpen} placement="left" onClose={mobile.onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent bg="gray.900"><DrawerBody p={0}>{navigation}</DrawerBody></DrawerContent>
      </Drawer>
      <Box flex={1} minW={0}>
        <Flex position="sticky" top="80px" zIndex={10} minH="72px" px={{ base: 4, md: 6 }} bg="white" borderBottomWidth="1px" borderColor="gray.200" align="center" justify="space-between" gap={4}>
          <HStack minW={0} spacing={3}>
            <IconButton display={{ base: 'inline-flex', lg: 'none' }} icon={<FiMenu />} aria-label="Ouvrir la navigation" variant="outline" color="rbe.600" borderColor="rbe.300" onClick={mobile.onOpen} />
            <Box minW={0}>
              <Text fontSize="xs" fontWeight="700" color="rbe.600" textTransform="uppercase">{title}</Text>
              <Heading size="md" noOfLines={1}>{activeItem?.label}</Heading>
            </Box>
          </HStack>
          {badge && <Badge colorScheme="gray" variant="subtle" flexShrink={0}>{badge}</Badge>}
        </Flex>
        <Box p={{ base: 4, md: 6 }} maxW="1440px">{children}</Box>
      </Box>
    </Flex>
  );
}
