import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardBody, CardHeader, Heading, Text, Button,
  Input, Select, VStack, HStack, Badge, useToast, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Textarea, Flex,
  Icon, SimpleGrid, Alert, AlertIcon, Stat, StatLabel, StatNumber,
  IconButton, Menu, MenuButton, MenuList, MenuItem, MenuDivider, useColorModeValue,
  Spinner, Divider, Avatar, Tag, TagLabel
} from '@chakra-ui/react';
import { FiEdit3, FiTrash2, FiMoreHorizontal, FiCheck, FiX, FiRefreshCw, FiMessageSquare, FiPlus, FiBook, FiLifeBuoy, FiEye } from 'react-icons/fi';
import { useUser } from '../context/UserContext';
import { addHomeAnnouncement } from '../utils/homeAnnouncementUtils';
import { getStoredCSRFToken } from '../lib/csrfClient';

function TicketCard({ report, onView, onUpdate, onComment, onStatusChange, onDelete }) {
  const cardBg = useColorModeValue('white', 'gray.800');

  const priorityColors = { low: 'green', medium: 'yellow', high: 'orange', critical: 'red' };
  const statusColors = { open: 'blue', in_progress: 'orange', resolved: 'green', closed: 'gray' };

  const priorityLabel = useMemo(() => {
    switch (report.priority) {
      case 'low': return '🟢 Faible';
      case 'medium': return '🟡 Moyen';
      case 'high': return '🟠 Élevé';
      default: return '🔴 Critique';
    }
  }, [report.priority]);

  const statusLabel = useMemo(() => {
    switch (report.status) {
      case 'open': return 'Ouvert';
      case 'in_progress': return 'En cours';
      case 'resolved': return 'Résolu';
      default: return 'Fermé';
    }
  }, [report.status]);

  const createdAt = report.createdAt ? new Date(report.createdAt) : null;

  return (
    <Card
      bg={cardBg}
      borderLeftWidth={4}
      borderLeftColor={`${priorityColors[report.priority] || 'gray'}.500`}
      cursor="pointer"
      onClick={() => onView(report)}
      _hover={{ shadow: 'md' }}
    >
      <CardHeader pb={3}>
        <Flex justify="space-between" align="start">
          <VStack align="start" spacing={2}>
            <HStack>
              <Badge colorScheme={priorityColors[report.priority] || 'gray'} variant="solid" size="sm">
                {priorityLabel}
              </Badge>
              <Badge colorScheme={statusColors[report.status] || 'gray'} variant="subtle">
                {statusLabel}
              </Badge>
            </HStack>

            {/* Afficher uniquement le titre */}
            <Heading size="sm">{report.title}</Heading>

            <Text fontSize="xs" color="gray.500">
              Créé par {report.createdBy} {createdAt ? `le ${createdAt.toLocaleDateString('fr-FR')}` : ''}
            </Text>
          </VStack>

          <Menu>
            <MenuButton as={IconButton} icon={<FiMoreHorizontal />} variant="ghost" size="sm" />
            <MenuList zIndex={10} position="relative">
              <MenuItem icon={<FiEye />} onClick={(e) => { e.stopPropagation(); onView(report); }}>Voir le détail</MenuItem>
              <MenuItem icon={<FiEdit3 />} onClick={(e) => { e.stopPropagation(); onUpdate(report); }}>Modifier</MenuItem>
              <MenuItem icon={<FiMessageSquare />} onClick={(e) => { e.stopPropagation(); onComment(report); }}>Commenter</MenuItem>
              {report.status === 'open' && (
                <MenuItem icon={<FiRefreshCw />} onClick={(e) => { e.stopPropagation(); onStatusChange(report.id, 'in_progress'); }}>Marquer en cours</MenuItem>
              )}
              {(report.status === 'open' || report.status === 'in_progress') && (
                <MenuItem icon={<FiCheck />} onClick={(e) => { e.stopPropagation(); onStatusChange(report.id, 'resolved'); }}>Marquer comme résolu</MenuItem>
              )}
              {report.status === 'resolved' && (
                <MenuItem icon={<FiX />} onClick={(e) => { e.stopPropagation(); onStatusChange(report.id, 'closed'); }}>Fermer définitivement</MenuItem>
              )}
              {report.status === 'closed' && (
                <MenuItem icon={<FiRefreshCw />} onClick={(e) => { e.stopPropagation(); onStatusChange(report.id, 'open'); }}>Rouvrir</MenuItem>
              )}
              <MenuDivider />
              <MenuItem icon={<FiTrash2 />} onClick={(e) => { e.stopPropagation(); onDelete(report.id); }} color="red.500">Supprimer</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </CardHeader>

      <CardBody pt={0}>
        <VStack align="start" spacing={3}>
          <Text fontSize="sm">{report.description}</Text>

          {report.category && (
            <Tag size="sm" variant="subtle">
              <TagLabel>{report.category}</TagLabel>
            </Tag>
          )}

          {report.assignedTo && (
            <HStack>
              <Avatar size="xs" name={report.assignedTo} />
              <Text fontSize="xs">Assigné à {report.assignedTo}</Text>
            </HStack>
          )}

          {Array.isArray(report.comments) && report.comments.length > 0 && (
            <VStack align="start" spacing={2} w="full">
              <Divider />
              <HStack>
                <Text fontSize="xs" fontWeight="bold">{report.comments.length} commentaire(s)</Text>
              </HStack>
              <Box bg="gray.50" p={2} borderRadius="md" w="full">
                <Text fontSize="xs">{report.comments[report.comments.length - 1].message}</Text>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Par {report.comments[report.comments.length - 1].author} - {new Date(report.comments[report.comments.length - 1].createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </Box>
            </VStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}

export default function SupportSite() {
  const { user, prenom, nom, matricule } = useUser();
  const toast = useToast();

  // Navigation state
  const [activeSection, setActiveSection] = useState('tickets'); // 'tickets' | 'knowledge'

  const {
    isOpen: isReportOpen, onOpen: onReportOpen, onClose: onReportClose
  } = useDisclosure();
  const {
    isOpen: isCommentOpen, onOpen: onCommentOpen, onClose: onCommentClose
  } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isKnowledgeOpen, onOpen: onKnowledgeOpen, onClose: onKnowledgeClose } = useDisclosure();
  const { isOpen: isKnowledgeViewOpen, onOpen: onKnowledgeViewOpen, onClose: onKnowledgeViewClose } = useDisclosure();

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedKnowledgeDoc, setSelectedKnowledgeDoc] = useState(null);
  const [viewKnowledgeDoc, setViewKnowledgeDoc] = useState(null);

  const [reportFormData, setReportFormData] = useState({ title: '', description: '', category: '', priority: 'medium', type: 'bug' });
  const [editFormData, setEditFormData] = useState({ title: '', description: '', category: '', priority: 'medium', type: 'bug' });
  const [commentFormData, setCommentFormData] = useState({ message: '', status: '' });
  const [knowledgeDocs, setKnowledgeDocs] = useState([]);
  const [knowledgeFormData, setKnowledgeFormData] = useState({
    title: '',
    docType: 'process',
    category: 'process',
    summary: '',
    content: '',
    tags: '',
    processObjective: '',
    processTrigger: '',
    processActors: '',
    processSteps: '',
    jobMission: '',
    jobResponsibilities: '',
    jobSkills: '',
    jobTools: ''
  });
  const [reportScreenshots, setReportScreenshots] = useState([]); // File[]

  const parseNotesToComments = useCallback((notes) => {
    const normalizeCommentAuthor = (rawAuthor) => {
      const author = String(rawAuthor || '').trim();
      if (!author) return 'Utilisateur';

      const lower = author.toLowerCase();
      if (lower === 'administrateur') return 'Waiyl BELAIDI (w.belaidi)';
      if (lower.includes('waiyl') && (lower.includes('belaidiw91') || lower.includes('w.belaidi'))) return 'Waiyl BELAIDI (w.belaidi)';
      return author;
    };

    if (!notes || typeof notes !== 'string') return [];
    return notes
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^\[([^\]]+)\]\s+([^:]+):\s*(.*)$/);
        if (!match) return null;
        const [, rawDate, author, message] = match;
        const parsedDate = new Date(rawDate);
        return {
          createdAt: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
          author: normalizeCommentAuthor(author),
          message: message?.trim() || ''
        };
      })
      .filter(Boolean);
  }, []);

  const normalizeCommentAuthor = useCallback((rawAuthor) => {
    const author = String(rawAuthor || '').trim();
    if (!author) return 'Utilisateur';

    const lower = author.toLowerCase();
    if (lower === 'administrateur') return 'Waiyl BELAIDI (w.belaidi)';
    if (lower.includes('waiyl') && (lower.includes('belaidiw91') || lower.includes('w.belaidi'))) return 'Waiyl BELAIDI (w.belaidi)';
    return author;
  }, []);

  const formattedActorName = useMemo(() => {
    const firstName = String(prenom || user?.firstName || '').trim();
    const explicitLastName = String(nom || user?.lastName || '').trim();
    const matriculeRaw = String(matricule || user?.username || user?.matricule || user?.id || '').trim();

    let lastName = explicitLastName;
    if (!lastName && user?.name) {
      const parts = String(user.name).trim().split(/\s+/);
      if (parts.length > 1) {
        lastName = parts.slice(1).join(' ');
      }
    }

    const normalizedLastForId = String(lastName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toLowerCase();
    const derivedId = firstName && normalizedLastForId
      ? `${firstName.charAt(0).toLowerCase()}.${normalizedLastForId}`
      : '';
    const id = (derivedId || matriculeRaw || '').toLowerCase();

    if (firstName && lastName && id) return `${firstName} ${lastName.toUpperCase()} (${id})`;
    if (firstName && id) return `${firstName} (${id})`;
    if (user?.name && id) return `${String(user.name).trim()} (${id})`;
    return user?.name || id || 'Utilisateur';
  }, [matricule, nom, prenom, user]);

  const cardBg = useColorModeValue('white', 'gray.800');
  const sidebarBg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const getAuthHeaders = (includeJson = false) => {
    const headers = {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    };
    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }
    const csrfToken = getStoredCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    return headers;
  };

  const fetchReports = async () => {
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const isAdminLike = ['ADMIN', 'PRESIDENT', 'VICE_PRESIDENT', 'TRESORIER', 'SECRETAIRE_GENERAL'].includes(String(user?.role || '').toUpperCase());
      const adminUrl = `${base}/api/retro-requests/admin/all`;
      const userUrl = `${base}/api/retro-requests`;

      let res = await fetch(isAdminLike ? adminUrl : userUrl, {
        headers: getAuthHeaders(false)
      });
      if (!res.ok && isAdminLike) {
        // Fallback to personal scope if admin/all is not available for this account
        res = await fetch(userUrl, {
          headers: getAuthHeaders(false)
        });
      }
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      const rawRequests = Array.isArray(data?.requests) ? data.requests : [];
      const normalized = rawRequests.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category || 'GENERAL',
        priority: String(r.priority || 'NORMAL').toLowerCase() === 'normal' ? 'medium' : String(r.priority || 'medium').toLowerCase(),
        status: String(r.status || 'PENDING').toLowerCase()
          .replace('pending', 'open')
          .replace('in_progress', 'in_progress')
          .replace('resolved', 'resolved')
          .replace('closed', 'closed'),
        createdBy: r.userName || r.userEmail || 'Utilisateur',
        assignedTo: r.assignedTo || null,
        comments: Array.isArray(r.comments) && r.comments.length > 0
          ? r.comments.map((c) => ({
              ...c,
              author: normalizeCommentAuthor(c?.author)
            }))
          : parseNotesToComments(r.notes),
        notes: r.notes || '',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      }));
      setReports(normalized);
    } catch (e) {
      console.error('Erreur chargement rétroreports:', e);
    }
  };

  const openTicketDetails = (report) => {
    setSelectedReport(report);
    onDetailOpen();
  };

  const KB_STORAGE_KEY = 'rbe_knowledge_base_docs_v1';

  const buildProcessDocument = useCallback((data) => {
    const steps = data.processSteps
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => `${index + 1}. ${line.replace(/^\d+[.)-]?\s*/, '')}`)
      .join('\n');

    return [
      `Objectif: ${data.processObjective || 'Non renseigné'}`,
      `Declencheur: ${data.processTrigger || 'Non renseigné'}`,
      `Acteurs: ${data.processActors || 'Non renseigné'}`,
      '',
      'Etapes:',
      steps || '1. A definir',
      '',
      'Details complementaires:',
      data.content || 'Aucun detail complementaire.'
    ].join('\n');
  }, []);

  const buildJobSheetDocument = useCallback((data) => {
    return [
      `Mission principale: ${data.jobMission || 'Non renseignée'}`,
      '',
      'Responsabilites:',
      data.jobResponsibilities || 'A definir',
      '',
      'Competences requises:',
      data.jobSkills || 'A definir',
      '',
      'Outils / logiciels:',
      data.jobTools || 'A definir',
      '',
      'Consignes / notes operationnelles:',
      data.content || 'Aucune consigne supplementaire.'
    ].join('\n');
  }, []);

  const knowledgeTemplates = useMemo(() => ({
    process_support_ticket: {
      title: 'Processus de traitement des tickets support',
      docType: 'process',
      category: 'process',
      summary: 'Workflow de prise en charge des incidents support.',
      tags: 'support, ticket, process',
      processObjective: 'Traiter tout ticket en moins de 48h avec suivi transparent.',
      processTrigger: 'Creation d un nouveau ticket utilisateur.',
      processActors: 'Support N1, Support N2, Referent metier',
      processSteps: 'Qualifier le ticket\nAffecter le ticket\nAnalyser et corriger\nValider avec le demandeur\nCloturer et documenter',
      content: 'Escalade en priorite haute si blocage metier critique.'
    },
    process_checkin: {
      title: 'Processus de check-in evenement',
      docType: 'process',
      category: 'procedure',
      summary: 'Procedure standard de verification et validation check-in.',
      tags: 'check-in, evenement, accueil',
      processObjective: 'Fluidifier l accueil et fiabiliser les controles d acces.',
      processTrigger: 'Arrivee d un participant au point accueil.',
      processActors: 'Accueil, Securite, Coordinateur evenement',
      processSteps: 'Verifier identite\nVerifier inscription\nValider check-in\nOrienter participant\nSignaler anomalies',
      content: 'En cas d anomalie, transferer au coordinateur sous 2 minutes.'
    },
    job_sheet_support_agent: {
      title: 'Fiche metier - Agent Support Interne',
      docType: 'job_sheet',
      category: 'training',
      summary: 'Role, responsabilites et competences de l agent support.',
      tags: 'fiche metier, support, formation',
      jobMission: 'Assurer la continuite des services numeriques internes.',
      jobResponsibilities: '- Reception et qualification des demandes\n- Resolution incidents niveau 1\n- Escalade vers niveau 2',
      jobSkills: '- Communication claire\n- Analyse d incident\n- Maitrise outils internes',
      jobTools: 'SupportSite, tableaux de bord, messagerie interne',
      content: 'Respecter les SLA et tenir les utilisateurs informes.'
    },
    job_sheet_reception: {
      title: 'Fiche metier - Charge Accueil Evenements',
      docType: 'job_sheet',
      category: 'training',
      summary: 'Cadre de mission pour l accueil lors des operations terrain.',
      tags: 'fiche metier, accueil, evenement',
      jobMission: 'Garantir un accueil fluide et securise des participants.',
      jobResponsibilities: '- Accueillir les visiteurs\n- Verifier les pre-requis\n- Coordonner avec securite et logistique',
      jobSkills: '- Sens du contact\n- Rigueur operationnelle\n- Gestion des priorites',
      jobTools: 'Liste participants, check-in mobile, radio interne',
      content: 'Remonter immediatement tout incident organisationnel.'
    }
  }), []);

  const getSeedKnowledgeDocs = useCallback((author) => {
    const now = new Date().toISOString();
    const authorName = author || 'Systeme';
    return Object.values(knowledgeTemplates).map((template, index) => {
      const generatedContent = template.docType === 'job_sheet'
        ? buildJobSheetDocument(template)
        : buildProcessDocument(template);

      return {
        id: `kb_seed_${index + 1}`,
        title: template.title,
        docType: template.docType,
        category: template.category,
        summary: template.summary,
        content: generatedContent,
        tags: template.tags.split(',').map((t) => t.trim()).filter(Boolean),
        processObjective: template.processObjective || '',
        processTrigger: template.processTrigger || '',
        processActors: template.processActors || '',
        processSteps: template.processSteps || '',
        jobMission: template.jobMission || '',
        jobResponsibilities: template.jobResponsibilities || '',
        jobSkills: template.jobSkills || '',
        jobTools: template.jobTools || '',
        createdAt: now,
        updatedAt: now,
        createdBy: authorName,
        updatedBy: authorName
      };
    });
  }, [buildJobSheetDocument, buildProcessDocument, knowledgeTemplates]);

  const loadKnowledgeDocs = useCallback(() => {
    try {
      const raw = localStorage.getItem(KB_STORAGE_KEY);
      if (!raw) {
        const seeded = getSeedKnowledgeDocs(user?.prenom || user?.name);
        localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(seeded));
        setKnowledgeDocs(seeded);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const seeded = getSeedKnowledgeDocs(user?.prenom || user?.name);
        localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(seeded));
        setKnowledgeDocs(seeded);
        return;
      }
      setKnowledgeDocs(parsed);
    } catch (e) {
      console.error('Erreur chargement KB:', e);
      setKnowledgeDocs([]);
    }
  }, [getSeedKnowledgeDocs, user?.name, user?.prenom]);

  const persistKnowledgeDocs = useCallback((docs) => {
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(docs));
    setKnowledgeDocs(docs);
  }, []);

  const resetKnowledgeForm = useCallback(() => {
    setKnowledgeFormData({
      title: '',
      docType: 'process',
      category: 'process',
      summary: '',
      content: '',
      tags: '',
      processObjective: '',
      processTrigger: '',
      processActors: '',
      processSteps: '',
      jobMission: '',
      jobResponsibilities: '',
      jobSkills: '',
      jobTools: ''
    });
    setSelectedKnowledgeDoc(null);
  }, []);

  const applyKnowledgeTemplate = useCallback((templateKey) => {
    const template = knowledgeTemplates[templateKey];
    if (!template) return;
    setSelectedKnowledgeDoc(null);
    setKnowledgeFormData((prev) => ({
      ...prev,
      ...template
    }));
    onKnowledgeOpen();
  }, [knowledgeTemplates, onKnowledgeOpen]);

  const handleKnowledgeSubmit = useCallback(() => {
    if (!knowledgeFormData.title.trim()) {
      toast({
        title: 'Erreur',
        description: 'Titre requis',
        status: 'error',
        duration: 2500,
        isClosable: true
      });
      return;
    }

    const now = new Date().toISOString();
    const tags = knowledgeFormData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const generatedContent = knowledgeFormData.docType === 'job_sheet'
      ? buildJobSheetDocument(knowledgeFormData)
      : buildProcessDocument(knowledgeFormData);

    if (selectedKnowledgeDoc) {
      const updated = knowledgeDocs.map((doc) => (
        doc.id === selectedKnowledgeDoc.id
          ? {
              ...doc,
              title: knowledgeFormData.title.trim(),
              docType: knowledgeFormData.docType,
              category: knowledgeFormData.category,
              summary: knowledgeFormData.summary.trim(),
              content: generatedContent,
              tags,
              processObjective: knowledgeFormData.processObjective,
              processTrigger: knowledgeFormData.processTrigger,
              processActors: knowledgeFormData.processActors,
              processSteps: knowledgeFormData.processSteps,
              jobMission: knowledgeFormData.jobMission,
              jobResponsibilities: knowledgeFormData.jobResponsibilities,
              jobSkills: knowledgeFormData.jobSkills,
              jobTools: knowledgeFormData.jobTools,
              updatedAt: now,
              updatedBy: user?.prenom || user?.name || 'Utilisateur'
            }
          : doc
      ));
      persistKnowledgeDocs(updated);
      toast({ title: 'Succès', description: 'Document mis à jour', status: 'success', duration: 2500, isClosable: true });
    } else {
      const doc = {
        id: `kb_${Date.now()}`,
        title: knowledgeFormData.title.trim(),
        docType: knowledgeFormData.docType,
        category: knowledgeFormData.category,
        summary: knowledgeFormData.summary.trim(),
        content: generatedContent,
        tags,
        processObjective: knowledgeFormData.processObjective,
        processTrigger: knowledgeFormData.processTrigger,
        processActors: knowledgeFormData.processActors,
        processSteps: knowledgeFormData.processSteps,
        jobMission: knowledgeFormData.jobMission,
        jobResponsibilities: knowledgeFormData.jobResponsibilities,
        jobSkills: knowledgeFormData.jobSkills,
        jobTools: knowledgeFormData.jobTools,
        createdAt: now,
        updatedAt: now,
        createdBy: user?.prenom || user?.name || 'Utilisateur',
        updatedBy: user?.prenom || user?.name || 'Utilisateur'
      };
      persistKnowledgeDocs([doc, ...knowledgeDocs]);
      toast({ title: 'Succès', description: 'Document ajouté à la Knowledge Base', status: 'success', duration: 2500, isClosable: true });
    }

    resetKnowledgeForm();
    onKnowledgeClose();
  }, [buildJobSheetDocument, buildProcessDocument, knowledgeDocs, knowledgeFormData, onKnowledgeClose, persistKnowledgeDocs, resetKnowledgeForm, selectedKnowledgeDoc, toast, user]);

  const handleKnowledgeDelete = useCallback((docId) => {
    if (!window.confirm('Supprimer ce document de la Knowledge Base ?')) return;
    const filtered = knowledgeDocs.filter((doc) => doc.id !== docId);
    persistKnowledgeDocs(filtered);
    toast({ title: 'Supprimé', description: 'Document supprimé', status: 'success', duration: 2200, isClosable: true });
  }, [knowledgeDocs, persistKnowledgeDocs, toast]);

  const handleKnowledgeEdit = useCallback((doc) => {
    setSelectedKnowledgeDoc(doc);
    setKnowledgeFormData({
      title: doc.title || '',
      docType: doc.docType || 'process',
      category: doc.category || 'process',
      summary: doc.summary || '',
      content: doc.content || '',
      tags: Array.isArray(doc.tags) ? doc.tags.join(', ') : '',
      processObjective: doc.processObjective || '',
      processTrigger: doc.processTrigger || '',
      processActors: doc.processActors || '',
      processSteps: doc.processSteps || '',
      jobMission: doc.jobMission || '',
      jobResponsibilities: doc.jobResponsibilities || '',
      jobSkills: doc.jobSkills || '',
      jobTools: doc.jobTools || ''
    });
    onKnowledgeOpen();
  }, [onKnowledgeOpen]);

  const handleKnowledgeView = useCallback((doc) => {
    setViewKnowledgeDoc(doc);
    onKnowledgeViewOpen();
  }, [onKnowledgeViewOpen]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchReports();
      loadKnowledgeDocs();
      setLoading(false);
    })();
  }, [loadKnowledgeDocs]);

  const handleReportSubmit = async () => {
    if (!reportFormData.title || !reportFormData.description) {
      toast({ title: 'Erreur', description: "Veuillez remplir le titre et la description", status: 'error', duration: 3000, isClosable: true });
      return;
    }
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const payload = {
        title: reportFormData.title,
        description: reportFormData.description,
        category: reportFormData.category || 'GENERAL',
        priority: (reportFormData.priority || 'medium').toUpperCase() === 'MEDIUM' ? 'NORMAL' : (reportFormData.priority || 'medium').toUpperCase(),
        details: {
          type: reportFormData.type || 'bug',
          screenshots: (reportScreenshots || []).map(f => ({ name: f.name, size: f.size, type: f.type }))
        }
      };

      const res = await fetch(`${base}/api/retro-requests`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'create failed'}));
        throw new Error(err.error || 'create failed');
      }
      
      // ✅ Créer une notification d'accueil pour les admins
      const priorityLabel = {
        low: '🟢 Faible',
        medium: '🟡 Moyen',
        high: '🟠 Élevé',
        critical: '🔴 Critique'
      }[reportFormData.priority] || '🟡 Moyen';

      const severity = reportFormData.priority === 'critical' ? 'critical' : reportFormData.priority === 'high' ? 'warning' : 'info';

      addHomeAnnouncement({
        severity: severity,
        title: `🎫 Nouveau ticket RétroSupport - ${reportFormData.priority}`,
        message: `"${reportFormData.title}" déposé par ${user?.prenom || 'un utilisateur'}. ${reportFormData.description.substring(0, 100)}...`,
        dismissible: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
      });

      // ✅ Créer une notification système pour l'admin (Waiyl BELAIDI)
      try {
        const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
        await fetch(`${base}/api/notifications`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            title: `🎫 Nouveau ticket: ${reportFormData.title}`,
            message: `Priorité: ${priorityLabel}\nDéposé par: ${user?.prenom || 'Utilisateur'}\n${reportFormData.description.substring(0, 150)}...`,
            type: severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'info',
            priority: reportFormData.priority || 'normal',
            active: true,
            targetedTo: 'admins' // Notification dédiée aux admins
          })
        });
      } catch (notifError) {
        console.warn('⚠️ Erreur création notification système:', notifError);
        // Ne pas bloquer si la notification système échoue
      }

      await fetchReports();
      setReportFormData({ title: '', description: '', category: '', priority: 'medium', type: 'bug' });
      setReportScreenshots([]);
      onReportClose();
      toast({ title: 'Succès', description: 'RétroReport créé avec succès', status: 'success', duration: 3000, isClosable: true });
    } catch (e) {
      toast({ title: 'Erreur', description: e.message || "Impossible de créer le RétroReport", status: 'error', duration: 3000 });
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentFormData.message) {
      toast({ title: 'Erreur', description: 'Veuillez écrire un commentaire', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const payload = {
        message: commentFormData.message,
        author: formattedActorName,
        status: commentFormData.status || undefined
      };

      const notes = `${selectedReport?.notes || ''}\n[${new Date().toISOString()}] ${payload.author}: ${payload.message}`.trim();
      const res = await fetch(`${base}/api/retro-requests/${selectedReport.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          notes,
          status: payload.status || undefined
        })
      });
      if (!res.ok) throw new Error('Impossible de persister le commentaire');

      await fetchReports();
      setCommentFormData({ message: '', status: '' });
      onCommentClose();
      toast({ title: 'Succès', description: 'Commentaire ajouté avec succès', status: 'success', duration: 3000, isClosable: true });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', description: "Impossible d'ajouter le commentaire", status: 'error', duration: 3000 });
    }
  };

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      let res = await fetch(`${base}/api/retro-requests/${reportId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status: newStatus.toUpperCase() })
      });
      if (!res.ok) {
        res = await fetch(`${base}/api/retro-requests/${reportId}`, {
          method: 'PUT',
          headers: getAuthHeaders(true),
          body: JSON.stringify({ status: newStatus.toUpperCase() })
        });
        if (!res.ok) throw new Error('status failed');
      }
      await fetchReports();
      const labels = { open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé' };
      toast({ title: 'Statut mis à jour', description: `RétroReport marqué comme ${labels[newStatus]?.toLowerCase() || newStatus}`, status: 'success', duration: 3000 });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de changer le statut', status: 'error', duration: 3000 });
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce RétroReport ?')) return;
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: 'Erreur', description: 'Token non trouvé', status: 'error', duration: 3000 });
        return;
      }
      const url = `${base}/api/retro-requests/${reportId}`;
      console.log('🗑️ Suppression ticket:', url);
      const res = await fetch(url, { 
        method: 'DELETE', 
        headers: getAuthHeaders(true)
      });
      console.log('Delete response status:', res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error('Delete error:', errText);
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      const result = await res.json();
      console.log('Delete result:', result);
      await fetchReports();
      toast({ title: 'RétroReport supprimé', description: 'Le ticket a été supprimé avec succès', status: 'success', duration: 3000 });
    } catch (e) {
      console.error('❌ Erreur suppression:', e);
      toast({ title: 'Erreur', description: `Suppression impossible: ${e.message}`, status: 'error', duration: 5000 });
    }
  };

  const handleEditReport = (report) => {
    setSelectedReport(report);
    setEditFormData({
      title: report.title,
      description: report.description,
      category: report.category || '',
      priority: report.priority || 'medium',
      type: report.type || 'bug'
    });
    onEditOpen();
  };

  const handleEditSubmit = async () => {
    if (!selectedReport?.id || !editFormData.title || !editFormData.description) {
      toast({ title: 'Erreur', description: 'Titre et description requis', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(`${base}/api/retro-requests/${selectedReport.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          category: editFormData.category || 'GENERAL',
          priority: (editFormData.priority || 'medium').toUpperCase() === 'MEDIUM' ? 'NORMAL' : (editFormData.priority || 'medium').toUpperCase(),
          type: editFormData.type || 'bug'
        })
      });
      if (!res.ok) throw new Error('update failed');
      await fetchReports();
      onEditClose();
      toast({ title: 'Succès', description: 'RétroReport mis à jour', status: 'success', duration: 3000 });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Mise à jour impossible', status: 'error', duration: 3000 });
    }
  };

  const knowledgeCountByCategory = useMemo(() => {
    const init = { process: 0, procedure: 0, technical: 0, faq: 0, emergency: 0, training: 0 };
    return knowledgeDocs.reduce((acc, doc) => {
      const key = doc.category || 'process';
      if (acc[key] !== undefined) acc[key] += 1;
      return acc;
    }, init);
  }, [knowledgeDocs]);

  const selectedStatusLabel = useMemo(() => {
    if (!selectedReport) return '';
    switch (selectedReport.status) {
      case 'open': return 'Ouvert';
      case 'in_progress': return 'En cours';
      case 'resolved': return 'Résolu';
      default: return 'Fermé';
    }
  }, [selectedReport]);

  const selectedPriorityLabel = useMemo(() => {
    if (!selectedReport) return '';
    switch (selectedReport.priority) {
      case 'low': return '🟢 Faible';
      case 'medium': return '🟡 Moyen';
      case 'high': return '🟠 Élevé';
      default: return '🔴 Critique';
    }
  }, [selectedReport]);

  if (loading) {
    return (
      <Box p={6}>
        <VStack spacing={8}>
          <Spinner size="xl" color="green.500" />
          <Text>Chargement du support…</Text>
        </VStack>
      </Box>
    );
  }

  // Sections de navigation
  const sections = [
    { id: 'tickets', label: 'Tickets Support', icon: FiLifeBuoy, description: 'Gestion des tickets' },
    { id: 'knowledge', label: 'Knowledge Base', icon: FiBook, description: 'Documentation & processus' }
  ];

  // Composants de contenu
  const TicketsContent = () => (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <VStack align="start" spacing={1}>
          <Heading size="sm">Système de tickets</Heading>
          <Text fontSize="sm" color="gray.600">Signalez et suivez les incidents et demandes</Text>
        </VStack>
        <Button leftIcon={<FiPlus />} colorScheme="red" onClick={onReportOpen}>Nouveau ticket</Button>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
        <Card bg={cardBg}><CardBody><Stat><StatLabel fontSize="xs">Ouverts</StatLabel><StatNumber color="red.500" fontSize="lg">{reports.filter(r => r.status === 'open').length}</StatNumber></Stat></CardBody></Card>
        <Card bg={cardBg}><CardBody><Stat><StatLabel fontSize="xs">En cours</StatLabel><StatNumber color="orange.500" fontSize="lg">{reports.filter(r => r.status === 'in_progress').length}</StatNumber></Stat></CardBody></Card>
        <Card bg={cardBg}><CardBody><Stat><StatLabel fontSize="xs">Résolus</StatLabel><StatNumber color="green.500" fontSize="lg">{reports.filter(r => r.status === 'resolved').length}</StatNumber></Stat></CardBody></Card>
        <Card bg={cardBg}><CardBody><Stat><StatLabel fontSize="xs">Total</StatLabel><StatNumber color="blue.500" fontSize="lg">{reports.length}</StatNumber></Stat></CardBody></Card>
      </SimpleGrid>

      <VStack spacing={4} align="stretch">
        {reports.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold" fontSize="sm">Aucun ticket</Text>
              <Text fontSize="xs">Créez votre premier ticket.</Text>
            </VStack>
          </Alert>
        ) : (
          reports.map((report) => (
            <TicketCard
              key={report.id}
              report={report}
              onView={openTicketDetails}
              onUpdate={handleEditReport}
              onComment={(r) => { setSelectedReport(r); onCommentOpen(); }}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteReport}
            />
          ))
        )}
      </VStack>
    </VStack>
  );

  const KnowledgeContent = () => (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <VStack align="start" spacing={1}>
          <Heading size="sm">Base de connaissances</Heading>
          <Text fontSize="sm" color="gray.600">Documentation des processus, guides et procédures</Text>
        </VStack>
        <HStack>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={() => {
              resetKnowledgeForm();
              onKnowledgeOpen();
            }}
          >
            Nouveau processus
          </Button>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="teal"
            variant="outline"
            onClick={() => {
              resetKnowledgeForm();
              setKnowledgeFormData((prev) => ({
                ...prev,
                docType: 'job_sheet',
                category: 'training'
              }));
              onKnowledgeOpen();
            }}
          >
            Nouvelle fiche metier
          </Button>
        </HStack>
      </HStack>

      <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
        <CardBody>
          <VStack align="start" spacing={3}>
            <Heading size="xs">Formulaires rapides</Heading>
            <Text fontSize="sm" color="gray.600">Demarrer avec un modele pre-rempli pour gagner du temps.</Text>
            <HStack flexWrap="wrap" spacing={2}>
              <Button size="sm" variant="outline" onClick={() => applyKnowledgeTemplate('process_support_ticket')}>Modele processus support</Button>
              <Button size="sm" variant="outline" onClick={() => applyKnowledgeTemplate('process_checkin')}>Modele processus check-in</Button>
              <Button size="sm" variant="outline" onClick={() => applyKnowledgeTemplate('job_sheet_support_agent')}>Modele fiche support</Button>
              <Button size="sm" variant="outline" onClick={() => applyKnowledgeTemplate('job_sheet_reception')}>Modele fiche accueil</Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      <Alert status="info" variant="left-accent">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Bibliothèque de connaissances</Text>
          <Text fontSize="sm">Centralisation des processus, procédures et guides métiers de l'association.</Text>
        </Box>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        <Card borderTop="4px solid" borderColor="purple.500" cursor="pointer" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
          <CardHeader pb={2}>
            <HStack>
              <Icon as={FiBook} color="purple.500" boxSize={5} />
              <Heading size="sm">Procédures</Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={2}>
            <Text fontSize="sm" color="gray.600">Guides pas-à-pas pour les opérations courantes</Text>
            <Badge mt={2} colorScheme="purple">{knowledgeCountByCategory.procedure} document(s)</Badge>
          </CardBody>
        </Card>

        <Card borderTop="4px solid" borderColor="blue.500" cursor="pointer" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
          <CardHeader pb={2}>
            <HStack>
              <Icon as={FiBook} color="blue.500" boxSize={5} />
              <Heading size="sm">Processus métiers</Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={2}>
            <Text fontSize="sm" color="gray.600">Workflows et processus organisationnels</Text>
            <Badge mt={2} colorScheme="blue">{knowledgeCountByCategory.process} document(s)</Badge>
          </CardBody>
        </Card>

        <Card borderTop="4px solid" borderColor="green.500" cursor="pointer" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
          <CardHeader pb={2}>
            <HStack>
              <Icon as={FiBook} color="green.500" boxSize={5} />
              <Heading size="sm">Guides techniques</Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={2}>
            <Text fontSize="sm" color="gray.600">Documentation technique et configuration</Text>
            <Badge mt={2} colorScheme="green">{knowledgeCountByCategory.technical} document(s)</Badge>
          </CardBody>
        </Card>

        <Card borderTop="4px solid" borderColor="orange.500" cursor="pointer" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
          <CardHeader pb={2}>
            <HStack>
              <Icon as={FiBook} color="orange.500" boxSize={5} />
              <Heading size="sm">FAQ</Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={2}>
            <Text fontSize="sm" color="gray.600">Questions fréquemment posées</Text>
            <Badge mt={2} colorScheme="orange">{knowledgeCountByCategory.faq} document(s)</Badge>
          </CardBody>
        </Card>

        <Card borderTop="4px solid" borderColor="red.500" cursor="pointer" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
          <CardHeader pb={2}>
            <HStack>
              <Icon as={FiBook} color="red.500" boxSize={5} />
              <Heading size="sm">Urgences</Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={2}>
            <Text fontSize="sm" color="gray.600">Procédures d'urgence et contacts critiques</Text>
            <Badge mt={2} colorScheme="red">{knowledgeCountByCategory.emergency} document(s)</Badge>
          </CardBody>
        </Card>

        <Card borderTop="4px solid" borderColor="teal.500" cursor="pointer" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
          <CardHeader pb={2}>
            <HStack>
              <Icon as={FiBook} color="teal.500" boxSize={5} />
              <Heading size="sm">Formations</Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={2}>
            <Text fontSize="sm" color="gray.600">Supports de formation et tutoriels</Text>
            <Badge mt={2} colorScheme="teal">{knowledgeCountByCategory.training} document(s)</Badge>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Box>
        <Heading size="sm" mb={4}>📄 Documents récents</Heading>
        {knowledgeDocs.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            Aucun document disponible. Créez votre premier document de connaissances.
          </Alert>
        ) : (
          <VStack spacing={3} align="stretch">
            {knowledgeDocs.slice(0, 10).map((doc) => (
              <Card key={doc.id} bg={cardBg}>
                <CardBody>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1} flex={1}>
                      <HStack>
                        <Heading size="sm">{doc.title}</Heading>
                        <Badge colorScheme="blue" variant="subtle">{doc.category}</Badge>
                        <Badge colorScheme={doc.docType === 'job_sheet' ? 'teal' : 'purple'} variant="outline">
                          {doc.docType === 'job_sheet' ? 'Fiche metier' : 'Processus'}
                        </Badge>
                      </HStack>
                      {doc.summary && <Text fontSize="sm" color="gray.600">{doc.summary}</Text>}
                      <Text fontSize="xs" color="gray.500">
                        Mis a jour le {new Date(doc.updatedAt || doc.createdAt).toLocaleDateString('fr-FR')} par {doc.updatedBy || doc.createdBy || 'N/A'}
                      </Text>
                      {Array.isArray(doc.tags) && doc.tags.length > 0 && (
                        <HStack spacing={2} flexWrap="wrap">
                          {doc.tags.map((tag) => (
                            <Tag key={`${doc.id}_${tag}`} size="sm" variant="subtle" colorScheme="gray">
                              <TagLabel>{tag}</TagLabel>
                            </Tag>
                          ))}
                        </HStack>
                      )}
                    </VStack>
                    <HStack>
                      <IconButton
                        aria-label="Consulter"
                        icon={<FiEye />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleKnowledgeView(doc)}
                      />
                      <IconButton
                        aria-label="Editer"
                        icon={<FiEdit3 />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleKnowledgeEdit(doc)}
                      />
                      <IconButton
                        aria-label="Supprimer"
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="ghost"
                        color="red.500"
                        onClick={() => handleKnowledgeDelete(doc.id)}
                      />
                    </HStack>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  );

  // Rendu du contenu selon la section active
  const renderMainContent = () => {
    switch (activeSection) {
      case 'tickets':
        return <TicketsContent />;
      case 'knowledge':
        return <KnowledgeContent />;
      default:
        return <TicketsContent />;
    }
  };

  return (
    <HStack align="stretch" spacing={0} h="100vh" w="100%">
      {/* Sidebar */}
      <VStack
        align="stretch"
        spacing={0}
        w="280px"
        bg="gray.50"
        borderRight="1px"
        borderColor="gray.200"
        overflowY="auto"
      >
        {/* Header du sidebar */}
        <Box p={6} borderBottom="1px" borderColor="gray.200">
          <HStack spacing={3} mb={3}>
            <Icon as={FiLifeBuoy} color="red.500" boxSize={6} />
            <Box>
              <Heading size="md" color="gray.800">Support & Docs</Heading>
              <Text fontSize="sm" color="gray.500">Centre d'aide</Text>
            </Box>
          </HStack>
          <Text fontSize="xs" color="gray.500">Gestion RBE</Text>
        </Box>

        {/* Navigation principale */}
        <VStack align="stretch" spacing={0} px={3} py={4} flex={1}>
          {sections.map((section) => {
            const isActive = section.id === activeSection;
            const SectionIcon = section.icon;
            return (
              <Button
                key={section.id}
                leftIcon={<Icon as={SectionIcon} />}
                variant="ghost"
                justifyContent="flex-start"
                w="full"
                bg={isActive ? "red.50" : "transparent"}
                borderLeft="3px"
                borderColor={isActive ? "red.500" : "transparent"}
                borderRadius={0}
                px={4}
                py={6}
                fontSize="sm"
                fontWeight={isActive ? "600" : "500"}
                color={isActive ? "red.500" : "inherit"}
                _hover={{ bg: "gray.100", borderLeftColor: "red.500" }}
                onClick={() => setActiveSection(section.id)}
              >
                <Flex direction="column" align="flex-start" w="full">
                  <Text>{section.label}</Text>
                  {section.description && (
                    <Text fontSize="xs" color="gray.500">{section.description}</Text>
                  )}
                </Flex>
              </Button>
            );
          })}
        </VStack>

        {/* Footer du sidebar */}
        <Box
          p={4}
          borderTop="1px"
          borderColor="gray.200"
          fontSize="xs"
          color="gray.500"
          textAlign="center"
          w="full"
        >
          MyRBE Support
        </Box>
      </VStack>

      {/* Contenu principal */}
      <VStack align="stretch" spacing={0} flex={1} overflowY="auto">
        {/* Header */}
        <Box p={6} borderBottom="1px" borderColor="gray.200" bg="white">
          <HStack justify="space-between">
            <Box>
              <Heading size="lg">
                {activeSection === 'tickets' && '🎫 Tickets Support'}
                {activeSection === 'knowledge' && '📚 Base de connaissances'}
              </Heading>
              <Text fontSize="sm" color="gray.500">
                {activeSection === 'tickets' && 'Signalez et suivez les incidents, bugs et demandes'}
                {activeSection === 'knowledge' && 'Documentation des processus, guides et procédures'}
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Contenu */}
        <Box flex={1} overflowY="auto" p={6} w="full">
          {renderMainContent()}
        </Box>
      </VStack>

      {/* Modal création */}
      <Modal isOpen={isReportOpen} onClose={onReportClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>🎫 Nouveau ticket</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input value={reportFormData.title} onChange={(e) => setReportFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Ex: Problème de connexion, Page lente..." />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea value={reportFormData.description} onChange={(e) => setReportFormData(prev => ({ ...prev, description: e.target.value }))} rows={4} placeholder="Décrivez le problème..." />
              </FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Type</FormLabel>
                  <Select value={reportFormData.type} onChange={(e) => setReportFormData(prev => ({ ...prev, type: e.target.value }))}>
                    <option value="bug">🐛 Bug</option>
                    <option value="feature">✨ Amélioration</option>
                    <option value="performance">⚡ Performance</option>
                    <option value="security">🔒 Sécurité</option>
                    <option value="other">📋 Autre</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Priorité</FormLabel>
                  <Select value={reportFormData.priority} onChange={(e) => setReportFormData(prev => ({ ...prev, priority: e.target.value }))}>
                    <option value="low">🟢 Faible</option>
                    <option value="medium">🟡 Moyen</option>
                    <option value="high">🟠 Élevé</option>
                    <option value="critical">🔴 Critique</option>
                  </Select>
                </FormControl>
              </SimpleGrid>
              <FormControl>
                <FormLabel>Catégorie</FormLabel>
                <Input value={reportFormData.category} onChange={(e) => setReportFormData(prev => ({ ...prev, category: e.target.value }))} placeholder="Ex: Technique, Interface, Base de données..." />
              </FormControl>
              <FormControl>
                <FormLabel>Captures d’écran (optionnel)</FormLabel>
                <Input type="file" accept="image/*" multiple onChange={(e) => setReportScreenshots(Array.from(e.target.files || []))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onReportClose}>Annuler</Button>
            <Button colorScheme="red" onClick={handleReportSubmit} leftIcon={<FiPlus />}>Créer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal détail ticket */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>🔎 Détail du ticket</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedReport ? (
              <VStack align="stretch" spacing={4}>
                <VStack align="start" spacing={1}>
                  <Heading size="md">{selectedReport.title}</Heading>
                  <HStack>
                    <Badge>{selectedReport.category || 'GENERAL'}</Badge>
                    <Badge colorScheme={selectedReport.status === 'resolved' ? 'green' : selectedReport.status === 'in_progress' ? 'orange' : selectedReport.status === 'closed' ? 'gray' : 'blue'}>
                      {selectedStatusLabel}
                    </Badge>
                    <Badge colorScheme={selectedReport.priority === 'critical' ? 'red' : selectedReport.priority === 'high' ? 'orange' : selectedReport.priority === 'medium' ? 'yellow' : 'green'}>
                      {selectedPriorityLabel}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.500">
                    Créé par {selectedReport.createdBy} le {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString('fr-FR') : 'N/A'}
                  </Text>
                </VStack>

                <Box p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
                  <Text whiteSpace="pre-line">{selectedReport.description || 'Aucune description.'}</Text>
                </Box>

                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Heading size="sm">Suivi / Commentaires</Heading>
                    <Button size="sm" leftIcon={<FiMessageSquare />} onClick={() => { onDetailClose(); onCommentOpen(); }}>
                      Ajouter un commentaire
                    </Button>
                  </HStack>

                  {Array.isArray(selectedReport.comments) && selectedReport.comments.length > 0 ? (
                    <VStack align="stretch" spacing={2} maxH="300px" overflowY="auto" pr={1}>
                      {selectedReport.comments.map((comment, idx) => (
                        <Box key={`${selectedReport.id}_comment_${idx}`} p={3} borderWidth="1px" borderRadius="md">
                          <HStack justify="space-between" mb={1}>
                            <Text fontWeight="bold" fontSize="sm">{comment.author || 'Utilisateur'}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString('fr-FR') : ''}
                            </Text>
                          </HStack>
                          <Text fontSize="sm" whiteSpace="pre-line">{comment.message || ''}</Text>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Alert status="info">
                      <AlertIcon />
                      Aucun commentaire pour le moment.
                    </Alert>
                  )}
                </VStack>
              </VStack>
            ) : (
              <Alert status="info">
                <AlertIcon />
                Aucun ticket sélectionné.
              </Alert>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDetailClose}>Fermer</Button>
            {selectedReport && (
              <Button colorScheme="blue" onClick={() => { onDetailClose(); handleEditReport(selectedReport); }}>
                Modifier le ticket
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal commentaire */}
      <Modal isOpen={isCommentOpen} onClose={onCommentClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ajouter un commentaire</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Commentaire</FormLabel>
                <Textarea value={commentFormData.message} onChange={(e) => setCommentFormData(prev => ({ ...prev, message: e.target.value }))} rows={3} />
              </FormControl>
              <FormControl>
                <FormLabel>Changer le statut (optionnel)</FormLabel>
                <Select value={commentFormData.status} onChange={(e) => setCommentFormData(prev => ({ ...prev, status: e.target.value }))}>
                  <option value="">Ne pas changer</option>
                  <option value="open">Ouvert</option>
                  <option value="in_progress">En cours</option>
                  <option value="resolved">Résolu</option>
                  <option value="closed">Fermé</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCommentClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={handleCommentSubmit}>Publier</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal édition */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Modifier le ticket</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input value={editFormData.title} onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea rows={4} value={editFormData.description} onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))} />
              </FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Catégorie</FormLabel>
                  <Input value={editFormData.category} onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>Priorité</FormLabel>
                  <Select value={editFormData.priority} onChange={(e) => setEditFormData(prev => ({ ...prev, priority: e.target.value }))}>
                    <option value="low">Faible</option>
                    <option value="medium">Moyen</option>
                    <option value="high">Élevé</option>
                    <option value="critical">Critique</option>
                  </Select>
                </FormControl>
              </SimpleGrid>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select value={editFormData.type} onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value }))}>
                  <option value="bug">Bug</option>
                  <option value="feature">Amélioration</option>
                  <option value="performance">Performance</option>
                  <option value="security">Sécurité</option>
                  <option value="other">Autre</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={handleEditSubmit}>Enregistrer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Knowledge Base */}
      <Modal isOpen={isKnowledgeOpen} onClose={() => { onKnowledgeClose(); resetKnowledgeForm(); }} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedKnowledgeDoc
              ? 'Modifier le document'
              : knowledgeFormData.docType === 'job_sheet'
                ? 'Nouvelle fiche metier'
                : 'Nouveau processus'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Type de document</FormLabel>
                  <Select
                    value={knowledgeFormData.docType}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setKnowledgeFormData((prev) => ({
                        ...prev,
                        docType: nextType,
                        category: nextType === 'job_sheet' ? 'training' : 'process'
                      }));
                    }}
                  >
                    <option value="process">Processus</option>
                    <option value="job_sheet">Fiche metier</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Catégorie</FormLabel>
                  <Select
                    value={knowledgeFormData.category}
                    onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="process">Processus métiers</option>
                    <option value="procedure">Procédures</option>
                    <option value="technical">Guides techniques</option>
                    <option value="faq">FAQ</option>
                    <option value="emergency">Urgences</option>
                    <option value="training">Formations</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input
                  value={knowledgeFormData.title}
                  onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={knowledgeFormData.docType === 'job_sheet' ? 'Ex: Fiche metier - Agent Accueil' : 'Ex: Processus de validation des tickets'}
                />
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Tags (optionnel)</FormLabel>
                  <Input
                    value={knowledgeFormData.tags}
                    onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="check-in, support, process"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Résumé</FormLabel>
                  <Input
                    value={knowledgeFormData.summary}
                    onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, summary: e.target.value }))}
                    placeholder={knowledgeFormData.docType === 'job_sheet' ? 'Synthese du role' : 'Description courte du processus'}
                  />
                </FormControl>
              </SimpleGrid>

              {knowledgeFormData.docType === 'process' ? (
                <>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                    <FormControl>
                      <FormLabel>Objectif</FormLabel>
                      <Input
                        value={knowledgeFormData.processObjective}
                        onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, processObjective: e.target.value }))}
                        placeholder="Resultat attendu du processus"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Declencheur</FormLabel>
                      <Input
                        value={knowledgeFormData.processTrigger}
                        onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, processTrigger: e.target.value }))}
                        placeholder="Quand lancer ce processus"
                      />
                    </FormControl>
                  </SimpleGrid>

                  <FormControl>
                    <FormLabel>Acteurs</FormLabel>
                    <Input
                      value={knowledgeFormData.processActors}
                      onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, processActors: e.target.value }))}
                      placeholder="Ex: Support N1, Referent metier"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Etapes (une ligne = une etape)</FormLabel>
                    <Textarea
                      rows={5}
                      value={knowledgeFormData.processSteps}
                      onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, processSteps: e.target.value }))}
                      placeholder={"Qualifier la demande\nAffecter le ticket\nResoudre\nValider\nCloturer"}
                    />
                  </FormControl>
                </>
              ) : (
                <>
                  <FormControl>
                    <FormLabel>Mission principale</FormLabel>
                    <Input
                      value={knowledgeFormData.jobMission}
                      onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, jobMission: e.target.value }))}
                      placeholder="Objectif principal du poste"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Responsabilites</FormLabel>
                    <Textarea
                      rows={4}
                      value={knowledgeFormData.jobResponsibilities}
                      onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, jobResponsibilities: e.target.value }))}
                      placeholder={"- Activite 1\n- Activite 2\n- Activite 3"}
                    />
                  </FormControl>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                    <FormControl>
                      <FormLabel>Competences</FormLabel>
                      <Textarea
                        rows={4}
                        value={knowledgeFormData.jobSkills}
                        onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, jobSkills: e.target.value }))}
                        placeholder={"- Competence 1\n- Competence 2"}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Outils / logiciels</FormLabel>
                      <Textarea
                        rows={4}
                        value={knowledgeFormData.jobTools}
                        onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, jobTools: e.target.value }))}
                        placeholder="Liste des outils utilises"
                      />
                    </FormControl>
                  </SimpleGrid>
                </>
              )}

              <FormControl>
                <FormLabel>{knowledgeFormData.docType === 'job_sheet' ? 'Consignes / notes complementaires' : 'Details complementaires'}</FormLabel>
                <Textarea
                  rows={8}
                  value={knowledgeFormData.content}
                  onChange={(e) => setKnowledgeFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder={knowledgeFormData.docType === 'job_sheet' ? 'Consignes specifiques, points de vigilance...' : 'Contraintes, exceptions, escalade...'}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onKnowledgeClose(); resetKnowledgeForm(); }}>
              Annuler
            </Button>
            <Button colorScheme="red" onClick={handleKnowledgeSubmit} leftIcon={<FiPlus />}>
              {selectedKnowledgeDoc ? 'Mettre a jour' : 'Ajouter'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal consultation Knowledge Base */}
      <Modal isOpen={isKnowledgeViewOpen} onClose={onKnowledgeViewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Consultation document</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {viewKnowledgeDoc ? (
              <VStack align="stretch" spacing={4}>
                <VStack align="start" spacing={1}>
                  <HStack>
                    <Heading size="md">{viewKnowledgeDoc.title}</Heading>
                    <Badge colorScheme="blue" variant="subtle">{viewKnowledgeDoc.category}</Badge>
                    <Badge colorScheme={viewKnowledgeDoc.docType === 'job_sheet' ? 'teal' : 'purple'} variant="outline">
                      {viewKnowledgeDoc.docType === 'job_sheet' ? 'Fiche metier' : 'Processus'}
                    </Badge>
                  </HStack>
                  {viewKnowledgeDoc.summary && (
                    <Text fontSize="sm" color="gray.600">{viewKnowledgeDoc.summary}</Text>
                  )}
                  <Text fontSize="xs" color="gray.500">
                    Mis a jour le {new Date(viewKnowledgeDoc.updatedAt || viewKnowledgeDoc.createdAt).toLocaleDateString('fr-FR')} par {viewKnowledgeDoc.updatedBy || viewKnowledgeDoc.createdBy || 'N/A'}
                  </Text>
                </VStack>

                {Array.isArray(viewKnowledgeDoc.tags) && viewKnowledgeDoc.tags.length > 0 && (
                  <HStack spacing={2} flexWrap="wrap">
                    {viewKnowledgeDoc.tags.map((tag) => (
                      <Tag key={`view_${viewKnowledgeDoc.id}_${tag}`} size="sm" variant="subtle" colorScheme="gray">
                        <TagLabel>{tag}</TagLabel>
                      </Tag>
                    ))}
                  </HStack>
                )}

                <Box p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
                  <Text whiteSpace="pre-line" fontSize="sm">{viewKnowledgeDoc.content || 'Aucun contenu.'}</Text>
                </Box>
              </VStack>
            ) : (
              <Alert status="info">
                <AlertIcon />
                Aucun document selectionne.
              </Alert>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onKnowledgeViewClose}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </HStack>
  );
}