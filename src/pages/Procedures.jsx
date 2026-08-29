import React, { useEffect, useRef, useState } from 'react';
import {
  Badge, Box, Button, Card, CardBody, CardHeader, Heading, HStack, IconButton,
  Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader,
  ModalOverlay, SimpleGrid, Text, Textarea, VStack, useDisclosure, useToast,
} from '@chakra-ui/react';
import { FiArrowLeft, FiBook, FiCheckCircle, FiFileText, FiShield, FiTool, FiTrash2, FiUpload, FiUsers } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '../components/Layout/PageLayout';
import { apiClient } from '../api/config';
import { fetchCSRFToken, getStoredCSRFToken } from '../lib/csrfClient';

const procedures = [
  { id: 'vehicules', title: 'Procédures véhicules', icon: FiUsers, color: 'blue' },
  { id: 'commerciales', title: 'Procédures commerciales', icon: FiFileText, color: 'teal' },
  { id: 'tournage-safe', title: 'Procédures TOURNAGE & SAFE', icon: FiTool, color: 'orange' },
  { id: 'securite', title: 'Procédures Sécurité', icon: FiShield, color: 'purple' },
];
const API_BASE = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');

function PdfThumbnail({ document }) {
  const canvasRef = useRef(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
  let cancelled = false;
  let pdfDocument = null;
  const render = async () => {
      try {
        const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  const response = await fetch(`${API_BASE}${document.filePath}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  if (!response.ok) throw new Error('PDF inaccessible');
  const data = new Uint8Array(await response.arrayBuffer());
  pdfDocument = await pdfjs.getDocument({ data }).promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 0.45 });
  const canvas = canvasRef.current;
  if (!canvas || cancelled) return;
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: context, viewport }).promise;
      } catch {
        if (!cancelled) setUnavailable(true);
      }
  };
  render();
  return () => { cancelled = true; pdfDocument?.destroy(); };
  }, [document.filePath]);

  return <Box h="210px" bg="gray.100" display="flex" alignItems="center" justifyContent="center" overflow="hidden">{unavailable ? <VStack color="gray.500"><FiFileText size={40} /><Text fontSize="xs">Aperçu indisponible</Text></VStack> : <Box as="canvas" ref={canvasRef} maxW="100%" maxH="100%" boxShadow="sm" />}</Box>;
}

function ProcedureUploadModal({ category, isOpen, onClose, onPublished }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const close = () => { setTitle(''); setDescription(''); setFile(null); if (fileRef.current) fileRef.current.value = ''; onClose(); };
  const publish = async () => {
    if (!title.trim() || !file) return toast({ status: 'warning', title: 'Titre et PDF requis' });
    if (file.type !== 'application/pdf') return toast({ status: 'error', title: 'Format invalide', description: 'Sélectionnez un fichier PDF.' });
    try {
      setSubmitting(true);
  await fetchCSRFToken(API_BASE);
  const formData = new FormData();
  formData.append('categoryId', category.id);
  formData.append('title', title.trim());
  formData.append('description', description.trim());
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/api/procedures/documents`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'X-CSRF-Token': getStoredCSRFToken() || '' }, body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Publication impossible');
  toast({ status: 'success', title: 'Procédure publiée' });
  onPublished(data.document);
  close();
    } catch (error) { toast({ status: 'error', title: 'Publication impossible', description: error.message }); }
    finally { setSubmitting(false); }
  };
  return <Modal isOpen={isOpen} onClose={close} isCentered><ModalOverlay /><ModalContent><ModalHeader>Ajouter une procédure</ModalHeader><ModalCloseButton /><ModalBody><VStack align="stretch" spacing={4}><Box><Text fontSize="sm" fontWeight="700">Catégorie</Text><Text color="gray.600">{category.title}</Text></Box><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre de la procédure" /><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description courte" resize="vertical" /><Input ref={fileRef} type="file" accept="application/pdf,.pdf" p={1} onChange={(event) => setFile(event.target.files?.[0] || null)} /></VStack></ModalBody><ModalFooter><Button variant="ghost" onClick={close}>Annuler</Button><Button colorScheme="blue" leftIcon={<FiUpload />} isLoading={submitting} onClick={publish}>Publier</Button></ModalFooter></ModalContent></Modal>;
}

export default function Procedures() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const selectedCategory = procedures.find((procedure) => procedure.id === categoryId);
  const [documents, setDocuments] = useState([]);
  const [canPublish, setCanPublish] = useState(false);
  const [loading, setLoading] = useState(Boolean(categoryId));

  useEffect(() => {
    if (!selectedCategory) return;
    let cancelled = false;
    const loadDocuments = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get(`/procedures/documents?categoryId=${selectedCategory.id}`);
        if (!cancelled) { setDocuments(data?.documents || []); setCanPublish(Boolean(data?.canPublish)); }
      } catch (error) { if (!cancelled) toast({ status: 'error', title: 'Procédures indisponibles', description: error.message }); }
      finally { if (!cancelled) setLoading(false); }
    };
    loadDocuments();
    return () => { cancelled = true; };
  }, [selectedCategory?.id, toast]);

  if (categoryId && !selectedCategory) { navigate('/dashboard/procedures', { replace: true }); return null; }
  const deleteDocument = async (document) => {
    if (!window.confirm(`Supprimer « ${document.title} » ?`)) return;
    try {
      await apiClient.delete(`/procedures/documents/${document.id}`);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      toast({ status: 'success', title: 'Procédure supprimée' });
    } catch (error) { toast({ status: 'error', title: 'Suppression impossible', description: error.message }); }
  };

  return <PageLayout title={selectedCategory?.title || 'Procédures'} subtitle={selectedCategory ? 'Documents associés à cette catégorie' : 'Référentiel opérationnel RétroBus Essonne'} breadcrumbs={[{ label: 'Tableau de bord', href: '/dashboard' }, { label: 'Procédures', href: '/dashboard/procedures' }]} bgGradient="linear(to-r, rbe.600, rbe.800)" titleSize="lg"><VStack spacing={6} align="stretch">
    {selectedCategory ? <><HStack justify="space-between"><Button leftIcon={<FiArrowLeft />} variant="ghost" onClick={() => navigate('/dashboard/procedures')}>Toutes les catégories</Button>{canPublish && <Button colorScheme="blue" leftIcon={<FiUpload />} onClick={onOpen}>Importer un PDF</Button>}</HStack>
      {loading ? <Text color="gray.500">Chargement des procédures...</Text> : documents.length ? <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>{documents.map((document) => <Card key={document.id} overflow="hidden" borderWidth="1px" borderTopWidth="3px" borderTopColor="rbe.500" bg="white" _hover={{ shadow: 'lg', transform: 'translateY(-2px)', borderColor: 'rbe.300' }} transition="all .2s"><Box as="a" href={`${API_BASE}${document.filePath}`} target="_blank" rel="noreferrer" display="block"><PdfThumbnail document={document} /></Box><CardBody p={3}><Heading size="xs" color="gray.800" noOfLines={2}>{document.title}</Heading>{document.description && <Text mt={1} fontSize="xs" color="gray.600" noOfLines={3}>{document.description}</Text>}<HStack mt={3} pt={2} borderTop="1px solid" borderColor="gray.100" justify="space-between"><Text fontSize="xs" color="gray.500" noOfLines={1}>{document.fileName}</Text>{canPublish && <IconButton size="xs" colorScheme="red" variant="ghost" aria-label={`Supprimer ${document.title}`} icon={<FiTrash2 />} onClick={() => deleteDocument(document)} />}</HStack></CardBody></Card>)}</SimpleGrid> : <Box py={12} textAlign="center" border="1px dashed" borderColor="gray.300" bg="gray.50"><FiBook size={28} color="#d30c4c" /><Text mt={3} color="gray.600">Aucune procédure publiée dans cette catégorie.</Text></Box>}<ProcedureUploadModal category={selectedCategory} isOpen={isOpen} onClose={onClose} onPublished={(document) => setDocuments((current) => [document, ...current])} /></>
      : <><Box borderLeft="4px solid" borderColor="rbe.500" pl={4}><Heading size="md" mb={2}>Référentiels par activité</Heading><Text color="gray.600">Choisissez la catégorie correspondant à votre opération.</Text></Box><SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>{procedures.map((procedure) => <Card key={procedure.id} cursor="pointer" borderWidth="1px" borderColor="gray.200" borderLeftWidth="4px" borderLeftColor="rbe.500" bg="white" onClick={() => navigate(`/dashboard/procedures/${procedure.id}`)} _hover={{ shadow: 'lg', transform: 'translateY(-2px)', borderColor: 'rbe.300' }} transition="all .2s"><CardHeader pb={2}><HStack><Box color="rbe.500"><procedure.icon size={22} /></Box><Heading size="sm">{procedure.title}</Heading></HStack></CardHeader><CardBody pt={2}><Text fontSize="sm" color="gray.600">Consulter les documents de la catégorie</Text></CardBody></Card>)}</SimpleGrid></>}
    <HStack color="gray.600" fontSize="sm"><FiCheckCircle /><Text>Les procédures détaillées et leurs mises à jour sont centralisées ici.</Text></HStack>
  </VStack></PageLayout>;
}
