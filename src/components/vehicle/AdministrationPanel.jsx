import React, { useState, useEffect } from 'react';
import {
  Box, Tabs, TabList, TabPanels, Tab, TabPanel, VStack, HStack, Button, FormControl, FormLabel,
  Input, Textarea, Badge, Alert, AlertIcon, useToast, Spinner, SimpleGrid, Card, CardBody, CardHeader, Heading, Text,
  Table, Thead, Tbody, Tr, Th, Td, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, useDisclosure
} from '@chakra-ui/react';
import { DeleteIcon, DownloadIcon, EditIcon } from '@chakra-ui/icons';
import { apiClient } from '../../api/config';

export const VehicleAdministrationPanel = ({ parc }) => {
  const [carteGrise, setCarteGrise] = useState(null);
  const [assurance, setAssurance] = useState(null);
  const [ct, setControleTechnique] = useState(null);
  const [certificat, setCertificat] = useState(null);
  const [echancier, setEchancier] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadAdministration();
  }, [parc]);

  const loadAdministration = async () => {
    try {
      setLoading(true);
      const [cgRes, assRes, ctRes, certRes, echRes] = await Promise.all([
        apiClient.get(`/vehicles/${parc}/cg`),
        apiClient.get(`/vehicles/${parc}/assurance`),
        apiClient.get(`/vehicles/${parc}/ct`),
        apiClient.get(`/vehicles/${parc}/certificat-cession`),
        apiClient.get(`/vehicles/${parc}/echancier`)
      ]);

      setCarteGrise(cgRes);
      setAssurance(assRes);
      setControleTechnique(ctRes.latestCT);
      setCertificat(certRes);
      setEchancier(Array.isArray(echRes) ? echRes : []);
    } catch (error) {
      toast({ status: 'error', title: 'Erreur de chargement', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <Box>
      <Tabs variant="enclosed">
        <TabList>
          <Tab>Cartes Grises</Tab>
          <Tab>Assurance {assurance?.isActive ? '✅' : '❌'}</Tab>
          <Tab>Contrôle Technique {ct?.ctStatus === 'passed' ? '✅' : '⚠️'}</Tab>
          <Tab>Certificat de Cession {certificat?.imported ? '✅' : '⭕'}</Tab>
          <Tab>Échéancier</Tab>
        </TabList>

        <TabPanels>
          {/* CARTES GRISES */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <CarteGriseForm parc={parc} data={carteGrise} onSave={loadAdministration} />
            </VStack>
          </TabPanel>

          {/* ASSURANCE */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <AssuranceForm parc={parc} data={assurance} onSave={loadAdministration} />
              {assurance?.dateValidityEnd && (
                <Alert status={assurance.isActive ? 'success' : 'error'}>
                  <AlertIcon />
                  {assurance.isActive
                    ? `Assuré jusqu'au ${new Date(assurance.dateValidityEnd).toLocaleDateString('fr-FR')} à ${assurance.timeValidityEnd}`
                    : `Assurance expirée depuis le ${new Date(assurance.dateValidityEnd).toLocaleDateString('fr-FR')}`}
                </Alert>
              )}
            </VStack>
          </TabPanel>

          {/* CONTRÔLE TECHNIQUE */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {ct && (
                <Card>
                  <CardHeader>
                    <Heading size="md">Dernier CT</Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={2} spacing={4}>
                      <Box>
                        <Text fontWeight="bold">Date</Text>
                        <Text>{new Date(ct.ctDate).toLocaleDateString('fr-FR')}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold">Statut</Text>
                        <Badge colorScheme={ct.ctStatus === 'passed' ? 'green' : ct.ctStatus === 'contre-visite' ? 'yellow' : 'red'}>
                          {ct.ctStatus === 'passed' ? 'Réussi' : ct.ctStatus === 'contre-visite' ? 'Contre-visite' : 'Échoué'}
                        </Badge>
                      </Box>
                      {ct.nextCtDate && (
                        <Box>
                          <Text fontWeight="bold">Prochain CT</Text>
                          <Text>{new Date(ct.nextCtDate).toLocaleDateString('fr-FR')}</Text>
                        </Box>
                      )}
                      {ct.mileage && (
                        <Box>
                          <Text fontWeight="bold">Kilométrage</Text>
                          <Text>{ct.mileage} km</Text>
                        </Box>
                      )}
                    </SimpleGrid>
                    {ct.notes && <Text mt={4}><strong>Notes :</strong> {ct.notes}</Text>}
                  </CardBody>
                </Card>
              )}
              <ControleTechniqueForm parc={parc} onSave={loadAdministration} />
            </VStack>
          </TabPanel>

          {/* CERTIFICAT DE CESSION */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {certificat?.imported ? (
                <Alert status="success">
                  <AlertIcon />
                  Certificat de cession importé le {new Date(certificat.dateImport).toLocaleDateString('fr-FR')}
                </Alert>
              ) : (
                <CertificatForm parc={parc} onSave={loadAdministration} />
              )}
            </VStack>
          </TabPanel>

          {/* ÉCHÉANCIER */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <EchancierForm parc={parc} onSave={loadAdministration} />
              {echancier.length > 0 && (
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Type</Th>
                      <Th>Description</Th>
                      <Th>Date d'échéance</Th>
                      <Th>Statut</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {echancier.map(item => (
                      <Tr key={item.id}>
                        <Td>{item.type}</Td>
                        <Td>{item.description}</Td>
                        <Td>{new Date(item.dueDate).toLocaleDateString('fr-FR')}</Td>
                        <Td>
                          <Badge colorScheme={item.status === 'done' ? 'green' : item.status === 'expired' ? 'red' : 'blue'}>
                            {item.status}
                          </Badge>
                        </Td>
                        <Td>
                          <Button size="sm" variant="ghost" onClick={() => deleteEchancierItem(item.id)}>
                            <DeleteIcon />
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );

  // ===== COMPOSANTS DES FORMULAIRES =====

  function CarteGriseForm({ parc, data, onSave }) {
    const [form, setForm] = useState(data || {});

    const handleSubmit = async () => {
      try {
        await apiClient.post(`/vehicles/${parc}/cg`, form);
        toast({ status: 'success', title: 'Carte grise mise à jour' });
        onSave();
      } catch (error) {
        toast({ status: 'error', title: 'Erreur', description: error.message });
      }
    };

    return (
      <Card>
        <CardHeader>
          <Heading size="md">Cartes Grises</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Ancienne CG (PDF)</FormLabel>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setForm({ ...form, type: 'old', documentPath: e.target.value })}
              />
              {data?.oldCGPath && (
                <HStack mt={2}>
                  <Badge colorScheme={data.oldCGBarred ? 'red' : 'yellow'}>
                    {data.oldCGBarred ? 'Barrée ✓' : 'Barrée ✗'}
                  </Badge>
                  <Button size="sm" leftIcon={<DownloadIcon />}>Télécharger</Button>
                </HStack>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Nouvelle CG (PDF)</FormLabel>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setForm({ ...form, type: 'new', documentPath: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormControl>

            <Button colorScheme="blue" onClick={handleSubmit}>Enregistrer</Button>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  function AssuranceForm({ parc, data, onSave }) {
    const [form, setForm] = useState(data || {});

    const handleSubmit = async () => {
      try {
        await apiClient.post(`/vehicles/${parc}/assurance`, form);
        toast({ status: 'success', title: 'Assurance mise à jour' });
        onSave();
      } catch (error) {
        toast({ status: 'error', title: 'Erreur', description: error.message });
      }
    };

    return (
      <Card>
        <CardHeader>
          <Heading size="md">Attestation d'Assurance</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Attestation d'assurance (PDF)</FormLabel>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setForm({ ...form, attestationPath: e.target.value })}
              />
            </FormControl>

            <HStack spacing={4} w="full">
              <FormControl>
                <FormLabel>Date de validité (début)</FormLabel>
                <Input
                  type="date"
                  value={form.dateValidityStart || ''}
                  onChange={(e) => setForm({ ...form, dateValidityStart: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Heure (début)</FormLabel>
                <Input
                  type="time"
                  value={form.timeValidityStart || ''}
                  onChange={(e) => setForm({ ...form, timeValidityStart: e.target.value })}
                />
              </FormControl>
            </HStack>

            <HStack spacing={4} w="full">
              <FormControl>
                <FormLabel>Date de validité (fin)</FormLabel>
                <Input
                  type="date"
                  value={form.dateValidityEnd || ''}
                  onChange={(e) => setForm({ ...form, dateValidityEnd: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Heure (fin)</FormLabel>
                <Input
                  type="time"
                  value={form.timeValidityEnd || ''}
                  onChange={(e) => setForm({ ...form, timeValidityEnd: e.target.value })}
                />
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormControl>

            <Button colorScheme="blue" onClick={handleSubmit}>Enregistrer</Button>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  function ControleTechniqueForm({ parc, onSave }) {
    const [form, setForm] = useState({});

    const handleSubmit = async () => {
      try {
        await apiClient.post(`/vehicles/${parc}/ct`, form);
        toast({ status: 'success', title: 'CT enregistré' });
        onSave();
      } catch (error) {
        toast({ status: 'error', title: 'Erreur', description: error.message });
      }
    };

    return (
      <Card>
        <CardHeader>
          <Heading size="md">Ajouter un Contrôle Technique</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Attestation CT (PDF)</FormLabel>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setForm({ ...form, attestationPath: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Date du CT</FormLabel>
              <Input
                type="date"
                value={form.ctDate || ''}
                onChange={(e) => setForm({ ...form, ctDate: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Statut</FormLabel>
              <select value={form.ctStatus || 'passed'} onChange={(e) => setForm({ ...form, ctStatus: e.target.value })}>
                <option value="passed">Réussi</option>
                <option value="contre-visite">Contre-visite requise</option>
                <option value="failed">Échoué</option>
              </select>
            </FormControl>

            <FormControl>
              <FormLabel>Prochain CT prévu</FormLabel>
              <Input
                type="date"
                value={form.nextCtDate || ''}
                onChange={(e) => setForm({ ...form, nextCtDate: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Kilométrage</FormLabel>
              <Input
                type="number"
                value={form.mileage || ''}
                onChange={(e) => setForm({ ...form, mileage: e.target.value })}
                placeholder="0"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormControl>

            <Button colorScheme="blue" onClick={handleSubmit}>Enregistrer</Button>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  function CertificatForm({ parc, onSave }) {
    const [form, setForm] = useState({});

    const handleSubmit = async () => {
      try {
        await apiClient.post(`/vehicles/${parc}/certificat-cession`, form);
        toast({ status: 'success', title: 'Certificat de cession importé' });
        onSave();
      } catch (error) {
        toast({ status: 'error', title: 'Erreur', description: error.message });
      }
    };

    return (
      <Card>
        <CardHeader>
          <Heading size="md">Importer Certificat de Cession</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <Alert status="warning">
              <AlertIcon />
              Ce document ne peut être importé qu'une seule fois
            </Alert>

            <FormControl>
              <FormLabel>Certificat de cession (PDF)</FormLabel>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setForm({ ...form, certificatPath: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormControl>

            <Button colorScheme="blue" onClick={handleSubmit}>Importer</Button>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  function EchancierForm({ parc, onSave }) {
    const [form, setForm] = useState({});

    const handleSubmit = async () => {
      try {
        await apiClient.post(`/vehicles/${parc}/echancier`, form);
        toast({ status: 'success', title: 'Échéancier ajouté' });
        onSave();
        setForm({});
      } catch (error) {
        toast({ status: 'error', title: 'Erreur', description: error.message });
      }
    };

    return (
      <Card>
        <CardHeader>
          <Heading size="md">Ajouter à l'Échéancier</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Type</FormLabel>
              <select value={form.type || 'assurance'} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="assurance">Assurance</option>
                <option value="ct">Contrôle Technique</option>
                <option value="cg">Carte Grise</option>
              </select>
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Renouvellement assurance"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Date d'échéance</FormLabel>
              <Input
                type="date"
                value={form.dueDate || ''}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormControl>

            <Button colorScheme="blue" onClick={handleSubmit}>Ajouter</Button>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  async function deleteEchancierItem(id) {
    try {
      await apiClient.delete(`/vehicles/${parc}/echancier/${id}`);
      loadAdministration();
      toast({ status: 'success', title: 'Supprimé' });
    } catch (error) {
      toast({ status: 'error', title: 'Erreur', description: error.message });
    }
  }
};
