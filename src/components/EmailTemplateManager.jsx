/**
 * EmailTemplateManager.jsx
 * Admin component for managing email templates with noreply@association-rbe.fr
 * 
 * Features:
 * - Connect to noreply@association-rbe.fr account
 * - List all templates with categories
 * - Create new template
 * - Edit existing template
 * - Delete template
 * - Preview template with test data
 * - Send test emails via noreply account
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  Grid,
  GridItem,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  useToast,
  Badge,
  HStack,
  VStack,
  FormControl,
  FormLabel,
  FormHelperText,
  Switch,
  Spinner,
  Icon,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
  InputGroup,
  InputRightElement,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  EditIcon,
  DeleteIcon,
  AddIcon,
  ViewIcon,
  CheckIcon,
  CloseIcon,
  EmailIcon,
  LockIcon,
  UnlockIcon,
} from '@chakra-ui/icons';
import { 
  FiMail, 
  FiSend, 
  FiEye, 
  FiEyeOff, 
  FiCheck, 
  FiAlertCircle,
  FiRefreshCw,
} from 'react-icons/fi';
import { fetchWithCSRF } from '../lib/csrfClient';

/**
 * Catégories de templates d'emails
 */
const EMAIL_CATEGORIES = {
  WELCOME: {
    label: '👋 Bienvenue',
    description: 'Emails de bienvenue et onboarding',
    color: 'green',
    variables: ['user.name', 'user.email', 'user.role', 'welcome.link']
  },
  TICKETS: {
    label: '🎫 Tickets',
    description: 'Notifications de tickets et support',
    color: 'blue',
    variables: ['ticket.id', 'ticket.title', 'ticket.status', 'ticket.priority', 'creator.name', 'creator.email', 'ticket.link']
  },
  EVENTS: {
    label: '📅 Événements',
    description: 'Invitations et rappels d\'événements',
    color: 'purple',
    variables: ['event.name', 'event.date', 'event.location', 'event.description', 'event.link', 'organizer.name']
  },
  FINANCE: {
    label: '💰 Finances',
    description: 'Factures, devis et paiements',
    color: 'orange',
    variables: ['invoice.number', 'invoice.amount', 'invoice.date', 'invoice.dueDate', 'client.name', 'invoice.link']
  },
  MEMBERSHIP: {
    label: '👥 Adhésions',
    description: 'Renouvellements et cotisations',
    color: 'teal',
    variables: ['member.name', 'member.number', 'membership.type', 'membership.expiry', 'renewal.link']
  },
  VEHICLES: {
    label: '🚗 Véhicules',
    description: 'Réservations et maintenance',
    color: 'cyan',
    variables: ['vehicle.name', 'vehicle.plate', 'reservation.date', 'reservation.link', 'user.name']
  },
  ADMIN: {
    label: '⚙️ Administration',
    description: 'Notifications système et administratives',
    color: 'gray',
    variables: ['admin.message', 'system.status', 'action.required', 'link']
  },
  CUSTOM: {
    label: '✨ Personnalisé',
    description: 'Templates personnalisés',
    color: 'pink',
    variables: []
  }
};

/**
 * API client for email templates
 */
