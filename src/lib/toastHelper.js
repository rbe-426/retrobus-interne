// Toast helper avec thème RBE unifié
export const createToast = (toast, options = {}) => {
  const {
    title = "Notification",
    description = "",
    status = "info",
    duration = 3000,
    isClosable = true,
    position = "bottom-right"
  } = options;

  // Couleurs cohérentes avec le thème
  const colorSchemes = {
    success: {
      bg: "green.50",
      borderColor: "green.200",
      textColor: "green.800",
      iconColor: "green.600"
    },
    error: {
      bg: "red.50",
      borderColor: "red.200",
      textColor: "red.800",
      iconColor: "red.600"
    },
    warning: {
      bg: "orange.50",
      borderColor: "orange.200",
      textColor: "orange.800",
      iconColor: "orange.600"
    },
    info: {
      bg: "blue.50",
      borderColor: "blue.200",
      textColor: "blue.800",
      iconColor: "blue.600"
    }
  };

  const colors = colorSchemes[status] || colorSchemes.info;

  return toast({
    title,
    description,
    status,
    duration,
    isClosable,
    position,
    render: ({ onClose }) => (
      <Box
        bg={colors.bg}
        borderLeft="4px solid"
        borderColor={colors.borderColor}
        p={4}
        borderRadius="md"
        boxShadow="md"
        color={colors.textColor}
        maxW="sm"
      >
        <HStack spacing={3} align="flex-start">
          <Icon as={status === 'success' ? FiCheckCircle : FiAlertCircle} boxSize={5} color={colors.iconColor} />
          <VStack spacing={0} align="stretch" flex={1}>
            {title && <Text fontWeight="bold">{title}</Text>}
            {description && <Text fontSize="sm">{description}</Text>}
          </VStack>
        </HStack>
      </Box>
    )
  });
};

// Pour Chakra UI, tu peux aussi utiliser le composant Alert directement:
/*
<Alert
  status={status}
  variant="left-accent"
  flexDirection="column"
  alignItems="flex-start"
  borderRadius="md"
  mb={4}
  bg={colors.bg}
  borderColor={colors.borderColor}
  color={colors.textColor}
>
  <AlertIcon color={colors.iconColor} />
  <Box ml={3}>
    {title && <AlertTitle>{title}</AlertTitle>}
    {description && <AlertDescription>{description}</AlertDescription>}
  </Box>
</Alert>
*/
