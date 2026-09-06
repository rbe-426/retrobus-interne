import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Badge, Box, Button, Card, CardBody, Container, Divider, FormControl,
  FormLabel, Heading, HStack, IconButton, Image, Input, Modal, ModalBody,
  ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
  SimpleGrid, Switch, Text, Textarea, useDisclosure, useToast, VStack,
} from '@chakra-ui/react';
import { FiEdit, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi';
import { apiClient } from '../api/config';
import MarkdownEditor from '../components/MarkdownEditor';
import MediaUploader from '../components/MediaUploader';

const emptyArticle = () => ({
  title: '',
  excerpt: '',
  imageUrl: '',
  content: '',
  media: [],
  featured: false,
  published: false,
});

const parseMedia = (media) => {
  if (Array.isArray(media)) return media;
  try {
    return JSON.parse(media || '[]');
  } catch {
    return [];
  }
};

const PublicArticleImage = ({ title, alt, ...props }) => {
  const width = /^width:(33%|50%|100%)$/.test(title || '') ? title.slice(6) : '100%';
  return <Image {...props} alt={alt || ''} w={width} maxW="100%" mx={0} />;
};

export default function PublicNewsManagement() {
  const [articles, setArticles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyArticle);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/api/public-news');
      setArticles(Array.isArray(data) ? data : data?.news || []);
    } catch (error) {
      toast({ title: 'Chargement impossible', description: 'Les actualités publiques ne sont pas disponibles.', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyArticle());
    onOpen();
  };

  const openEdit = (article) => {
    setEditingId(article.id);
    setFormData({
      title: article.title || '',
      excerpt: article.excerpt || '',
      imageUrl: article.imageUrl || '',
      content: article.content || article.body || '',
      media: parseMedia(article.media),
      featured: Boolean(article.featured),
      published: Boolean(article.published),
    });
    onOpen();
  };

  const saveArticle = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: 'Titre et article requis', status: 'error' });
      return;
    }

    const payload = {
      ...formData,
      media: JSON.stringify(formData.media),
      status: formData.published ? 'published' : 'draft',
    };

    try {
      if (editingId) {
        await apiClient.put(`/api/public-news/${editingId}`, payload);
      } else {
        await apiClient.post('/api/public-news', payload);
      }
      toast({ title: editingId ? 'Article public mis à jour' : 'Article public créé', status: 'success' });
      onClose();
      loadArticles();
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: error.message, status: 'error' });
    }
  };

  const deleteArticle = async (id) => {
    if (!window.confirm('Supprimer cet article public ?')) return;
    try {
      await apiClient.delete(`/api/public-news/${id}`);
      toast({ title: 'Article supprimé', status: 'success' });
      loadArticles();
    } catch (error) {
      toast({ title: 'Suppression impossible', description: error.message, status: 'error' });
    }
  };

  const coverImage = formData.imageUrl || formData.media.find((item) => item.type === 'image' && item.url)?.url;

  return (
    <Container maxW="container.xl" py={8}>
      <HStack justify="space-between" align="start" mb={8} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg" color="rbe.600">Actualités publiques</Heading>
          <Text color="gray.600" mt={1}>Articles destinés au site association-rbe.fr, distincts de RétroActus interne.</Text>
        </Box>
        <Button leftIcon={<FiPlus />} bg="rbe.600" color="white" _hover={{ bg: 'rbe.500' }} onClick={openCreate}>Nouvel article</Button>
      </HStack>

      {loading ? <Text color="gray.600">Chargement des articles...</Text> : articles.length === 0 ? (
        <Card variant="outline"><CardBody py={12}><VStack><Text color="gray.600">Aucun article public n'est encore préparé.</Text><Button leftIcon={<FiPlus />} variant="outline" colorScheme="red" onClick={openCreate}>Créer le premier article</Button></VStack></CardBody></Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
          {articles.map((article) => (
            <Card key={article.id} variant="outline" borderTop="4px solid" borderTopColor="rbe.500">
              <CardBody><VStack align="stretch" spacing={4}>
                <HStack justify="space-between"><Badge colorScheme={article.published ? 'green' : 'gray'}>{article.published ? 'Publié' : 'Brouillon'}</Badge>{article.featured && <Badge colorScheme="red">À la une</Badge>}</HStack>
                <Heading size="sm" noOfLines={2}>{article.title}</Heading>
                <Text fontSize="sm" color="gray.600" noOfLines={3}>{article.excerpt || article.content || article.body}</Text>
                <HStack justify="end"><IconButton icon={<FiEdit />} aria-label="Modifier l'article" onClick={() => openEdit(article)} /><IconButton icon={<FiTrash2 />} colorScheme="red" aria-label="Supprimer l'article" onClick={() => deleteArticle(article.id)} /></HStack>
              </VStack></CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="full" scrollBehavior="inside">
        <ModalOverlay /><ModalContent><ModalHeader>{editingId ? 'Modifier l’article public' : 'Nouvel article public'}</ModalHeader><ModalCloseButton />
          <ModalBody pb={6}><SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} alignItems="start">
            <VStack align="stretch" spacing={5}>
              <FormControl isRequired><FormLabel>Titre</FormLabel><Input value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} placeholder="Titre de l'article" /></FormControl>
              <FormControl><FormLabel>Chapô</FormLabel><Textarea value={formData.excerpt} onChange={(event) => setFormData({ ...formData, excerpt: event.target.value })} placeholder="Résumé affiché dans la liste des actualités" rows={3} /></FormControl>
              <FormControl><FormLabel>Image de couverture</FormLabel><Input value={formData.imageUrl} onChange={(event) => setFormData({ ...formData, imageUrl: event.target.value })} placeholder="URL facultative, sinon première image téléversée" /></FormControl>
              <Divider /><MediaUploader media={formData.media} onChange={(media) => setFormData({ ...formData, media })} uploadEndpoint="/api/public-news/media/upload" />
              <FormControl isRequired><FormLabel>Article magazine</FormLabel><MarkdownEditor value={formData.content} onChange={(event) => setFormData({ ...formData, content: event.target.value })} media={formData.media} placeholder={'# Titre\n\nIntroduction.\n\n## Sous-titre\n\nTexte et images...'} /></FormControl>
              <HStack justify="space-between"><FormLabel mb={0}>À la une</FormLabel><Switch colorScheme="red" isChecked={formData.featured} onChange={(event) => setFormData({ ...formData, featured: event.target.checked })} /></HStack>
              <HStack justify="space-between"><FormLabel mb={0}>Publier sur le site externe</FormLabel><Switch colorScheme="red" isChecked={formData.published} onChange={(event) => setFormData({ ...formData, published: event.target.checked })} /></HStack>
            </VStack>
            <Box position={{ lg: 'sticky' }} top={0} bg="white" borderWidth="1px" borderTop="4px solid" borderTopColor="rbe.500" borderRadius="md" overflow="hidden"><Box px={6} py={3} bg="gray.50"><HStack color="rbe.700"><FiEye /><Text fontSize="sm" fontWeight="700">Aperçu public</Text></HStack></Box>{coverImage && <Image src={coverImage} alt="Aperçu de couverture" h="190px" w="full" objectFit="cover" />}<VStack align="stretch" p={6} spacing={4}><Heading size="lg">{formData.title || 'Titre de l’article'}</Heading>{formData.excerpt && <Text color="gray.600" fontWeight="600">{formData.excerpt}</Text>}<Box color="gray.700" sx={{ '& h1, & h2, & h3': { color: '#d30c4c', marginTop: 5, marginBottom: 3 }, '& p': { marginBottom: 3, lineHeight: 'tall' }, '& img': { maxWidth: '100%', borderRadius: '6px', marginTop: 4, marginBottom: 2 }, '& a': { color: '#be003c', textDecoration: 'underline' } }}><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: PublicArticleImage }}>{formData.content || 'Le contenu de votre article apparaîtra ici.'}</ReactMarkdown></Box></VStack></Box>
          </SimpleGrid></ModalBody>
          <ModalFooter><Button variant="ghost" mr={3} onClick={onClose}>Annuler</Button><Button bg="rbe.600" color="white" _hover={{ bg: 'rbe.500' }} onClick={saveArticle}>{editingId ? 'Mettre à jour' : 'Enregistrer'}</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}