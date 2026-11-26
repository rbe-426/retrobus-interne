import { Box, Button, Card, CardBody, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { AmendmentIcon } from './icons';

// Rendu d'un document : TITRE, puis "# ARTICLE N - XX", contenu, et bouton d'amendement à droite.
export default function AgDocumentView({ document, onAmend, actionLabel = 'Amendement à déposer', actionProps = {} }) {
  return (
    <Box>
      <Heading size="md" textTransform="uppercase" mb={4} letterSpacing="0.02em">{document.title}</Heading>
      <Stack spacing={3}>
        {document.articles.map((article) => (
          <Card key={article.id} variant="outline" borderRadius="md">
            <CardBody>
              <Flex gap={4} align="start" justify="space-between" direction={{ base: 'column', md: 'row' }}>
                <Box minW={0} flex={1}>
                  <Text fontWeight="800" textTransform="uppercase"># {article.label}</Text>
                  {article.body && <Text mt={2} whiteSpace="pre-wrap" fontSize="sm" color="gray.700">{article.body}</Text>}
                </Box>
                <Button size="sm" variant="outline" colorScheme="rbe" flexShrink={0} leftIcon={<AmendmentIcon boxSize={4} />} onClick={onAmend ? () => onAmend(document, article) : undefined} {...actionProps}>
                  {actionLabel}
                </Button>
              </Flex>
            </CardBody>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