const templateAPI = {
  async getAll() {
    const res = await fetchWithCSRF('/api/email-templates', {
      method: 'GET'
    });
    if (!res.ok) throw new Error(`Failed to fetch templates: ${res.statusText}`);
    return res.json();
  },

  async getById(id) {
    const res = await fetchWithCSRF(`/api/email-templates/${id}`, {
      method: 'GET'
    });
    if (!res.ok) throw new Error(`Failed to fetch template: ${res.statusText}`);
    return res.json();
  },

  async create(data) {
    const res = await fetchWithCSRF('/api/email-templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create template');
    }
    return res.json();
  },

  async update(id, data) {
    const res = await fetchWithCSRF(`/api/email-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update template');
    }
    return res.json();
  },

  async delete(id) {
    const res = await fetchWithCSRF(`/api/email-templates/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete template');
    }
    return res.json();
  },

  async preview(name, data) {
    const res = await fetchWithCSRF(`/api/email-templates/preview/${name}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to preview template');
    }
    return res.json();
  }
};

/**
 * Template Editor Modal Component
 */
function TemplateEditorModal({ isOpen, onClose, template, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    description: '',
    variables: '',
    category: 'CUSTOM',
    active: true
  });

  useEffect(() => {
    if (template) {
      setFormData({
        ...template,
        category: template.category || 'CUSTOM'
      });
    } else {
      setFormData({
        name: '',
        subject: '',
        body: '',
        description: '',
        variables: '',
        category: 'CUSTOM',
        active: true
      });
    }
  }, [template, isOpen]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Auto-update variables based on category
  const handleCategoryChange = (e) => {
    const category = e.target.value;
    const categoryVars = EMAIL_CATEGORIES[category]?.variables || [];
    setFormData(prev => ({
      ...prev,
      category,
      variables: categoryVars.join(', ')
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      alert('Name, subject, and body are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {template?.id ? 'Edit Template' : 'Create New Template'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl>
              <FormLabel>Template Name (unique, lowercase)</FormLabel>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., ticket_created"
                isDisabled={!!template?.id}
              />
              <FormHelperText>
                Use lowercase letters, numbers, and underscores. Cannot be changed after creation.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Catégorie</FormLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
              >
                {Object.entries(EMAIL_CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>
                    {cat.label}
                  </option>
                ))}
              </Select>
              <FormHelperText>
                {EMAIL_CATEGORIES[formData.category]?.description}
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Subject (supports variables)</FormLabel>
              <Input
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="New ticket: {{ticket.id}}"
              />
              <FormHelperText>
                Use double curly braces for variables, e.g.: ticket.id, creator.name
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Body (supports variables)</FormLabel>
              <Textarea
                name="body"
                value={formData.body}
                onChange={handleChange}
                placeholder="Enter email body..."
                minH="200px"
              />
              <FormHelperText>
                Use double curly braces for variables. Supports plain text.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe when and how this template is used..."
                minH="80px"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Available Variables (comma-separated, for documentation)</FormLabel>
              <Textarea
                name="variables"
                value={formData.variables}
                onChange={handleChange}
                placeholder="ticket.id, ticket.title, creator.name, creator.email"
                minH="60px"
              />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="active" mb="0">
                Active
              </FormLabel>
              <Switch
                id="active"
                name="active"
                isChecked={formData.active}
                onChange={handleChange}
                ml={4}
              />
            </FormControl>
          </Stack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave} isLoading={isLoading}>
            {template?.id ? 'Update' : 'Create'} Template
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * Template Preview Modal Component
 */
function TemplatePreviewModal({ isOpen, onClose, template, token }) {
  const [testData, setTestData] = useState('{\n  "ticket": {\n    "id": "T-001",\n    "title": "Test ticket"\n  },\n  "creator": {\n    "name": "John Doe",\n    "email": "john@example.com"\n  }\n}');
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const handlePreview = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = JSON.parse(testData);
      const result = await templateAPI.preview(template.name, data, token);
      setPreview(result.preview);
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 3
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Preview Template: {template?.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <Box>
              <FormLabel>Test Data (JSON)</FormLabel>
              <Textarea
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                fontFamily="monospace"
                fontSize="xs"
                minH="150px"
              />
            </Box>

            <Button onClick={handlePreview} colorScheme="blue" isLoading={isLoading}>
              Generate Preview
            </Button>

            {error && (
              <Box p={3} bg="red.50" borderRadius="md" color="red.800">
                Error: {error}
              </Box>
            )}

            {preview && (
              <VStack align="start" spacing={3} p={3} bg="gray.50" borderRadius="md">
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">Subject:</Text>
                  <Text fontFamily="monospace" fontSize="sm">{preview.subject}</Text>
                </Box>
                <Divider />
                <Box w="100%">
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">Body:</Text>
                  <Box
                    p={3}
                    bg="white"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                    fontSize="sm"
                    whiteSpace="pre-wrap"
                    fontFamily="monospace"
                  >
                    {preview.body}
                  </Box>
                </Box>
              </VStack>
            )}
          </Stack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * Send Test Email Modal Component
 */
function SendTestEmailModal({ isOpen, onClose, template, noreplyEmail }) {
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState('');
  const [isSending, setIsSending] = useState(false);
  const toast = useToast();
  
  useEffect(() => {
    if (template && isOpen) {
      // Auto-populate test data based on template category
      const category = EMAIL_CATEGORIES[template.category] || EMAIL_CATEGORIES.CUSTOM;
      const sampleData = {};
      
      category.variables.forEach(varName => {
        const parts = varName.split('.');
        if (parts.length === 2) {
          if (!sampleData[parts[0]]) sampleData[parts[0]] = {};
          sampleData[parts[0]][parts[1]] = `[${varName}]`;
        } else {
          sampleData[varName] = `[${varName}]`;
        }
      });
      
      setTestData(JSON.stringify(sampleData, null, 2));
    }
  }, [template, isOpen]);
  
  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast({
        title: 'Email requis',
        description: 'Veuillez entrer une adresse email de destination',
        status: 'warning',
        duration: 3000
      });
      return;
    }
    
    try {
      setIsSending(true);
      
      // Parse test data
      let parsedData = {};
      if (testData.trim()) {
        try {
          parsedData = JSON.parse(testData);
        } catch (e) {
          throw new Error('Données JSON invalides');
        }
      }
      
      // Replace variables in subject and body
      let subject = template.subject;
      let body = template.body;
      
      const replaceVars = (text, data) => {
        return text.replace(/\{\{([^}]+)\}\}/g, (match, varPath) => {
          const parts = varPath.trim().split('.');
          let value = data;
          for (const part of parts) {
            value = value?.[part];
          }
          return value !== undefined ? value : match;
        });
      };
      
      subject = replaceVars(subject, parsedData);
      body = replaceVars(body, parsedData);
      
      // Send email via noreply account
      const response = await fetchWithCSRF('/api/mail/send', {
        method: 'POST',
        body: JSON.stringify({
          to: testEmail,
          subject: subject,
          body: body,
          fromName: 'RétroBus Essonne'
        })
      });
      
      if (response.ok) {
        toast({
          title: '✅ Email de test envoyé',
          description: `Email envoyé à ${testEmail} depuis ${noreplyEmail}`,
          status: 'success',
          duration: 4000
        });
        onClose();
        setTestEmail('');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Échec de l\'envoi');
      }
    } catch (err) {
      toast({
        title: 'Erreur d\'envoi',
        description: err.message,
        status: 'error',
        duration: 4000
      });
    } finally {
      setIsSending(false);
    }
  };
  
  if (!template) return null;
  
  const category = EMAIL_CATEGORIES[template.category] || EMAIL_CATEGORIES.CUSTOM;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <VStack align="start" spacing={1}>
            <Text>Envoyer un email de test</Text>
            <HStack spacing={2}>
              <Badge colorScheme={category.color}>{category.label}</Badge>
              <Text fontSize="sm" fontWeight="normal" color="gray.600">
                {template.name}
              </Text>
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Email envoyé depuis</AlertTitle>
                <AlertDescription>
                  <strong>{noreplyEmail}</strong>
                </AlertDescription>
              </Box>
            </Alert>
            
            <FormControl isRequired>
              <FormLabel>Email de destination</FormLabel>
              <Input
                type="email"
                placeholder="destinataire@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Données de test (JSON)</FormLabel>
              <Textarea
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                fontFamily="monospace"
                fontSize="xs"
                minH="150px"
                placeholder='{"user": {"name": "Test User"}}'
              />
              <FormHelperText>
                Variables disponibles: {category.variables.join(', ') || 'Aucune'}
              </FormHelperText>
            </FormControl>
            
            <Box p={3} bg="gray.50" borderRadius="md">
              <Text fontWeight="bold" fontSize="sm" mb={2}>Aperçu du sujet:</Text>
              <Text fontSize="sm">{template.subject}</Text>
            </Box>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Annuler
          </Button>
          <Button
            colorScheme="green"
            leftIcon={<Icon as={FiSend} />}
            onClick={handleSendTest}
            isLoading={isSending}
            loadingText="Envoi..."
          >
            Envoyer le test
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * Main Component
 */
export default function EmailTemplateManager({ token }) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [sendTestTemplate, setSendTestTemplate] = useState(null);
  
  // NoReply account connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [noreplyEmail] = useState('noreply@association-rbe.fr');
  const [noreplyPassword, setNoreplyPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const {
    isOpen: isEditorOpen,
    onOpen: onEditorOpen,
    onClose: onEditorClose
  } = useDisclosure();

  const {
    isOpen: isPreviewOpen,
    onOpen: onPreviewOpen,
    onClose: onPreviewClose
  } = useDisclosure();
  
  const {
    isOpen: isSendTestOpen,
    onOpen: onSendTestOpen,
    onClose: onSendTestClose
  } = useDisclosure();

  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, [token]);
  
  // Check if noreply account is connected
  const checkConnection = async () => {
    try {
      const response = await fetchWithCSRF('/api/mail/status', {
        method: 'GET'
      });
      const data = await response.json();
      if (data.connected && data.email === noreplyEmail) {
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Connection check failed:', err);
    }
  };
  
  // Connect to noreply account
  const handleConnect = async () => {
    if (!noreplyPassword.trim()) {
      toast({
        title: 'Mot de passe requis',
        description: 'Veuillez entrer le mot de passe du compte noreply',
        status: 'warning',
        duration: 3000
      });
      return;
    }
    
    try {
      setIsConnecting(true);
      const response = await fetchWithCSRF('/api/mail/connect', {
        method: 'POST',
        body: JSON.stringify({
          email: noreplyEmail,
          password: noreplyPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsConnected(true);
        setNoreplyPassword('');
        toast({
          title: '✅ Connexion réussie',
          description: `Connecté au compte ${noreplyEmail}`,
          status: 'success',
          duration: 3000
        });
      } else {
        throw new Error(data.error || 'Échec de la connexion');
      }
    } catch (err) {
      toast({
        title: 'Erreur de connexion',
        description: err.message,
        status: 'error',
        duration: 4000
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Disconnect from noreply account
  const handleDisconnect = async () => {
    try {
      await fetchWithCSRF('/api/mail/disconnect', {
        method: 'POST'
      });
      setIsConnected(false);
      toast({
        title: 'Déconnexion réussie',
        status: 'info',
        duration: 2000
      });
    } catch (err) {
      toast({
        title: 'Erreur de déconnexion',
        description: err.message,
        status: 'error',
        duration: 3000
      });
    }
  };

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await templateAPI.getAll(token);
      setTemplates(result.templates || []);
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Error loading templates',
        description: err.message,
        status: 'error',
        duration: 3
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedTemplate(null);
    onEditorOpen();
  };

  const handleEditClick = (template) => {
    setSelectedTemplate(template);
    onEditorOpen();
  };

  const handlePreviewClick = (template) => {
    setPreviewTemplate(template);
    onPreviewOpen();
  };

  const handleDeleteClick = async (template) => {
    if (!confirm(`Are you sure you want to delete template "${template.name}"?`)) {
      return;
    }

    try {
      await templateAPI.delete(template.id, token);
      toast({
        title: 'Template deleted',
        status: 'success',
        duration: 2
      });
      loadTemplates();
    } catch (err) {
      toast({
        title: 'Error deleting template',
        description: err.message,
        status: 'error',
        duration: 3
      });
    }
  };

  const handleSaveTemplate = async (formData) => {
    try {
      if (selectedTemplate?.id) {
        await templateAPI.update(selectedTemplate.id, formData, token);
        toast({
          title: 'Template mis à jour',
          status: 'success',
          duration: 2
        });
      } else {
        await templateAPI.create(formData, token);
        toast({
          title: 'Template créé',
          status: 'success',
          duration: 2
        });
      }
      onEditorClose();
      loadTemplates();
    } catch (err) {
      toast({
        title: 'Error saving template',
        description: err.message,
        status: 'error',
        duration: 3
      });
    }
  };
  
  const handleSendTestClick = (template) => {
    if (!isConnected) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter au compte noreply pour envoyer des tests',
        status: 'warning',
        duration: 3000
      });
      return;
    }
    setSendTestTemplate(template);
    onSendTestOpen();
  };
  
  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'ALL') {
      return templates;
    }
    return templates.filter(t => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  return (
    <Box p={6}>
      {/* NoReply Account Connection Card */}
      <Card mb={6} bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardHeader>
          <Flex justify="space-between" align="center">
            <HStack spacing={3}>
              <Icon as={FiMail} boxSize={6} color="rbe.500" />
              <VStack align="start" spacing={0}>
                <Heading size="md">Compte NoReply</Heading>
                <Text fontSize="sm" color="gray.600">
                  Connexion à {noreplyEmail} pour l'envoi automatique
                </Text>
              </VStack>
            </HStack>
            {isConnected && (
              <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                <HStack spacing={2}>
                  <Icon as={FiCheck} />
                  <Text>Connecté</Text>
                </HStack>
              </Badge>
            )}
          </Flex>
        </CardHeader>
        <CardBody>
          {!isConnected ? (
            <VStack spacing={4} align="stretch">
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Connexion requise</AlertTitle>
                  <AlertDescription>
                    Connectez-vous au compte noreply@association-rbe.fr pour pouvoir envoyer des emails de test et activer l'envoi automatique.
                  </AlertDescription>
                </Box>
              </Alert>
              <FormControl>
                <FormLabel>Mot de passe du compte NoReply</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Entrez le mot de passe"
                    value={noreplyPassword}
                    onChange={(e) => setNoreplyPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                  />
                  <InputRightElement>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={showPassword ? <FiEyeOff /> : <FiEye />}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              <Button
                leftIcon={<Icon as={FiMail} />}
                colorScheme="rbe"
                onClick={handleConnect}
                isLoading={isConnecting}
                loadingText="Connexion..."
              >
                Se connecter
              </Button>
            </VStack>
          ) : (
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <Icon as={UnlockIcon} color="green.500" boxSize={5} />
                <Text fontSize="md">
                  Vous êtes connecté au compte <strong>{noreplyEmail}</strong>
                </Text>
              </HStack>
              <Button
                size="sm"
                variant="outline"
                colorScheme="red"
                onClick={handleDisconnect}
              >
                Se déconnecter
              </Button>
            </Flex>
          )}
        </CardBody>
      </Card>

      {/* Header & Actions */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg">📧 Modèles d'Email</Heading>
          <Text fontSize="sm" color="gray.600">
            {filteredTemplates.length} template(s) • {templates.filter(t => t.active).length} actif(s)
          </Text>
        </VStack>
        <HStack spacing={3}>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            maxW="250px"
          >
            <option value="ALL">🗂️ Toutes les catégories</option>
            {Object.entries(EMAIL_CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>
                {cat.label}
              </option>
            ))}
          </Select>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="green"
            onClick={handleCreateClick}
          >
            Nouveau Template
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Flex justify="center" py={12}>
          <Spinner size="lg" />
        </Flex>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardBody textAlign="center" py={12}>
            <VStack spacing={3}>
              <Icon as={FiAlertCircle} boxSize={12} color="gray.400" />
              <Text color="gray.500" fontSize="lg">
                {selectedCategory === 'ALL' 
                  ? 'Aucun template. Créez-en un !' 
                  : `Aucun template dans la catégorie ${EMAIL_CATEGORIES[selectedCategory]?.label}`}
              </Text>
            </VStack>
          </CardBody>
        </Card>
      ) : (
        <Grid templateColumns="repeat(auto-fill, minmax(350px, 1fr))" gap={4}>
          {filteredTemplates.map(template => {
            const category = EMAIL_CATEGORIES[template.category] || EMAIL_CATEGORIES.CUSTOM;
            return (
              <Card key={template.id} borderWidth="2px" borderColor={borderColor}>
                <CardHeader pb={2}>
                  <Flex justify="space-between" align="start" mb={2}>
                    <VStack align="start" spacing={2} flex={1}>
                      <Heading size="md">{template.name}</Heading>
                      <HStack spacing={2}>
                        <Badge colorScheme={category.color}>
                          {category.label}
                        </Badge>
                        <Badge colorScheme={template.active ? 'green' : 'gray'}>
                          {template.active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </HStack>
                    </VStack>
                  </Flex>
                </CardHeader>
                <Divider />
                <CardBody>
                  <Stack spacing={3}>
                    <Box>
                      <Text fontSize="xs" color="gray.600" fontWeight="bold">Sujet:</Text>
                      <Text fontSize="sm" noOfLines={2}>{template.subject}</Text>
                    </Box>
                    {template.description && (
                      <Box>
                        <Text fontSize="xs" color="gray.600" fontWeight="bold">Description:</Text>
                        <Text fontSize="sm" noOfLines={2}>{template.description}</Text>
                      </Box>
                    )}
                    <Divider />
                    <HStack spacing={2} wrap="wrap">
                      <Tooltip label="Aperçu">
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="blue"
                          leftIcon={<ViewIcon />}
                          onClick={() => handlePreviewClick(template)}
                        >
                          Aperçu
                        </Button>
                      </Tooltip>
                      {isConnected && (
                        <Tooltip label="Envoyer un test">
                          <Button
                            size="sm"
                            variant="outline"
                            colorScheme="green"
                            leftIcon={<Icon as={FiSend} />}
                            onClick={() => handleSendTestClick(template)}
                          >
                            Test
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip label="Modifier">
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="orange"
                          leftIcon={<EditIcon />}
                          onClick={() => handleEditClick(template)}
                        >
                          Modifier
                        </Button>
                      </Tooltip>
                      <Tooltip label="Supprimer">
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="red"
                          leftIcon={<DeleteIcon />}
                          onClick={() => handleDeleteClick(template)}
                        >
                          Supprimer
                        </Button>
                      </Tooltip>
                    </HStack>
                  </Stack>
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      )}

      <TemplateEditorModal
        isOpen={isEditorOpen}
        onClose={onEditorClose}
        template={selectedTemplate}
        onSave={handleSaveTemplate}
        isLoading={isLoading}
      />
      
      <SendTestEmailModal
        isOpen={isSendTestOpen}
        onClose={onSendTestClose}
        template={sendTestTemplate}
        noreplyEmail={noreplyEmail}
      />

      {previewTemplate && (
        <TemplatePreviewModal
          isOpen={isPreviewOpen}
          onClose={onPreviewClose}
          template={previewTemplate}
          token={token}
        />
      )}
    </Box>
  );
}
