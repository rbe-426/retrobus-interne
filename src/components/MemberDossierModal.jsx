import React, { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Card, CardBody, Divider, FormControl, FormLabel,
  HStack, Input, Modal, ModalBody, ModalCloseButton, ModalContent,
  ModalHeader, ModalOverlay, Select, SimpleGrid, Spinner, Stat, StatLabel,
  StatNumber, Tab, TabList, TabPanel, TabPanels, Tabs, Text, Textarea,
  VStack, useToast,
} from '@chakra-ui/react';
import { FiFileText, FiPlus, FiUpload } from 'react-icons/fi';
import { fetchWithCSRF } from '../lib/csrfClient';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const apiUrl = (path) => (apiBase ? `${apiBase}${path}` : path);

const emptyForms = {
  memberships: { category: '', status: 'ACTIVE', startedAt: '', endedAt: '', notes: '' },
  trainings: { title: '', organization: '', completedAt: '', expiresAt: '', status: 'VALID', notes: '' },
  authorizations: { type: '', obtainedAt: '', expiresAt: '', status: 'VALID', notes: '' },
  activities: { type: 'BÉNÉVOLAT', title: '', occurredAt: '', hours: '', description: '' },
  events: { category: 'ENTRETIEN', occurredAt: '', description: '', status: 'OPEN', visibility: 'RESTRICTED' },
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '-';

export default function MemberDossierModal({ member, isOpen, onClose }) {
  const toast = useToast();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState(emptyForms);

  const loadDossier = async () => {
    if (!member?.id) return;
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/members/${member.id}/dossier`), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Chargement du dossier impossible');
      setDossier(data.dossier);
    } catch (error) {
      toast({ title: 'Dossier inaccessible', description: error.message, status: 'error' });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) loadDossier(); }, [isOpen, member?.id]);

  const updateForm = (section, field, value) => {
    setForms((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  };

  const addRecord = async (section) => {
    setSaving(true);
    try {
      const response = await fetchWithCSRF(apiUrl(`/api/members/${member.id}/dossier/${section}`), {
        method: 'POST', body: JSON.stringify(forms[section]),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible');
      setForms((current) => ({ ...current, [section]: emptyForms[section] }));
      await loadDossier();
      toast({ title: 'Élément ajouté au dossier', status: 'success' });
    } catch (error) {
      toast({ title: 'Erreur', description: error.message, status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetchWithCSRF(apiUrl(`/api/members/${member.id}/dossier/documents`), {
        method: 'POST', body: JSON.stringify({ fileName: file.name, fileType: file.type, fileData }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Téléversement impossible');
      await loadDossier();
      toast({ title: 'Document ajouté au dossier', status: 'success' });
    } catch (error) {
      toast({ title: 'Erreur', description: error.message, status: 'error' });
    } finally {
      event.target.value = '';
      setSaving(false);
    }
  };

  const renderForm = (section, fields) => (
    <Card variant="outline" mt={4}>
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <Text fontWeight="semibold">Ajouter un élément</Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {fields.map((field) => (
              <FormControl key={field.name} gridColumn={field.full ? '1 / -1' : undefined}>
                <FormLabel fontSize="sm">{field.label}</FormLabel>
                {field.options ? (
                  <Select value={forms[section][field.name]} onChange={(event) => updateForm(section, field.name, event.target.value)}>
                    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Select>
                ) : field.multiline ? (
                  <Textarea value={forms[section][field.name]} onChange={(event) => updateForm(section, field.name, event.target.value)} />
                ) : (
                  <Input type={field.type || 'text'} value={forms[section][field.name]} onChange={(event) => updateForm(section, field.name, event.target.value)} />
                )}
              </FormControl>
            ))}
          </SimpleGrid>
          <Button alignSelf="start" leftIcon={<FiPlus />} colorScheme="purple" onClick={() => addRecord(section)} isLoading={saving}>Ajouter</Button>
        </VStack>
      </CardBody>
    </Card>
  );

  const listRecords = (records, render) => records?.length ? <VStack align="stretch" spacing={2}>{records.map(render)}</VStack> : <Text color="gray.500">Aucun élément enregistré.</Text>;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Dossier - {member ? `${member.firstName} ${member.lastName}` : ''}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {loading || !dossier ? <VStack py={12}><Spinner /><Text>Chargement du dossier...</Text></VStack> : (
            <Tabs colorScheme="purple" variant="enclosed" isFitted>
              <TabList overflowX="auto"><Tab>Synthèse</Tab><Tab>Identité</Tab><Tab>Parcours</Tab><Tab>Formations</Tab><Tab>Habilitations</Tab><Tab>Documents</Tab><Tab>Événements</Tab><Tab>Historique</Tab></TabList>
              <TabPanels>
                <TabPanel px={0} pt={5}>
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                    <Stat><StatLabel>Statut</StatLabel><StatNumber fontSize="lg">{dossier.membershipStatus}</StatNumber></Stat>
                    <Stat><StatLabel>Formations</StatLabel><StatNumber>{dossier.dossierTrainings.length}</StatNumber></Stat>
                    <Stat><StatLabel>Habilitations</StatLabel><StatNumber>{dossier.dossierAuthorizations.length}</StatNumber></Stat>
                    <Stat><StatLabel>Bénévolat</StatLabel><StatNumber>{dossier.dossierActivities.reduce((total, item) => total + (Number(item.hours) || 0), 0)} h</StatNumber></Stat>
                  </SimpleGrid>
                </TabPanel>
                <TabPanel px={0} pt={5}><SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}><Text><b>Numéro :</b> {dossier.memberNumber || '-'}</Text><Text><b>Catégorie :</b> {dossier.membershipType}</Text><Text><b>Adhésion :</b> {formatDate(dossier.membershipStartDate)}</Text><Text><b>Statut :</b> {dossier.membershipStatus}</Text></SimpleGrid>{listRecords(dossier.dossierMemberships, (item) => <Card key={item.id}><CardBody>{item.category} - <Badge>{item.status}</Badge> - depuis le {formatDate(item.startedAt)}</CardBody></Card>)}{renderForm('memberships', [{ name: 'category', label: 'Catégorie' }, { name: 'status', label: 'Statut', options: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] }, { name: 'startedAt', label: 'Début', type: 'date' }, { name: 'endedAt', label: 'Fin', type: 'date' }, { name: 'notes', label: 'Notes', multiline: true, full: true }])}</TabPanel>
                <TabPanel px={0} pt={5}>{listRecords(dossier.dossierActivities, (item) => <Card key={item.id}><CardBody><b>{item.title}</b><Text fontSize="sm">{item.type} - {formatDate(item.occurredAt)} - {item.hours || 0} h</Text><Text fontSize="sm">{item.description}</Text></CardBody></Card>)}{renderForm('activities', [{ name: 'type', label: 'Type', options: ['BÉNÉVOLAT', 'MISSION', 'ÉVÉNEMENT'] }, { name: 'title', label: 'Intitulé' }, { name: 'occurredAt', label: 'Date', type: 'date' }, { name: 'hours', label: 'Heures', type: 'number' }, { name: 'description', label: 'Description', multiline: true, full: true }])}</TabPanel>
                <TabPanel px={0} pt={5}>{listRecords(dossier.dossierTrainings, (item) => <Card key={item.id}><CardBody><b>{item.title}</b><Text fontSize="sm">{item.organization || 'Organisme non précisé'} - {formatDate(item.completedAt)} - <Badge colorScheme={item.status === 'VALID' ? 'green' : 'red'}>{item.status}</Badge></Text></CardBody></Card>)}{renderForm('trainings', [{ name: 'title', label: 'Formation' }, { name: 'organization', label: 'Organisme' }, { name: 'completedAt', label: 'Date', type: 'date' }, { name: 'expiresAt', label: 'Expiration', type: 'date' }, { name: 'status', label: 'Statut', options: ['VALID', 'EXPIRED', 'SUSPENDED'] }, { name: 'notes', label: 'Notes', multiline: true, full: true }])}</TabPanel>
                <TabPanel px={0} pt={5}>{listRecords(dossier.dossierAuthorizations, (item) => <Card key={item.id}><CardBody><b>{item.type}</b><Text fontSize="sm">Obtenue le {formatDate(item.obtainedAt)} - expire le {formatDate(item.expiresAt)} - <Badge colorScheme={item.status === 'VALID' ? 'green' : 'red'}>{item.status}</Badge></Text></CardBody></Card>)}{renderForm('authorizations', [{ name: 'type', label: 'Habilitation' }, { name: 'obtainedAt', label: 'Obtention', type: 'date' }, { name: 'expiresAt', label: 'Expiration', type: 'date' }, { name: 'status', label: 'Statut', options: ['VALID', 'EXPIRED', 'SUSPENDED'] }, { name: 'notes', label: 'Notes', multiline: true, full: true }])}</TabPanel>
                <TabPanel px={0} pt={5}><Button as="label" leftIcon={<FiUpload />} colorScheme="purple" isLoading={saving}>Ajouter un document<Input type="file" display="none" onChange={uploadDocument} /></Button><Divider my={4} />{listRecords(dossier.Document, (item) => <Card key={item.id}><CardBody><HStack><FiFileText /><Box><b>{item.fileName}</b><Text fontSize="sm">Ajouté le {formatDate(item.uploadedAt)} {item.expiryDate ? `- expire le ${formatDate(item.expiryDate)}` : ''}</Text></Box></HStack></CardBody></Card>)}</TabPanel>
                <TabPanel px={0} pt={5}>{listRecords(dossier.dossierEvents, (item) => <Card key={item.id}><CardBody><HStack justify="space-between"><b>{item.category}</b><Badge colorScheme={item.status === 'CLOSED' ? 'green' : 'orange'}>{item.status}</Badge></HStack><Text mt={2}>{item.description}</Text><Text fontSize="sm" color="gray.500">{formatDate(item.occurredAt)} - {item.authorName || item.authorId}</Text></CardBody></Card>)}{renderForm('events', [{ name: 'category', label: 'Catégorie', options: ['ENTRETIEN', 'RAPPEL', 'INCIDENT', 'DECISION_ADMINISTRATIVE', 'FELICITATION', 'AUTRE'] }, { name: 'occurredAt', label: 'Date', type: 'date' }, { name: 'status', label: 'Statut', options: ['OPEN', 'CLOSED'] }, { name: 'visibility', label: 'Visibilité', options: ['RESTRICTED'] }, { name: 'description', label: 'Description', multiline: true, full: true }])}</TabPanel>
                <TabPanel px={0} pt={5}>{listRecords(dossier.dossierAuditLogs, (item) => <Card key={item.id}><CardBody><HStack justify="space-between"><b>{item.action} - {item.entityType}</b><Text fontSize="sm">{new Date(item.createdAt).toLocaleString('fr-FR')}</Text></HStack><Text fontSize="sm">Par {item.actorName || item.actorId}</Text></CardBody></Card>)}</TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
