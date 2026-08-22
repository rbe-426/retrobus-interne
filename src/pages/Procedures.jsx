import React from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  List,
  ListItem,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiArrowLeft, FiBook, FiCheckCircle, FiFileText, FiShield, FiTool, FiUsers } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '../components/Layout/PageLayout';

const procedures = [
  {
    id: 'vehicules',
    title: 'Procédures véhicules',
    icon: FiUsers,
    color: 'blue',
    documents: [
      { title: 'Contrôle avant départ', description: 'Vérifications techniques et administratives avant une sortie.' },
      { title: 'Déclaration d’anomalie véhicule', description: 'Signalement, niveau de criticité et transmission au responsable.' },
      { title: 'Compte rendu d’utilisation', description: 'Traçabilité des trajets, incidents et retours d’exploitation.' },
    ],
  },
  {
    id: 'commerciales',
    title: 'Procédures commerciales',
    icon: FiFileText,
    color: 'teal',
    documents: [
      { title: 'Qualification d’une demande', description: 'Collecte des besoins, contraintes et informations client.' },
      { title: 'Émission d’un devis', description: 'Validation des tarifs, conditions et disponibilités.' },
      { title: 'Suivi d’une prestation', description: 'Confirmation, échanges et clôture commerciale.' },
    ],
  },
  {
    id: 'tournage-safe',
    title: 'Procédures TOURNAGE & SAFE',
    icon: FiTool,
    color: 'orange',
    documents: [
      { title: 'Préparation de tournage', description: 'Périmètre, planning, véhicules et responsables.' },
      { title: 'Autorisation et assurance', description: 'Contrôles préalables des documents requis sur site.' },
      { title: 'Briefing SAFE', description: 'Consignes d’équipe, zones de travail et registre des incidents.' },
    ],
  },
  {
    id: 'securite',
    title: 'Procédures Sécurité',
    icon: FiShield,
    color: 'purple',
    documents: [
      { title: 'Gestion d’un incident', description: 'Mise en sécurité, alerte et première traçabilité.' },
      { title: 'Évacuation et incendie', description: 'Conduite à tenir et rôles des personnes présentes.' },
      { title: 'Déclaration d’événement sécurité', description: 'Compte rendu, suivi et mesures correctives.' },
    ],
  },
];

export default function Procedures() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const selectedCategory = procedures.find((procedure) => procedure.id === categoryId);

  if (categoryId && !selectedCategory) {
    navigate('/dashboard/procedures', { replace: true });
    return null;
  }

  return (
    <PageLayout
      title={selectedCategory?.title || 'Procédures'}
      subtitle={selectedCategory ? 'Documents associés à cette catégorie' : 'Référentiel opérationnel RétroBus Essonne'}
      headerVariant="card"
      bgGradient="linear(to-r, purple.600, purple.800)"
      titleSize="lg"
    >
      <VStack spacing={6} align="stretch">
        {selectedCategory ? (
          <>
            <Button alignSelf="start" leftIcon={<FiArrowLeft />} variant="ghost" onClick={() => navigate('/dashboard/procedures')}>Toutes les catégories</Button>
            <VStack align="stretch" spacing={3}>
              {selectedCategory.documents.map((document) => (
                <Card key={document.title} borderWidth="1px" borderColor="gray.200" _hover={{ borderColor: `${selectedCategory.color}.400`, shadow: 'sm' }}>
                  <CardBody>
                    <HStack align="start" spacing={4}>
                      <Box color={`${selectedCategory.color}.500`} mt={1}><FiFileText size={20} /></Box>
                      <Box><Heading size="sm" mb={1}>{document.title}</Heading><Text fontSize="sm" color="gray.600">{document.description}</Text></Box>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </>
        ) : (
          <>
            <Box><Heading size="md" mb={2}>Référentiels par activité</Heading><Text color="gray.600">Choisissez la catégorie correspondant à votre opération.</Text></Box>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {procedures.map((procedure) => (
                <Card key={procedure.id} cursor="pointer" borderWidth="1px" borderColor="gray.200" borderTopWidth="4px" borderTopColor={`${procedure.color}.500`} onClick={() => navigate(`/dashboard/procedures/${procedure.id}`)} _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                  <CardHeader pb={2}><HStack><Box color={`${procedure.color}.500`}><procedure.icon size={22} /></Box><Heading size="sm">{procedure.title}</Heading></HStack></CardHeader>
                  <CardBody pt={2}><Text fontSize="sm" color="gray.600">{procedure.documents.length} document(s) associé(s)</Text></CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </>
        )}

        <HStack color="gray.600" fontSize="sm">
          <FiCheckCircle />
          <Text>Les procédures détaillées et leurs mises à jour sont centralisées ici.</Text>
        </HStack>
      </VStack>
    </PageLayout>
  );
}
