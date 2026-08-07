import React from "react";
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  VStack, 
  Link as ChakraLink,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
  Divider,
  Badge
} from "@chakra-ui/react";
import { FiCheckCircle, FiShield, FiLock } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import PageLayout from "../components/Layout/PageLayout";

export default function RGPD() {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.300');

  return (
    <PageLayout
      title="Politique RGPD & Confidentialité"
      subtitle="Protection de vos données personnelles"
      headerVariant="card"
      bgGradient="linear(to-r, rbe.500, rbe.600)"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/home" },
        { label: "RGPD", href: "/rgpd" }
      ]}
    >
      <Box bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} p={{ base: 6, md: 8 }} shadow="sm">
        <VStack align="start" spacing={6}>
          <Box>
            <Badge colorScheme="green" fontSize="sm" px={3} py={1} borderRadius="full" mb={3}>
              <FiShield style={{ display: 'inline', marginRight: '6px' }} />
              Conformité RGPD
            </Badge>
            <Text fontSize="sm" color="gray.500">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </Text>
          </Box>

          {/* Introduction */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              1. Introduction
            </Heading>
            <Text fontSize="sm" color={textColor}>
              L'association RétroBus Essonne s'engage à protéger la vie privée et les données personnelles de ses 
              membres et utilisateurs. Cette politique explique comment nous collectons, utilisons, conservons et 
              protégeons vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD) 
              et à la loi Informatique et Libertés.
            </Text>
          </Box>

          <Divider />

          {/* Données collectées */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              2. Données Personnelles Collectées
            </Heading>
            <Text fontSize="sm" mb={3} color={textColor}>
              Dans le cadre de la gestion de l'association et de l'utilisation de l'intranet, nous collectons :
            </Text>
            <List spacing={2}>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Données d'adhésion :</strong> Nom, prénom, date de naissance, adresse, email, téléphone
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Compte utilisateur :</strong> Identifiant, mot de passe (chiffré), matricule, rôle
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Données financières :</strong> Montant de cotisation, mode de paiement, statut
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Inscription aux événements :</strong> Présences, disponibilités, préférences
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Communications :</strong> Emails, messages internes, notifications
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Données de connexion :</strong> Adresse IP, logs de connexion, historique d'activité
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Newsletter :</strong> Email, consentement d'inscription
              </ListItem>
            </List>
          </Box>

          <Divider />

          {/* Base légale */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              3. Base Légale du Traitement
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                <strong>Exécution d'un contrat :</strong> Gestion de votre adhésion et participation aux activités de l'association
              </Text>
              <Text>
                <strong>Consentement :</strong> Newsletter, communications marketing (révocable à tout moment)
              </Text>
              <Text>
                <strong>Obligations légales :</strong> Respect de la législation française et européenne (comptabilité, fiscalité)
              </Text>
              <Text>
                <strong>Intérêts légitimes :</strong> Amélioration de nos services, sécurité du site, prévention de la fraude
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Utilisation des données */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              4. Utilisation de Vos Données
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text mb={2}>Nous utilisons vos données pour :</Text>
              <List spacing={1}>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="rbe.500" />
                  Gérer votre adhésion et votre compte utilisateur
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="rbe.500" />
                  Organiser les événements et gérer les inscriptions
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="rbe.500" />
                  Traiter les paiements et gérer la comptabilité
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="rbe.500" />
                  Communiquer avec vous (informations, newsletters, notifications)
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="rbe.500" />
                  Gérer le parc de véhicules et les plannings
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="rbe.500" />
                  Assurer la sécurité et le bon fonctionnement du site
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="rbe.500" />
                  Améliorer nos services et proposer du contenu adapté
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="rbe.500" />
                  Respecter nos obligations légales et réglementaires
                </ListItem>
              </List>
            </VStack>
          </Box>

          <Divider />

          {/* Partage des données */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              5. Partage et Communication de Vos Données
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                <strong>Principe :</strong> Nous ne vendons jamais vos données personnelles à des tiers.
              </Text>
              <Text>
                <strong>Prestataires techniques :</strong> Nous pouvons partager vos données avec nos prestataires 
                (hébergement Railway, services email Infomaniak) qui sont tenus par des obligations strictes de 
                confidentialité et de sécurité.
              </Text>
              <Text>
                <strong>Partenaires événementiels :</strong> Pour l'organisation d'événements, certaines données 
                peuvent être partagées avec nos partenaires (avec votre consentement explicite).
              </Text>
              <Text>
                <strong>Obligations légales :</strong> Nous pouvons divulguer vos données si exigé par la loi ou 
                par une autorité compétente (police, justice, administration fiscale).
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Conservation */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              6. Durée de Conservation des Données
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                <strong>Données d'adhésion active :</strong> Pendant toute la durée de votre adhésion + 3 ans
              </Text>
              <Text>
                <strong>Données comptables :</strong> 10 ans (obligation légale)
              </Text>
              <Text>
                <strong>Logs de connexion :</strong> 1 an maximum
              </Text>
              <Text>
                <strong>Newsletter :</strong> Jusqu'à désinscription
              </Text>
              <Text>
                <strong>Événements passés :</strong> Durée de l'événement + 2 ans
              </Text>
              <Text>
                <strong>Anciens adhérents :</strong> Suppression après 3 ans d'inactivité (sauf données comptables)
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Droits RGPD */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              7. Vos Droits RGPD
            </Heading>
            <Text fontSize="sm" mb={3} color={textColor}>
              Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :
            </Text>
            <List spacing={2}>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Droit d'accès :</strong> Obtenir une copie de toutes vos données personnelles
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Droit de rectification :</strong> Corriger vos données inexactes ou incomplètes
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Droit à l'effacement ("droit à l'oubli") :</strong> Demander la suppression de vos données 
                (sauf obligations légales)
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Droit à la limitation du traitement :</strong> Limiter temporairement l'utilisation de vos données
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Droit à la portabilité :</strong> Récupérer vos données dans un format structuré et couramment utilisé
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données pour motifs légitimes
              </ListItem>
              <ListItem fontSize="sm" color={textColor}>
                <ListIcon as={FiCheckCircle} color="rbe.500" />
                <strong>Droit de retirer votre consentement :</strong> Pour les traitements basés sur le consentement 
                (newsletter, etc.)
              </ListItem>
            </List>
          </Box>

          <Divider />

          {/* Exercer vos droits */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              8. Comment Exercer Vos Droits
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                Pour exercer l'un de vos droits RGPD, vous pouvez :
              </Text>
              <List spacing={1} pl={4}>
                <ListItem>
                  • Envoyer un email à{" "}
                  <ChakraLink href="mailto:association.rbe@gmail.com" color="rbe.500" fontWeight="600">
                    association.rbe@gmail.com
                  </ChakraLink>
                </ListItem>
                <ListItem>
                  • Nous contacter via le formulaire de contact du site
                </ListItem>
                <ListItem>
                  • Accéder à votre profil utilisateur pour certaines modifications
                </ListItem>
              </List>
              <Text mt={3}>
                Nous traiterons votre demande dans un délai maximum de <strong>30 jours</strong>. Une pièce d'identité 
                pourra être demandée pour vérifier votre identité.
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Sécurité */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              <FiLock style={{ display: 'inline', marginRight: '8px' }} />
              9. Sécurité des Données
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour 
                protéger vos données contre :
              </Text>
              <List spacing={1} pl={4}>
                <ListItem>• L'accès non autorisé</ListItem>
                <ListItem>• La modification, divulgation ou destruction de données</ListItem>
                <ListItem>• La perte accidentelle de données</ListItem>
              </List>
              <Text mt={2}>
                <strong>Mesures mises en place :</strong>
              </Text>
              <List spacing={1} pl={4}>
                <ListItem>• Chiffrement des mots de passe (hash bcrypt)</ListItem>
                <ListItem>• Protection CSRF pour les formulaires</ListItem>
                <ListItem>• Connexion HTTPS sécurisée</ListItem>
                <ListItem>• Sauvegardes régulières des données</ListItem>
                <ListItem>• Accès restreint aux données (rôles et permissions)</ListItem>
                <ListItem>• Surveillance et logs de sécurité</ListItem>
              </List>
              <Text mt={2} fontStyle="italic">
                Aucun système n'étant totalement sécurisé, nous encourageons les utilisateurs à protéger leurs 
                mots de passe et à nous signaler immédiatement toute activité suspecte.
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Cookies */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              10. Cookies et Technologies Similaires
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                Ce site utilise des cookies et technologies similaires pour :
              </Text>
              <List spacing={1} pl={4}>
                <ListItem>• Maintenir votre session de connexion</ListItem>
                <ListItem>• Mémoriser vos préférences</ListItem>
                <ListItem>• Améliorer l'expérience utilisateur</ListItem>
                <ListItem>• Analyser le trafic et l'utilisation du site</ListItem>
                <ListItem>• Assurer la sécurité (tokens CSRF)</ListItem>
              </List>
              <Text mt={2}>
                Vous pouvez désactiver les cookies non essentiels dans les paramètres de votre navigateur, 
                bien que cela puisse affecter certaines fonctionnalités du site.
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Transferts internationaux */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              11. Transferts de Données Hors UE
            </Heading>
            <Text fontSize="sm" color={textColor}>
              Nos prestataires d'hébergement (Railway) peuvent stocker vos données sur des serveurs situés en 
              dehors de l'Union Européenne. Dans ce cas, nous veillons à ce que des garanties appropriées soient 
              en place conformément au RGPD (clauses contractuelles types, Privacy Shield, etc.).
            </Text>
          </Box>

          <Divider />

          {/* Contact et plaintes */}
          <Box w="full">
            <Heading as="h2" size="md" color="rbe.500" mb={3}>
              12. Contact et Réclamations
            </Heading>
            <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
              <Text>
                <strong>Responsable des données :</strong> Président de l'association RétroBus Essonne
              </Text>
              <Text>
                <strong>Contact :</strong>{" "}
                <ChakraLink href="mailto:association.rbe@gmail.com" color="rbe.500" fontWeight="600">
                  association.rbe@gmail.com
                </ChakraLink>
              </Text>
              <Text mt={3}>
                Si vous estimez que vos droits ne sont pas respectés ou que vos données ne sont pas traitées 
                conformément au RGPD, vous avez le droit de déposer une plainte auprès de la CNIL 
                (Commission Nationale de l'Informatique et des Libertés) :
              </Text>
              <Text>
                <ChakraLink href="https://www.cnil.fr" target="_blank" color="rbe.500" fontWeight="600">
                  www.cnil.fr
                </ChakraLink>
                {" • "}
                <ChakraLink href="mailto:contact@cnil.fr" color="rbe.500">
                  contact@cnil.fr
                </ChakraLink>
                {" • "}
                Téléphone : 01 53 73 22 22
              </Text>
            </VStack>
          </Box>

          <Divider />

          {/* Modifications */}
          <Box borderTop="2px solid" borderTopColor="rbe.500" pt={6} w="full">
            <Text fontSize="sm" color="gray.600">
              Cette politique de confidentialité peut être modifiée à tout moment pour refléter les évolutions 
              de nos pratiques ou de la réglementation. Les modifications seront publiées sur cette page avec 
              une nouvelle date de mise à jour. Nous vous encourageons à consulter régulièrement cette page.
            </Text>
          </Box>
        </VStack>
      </Box>
    </PageLayout>
  );
}
