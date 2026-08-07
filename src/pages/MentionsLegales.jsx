import React from "react";
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  VStack, 
  Link as ChakraLink,
  useColorModeValue,
  Divider
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import PageLayout from "../components/Layout/PageLayout";

export default function MentionsLegales() {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.300');

  return (
    <PageLayout
      title="Mentions Légales"
      subtitle="Informations légales et éditoriales"
      headerVariant="card"
      bgGradient="linear(to-r, rbe.500, rbe.600)"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/home" },
        { label: "Mentions Légales", href: "/mentions-legales" }
      ]}
    >
      <Box bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} p={{ base: 6, md: 8 }} shadow="sm">
        <VStack align="start" spacing={6}>
          <Text fontSize="sm" color="gray.500">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </Text>

          {/* Informations générales */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              1. Informations Générales
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                <strong>Nom de l'association :</strong> Association RétroBus Essonne
              </Text>
              <Text>
                <strong>RNA (Répertoire National des Associations) :</strong> W912016571
              </Text>
              <Text>
                <strong>SIREN :</strong> 942 506 607 00010
              </Text>
              <Text>
                <strong>Siège social :</strong> Essonne, France
              </Text>
              <Text>
                <strong>Email :</strong>{" "}
                <ChakraLink href="mailto:association.rbe@gmail.com" color="rbe.500" _hover={{ textDecoration: 'underline' }}>
                  association.rbe@gmail.com
                </ChakraLink>
              </Text>
              <Text>
                <strong>Téléphone :</strong> 06 44 50 11 86
              </Text>
              <Text>
                <strong>Site web :</strong>{" "}
                <ChakraLink href="https://www.association-rbe.fr" target="_blank" color="rbe.500" _hover={{ textDecoration: 'underline' }}>
                  www.association-rbe.fr
                </ChakraLink>
              </Text>
              <Text>
                <strong>Représentant légal :</strong> Président de l'association
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Responsable de publication */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              2. Responsable de Publication
            </Heading>
            <Text fontSize="sm" color={textColor}>
              Ce site intranet est édité par l'association RétroBus Essonne. Le responsable de la publication 
              est le Président de l'association. Le site est réservé aux membres et personnel autorisé de l'association.
            </Text>
          </Box>

          <Divider />

          {/* Hébergement */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              3. Hébergement
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                <strong>Hébergeur :</strong> Railway
              </Text>
              <Text>
                <strong>Service :</strong> Cloud hosting provider
              </Text>
              <Text>
                <strong>Site web :</strong>{" "}
                <ChakraLink href="https://railway.app" target="_blank" color="rbe.500" _hover={{ textDecoration: 'underline' }}>
                  https://railway.app
                </ChakraLink>
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Accès au site */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              4. Accès au Site Intranet
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                Ce site intranet est accessible uniquement aux membres et au personnel autorisé de l'association 
                RétroBus Essonne, munis d'identifiants de connexion valides.
              </Text>
              <Text>
                Le site est accessible 7j/7, 24h/24 sauf cas de force majeure, interruption programmée ou non 
                découlant d'une nécessité de maintenance. En cas de modification, interruption ou suspension du site, 
                l'association ne saurait être tenue responsable.
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Propriété intellectuelle */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              5. Propriété Intellectuelle
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                L'ensemble des contenus (textes, images, graphiques, logo, icônes, sons, vidéos, données) présents 
                sur ce site intranet sont la propriété exclusive de l'association RétroBus Essonne ou de ses partenaires.
              </Text>
              <Text>
                La conception, la forme, le titre et l'ensemble des éléments contenus sur le site sont protégés 
                au titre du droit d'auteur et des marques. Toute reproduction, utilisation, adaptation, incorporation, 
                modification ou diffusion est expressément interdite sans autorisation préalable écrite.
              </Text>
              <Text>
                Les utilisateurs s'engagent à respecter les droits d'auteur, de marque et tous autres droits de 
                propriété intellectuelle. Toute utilisation non autorisée peut faire l'objet de poursuites.
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Confidentialité */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              6. Confidentialité
            </Heading>
            <Text fontSize="sm" color={textColor}>
              Les utilisateurs s'engagent à respecter la confidentialité des informations accessibles sur ce site 
              intranet. Toute divulgation non autorisée d'informations confidentielles peut entraîner des sanctions, 
              y compris la révocation de l'accès et des poursuites légales.
            </Text>
          </Box>

          <Divider />

          {/* Limitation de responsabilité */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              7. Limitation de Responsabilité
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                L'association RétroBus Essonne s'efforce de fournir des informations exactes et à jour sur le site. 
                Cependant, elle ne peut garantir l'exactitude, la complétude ou l'absence d'erreur des contenus.
              </Text>
              <Text>
                L'association décline toute responsabilité en cas de dommages directs ou indirects résultant de 
                l'accès ou de l'utilisation du site, y compris la perte de données ou l'interruption de service.
              </Text>
              <Text>
                Les utilisateurs sont responsables de leurs actions sur le site et doivent se conformer aux 
                règles d'utilisation établies par l'association.
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Liens externes */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              8. Liens Externes
            </Heading>
            <Text fontSize="sm" color={textColor}>
              Le site peut contenir des liens vers d'autres sites web. L'association RétroBus Essonne n'est pas 
              responsable du contenu de ces sites externes ni des pratiques de confidentialité qu'ils appliquent.
            </Text>
          </Box>

          <Divider />

          {/* Modifications */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              9. Modifications
            </Heading>
            <Text fontSize="sm" color={textColor}>
              L'association RétroBus Essonne se réserve le droit de modifier les présentes mentions légales à 
              tout moment. Les utilisateurs sont invités à consulter régulièrement cette page pour prendre 
              connaissance des éventuelles modifications.
            </Text>
          </Box>

          <Divider />

          {/* Droit applicable */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              10. Droit Applicable et Juridiction
            </Heading>
            <Text fontSize="sm" color={textColor}>
              Les présentes mentions légales sont régies par le droit français. En cas de litige, et après 
              l'échec de toute tentative de recherche d'une solution amiable, les tribunaux français seront 
              seuls compétents.
            </Text>
          </Box>

          <Divider />

          {/* Contact */}
          <Box borderTop="2px solid" borderTopColor="rbe.500" pt={6} w="full">
            <Text fontSize="sm" color="gray.600">
              Pour toute question concernant ces mentions légales, veuillez contacter :{" "}
              <ChakraLink href="mailto:association.rbe@gmail.com" color="rbe.500" fontWeight="600">
                association.rbe@gmail.com
              </ChakraLink>
            </Text>
          </Box>
        </VStack>
      </Box>
    </PageLayout>
  );
}
